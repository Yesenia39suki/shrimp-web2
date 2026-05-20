<script setup lang="ts">
import { computed } from 'vue'

import { operationConsoleV5Mock } from '@/mock/operationConsoleV5'
import type { MetricLevel, PondStatus, RiskLevel, ShrimpPond } from '@/types/operationConsole'

const props = defineProps<{
  currentPond: ShrimpPond
  ponds: ShrimpPond[]
}>()

const waterMetrics = computed(() => {
  return operationConsoleV5Mock.leftWaterKeys
    .map((key) => props.currentPond.waterQuality.find((metric) => metric.key === key))
    .filter((metric) => metric !== undefined)
})

function statusClass(level: MetricLevel | PondStatus | RiskLevel) {
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
  <aside class="v5-function-sidebar">
    <section class="sidebar-section monitor-section">
      <div class="section-title">
        <span>监控入口</span>
        <strong>{{ currentPond.name }}</strong>
      </div>
      <div class="monitor-grid">
        <div
          v-for="(feed, index) in operationConsoleV5Mock.monitorFeeds"
          :key="feed.id"
          class="monitor-entry"
          :class="`monitor-${index + 1}`"
        >
          <div class="monitor-visual"></div>
          <div class="entry-title">
            <strong>{{ feed.title }}</strong>
            <span :class="statusClass(feed.level)">{{ feed.status }}</span>
          </div>
          <p>{{ feed.subtitle }}</p>
        </div>
      </div>
    </section>

    <section class="sidebar-section pond-section">
      <div class="section-title">
        <span>虾池切换</span>
        <strong>当前 {{ currentPond.id }}</strong>
      </div>
      <div class="pond-list">
        <button
          v-for="pond in ponds"
          :key="pond.id"
          type="button"
          class="pond-item"
          :class="{ active: pond.id === currentPond.id }"
        >
          <i :class="statusClass(pond.status)"></i>
          <span class="pond-code">{{ pond.id }}</span>
          <span class="pond-name">{{ pond.name }}</span>
          <strong :class="statusClass(pond.status)">{{ pond.status }}</strong>
        </button>
      </div>
    </section>

    <section class="sidebar-section water-section">
      <div class="section-title">
        <span>水质摘要</span>
        <strong>{{ currentPond.twin.waterBody }}</strong>
      </div>
      <div class="water-list">
        <div v-for="metric in waterMetrics" :key="metric.key" class="water-row">
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
          <em :class="statusClass(metric.level)">{{ metric.trend }}</em>
        </div>
      </div>
    </section>
  </aside>
</template>

<style scoped>
.v5-function-sidebar {
  min-height: 0;
  display: grid;
  grid-template-rows: 122px 150px minmax(0, 1fr);
  gap: 10px;
  overflow: hidden;
}

.sidebar-section {
  min-height: 0;
  padding: 10px;
  overflow: hidden;
  background: rgba(5, 22, 39, 0.9);
  border: 1px solid rgba(91, 184, 226, 0.18);
}

.section-title {
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(91, 184, 226, 0.13);
}

.section-title span {
  color: #e1f7ff;
  font-size: 13px;
  font-weight: 700;
}

.section-title strong {
  min-width: 0;
  overflow: hidden;
  color: #69d8ff;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.monitor-grid {
  height: calc(100% - 38px);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.monitor-entry {
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(180deg, transparent 0 58%, rgba(3, 16, 30, 0.9)),
    radial-gradient(circle at 70% 34%, rgba(205, 244, 255, 0.22), transparent 23%),
    linear-gradient(135deg, rgba(16, 84, 110, 0.72), rgba(4, 18, 34, 0.94));
  border: 1px solid rgba(91, 184, 226, 0.16);
}

.monitor-entry::before {
  content: '';
  position: absolute;
  left: 14%;
  right: 14%;
  top: 30%;
  bottom: 25%;
  border: 1px solid rgba(218, 250, 255, 0.18);
  border-top: 0;
  transform: skewX(-14deg);
}

.monitor-2 {
  background:
    linear-gradient(180deg, transparent 0 58%, rgba(3, 16, 30, 0.9)),
    radial-gradient(circle at 42% 42%, rgba(115, 224, 178, 0.2), transparent 24%),
    linear-gradient(135deg, rgba(12, 70, 93, 0.72), rgba(4, 18, 34, 0.94));
}

.monitor-3 {
  background:
    linear-gradient(180deg, transparent 0 58%, rgba(3, 16, 30, 0.9)),
    radial-gradient(circle at 62% 42%, rgba(255, 211, 110, 0.18), transparent 24%),
    linear-gradient(135deg, rgba(15, 62, 86, 0.72), rgba(4, 18, 34, 0.94));
}

.monitor-4 {
  background:
    linear-gradient(180deg, transparent 0 58%, rgba(3, 16, 30, 0.9)),
    radial-gradient(circle at 64% 45%, rgba(255, 124, 124, 0.16), transparent 25%),
    linear-gradient(135deg, rgba(17, 55, 78, 0.72), rgba(4, 18, 34, 0.94));
}

.monitor-visual {
  position: absolute;
  left: 0;
  right: 0;
  top: -40%;
  height: 34%;
  background: linear-gradient(180deg, transparent, rgba(84, 214, 255, 0.12), transparent);
  animation: monitor-scan 5s linear infinite;
}

.entry-title {
  position: absolute;
  left: 8px;
  right: 8px;
  top: 7px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.entry-title strong {
  color: #f1fbff;
  font-size: 12px;
}

.entry-title span,
.monitor-entry p {
  font-size: 11px;
}

.monitor-entry p {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 7px;
  margin: 0;
  overflow: hidden;
  color: #9ec5d5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pond-list,
.water-list {
  display: grid;
  gap: 3px;
}

.pond-item {
  height: 22px;
  display: grid;
  grid-template-columns: 10px 44px minmax(0, 1fr) 64px;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 0 8px;
  color: #bad8e6;
  text-align: left;
  background: rgba(3, 16, 30, 0.58);
  border: 1px solid rgba(91, 184, 226, 0.1);
}

.pond-item.active,
.pond-item:hover {
  color: #f5feff;
  background: linear-gradient(90deg, rgba(22, 102, 139, 0.72), rgba(4, 22, 38, 0.82));
  border-color: rgba(84, 214, 255, 0.45);
}

.pond-item i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.pond-code {
  font-size: 12px;
  font-weight: 800;
}

.pond-name,
.pond-item strong {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pond-item strong {
  text-align: right;
}

.water-row {
  min-height: 18px;
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr) 54px;
  align-items: center;
  color: #9ec5d5;
  font-size: 12px;
  border-bottom: 1px solid rgba(91, 184, 226, 0.08);
}

.water-row strong {
  overflow: hidden;
  color: #eefcff;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.water-row em {
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

@keyframes monitor-scan {
  to {
    top: 100%;
  }
}
</style>
