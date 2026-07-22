<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  explainAlert,
  requestFeedingAdvice,
  requestPondEvaluation,
  submitAiFeedback,
} from '@/services/aiService'
import { createOperationLog } from '@/services/auditLogService'
import { getDevices } from '@/services/deviceService'
import { getFeedingPlans, getFeedingRecords, getTodayFeedingTasks } from '@/services/feedingService'
import {
  loadAiRequestLogs,
  loadModelConfig,
  saveModelConfig,
  testModelConnection,
} from '@/services/modelProviderService'
import { calculateTotalRisk, type RiskCalculationResult } from '@/services/riskScoreService'
import { getRobotStatus } from '@/services/robotService'
import {
  getLatestRobotPosition,
  getRobotTrack,
  subscribeRobotPosition,
  unsubscribeRobotPosition,
} from '@/services/robotPositionService'
import { mockSendCommand } from '@/services/robotCommandService'
import { getShrimpEstimate } from '@/services/shrimpGrowthService'
import { getThresholds } from '@/services/thresholdService'
import { getLatestWaterData } from '@/services/waterDataService'
import { useAuthStore } from '@/stores/authStore'
import { useShrimpSystemStore } from '@/stores/shrimpSystem'
import type { SystemAlert } from '@/stores/shrimpSystem'
import type {
  AiFeedingAdviceResult,
  AiModelConfig,
  AiPondEvaluationResult,
  AiProviderType,
  AiRequestLog,
} from '@/types/ai'
import type { Device } from '@/types/device'
import type { FeedingPlan, FeedingRecord, FeedingTask } from '@/types/feeding'
import type { RobotCommandType, RobotPositionHistory, RobotPositionLatest } from '@/types/robot'

type ExtensionModule = 'scene3d' | 'ai' | 'model' | 'feeding' | 'alerts' | 'devices'

const authStore = useAuthStore()
const systemStore = useShrimpSystemStore()
const route = useRoute()
const router = useRouter()

const activeModule = ref<ExtensionModule>('scene3d')
const loading = ref(false)
const actionMessage = ref('')
const robotPosition = ref<RobotPositionLatest | null>(null)
const robotTrack = ref<RobotPositionHistory[]>([])
const aiEvaluation = ref<AiPondEvaluationResult | null>(null)
const aiAdvice = ref<AiFeedingAdviceResult | null>(null)
const riskResult = ref<RiskCalculationResult | null>(null)
const feedingPlans = ref<FeedingPlan[]>([])
const feedingTasks = ref<FeedingTask[]>([])
const feedingRecords = ref<FeedingRecord[]>([])
const devices = ref<Device[]>([])
const aiLogs = ref<AiRequestLog[]>([])
const alertExplanation = ref('')
let robotPositionSubscriptionId = ''

const modelConfig = reactive<AiModelConfig>({
  id: '',
  organizationId: '',
  providerType: 'rule_engine',
  modelName: '规则评分模型',
  jsonOutput: true,
  dailyLimit: 200,
  monthlyUsage: 0,
  enabled: true,
})

const providerOptions: Array<{ value: AiProviderType; label: string }> = [
  { value: 'rule_engine', label: '规则评分模型' },
  { value: 'openai', label: 'OpenAI GPT' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'local_model', label: '自研模型' },
  { value: 'hybrid', label: '混合决策' },
]

const commandButtons: Array<{ type: RobotCommandType; label: string }> = [
  { type: 'feed', label: '投喂' },
  { type: 'stop', label: '停止' },
  { type: 'return_home', label: '返回起点' },
  { type: 'patrol', label: '巡航' },
  { type: 'charge', label: '返回充电' },
]

