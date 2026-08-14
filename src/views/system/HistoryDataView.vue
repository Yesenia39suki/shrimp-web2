<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'

import { isSupabaseMode } from '@/config/dataSource'
import { getPondMetricComparison, type PondComparisonSeries } from '@/services/comparisonService'
import { getHistoryRows } from '@/services/historyDataService'
import { useAuthStore } from '@/stores/authStore'
import { useShrimpSystemStore } from '@/stores/shrimpSystem'
import type { SystemMetric } from '@/stores/shrimpSystem'

type HistoryCategory = 'water' | 'shrimp' | 'robot' | 'feeding' | 'alert' | 'config'
type HistoryRange = '7d' | '30d' | '3m'

interface HistoryRow {
  id: string
  time: string
  source: string
  target: string
  value: string
  status: string
  remark: string
}

interface ChartSeriesItem {
  name: string
  unit: string
  data: number[]
}

const authStore = useAuthStore()
const store = useShrimpSystemStore()
const activeCategory = ref<HistoryCategory>('water')
const selectedPondId = ref(store.pondConfig.selectedPondId)
const activeRange = ref<HistoryRange>('7d')
const comparePondA = ref(store.pondConfig.selectedPondId)
const comparePondB = ref(
  store.pondConfig.pondIds.find((pondId) => pondId !== store.pondConfig.selectedPondId) ??
    store.pondConfig.selectedPondId,
)
const waterCompareMetric = ref('temperature')
const shrimpCompareMetric = ref('length')
const lineChartRef = ref<HTMLDivElement | null>(null)
const barChartRef = ref<HTMLDivElement | null>(null)
const loading = ref(false)
const loadError = ref('')
const remoteRows = ref<HistoryRow[]>([])
const remoteComparisonSeries = ref<PondComparisonSeries[]>([])
let lineChart: echarts.ECharts | null = null
let barChart: echarts.ECharts | null = null
let historyLoadSequence = 0

const rangeOptions: Array<{ id: HistoryRange; label: string }> = [
  { id: '7d', label: '近7天' },
  { id: '30d', label: '近30天' },
  { id: '3m', label: '近3个月' },
]

const rangeLabels = computed(() => {
  if (activeRange.value === '30d') {
    return ['30天前', '25天前', '20天前', '15天前', '10天前', '5天前', '今日']
  }

  if (activeRange.value === '3m') {
    return ['12周前', '10周前', '8周前', '6周前', '4周前', '2周前', '本周']
  }

  return ['前6日', '前5日', '前4日', '前3日', '前2日', '昨日', '今日']
})

const organizationId = computed(() => authStore.currentOrganization?.id ?? '')

function activeTimeRange() {
  const days = activeRange.value === '3m' ? 90 : activeRange.value === '30d' ? 30 : 7
  return {
    startAt: new Date(Date.now() - days * 24 * 60 * 60_000).toISOString(),
    endAt: new Date().toISOString(),
  }
}

const categories: Array<{
  id: HistoryCategory
  title: string
  desc: string
}> = [
  { id: 'water', title: '水质历史', desc: '参数趋势' },
  { id: 'shrimp', title: '虾群历史', desc: '生长记录' },
  { id: 'robot', title: '机器人历史', desc: '指令状态' },
  { id: 'feeding', title: '投喂历史', desc: '计划记录' },
  { id: 'alert', title: '报警历史', desc: '异常记录' },
  { id: 'config', title: '配置历史', desc: '池塘设备' },
]

const selectedPondProfile = computed(
  () =>
    store.pondProfiles.find((profile) => profile.pondId === selectedPondId.value) ??
    store.selectedPondProfile,
)

function metricSeries(metric: SystemMetric) {
  return rangeLabels.value.map((_, index) => {
    const rawValue = metric.trend[index] ?? metric.value
    return Number(rawValue)
  })
}

function getPondProfile(pondId: string) {
  return store.pondProfiles.find((profile) => profile.pondId === pondId) ?? store.pondProfiles[0]
}

function getPondLabel(pondId: string) {
  const pond = store.editablePonds.find((item) => item.pond_code === pondId || item.id === pondId)
  return pond?.pond_code ?? pondId
}

