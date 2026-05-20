<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import * as echarts from 'echarts'

import { useShrimpSystemStore } from '@/stores/shrimpSystem'

const route = useRoute()
const store = useShrimpSystemStore()

const trendChartRef = ref<HTMLDivElement | null>(null)
const compareChartRef = ref<HTMLDivElement | null>(null)
const pieChartRef = ref<HTMLDivElement | null>(null)

let trendChart: echarts.ECharts | null = null
let compareChart: echarts.ECharts | null = null
let pieChart: echarts.ECharts | null = null

const metricKey = computed(() => String(route.params.metricKey ?? ''))
const metric = computed(() => store.getWaterMetricByKey(metricKey.value))
const threshold = computed(() => store.thresholds.water[metricKey.value])
const alert = computed(() => store.waterAlerts.find((item) => item.metricKey === metricKey.value))

const thresholdText = computed(() => {
  if (!threshold.value || !metric.value) {
    return '未配置'
  }

  return `${threshold.value.min}${metric.value.unit} - ${threshold.value.max}${metric.value.unit}`
})

const pondMetricRows = computed(() => {
  return store.pondProfiles.map((profile) => {
    const pondMetric = profile.waterMetrics.find((item) => item.key === metricKey.value)
    const value = Number(pondMetric?.value ?? 0)
    const isWarning = threshold.value
      ? value < threshold.value.min || value > threshold.value.max
      : false

    return {
      pondId: profile.pondId,
      species: profile.species,
      value,
      unit: pondMetric?.unit ?? metric.value?.unit ?? '',
      trend: pondMetric?.trend ?? [],
      updatedAt: pondMetric?.updatedAt ?? '当前',
      status: isWarning ? '预警' : '正常',
    }
  })
})

const selectedPondRow = computed(() => {
  return pondMetricRows.value.find((row) => row.pondId === store.pondConfig.selectedPondId)
})

const distributionRows = computed(() => {
  const warningCount = pondMetricRows.value.filter((row) => row.status === '预警').length
  const normalCount = pondMetricRows.value.length - warningCount

  return [
    { name: '正常池', value: normalCount, itemStyle: { color: '#4aa9ff' } },
    { name: '预警池', value: warningCount, itemStyle: { color: '#ffbf6b' } },
  ]
})

function handlePondChange(event: Event) {
  store.selectPond((event.target as HTMLSelectElement).value)
}

function buildTrendOption(): echarts.EChartsOption {
  const currentMetric = metric.value

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(11, 34, 88, 0.96)',
      borderColor: 'rgba(121, 210, 255, 0.3)',
      textStyle: { color: '#e8f7ff' },
    },
    grid: { left: 44, right: 18, top: 36, bottom: 28 },
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
      axisLabel: {
        color: 'rgba(230, 244, 255, 0.72)',
        fontSize: 11,
        formatter: `{value}${currentMetric?.unit ?? ''}`,
      },
      splitLine: { lineStyle: { color: 'rgba(121, 210, 255, 0.08)' } },
    },
    series: [
      {
        name: `${store.pondConfig.selectedPondId} ${currentMetric?.label ?? ''}`,
        type: 'line',
        smooth: true,
        symbolSize: 7,
        data: currentMetric?.trend ?? [],
        lineStyle: {
          width: 3,
          color: '#4aa9ff',
          shadowBlur: 12,
          shadowColor: 'rgba(74, 169, 255, 0.38)',
        },
        itemStyle: { color: '#79d2ff' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(74, 169, 255, 0.28)' },
            { offset: 1, color: 'rgba(74, 169, 255, 0.02)' },
          ]),
        },
      },
    ],
  }
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
    grid: { left: 44, right: 18, top: 28, bottom: 34 },
    xAxis: {
      type: 'category',
      data: pondMetricRows.value.map((row) => row.pondId),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(121, 210, 255, 0.14)' } },
      axisLabel: { color: 'rgba(230, 244, 255, 0.76)', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: 'rgba(230, 244, 255, 0.72)',
        fontSize: 11,
        formatter: `{value}${metric.value?.unit ?? ''}`,
      },
      splitLine: { lineStyle: { color: 'rgba(121, 210, 255, 0.08)' } },
    },
    series: [
      {
        type: 'bar',
        barWidth: 22,
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

function buildPieOption(): echarts.EChartsOption {
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(11, 34, 88, 0.96)',
      borderColor: 'rgba(121, 210, 255, 0.3)',
      textStyle: { color: '#e8f7ff' },
    },
    legend: {
      bottom: 8,
      textStyle: { color: 'rgba(230, 244, 255, 0.72)', fontSize: 11 },
    },
    series: [
      {
        type: 'pie',
        radius: ['50%', '72%'],
        center: ['50%', '45%'],
        label: {
          color: 'rgba(230, 244, 255, 0.84)',
          fontSize: 11,
          formatter: '{b}\n{c}个',
        },
        labelLine: { lineStyle: { color: 'rgba(121, 210, 255, 0.2)' } },
        data: distributionRows.value,
      },
    ],
  }
}

