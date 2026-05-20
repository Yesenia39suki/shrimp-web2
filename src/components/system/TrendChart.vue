<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps<{
  title: string
  data: number[]
  unit: string
}>()

const chartRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

function buildOption(): echarts.EChartsOption {
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(11, 34, 88, 0.96)',
      borderColor: 'rgba(121, 210, 255, 0.3)',
      textStyle: { color: '#e8f7ff' },
    },
    grid: { left: 42, right: 18, top: 34, bottom: 28 },
    xAxis: {
      type: 'category',
      data: ['前6日', '前5日', '前4日', '前3日', '前2日', '昨日', '今日'],
      axisLabel: { color: 'rgba(230, 244, 255, 0.72)', fontSize: 11 },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(121, 210, 255, 0.14)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: 'rgba(230, 244, 255, 0.72)',
        fontSize: 11,
        formatter: `{value}${props.unit}`,
      },
      splitLine: { lineStyle: { color: 'rgba(121, 210, 255, 0.08)' } },
    },
    series: [
      {
        name: props.title,
        type: 'line',
        smooth: true,
        symbolSize: 6,
        data: props.data,
        lineStyle: {
          width: 3,
          color: '#4aa9ff',
          shadowBlur: 8,
          shadowColor: 'rgba(74, 169, 255, 0.36)',
        },
        itemStyle: { color: '#79d2ff' },
        areaStyle: { color: 'rgba(74, 169, 255, 0.14)' },
      },
    ],
  }
}

function renderChart() {
  if (!chartRef.value || props.data.length === 0) {
    return
  }

  if (!chart) {
    chart = echarts.init(chartRef.value)
  }

  chart.setOption(buildOption(), true)
}

function resizeChart() {
  chart?.resize()
}

onMounted(() => {
  nextTick(() => {
    renderChart()
    window.addEventListener('resize', resizeChart)
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart)
  chart?.dispose()
})

watch(
  () => props.data,
  () => renderChart(),
  { deep: true },
)
</script>

<template>
  <section class="trend-chart">
    <div class="trend-title">
      <strong>{{ title }}</strong>
      <span>最近7次趋势</span>
    </div>
    <div v-if="data.length > 0" ref="chartRef" class="chart-body"></div>
    <div v-else class="text-only">当前指标为文本结论，暂无折线趋势。</div>
  </section>
</template>

<style scoped>
.trend-chart {
  min-height: 260px;
  display: grid;
  grid-template-rows: 44px minmax(0, 1fr);
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(34, 100, 228, 0.18), rgba(14, 48, 126, 0.14)),
    rgba(10, 36, 94, 0.32);
  border: 1px solid rgba(121, 210, 255, 0.16);
  box-shadow: 0 14px 28px rgba(8, 24, 65, 0.16);
}

.trend-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  background: rgba(12, 40, 104, 0.38);
  border-bottom: 1px solid rgba(121, 210, 255, 0.1);
}

.trend-title strong {
  color: var(--text-main);
  font-size: 15px;
}

.trend-title span {
  color: var(--text-muted);
  font-size: 12px;
}

.chart-body {
  min-width: 0;
  min-height: 0;
}

.text-only {
  display: grid;
  place-items: center;
  color: var(--text-muted);
  font-size: 13px;
}
</style>