function getMetricFromPond(
  pondId: string,
  category: 'water' | 'shrimp',
  metricKey: string,
): SystemMetric | undefined {
  const profile = getPondProfile(pondId)
  const metrics = category === 'water' ? profile?.waterMetrics : profile?.shrimpMetrics
  return metrics?.find((metric) => metric.key === metricKey)
}

function buildPondCompareSeries(
  category: 'water' | 'shrimp',
  metricKey: string,
): ChartSeriesItem[] {
  const metricA = getMetricFromPond(comparePondA.value, category, metricKey)
  const metricB = getMetricFromPond(comparePondB.value, category, metricKey)
  const series: ChartSeriesItem[] = []

  if (metricA) {
    series.push({
      name: `${comparePondA.value} / ${metricA.label}`,
      unit: metricA.unit,
      data: metricSeries(metricA),
    })
  }

  if (metricB) {
    series.push({
      name: `${comparePondB.value} / ${metricB.label}`,
      unit: metricB.unit,
      data: metricSeries(metricB),
    })
  }

  return series
}

const waterRows = computed<HistoryRow[]>(() =>
  (selectedPondProfile.value?.waterMetrics ?? []).flatMap((metric) =>
    rangeLabels.value.map((day, index) => {
      const value = metric.trend[index] ?? metric.value
      const threshold = store.thresholds.water[metric.key]
      const numericValue = Number(value)
      const isNormal =
        threshold && Number.isFinite(numericValue)
          ? numericValue >= threshold.min && numericValue <= threshold.max
          : true

      return {
        id: `water-${metric.key}-${index}`,
        time: day,
        source: '水质参数',
        target: `${selectedPondId.value} / ${metric.label}`,
        value: `${value}${metric.unit}`,
        status: isNormal ? '正常' : '异常',
        remark: threshold
          ? `范围 ${threshold.min}${metric.unit} - ${threshold.max}${metric.unit}`
          : '未设置范围',
      }
    }),
  ),
)

const shrimpRows = computed<HistoryRow[]>(() =>
  (selectedPondProfile.value?.shrimpMetrics ?? []).flatMap((metric) => {
    if (metric.trend.length === 0) {
      return [
        {
          id: `shrimp-${metric.key}`,
          time: metric.updatedAt,
          source: '虾群模型',
          target: `${selectedPondId.value} / ${metric.label}`,
          value: String(metric.value),
          status: String(metric.value).includes('风险') ? '关注' : '正常',
          remark: metric.description ?? '模型结果',
        },
      ]
    }

    return rangeLabels.value.map((day, index) => ({
      id: `shrimp-${metric.key}-${index}`,
      time: day,
      source: '虾群参数',
      target: `${selectedPondId.value} / ${metric.label}`,
      value: `${metric.trend[index] ?? metric.value}${metric.unit}`,
      status: '正常',
      remark: '历史趋势模拟记录',
    }))
  }),
)

const robotRows = computed<HistoryRow[]>(() =>
  store.robots.flatMap((robot) =>
    robot.commands.map((command, index) => ({
      id: `robot-${robot.id}-${index}`,
      time: command.slice(0, 5),
      source: '机器人',
      target: `${robot.pondId} / ${robot.name}`,
      value: robot.motionStatus,
      status: robot.online ? '在线' : '离线',
      remark: command,
    })),
  ),
)

const feedingRows = computed<HistoryRow[]>(() =>
  store.pondProfiles.flatMap((profile, pondIndex) =>
    rangeLabels.value.map((time, index) => ({
      id: `feeding-${profile.pondId}-${index}`,
      time,
      source: '投喂记录',
      target: `${profile.pondId} / ${profile.species}`,
      value: `${16 + pondIndex * 2 + (index % 3)} 千克`,
      status: index === rangeLabels.value.length - 1 ? '已完成' : '历史记录',
      remark: '历史投喂模拟记录',
    })),
  ),
)

const alertRows = computed<HistoryRow[]>(() =>
  store.allAlerts.map((alert) => ({
    id: alert.id,
    time: alert.time,
    source: alert.source,
    target: alert.type,
    value: alert.currentValue,
    status: alert.level,
    remark: alert.reason,
  })),
)

