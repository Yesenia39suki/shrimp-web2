<script setup lang="ts">
import { computed } from 'vue'

import { useShrimpSystemStore } from '@/stores/shrimpSystem'

const store = useShrimpSystemStore()

const selectedSpecies = computed(() => store.selectedPondProfile?.species ?? store.shrimpConfig.species)
const latestUpdate = computed(() => store.waterMetrics[0]?.updatedAt ?? '当前')
const selectedRobot = computed(
  () => store.robots.find((robot) => robot.pondId === store.pondConfig.selectedPondId) ?? store.robots[0],
)

const onlineRobots = computed(() => store.robots.filter((robot) => robot.online).length)
const deviceOnlineRate = computed(() => {
  if (store.robots.length === 0) {
    return 0
  }

  return Math.round((onlineRobots.value / store.robots.length) * 100)
})

const feedRecommendation = computed(() => {
  const maturity = shrimpMetricNumber('maturity')
  const temperature = metricNumber('temperature')

  return Math.round(220 + maturity * 1.5 + temperature * 1.6)
})

const modelConfidence = computed(() => {
  const base = 96 - store.activeAlertCount * 4 - store.robotAlerts.length * 2
  return Math.max(78, Math.min(96, base))
})

function metricNumber(key: string, fallback = 0) {
  const value = Number(store.waterMetrics.find((metric) => metric.key === key)?.value ?? fallback)
  return Number.isFinite(value) ? value : fallback
}

function shrimpMetricNumber(key: string, fallback = 0) {
  const value = Number(store.shrimpMetrics.find((metric) => metric.key === key)?.value ?? fallback)
  return Number.isFinite(value) ? value : fallback
}

const riskLevel = computed(() => {
  if (store.activeAlertCount === 0) {
    return '低风险'
  }

  if (store.activeAlertCount < 3) {
    return '关注'
  }

  return '预警'
})

const maturityValue = computed(() => {
  return shrimpMetricNumber('maturity')
})

const yieldValue = computed(() => {
  return shrimpMetricNumber('yield')
})

const temperatureValue = computed(() => {
  return metricNumber('temperature')
})

const oxygenValue = computed(() => {
  return metricNumber('oxygen')
})

const phValue = computed(() => {
  return metricNumber('ph')
})

const eventRows = computed(() => {
  const alerts = store.allAlerts.slice(0, 4).map((alert) => ({
    time: alert.time,
    label: alert.type,
    value: alert.reason,
    tone: alert.level === '预警' ? 'warning' : 'notice',
  }))

  const commands = store.robots
    .flatMap((robot) =>
      robot.commands.slice(0, 1).map((command) => ({
        time: command.slice(0, 5),
        label: robot.id,
        value: command,
        tone: 'normal',
      })),
    )
    .slice(0, 2)

  return [...alerts, ...commands].slice(0, 6)
})

const rightStats = computed(() => [
  { label: '当前池号', value: store.pondConfig.selectedPondId, unit: '', tone: 'cyan' },
  { label: '当前产量', value: yieldValue.value, unit: '吨', tone: 'cyan' },
  { label: '当前投喂量', value: feedRecommendation.value, unit: 'kg', tone: 'green' },
  { label: '成熟度', value: maturityValue.value, unit: '%', tone: 'green' },
  { label: '风险等级', value: riskLevel.value, unit: '', tone: 'amber' },
  {
    label: '最近事件',
    value: eventRows.value[0]?.time ?? latestUpdate.value,
    unit: '',
    tone: 'cyan',
  },
])

const waterStatusRows = computed(() =>
  store.waterMetrics.slice(0, 5).map((metric) => {
    const threshold = store.thresholds.water[metric.key]
    const alert = store.waterAlerts.find((item) => item.metricKey === metric.key)

    return {
      key: metric.key,
      label: metric.label,
      value: `${metric.value}${metric.unit}`,
      range: threshold
        ? `${threshold.min}${metric.unit}-${threshold.max}${metric.unit}`
        : '规则判断',
      tone: alert ? 'warning' : 'normal',
    }
  }),
)

