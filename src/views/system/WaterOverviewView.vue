<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'

import MetricCard from '@/components/system/MetricCard.vue'
import {
  getLatestWaterData,
  getWaterHistory,
  uploadWaterData,
} from '@/services/waterDataService'
import { useAuthStore } from '@/stores/authStore'
import { useShrimpSystemStore } from '@/stores/shrimpSystem'
import type { SystemMetric } from '@/stores/shrimpSystem'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const store = useShrimpSystemStore()
const trendChartRef = ref<HTMLDivElement | null>(null)
const devWriteLoading = ref(false)
const devWriteResult = ref('')
let trendChart: echarts.ECharts | null = null

const trendKeys = ['temperature', 'oxygen', 'ph']
const rangeKeys = ['temperature', 'oxygen', 'ph', 'ammonia', 'nitrite']

const latestUpdate = computed(() => store.waterMetrics[0]?.updatedAt ?? '当前')
const normalCount = computed(() => store.waterMetrics.length - store.waterAlerts.length)
const showDevWaterWrite = computed(() => route.query.devWaterWrite === '1')

const overallState = computed(() => {
  if (store.waterAlerts.length === 0) {
    return {
      label: '水质稳定',
      tone: 'normal',
      description: '当前池水体参数处于用户配置范围内，可维持现有投喂节奏。',
    }
  }

  if (store.waterAlerts.some((alert) => alert.level === '预警')) {
    return {
      label: '水质预警',
      tone: 'danger',
      description: '存在超过阈值的水质参数，建议复核传感器并调整增氧或换水策略。',
    }
  }

  return {
    label: '水质关注',
    tone: 'warning',
    description: '部分参数接近目标边界，建议保持观察并降低投喂扰动。',
  }
})

const keyReadings = computed(() => {
  const pick = (key: string) => store.waterMetrics.find((metric) => metric.key === key)

  return [pick('temperature'), pick('oxygen'), pick('ph'), pick('ammonia')].filter(
    (metric): metric is SystemMetric => Boolean(metric),
  )
})

const focusAlerts = computed(() => store.waterAlerts.slice(0, 4))

const rangeRows = computed(() =>
  rangeKeys
    .map((key) => {
      const metric = store.waterMetrics.find((item) => item.key === key)
      const threshold = store.thresholds.water[key]

      if (!metric || !threshold) {
        return undefined
      }

      return {
        key,
        label: metric.label,
        range: `${threshold.min}${metric.unit} - ${threshold.max}${metric.unit}`,
      }
    })
    .filter((item): item is { key: string; label: string; range: string } => Boolean(item)),
)

const trendMetrics = computed(() =>
  trendKeys
    .map((key) => store.waterMetrics.find((metric) => metric.key === key))
    .filter((metric): metric is SystemMetric => Boolean(metric)),
)

function handlePondChange(event: Event) {
  store.selectPond((event.target as HTMLSelectElement).value)
}

function getAlert(metricKey: string) {
  return store.waterAlerts.find((alert) => alert.metricKey === metricKey)
}

function openMetric(metricKey: string) {
  router.push(`/system/water/${metricKey}`)
}