const organizationId = computed(
  () => authStore.currentOrganization?.id ?? systemStore.organizationId,
)
const organizationName = computed(() => authStore.currentOrganization?.name ?? '未选择企业')
const pondId = computed(() => systemStore.pondConfig.selectedPondId)
const robotId = computed(() => systemStore.robots[0]?.id ?? '')
const currentRobot = computed(() => systemStore.robots.find((robot) => robot.id === robotId.value))
const canOperate = computed(() => authStore.currentRole !== 'viewer')
const permissionText = computed(() => (canOperate.value ? '可操作' : '当前账号仅有查看权限'))
const alerts = computed(() => systemStore.allAlerts)

const moduleCards = computed(() => [
  {
    id: 'scene3d' as const,
    title: '3D 养殖场监控',
    value: robotPosition.value
      ? `${robotPosition.value.x.toFixed(1)}, ${robotPosition.value.z.toFixed(1)}`
      : '等待坐标',
    desc: '位置与轨迹',
  },
  {
    id: 'ai' as const,
    title: 'AI 决策中心',
    value: riskResult.value ? `${riskResult.value.totalRiskScore} 分` : '待评估',
    desc: '评分与建议',
  },
  {
    id: 'model' as const,
    title: 'AI 模型设置',
    value:
      providerOptions.find((item) => item.value === modelConfig.providerType)?.label ?? '未设置',
    desc: '来源与限制',
  },
  {
    id: 'feeding' as const,
    title: '投喂计划管理',
    value: `${feedingTasks.value.length} 个任务`,
    desc: '计划与记录',
  },
  {
    id: 'alerts' as const,
    title: '报警中心',
    value: `${alerts.value.length} 条异常`,
    desc: '报警与处理',
  },
  {
    id: 'devices' as const,
    title: '设备管理',
    value: `${devices.value.length} 台设备`,
    desc: '设备与心跳',
  },
])

const moduleKeys: ExtensionModule[] = ['scene3d', 'ai', 'model', 'feeding', 'alerts', 'devices']

const timeRange = computed(() => ({
  startAt: new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString(),
  endAt: new Date().toISOString(),
}))

const robotDotStyle = computed(() => {
  const position = robotPosition.value

  if (!position) {
    return {
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%) rotate(0deg)',
    }
  }

  return {
    left: `${Math.min(92, Math.max(8, position.x))}%`,
    top: `${Math.min(88, Math.max(10, position.z))}%`,
    transform: `translate(-50%, -50%) rotate(${position.heading}deg)`,
  }
})

function assertWritable() {
  if (canOperate.value) {
    return true
  }

  actionMessage.value = '当前账号仅有查看权限'
  return false
}

async function loadOrFallback<T>(loader: () => Promise<T>, fallback: T, message: string) {
  try {
    return await loader()
  } catch (error) {
    actionMessage.value = error instanceof Error ? error.message : message
    return fallback
  }
}