const configRows = computed<HistoryRow[]>(() => [
  ...store.editablePonds.map((pond) => ({
    id: `config-pond-${pond.id}`,
    time: '当前',
    source: '池塘配置',
    target: `${pond.pond_code} / ${pond.pond_name}`,
    value: `${pond.area} 亩 / ${pond.water_depth} 米`,
    status: '已保存',
    remark: `${pond.shrimp_species} / ${pond.location}`,
  })),
  ...store.editableRobots.map((robot) => ({
    id: `config-robot-${robot.id}`,
    time: '当前',
    source: '机器人配置',
    target: `${robot.robot_code} / ${robot.robot_name}`,
    value: robot.robot_type,
    status: '已绑定',
    remark: `绑定池塘 ${robot.pond_id}`,
  })),
])

const rowsByCategory = computed<Record<HistoryCategory, HistoryRow[]>>(() => ({
  water: waterRows.value,
  shrimp: shrimpRows.value,
  robot: robotRows.value,
  feeding: feedingRows.value,
  alert: alertRows.value,
  config: configRows.value,
}))

const activeRows = computed(() =>
  isSupabaseMode ? remoteRows.value : rowsByCategory.value[activeCategory.value],
)
const activeCategoryInfo = computed(
  () => categories.find((category) => category.id === activeCategory.value) ?? categories[0]!,
)

const summaryCards = computed(() => [
  { label: '水质记录', value: `${waterRows.value.length} 条` },
  { label: '虾群记录', value: `${shrimpRows.value.length} 条` },
  { label: '机器人记录', value: `${robotRows.value.length} 条` },
  { label: '报警记录', value: `${alertRows.value.length} 条` },
])

const waterMetricOptions = computed(() => selectedPondProfile.value?.waterMetrics ?? [])
const shrimpMetricOptions = computed(
  () => selectedPondProfile.value?.shrimpMetrics.filter((metric) => metric.trend.length > 0) ?? [],
)
const isComparableCategory = computed(
  () => activeCategory.value === 'water' || activeCategory.value === 'shrimp',
)

const chartAxisLabels = computed(() => {
  if (isSupabaseMode && isComparableCategory.value) {
    return remoteComparisonSeries.value[0]?.points.map((point) => point.time) ?? []
  }

  if (activeCategory.value === 'config') {
    return store.editablePonds.map((pond) => pond.pond_code)
  }

  return rangeLabels.value
})

const chartSeries = computed(() => {
  if (isSupabaseMode && isComparableCategory.value) {
    return remoteComparisonSeries.value.map((series) => ({
      name: `${series.pondId} / ${series.label}`,
      unit: series.unit,
      data: series.points.map((point) => point.value),
    }))
  }

  if (isSupabaseMode) {
    const numericRows = activeRows.value
      .map((row) => ({
        time: row.time,
        value: Number.parseFloat(row.value),
      }))
      .filter((row) => Number.isFinite(row.value))

    return [
      {
        name: activeCategoryInfo.value.title,
        unit: '',
        data: numericRows.map((row) => row.value),
      },
    ]
  }

  if (activeCategory.value === 'water') {
    return buildPondCompareSeries('water', waterCompareMetric.value)
  }

  if (activeCategory.value === 'shrimp') {
    return buildPondCompareSeries('shrimp', shrimpCompareMetric.value)
  }

  if (activeCategory.value === 'robot') {
    return [
      {
        name: '平均电量',
        unit: '%',
        data: rangeLabels.value.map((_, index) => {
          const total = store.robots.reduce(
            (sum, robot) => sum + Math.max(0, robot.battery - index),
            0,
          )
          return Number((total / Math.max(1, store.robots.length)).toFixed(1))
        }),
      },
    ]
  }

  if (activeCategory.value === 'feeding') {
    return [
      {
        name: '投喂量',
        unit: '千克',
        data: rangeLabels.value.map((_, index) =>
          store.pondProfiles.reduce(
            (sum, _profile, pondIndex) => sum + 16 + pondIndex * 2 + (index % 3),
            0,
          ),
        ),
      },
    ]
  }

  if (activeCategory.value === 'alert') {
    return [
      {
        name: '异常数量',
        unit: '条',
        data: rangeLabels.value.map((_, index) =>
          Math.max(
            0,
            store.allAlerts.length + (index === rangeLabels.value.length - 1 ? 0 : (index % 3) - 1),
          ),
        ),
      },
    ]
  }

  return [
    {
      name: '面积',
      unit: '亩',
      data: store.editablePonds.map((pond) => Number(pond.area.toFixed(1))),
    },
    {
      name: '水深',
      unit: '米',
      data: store.editablePonds.map((pond) => Number(pond.water_depth.toFixed(2))),
    },
  ]
})

