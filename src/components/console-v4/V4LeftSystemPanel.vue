<script setup lang="ts">
import { computed } from 'vue'

import type {
  AlertOverview,
  MetricLevel,
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
  monitorFeeds: MonitoringFeed[]
}>()

const emit = defineEmits<{
  selectPond: [pondId: string]
}>()

const waterSummary = computed(() => props.currentPond.waterQuality.slice(0, 5))

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
  <aside class="v4-left-system-panel">
    <section class="side-group monitor-group">
      <div class="group-head">
        <span>监控入口</span>
        <strong>{{ currentPond.name }}</strong>
      </div>
      <div class="monitor-grid">
        <div
          v-for="(feed, index) in monitorFeeds.slice(0, 3)"
          :key="feed.id"
          class="monitor-tile"
          :class="`tile-${index + 1}`"
        >
          <div class="monitor-scan"></div>
          <div class="monitor-title">
            <strong>{{ feed.title }}</strong>
            <span :class="levelClass(feed.level)">{{ feed.status }}</span>
          </div>
          <p>{{ feed.subtitle }}</p>
        </div>
      </div>
    </section>

    <section class="side-group pond-group">
      <div class="group-head">
        <span>池号切换</span>
        <strong>当前 {{ selectedPondId }}</strong>
      </div>
      <div class="pond-list">
        <button
          v-for="pond in ponds"
          :key="pond.id"
          type="button"
          class="pond-row"
          :class="{ active: pond.id === selectedPondId }"
          @click="emit('selectPond', pond.id)"
        >
          <i :class="levelClass(pond.status)"></i>
          <span class="pond-code">{{ pond.id }}</span>
          <span class="pond-name">{{ pond.name }}</span>
          <strong :class="levelClass(pond.status)">{{ pond.status }}</strong>
        </button>
      </div>
    </section>

    <section class="side-group water-group">
      <div class="group-head">
        <span>水质摘要</span>
        <strong>{{ currentPond.twin.waterBody }}</strong>
      </div>
      <div class="water-list">
        <div v-for="metric in waterSummary" :key="metric.key" class="water-row">
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
          <em :class="levelClass(metric.level)">{{ metric.trend }}</em>
        </div>
      </div>
    </section>

    <section class="side-group alert-group">
      <div class="group-head">
        <span>告警状态</span>
        <strong>{{ alertOverview.total }} 条</strong>
      </div>
      <div class="alert-summary">
        <div>
          <strong class="is-warning">{{ alertOverview.high }}</strong>
          <span>高风险</span>
        </div>
        <div>
          <strong class="is-attention">{{ alertOverview.medium }}</strong>
          <span>中风险</span>
        </div>
        <div>
          <strong class="is-normal">{{ alertOverview.low }}</strong>
          <span>低风险</span>
        </div>
      </div>
      <div class="alert-list">
        <div v-for="message in alertOverview.messages.slice(0, 2)" :key="message.id">
          <i :class="levelClass(message.level)"></i>
          <span>{{ message.text }}</span>
        </div>
      </div>
    </section>
  </aside>
</template>

<style scoped>
.v4-left-system-panel {
  min-height: 0;
  display: grid;
  grid-template-rows: 196px 172px 158px minmax(0, 1fr);
  gap: 8px;
  overflow: hidden;
}

.side-group {
  min-height: 0;
  padding: 10px;
  overflow: hidden;
  background: rgba(5, 22, 39, 0.88);
  border: 1px solid rgba(91, 184, 226, 0.18);
}

.group-head {
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(91, 184, 226, 0.13);
}

.group-head span {
  color: #e1f7ff;
  font-size: 13px;
  font-weight: 700;
}

.group-head strong {
  overflow: hidden;
  color: #69d8ff;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.monitor-grid {
  height: calc(100% - 33px);
  display: grid;
  grid-template-columns: 1.08fr 0.92fr;
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.monitor-tile {
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(180deg, transparent 0 58%, rgba(3, 16, 30, 0.9)),
    radial-gradient(circle at 70% 34%, rgba(205, 244, 255, 0.24), transparent 22%),
    linear-gradient(135deg, rgba(16, 84, 110, 0.72), rgba(4, 18, 34, 0.94));
  border: 1px solid rgba(91, 184, 226, 0.18);
}

.monitor-tile:first-child {
  grid-row: span 2;
}

.monitor-tile::before {
  content: '';
  position: absolute;
  left: 13%;
  right: 13%;
  top: 30%;
  bottom: 24%;
  border: 1px solid rgba(219, 250, 255, 0.18);
  border-top: 0;
  transform: skewX(-14deg);
}

.tile-2 {
  background:
    linear-gradient(180deg, transparent 0 58%, rgba(3, 16, 30, 0.9)),
    radial-gradient(circle at 45% 40%, rgba(115, 224, 178, 0.2), transparent 24%),
    linear-gradient(135deg, rgba(12, 70, 93, 0.72), rgba(4, 18, 34, 0.94));
}

.tile-3 {
  background:
    linear-gradient(180deg, transparent 0 58%, rgba(3, 16, 30, 0.9)),
    radial-gradient(circle at 62% 42%, rgba(255, 211, 110, 0.18), transparent 24%),
    linear-gradient(135deg, rgba(15, 62, 86, 0.72), rgba(4, 18, 34, 0.94));
}

.monitor-scan {
  position: absolute;
  left: 0;
  right: 0;
  top: -35%;
  height: 34%;
  background: linear-gradient(180deg, transparent, rgba(84, 214, 255, 0.15), transparent);
  animation: monitor-scan 4.8s linear infinite;
}

.monitor-title {
  position: absolute;
  left: 8px;
  right: 8px;
  top: 7px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.monitor-title strong {
  color: #f1fbff;
  font-size: 12px;
}

.monitor-title span,
.monitor-tile p {
  font-size: 11px;
}

.monitor-tile p {
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
.water-list,
.alert-list {
  display: grid;
  gap: 6px;
}

.pond-row {
  height: 28px;
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
  cursor: pointer;
}

.pond-row:hover,
.pond-row.active {
  color: #f5feff;
  background: linear-gradient(90deg, rgba(22, 102, 139, 0.7), rgba(4, 22, 38, 0.82));
  border-color: rgba(84, 214, 255, 0.45);
}

.pond-row i,
.alert-list i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.pond-code {
  font-size: 12px;
  font-weight: 800;
}

.pond-name,
.pond-row strong {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pond-row strong {
  text-align: right;
}

.water-row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) 48px;
  align-items: center;
  min-height: 22px;
  color: #9ec5d5;
  font-size: 12px;
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

.alert-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-bottom: 8px;
}

.alert-summary div {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  background: rgba(3, 16, 30, 0.6);
  border: 1px solid rgba(91, 184, 226, 0.1);
}

.alert-summary strong {
  font-size: 18px;
}

.alert-summary span {
  color: #8fb3c5;
  font-size: 11px;
}

.alert-list div {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr);
  align-items: center;
  color: #bad8e6;
  font-size: 11px;
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