const pondBars = computed(() => {
  return store.pondProfiles.map((profile) => {
    const maturityMetric = profile.shrimpMetrics.find((metric) => metric.key === 'maturity')

    return {
      pondId: profile.pondId,
      value: Number(maturityMetric?.value ?? 0),
      species: profile.species,
    }
  })
})

const kpiItems = computed(() => [
  {
    label: '温度',
    value: temperatureValue.value,
    unit: '℃',
    note: '水体热态',
    progress: Math.max(18, Math.min(100, Math.round((temperatureValue.value / 35) * 100))),
    accent: '#5bd6ff',
  },
  {
    label: '溶解氧',
    value: oxygenValue.value,
    unit: 'mg/L',
    note: '活跃度支撑',
    progress: Math.max(18, Math.min(100, Math.round((oxygenValue.value / 9) * 100))),
    accent: '#71e5aa',
  },
  {
    label: 'pH',
    value: phValue.value,
    unit: '',
    note: '酸碱平衡',
    progress: Math.max(18, Math.min(100, Math.round((phValue.value / 9) * 100))),
    accent: '#5bd6ff',
  },
  {
    label: '设备在线率',
    value: deviceOnlineRate.value,
    unit: '%',
    note: '机器人联动',
    progress: deviceOnlineRate.value,
    accent: '#71e5aa',
  },
  {
    label: '今日推荐投喂量',
    value: feedRecommendation.value,
    unit: 'kg',
    note: '模型联动',
    progress: Math.max(18, Math.min(100, Math.round((feedRecommendation.value / 420) * 100))),
    accent: '#5bd6ff',
  },
  {
    label: '当前异常数',
    value: store.activeAlertCount,
    unit: '条',
    note: '多源告警',
    progress: store.activeAlertCount === 0 ? 86 : Math.min(100, 26 + store.activeAlertCount * 18),
    accent: '#ffbf6b',
  },
  {
    label: '模型可信度',
    value: modelConfidence.value,
    unit: '%',
    note: '评估状态',
    progress: modelConfidence.value,
    accent: '#71e5aa',
  },
])

const stageTrendPanels = computed(() => [
  {
    title: '温度波动',
    value: `${temperatureValue.value}℃`,
    series: store.waterMetrics.find((metric) => metric.key === 'temperature')?.trend ?? [],
    color: '#5bd6ff',
  },
  {
    title: '溶氧波动',
    value: `${oxygenValue.value}mg/L`,
    series: store.waterMetrics.find((metric) => metric.key === 'oxygen')?.trend ?? [],
    color: '#71e5aa',
  },
  {
    title: 'pH 波动',
    value: String(phValue.value),
    series: store.waterMetrics.find((metric) => metric.key === 'ph')?.trend ?? [],
    color: '#ffbf6b',
  },
])

const waterQuickRows = computed(() =>
  store.waterMetrics.slice(0, 4).map((metric) => {
    const alert = store.waterAlerts.find((item) => item.metricKey === metric.key)
    return {
      key: metric.key,
      label: metric.label,
      value: `${metric.value}${metric.unit}`,
      status: alert ? alert.level : '正常',
      warning: Boolean(alert),
    }
  }),
)

const stageInfoRows = computed(() => [
  { label: '虾种', value: selectedSpecies.value },
  { label: '投喂模式', value: '高频少量投喂' },
  { label: '监测点位', value: '06 个' },
  { label: '设备联动', value: `${onlineRobots.value}/${store.robots.length}` },
  { label: '可信度', value: `${modelConfidence.value}%` },
])

const stageEvents = computed(() => store.allAlerts.slice(0, 4))

const selectedSummaryRows = computed(() => [
  {
    label: '实测重量',
    value: `${shrimpMetricNumber('weight')}克`,
  },
  {
    label: '估测数量',
    value: `${shrimpMetricNumber('count')}万尾`,
  },
  {
    label: '养殖天数',
    value: `${shrimpMetricNumber('cultureDays')}天`,
  },
  {
    label: '当前产量',
    value: `${yieldValue.value}吨`,
  },
])