const hasChartData = computed(() => chartSeries.value.some((series) => series.data.length > 0))

function buildChartOption(type: 'line' | 'bar'): echarts.EChartsOption {
  const colors = ['#5bd6ff', '#71e5aa', '#ffbf6b', '#ff7c7c']

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
      top: 2,
      right: 10,
      itemWidth: 14,
      itemHeight: 7,
      textStyle: { color: '#9ecddd', fontSize: 11 },
      data: chartSeries.value.map((series) => series.name),
    },
    grid: { left: 42, right: 18, top: 34, bottom: 24 },
    xAxis: {
      type: 'category',
      data: chartAxisLabels.value,
      axisLabel: { color: '#86b0c1', fontSize: 10 },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(139, 211, 244, 0.18)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#86b0c1', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(139, 211, 244, 0.1)' } },
    },
    series: chartSeries.value.map((series, index) => ({
      name: series.name,
      type,
      smooth: type === 'line',
      symbolSize: 5,
      barMaxWidth: 26,
      data: series.data,
      lineStyle: {
        width: 2,
        shadowBlur: 10,
        shadowColor: colors[index] ?? '#5bd6ff',
      },
      areaStyle: type === 'line' ? { opacity: 0.1 } : undefined,
    })),
  }
}

async function loadHistoryData() {
  if (!isSupabaseMode) {
    return
  }

  const loadSequence = ++historyLoadSequence
  remoteRows.value = []
  remoteComparisonSeries.value = []
  loadError.value = ''

  if (!organizationId.value || !selectedPondId.value) {
    loading.value = false
    nextTick(renderCharts)
    return
  }

  loading.value = true

  try {
    const timeRange = activeTimeRange()
    const metricKey =
      activeCategory.value === 'water' ? waterCompareMetric.value : shrimpCompareMetric.value
    const comparisonCategory =
      activeCategory.value === 'water' || activeCategory.value === 'shrimp'
        ? activeCategory.value
        : 'water'
    const [rows, comparison] = await Promise.all([
      getHistoryRows({
        organizationId: organizationId.value,
        pondId: selectedPondId.value,
        category: activeCategory.value,
        timeRange,
      }),
      isComparableCategory.value
        ? getPondMetricComparison({
            organizationId: organizationId.value,
            pondIds: Array.from(new Set([comparePondA.value, comparePondB.value])).filter(Boolean),
            category: comparisonCategory,
            metricKey,
            timeRange,
          })
        : Promise.resolve([]),
    ])

    if (loadSequence !== historyLoadSequence) {
      return
    }

    remoteRows.value = rows
    remoteComparisonSeries.value = comparison
  } catch (error) {
    if (loadSequence !== historyLoadSequence) {
      return
    }

    remoteRows.value = []
    remoteComparisonSeries.value = []
    loadError.value = error instanceof Error ? error.message : '历史数据加载失败'
  } finally {
    if (loadSequence === historyLoadSequence) {
      loading.value = false
      nextTick(renderCharts)
    }
  }
}

function renderCharts() {
  if (!lineChartRef.value || !barChartRef.value || !hasChartData.value) {
    return
  }

  if (!lineChart) {
    lineChart = echarts.init(lineChartRef.value)
  }

  if (!barChart) {
    barChart = echarts.init(barChartRef.value)
  }

  lineChart.setOption(buildChartOption('line'), true)
  barChart.setOption(buildChartOption('bar'), true)
}

function resizeCharts() {
  lineChart?.resize()
  barChart?.resize()
}

