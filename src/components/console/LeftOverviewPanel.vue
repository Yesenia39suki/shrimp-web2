<script setup lang="ts">
import { computed } from 'vue'

import type {
  AlertOverview,
  MetricLevel,
  MiniStatus,
  MonitoringFeed,
  PondStatus,
  RiskLevel,
  ShrimpPond,
} from '@/types/operationConsole'

const props = defineProps<{
  ponds: ShrimpPond[]
  selectedPondId: string
  currentPond: ShrimpPond
  alertOverview: AlertOverview
  miniStatus: MiniStatus[]
  monitorFeeds: MonitoringFeed[]
}>()

const emit = defineEmits<{
  selectPond: [pondId: string]
}>()

const waterSummary = computed(() => props.currentPond.waterQuality.slice(0, 4))

function levelClass(level: MetricLevel | PondStatus | RiskLevel) {
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
  <aside class="left-overview-panel">
    <section class="panel-section monitor-section">
      <div class="section-title">
        <span>视频监控</span>
        <strong>{{ currentPond.name }}</strong>
      </div>

      <div class="monitor-grid">
        <div
          v-for="(feed, index) in monitorFeeds"
          :key="feed.id"
          class="monitor-feed"
          :class="[`feed-${index + 1}`, levelClass(feed.level)]"
        >
          <div class="camera-layer"></div>
          <div class="scan-line"></div>
          <div class="feed-label">
            <strong>{{ feed.title }}</strong>
            <span>{{ feed.status }}</span>
          </div>
          <p>{{ feed.subtitle }}</p>
        </div>
      </div>
    </section>

    <section class="panel-section pond-switch">
      <div class="section-title">
        <span>虾池切换</span>
        <strong>{{ ponds.length }} 个池</strong>
      </div>

      <div class="pond-list">
        <button
          v-for="pond in ponds"
          :key="pond.id"
          type="button"
          class="pond-item"
          :class="{ active: pond.id === selectedPondId }"
          @click="emit('selectPond', pond.id)"
        >
          <span class="pond-code">{{ pond.id }}</span>
          <span class="pond-name">{{ pond.name }}</span>
          <span class="pond-state" :class="levelClass(pond.status)">{{ pond.status }}</span>
        </button>
      </div>
    </section>

    <section class="panel-section">
      <div class="section-title">
        <span>水质监测</span>
        <strong>{{ currentPond.twin.waterBody }}</strong>
      </div>

      <div class="metric-list">
        <div v-for="metric in waterSummary" :key="metric.key" class="metric-row">
          <span class="metric-name">{{ metric.label }}</span>
          <span class="metric-value">{{ metric.value }}</span>
          <span class="metric-trend" :class="levelClass(metric.level)">{{ metric.trend }}</span>
        </div>
      </div>
    </section>

    <section class="panel-section alert-section">
      <div class="section-title">
        <span>告警概览</span>
        <strong>{{ alertOverview.total }} 条</strong>
      </div>

      <div class="alert-counts">
        <div>
          <strong class="warning">{{ alertOverview.high }}</strong>
          <span>高风险</span>
        </div>
        <div>
          <strong class="attention">{{ alertOverview.medium }}</strong>
          <span>中风险</span>
        </div>
        <div>
          <strong class="normal">{{ alertOverview.low }}</strong>
          <span>低风险</span>
        </div>
      </div>

      <div class="alert-list">
        <div v-for="alert in alertOverview.messages" :key="alert.id" class="alert-message">
          <span class="status-dot" :class="levelClass(alert.level)"></span>
          <span>{{ alert.text }}</span>
        </div>
      </div>
    </section>

    <section class="panel-section status-section">
      <div class="section-title">
        <span>系统状态</span>
        <strong>今日</strong>
      </div>

      <div class="mini-status-grid">
        <div v-for="item in miniStatus" :key="item.label" class="mini-status">
          <span>{{ item.label }}</span>
          <strong :class="levelClass(item.level)">{{ item.value }}</strong>
        </div>
      </div>
    </section>
  </aside>
</template>

<style scoped>
.left-overview-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: none;
}

