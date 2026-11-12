<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { getDevices } from '@/services/deviceService'
import {
  getLatestRobotPosition,
  subscribeRobotPosition,
  unsubscribeRobotPosition,
} from '@/services/robotPositionService'
import { useAuthStore } from '@/stores/authStore'
import { useShrimpSystemStore } from '@/stores/shrimpSystem'
import type { Device } from '@/types/device'
import type { RobotPositionLatest } from '@/types/robot'

const store = useShrimpSystemStore()
const auth = useAuthStore()
const organizationId = computed(() => auth.currentOrganization?.id ?? '')
const robotIds = computed(() => store.robots.map((robot) => robot.id).join('\n'))
const activeTab = ref<'robots' | 'devices'>('robots')
const positions = ref<Record<string, RobotPositionLatest>>({})
const devices = ref<Device[]>([])
const devicesLoading = ref(false)
const devicesError = ref('')

const deviceTypes: Record<Device['type'], string> = {
  water_sensor: '水质传感器',
  gateway: '网关',
  robot: '机器人',
  camera: '摄像头',
  aerator: '增氧设备',
  feeder: '投喂设备',
}
const deviceStatuses: Record<Device['status'], string> = {
  online: '在线',
  offline: '离线',
  warning: '预警',
  fault: '故障',
  maintenance: '维护中',
}

watch(
  [organizationId, robotIds],
  ([organization, ids], _, onCleanup) => {
    positions.value = {}
    if (!organization || !ids) return

    let active = true
    const subscriptions = ids.split('\n').map((robotId) => {
      function updatePosition(position: RobotPositionLatest) {
        const previous = positions.value[robotId]
        if (
          active &&
          organizationId.value === organization &&
          (!previous || Date.parse(position.recordedAt) >= Date.parse(previous.recordedAt))
        ) {
          positions.value[robotId] = position
        }
      }

      void getLatestRobotPosition(organization, robotId).then(updatePosition, () => undefined)
      return subscribeRobotPosition(organization, robotId, updatePosition)
    })
    onCleanup(() => {
      active = false
      subscriptions.forEach(unsubscribeRobotPosition)
    })
  },
  { immediate: true },
)

watch(
  [organizationId, activeTab],
  async ([organization, tab], _, onCleanup) => {
    devices.value = []
    devicesError.value = ''
    devicesLoading.value = Boolean(organization && tab === 'devices')
    if (!organization || tab !== 'devices') return

    let active = true
    onCleanup(() => {
      active = false
    })
    try {
      const rows = await getDevices(organization)
      if (active) devices.value = rows
    } catch {
      if (active) devicesError.value = '设备列表读取失败，请稍后重试。'
    } finally {
      if (active) devicesLoading.value = false
    }
  },
  { immediate: true },
)

function getRobotAlerts(robotId: string) {
  return store.robotAlerts.filter((alert) => alert.id.includes(robotId))
}

function formatPosition(position?: RobotPositionLatest) {
  if (!position) return '等待坐标'
  return `X ${position.x.toFixed(1)} / Y ${position.y.toFixed(1)} / Z ${position.z.toFixed(1)}`
}
</script>

