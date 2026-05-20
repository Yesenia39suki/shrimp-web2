<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'

import type { ChartData } from '@/types/operationConsole'

const props = defineProps<{
  charts: ChartData
}>()

const barRef = ref<HTMLDivElement | null>(null)
const lineRef = ref<HTMLDivElement | null>(null)
const pieRef = ref<HTMLDivElement | null>(null)

let barChart: echarts.ECharts | null = null
let lineChart: echarts.ECharts | null = null
let pieChart: echarts.ECharts | null = null

const textColor = '#cde9f7'
const mutedColor = '#7fa9bd'
const gridLineColor = 'rgba(139, 211, 244, 0.1)'

function buildBarOption(): echarts.EChartsOption {
  return {
    backgroundColor: 'transparent',
    title: {
      text: '各虾池核心指标对比',
      left: 8,
      top: 4,
      textStyle: { color: textColor, fontSize: 13, fontWeight: 700 },
    },
    tooltip: { trigger: 'axis' },
    legend: {
      right: 8,
      top: 4,
      textStyle: { color: mutedColor, fontSize: 11 },
      data: ['推荐投喂量', '成熟度', '溶氧指数'],
    },
    grid: { left: 42, right: 18, top: 52, bottom: 26 },
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
    title: {
      text: '最近7天水温与成熟度趋势',
      left: 8,
      top: 4,
      textStyle: { color: textColor, fontSize: 13, fontWeight: 700 },
    },
    tooltip: { trigger: 'axis' },
    legend: {
      right: 8,
      top: 4,
      textStyle: { color: mutedColor, fontSize: 11 },
      data: ['平均水温', '成熟度'],
    },
    grid: { left: 42, right: 42, top: 52, bottom: 26 },
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
        areaStyle: { color: 'rgba(84, 214, 255, 0.12)' },
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
    title: {
      text: '推荐策略分布',
      left: 8,
      top: 4,
      textStyle: { color: textColor, fontSize: 13, fontWeight: 700 },
    },
    tooltip: { trigger: 'item' },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 48,
      textStyle: { color: mutedColor, fontSize: 11 },
    },
    series: [
      {
        name: '策略占比',
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['38%', '58%'],
        avoidLabelOverlap: true,
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
  <section class="bottom-analytics-panel">
    <div ref="barRef" class="chart-box"></div>
    <div ref="lineRef" class="chart-box"></div>
    <div ref="pieRef" class="chart-box"></div>
  </section>
</template>

<style scoped>
.bottom-analytics-panel {
  min-height: 0;
  display: grid;
  grid-template-columns: 1.05fr 1.15fr 0.8fr;
  gap: 8px;
}

.chart-box {
  position: relative;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(13, 45, 74, 0.82), rgba(4, 18, 34, 0.9)), rgba(5, 20, 36, 0.88);
  border: 1px solid rgba(91, 184, 226, 0.18);
  box-shadow: 0 0 22px rgba(0, 0, 0, 0.15) inset;
}

.chart-box::before,
.chart-box::after {
  content: '';
  position: absolute;
  z-index: 1;
  width: 18px;
  height: 18px;
  pointer-events: none;
}

.chart-box::before {
  left: 0;
  top: 0;
  border-top: 1px solid rgba(105, 216, 255, 0.75);
  border-left: 1px solid rgba(105, 216, 255, 0.75);
}

.chart-box::after {
  right: 0;
  bottom: 0;
  border-right: 1px solid rgba(105, 216, 255, 0.45);
  border-bottom: 1px solid rgba(105, 216, 255, 0.45);
}
</style>