const pondSnapshotRows = computed(() =>
  store.pondProfiles.map((profile) => {
    const maturityMetric = profile.shrimpMetrics.find((metric) => metric.key === 'maturity')
    const oxygenMetric = profile.waterMetrics.find((metric) => metric.key === 'oxygen')

    return {
      pondId: profile.pondId,
      species: profile.species,
      maturity: Number.isFinite(Number(maturityMetric?.value)) ? Number(maturityMetric?.value) : 0,
      oxygen: Number.isFinite(Number(oxygenMetric?.value)) ? Number(oxygenMetric?.value) : 0,
      active: profile.pondId === store.pondConfig.selectedPondId,
    }
  }),
)

function handlePondChange(event: Event) {
  store.selectPond((event.target as HTMLSelectElement).value)
}

function buildPolyline(values: number[], width = 160, height = 42, padding = 5) {
  if (values.length === 0) {
    return ''
  }

  const max = Math.max(...values)
  const min = Math.min(...values)
  const spread = max - min || 1

  return values
    .map((value, index) => {
      const x = padding + (index / Math.max(values.length - 1, 1)) * (width - padding * 2)
      const y = height - padding - ((value - min) / spread) * (height - padding * 2)
      return `${x},${y}`
    })
    .join(' ')
}
</script>