async function runDevWaterWrite() {
  const organizationId = authStore.currentOrganization?.id
  const pondId = 'P-01'

  if (!organizationId || !store.pondConfig.pondIds.includes(pondId)) {
    devWriteResult.value = '验证失败：当前登录企业不存在 P-01。'
    return
  }

  devWriteLoading.value = true
  devWriteResult.value = ''

  try {
    const recordedAt = new Date().toISOString()
    const uploaded = await uploadWaterData({
      organizationId,
      pondId,
      deviceId: '',
      reading: {
        temperature: 27.6,
        dissolvedOxygen: 6.9,
        ph: 7.8,
        orp: 320,
        turbidity: 18,
        ammonia: 0.08,
        nitrite: 0.03,
        hardness: 190,
        recordedAt,
      },
    })
    const [latest, history] = await Promise.all([
      getLatestWaterData(organizationId, pondId),
      getWaterHistory(organizationId, pondId, {
        startAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        endAt: new Date(Date.now() + 60 * 1000).toISOString(),
      }),
    ])
    const historyWritten = history.some((reading) => reading.id === uploaded.id)
    const latestUpdated = latest.reading.id === uploaded.id

    if (!historyWritten || !latestUpdated) {
      throw new Error('RPC 已返回，但 history/latest 一致性校验失败。')
    }

    devWriteResult.value = `验证成功：P-01 历史记录和最新记录已同步，记录时间 ${new Date(
      latest.reading.recordedAt,
    ).toLocaleString('zh-CN')}。`
  } catch (error) {
    devWriteResult.value = error instanceof Error ? `验证失败：${error.message}` : '验证失败。'
  } finally {
    devWriteLoading.value = false
  }
}

function buildTrendOption(): echarts.EChartsOption {
  const colors = ['#5bd6ff', '#71e5aa', '#ffbf6b']

  return {
    backgroundColor: 'transparent',
    color: colors,
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(4, 19, 35, 0.96)',
      borderColor: 'rgba(91, 214, 255, 0.36)',
      textStyle: { color: '#dff8ff' },
    },
    legend: {
      top: 4,
      right: 18,
      icon: 'roundRect',
      itemWidth: 14,
      itemHeight: 6,
      textStyle: { color: '#9ecddd', fontSize: 12 },
      data: trendMetrics.value.map((metric) => metric.label),
    },
    grid: { left: 42, right: 22, top: 40, bottom: 24 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['前6日', '前5日', '前4日', '前3日', '前2日', '昨日', '今日'],
      axisLabel: { color: '#86b0c1', fontSize: 11 },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(139, 211, 244, 0.18)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#86b0c1', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(139, 211, 244, 0.1)' } },
    },
    series: trendMetrics.value.map((metric, index) => ({
      name: metric.label,
      type: 'line',
      smooth: true,
      symbolSize: 5,
      data: metric.trend,
      lineStyle: {
        width: 2,
        shadowBlur: 10,
        shadowColor: colors[index] ?? '#5bd6ff',
      },
      areaStyle: {
        opacity: 0.12,
      },
    })),
  }
}

function renderTrendChart() {
  if (!trendChartRef.value) {
    return
  }

  if (!trendChart) {
    trendChart = echarts.init(trendChartRef.value)
  }

  trendChart.setOption(buildTrendOption(), true)
}

function resizeTrendChart() {
  trendChart?.resize()
}

