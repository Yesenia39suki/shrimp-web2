<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import { cloneBusinessConfig } from '@/services/mockDataService'
import { useAuthStore } from '@/stores/authStore'
import { useShrimpSystemStore } from '@/stores/shrimpSystem'
import type { BusinessConfig, WaterThresholdMetricKey } from '@/types/business'

const authStore = useAuthStore()
const store = useShrimpSystemStore()

const form = reactive<BusinessConfig>(cloneBusinessConfig(store.businessConfig))
const saveMessage = ref('')
const activeSection = ref<'pond' | 'robot' | 'threshold' | 'security'>('pond')

const configSections = [
  {
    id: 'pond',
    title: '池塘信息',
    description: '编号、名称、品种、面积、水深与位置',
  },
  {
    id: 'robot',
    title: '机器人信息',
    description: '机器人编号、名称、类型与绑定关系',
  },
  {
    id: 'threshold',
    title: '水质阈值',
    description: '温度、溶氧、pH 等上下限',
  },
  {
    id: 'security',
    title: '数据隔离',
    description: '当前账号、企业、角色和权限状态',
  },
] as const

const thresholdFields: Array<{
  key: WaterThresholdMetricKey
  label: string
  unit: string
  step: string
}> = [
  { key: 'temperature', label: '温度上下限', unit: '℃', step: '0.1' },
  { key: 'oxygen', label: '溶解氧上下限', unit: '毫克/升', step: '0.1' },
  { key: 'ph', label: 'pH 上下限', unit: '', step: '0.1' },
  { key: 'orp', label: '氧化还原电位上下限', unit: '毫伏', step: '1' },
  { key: 'turbidity', label: '浊度上下限', unit: '度', step: '1' },
  { key: 'ammonia', label: '氨氮上下限', unit: '毫克/升', step: '0.01' },
  { key: 'nitrite', label: '亚硝酸盐上下限', unit: '毫克/升', step: '0.01' },
  { key: 'hardness', label: '钙/镁硬度上下限', unit: '毫克/升', step: '1' },
]

const robotTypes = ['投喂巡检型', '水质采样型', '增氧联动型', '料台观察型']

const canEdit = computed(() => authStore.canEditBusinessConfig)
const permissionText = computed(() =>
  canEdit.value ? '当前角色可保存配置' : '当前账号仅有查看权限',
)
const organizationName = computed(() => authStore.currentOrganization?.name ?? '未选择企业')
const activeSectionIndex = computed(() =>
  configSections.findIndex((section) => section.id === activeSection.value),
)
const activeSectionInfo = computed(
  () => configSections[activeSectionIndex.value] ?? configSections[0],
)

const summaryCards = computed(() => [
  { label: '当前企业', value: organizationName.value },
  { label: '当前用户', value: authStore.currentUser?.display_name ?? '未登录用户' },
  { label: '当前角色', value: authStore.currentRoleText },
  { label: '当前池号', value: store.pondConfig.selectedPondId },
  { label: '异常数量', value: `${store.activeAlertCount} 条` },
])

watch(
  () => store.businessConfig,
  (businessConfig) => {
    Object.assign(form, cloneBusinessConfig(businessConfig))
    saveMessage.value = ''
  },
  { immediate: true },
)

function handleSave() {
  if (!canEdit.value) {
    saveMessage.value = '当前账号仅有查看权限'
    return
  }

  store.saveBusinessConfig(cloneBusinessConfig(form))
  saveMessage.value = '配置已保存'
}

function handleReset() {
  Object.assign(form, cloneBusinessConfig(store.businessConfig))
  saveMessage.value = ''
}

function goPreviousSection() {
  const previousIndex = Math.max(0, activeSectionIndex.value - 1)
  activeSection.value = configSections[previousIndex]!.id
}

function goNextSection() {
  const nextIndex = Math.min(configSections.length - 1, activeSectionIndex.value + 1)
  activeSection.value = configSections[nextIndex]!.id
}
</script>