.left-overview-panel::-webkit-scrollbar {
  display: none;
}

.panel-section {
  position: relative;
  flex-shrink: 0;
  padding: 10px;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(13, 45, 74, 0.82), rgba(4, 18, 34, 0.86)), rgba(5, 20, 36, 0.86);
  border: 1px solid rgba(91, 184, 226, 0.18);
  box-shadow: 0 0 22px rgba(0, 0, 0, 0.15) inset;
}

.panel-section::before,
.panel-section::after {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  pointer-events: none;
}

.panel-section::before {
  left: 0;
  top: 0;
  border-top: 1px solid rgba(105, 216, 255, 0.75);
  border-left: 1px solid rgba(105, 216, 255, 0.75);
}

.panel-section::after {
  right: 0;
  bottom: 0;
  border-right: 1px solid rgba(105, 216, 255, 0.45);
  border-bottom: 1px solid rgba(105, 216, 255, 0.45);
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 9px;
  color: #e1f7ff;
  font-size: 13px;
  font-weight: 700;
}

.section-title span {
  position: relative;
  padding-left: 10px;
}

.section-title span::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  width: 3px;
  height: 11px;
  background: #54d6ff;
  box-shadow: 0 0 10px rgba(84, 214, 255, 0.8);
}

.section-title strong {
  min-width: 0;
  overflow: hidden;
  color: #73d8ff;
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.monitor-section {
  flex: 0 0 180px;
}

.monitor-grid {
  height: 140px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.monitor-feed {
  position: relative;
  min-width: 0;
  overflow: hidden;
  background:
    linear-gradient(transparent 0 70%, rgba(7, 25, 42, 0.85)),
    radial-gradient(circle at 70% 32%, rgba(174, 237, 255, 0.28), transparent 20%),
    linear-gradient(135deg, rgba(18, 92, 118, 0.72), rgba(4, 22, 38, 0.92));
  border: 1px solid rgba(105, 216, 255, 0.22);
}

.monitor-feed::before {
  content: '';
  position: absolute;
  left: 14%;
  right: 14%;
  bottom: 26%;
  height: 34%;
  border: 1px solid rgba(220, 252, 255, 0.25);
  border-top: 0;
  transform: skewX(-14deg);
}

.monitor-feed::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(255, 255, 255, 0.04) 0,
    rgba(255, 255, 255, 0.04) 1px,
    transparent 1px,
    transparent 4px
  );
  opacity: 0.35;
}

.feed-2 {
  background:
    linear-gradient(transparent 0 70%, rgba(7, 25, 42, 0.85)),
    radial-gradient(circle at 34% 42%, rgba(115, 224, 178, 0.22), transparent 22%),
    linear-gradient(145deg, rgba(10, 69, 86, 0.8), rgba(4, 22, 38, 0.92));
}

.feed-3 {
  background:
    linear-gradient(transparent 0 70%, rgba(7, 25, 42, 0.85)),
    radial-gradient(circle at 76% 36%, rgba(255, 211, 110, 0.2), transparent 19%),
    linear-gradient(135deg, rgba(12, 74, 104, 0.75), rgba(4, 22, 38, 0.92));
}

.feed-4 {
  background:
    linear-gradient(transparent 0 70%, rgba(7, 25, 42, 0.85)),
    radial-gradient(circle at 62% 48%, rgba(255, 124, 124, 0.18), transparent 22%),
    linear-gradient(135deg, rgba(16, 59, 82, 0.78), rgba(4, 22, 38, 0.92));
}

.camera-layer {
  position: absolute;
  left: 12%;
  right: 12%;
  bottom: 23%;
  height: 1px;
  background: rgba(225, 252, 255, 0.35);
  box-shadow:
    18px -18px 0 rgba(225, 252, 255, 0.08),
    -18px -28px 0 rgba(225, 252, 255, 0.06),
    0 15px 0 rgba(225, 252, 255, 0.06);
}

