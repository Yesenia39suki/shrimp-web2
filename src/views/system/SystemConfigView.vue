<script setup lang="ts">
import { computed } from 'vue'

import type { RangeThreshold } from '@/stores/shrimpSystem'
import { useShrimpSystemStore } from '@/stores/shrimpSystem'

const store = useShrimpSystemStore()

const waterConfigKeys = ['temperature', 'oxygen', 'ph', 'ammonia', 'nitrite'] as const

const shrimpConfigKeys = ['length', 'weight', 'maturity'] as const

interface ThresholdRow {
  key: string
  label: string
  unit: string
  threshold: RangeThreshold
}

function metricLabel(metricKey: string) {
  return (
    store.waterMetrics.find((metric) => metric.key === metricKey)?.label ||
    store.shrimpMetrics.find((metric) => metric.key === metricKey)?.label ||
    metricKey
  )
}

function metricUnit(metricKey: string) {
  return (
    store.waterMetrics.find((metric) => metric.key === metricKey)?.unit ||
    store.shrimpMetrics.find((metric) => metric.key === metricKey)?.unit ||
    ''
  )
}

const waterThresholdRows = computed<ThresholdRow[]>(() => {
  return waterConfigKeys.flatMap((key) => {
    const threshold = store.thresholds.water[key]

    if (!threshold) {
      return []
    }

    return [{ key, label: metricLabel(key), unit: metricUnit(key), threshold }]
  })
})

const shrimpThresholdRows = computed<ThresholdRow[]>(() => {
  return shrimpConfigKeys.flatMap((key) => {
    const threshold = store.thresholds.shrimp[key]

    if (!threshold) {
      return []
    }

    return [{ key, label: metricLabel(key), unit: metricUnit(key), threshold }]
  })
})

function normalizePondIds() {
  const cleanedPondIds = Array.from(
    new Set(store.pondConfig.pondIds.map((pondId) => pondId.trim()).filter(Boolean)),
  )

  store.pondConfig.pondIds.splice(
    0,
    store.pondConfig.pondIds.length,
    ...(cleanedPondIds.length > 0 ? cleanedPondIds : ['A-01']),
  )

  if (!store.pondConfig.pondIds.includes(store.pondConfig.selectedPondId)) {
    store.selectPond(store.pondConfig.pondIds[0] ?? 'A-01')
  }
}

function addPondId() {
  store.pondConfig.pondIds.push(`P-${String(store.pondConfig.pondIds.length + 1).padStart(2, '0')}`)
  normalizePondIds()
}

function removePondId(index: number) {
  if (store.pondConfig.pondIds.length <= 1) {
    return
  }

  store.pondConfig.pondIds.splice(index, 1)
  normalizePondIds()
}
</script>