function renderCharts() {
  if (!metric.value) {
    return
  }

  if (trendChartRef.value) {
    trendChart ??= echarts.init(trendChartRef.value)
    trendChart.setOption(buildTrendOption(), true)
  }

  if (compareChartRef.value) {
    compareChart ??= echarts.init(compareChartRef.value)
    compareChart.setOption(buildCompareOption(), true)
  }

  if (pieChartRef.value) {
    pieChart ??= echarts.init(pieChartRef.value)
    pieChart.setOption(buildPieOption(), true)
  }
}

function resizeCharts() {
  trendChart?.resize()
  compareChart?.resize()
  pieChart?.resize()
}

onMounted(() => {
  nextTick(() => {
    renderCharts()
    window.addEventListener('resize', resizeCharts)
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  trendChart?.dispose()
  compareChart?.dispose()
  pieChart?.dispose()
})

watch(
  () => [
    metricKey.value,
    store.pondConfig.selectedPondId,
    store.waterMetrics.map((item) => `${item.key}-${item.value}`).join('|'),
    threshold.value ? `${threshold.value.min}-${threshold.value.max}` : 'none',
  ],
  () => nextTick(renderCharts),
)
</script>

<template>
  <section class="detail-page">
    <div class="page-head">
      <div>
        <span>水质参数详情</span>
        <h1>{{ metric?.label || '未知参数' }}</h1>
        <p>当前池趋势、五池对比、状态分布与各池快照统一查看</p>
      </div>
      <div class="head-actions">
        <label class="pond-switch">
          <span>查看虾池</span>
          <select :value="store.pondConfig.selectedPondId" @change="handlePondChange">
            <option v-for="pondId in store.pondConfig.pondIds" :key="pondId" :value="pondId">
              {{ pondId }}
            </option>
          </select>
        </label>
        <RouterLink to="/system/water">返回水质总览</RouterLink>
      </div>
    </div>

    <template v-if="metric">
      <div class="detail-body">
        <section class="info-panel">
          <div class="panel-title">
            <strong>当前池数据</strong>
            <span :class="{ abnormal: alert }">{{ alert ? alert.level : '正常' }}</span>
          </div>

          <div class="metric-number">
            {{ metric.value }}
            <em>{{ metric.unit }}</em>
          </div>

          <div class="summary-strip">
            <article>
              <span>当前虾池</span>
              <strong>{{ store.pondConfig.selectedPondId }}</strong>
            </article>
            <article>
              <span>虾种</span>
              <strong>{{ selectedPondRow?.species ?? '未配置' }}</strong>
            </article>
            <article>
              <span>更新时间</span>
              <strong>{{ metric.updatedAt }}</strong>
            </article>
          </div>

          <dl class="info-list">
            <div>
              <dt>正常范围</dt>
              <dd>{{ thresholdText }}</dd>
            </div>
            <div>
              <dt>状态说明</dt>
              <dd>{{ alert ? alert.reason : '当前参数处于配置区间内，暂无异常。' }}</dd>
            </div>
            <div>
              <dt>处理建议</dt>
              <dd>{{ alert ? alert.suggestion : '继续保持当前监测频率，并关注晚间波动。' }}</dd>
            </div>
          </dl>

          <div class="pond-list">
            <article
              v-for="row in pondMetricRows"
              :key="row.pondId"
              :class="{ active: row.pondId === store.pondConfig.selectedPondId, warning: row.status === '预警' }"
            >
              <div>
                <span>{{ row.pondId }}</span>
                <strong>{{ row.species }}</strong>
              </div>
              <em>{{ row.value }}{{ row.unit }}</em>
            </article>
          </div>
        </section>

        <section class="chart-stage">
          <div class="chart-top">
            <section class="chart-panel wide">
              <div class="chart-head">
                <strong>{{ store.pondConfig.selectedPondId }} 最近 7 天趋势</strong>
                <span>{{ metric.label }}</span>
              </div>
              <div ref="trendChartRef" class="chart-body"></div>
            </section>

            <section class="chart-panel side">
              <div class="chart-head">
                <strong>五池状态分布</strong>
                <span>正常 / 预警</span>
              </div>
              <div ref="pieChartRef" class="chart-body"></div>
            </section>
          </div>

          <div class="chart-bottom">
            <section class="chart-panel wide">
              <div class="chart-head">
                <strong>五个虾池当前值对比</strong>
                <span>{{ metric.label }} / 柱状图</span>
              </div>
              <div ref="compareChartRef" class="chart-body"></div>
            </section>

            <section class="chart-panel side list-panel">
              <div class="chart-head">
                <strong>各池快照</strong>
                <span>{{ metric.label }}</span>
              </div>
              <div class="pond-table">
                <article v-for="row in pondMetricRows" :key="`table-${row.pondId}`">
                  <div>
                    <span>{{ row.pondId }}</span>
                    <strong>{{ row.value }}{{ row.unit }}</strong>
                  </div>
                  <em :class="{ warning: row.status === '预警' }">{{ row.status }}</em>
                </article>
              </div>
            </section>
          </div>
        </section>
      </div>
    </template>

    <div v-else class="empty">未找到对应水质参数</div>
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
.info-panel,
.chart-panel,
.empty {
  background:
    linear-gradient(180deg, rgba(34, 100, 228, 0.12), rgba(14, 48, 126, 0.08)),
    rgba(10, 36, 94, 0.18);
  border: 1px solid rgba(121, 210, 255, 0.16);
  box-shadow: 0 14px 30px rgba(8, 24, 65, 0.18);
  backdrop-filter: blur(5px);
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
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
  background: rgba(16, 54, 138, 0.18);
  border: 1px solid rgba(121, 210, 255, 0.16);
}

.pond-switch span {
  color: var(--text-muted);
  font-size: 12px;
}

.pond-switch select {
  min-width: 88px;
  height: 24px;
  color: var(--text-main);
  background: rgba(8, 30, 78, 0.78);
  border: 1px solid rgba(121, 210, 255, 0.14);
  outline: none;
}

.detail-body {
  min-height: 0;
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 12px;
}

.info-panel,
.chart-stage {
  min-height: 0;
}

.info-panel {
  display: grid;
  grid-template-rows: 46px auto auto auto minmax(0, 1fr);
  overflow: hidden;
}

.panel-title,
.chart-head {
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  background: rgba(12, 40, 104, 0.22);
  border-bottom: 1px solid rgba(121, 210, 255, 0.1);
}

.panel-title strong,
.chart-head strong {
  color: var(--text-main);
  font-size: 14px;
}

.panel-title span,
.chart-head span {
  color: var(--success);
  font-size: 12px;
}

.panel-title span.abnormal {
  color: var(--warning);
}

.metric-number {
  padding: 22px 16px 16px;
  color: #ffffff;
  font-size: 44px;
  font-weight: 800;
}

.metric-number em {
  margin-left: 6px;
  color: var(--text-muted);
  font-size: 15px;
  font-style: normal;
}

.summary-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 0 16px 16px;
}

.summary-strip article,
.pond-list article,
.pond-table article {
  background: rgba(16, 54, 138, 0.14);
  border: 1px solid rgba(121, 210, 255, 0.1);
}

.summary-strip article {
  padding: 10px;
}

.summary-strip span,
.pond-list span,
.pond-table span,
.info-list dt {
  color: var(--text-muted);
  font-size: 12px;
}

.summary-strip strong,
.pond-list strong,
.pond-table strong,
.info-list dd {
  color: var(--text-main);
}

.summary-strip strong {
  display: block;
  margin-top: 6px;
  font-size: 13px;
}

.info-list {
  display: grid;
  gap: 12px;
  padding: 0 16px 16px;
  margin: 0;
}

.info-list dd {
  margin: 5px 0 0;
  font-size: 13px;
  line-height: 1.55;
}

.pond-list {
  min-height: 0;
  display: grid;
  gap: 8px;
  padding: 0 16px 16px;
  overflow: auto;
}

.pond-list article {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px;
}

.pond-list article.active {
  border-color: rgba(121, 210, 255, 0.32);
  box-shadow: 0 0 14px rgba(74, 169, 255, 0.16);
}

.pond-list article.warning {
  border-color: rgba(255, 191, 107, 0.26);
}

.pond-list strong {
  display: block;
  margin-top: 4px;
  font-size: 12px;
}

.pond-list em,
.pond-table em {
  color: var(--text-normal);
  font-size: 12px;
  font-style: normal;
}

.pond-list em.warning,
.pond-table em.warning {
  color: var(--warning);
}

.chart-stage {
  min-width: 0;
  display: grid;
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}

.chart-top,
.chart-bottom {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 12px;
}

.chart-panel {
  min-height: 0;
  display: grid;
  grid-template-rows: 46px minmax(0, 1fr);
  overflow: hidden;
}

.chart-body {
  min-width: 0;
  min-height: 0;
}

.list-panel {
  min-height: 0;
}

.pond-table {
  min-height: 0;
  display: grid;
  gap: 8px;
  padding: 12px;
  overflow: auto;
}

.pond-table article {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px;
}

.pond-table strong {
  display: block;
  margin-top: 4px;
  font-size: 13px;
}

.empty {
  display: grid;
  place-items: center;
  color: var(--text-muted);
}
</style>
