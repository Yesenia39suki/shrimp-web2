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

    <div class="config-layout">
      <section class="config-panel pond-panel">
        <div class="panel-title">
          <strong>池塘基础信息</strong>
          <span>当前企业独立配置</span>
        </div>

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
        <label>
          <span>位置</span>
          <input v-model.trim="form.pond.location" :disabled="!canEdit" type="text" />
        </label>
      </section>

      <section class="config-panel robot-panel">
        <div class="panel-title">
          <strong>机器人基础信息</strong>
          <span>仅做前端模拟配置</span>
        </div>

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

        <div class="preview-box">
          <strong>当前绑定关系</strong>
          <p>企业：{{ organizationName }}</p>
          <p>虾池：{{ form.pond.pond_code }} / {{ form.pond.pond_name }}</p>
          <p>机器人：{{ form.robot.robot_code }} / {{ form.robot.robot_name }}</p>
        </div>
      </section>

      <section class="config-panel threshold-panel">
        <div class="panel-title">
          <strong>水质参数上下限</strong>
          <span>保存后参与异常判断</span>
        </div>

        <div class="threshold-list">
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
      </section>

      <section class="config-panel summary-panel">
        <div class="panel-title">
          <strong>模拟数据隔离状态</strong>
          <span>后续替换 Supabase 服务</span>
        </div>

        <dl>
          <div>
            <dt>当前企业</dt>
            <dd>{{ organizationName }}</dd>
          </div>
          <div>
            <dt>当前用户</dt>
            <dd>{{ authStore.currentUser?.display_name }}</dd>
          </div>
          <div>
            <dt>当前角色</dt>
            <dd>{{ authStore.currentRoleText }}</dd>
          </div>
          <div>
            <dt>当前池号</dt>
            <dd>{{ store.pondConfig.selectedPondId }}</dd>
          </div>
          <div>
            <dt>异常数量</dt>
            <dd>{{ store.activeAlertCount }} 条</dd>
          </div>
        </dl>

        <div class="notice-box" :class="{ warning: !canEdit }">
          {{ permissionText }}
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.config-page {
  height: 100%;
  display: grid;
  grid-template-rows: 74px minmax(0, 1fr);
  gap: 12px;
  overflow: hidden;
}

.page-head,
.config-panel {
  background:
    linear-gradient(180deg, rgba(34, 100, 228, 0.12), rgba(14, 48, 126, 0.08)),
    rgba(10, 36, 94, 0.16);
  border: 1px solid rgba(121, 210, 255, 0.16);
  box-shadow: 0 14px 30px rgba(8, 24, 65, 0.18);
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
  grid-template-columns: minmax(190px, 240px) 86px 62px minmax(140px, 190px);
  align-items: center;
  gap: 8px;
}

.tenant-chip {
  min-width: 0;
  display: grid;
  gap: 4px;
  padding: 7px 10px;
  background: rgba(16, 54, 138, 0.18);
  border: 1px solid rgba(121, 210, 255, 0.12);
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
  background: rgba(12, 54, 82, 0.88);
  border: 1px solid rgba(121, 210, 255, 0.22);
  cursor: pointer;
}

.page-actions button.ghost {
  background: rgba(8, 30, 78, 0.64);
}

.page-actions button:disabled {
  color: rgba(223, 248, 255, 0.42);
  background: rgba(8, 30, 78, 0.38);
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

.config-layout {
  min-height: 0;
  display: grid;
  grid-template-columns: 330px 330px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) 190px;
  gap: 12px;
  overflow: hidden;
}

.config-panel {
  min-height: 0;
  overflow: auto;
  padding-bottom: 12px;
}

.threshold-panel {
  grid-row: span 2;
}

.summary-panel {
  grid-column: 1 / 3;
}

.panel-title {
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 14px;
  background: rgba(12, 40, 104, 0.22);
  border-bottom: 1px solid rgba(121, 210, 255, 0.1);
}

.panel-title strong {
  color: var(--text-main);
}

.panel-title span {
  color: var(--text-muted);
  font-size: 12px;
}

label {
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  margin: 12px 14px 0;
  padding: 8px;
  background: rgba(16, 54, 138, 0.12);
  border: 1px solid rgba(121, 210, 255, 0.08);
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
  background: rgba(8, 30, 78, 0.78);
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
  background: rgba(8, 30, 78, 0.38);
  cursor: not-allowed;
}

.preview-box,
.notice-box {
  margin: 12px 14px 0;
  padding: 12px;
  background: rgba(16, 54, 138, 0.12);
  border: 1px solid rgba(121, 210, 255, 0.1);
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
  padding: 12px 14px 0;
}

.threshold-row {
  display: grid;
  grid-template-columns: 146px 1fr 24px 1fr 72px;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: rgba(16, 54, 138, 0.12);
  border: 1px solid rgba(121, 210, 255, 0.08);
}

.threshold-row span,
.threshold-row em {
  color: var(--text-muted);
  font-size: 12px;
  font-style: normal;
}

dl {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  margin: 12px 14px 0;
}

dl div {
  min-width: 0;
  padding: 10px;
  background: rgba(16, 54, 138, 0.12);
  border: 1px solid rgba(121, 210, 255, 0.08);
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
</style>
