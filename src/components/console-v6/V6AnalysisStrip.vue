<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'

import type { ChartData, ShrimpPond } from '@/types/operationConsole'

const props = defineProps<{
  charts: ChartData
  pond: ShrimpPond
}>()

const barRef = ref<HTMLDivElement | null>(null)
const lineRef = ref<HTMLDivElement | null>(null)
const pieRef = ref<HTMLDivElement | null>(null)

let barChart: echarts.ECharts | null = null
let lineChart: echarts.ECharts | null = null
let pieChart: echarts.ECharts | null = null

const axisTextColor = '#83adbf'
const splitLineColor = 'rgba(139, 211, 244, 0.1)'

function buildBarOption(): echarts.EChartsOption {
  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: {
      right: 8,
      top: 2,
      itemWidth: 10,
      itemHeight: 8,
      textStyle: { color: axisTextColor, fontSize: 11 },
      data: ['推荐投喂量', '成熟度', '溶氧指数'],
    },
    grid: { left: 42, right: 16, top: 42, bottom: 26 },
    xAxis: {
      type: 'category',
      data: props.charts.bar.categories,
      axisLabel: { color: axisTextColor, fontSize: 11 },
      axisLine: { lineStyle: { color: splitLineColor } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: axisTextColor, fontSize: 11 },
      splitLine: { lineStyle: { color: splitLineColor } },
    },
    series: [
      {
        name: '推荐投喂量',
        type: 'bar',
        barWidth: 12,
        data: props.charts.bar.feed,
        itemStyle: { color: '#54d6ff' },
      },
      {
        name: '成熟度',
        type: 'bar',
        barWidth: 12,
        data: props.charts.bar.maturity,
        itemStyle: { color: '#73e0b2' },
      },
      {
        name: '溶氧指数',
        type: 'bar',
        barWidth: 12,
        data: props.charts.bar.oxygenIndex,
        itemStyle: { color: '#ffd36e' },
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
      top: 2,
      itemWidth: 14,
      itemHeight: 8,
      textStyle: { color: axisTextColor, fontSize: 11 },
      data: ['平均水温', '成熟度'],
    },
    grid: { left: 42, right: 42, top: 42, bottom: 26 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: props.charts.line.dates,
      axisLabel: { color: axisTextColor, fontSize: 11 },
      axisLine: { lineStyle: { color: splitLineColor } },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        name: '水温',
        nameTextStyle: { color: axisTextColor, fontSize: 11 },
        axisLabel: { color: axisTextColor, fontSize: 11, formatter: '{value}℃' },
        splitLine: { lineStyle: { color: splitLineColor } },
      },
      {
        type: 'value',
        name: '成熟度',
        nameTextStyle: { color: axisTextColor, fontSize: 11 },
        axisLabel: { color: axisTextColor, fontSize: 11, formatter: '{value}%' },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '平均水温',
        type: 'line',
        smooth: true,
        symbolSize: 5,
        data: props.charts.line.temperature,
        lineStyle: { color: '#54d6ff', width: 2 },
        itemStyle: { color: '#54d6ff' },
        areaStyle: { color: 'rgba(84, 214, 255, 0.1)' },
      },
      {
        name: '成熟度',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbolSize: 5,
        data: props.charts.line.maturity,
        lineStyle: { color: '#73e0b2', width: 2 },
        itemStyle: { color: '#73e0b2' },
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
      right: 6,
      top: 42,
      itemWidth: 10,
      itemHeight: 8,
      textStyle: { color: axisTextColor, fontSize: 11 },
    },
    series: [
      {
        name: '策略占比',
        type: 'pie',
        radius: ['42%', '66%'],
        center: ['34%', '58%'],
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
  <section class="v6-analysis-strip">
    <article class="analysis-segment">
      <div class="segment-head">
        <div>
          <span>系统分析带</span>
          <strong>各池核心指标对比</strong>
        </div>
        <em>当前维度：{{ pond.id }} 横向对比</em>
      </div>
      <div ref="barRef" class="segment-chart"></div>
    </article>

    <article class="analysis-segment">
      <div class="segment-head">
        <div>
          <span>趋势跟踪</span>
          <strong>最近7天趋势</strong>
        </div>
        <em>当前维度：水温与成熟度</em>
      </div>
      <div ref="lineRef" class="segment-chart"></div>
    </article>

    <article class="analysis-segment">
      <div class="segment-head">
        <div>
          <span>策略结构</span>
          <strong>推荐策略分布</strong>
        </div>
        <em>当前维度：模型策略占比</em>
      </div>
      <div ref="pieRef" class="segment-chart"></div>
    </article>
  </section>
</template>

<style scoped>
.v6-analysis-strip {
  min-height: 0;
  display: grid;
  grid-template-columns: 1.08fr 1.16fr 0.86fr;
  gap: 10px;
  overflow: hidden;
}

.analysis-segment {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: 52px minmax(0, 1fr);
  overflow: hidden;
  background: rgba(5, 22, 39, 0.9);
  border: 1px solid rgba(91, 184, 226, 0.18);
}

.segment-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 12px;
  background: rgba(3, 16, 30, 0.58);
  border-bottom: 1px solid rgba(91, 184, 226, 0.13);
}

.segment-head span {
  display: block;
  color: #69d8ff;
  font-size: 11px;
}

.segment-head strong {
  display: block;
  margin-top: 4px;
  color: #e8fbff;
  font-size: 14px;
}

.segment-head em {
  flex: 0 0 auto;
  padding: 4px 7px;
  color: #9ec5d5;
  font-size: 11px;
  font-style: normal;
  background: rgba(3, 16, 30, 0.62);
  border: 1px solid rgba(91, 184, 226, 0.14);
}

.segment-chart {
  min-width: 0;
  min-height: 0;
}
</style>
