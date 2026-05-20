<script setup lang="ts">
import { computed } from 'vue'

import type { RangeThreshold, SystemAlert, SystemMetric } from '@/stores/shrimpSystem'

const props = defineProps<{
  metric: SystemMetric
  threshold?: RangeThreshold
  alert?: SystemAlert
}>()

const emit = defineEmits<{
  open: [key: string]
}>()

const statusText = computed(() => {
  return props.alert ? props.alert.level : '正常'
})

const statusClass = computed(() => {
  if (!props.alert) {
    return 'normal'
  }

  return props.alert.level === '预警' ? 'danger' : 'warning'
})

const rangeText = computed(() => {
  if (!props.threshold) {
    return '规则判断'
  }

  return `${props.threshold.min}${props.metric.unit} - ${props.threshold.max}${props.metric.unit}`
})

const trendBars = computed(() => {
  if (props.metric.trend.length === 0) {
    return []
  }

  const values = props.metric.trend
  const max = Math.max(...values)
  const min = Math.min(...values)
  const spread = max - min || 1

  return values.map((value) => Math.round(22 + ((value - min) / spread) * 58))
})

const trendText = computed(() => {
  const values = props.metric.trend

  if (values.length < 2) {
    return '趋势说明'
  }

  const first = values[0] ?? 0
  const last = values[values.length - 1] ?? first
  const diff = Number((last - first).toFixed(2))

  if (diff > 0) {
    return `较前期上升 ${diff}${props.metric.unit}`
  }

  if (diff < 0) {
    return `较前期下降 ${Math.abs(diff)}${props.metric.unit}`
  }

  return '较前期持平'
})
const isTextValue = computed(() => typeof props.metric.value === 'string')
</script>

<template>
  <button type="button" class="metric-card" :class="statusClass" @click="emit('open', metric.key)">
    <div class="corner"></div>

    <div class="metric-head">
      <div>
        <strong>{{ metric.label }}</strong>
        <span>{{ metric.updatedAt }}</span>
      </div>
      <em class="metric-status">
        <i></i>
        {{ statusText }}
      </em>
    </div>

    <div class="metric-main">
      <div class="metric-value" :class="{ text: isTextValue }">
        {{ metric.value }}
        <small v-if="metric.unit">{{ metric.unit }}</small>
      </div>
      <div v-if="trendBars.length > 0" class="sparkline" aria-hidden="true">
        <i
          v-for="(bar, index) in trendBars"
          :key="`${metric.key}-${index}`"
          :style="{ height: `${bar}%` }"
        ></i>
      </div>
      <div v-else class="text-badge">结论</div>
    </div>

    <div class="metric-meta">
      <span>正常范围</span>
      <strong>{{ rangeText }}</strong>
    </div>

    <p class="metric-note">
      {{ alert ? alert.reason : metric.description || trendText }}
    </p>
  </button>
</template>

<style scoped>
.metric-card {
  position: relative;
  min-width: 0;
  min-height: 144px;
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr);
  gap: 8px;
  padding: 13px 13px 12px 15px;
  color: var(--text-normal);
  text-align: left;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(34, 100, 228, 0.18), rgba(14, 48, 126, 0.14)),
    rgba(10, 36, 94, 0.32);
  border: 1px solid rgba(121, 210, 255, 0.16);
  border-radius: 8px;
  clip-path: polygon(
    0 0,
    calc(100% - 16px) 0,
    100% 16px,
    100% 100%,
    16px 100%,
    0 calc(100% - 16px)
  );
  box-shadow:
    0 14px 28px rgba(8, 24, 65, 0.18),
    0 0 0 1px rgba(255, 255, 255, 0.02) inset;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease;
}

.metric-card::before {
  content: '';
  position: absolute;
  inset: 10px auto 10px 0;
  width: 3px;
  background: var(--success);
  box-shadow: 0 0 16px rgba(113, 229, 170, 0.72);
}

.metric-card::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(147, 232, 255, 0.08) 1px, transparent 1px),
    linear-gradient(rgba(147, 232, 255, 0.06) 1px, transparent 1px);
  background-size: 22px 22px;
  mask-image: linear-gradient(120deg, transparent 0%, black 20%, transparent 78%);
  opacity: 0.28;
}