<template>
  <section class="robot-page">
    <div class="page-head">
      <div class="head-copy">
        <span>机器人实时监测</span>
        <div class="headline-row">
          <h1>机器人监测</h1>
          <p>在线、任务、电量与指令记录</p>
        </div>
      </div>
      <strong>{{ store.robotAlerts.length }} 条机器人异常</strong>
    </div>

    <nav class="monitor-tabs" aria-label="监测内容">
      <button type="button" :aria-pressed="activeTab === 'robots'" @click="activeTab = 'robots'">
        机器人状态
      </button>
      <button type="button" :aria-pressed="activeTab === 'devices'" @click="activeTab = 'devices'">
        设备管理
      </button>
    </nav>

    <div v-if="activeTab === 'robots'" class="robot-grid">
      <article v-for="robot in store.robots" :key="robot.id" class="robot-panel">
        <div class="robot-title">
          <div>
            <span>{{ robot.id }}</span>
            <strong>{{ robot.name }}</strong>
          </div>
          <em :class="{ online: robot.online }">{{ robot.online ? '在线' : '离线' }}</em>
        </div>

        <dl class="robot-info">
          <div>
            <dt>当前所在虾池</dt>
            <dd>{{ robot.pondId }}</dd>
          </div>
          <div>
            <dt>当前任务</dt>
            <dd>{{ robot.currentTask }}</dd>
          </div>
          <div>
            <dt>电量</dt>
            <dd>{{ robot.battery }}%</dd>
          </div>
          <div>
            <dt>投喂机状态</dt>
            <dd>{{ robot.feederStatus }}</dd>
          </div>
          <div>
            <dt>运动状态</dt>
            <dd>{{ robot.motionStatus }}</dd>
          </div>
          <div>
            <dt>实时坐标</dt>
            <dd>{{ formatPosition(positions[robot.id]) }}</dd>
          </div>
          <div>
            <dt>上次执行时间</dt>
            <dd>{{ robot.lastRunAt }}</dd>
          </div>
          <div>
            <dt>下次计划时间</dt>
            <dd>{{ robot.nextPlanAt }}</dd>
          </div>
          <div>
            <dt>异常状态</dt>
            <dd>{{ robot.abnormalStatus }}</dd>
          </div>
        </dl>

        <div class="battery-track">
          <span>电量状态</span>
          <div>
            <i :style="{ width: `${robot.battery}%` }"></i>
          </div>
          <strong>{{ robot.battery }}%</strong>
        </div>

        <div class="robot-alerts">
          <strong>异常判断</strong>
          <span v-if="getRobotAlerts(robot.id).length === 0">当前无异常</span>
          <span v-for="alert in getRobotAlerts(robot.id)" v-else :key="alert.id">{{
            alert.type
          }}</span>
        </div>

        <div class="commands">
          <strong>最近指令记录</strong>
          <p v-for="command in robot.commands" :key="command">{{ command }}</p>
        </div>
      </article>
    </div>
    <section v-else class="device-section" aria-label="设备列表">
      <p v-if="devicesLoading" role="status">正在读取设备…</p>
      <p v-else-if="devicesError" role="alert">{{ devicesError }}</p>
      <p v-else-if="!devices.length">当前企业暂无设备。</p>
      <div v-else class="device-grid">
        <article v-for="device in devices" :key="device.id" class="device-panel">
          <span>{{ deviceTypes[device.type] }}</span>
          <strong>{{ device.name }}</strong>
          <dl>
            <dt>状态</dt>
            <dd>{{ deviceStatuses[device.status] }}</dd>
            <dt>最近心跳</dt>
            <dd>
              {{
                device.lastHeartbeatAt
                  ? new Date(device.lastHeartbeatAt).toLocaleString('zh-CN')
                  : '等待心跳'
              }}
            </dd>
          </dl>
        </article>
      </div>
    </section>
  </section>
</template>

<style scoped>
.robot-page {
  height: 100%;
  display: grid;
  grid-template-rows: 74px auto minmax(0, 1fr);
  gap: 12px;
  overflow: hidden;
}

.page-head,
.device-panel,
.robot-panel {
  border: 1px solid var(--border-cyan);
  background: var(--panel-bg);
  border-radius: var(--panel-radius);
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 18px;
}

.head-copy {
  min-width: 0;
}

.page-head span {
  color: var(--cyan);
  font-size: 13px;
}

.headline-row {
  min-width: 0;
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin-top: 6px;
}

.page-head h1 {
  flex: 0 0 auto;
  margin: 0;
  color: var(--text-main);
  font-size: 24px;
  line-height: 1.08;
}