<template>
  <section class="screen-overview">
    <section class="kpi-strip">
      <article
        v-for="item in kpiItems"
        :key="item.label"
        class="kpi-chip"
        :style="{ '--accent': item.accent, '--progress': `${item.progress}%` }"
      >
        <div class="kpi-ring">
          <div class="kpi-ring-core"></div>
        </div>
        <div class="kpi-copy">
          <span>{{ item.label }}</span>
          <strong>
            {{ item.value }}
            <em>{{ item.unit }}</em>
          </strong>
          <small>{{ item.note }}</small>
        </div>
      </article>
    </section>

    <section class="main-stage">
      <section class="map-stage">
        <div class="map-stage-head">
          <div>
            <strong>区域监控主舞台</strong>
            <span>虾池养殖与投喂监测中心</span>
          </div>
          <div class="head-tags">
            <label class="pond-select">
              <span>当前池</span>
              <select :value="store.pondConfig.selectedPondId" @change="handlePondChange">
                <option v-for="pondId in store.pondConfig.pondIds" :key="pondId" :value="pondId">
                  {{ pondId }}
                </option>
              </select>
            </label>
            <span>虾种 {{ selectedSpecies }}</span>
            <span>风险 {{ riskLevel }}</span>
            <span>更新 {{ latestUpdate }}</span>
          </div>
        </div>

        <div class="stage-badge">
          <span>监测点 06</span>
          <span>风险点 {{ Math.max(1, store.activeAlertCount) }}</span>
          <span>在线设备 {{ onlineRobots }}/{{ store.robots.length }}</span>
        </div>

        <div class="stage-overlay">
        <section class="floating-panel panel-left-top">
          <div class="panel-headline">
            <strong>水质波动</strong>
            <span>最近 7 天</span>
          </div>
          <div v-for="panel in stageTrendPanels" :key="panel.title" class="trend-row">
            <div class="trend-meta">
              <span>{{ panel.title }}</span>
              <strong>{{ panel.value }}</strong>
            </div>
            <svg viewBox="0 0 160 42" preserveAspectRatio="none">
              <polyline
                :points="buildPolyline(panel.series)"
                fill="none"
                :stroke="panel.color"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <div class="water-mini-grid">
            <article
              v-for="row in waterQuickRows"
              :key="row.key"
              :class="{ warning: row.warning }"
            >
              <span>{{ row.label }}</span>
              <strong>{{ row.value }}</strong>
              <em>{{ row.status }}</em>
            </article>
          </div>
        </section>

        <section class="floating-panel panel-center-top">
          <div class="panel-headline">
            <strong>策略快照</strong>
            <span>模型联动</span>
          </div>
          <div class="compact-grid">
            <article v-for="row in stageInfoRows" :key="row.label">
              <span>{{ row.label }}</span>
              <strong>{{ row.value }}</strong>
            </article>
          </div>
        </section>

        <section class="floating-panel panel-center-core">
          <div class="panel-headline">
            <strong>当前池核心态势</strong>
            <span>{{ store.pondConfig.selectedPondId }}</span>
          </div>
          <div class="core-number">
            {{ feedRecommendation }}
            <em>kg 推荐投喂量</em>
          </div>
          <div class="core-grid">
            <article v-for="row in selectedSummaryRows" :key="row.label">
              <span>{{ row.label }}</span>
              <strong>{{ row.value }}</strong>
            </article>
          </div>
        </section>

        <section class="floating-panel panel-right-top">
          <div class="panel-headline">
            <strong>五池快照</strong>
            <span>多池对照</span>
          </div>
          <div class="pool-matrix">
            <article
              v-for="row in pondSnapshotRows"
              :key="row.pondId"
              :class="{ active: row.active }"
            >
              <div>
                <span>{{ row.pondId }}</span>
                <strong>{{ row.species }}</strong>
              </div>
              <p>成熟度 {{ row.maturity }}% / 溶氧 {{ row.oxygen }}mg/L</p>
            </article>
          </div>
        </section>

        <section class="floating-panel panel-left-bottom device-panel">
          <div class="panel-headline">
            <strong>机器人巡航窗口</strong>
            <span>{{ selectedRobot?.id }}</span>
          </div>
          <div class="device-visual">
            <i class="tower"></i>
            <i class="dock"></i>
            <i class="track"></i>
          </div>
          <div class="device-meta">
            <span>{{ selectedRobot?.name }}</span>
            <strong>{{ selectedRobot?.currentTask }}</strong>
          </div>
          <div class="device-status-grid">
            <article>
              <span>电量</span>
              <strong>{{ selectedRobot?.battery }}%</strong>
            </article>
            <article>
              <span>投喂机</span>
              <strong>{{ selectedRobot?.feederStatus }}</strong>
            </article>
            <article>
              <span>运动</span>
              <strong>{{ selectedRobot?.motionStatus }}</strong>
            </article>
            <article>
              <span>下次计划</span>
              <strong>{{ selectedRobot?.nextPlanAt }}</strong>
            </article>
          </div>
        </section>

        <section class="floating-panel panel-right-bottom">
          <div class="panel-headline">
            <strong>风险事件</strong>
            <span>{{ stageEvents.length }} 条</span>
          </div>
          <article
            v-for="alert in stageEvents"
            :key="alert.id"
            class="mini-event"
            :class="{ warning: alert.level === '预警' }"
          >
            <span>{{ alert.time }}</span>
            <strong>{{ alert.type }}</strong>
            <p>{{ alert.reason }}</p>
          </article>
          <div v-if="stageEvents.length === 0" class="stage-empty">当前没有风险事件</div>
        </section>
        </div>
      </section>

      <aside class="right-rail">
        <section class="rail-module">
          <div class="rail-head">
            <strong>当前对象</strong>
            <span>{{ store.systemMeta.currentStatus }}</span>
          </div>
          <div class="stat-stack">
            <article
              v-for="item in rightStats"
              :key="item.label"
              class="stat-row"
              :class="item.tone"
            >
              <span>{{ item.label }}</span>
              <strong>
                {{ item.value }}
                <em>{{ item.unit }}</em>
              </strong>
            </article>
          </div>
        </section>

        <section class="rail-module">
          <div class="rail-head">
            <strong>异常摘要</strong>
            <span>{{ store.activeAlertCount }} 条</span>
          </div>
          <div class="rail-events">
            <article
              v-for="row in eventRows.slice(0, 4)"
              :key="`${row.time}-${row.label}`"
              :class="row.tone"
            >
              <span>{{ row.time }}</span>
              <strong>{{ row.label }}</strong>
              <p>{{ row.value }}</p>
            </article>
          </div>
        </section>
      </aside>
    </section>

    <section class="bottom-band">
      <section class="band-panel">
        <div class="band-head">
          <strong>综合趋势</strong>
          <span>水温 / 溶氧 / pH</span>
        </div>
        <div class="trend-pack">
          <article v-for="panel in stageTrendPanels" :key="panel.title">
            <div>
              <span>{{ panel.title }}</span>
              <strong>{{ panel.value }}</strong>
            </div>
            <svg viewBox="0 0 220 54" preserveAspectRatio="none">
              <polyline
                :points="buildPolyline(panel.series, 220, 54, 6)"
                fill="none"
                :stroke="panel.color"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </article>
        </div>
      </section>

      <section class="band-panel">
        <div class="band-head">
          <strong>虾池对比</strong>
          <span>成熟度指数</span>
        </div>
        <div class="bar-pack">
          <article v-for="pond in pondBars" :key="pond.pondId">
            <span>{{ pond.pondId }}</span>
            <div><i :style="{ height: `${pond.value}%` }"></i></div>
            <strong>{{ pond.value }}</strong>
          </article>
        </div>
      </section>

      <section class="band-panel">
        <div class="band-head">
          <strong>事件流</strong>
          <span>最近触发</span>
        </div>
        <div class="list-pack">
          <article v-for="row in eventRows" :key="`${row.time}-${row.label}`">
            <span>{{ row.time }}</span>
            <strong>{{ row.label }}</strong>
            <p>{{ row.value }}</p>
          </article>
        </div>
      </section>

      <section class="band-panel">
        <div class="band-head">
          <strong>参数清单</strong>
          <span>水质快照</span>
        </div>
        <div class="param-pack">
          <article v-for="row in waterStatusRows" :key="row.key" :class="row.tone">
            <div>
              <span>{{ row.label }}</span>
              <strong>{{ row.value }}</strong>
            </div>
            <em>{{ row.range }}</em>
          </article>
        </div>
      </section>
    </section>
  </section>