.metric-card .corner::after {
  content: '';
  position: absolute;
  right: 16px;
  top: 12px;
  width: 56px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(91, 214, 255, 0.62));
  transform: rotate(34deg);
  transform-origin: right center;
}

.metric-card:hover {
  border-color: rgba(121, 210, 255, 0.34);
  box-shadow:
    0 18px 38px rgba(8, 24, 65, 0.24),
    0 0 24px rgba(74, 169, 255, 0.16);
  transform: translateY(-2px);
}

.metric-card.warning {
  border-color: rgba(255, 191, 107, 0.42);
}

.metric-card.warning::before {
  background: var(--warning);
  box-shadow: 0 0 16px rgba(255, 191, 107, 0.72);
}

.metric-card.danger {
  border-color: rgba(255, 111, 125, 0.5);
}

.metric-card.danger::before {
  background: var(--danger);
  box-shadow: 0 0 16px rgba(255, 111, 125, 0.72);
}

.corner {
  position: absolute;
  top: 0;
  right: 0;
  width: 34px;
  height: 34px;
  border-top: 1px solid rgba(91, 214, 255, 0.6);
  border-right: 1px solid rgba(91, 214, 255, 0.6);
}

.metric-head,
.metric-main,
.metric-meta,
.metric-note {
  position: relative;
  z-index: 1;
}

.metric-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.metric-head div {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.metric-head strong {
  display: -webkit-box;
  color: var(--text-main);
  font-size: 15px;
  line-height: 1.35;
  word-break: break-all;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.metric-head span {
  color: var(--text-muted);
  font-size: 11px;
}

.metric-status {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 7px;
  color: var(--success);
  font-size: 12px;
  font-style: normal;
  background: rgba(113, 229, 170, 0.1);
  border: 1px solid rgba(113, 229, 170, 0.18);
  border-radius: 999px;
}

.metric-status i {
  width: 7px;
  height: 7px;
  background: currentColor;
  border-radius: 50%;
  box-shadow: 0 0 11px currentColor;
}

.warning .metric-status {
  color: var(--warning);
  background: rgba(255, 191, 107, 0.1);
  border-color: rgba(255, 191, 107, 0.22);
}

.danger .metric-status {
  color: var(--danger);
  background: rgba(255, 111, 125, 0.1);
  border-color: rgba(255, 111, 125, 0.24);
}

.metric-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 78px;
  align-items: center;
  gap: 10px;
}

.metric-value {
  min-width: 0;
  color: #ffffff;
  font-size: 30px;
  font-weight: 800;
  line-height: 1.08;
  overflow-wrap: anywhere;
  text-shadow: 0 0 18px rgba(91, 214, 255, 0.18);
}

.metric-value.text {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.38;
}

.metric-value small {
  display: inline-block;
  margin-left: 5px;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 400;
}

.sparkline {
  height: 34px;
  display: flex;
  align-items: end;
  justify-content: flex-end;
  gap: 3px;
  padding: 5px 6px;
  background: rgba(14, 48, 126, 0.2);
  border: 1px solid rgba(121, 210, 255, 0.1);
  border-radius: 6px;
}

.sparkline i {
  width: 5px;
  min-height: 6px;
  display: block;
  background: linear-gradient(180deg, var(--cyan-soft), rgba(91, 214, 255, 0.22));
  box-shadow: 0 0 8px rgba(91, 214, 255, 0.28);
}

.text-badge {
  align-self: end;
  justify-self: end;
  padding: 5px 9px;
  color: var(--cyan);
  font-size: 12px;
  background: rgba(74, 169, 255, 0.1);
  border: 1px solid rgba(121, 210, 255, 0.12);
  border-radius: 999px;
}

.metric-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  background: rgba(14, 48, 126, 0.16);
  border: 1px solid rgba(121, 210, 255, 0.08);
  border-radius: 6px;
}

.metric-meta span {
  flex: 0 0 auto;
  color: var(--text-muted);
  font-size: 11px;
}

.metric-meta strong {
  min-width: 0;
  display: -webkit-box;
  color: var(--text-normal);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  word-break: break-all;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.metric-note {
  min-width: 0;
  margin: 0;
  color: #cceefa;
  font-size: 12px;
  line-height: 1.45;
  word-break: break-all;
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
</style>