<template>
  <section class="config-page">
    <div class="page-head">
      <div>
        <span>自定义内容</span>
        <h1>企业养殖配置</h1>
        <p>当前配置按企业隔离保存，刷新网页后仍保留本地模拟数据。</p>
      </div>

      <div class="page-actions">
        <div class="tenant-chip">
          <strong>{{ organizationName }}</strong>
          <em>{{ authStore.currentRoleText }}</em>
        </div>
        <button type="button" :disabled="!canEdit" @click="handleSave">保存配置</button>
        <button type="button" class="ghost" @click="handleReset">重置</button>
        <span :class="{ warning: !canEdit, success: saveMessage === '配置已保存' }">
          {{ saveMessage || permissionText }}
        </span>
      </div>
    </div>

    <nav class="config-stepbar" aria-label="配置步骤">
      <button
        v-for="(section, index) in configSections"
        :key="section.id"
        type="button"
        :class="{ active: section.id === activeSection }"
        @click="activeSection = section.id"
      >
        <em>{{ index + 1 }}</em>
        <span>
          <strong>{{ section.title }}</strong>
          <small>{{ section.description }}</small>
        </span>
      </button>
    </nav>

    <div class="config-layout">
      <section class="config-panel config-main-panel">
        <div class="panel-title">
          <div>
            <strong>{{ activeSectionInfo.title }}</strong>
            <span>{{ activeSectionInfo.description }}</span>
          </div>
          <em>{{ activeSectionIndex + 1 }} / {{ configSections.length }}</em>
        </div>

        <div v-if="activeSection === 'pond'" class="form-grid">
          <label>
            <span>池塘编号</span>
            <input v-model.trim="form.pond.pond_code" :disabled="!canEdit" type="text" />
          </label>
          <label>
            <span>池塘名称</span>
            <input v-model.trim="form.pond.pond_name" :disabled="!canEdit" type="text" />
          </label>
          <label>
            <span>对虾品种</span>
            <input v-model.trim="form.pond.shrimp_species" :disabled="!canEdit" type="text" />
          </label>
          <label>
            <span>面积</span>
            <input v-model.number="form.pond.area" :disabled="!canEdit" type="number" step="0.1" />
          </label>
          <label>
            <span>水深</span>
            <input
              v-model.number="form.pond.water_depth"
              :disabled="!canEdit"
              type="number"
              step="0.01"
            />
          </label>
          <label class="wide">
            <span>位置</span>
            <input v-model.trim="form.pond.location" :disabled="!canEdit" type="text" />
          </label>
        </div>

        <div v-else-if="activeSection === 'robot'" class="form-grid">
          <label>
            <span>机器人编号</span>
            <input v-model.trim="form.robot.robot_code" :disabled="!canEdit" type="text" />
          </label>
          <label>
            <span>机器人名称</span>
            <input v-model.trim="form.robot.robot_name" :disabled="!canEdit" type="text" />
          </label>
          <label>
            <span>机器人类型</span>
            <select v-model="form.robot.robot_type" :disabled="!canEdit">
              <option v-for="type in robotTypes" :key="type" :value="type">
                {{ type }}
              </option>
            </select>
          </label>

          <div class="preview-box wide">
            <strong>当前绑定关系</strong>
            <p>企业：{{ organizationName }}</p>
            <p>虾池：{{ form.pond.pond_code }} / {{ form.pond.pond_name }}</p>
            <p>机器人：{{ form.robot.robot_code }} / {{ form.robot.robot_name }}</p>
          </div>
        </div>

        <div v-else-if="activeSection === 'threshold'" class="threshold-list">
          <div v-for="field in thresholdFields" :key="field.key" class="threshold-row">
            <strong>{{ field.label }}</strong>
            <input
              v-model.number="form.waterThreshold[field.key].min"
              :disabled="!canEdit"
              type="number"
              :step="field.step"
            />
            <span>至</span>
            <input
              v-model.number="form.waterThreshold[field.key].max"
              :disabled="!canEdit"
              type="number"
              :step="field.step"
            />
            <em>{{ field.unit }}</em>
          </div>
        </div>

        <div v-else class="security-panel">
          <article v-for="item in summaryCards" :key="item.label">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </article>
          <div class="notice-box" :class="{ warning: !canEdit }">
            {{ permissionText }}
          </div>
        </div>

        <div class="step-actions">
          <button type="button" :disabled="activeSectionIndex === 0" @click="goPreviousSection">
            上一步
          </button>
          <button
            type="button"
            :disabled="activeSectionIndex === configSections.length - 1"
            @click="goNextSection"
          >
            下一步
          </button>
        </div>
      </section>

      <aside class="config-panel summary-panel">
        <div class="panel-title compact">
          <div>
            <strong>配置摘要</strong>
            <span>当前企业数据边界</span>
          </div>
        </div>

        <dl>
          <div v-for="item in summaryCards" :key="item.label">
            <dt>{{ item.label }}</dt>
            <dd>{{ item.value }}</dd>
          </div>
        </dl>

        <div class="preview-box">
          <strong>当前编辑对象</strong>
          <p>{{ form.pond.pond_code }} / {{ form.pond.pond_name }}</p>
          <p>{{ form.robot.robot_code }} / {{ form.robot.robot_name }}</p>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.config-page {
  height: 100%;
  display: grid;
  grid-template-rows: 74px 64px minmax(0, 1fr);
  gap: 12px;
  overflow: hidden;
}