async function loadExtensionData() {
  if (!organizationId.value || !pondId.value) {
    return
  }

  loading.value = true
  actionMessage.value = ''

  try {
    const robotKey = robotId.value
    const [
      latestPosition,
      track,
      evaluation,
      advice,
      config,
      plans,
      tasks,
      records,
      nextDevices,
      logs,
      latestWater,
      thresholds,
      shrimpEstimate,
      robotStatus,
    ] = await Promise.all([
      robotKey
        ? loadOrFallback(
            () => getLatestRobotPosition(organizationId.value, robotKey),
            null,
            '暂无小车定位数据',
          )
        : Promise.resolve(null),
      robotKey
        ? loadOrFallback(
            () => getRobotTrack(organizationId.value, robotKey, timeRange.value),
            { organizationId: organizationId.value, robotId: robotKey, timeRange: timeRange.value, points: [] },
            '暂无小车轨迹数据',
          )
        : Promise.resolve({
            organizationId: organizationId.value,
            robotId: '',
            timeRange: timeRange.value,
            points: [],
          }),
      loadOrFallback(
        () =>
          requestPondEvaluation(organizationId.value, pondId.value, {
            providerType: modelConfig.providerType,
          }),
        null,
        '暂无 AI 状态评估',
      ),
      loadOrFallback(
        () =>
          requestFeedingAdvice(organizationId.value, pondId.value, {
            providerType: modelConfig.providerType,
          }),
        null,
        '暂无 AI 投喂建议',
      ),
      loadModelConfig(organizationId.value),
      loadOrFallback(() => getFeedingPlans(organizationId.value, pondId.value), [], '暂无投喂计划'),
      loadOrFallback(
        () => getTodayFeedingTasks(organizationId.value, pondId.value),
        [],
        '暂无今日投喂任务',
      ),
      loadOrFallback(
        () => getFeedingRecords(organizationId.value, pondId.value, timeRange.value),
        [],
        '暂无投喂记录',
      ),
      loadOrFallback(() => getDevices(organizationId.value), [], '暂无设备数据'),
      loadOrFallback(() => loadAiRequestLogs(organizationId.value), [], '暂无 AI 请求日志'),
      loadOrFallback(
        () => getLatestWaterData(organizationId.value, pondId.value),
        null,
        '暂无水质数据',
      ),
      loadOrFallback(() => getThresholds(organizationId.value, pondId.value), null, '暂无阈值配置'),
      loadOrFallback(() => getShrimpEstimate(organizationId.value, pondId.value), null, '暂无虾群估算'),
      robotKey
        ? loadOrFallback(() => getRobotStatus(organizationId.value, robotKey), null, '暂无机器人状态')
        : Promise.resolve(null),
    ])

    robotPosition.value = latestPosition
    robotTrack.value = track.points
    aiEvaluation.value = evaluation
    aiAdvice.value = advice
    Object.assign(modelConfig, config)
    feedingPlans.value = plans
    feedingTasks.value = tasks
    feedingRecords.value = records
    devices.value = nextDevices
    aiLogs.value = logs
    riskResult.value =
      latestWater && thresholds && shrimpEstimate && robotStatus
        ? calculateTotalRisk({
            waterData: latestWater.reading,
            thresholds,
            feedingRecords: records,
            shrimpData: shrimpEstimate,
            robotStatus,
          })
        : null
  } finally {
    loading.value = false
  }
}

function resetRobotPositionSubscription() {
  if (robotPositionSubscriptionId) {
    unsubscribeRobotPosition(robotPositionSubscriptionId)
    robotPositionSubscriptionId = ''
  }

  if (!organizationId.value || !robotId.value) {
    return
  }

  robotPositionSubscriptionId = subscribeRobotPosition(
    organizationId.value,
    robotId.value,
    (position) => {
      robotPosition.value = position
    },
  )
}

async function handleRobotCommand(type: RobotCommandType) {
  if (!assertWritable()) return

  await mockSendCommand(organizationId.value, robotId.value, {
    type,
    pondId: pondId.value,
    createdBy: authStore.currentUser?.id,
  })
  await createOperationLog(organizationId.value, {
    userId: authStore.currentUser?.id,
    action: '下发机器人指令',
    targetType: 'robot_command',
    targetId: robotId.value,
    detail: `mock 指令：${type}`,
  })
  actionMessage.value = '指令已下发'
}

async function handleAiFeedback(accepted: boolean) {
  if (!assertWritable()) return

  await submitAiFeedback(organizationId.value, {
    organizationId: organizationId.value,
    pondId: pondId.value,
    resultId: aiAdvice.value?.pondId ?? pondId.value,
    accepted,
    remark: accepted ? '前端 mock 采纳建议' : '前端 mock 不采纳建议',
  })
  await createOperationLog(organizationId.value, {
    userId: authStore.currentUser?.id,
    action: accepted ? '采纳 AI 建议' : '不采纳 AI 建议',
    targetType: 'ai_feedback',
    targetId: pondId.value,
    detail: aiAdvice.value?.summary,
  })
  actionMessage.value = accepted ? '已采纳' : '已记录反馈'
}

async function handleTestModel() {
  const result = await testModelConnection(organizationId.value, modelConfig)
  actionMessage.value = result.message
}