onMounted(() => {
  nextTick(() => {
    renderTrendChart()
    window.addEventListener('resize', resizeTrendChart)
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeTrendChart)
  trendChart?.dispose()
})

watch(
  () => store.waterMetrics.map((metric) => metric.trend.join(',')).join('|'),
  () => renderTrendChart(),
)
</script>

<template>
  <section class="water-page">
    <section class="water-stage">
      <div class="water-copy">
        <span>水质参数监测子系统</span>
        <div class="headline-row">
          <h1>{{ overallState.label }}</h1>
          <p>{{ overallState.description }}</p>
        </div>
      </div>

      <div class="stage-tools">
        <div v-if="showDevWaterWrite" class="dev-write-tool">
          <button type="button" :disabled="devWriteLoading" @click="runDevWaterWrite">
            {{ devWriteLoading ? '验证写入中' : '开发验证写入' }}
          </button>
          <span>{{ devWriteResult || '仅开发验证：写入模拟测量值' }}</span>
        </div>
        <label>
          <span>当前虾池</span>
          <select :value="store.pondConfig.selectedPondId" @change="handlePondChange">
            <option v-for="pondId in store.pondConfig.pondIds" :key="pondId" :value="pondId">
              {{ pondId }}
            </option>
          </select>
        </label>
      </div>

      <div class="water-rings" aria-hidden="true">
        <i></i>
        <i></i>
        <i></i>
      </div>

      <div class="reading-strip">
        <article v-for="metric in keyReadings" :key="metric.key">
          <span>{{ metric.label }}</span>
          <strong>
            {{ metric.value }}
            <em>{{ metric.unit }}</em>
          </strong>
        </article>
      </div>

      <div class="water-meta">
        <article>
          <span>当前池号</span>
          <strong>{{ store.pondConfig.selectedPondId }}</strong>
        </article>
        <article>
          <span>正常参数</span>
          <strong>{{ normalCount }} 项</strong>
        </article>
        <article class="warn">
          <span>异常参数</span>
          <strong>{{ store.waterAlerts.length }} 项</strong>
        </article>
        <article>
          <span>最近更新</span>
          <strong>{{ latestUpdate }}</strong>
        </article>
      </div>
    </section>

    <main class="water-workbench">
      <section class="metric-cloud">
        <div class="zone-head">
          <strong>参数监测云带</strong>
          <span>点击进入详细监测页面</span>
        </div>
        <div class="metric-cloud-body">
          <MetricCard
            v-for="metric in store.waterMetrics"
            :key="metric.key"
            :metric="metric"
            :threshold="store.thresholds.water[metric.key]"
            :alert="getAlert(metric.key)"
            @open="openMetric"
          />
        </div>
      </section>

      <aside class="analysis-dock">
        <div class="zone-head">
          <strong>水质分析舱</strong>
          <span>{{ store.waterAlerts.length }} 条异常</span>
        </div>

        <div class="dock-state" :class="overallState.tone">
          <i></i>
          <div>
            <strong>{{ overallState.label }}</strong>
            <span>{{ overallState.description }}</span>
          </div>
        </div>

        <div class="alert-stream">
          <h3>异常摘要</h3>
          <div v-if="focusAlerts.length === 0" class="empty-alert">
            当前没有水质异常，建议保持现有投喂和增氧节奏。
          </div>
          <article v-for="alert in focusAlerts" v-else :key="alert.id">
            <strong>{{ alert.type }}</strong>
            <span>{{ alert.time }} / {{ alert.currentValue }}</span>
            <p>{{ alert.reason }}</p>
            <em>{{ alert.suggestion }}</em>
          </article>
        </div>

        <div class="range-list">
          <h3>配置范围</h3>
          <p v-for="row in rangeRows" :key="row.key">
            <span>{{ row.label }}</span>
            <strong>{{ row.range }}</strong>
          </p>
        </div>
      </aside>
    </main>

    <section class="trend-band">
      <div class="zone-head">
        <strong>水体趋势带</strong>
        <span>最近 7 天 / 温度、溶解氧、pH</span>
      </div>
      <div ref="trendChartRef" class="trend-chart"></div>
    </section>
  </section>
</template>

<style scoped>
.water-page {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: 228px minmax(0, 1fr) 218px;
  gap: 14px;
  overflow: hidden;
}

.water-stage,
.metric-cloud,
.analysis-dock,
.trend-band {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 78% 18%, rgba(91, 214, 255, 0.08), transparent 30%),
    linear-gradient(135deg, rgba(34, 100, 228, 0.12), rgba(14, 48, 126, 0.08)),
    rgba(10, 36, 94, 0.16);
  border: 1px solid rgba(121, 210, 255, 0.16);
  border-radius: 8px;
  box-shadow:
    0 16px 34px rgba(8, 24, 65, 0.18),
    0 0 22px rgba(74, 169, 255, 0.06);
}

.water-stage {
  display: grid;
  grid-template-columns: minmax(300px, 0.7fr) minmax(420px, 1fr);
  grid-template-rows: 58px 66px 58px;
  grid-template-areas:
    'copy tools'
    'readings readings'
    'meta meta';
  gap: 10px 20px;
  padding: 14px 20px 12px;
}

