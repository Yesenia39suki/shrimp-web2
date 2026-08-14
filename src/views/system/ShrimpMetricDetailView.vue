<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import * as echarts from 'echarts'

import { useShrimpSystemStore } from '@/stores/shrimpSystem'

const route = useRoute()
const store = useShrimpSystemStore()

const compareChartRef = ref<HTMLDivElement | null>(null)
const progressChartRef = ref<HTMLDivElement | null>(null)
const trendChartRef = ref<HTMLDivElement | null>(null)

let compareChart: echarts.ECharts | null = null
let progressChart: echarts.ECharts | null = null
let trendChart: echarts.ECharts | null = null

const metricKey = computed(() => String(route.params.metricKey ?? ''))
const metric = computed(() => store.getShrimpMetricByKey(metricKey.value))
const threshold = computed(() => store.thresholds.shrimp[metricKey.value])
const alert = computed(() => store.allAlerts.find((item) => item.metricKey === metricKey.value))

const pondMetricRows = computed(() => {
  return store.pondProfiles.map((profile) => {
    const shrimpMetric = profile.shrimpMetrics.find((item) => item.key === metricKey.value)
    const value = typeof shrimpMetric?.value === 'number' ? shrimpMetric.value : 0
    const isWarning = threshold.value
      ? value < threshold.value.min || value > threshold.value.max
      : false

    return {
      pondId: profile.pondId,
      species: profile.species,
      value,
      unit: shrimpMetric?.unit ?? metric.value?.unit ?? '',
      updatedAt: shrimpMetric?.updatedAt ?? '当前',
      trend: shrimpMetric?.trend ?? [],
      description: shrimpMetric?.description ?? '',
      status: isWarning ? '关注' : '正常',
    }
  })
})

const selectedPondRow = computed(() =>
  pondMetricRows.value.find((row) => row.pondId === store.pondConfig.selectedPondId),
)

const thresholdText = computed(() => {
  if (!threshold.value || !metric.value) {
    return '模型规则判断'
  }

  return `${threshold.value.min}${metric.value.unit} - ${threshold.value.max}${metric.value.unit}`
})

const metricSummaryRows = computed(() => [
  { label: '当前虾池', value: store.pondConfig.selectedPondId },
  { label: '虾种', value: selectedPondRow.value?.species ?? '未配置' },
  { label: '当前值', value: `${metric.value?.value ?? '--'}${metric.value?.unit ?? ''}` },
  { label: '目标范围', value: thresholdText.value },
])

const maturityRows = computed(() => {
  return store.pondProfiles.map((profile) => {
    const maturityMetric = profile.shrimpMetrics.find((item) => item.key === 'maturity')
    const value = Number(maturityMetric?.value)
    return {
      pondId: profile.pondId,
      value: Number.isFinite(value) ? value : 0,
    }
  })
})

const trendAxisRange = computed(() => {
  const allValues = pondMetricRows.value.flatMap((row) => row.trend).filter((value) => Number.isFinite(value))

  if (allValues.length === 0) {
    return { min: 0, max: 10 }
  }

  const rawMin = Math.min(...allValues)
  const rawMax = Math.max(...allValues)
  const spread = rawMax - rawMin || Math.max(Math.abs(rawMax) * 0.08, 1)
  const padding = Math.max(spread * 0.18, Math.abs(rawMax) * 0.04, 1)
  const min = rawMin > 0 ? Math.max(0, rawMin - padding) : rawMin - padding
  const max = rawMax + padding

  return {
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
  }
})

function handlePondChange(event: Event) {
  store.selectPond((event.target as HTMLSelectElement).value)
}

function buildCompareOption(): echarts.EChartsOption {
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(11, 34, 88, 0.96)',
      borderColor: 'rgba(121, 210, 255, 0.3)',
      textStyle: { color: '#e8f7ff' },
    },
    grid: { left: 46, right: 18, top: 32, bottom: 34 },
    xAxis: {
      type: 'value',
      axisLabel: {
        color: 'rgba(230, 244, 255, 0.72)',
        fontSize: 11,
        formatter: `{value}${metric.value?.unit ?? ''}`,
      },
      splitLine: { lineStyle: { color: 'rgba(121, 210, 255, 0.08)' } },
    },
    yAxis: {
      type: 'category',
      data: pondMetricRows.value.map((row) => row.pondId),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { color: 'rgba(230, 244, 255, 0.78)', fontSize: 11 },
    },
    series: [
      {
        type: 'bar',
        barWidth: 16,
        data: pondMetricRows.value.map((row) => ({
          value: row.value,
          itemStyle: {
            color: row.pondId === store.pondConfig.selectedPondId ? '#79d2ff' : '#2f7bff',
          },
        })),
      },
    ],
  }
}