</template>

<style scoped>
.screen-overview {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: 68px minmax(0, 1fr) 156px;
  gap: 10px;
  overflow: hidden;
}

.kpi-strip,
.map-stage,
.right-rail,
.band-panel {
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(74, 169, 255, 0.1), rgba(24, 84, 214, 0.05)),
    rgba(18, 70, 178, 0.03);
  border: 1px solid rgba(121, 210, 255, 0.11);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.015) inset,
    0 10px 20px rgba(10, 28, 76, 0.12);
  backdrop-filter: blur(4px);
}

.kpi-strip::before,
.map-stage::before,
.right-rail::before,
.band-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(91, 214, 255, 0.03) 1px, transparent 1px),
    linear-gradient(rgba(91, 214, 255, 0.025) 1px, transparent 1px);
  background-size: 18px 18px;
  opacity: 0.28;
}

.kpi-strip {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
  padding: 7px 10px;
}

.kpi-chip {
  --accent: #5bd6ff;
  --progress: 80%;
  position: relative;
  min-width: 0;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: rgba(20, 74, 188, 0.07);
  border: 1px solid rgba(121, 210, 255, 0.07);
}

.kpi-ring {
  position: relative;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: conic-gradient(var(--accent) var(--progress), rgba(91, 214, 255, 0.08) 0);
  box-shadow: 0 0 12px color-mix(in srgb, var(--accent) 18%, transparent);
}

.kpi-ring-core {
  position: absolute;
  inset: 4px;
  background: rgba(18, 56, 143, 0.8);
  border: 1px solid rgba(121, 210, 255, 0.1);
  border-radius: 50%;
}