.water-stage::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(120deg, transparent 0 36%, rgba(91, 214, 255, 0.08) 37%, transparent 40%),
    linear-gradient(90deg, rgba(147, 232, 255, 0.06) 1px, transparent 1px),
    linear-gradient(rgba(147, 232, 255, 0.05) 1px, transparent 1px);
  background-size:
    100% 100%,
    30px 30px,
    30px 30px;
  opacity: 0.58;
}

.water-copy,
.stage-tools,
.reading-strip,
.water-meta,
.water-rings {
  position: relative;
  z-index: 1;
}

.water-copy {
  grid-area: copy;
  min-width: 0;
}

.water-copy span {
  color: var(--cyan);
  font-size: 13px;
}

.headline-row {
  min-width: 0;
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin-top: 5px;
}

.water-copy h1 {
  flex: 0 0 auto;
  margin: 0;
  color: var(--text-main);
  font-size: 28px;
  line-height: 1.05;
}

.water-copy p {
  min-width: 0;
  max-width: 540px;
  margin: 0 0 2px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stage-tools {
  grid-area: tools;
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
}

.dev-write-tool {
  display: grid;
  justify-items: end;
  gap: 4px;
  margin-right: 10px;
}

.dev-write-tool button {
  height: 30px;
  padding: 0 12px;
  color: var(--text-main);
  background: rgba(16, 54, 138, 0.72);
  border: 1px solid rgba(121, 210, 255, 0.28);
  cursor: pointer;
}

.dev-write-tool button:disabled {
  cursor: wait;
  opacity: 0.62;
}

.dev-write-tool span {
  max-width: 420px;
  color: var(--warning);
  text-align: right;
}

.stage-tools label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: rgba(16, 54, 138, 0.26);
  border: 1px solid rgba(121, 210, 255, 0.14);
}

.stage-tools span {
  color: var(--text-muted);
  font-size: 12px;
}

.stage-tools select {
  min-width: 88px;
  height: 28px;
  color: var(--text-main);
  background: rgba(8, 30, 78, 0.78);
  border: 1px solid rgba(121, 210, 255, 0.14);
  outline: none;
}

.water-rings {
  position: absolute;
  left: 36%;
  top: 12px;
  width: 330px;
  height: 118px;
  pointer-events: none;
}

.water-rings i {
  position: absolute;
  inset: 0;
  border: 1px solid rgba(91, 214, 255, 0.18);
  border-radius: 50%;
  transform: rotate(-8deg);
  box-shadow: 0 0 24px rgba(91, 214, 255, 0.08);
}

.water-rings i:nth-child(2) {
  inset: 16px 38px;
  transform: rotate(8deg);
  border-color: rgba(113, 229, 170, 0.16);
}

.water-rings i:nth-child(3) {
  inset: 34px 84px;
  transform: rotate(-18deg);
  border-color: rgba(255, 191, 107, 0.15);
}