function buildProgressOption(): echarts.EChartsOption {
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(11, 34, 88, 0.96)',
      borderColor: 'rgba(121, 210, 255, 0.3)',
      textStyle: { color: '#e8f7ff' },
    },
    grid: { left: 20, right: 18, top: 24, bottom: 26 },
    xAxis: {
      type: 'category',
      data: maturityRows.value.map((row) => row.pondId),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(121, 210, 255, 0.14)' } },
      axisLabel: { color: 'rgba(230, 244, 255, 0.72)', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { color: 'rgba(230, 244, 255, 0.72)', fontSize: 11, formatter: '{value}%' },
      splitLine: { lineStyle: { color: 'rgba(121, 210, 255, 0.08)' } },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        symbolSize: 7,
        data: maturityRows.value.map((row) => row.value),
        lineStyle: {
          width: 3,
          color: '#71e5aa',
          shadowBlur: 10,
          shadowColor: 'rgba(113, 229, 170, 0.36)',
        },
        itemStyle: { color: '#71e5aa' },
        areaStyle: { color: 'rgba(113, 229, 170, 0.1)' },
      },
    ],
  }
}

function buildTrendOption(): echarts.EChartsOption {
  const palette = ['#79d2ff', '#2f7bff', '#71e5aa', '#ffbf6b', '#9e8bff']

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(11, 34, 88, 0.96)',
      borderColor: 'rgba(121, 210, 255, 0.3)',
      textStyle: { color: '#e8f7ff' },
    },
    legend: {
      top: 4,
      right: 18,
      textStyle: { color: 'rgba(230, 244, 255, 0.72)', fontSize: 11 },
      data: pondMetricRows.value.map((row) => row.pondId),
    },
    grid: { left: 42, right: 20, top: 40, bottom: 28 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['前6日', '前5日', '前4日', '前3日', '前2日', '昨日', '今日'],
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(121, 210, 255, 0.14)' } },
      axisLabel: { color: 'rgba(230, 244, 255, 0.72)', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      min: trendAxisRange.value.min,
      max: trendAxisRange.value.max,
      splitNumber: 4,
      axisLabel: {
        color: 'rgba(230, 244, 255, 0.72)',
        fontSize: 11,
        formatter: `{value}${metric.value?.unit ?? ''}`,
      },
      splitLine: { lineStyle: { color: 'rgba(121, 210, 255, 0.08)' } },
    },
    series: pondMetricRows.value.map((row, index) => {
      const isActive = row.pondId === store.pondConfig.selectedPondId
      const color = palette[index % palette.length]

      return {
        name: row.pondId,
        type: 'line',
        smooth: true,
        showSymbol: isActive,
        symbol: isActive ? 'circle' : 'none',
        symbolSize: isActive ? 7 : 4,
        z: isActive ? 3 : 1,
        emphasis: { focus: 'series' },
        data: row.trend,
        lineStyle: {
          width: isActive ? 3 : 1.5,
          type: isActive ? 'solid' : 'dashed',
          opacity: isActive ? 1 : 0.42,
          color,
        },
        itemStyle: {
          color,
          opacity: isActive ? 1 : 0.72,
        },
        areaStyle: isActive
          ? {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(74, 169, 255, 0.18)' },
                { offset: 1, color: 'rgba(74, 169, 255, 0.01)' },
              ]),
            }
          : undefined,
      }
    }),
  }
}

function renderCharts() {
  if (!metric.value) {
    return
  }

  if (compareChartRef.value) {
    compareChart ??= echarts.init(compareChartRef.value)
    compareChart.setOption(buildCompareOption(), true)
  }

  if (progressChartRef.value) {
    progressChart ??= echarts.init(progressChartRef.value)
    progressChart.setOption(buildProgressOption(), true)
  }

  if (trendChartRef.value) {
    trendChart ??= echarts.init(trendChartRef.value)
    trendChart.setOption(buildTrendOption(), true)
  }
}