.kpi-copy {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.kpi-copy span,
.kpi-copy small {
  color: var(--text-muted);
  font-size: 10px;
  line-height: 1.35;
  word-break: break-all;
}

.kpi-copy strong {
  color: #ffffff;
  font-size: 16px;
  line-height: 1.25;
  word-break: break-all;
}

.kpi-copy em {
  margin-left: 4px;
  color: var(--text-muted);
  font-size: 11px;
  font-style: normal;
  font-weight: 400;
}

.main-stage {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 292px;
  gap: 10px;
  overflow: hidden;
}

.map-stage {
  min-height: 0;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 8px;
  padding: 10px;
}

.stage-overlay {
  position: relative;
  z-index: 2;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(210px, 0.78fr) minmax(360px, 1.48fr) minmax(236px, 0.86fr);
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
  overflow: hidden;
}

.map-stage-head {
  position: relative;
  z-index: 3;
  min-height: 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.map-stage-head strong,
.rail-head strong,
.band-head strong,
.panel-headline strong {
  color: var(--text-main);
  font-size: 13px;
  font-weight: 600;
}

.map-stage-head span,
.rail-head span,
.band-head span,
.panel-headline span {
  color: var(--text-muted);
  font-size: 11px;
}

.head-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.head-tags span,
.pond-select {
  padding: 3px 8px;
  background: rgba(20, 74, 188, 0.08);
  border: 1px solid rgba(121, 210, 255, 0.08);
}

.pond-select {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.pond-select select {
  min-width: 84px;
  height: 22px;
  color: var(--text-main);
  background: rgba(10, 36, 94, 0.58);
  border: 1px solid rgba(121, 210, 255, 0.12);
  outline: none;
}

.stage-badge {
  position: relative;
  z-index: 2;
  justify-self: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 9px;
  background: rgba(20, 74, 188, 0.07);
  border: 1px solid rgba(121, 210, 255, 0.1);
}

.stage-badge span {
  color: #dff8ff;
  font-size: 11px;
}

.floating-panel {
  position: relative;
  z-index: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
  background: rgba(18, 70, 178, 0.04);
  border: 1px solid rgba(121, 210, 255, 0.08);
  backdrop-filter: blur(5px);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.015) inset,
    0 8px 16px rgba(10, 28, 76, 0.08);
}

.panel-left-top {
  grid-column: 1;
  grid-row: 1;
  padding: 8px;
}

.panel-center-top {
  grid-column: 2;
  grid-row: 1;
  padding: 8px;
}

.panel-center-core {
  grid-column: 2;
  grid-row: 2;
  padding: 9px 10px;
}

.panel-right-top {
  grid-column: 3;
  grid-row: 1;
  padding: 8px;
}

.panel-left-bottom {
  grid-column: 1;
  grid-row: 2;
  padding: 8px;
}

.panel-right-bottom {
  grid-column: 3;
  grid-row: 2;
  padding: 8px;
}

.panel-headline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.trend-row {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}

.trend-row + .trend-row {
  margin-top: 6px;
}

.trend-meta span {
  display: block;
  color: var(--text-muted);
  font-size: 11px;
}

.trend-meta strong {
  display: block;
  margin-top: 4px;
  color: #ffffff;
  font-size: 14px;
}

.trend-row svg {
  width: 100%;
  height: 34px;
}

.water-mini-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  margin-top: 7px;
}

.water-mini-grid article {
  min-width: 0;
  padding: 5px 6px;
  background: rgba(18, 70, 178, 0.045);
  border: 1px solid rgba(121, 210, 255, 0.08);
  border-left: 2px solid rgba(113, 229, 170, 0.48);
}

.water-mini-grid article.warning {
  border-left-color: rgba(255, 191, 107, 0.72);
}

.water-mini-grid span,
.water-mini-grid em {
  display: block;
  color: var(--text-muted);
  font-size: 10px;
  font-style: normal;
  line-height: 1.35;
}

.water-mini-grid strong {
  display: block;
  margin: 2px 0;
  color: #ffffff;
  font-size: 11px;
  line-height: 1.35;
  word-break: break-all;
}

.compact-grid {
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  overflow: auto;
}

.compact-grid article {
  min-width: 0;
  padding: 7px;
  background: rgba(18, 70, 178, 0.035);
  border: 1px solid rgba(121, 210, 255, 0.07);
}

.core-number {
  padding: 4px 0 8px;
  color: #ffffff;
  font-size: 32px;
  font-weight: 800;
  text-align: center;
}

.core-number em {
  display: block;
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
}

.core-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.core-grid article,
.pool-matrix article {
  background: rgba(18, 70, 178, 0.035);
  border: 1px solid rgba(121, 210, 255, 0.06);
}

.core-grid article {
  padding: 6px 7px;
}

.core-grid span,
.pool-matrix span {
  display: block;
  color: var(--text-muted);
  font-size: 11px;
}

.core-grid strong,
.pool-matrix strong {
  display: block;
  margin-top: 4px;
  color: var(--text-main);
  font-size: 12px;
  line-height: 1.45;
  word-break: break-all;
}

.pool-matrix {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  gap: 6px;
  grid-template-columns: 1fr;
  overflow: auto;
}

.pool-matrix article {
  padding: 6px 7px;
}

.pool-matrix article.active {
  border-color: rgba(121, 210, 255, 0.22);
  box-shadow: 0 0 12px rgba(74, 169, 255, 0.1);
}

.pool-matrix p {
  margin: 5px 0 0;
  color: var(--text-normal);
  font-size: 11px;
  line-height: 1.45;
}

.compact-grid span {
  display: block;
  color: var(--text-muted);
  font-size: 11px;
}

.compact-grid strong {
  display: block;
  margin-top: 4px;
  color: #ffffff;
  font-size: 12px;
  line-height: 1.45;
  word-break: break-all;
}

.device-visual {
  position: relative;
  height: 42px;
  margin-bottom: 6px;
  background:
    linear-gradient(rgba(121, 210, 255, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(121, 210, 255, 0.045) 1px, transparent 1px), rgba(18, 70, 178, 0.05);
  background-size: 14px 14px;
}

.device-visual .tower,
.device-visual .dock,
.device-visual .track {
  position: absolute;
  display: block;
}

.device-visual .tower {
  left: 26px;
  bottom: 12px;
  width: 22px;
  height: 30px;
  border: 2px solid rgba(91, 214, 255, 0.5);
  border-bottom: 0;
}

.device-visual .dock {
  left: 56px;
  bottom: 12px;
  width: 46px;
  height: 16px;
  background: rgba(255, 191, 107, 0.16);
  border: 1px solid rgba(255, 191, 107, 0.42);
}

.device-visual .track {
  left: 18px;
  right: 18px;
  bottom: 10px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(91, 214, 255, 0.56), transparent);
}

.device-meta span,
.device-meta p {
  display: block;
  color: var(--text-muted);
  font-size: 11px;
}

.device-meta strong {
  display: block;
  margin: 5px 0;
  color: #ffffff;
  font-size: 12px;
}

.device-meta p {
  margin: 0;
  line-height: 1.45;
}

.device-status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  margin-top: 2px;
}