async function handleSaveModel() {
  if (!assertWritable()) return

  Object.assign(modelConfig, await saveModelConfig(organizationId.value, modelConfig))
  await createOperationLog(organizationId.value, {
    userId: authStore.currentUser?.id,
    action: '保存 AI 模型配置',
    targetType: 'ai_model_config',
    targetId: modelConfig.id,
    detail: providerOptions.find((item) => item.value === modelConfig.providerType)?.label,
  })
  actionMessage.value = '模型配置已保存'
}

async function handleExplainAlert(alert: SystemAlert) {
  const result = await explainAlert(organizationId.value, pondId.value, alert.id, {
    providerType: modelConfig.providerType,
  })
  alertExplanation.value = result.summary
  actionMessage.value = 'AI 报警解释已生成'
}

watch(
  [organizationId, pondId, robotId],
  () => {
    void loadExtensionData()
    resetRobotPositionSubscription()
  },
  { immediate: true },
)

watch(
  () => route.query.module,
  (module) => {
    if (typeof module === 'string' && moduleKeys.includes(module as ExtensionModule)) {
      activeModule.value = module as ExtensionModule
    }
  },
  { immediate: true },
)

function setActiveModule(module: ExtensionModule) {
  activeModule.value = module
  router.replace({
    path: route.path,
    query: {
      ...route.query,
      module,
    },
  })
}

onBeforeUnmount(() => {
  if (robotPositionSubscriptionId) {
    unsubscribeRobotPosition(robotPositionSubscriptionId)
  }
})
</script>