watch(
  () =>
    JSON.stringify({
      category: activeCategory.value,
      range: activeRange.value,
      pond: selectedPondId.value,
      comparePondA: comparePondA.value,
      comparePondB: comparePondB.value,
      waterCompareMetric: waterCompareMetric.value,
      shrimpCompareMetric: shrimpCompareMetric.value,
      series: chartSeries.value,
    }),
  () => {
    nextTick(renderCharts)
  },
)

watch(
  () =>
    JSON.stringify({
      source: isSupabaseMode,
      organizationId: organizationId.value,
      category: activeCategory.value,
      range: activeRange.value,
      pond: selectedPondId.value,
      compareA: comparePondA.value,
      compareB: comparePondB.value,
      waterMetric: waterCompareMetric.value,
      shrimpMetric: shrimpCompareMetric.value,
    }),
  () => {
    void loadHistoryData()
  },
  { immediate: true },
)

watch(
  () => store.pondConfig.pondIds.join('|'),
  () => {
    const pondIds = store.pondConfig.pondIds
    const firstPondId = pondIds[0] ?? ''

    if (!pondIds.includes(selectedPondId.value)) {
      selectedPondId.value = firstPondId
    }

    if (!pondIds.includes(comparePondA.value)) {
      comparePondA.value = selectedPondId.value || firstPondId
    }

    if (!pondIds.includes(comparePondB.value) || comparePondB.value === '') {
      comparePondB.value =
        pondIds.find((pondId) => pondId !== comparePondA.value) ?? comparePondA.value
    }
  },
  { immediate: true },
)

onMounted(() => {
  nextTick(renderCharts)
  window.addEventListener('resize', resizeCharts)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  lineChart?.dispose()
  barChart?.dispose()
})
</script>

<template>
  <section class="history-page">
    <header class="history-head">
      <div class="head-copy">
        <span>历史数据</span>
        <div class="headline-row">
          <h1>历史数据查看</h1>
          <p>水质、虾群、机器人、投喂、报警和配置记录</p>
        </div>
      </div>
      <div class="head-meta">
        <strong>{{ authStore.currentOrganization?.name ?? '当前企业' }}</strong>
        <label>
          <span>池塘</span>
          <select v-model="selectedPondId">
            <option v-for="pondId in store.pondConfig.pondIds" :key="pondId" :value="pondId">
              {{ pondId }}
            </option>
          </select>
        </label>
      </div>
    </header>

    <section class="summary-grid">
      <article v-for="card in summaryCards" :key="card.label">
        <span>{{ card.label }}</span>
        <strong>{{ card.value }}</strong>
      </article>
    </section>

    <section class="history-layout">
      <nav class="category-list" aria-label="历史数据分类">
        <button
          v-for="category in categories"
          :key="category.id"
          type="button"
          :class="{ active: activeCategory === category.id }"
          @click="activeCategory = category.id"
        >
          <strong>{{ category.title }}</strong>
          <span>{{ category.desc }}</span>
        </button>
      </nav>

      <main class="history-panel">
        <div class="panel-title">
          <div>
            <strong>{{ activeCategoryInfo.title }}</strong>
            <span>{{ loadError || (loading ? '加载中' : activeCategoryInfo.desc) }}</span>
          </div>
          <div class="panel-controls">
            <div class="range-tabs">
              <button
                v-for="range in rangeOptions"
                :key="range.id"
                type="button"
                :class="{ active: activeRange === range.id }"
                @click="activeRange = range.id"
              >
                {{ range.label }}
              </button>
            </div>

            <div v-if="isComparableCategory" class="compare-controls pond-compare-controls">
              <select v-model="comparePondA" title="对比池塘A">
                <option
                  v-for="pondId in store.pondConfig.pondIds"
                  :key="`compare-a-${pondId}`"
                  :value="pondId"
                >
                  {{ getPondLabel(pondId) }}
                </option>
              </select>
              <span>对比</span>
              <select v-model="comparePondB" title="对比池塘B">
                <option
                  v-for="pondId in store.pondConfig.pondIds"
                  :key="`compare-b-${pondId}`"
                  :value="pondId"
                >
                  {{ getPondLabel(pondId) }}
                </option>
              </select>
              <span>指标</span>
              <template v-if="activeCategory === 'water'">
                <select v-model="waterCompareMetric" class="metric-select">
                  <option
                    v-for="metric in waterMetricOptions"
                    :key="metric.key"
                    :value="metric.key"
                  >
                    {{ metric.label }}
                  </option>
                </select>
              </template>

              <template v-else>
                <select v-model="shrimpCompareMetric" class="metric-select">
                  <option
                    v-for="metric in shrimpMetricOptions"
                    :key="metric.key"
                    :value="metric.key"
                  >
                    {{ metric.label }}
                  </option>
                </select>
              </template>
            </div>
            <em>{{ activeRows.length }} 条</em>
          </div>
        </div>

        <section class="chart-section">
          <div class="chart-card">
            <strong>折线图</strong>
            <div v-if="hasChartData" ref="lineChartRef" class="chart-box"></div>
            <span v-else>暂无可视化数据</span>
          </div>
          <div class="chart-card">
            <strong>柱状图</strong>
            <div v-if="hasChartData" ref="barChartRef" class="chart-box"></div>
            <span v-else>暂无可视化数据</span>
          </div>
        </section>

        <div class="history-table">
          <div class="table-head">
            <span>时间</span>
            <span>来源</span>
            <span>对象</span>
            <span>数值</span>
            <span>状态</span>
            <span>说明</span>
          </div>

          <div class="table-body">
            <div v-if="activeRows.length === 0" class="empty-row">当前没有历史记录</div>

            <article v-for="row in activeRows" v-else :key="row.id" class="table-row">
              <span>{{ row.time }}</span>
              <span>{{ row.source }}</span>
              <span>{{ row.target }}</span>
              <strong>{{ row.value }}</strong>
              <em
                :class="{
                  warning:
                    row.status !== '正常' &&
                    row.status !== '已完成' &&
                    row.status !== '已保存' &&
                    row.status !== '已绑定',
                }"
              >
                {{ row.status }}
              </em>
              <span>{{ row.remark }}</span>
            </article>
          </div>
        </div>
      </main>
    </section>
  </section>