.scan-line {
  position: absolute;
  left: 0;
  right: 0;
  top: -20%;
  height: 36%;
  background: linear-gradient(180deg, transparent, rgba(118, 229, 255, 0.18), transparent);
  animation: monitor-scan 4s linear infinite;
}

.feed-label {
  position: absolute;
  z-index: 1;
  left: 8px;
  right: 8px;
  top: 7px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.feed-label strong {
  color: #e8fbff;
  font-size: 12px;
  font-weight: 700;
}

.feed-label span {
  color: #8ff3c1;
  font-size: 11px;
}

.monitor-feed p {
  position: absolute;
  z-index: 1;
  left: 8px;
  right: 8px;
  bottom: 6px;
  margin: 0;
  overflow: hidden;
  color: #9ec5d5;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pond-switch {
  flex: 0 0 auto;
}

.pond-list {
  display: grid;
  gap: 6px;
}

.pond-item {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) 62px;
  align-items: center;
  width: 100%;
  height: 28px;
  padding: 0 8px;
  color: #b8d5e4;
  text-align: left;
  background: rgba(4, 18, 34, 0.68);
  border: 1px solid rgba(108, 173, 206, 0.13);
  cursor: pointer;
}

.pond-item.active {
  color: #f2fdff;
  background: linear-gradient(90deg, rgba(24, 111, 150, 0.6), rgba(5, 26, 44, 0.76));
  border-color: rgba(123, 226, 255, 0.42);
  box-shadow: 0 0 18px rgba(84, 214, 255, 0.12) inset;
}

.pond-code {
  font-size: 12px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.pond-name {
  min-width: 0;
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pond-state {
  text-align: right;
  font-size: 11px;
}

.metric-list {
  display: grid;
  gap: 6px;
}

.metric-row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) 50px;
  align-items: center;
  min-height: 22px;
  color: #a9cfe0;
  font-size: 12px;
}

.metric-value {
  min-width: 0;
  overflow: hidden;
  color: #f0fbff;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-trend {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.alert-counts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-bottom: 8px;
}

.alert-counts div {
  height: 36px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-left: 8px;
  color: #8fb3c5;
  font-size: 11px;
  background: rgba(3, 15, 28, 0.62);
  border: 1px solid rgba(111, 206, 255, 0.1);
}

.alert-counts strong {
  margin-bottom: 3px;
  font-size: 18px;
  line-height: 1;
}

.alert-list {
  display: grid;
  gap: 5px;
}

.alert-message:nth-child(n + 3) {
  display: none;
}

.alert-message {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr);
  align-items: center;
  color: #b7d5e4;
  font-size: 12px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.mini-status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.mini-status {
  min-height: 36px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 7px;
  background: rgba(3, 15, 28, 0.62);
  border: 1px solid rgba(111, 206, 255, 0.1);
}

.mini-status span {
  margin-bottom: 5px;
  color: #8fb3c5;
  font-size: 11px;
}

.mini-status strong {
  font-size: 12px;
  font-weight: 700;
}

.normal,
.is-normal {
  color: #69e2a4;
}

.attention,
.is-attention {
  color: #ffd36e;
}

.warning,
.is-warning {
  color: #ff7c7c;
}

.status-dot.is-normal {
  background: #45d88d;
  box-shadow: 0 0 9px rgba(69, 216, 141, 0.7);
}

.status-dot.is-attention {
  background: #ffd36e;
  box-shadow: 0 0 9px rgba(255, 211, 110, 0.7);
}

.status-dot.is-warning {
  background: #ff7373;
  box-shadow: 0 0 9px rgba(255, 115, 115, 0.75);
}

@keyframes monitor-scan {
  to {
    top: 100%;
  }
}
</style>
