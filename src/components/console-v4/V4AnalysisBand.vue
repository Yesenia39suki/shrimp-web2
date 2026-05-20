<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'

import type { ChartData, ShrimpPond } from '@/types/operationConsole'

const props = defineProps<{
  charts: ChartData
  currentPond: ShrimpPond
}>()

const barRef = ref<HTMLDivElement | null>(null)
const lineRef = ref<HTMLDivElement | null>(null)
const pieRef = ref<HTMLDivElement | null>(null)

let barChart: echarts.ECharts | null = null
let lineChart: echarts.ECharts | null = null
let pieChart: echarts.ECharts | null = null

const mutedColor = '#7fa9bd'
const gridLineColor = 'rgba(139, 211, 244, 0.1)'

function buildBarOption(): echarts.EChartsOption {
  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: {
      right: 8,
      top: 0,
      textStyle: { color: mutedColor, fontSize: 11 },
      data: ['推荐投喂量', '成熟度', '溶氧指数'],
    },
    grid: { left: 42, right: 18, top: 34, bottom: 24 },
    xAxis: {
      type: 'category',
      data: props.charts.bar.categories,
      axisLabel: { color: mutedColor },
      axisLine: { lineStyle: { color: gridLineColor } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: mutedColor },
      splitLine: { lineStyle: { color: gridLineColor } },
    },
    series: [
      {
        name: '推荐投喂量',
        type: 'bar',
        barWidth: 12,
        data: props.charts.bar.feed,
        itemStyle: { color: '#54d6ff', borderRadius: [3, 3, 0, 0] },
      },
      {
        name: '成熟度',
        type: 'bar',
        barWidth: 12,
        data: props.charts.bar.maturity,
        itemStyle: { color: '#b894ff', borderRadius: [3, 3, 0, 0] },
      },
      {
        name: '溶氧指数',
        type: 'bar',
        barWidth: 12,
        data: props.charts.bar.oxygenIndex,
        itemStyle: { color: '#73e0b2', borderRadius: [3, 3, 0, 0] },
      },
    ],
  }
}

function buildLineOption(): echarts.EChartsOption {
  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: {
      right: 8,
      top: 0,
      textStyle: { color: mutedColor, fontSize: 11 },
      data: ['平均水温', '成熟度'],
    },
    grid: { left: 42, right: 42, top: 34, bottom: 24 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: props.charts.line.dates,
      axisLabel: { color: mutedColor },
      axisLine: { lineStyle: { color: gridLineColor } },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        name: '水温',
        nameTextStyle: { color: mutedColor },
        axisLabel: { color: mutedColor, formatter: '{value}℃' },
        splitLine: { lineStyle: { color: gridLineColor } },
      },
      {
        type: 'value',
        name: '成熟度',
        nameTextStyle: { color: mutedColor },
        axisLabel: { color: mutedColor, formatter: '{value}%' },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '平均水温',
        type: 'line',
        smooth: true,
        symbolSize: 6,
        data: props.charts.line.temperature,
        lineStyle: { color: '#54d6ff', width: 3 },
        itemStyle: { color: '#54d6ff' },
        areaStyle: { color: 'rgba(84, 214, 255, 0.1)' },
      },
      {
        name: '成熟度',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbolSize: 6,
        data: props.charts.line.maturity,
        lineStyle: { color: '#b894ff', width: 3 },
        itemStyle: { color: '#b894ff' },
      },
    ],
  }
}

function buildPieOption(): echarts.EChartsOption {
  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item' },
    legend: {
      orient: 'vertical',
      left: '66%',
      top: 34,
      textStyle: { color: mutedColor, fontSize: 11 },
    },
    series: [
      {
        name: '策略占比',
        type: 'pie',
        radius: ['42%', '66%'],
        center: ['34%', '56%'],
        label: { show: false },
        labelLine: { show: false },
        data: props.charts.pie,
        itemStyle: {
          borderColor: '#06172a',
          borderWidth: 2,
        },
        color: ['#54d6ff', '#73e0b2', '#ffd36e', '#ff7c7c'],
      },
    ],
  }
}

function initCharts() {
  if (barRef.value && !barChart) {
    barChart = echarts.init(barRef.value)
  }

  if (lineRef.value && !lineChart) {
    lineChart = echarts.init(lineRef.value)
  }

  if (pieRef.value && !pieChart) {
    pieChart = echarts.init(pieRef.value)
  }
}

function renderCharts() {
  barChart?.setOption(buildBarOption(), true)
  lineChart?.setOption(buildLineOption(), true)
  pieChart?.setOption(buildPieOption(), true)
}

function resizeCharts() {
  barChart?.resize()
  lineChart?.resize()
  pieChart?.resize()
}

onMounted(() => {
  nextTick(() => {
    initCharts()
    renderCharts()
    window.addEventListener('resize', resizeCharts)
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  barChart?.dispose()
  lineChart?.dispose()
  pieChart?.dispose()
})

watch(
  () => props.charts,
  () => {
    renderCharts()
  },
  { deep: true },
)
</script>

<template>
  <section class="v4-analysis-band">
    <div class="analysis-panel">
      <div class="analysis-head">
        <div>
          <strong>各池核心指标对比</strong>
          <span>对象：{{ currentPond.id }} · 今日横向对比</span>
        </div>
        <em>柱状图</em>
      </div>
      <div ref="barRef" class="chart-body"></div>
    </div>

    <div class="analysis-panel">
      <div class="analysis-head">
        <div>
          <strong>最近7天趋势</strong>
          <span>维度：水温与成熟度变化</span>
        </div>
        <em>折线图</em>
      </div>
      <div ref="lineRef" class="chart-body"></div>
    </div>

    <div class="analysis-panel">
      <div class="analysis-head">
        <div>
          <strong>推荐策略 / 风险分布</strong>
          <span>维度：模型推荐策略占比</span>
        </div>
        <em>饼图</em>
      </div>
      <div ref="pieRef" class="chart-body"></div>
    </div>
  </section>
</template>

<style scoped>
.v4-analysis-band {
  min-height: 0;
  display: grid;
  grid-template-columns: 1.08fr 1.16fr 0.86fr;
  gap: 8px;
}

.analysis-panel {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: 44px minmax(0, 1fr);
  overflow: hidden;
  background: rgba(5, 22, 39, 0.88);
  border: 1px solid rgba(91, 184, 226, 0.18);
}

.analysis-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 10px;
  background: rgba(3, 16, 30, 0.55);
  border-bottom: 1px solid rgba(91, 184, 226, 0.13);
}

.analysis-head strong {
  display: block;
  color: #e1f7ff;
  font-size: 13px;
}

.analysis-head span {
  display: block;
  margin-top: 3px;
  color: #7fa9bd;
  font-size: 11px;
}

.analysis-head em {
  flex: 0 0 auto;
  padding: 3px 6px;
  color: #69d8ff;
  font-size: 11px;
  font-style: normal;
  border: 1px solid rgba(91, 184, 226, 0.2);
}

.chart-body {
  min-width: 0;
  min-height: 0;
}
</style>