.device-status-grid article {
  min-width: 0;
  padding: 5px 6px;
  background: rgba(18, 70, 178, 0.045);
  border: 1px solid rgba(121, 210, 255, 0.08);
}

.device-status-grid span {
  display: block;
  color: var(--text-muted);
  font-size: 10px;
  line-height: 1.35;
}

.device-status-grid strong {
  display: block;
  margin-top: 2px;
  color: #ffffff;
  font-size: 11px;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-event {
  padding: 6px 7px;
  background: rgba(18, 70, 178, 0.05);
  border: 1px solid rgba(121, 210, 255, 0.07);
}

.mini-event + .mini-event {
  margin-top: 6px;
}

.mini-event.warning {
  border-color: rgba(255, 191, 107, 0.18);
}

.mini-event span {
  display: block;
  color: var(--text-muted);
  font-size: 10px;
}

.mini-event strong {
  display: block;
  margin-top: 3px;
  color: #ffffff;
  font-size: 12px;
}

.mini-event p,
.stage-empty {
  margin: 4px 0 0;
  color: #cceefa;
  font-size: 11px;
  line-height: 1.45;
}

.right-rail {
  min-height: 0;
  display: grid;
  grid-template-rows: minmax(0, 1.08fr) minmax(0, 0.92fr);
  gap: 10px;
  padding: 9px;
  overflow: auto;
}

.rail-module {
  min-height: 0;
  display: grid;
  grid-template-rows: 32px minmax(0, 1fr);
  overflow: hidden;
  background: rgba(18, 70, 178, 0.04);
  border: 1px solid rgba(121, 210, 255, 0.07);
}

.rail-head,
.band-head {
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  background: rgba(18, 70, 178, 0.06);
  border-bottom: 1px solid rgba(121, 210, 255, 0.07);
}

.stat-stack,
.rail-events {
  padding: 7px;
  min-height: 0;
  overflow: auto;
}

.stat-stack {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
}

.stat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 7px;
  background: rgba(18, 70, 178, 0.05);
  border-left: 2px solid rgba(121, 210, 255, 0.32);
}