function resizeCharts() {
  compareChart?.resize()
  progressChart?.resize()
  trendChart?.resize()
}

onMounted(() => {
  nextTick(() => {
    renderCharts()
    window.addEventListener('resize', resizeCharts)
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  compareChart?.dispose()
  progressChart?.dispose()
  trendChart?.dispose()
})

watch(
  () => [
    metricKey.value,
    store.pondConfig.selectedPondId,
    pondMetricRows.value
      .map((row) => `${row.pondId}-${row.value}-${row.status}-${row.trend.join(',')}`)
      .join('|'),
    threshold.value ? `${threshold.value.min}-${threshold.value.max}` : 'none',
  ],
  () => nextTick(renderCharts),
)
</script>

<template>
  <section class="detail-page">
    <div class="page-head">
      <div>
        <span>虾群参数详情</span>
        <h1>{{ metric?.label || '未知参数' }}</h1>
        <p>多池对比、成熟进度、目标范围与当前池轨迹联合分析</p>
      </div>
      <div class="head-actions">
        <label class="pond-switch">
          <span>当前虾池</span>
          <select :value="store.pondConfig.selectedPondId" @change="handlePondChange">
            <option v-for="pondId in store.pondConfig.pondIds" :key="pondId" :value="pondId">
              {{ pondId }}
            </option>
          </select>
        </label>
        <RouterLink to="/system/shrimp">返回虾群总览</RouterLink>
      </div>
    </div>

    <template v-if="metric">
      <div class="detail-body">
        <section class="summary-column">
          <section class="hero-card">
            <div class="panel-head">
              <strong>当前池概览</strong>
              <span :class="{ abnormal: alert }">{{ alert ? alert.level : '正常' }}</span>
            </div>
            <div class="hero-number">
              {{ metric.value }}
              <em>{{ metric.unit }}</em>
            </div>
            <div class="summary-grid">
              <article v-for="row in metricSummaryRows" :key="row.label">
                <span>{{ row.label }}</span>
                <strong>{{ row.value }}</strong>
              </article>
            </div>
            <div class="hero-note">
              {{ alert ? alert.reason : metric.description || '当前指标位于目标范围内。' }}
            </div>
          </section>

          <section class="pool-list-card">
            <div class="panel-head">
              <strong>多池快照</strong>
              <span>5 个虾池</span>
            </div>
            <div class="pool-list">
              <article
                v-for="row in pondMetricRows"
                :key="row.pondId"
                :class="{ active: row.pondId === store.pondConfig.selectedPondId, warning: row.status === '关注' }"
              >
                <div>
                  <span>{{ row.pondId }}</span>
                  <strong>{{ row.species }}</strong>
                </div>
                <div class="pool-meta">
                  <em>{{ row.value }}{{ row.unit }}</em>
                  <i>{{ row.status }}</i>
                </div>
              </article>
            </div>
          </section>
        </section>

        <section class="chart-column">
          <div class="chart-grid">
            <section class="chart-panel compare-panel">
              <div class="panel-head">
                <strong>五池横向对比</strong>
                <span>{{ metric.label }} / 条形图</span>
              </div>
              <div ref="compareChartRef" class="chart-body"></div>
            </section>

            <section class="chart-panel progress-panel">
              <div class="panel-head">
                <strong>成熟进度参考</strong>
                <span>各池成熟度</span>
              </div>
              <div ref="progressChartRef" class="chart-body"></div>
            </section>
          </div>

          <section class="chart-panel trend-panel">
            <div class="panel-head">
              <strong>多池变化轨迹</strong>
              <span>{{ metric.label }} / 折线图</span>
            </div>
            <div ref="trendChartRef" class="chart-body"></div>
          </section>
        </section>
      </div>
    </template>

    <div v-else class="empty">未找到对应虾群参数</div>
  </section>
</template>

<style scoped>
.detail-page {
  height: 100%;
  display: grid;
  grid-template-rows: 74px minmax(0, 1fr);
  gap: 12px;
  overflow: hidden;
}

.page-head,
.hero-card,
.pool-list-card,
.chart-panel,
.empty {
  background:
    linear-gradient(180deg, rgba(34, 100, 228, 0.1), rgba(14, 48, 126, 0.06)),
    rgba(10, 36, 94, 0.14);
  border: 1px solid rgba(121, 210, 255, 0.14);
  box-shadow: 0 12px 28px rgba(8, 24, 65, 0.14);
  backdrop-filter: blur(5px);
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
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

.head-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.pond-switch,
.page-head a {
  height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  color: var(--text-normal);
  text-decoration: none;
  background: rgba(16, 54, 138, 0.16);
  border: 1px solid rgba(121, 210, 255, 0.12);
}

.pond-switch span {
  color: var(--text-muted);
  font-size: 12px;
}

.pond-switch select {
  min-width: 88px;
  height: 24px;
  color: var(--text-main);
  background: rgba(8, 30, 78, 0.66);
  border: 1px solid rgba(121, 210, 255, 0.12);
  outline: none;
}

.detail-body {
  min-height: 0;
  display: grid;
  grid-template-columns: 380px minmax(0, 1fr);
  gap: 12px;
}

.summary-column,
.chart-column {
  min-height: 0;
}

.summary-column {
  display: grid;
  grid-template-rows: 1fr minmax(0, 1fr);
  gap: 12px;
}

.hero-card,
.pool-list-card,
.chart-panel {
  min-height: 0;
  overflow: hidden;
}

.panel-head {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  background: rgba(12, 40, 104, 0.22);
  border-bottom: 1px solid rgba(121, 210, 255, 0.08);
}

.panel-head strong {
  color: var(--text-main);
  font-size: 14px;
}

.panel-head span {
  color: var(--success);
  font-size: 12px;
}

.panel-head span.abnormal {
  color: var(--warning);
}

.hero-number {
  padding: 24px 16px 18px;
  color: #ffffff;
  font-size: 42px;
  font-weight: 800;
}

.hero-number em {
  margin-left: 6px;
  color: var(--text-muted);
  font-size: 15px;
  font-style: normal;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 0 16px 16px;
}

.summary-grid article,
.pool-list article {
  background: rgba(16, 54, 138, 0.16);
  border: 1px solid rgba(121, 210, 255, 0.08);
}

.summary-grid article {
  padding: 10px;
}

.summary-grid span,
.pool-list span {
  display: block;
  color: var(--text-muted);
  font-size: 12px;
}

.summary-grid strong,
.pool-list strong {
  display: block;
  margin-top: 5px;
  color: var(--text-main);
  font-size: 13px;
  line-height: 1.45;
  word-break: break-all;
}

.hero-note {
  margin: 0 16px 16px;
  padding: 10px 12px;
  color: var(--text-normal);
  font-size: 12px;
  line-height: 1.55;
  background: rgba(16, 54, 138, 0.1);
  border: 1px solid rgba(121, 210, 255, 0.08);
}

.pool-list {
  min-height: calc(100% - 44px);
  display: grid;
  gap: 8px;
  padding: 12px;
  overflow: auto;
}

.pool-list article {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px;
}

.pool-list article.active {
  border-color: rgba(121, 210, 255, 0.28);
  box-shadow: 0 0 12px rgba(74, 169, 255, 0.12);
}

.pool-list article.warning {
  border-color: rgba(255, 191, 107, 0.2);
}

.pool-meta {
  text-align: right;
}

.pool-meta em,
.pool-meta i {
  display: block;
  font-style: normal;
}

.pool-meta em {
  color: var(--text-main);
  font-size: 13px;
  line-height: 1.4;
}

.pool-meta i {
  margin-top: 4px;
  color: var(--warning);
  font-size: 11px;
}

.chart-column {
  display: grid;
  grid-template-rows: 246px minmax(0, 1fr);
  gap: 12px;
}

.chart-grid {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 12px;
}

.chart-panel {
  display: grid;
  grid-template-rows: 44px minmax(0, 1fr);
}

.chart-body {
  min-width: 0;
  min-height: 0;
}

.empty {
  display: grid;
  place-items: center;
  color: var(--text-muted);
}
</style>