</template>

<style scoped>
.history-page {
  height: 100%;
  display: grid;
  grid-template-rows: 74px 86px minmax(0, 1fr);
  gap: 12px;
  overflow: hidden;
}

.history-head,
.summary-grid article,
.category-list,
.history-panel {
  background: rgba(3, 14, 36, 0.16);
  border: 1px solid rgba(121, 210, 255, 0.18);
  box-shadow: 0 14px 30px rgba(3, 10, 28, 0.16);
  backdrop-filter: blur(6px);
}

.history-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 18px;
}

.head-copy {
  min-width: 0;
}

.history-head span,
.summary-grid span,
.category-list span,
.panel-title span {
  color: var(--cyan);
  font-size: 12px;
}

.headline-row {
  min-width: 0;
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin-top: 6px;
}

.headline-row h1 {
  flex: 0 0 auto;
  margin: 0;
  color: var(--text-main);
  font-size: 24px;
  line-height: 1.08;
}

.headline-row p {
  min-width: 0;
  margin: 0 0 2px;
  overflow: hidden;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.head-meta {
  min-width: 300px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.head-meta strong {
  max-width: 190px;
  overflow: hidden;
  color: var(--text-main);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.head-meta label {
  height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  background: rgba(3, 14, 36, 0.14);
  border: 1px solid rgba(121, 210, 255, 0.14);
}

select {
  min-width: 88px;
  height: 26px;
  color: var(--text-main);
  background: rgba(8, 30, 78, 0.78);
  border: 1px solid rgba(121, 210, 255, 0.14);
  outline: none;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.summary-grid article {
  min-width: 0;
  display: grid;
  align-content: center;
  gap: 8px;
  padding: 0 16px;
}

.summary-grid strong {
  color: var(--text-main);
  font-size: 22px;
}

.history-layout {
  min-height: 0;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 12px;
  overflow: hidden;
}

.category-list {
  min-height: 0;
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 10px;
  overflow: auto;
}

.category-list button {
  min-height: 58px;
  display: grid;
  align-content: center;
  gap: 5px;
  padding: 8px 10px;
  color: var(--text-normal);
  text-align: left;
  background: rgba(3, 14, 36, 0.12);
  border: 1px solid rgba(121, 210, 255, 0.12);
  cursor: pointer;
}

.category-list button.active {
  background: rgba(3, 14, 36, 0.28);
  border-color: rgba(121, 210, 255, 0.4);
  box-shadow: 0 0 18px rgba(91, 214, 255, 0.12);
}

.category-list strong {
  color: var(--text-main);
  font-size: 14px;
}

.history-panel {
  min-height: 0;
  display: grid;
  grid-template-rows: 58px 230px minmax(0, 1fr);
  overflow: hidden;
}

.panel-title {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 16px;
  background: rgba(3, 14, 36, 0.14);
  border-bottom: 1px solid rgba(121, 210, 255, 0.1);
}

.panel-title strong {
  display: block;
  color: var(--text-main);
}

.panel-title span {
  display: block;
  margin-top: 4px;
  color: var(--text-muted);
}

.panel-title em {
  color: var(--cyan);
  font-size: 12px;
  font-style: normal;
}

.panel-controls {
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  row-gap: 4px;
}

.range-tabs,
.compare-controls {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.range-tabs button {
  height: 28px;
  padding: 0 10px;
  color: var(--text-muted);
  font-size: 12px;
  background: rgba(3, 14, 36, 0.16);
  border: 1px solid rgba(121, 210, 255, 0.14);
  cursor: pointer;
}

.range-tabs button.active,
.range-tabs button:hover {
  color: var(--text-main);
  border-color: rgba(121, 210, 255, 0.4);
  background: rgba(37, 101, 185, 0.34);
}

.compare-controls {
  padding-left: 8px;
  border-left: 1px solid rgba(121, 210, 255, 0.12);
}

.compare-controls select {
  width: 76px;
  min-width: 0;
  height: 28px;
  font-size: 12px;
}

.pond-compare-controls .metric-select {
  width: 108px;
}

.compare-controls span {
  white-space: nowrap;
  color: var(--text-muted);
  font-size: 12px;
}

.chart-section {
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 12px;
  border-bottom: 1px solid rgba(121, 210, 255, 0.1);
}

.chart-card {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: 24px minmax(0, 1fr);
  padding: 10px;
  background: rgba(3, 14, 36, 0.12);
  border: 1px solid rgba(121, 210, 255, 0.12);
}

.chart-card strong {
  color: var(--text-main);
  font-size: 13px;
}

.chart-card span {
  display: grid;
  place-items: center;
  color: var(--text-muted);
  font-size: 12px;
}

.chart-box {
  min-width: 0;
  min-height: 0;
}

.history-table {
  min-height: 0;
  display: grid;
  grid-template-rows: 36px minmax(0, 1fr);
  gap: 8px;
  overflow: hidden;
  padding: 12px;
}

.table-head,
.table-row {
  display: grid;
  grid-template-columns: 92px 92px 1.1fr 120px 72px 1.45fr;
  gap: 10px;
  align-items: center;
}

.table-head {
  min-height: 36px;
  padding: 0 10px;
  color: var(--text-muted);
  font-size: 12px;
  background: rgba(6, 26, 70, 0.94);
  border: 1px solid rgba(121, 210, 255, 0.14);
}

.table-body {
  min-height: 0;
  display: grid;
  align-content: start;
  gap: 8px;
  overflow: auto;
  padding-right: 4px;
}

.table-row {
  min-height: 44px;
  padding: 8px 10px;
  background: rgba(3, 14, 36, 0.12);
  border: 1px solid rgba(121, 210, 255, 0.1);
}

.table-row span,
.table-row em {
  min-width: 0;
  overflow: hidden;
  color: var(--text-muted);
  font-size: 12px;
  font-style: normal;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-row strong {
  min-width: 0;
  overflow: hidden;
  color: var(--text-main);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-row em {
  color: #69e2a4;
}

.table-row em.warning {
  color: var(--warning);
}

.empty-row {
  padding: 28px 12px;
  color: var(--text-muted);
  font-size: 13px;
  text-align: center;
}
</style>