.stat-row.green {
  border-left-color: rgba(113, 229, 170, 0.58);
}

.stat-row.amber {
  border-left-color: rgba(255, 191, 107, 0.58);
}

.stat-row span {
  color: var(--text-muted);
  font-size: 11px;
}

.stat-row strong {
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  word-break: break-all;
}

.stat-row em {
  margin-left: 4px;
  color: var(--text-muted);
  font-size: 11px;
  font-style: normal;
  font-weight: 400;
}

.rail-events {
  display: grid;
  gap: 6px;
}

.rail-events article {
  padding: 6px 7px;
  background: rgba(18, 70, 178, 0.035);
  border: 1px solid rgba(121, 210, 255, 0.07);
}

.rail-events article.notice {
  border-color: rgba(255, 191, 107, 0.16);
}

.rail-events span {
  display: block;
  color: var(--text-muted);
  font-size: 10px;
}

.rail-events strong {
  display: block;
  margin-top: 3px;
  color: #ffffff;
  font-size: 11px;
}

.rail-events p {
  margin: 4px 0 0;
  color: #cceefa;
  font-size: 11px;
  line-height: 1.4;
}

.bottom-band {
  min-height: 0;
  display: grid;
  grid-template-columns: 1.2fr 0.9fr 1fr 1fr;
  gap: 10px;
}

.band-panel {
  min-height: 0;
  display: grid;
  grid-template-rows: 32px minmax(0, 1fr);
  overflow: hidden;
}

.trend-pack,
.bar-pack,
.list-pack,
.param-pack {
  min-height: 0;
  padding: 7px 9px;
  overflow: auto;
}

.trend-pack {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.trend-pack article {
  padding: 7px;
  background: rgba(18, 70, 178, 0.035);
  border: 1px solid rgba(121, 210, 255, 0.07);
}

.trend-pack span {
  display: block;
  color: var(--text-muted);
  font-size: 11px;
}

.trend-pack strong {
  display: block;
  margin-top: 4px;
  color: #ffffff;
  font-size: 12px;
}

.trend-pack svg {
  width: 100%;
  height: 42px;
  margin-top: 5px;
}

.bar-pack {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
  align-items: end;
}

.bar-pack article {
  min-width: 0;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 6px;
}

.bar-pack span,
.bar-pack strong {
  display: block;
  text-align: center;
  font-size: 10px;
}

.bar-pack span {
  color: var(--text-muted);
}

.bar-pack strong {
  color: #ffffff;
}

.bar-pack div {
  height: 62px;
  display: flex;
  align-items: end;
  justify-content: center;
  background: rgba(18, 70, 178, 0.05);
  border: 1px solid rgba(121, 210, 255, 0.07);
}

.bar-pack i {
  width: 14px;
  display: block;
  background: linear-gradient(180deg, rgba(91, 214, 255, 0.82), rgba(113, 229, 170, 0.4));
  box-shadow: 0 0 10px rgba(91, 214, 255, 0.18);
}

.list-pack,
.param-pack {
  display: grid;
  gap: 6px;
}

.list-pack article,
.param-pack article {
  padding: 6px 7px;
  background: rgba(18, 70, 178, 0.035);
  border: 1px solid rgba(121, 210, 255, 0.07);
}

.list-pack span,
.param-pack span,
.param-pack em {
  display: block;
  color: var(--text-muted);
  font-size: 10px;
}

.list-pack strong,
.param-pack strong {
  display: block;
  margin-top: 3px;
  color: #ffffff;
  font-size: 11px;
}

.list-pack p,
.param-pack em {
  margin: 3px 0 0;
  line-height: 1.35;
}

.param-pack article.warning {
  border-color: rgba(255, 191, 107, 0.16);
}
</style>