<template>
  <section class="extension-page">
    <header class="extension-head">
      <div class="head-copy">
        <span>接口中心</span>
        <div class="headline-row">
          <h1>扩展接口预留</h1>
          <p>mock 数据，后续接入数据库、硬件和 AI</p>
        </div>
      </div>
      <div class="tenant-status">
        <strong>{{ organizationName }}</strong>
        <em>{{ pondId }} / {{ currentRobot?.id ?? '未选择机器人' }}</em>
        <span :class="{ warning: !canOperate }">{{ actionMessage || permissionText }}</span>
      </div>
    </header>

    <nav class="module-grid" aria-label="扩展模块">
      <button
        v-for="module in moduleCards"
        :key="module.id"
        type="button"
        :class="{ active: activeModule === module.id }"
        @click="setActiveModule(module.id)"
      >
        <span>{{ module.title }}</span>
        <strong>{{ module.value }}</strong>
        <em>{{ module.desc }}</em>
      </button>
    </nav>

    <section class="module-panel">
      <div class="panel-toolbar">
        <strong>{{ moduleCards.find((module) => module.id === activeModule)?.title }}</strong>
        <span>{{ loading ? '加载中' : '已就绪' }}</span>
      </div>

      <div v-if="activeModule === 'scene3d'" class="scene-layout">
        <div class="scene-map">
          <span
            v-for="point in robotTrack"
            :key="point.id"
            class="track-point"
            :style="{
              left: `${Math.min(92, Math.max(8, point.x))}%`,
              top: `${Math.min(88, Math.max(10, point.z))}%`,
            }"
          ></span>
          <i class="robot-dot" :style="robotDotStyle"></i>
        </div>

        <aside class="detail-stack">
          <article>
            <span>坐标</span>
            <strong>
              X {{ robotPosition?.x.toFixed(1) ?? '-' }} / Y
              {{ robotPosition?.y.toFixed(1) ?? '-' }} / Z {{ robotPosition?.z.toFixed(1) ?? '-' }}
            </strong>
          </article>
          <article>
            <span>航向 / 速度</span>
            <strong
              >{{ robotPosition?.heading ?? '-' }}° / {{ robotPosition?.speed ?? '-' }} m/s</strong
            >
          </article>
          <article>
            <span>电量 / 状态</span>
            <strong
              >{{ robotPosition?.battery ?? '-' }}% / {{ robotPosition?.status ?? '-' }}</strong
            >
          </article>
          <div class="command-row">
            <button
              v-for="command in commandButtons"
              :key="command.type"
              type="button"
              :disabled="!canOperate"
              @click="handleRobotCommand(command.type)"
            >
              {{ command.label }}
            </button>
          </div>
        </aside>
      </div>

      <div v-else-if="activeModule === 'ai'" class="ai-layout">
        <article class="risk-card">
          <span>综合风险评分</span>
          <strong>{{ riskResult?.totalRiskScore ?? aiEvaluation?.riskScore ?? '-' }}</strong>
          <em>{{ riskResult?.riskLevel ?? aiEvaluation?.riskLevel ?? '待评估' }}</em>
        </article>
        <article class="text-panel">
          <span>AI 状态评估</span>
          <strong>{{ aiEvaluation?.summary }}</strong>
          <p v-for="problem in aiEvaluation?.problems ?? []" :key="problem">{{ problem }}</p>
        </article>
        <article class="text-panel">
          <span>AI 投喂建议</span>
          <strong>
            {{ aiAdvice?.recommendedTime }} / {{ aiAdvice?.recommendedFeedKg }} 千克 /
            {{ aiAdvice?.feedingMethod }}
          </strong>
          <p v-for="item in aiAdvice?.recommendations ?? []" :key="item">{{ item }}</p>
          <div class="button-line">
            <button type="button" :disabled="!canOperate" @click="handleAiFeedback(true)">
              采纳
            </button>
            <button type="button" :disabled="!canOperate" @click="handleAiFeedback(false)">
              不采纳
            </button>
          </div>
        </article>
      </div>

      <div v-else-if="activeModule === 'model'" class="model-layout">
        <label>
          <span>模型来源</span>
          <select v-model="modelConfig.providerType">
            <option
              v-for="provider in providerOptions"
              :key="provider.value"
              :value="provider.value"
            >
              {{ provider.label }}
            </option>
          </select>
        </label>
        <label>
          <span>模型名称</span>
          <input v-model.trim="modelConfig.modelName" type="text" />
        </label>
        <label>
          <span>自研 endpoint</span>
          <input
            v-model.trim="modelConfig.endpointUrl"
            :disabled="
              modelConfig.providerType !== 'local_model' && modelConfig.providerType !== 'hybrid'
            "
            type="text"
            placeholder="后端调用"
          />
        </label>
        <label>
          <span>JSON 输出</span>
          <input v-model="modelConfig.jsonOutput" type="checkbox" />
        </label>
        <label>
          <span>每日调用限制</span>
          <input v-model.number="modelConfig.dailyLimit" type="number" min="0" />
        </label>
        <label>
          <span>本月调用次数</span>
          <input v-model.number="modelConfig.monthlyUsage" disabled type="number" />
        </label>
        <p class="model-tip">API Key 由后端环境变量管理，前端不保存密钥。</p>
        <div class="button-line wide">
          <button type="button" @click="handleTestModel">连接测试</button>
          <button type="button" :disabled="!canOperate" @click="handleSaveModel">保存配置</button>
        </div>
        <ul class="log-list">
          <li v-for="log in aiLogs" :key="log.id">
            {{ log.endpoint }} / {{ log.success ? '成功' : '失败' }}
          </li>
        </ul>
      </div>

      <div v-else-if="activeModule === 'feeding'" class="list-layout">
        <article>
          <span>投喂计划</span>
          <p v-for="plan in feedingPlans" :key="plan.id">
            {{ plan.name }} / {{ plan.feedAmountKg }} 千克 / {{ plan.enabled ? '启用' : '停用' }}
          </p>
        </article>
        <article>
          <span>今日任务</span>
          <p v-for="task in feedingTasks" :key="task.id">
            {{ task.scheduledAt.slice(11, 16) }} / {{ task.feedAmountKg }} 千克 / {{ task.status }}
          </p>
        </article>
        <article>
          <span>历史投喂记录</span>
          <p v-for="record in feedingRecords" :key="record.id">
            {{ record.executedAt.slice(0, 16).replace('T', ' ') }} / {{ record.feedAmountKg }} 千克
          </p>
        </article>
      </div>

      <div v-else-if="activeModule === 'alerts'" class="list-layout">
        <article v-for="alert in alerts" :key="alert.id">
          <span>{{ alert.source }} / {{ alert.level }} / {{ alert.time }}</span>
          <strong>{{ alert.type }}</strong>
          <p>{{ alert.reason }}</p>
          <p>当前值：{{ alert.currentValue }} / 正常范围：{{ alert.normalRange }}</p>
          <button type="button" @click="handleExplainAlert(alert)">AI 解释报警</button>
        </article>
        <article v-if="alerts.length === 0">
          <span>报警中心</span>
          <strong>当前没有异常</strong>
          <p>与顶部告警系统同步。</p>
        </article>
        <article v-if="alertExplanation">
          <span>AI 解释结果</span>
          <strong>{{ alertExplanation }}</strong>
          <p>mock 解释，后续由后端调用模型。</p>
        </article>
      </div>

      <div v-else class="device-grid">
        <article v-for="device in devices" :key="device.id">
          <span>{{ device.type }}</span>
          <strong>{{ device.name }}</strong>
          <p>状态：{{ device.status }}</p>
          <p>心跳时间：{{ device.lastHeartbeatAt ?? '等待心跳' }}</p>
          <p>企业：{{ device.organizationId }}</p>
        </article>
      </div>
    </section>
  </section>