.page-head p {
  min-width: 0;
  margin: 0 0 2px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-head strong {
  flex: 0 0 auto;
  padding: 8px 12px;
  color: var(--warning);
  font-size: 14px;
  background: rgba(255, 191, 107, 0.08);
  border: 1px solid rgba(255, 191, 107, 0.18);
}

.robot-grid {
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-auto-rows: minmax(520px, max-content);
  align-content: start;
  gap: 12px;
  overflow: auto;
  padding-right: 4px;
  overscroll-behavior: contain;
}

.monitor-tabs {
  display: flex;
  gap: 8px;
}

.monitor-tabs button {
  padding: 7px 14px;
  color: var(--text-normal);
  background: var(--panel-title-bg);
  border: 1px solid var(--border-cyan);
  cursor: pointer;
}

.monitor-tabs button[aria-pressed='true'] {
  color: var(--text-main);
  background: var(--panel-title-bg);
  border-color: var(--border-cyan-strong);
}

.device-section {
  min-height: 0;
  overflow: auto;
}

.device-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
  gap: 12px;
}

.device-panel {
  padding: 14px;
}

.device-panel > span {
  color: var(--cyan);
  font-size: 12px;
}

.device-panel > strong {
  display: block;
  margin-top: 5px;
  color: var(--text-main);
}

.device-panel dl {
  display: grid;
  grid-template-columns: max-content 1fr;
  align-items: baseline;
  gap: 4px 12px;
  margin-bottom: 0;
}

.robot-panel {
  min-height: 0;
  max-height: 100%;
  display: grid;
  grid-template-rows: 58px auto auto auto minmax(120px, 1fr);
  overflow: auto;
  overscroll-behavior: contain;
}

.robot-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  background: var(--panel-title-bg);
  border-bottom: 1px solid var(--border-cyan);
}

.robot-title span {
  display: block;
  color: var(--cyan);
  font-size: 12px;
}

.robot-title strong {
  display: block;
  margin-top: 4px;
  color: var(--text-main);
  font-size: 16px;
}

.robot-title em {
  padding: 4px 9px;
  color: var(--danger);
  font-style: normal;
  background: rgba(255, 124, 124, 0.1);
  border: 1px solid rgba(255, 124, 124, 0.18);
}

.robot-title em.online {
  color: var(--success);
  background: rgba(105, 226, 164, 0.1);
  border-color: rgba(105, 226, 164, 0.18);
}

.robot-info {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 14px;
  margin: 0;
}

.robot-info div {
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(91, 214, 255, 0.1);
}

.battery-track {
  display: grid;
  grid-template-columns: 70px minmax(0, 1fr) 46px;
  align-items: center;
  gap: 10px;
  margin: 0 14px 14px;
  padding: 10px;
  background: var(--panel-title-bg);
  border: 1px solid var(--border-cyan);
}

.battery-track span {
  color: var(--text-muted);
  font-size: 12px;
}

.battery-track div {
  height: 8px;
  overflow: hidden;
  background: rgba(3, 16, 30, 0.78);
  border: 1px solid rgba(91, 214, 255, 0.12);
}

.battery-track i {
  height: 100%;
  display: block;
  background: linear-gradient(90deg, #5bd6ff, #69e2a4);
}

.battery-track strong {
  color: var(--text-main);
  font-size: 12px;
}

dt,
.commands strong,
.robot-alerts strong {
  color: var(--text-muted);
  font-size: 12px;
}

dd {
  margin: 5px 0 0;
  color: var(--text-main);
  font-size: 13px;
}

.robot-alerts,
.commands {
  min-height: 0;
  margin: 0 14px 14px;
  padding: 10px;
  background: var(--panel-title-bg);
  border: 1px solid var(--border-cyan);
}

.commands {
  overflow: auto;
}

.robot-alerts span {
  display: block;
  margin-top: 6px;
  color: var(--text-normal);
  font-size: 13px;
}

.commands p {
  position: relative;
  margin: 8px 0 0 10px;
  padding-left: 14px;
  color: var(--text-normal);
  font-size: 13px;
}

.commands p::before {
  content: '';
  position: absolute;
  left: 0;
  top: 7px;
  width: 6px;
  height: 6px;
  background: var(--cyan);
  border-radius: 50%;
}
</style>