<template>
  <section class="config-page">
    <div class="page-head">
      <div>
        <span>自定义内容</span>
        <h1>系统配置与异常规则</h1>
        <p>修改上下限后立即参与异常计算，顶部铃铛同步刷新</p>
      </div>
      <strong>当前异常 {{ store.activeAlertCount }} 条</strong>
    </div>

    <div class="config-layout">
      <section class="config-panel">
        <div class="panel-title">
          <strong>基础配置</strong>
          <span>池号 / 虾种 / 机器人</span>
        </div>
        <h2>水池配置</h2>
        <div class="pond-edit-list">
          <div v-for="(pondId, index) in store.pondConfig.pondIds" :key="`${pondId}-${index}`">
            <input
              v-model="store.pondConfig.pondIds[index]"
              type="text"
              aria-label="自定义水池编号"
              @blur="normalizePondIds"
            />
            <button type="button" @click="removePondId(index)">删除</button>
          </div>
          <button type="button" class="add-pond-button" @click="addPondId">新增水池编号</button>
        </div>
        <label>
          <span>当前水池编号</span>
          <select
            v-model="store.pondConfig.selectedPondId"
            @change="store.selectPond(store.pondConfig.selectedPondId)"
          >
            <option v-for="pondId in store.pondConfig.pondIds" :key="pondId" :value="pondId">
              {{ pondId }}
            </option>
          </select>
        </label>
        <h2>虾种配置</h2>
        <label>
          <span>虾的种类</span>
          <input v-model="store.shrimpConfig.species" type="text" />
        </label>
        <h2>机器人配置</h2>
        <div class="robot-config-list">
          <div v-for="robot in store.robotConfig.robots" :key="robot.id">
            <input v-model="robot.id" type="text" aria-label="机器人编号" />
            <input v-model="robot.name" type="text" aria-label="机器人名称" />
            <select v-model="robot.pondId" aria-label="绑定水池">
              <option v-for="pondId in store.pondConfig.pondIds" :key="pondId" :value="pondId">
                {{ pondId }}
              </option>
            </select>
          </div>
        </div>
      </section>

      <section class="config-panel">
        <div class="panel-title">
          <strong>水质参数上下限</strong>
          <span>配置变化立即参与异常判断</span>
        </div>
        <div class="threshold-list">
          <div v-for="row in waterThresholdRows" :key="row.key" class="threshold-row">
            <strong>{{ row.label }}</strong>
            <input v-model.number="row.threshold.min" type="number" step="0.01" />
            <span>至</span>
            <input v-model.number="row.threshold.max" type="number" step="0.01" />
            <em>{{ row.unit }}</em>
          </div>
        </div>
      </section>

      <section class="config-panel">
        <div class="panel-title">
          <strong>虾群参数目标范围</strong>
          <span>长度 / 重量 / 成熟度</span>
        </div>
        <div class="threshold-list">
          <div v-for="row in shrimpThresholdRows" :key="row.key" class="threshold-row">
            <strong>{{ row.label }}</strong>
            <input v-model.number="row.threshold.min" type="number" step="0.01" />
            <span>至</span>
            <input v-model.number="row.threshold.max" type="number" step="0.01" />
            <em>{{ row.unit }}</em>
          </div>
        </div>
      </section>

      <section class="config-panel">
        <div class="panel-title">
          <strong>机器人异常判断规则</strong>
          <span>在线 / 电量 / 投喂机</span>
        </div>
        <label class="checkbox-row">
          <input v-model="store.thresholds.robot.requireOnline" type="checkbox" />
          <span>机器人必须在线</span>
        </label>
        <label>
          <span>最低电量</span>
          <input
            v-model.number="store.thresholds.robot.minBattery"
            type="number"
            min="0"
            max="100"
          />
        </label>
        <label>
          <span>正常投喂机状态</span>
          <input v-model="store.thresholds.robot.normalFeederStatus" type="text" />
        </label>
        <label>
          <span>正常异常状态</span>
          <input v-model="store.thresholds.robot.normalAbnormalStatus" type="text" />
        </label>
      </section>

      <section class="config-panel live-panel">
        <div class="panel-title">
          <strong>异常联动结果</strong>
          <span>铃铛读取同一份结果</span>
        </div>
        <div v-if="store.allAlerts.length === 0" class="empty">当前无异常</div>
        <article v-for="alert in store.allAlerts" v-else :key="alert.id" class="live-alert">
          <strong>{{ alert.type }}</strong>
          <span>{{ alert.currentValue }} / {{ alert.normalRange }}</span>
          <p>{{ alert.suggestion }}</p>
        </article>
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

.page-head strong {
  padding: 8px 12px;
  color: var(--warning);
  font-size: 14px;
  background: rgba(255, 191, 107, 0.08);
  border: 1px solid rgba(255, 191, 107, 0.18);
}

.config-layout {
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr)) 380px;
  grid-auto-rows: minmax(0, 1fr);
  gap: 12px;
  overflow: hidden;
}

.config-panel {
  min-height: 0;
  overflow: auto;
  padding-bottom: 12px;
}

.live-panel {
  grid-row: span 2;
}

.panel-title {
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
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

h2 {
  margin: 14px 14px 4px;
  color: var(--cyan);
  font-size: 13px;
  font-weight: 700;
}

label {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
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

.robot-config-list {
  display: grid;
  gap: 8px;
  margin: 12px 14px 0;
}

.pond-edit-list {
  display: grid;
  gap: 8px;
  margin: 12px 14px 0;
}

.pond-edit-list div {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 64px;
  gap: 8px;
  padding: 8px;
  background: rgba(16, 54, 138, 0.12);
  border: 1px solid rgba(121, 210, 255, 0.08);
}

.pond-edit-list button,
.add-pond-button {
  height: 32px;
  color: #dff8ff;
  background: rgba(8, 30, 78, 0.76);
  border: 1px solid rgba(121, 210, 255, 0.16);
}

.pond-edit-list button:hover,
.add-pond-button:hover {
  border-color: rgba(121, 210, 255, 0.32);
}

.robot-config-list div {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) 76px;
  gap: 8px;
  padding: 8px;
  background: rgba(16, 54, 138, 0.12);
  border: 1px solid rgba(121, 210, 255, 0.08);
}

.threshold-list {
  display: grid;
  gap: 8px;
  padding: 12px 14px 0;
}

.threshold-row {
  display: grid;
  grid-template-columns: 120px 1fr 24px 1fr 68px;
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

.checkbox-row {
  grid-template-columns: 18px minmax(0, 1fr);
}

.checkbox-row input {
  width: 16px;
  height: 16px;
  padding: 0;
}

.empty {
  padding: 24px 14px;
  color: var(--text-muted);
  text-align: center;
}

.live-alert {
  margin: 10px 12px;
  padding: 10px;
  background: rgba(16, 54, 138, 0.12);
  border: 1px solid rgba(255, 191, 107, 0.22);
}

.live-alert strong {
  color: var(--text-main);
  font-size: 13px;
}

.live-alert span {
  display: block;
  margin-top: 5px;
  color: var(--warning);
  font-size: 12px;
}

.live-alert p {
  margin: 7px 0 0;
  color: var(--text-normal);
  font-size: 12px;
  line-height: 1.45;
}
</style>