</template>

<style scoped>
.extension-page {
  height: 100%;
  display: grid;
  grid-template-rows: 74px 112px minmax(0, 1fr);
  gap: 12px;
  overflow: hidden;
}

.extension-head,
.module-grid button,
.module-panel {
  background: rgba(3, 14, 36, 0.15);
  border: 1px solid rgba(121, 210, 255, 0.18);
  box-shadow: 0 14px 30px rgba(3, 10, 28, 0.16);
  backdrop-filter: blur(6px);
}

.extension-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 18px;
}

.head-copy {
  min-width: 0;
}

.extension-head span,
.module-grid span,
.panel-toolbar span,
article span,
label span {
  color: var(--cyan);
  font-size: 12px;
  line-height: 1.2;
}

.extension-head h1 {
  flex: 0 0 auto;
  margin: 0;
  color: var(--text-main);
  font-size: 24px;
  line-height: 1.08;
}

.extension-head p {
  min-width: 0;
  margin: 0 0 2px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.headline-row {
  min-width: 0;
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin-top: 6px;
}

.tenant-status {
  min-width: 260px;
  display: grid;
  gap: 5px;
  padding: 10px 12px;
  background: rgba(3, 14, 36, 0.12);
  border: 1px solid rgba(121, 210, 255, 0.12);
}

.tenant-status strong {
  color: var(--text-main);
}

.tenant-status em,
.tenant-status span,
.module-grid em,
article p,
.model-tip,
.log-list {
  color: var(--text-muted);
  font-size: 12px;
  font-style: normal;
  line-height: 1.5;
}

.tenant-status span.warning {
  color: var(--warning);
}

.module-grid {
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
}

.module-grid button {
  min-width: 0;
  display: grid;
  align-content: center;
  gap: 8px;
  padding: 12px;
  text-align: left;
  cursor: pointer;
}

.module-grid button.active {
  background: rgba(3, 14, 36, 0.28);
  border-color: rgba(121, 210, 255, 0.44);
  box-shadow: 0 0 22px rgba(91, 214, 255, 0.16);
}

.module-grid strong {
  overflow: hidden;
  color: var(--text-main);
  font-size: 19px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.module-panel {
  min-height: 0;
  display: grid;
  grid-template-rows: 48px minmax(0, 1fr);
  overflow: hidden;
}

.panel-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: rgba(3, 14, 36, 0.12);
  border-bottom: 1px solid rgba(121, 210, 255, 0.1);
}

.panel-toolbar strong {
  color: var(--text-main);
}

.scene-layout,
.ai-layout,
.model-layout,
.list-layout,
.device-grid {
  min-height: 0;
  padding: 16px;
  overflow: auto;
}

.scene-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 14px;
}

