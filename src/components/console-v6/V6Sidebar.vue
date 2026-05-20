<script setup lang="ts">
import { computed } from 'vue'

import { operationConsoleV6Mock } from '@/mock/operationConsoleV6'
import type { MetricLevel, PondStatus, RiskLevel, ShrimpPond } from '@/types/operationConsole'

const props = defineProps<{
  currentPond: ShrimpPond
  ponds: ShrimpPond[]
}>()

const waterItems = computed(() => {
  return operationConsoleV6Mock.waterSummaryKeys
    .map((key) => props.currentPond.waterQuality.find((metric) => metric.key === key))
    .filter((metric) => metric !== undefined)
})

function stateClass(level: MetricLevel | PondStatus | RiskLevel) {
  if (level === '预警' || level === '风险预警' || level === '高') {
    return 'is-warning'
  }

  if (level === '关注' || level === '重点观察' || level === '中') {
    return 'is-attention'
  }

  return 'is-normal'
}
</script>

<template>
  <aside class="v6-sidebar">
    <section class="side-block monitor-block">
      <div class="side-title">
        <span>监控入口</span>
        <strong>{{ currentPond.name }}</strong>
      </div>
      <div class="monitor-entry-grid">
        <button
          v-for="feed in operationConsoleV6Mock.monitorFeeds"
          :key="feed.id"
          type="button"
          class="monitor-entry"
        >
          <span class="entry-visual"></span>
          <strong>{{ feed.title }}</strong>
          <em :class="stateClass(feed.level)">{{ feed.status }}</em>
          <small>{{ feed.subtitle }}</small>
        </button>
      </div>
    </section>

    <section class="side-block pond-block">
      <div class="side-title">
        <span>池号切换</span>
        <strong>当前 {{ currentPond.id }}</strong>
      </div>
      <div class="pond-switch-list">
        <button
          v-for="pond in ponds"
          :key="pond.id"
          type="button"
          class="pond-switch-item"
          :class="{ active: pond.id === currentPond.id }"
        >
          <i :class="stateClass(pond.status)"></i>
          <span>{{ pond.id }}</span>
          <strong>{{ pond.name }}</strong>
          <em :class="stateClass(pond.status)">{{ pond.status }}</em>
        </button>
      </div>
    </section>

    <section class="side-block summary-block">
      <div class="side-title">
        <span>告警与水质摘要</span>
        <strong>{{ operationConsoleV6Mock.alerts.total }} 条告警</strong>
      </div>
      <div class="summary-status">
        <div>
          <span>当前告警数</span>
          <strong>{{ operationConsoleV6Mock.alerts.total }}</strong>
        </div>
        <div>
          <span>水体状态</span>
          <strong>{{ currentPond.twin.waterBody }}</strong>
        </div>
        <div>
          <span>今日波动</span>
          <strong>水温轻微上升</strong>
        </div>
      </div>
      <div class="water-change-list">
        <div v-for="metric in waterItems" :key="metric.key">
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
          <em :class="stateClass(metric.level)">{{ metric.trend }}</em>
        </div>
      </div>
    </section>
  </aside>
</template>

<style scoped>
.v6-sidebar {
  min-height: 0;
  display: grid;
  grid-template-rows: 178px 162px minmax(0, 1fr);
  gap: 10px;
  overflow: hidden;
}

.side-block {
  min-height: 0;
  padding: 10px;
  overflow: hidden;
  background: rgba(5, 22, 39, 0.9);
  border: 1px solid rgba(91, 184, 226, 0.18);
}

.side-title {
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(91, 184, 226, 0.13);
}

.side-title span {
  color: #e1f7ff;
  font-size: 13px;
  font-weight: 700;
}

.side-title strong {
  min-width: 0;
  overflow: hidden;
  color: #69d8ff;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.monitor-entry-grid {
  height: calc(100% - 34px);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.monitor-entry {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: 18px minmax(0, 1fr);
  align-items: start;
  gap: 2px 8px;
  padding: 8px;
  overflow: hidden;
  text-align: left;
  background:
    linear-gradient(180deg, transparent 0 58%, rgba(3, 16, 30, 0.9)),
    radial-gradient(circle at 72% 36%, rgba(205, 244, 255, 0.2), transparent 24%),
    rgba(8, 40, 60, 0.58);
  border: 1px solid rgba(91, 184, 226, 0.16);
}

.entry-visual {
  position: absolute;
  left: 14%;
  right: 14%;
  bottom: 22%;
  height: 30%;
  border: 1px solid rgba(218, 250, 255, 0.18);
  border-top: 0;
  transform: skewX(-14deg);
}

.monitor-entry strong {
  color: #f1fbff;
  font-size: 12px;
}

.monitor-entry em {
  font-size: 11px;
  font-style: normal;
}

.monitor-entry small {
  grid-column: 1 / 3;
  align-self: end;
  overflow: hidden;
  color: #9ec5d5;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pond-switch-list {
  display: grid;
  gap: 5px;
}

.pond-switch-item {
  height: 25px;
  display: grid;
  grid-template-columns: 10px 42px minmax(0, 1fr) 62px;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 0 7px;
  color: #bad8e6;
  text-align: left;
  background: rgba(3, 16, 30, 0.58);
  border: 1px solid rgba(91, 184, 226, 0.1);
}

.pond-switch-item.active,
.pond-switch-item:hover {
  color: #f5feff;
  background: linear-gradient(90deg, rgba(22, 102, 139, 0.72), rgba(4, 22, 38, 0.82));
  border-color: rgba(84, 214, 255, 0.45);
}

.pond-switch-item i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.pond-switch-item span,
.pond-switch-item strong,
.pond-switch-item em {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pond-switch-item em {
  font-style: normal;
  text-align: right;
}

.summary-status {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  margin-bottom: 8px;
}

.summary-status div {
  padding: 7px;
  background: rgba(3, 16, 30, 0.58);
  border: 1px solid rgba(91, 184, 226, 0.1);
}

.summary-status span,
.water-change-list span {
  display: block;
  margin-bottom: 4px;
  color: #8fb3c5;
  font-size: 11px;
}

.summary-status strong,
.water-change-list strong {
  display: block;
  overflow: hidden;
  color: #e8fbff;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.water-change-list {
  display: grid;
  gap: 4px;
}

.water-change-list div {
  min-height: 21px;
  display: grid;
  grid-template-columns: 78px minmax(0, 1fr) 48px;
  align-items: center;
  border-bottom: 1px solid rgba(91, 184, 226, 0.08);
}

.water-change-list span {
  margin-bottom: 0;
}

.water-change-list em {
  font-size: 11px;
  font-style: normal;
  text-align: right;
}

.is-normal {
  color: #69e2a4;
}

.is-attention {
  color: #ffd36e;
}

.is-warning {
  color: #ff7c7c;
}

i.is-normal {
  background: #69e2a4;
  box-shadow: 0 0 9px rgba(105, 226, 164, 0.7);
}

i.is-attention {
  background: #ffd36e;
  box-shadow: 0 0 9px rgba(255, 211, 110, 0.7);
}

i.is-warning {
  background: #ff7c7c;
  box-shadow: 0 0 9px rgba(255, 124, 124, 0.7);
}
</style>