.reading-strip {
  grid-area: readings;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.reading-strip article,
.water-meta article {
  min-width: 0;
  padding: 10px 11px;
  background: rgba(16, 54, 138, 0.22);
  border: 1px solid rgba(121, 210, 255, 0.1);
  border-radius: 7px;
}

.reading-strip span,
.water-meta span {
  display: block;
  color: var(--text-muted);
  font-size: 11px;
}

.reading-strip strong {
  display: block;
  margin-top: 4px;
  color: #ffffff;
  font-size: 24px;
  line-height: 1.05;
}

.reading-strip em {
  margin-left: 4px;
  color: var(--text-muted);
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
}

.water-meta {
  grid-area: meta;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.water-meta article.warn {
  border-color: rgba(255, 191, 107, 0.26);
}

.water-meta strong {
  display: block;
  min-width: 0;
  margin-top: 5px;
  color: var(--text-main);
  font-size: 15px;
  line-height: 1.4;
  word-break: break-all;
}

.water-workbench {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 14px;
  overflow: hidden;
}

.metric-cloud,
.analysis-dock,
.trend-band {
  min-height: 0;
}

.zone-head {
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 16px;
  background: rgba(12, 40, 104, 0.38);
  border-bottom: 1px solid rgba(121, 210, 255, 0.1);
}

.zone-head strong {
  color: var(--text-main);
  font-size: 15px;
}

.zone-head span {
  color: var(--cyan);
  font-size: 12px;
  line-height: 1.4;
  word-break: break-all;
}

.metric-cloud-body {
  height: calc(100% - 46px);
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-rows: minmax(124px, 1fr);
  gap: 10px;
  padding: 13px;
  overflow: auto;
}

.analysis-dock {
  display: grid;
  grid-template-rows: 46px auto minmax(0, 1fr) auto;
}

.dock-state {
  display: flex;
  gap: 10px;
  margin: 12px;
  padding: 12px;
  background: rgba(16, 54, 138, 0.12);
  border: 1px solid rgba(113, 229, 170, 0.2);
  border-radius: 7px;
}

.dock-state i {
  flex: 0 0 auto;
  width: 11px;
  height: 11px;
  margin-top: 4px;
  background: var(--success);
  border-radius: 50%;
  box-shadow: 0 0 14px rgba(113, 229, 170, 0.76);
}

.dock-state.warning {
  border-color: rgba(255, 191, 107, 0.26);
}

.dock-state.warning i {
  background: var(--warning);
  box-shadow: 0 0 14px rgba(255, 191, 107, 0.72);
}

.dock-state.danger {
  border-color: rgba(255, 111, 125, 0.28);
}

.dock-state.danger i {
  background: var(--danger);
  box-shadow: 0 0 14px rgba(255, 111, 125, 0.72);
}

.dock-state strong {
  color: var(--text-main);
  font-size: 15px;
}

.dock-state span {
  display: block;
  margin-top: 5px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.alert-stream,
.range-list {
  min-height: 0;
  margin: 0 12px 12px;
  overflow: auto;
}

.alert-stream h3,
.range-list h3 {
  margin: 0 0 9px;
  color: var(--cyan);
  font-size: 13px;
}

.empty-alert,
.alert-stream article,
.range-list p {
  background: rgba(16, 54, 138, 0.12);
  border: 1px solid rgba(121, 210, 255, 0.1);
  border-radius: 6px;
}

.empty-alert {
  padding: 12px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.6;
}

.alert-stream article {
  display: grid;
  gap: 5px;
  margin-bottom: 8px;
  padding: 10px;
  border-color: rgba(255, 191, 107, 0.24);
}

.alert-stream strong {
  color: var(--text-main);
  font-size: 13px;
}

.alert-stream span,
.alert-stream p,
.alert-stream em {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.45;
}

.alert-stream em {
  color: var(--warning);
  font-style: normal;
}

.range-list {
  padding-top: 10px;
  border-top: 1px solid rgba(121, 210, 255, 0.1);
}

.range-list p {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin: 0 0 7px;
  padding: 8px 9px;
}

.range-list span {
  color: var(--text-muted);
  font-size: 12px;
}

.range-list strong {
  color: var(--text-normal);
  font-size: 12px;
  font-weight: 500;
}

.trend-band {
  display: grid;
  grid-template-rows: 46px minmax(0, 1fr);
  background:
    radial-gradient(circle at 38% 18%, rgba(91, 214, 255, 0.12), transparent 32%),
    linear-gradient(135deg, rgba(34, 100, 228, 0.18), rgba(14, 48, 126, 0.14)),
    rgba(10, 36, 94, 0.32);
}

.trend-chart {
  min-width: 0;
  min-height: 0;
}

@media (max-width: 1320px) {
  .metric-cloud-body {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