.scene-map {
  position: relative;
  min-height: 420px;
  overflow: hidden;
  background:
    linear-gradient(90deg, rgba(91, 214, 255, 0.1) 1px, transparent 1px),
    linear-gradient(rgba(91, 214, 255, 0.08) 1px, transparent 1px), rgba(3, 14, 36, 0.08);
  background-size: 42px 42px;
  border: 1px solid rgba(121, 210, 255, 0.16);
}

.scene-map::before {
  content: '3D 占位：模型、轨迹、坐标';
  position: absolute;
  left: 16px;
  top: 14px;
  color: var(--text-muted);
  font-size: 12px;
}

.track-point,
.robot-dot {
  position: absolute;
  border-radius: 50%;
}

.track-point {
  width: 5px;
  height: 5px;
  background: rgba(91, 214, 255, 0.6);
  box-shadow: 0 0 10px rgba(91, 214, 255, 0.55);
}

.robot-dot {
  width: 22px;
  height: 22px;
  background: linear-gradient(135deg, #5bd6ff, #69e2a4);
  clip-path: polygon(50% 0, 100% 100%, 50% 74%, 0 100%);
  box-shadow: 0 0 18px rgba(91, 214, 255, 0.85);
}

.detail-stack {
  display: grid;
  align-content: start;
  gap: 10px;
}

article,
.model-layout label {
  min-width: 0;
  padding: 12px;
  background: rgba(3, 14, 36, 0.12);
  border: 1px solid rgba(121, 210, 255, 0.12);
}

article strong {
  display: block;
  margin-top: 8px;
  color: var(--text-main);
  font-size: 15px;
  line-height: 1.45;
}

.command-row,
.button-line {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

button {
  min-height: 32px;
  padding: 0 12px;
  color: #dff8ff;
  background: rgba(3, 14, 36, 0.2);
  border: 1px solid rgba(121, 210, 255, 0.2);
  cursor: pointer;
}

button:disabled {
  color: rgba(223, 248, 255, 0.42);
  border-color: rgba(121, 210, 255, 0.08);
  cursor: not-allowed;
}

.ai-layout {
  display: grid;
  grid-template-columns: 220px repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.risk-card {
  display: grid;
  align-content: center;
  justify-items: center;
  text-align: center;
}

.risk-card strong {
  margin-top: 12px;
  font-size: 54px;
}

.risk-card em {
  color: var(--warning);
  font-style: normal;
}

.text-panel p {
  position: relative;
  margin: 10px 0 0;
  padding-left: 13px;
}

.text-panel p::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  width: 5px;
  height: 5px;
  background: var(--cyan);
  border-radius: 50%;
}

.model-layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.model-layout label {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}

.model-layout label:nth-of-type(3),
.model-tip,
.wide,
.log-list {
  grid-column: 1 / -1;
}

input,
select {
  min-width: 0;
  height: 32px;
  padding: 0 9px;
  color: #f4fcff;
  background: rgba(3, 14, 36, 0.34);
  border: 1px solid rgba(121, 210, 255, 0.16);
  outline: none;
}

input[type='checkbox'] {
  width: 18px;
  height: 18px;
}

input:disabled {
  color: rgba(244, 252, 255, 0.56);
  background: rgba(3, 14, 36, 0.14);
}

.model-tip,
.log-list {
  margin: 0;
  padding: 10px 12px;
  background: rgba(3, 14, 36, 0.12);
  border: 1px solid rgba(121, 210, 255, 0.12);
}

.list-layout,
.device-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-content: start;
  gap: 12px;
}

.list-layout article,
.device-grid article {
  min-height: 150px;
}
</style>