.page-head,
.config-panel {
  background: rgba(3, 14, 36, 0.16);
  border: 1px solid rgba(121, 210, 255, 0.2);
  box-shadow: 0 14px 30px rgba(3, 10, 28, 0.16);
  backdrop-filter: blur(6px);
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 0 18px;
}

.page-head span {
  color: var(--cyan);
  font-size: 13px;
}

.page-head h1 {
  margin: 6px 0 0;
  color: var(--text-main);
  font-size: 24px;
}

.page-head p {
  margin: 5px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.page-actions {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(180px, 230px) 86px 62px minmax(130px, 170px);
  align-items: center;
  gap: 8px;
}

.tenant-chip {
  min-width: 0;
  display: grid;
  gap: 4px;
  padding: 7px 10px;
  background: rgba(3, 14, 36, 0.12);
  border: 1px solid rgba(121, 210, 255, 0.16);
}

.tenant-chip strong {
  overflow: hidden;
  color: var(--text-main);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tenant-chip em {
  color: var(--text-muted);
  font-size: 11px;
  font-style: normal;
}

.page-actions button {
  height: 34px;
  color: #dff8ff;
  background: rgba(3, 14, 36, 0.22);
  border: 1px solid rgba(121, 210, 255, 0.22);
  cursor: pointer;
}

.page-actions button.ghost {
  background: rgba(3, 14, 36, 0.12);
}

.page-actions button:disabled {
  color: rgba(223, 248, 255, 0.42);
  background: rgba(3, 14, 36, 0.12);
  border-color: rgba(121, 210, 255, 0.08);
  cursor: not-allowed;
}

.page-actions > span {
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.4;
}

.page-actions > span.warning {
  color: var(--warning);
}

.page-actions > span.success {
  color: #69e2a4;
}

.config-stepbar {
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.config-stepbar button {
  min-width: 0;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  color: var(--text-normal);
  text-align: left;
  background: rgba(3, 14, 36, 0.12);
  border: 1px solid rgba(121, 210, 255, 0.16);
  cursor: pointer;
  backdrop-filter: blur(5px);
}

.config-stepbar button.active {
  background: rgba(3, 14, 36, 0.26);
  border-color: rgba(121, 210, 255, 0.42);
  box-shadow: 0 0 18px rgba(91, 214, 255, 0.12);
}

.config-stepbar em {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  color: #ffffff;
  font-size: 12px;
  font-style: normal;
  border: 1px solid rgba(121, 210, 255, 0.3);
  border-radius: 50%;
}

.config-stepbar span {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.config-stepbar strong,
.config-stepbar small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.config-stepbar strong {
  color: var(--text-main);
  font-size: 13px;
}

.config-stepbar small {
  color: var(--text-muted);
  font-size: 11px;
}

.config-layout {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 12px;
  overflow: hidden;
}

.config-panel {
  min-height: 0;
  overflow: auto;
}

.panel-title {
  min-height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 16px;
  background: rgba(3, 14, 36, 0.14);
  border-bottom: 1px solid rgba(121, 210, 255, 0.1);
}

.panel-title.compact {
  min-height: 50px;
}

.panel-title strong {
  display: block;
  color: var(--text-main);
}

.panel-title span {
  display: block;
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 12px;
}

.panel-title em {
  color: var(--cyan-soft);
  font-size: 12px;
  font-style: normal;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 16px;
}

label {
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 8px;
  background: rgba(3, 14, 36, 0.12);
  border: 1px solid rgba(121, 210, 255, 0.12);
}

label.wide,
.preview-box.wide {
  grid-column: 1 / -1;
}

label span,
.threshold-row strong {
  color: var(--text-muted);
  font-size: 13px;
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

input:focus,
select:focus {
  border-color: rgba(121, 210, 255, 0.34);
}

input:disabled,
select:disabled {
  color: rgba(244, 252, 255, 0.58);
  background: rgba(3, 14, 36, 0.14);
  cursor: not-allowed;
}

.preview-box,
.notice-box {
  padding: 12px;
  background: rgba(3, 14, 36, 0.12);
  border: 1px solid rgba(121, 210, 255, 0.12);
}

.preview-box strong {
  color: var(--text-main);
  font-size: 13px;
}

.preview-box p {
  margin: 8px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.45;
}

.threshold-list {
  display: grid;
  gap: 8px;
  padding: 16px;
}

.threshold-row {
  display: grid;
  grid-template-columns: 146px 1fr 24px 1fr 72px;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: rgba(3, 14, 36, 0.12);
  border: 1px solid rgba(121, 210, 255, 0.12);
}

.threshold-row span,
.threshold-row em {
  color: var(--text-muted);
  font-size: 12px;
  font-style: normal;
}

.security-panel {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding: 16px;
}

.security-panel article,
dl div {
  min-width: 0;
  padding: 10px;
  background: rgba(3, 14, 36, 0.12);
  border: 1px solid rgba(121, 210, 255, 0.12);
}

.security-panel article span {
  display: block;
  color: var(--text-muted);
  font-size: 12px;
}

.security-panel article strong {
  display: block;
  overflow: hidden;
  margin-top: 8px;
  color: var(--text-main);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.security-panel .notice-box {
  grid-column: 1 / -1;
}

dl {
  display: grid;
  gap: 8px;
  margin: 12px;
}

dt {
  color: var(--text-muted);
  font-size: 12px;
}

dd {
  overflow: hidden;
  margin: 6px 0 0;
  color: var(--text-main);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notice-box {
  color: #69e2a4;
  font-size: 13px;
}

.notice-box.warning {
  color: var(--warning);
  border-color: rgba(255, 191, 107, 0.2);
}

.summary-panel .preview-box {
  margin: 12px;
}

.step-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 16px 16px;
}

.step-actions button {
  height: 34px;
  padding: 0 16px;
  color: #dff8ff;
  background: rgba(3, 14, 36, 0.2);
  border: 1px solid rgba(121, 210, 255, 0.2);
  cursor: pointer;
}

.step-actions button:disabled {
  color: rgba(223, 248, 255, 0.38);
  border-color: rgba(121, 210, 255, 0.08);
  cursor: not-allowed;
}
</style>
