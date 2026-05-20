<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import type { ShrimpPond } from '@/types/operationConsole'

const props = defineProps<{
  currentPond: ShrimpPond
}>()

const currentTime = ref('')
let timerId: number | undefined

const topMetrics = computed(() => {
  return props.currentPond.waterQuality.slice(0, 3)
})

function formatNumber(value: number) {
  return value.toString().padStart(2, '0')
}

function updateTime() {
  const date = new Date()
  currentTime.value = `${date.getFullYear()}年${formatNumber(date.getMonth() + 1)}月${formatNumber(
    date.getDate(),
  )}日 ${formatNumber(date.getHours())}:${formatNumber(date.getMinutes())}:${formatNumber(
    date.getSeconds(),
  )}`
}

onMounted(() => {
  updateTime()
  timerId = window.setInterval(updateTime, 1000)
})

onBeforeUnmount(() => {
  if (timerId !== undefined) {
    window.clearInterval(timerId)
  }
})
</script>

<template>
  <header class="top-status-bar">
    <div class="system-title">
      <span class="title-mark"></span>
      <div>
        <strong>虾群养殖投喂可视化操作系统</strong>
        <span>数字孪生监控台</span>
      </div>
    </div>

    <nav class="top-nav" aria-label="页面模式">
      <span>虾池态势</span>
      <span>投喂决策</span>
      <span>水质监测</span>
      <span>设备联动</span>
    </nav>

    <div class="metric-strip">
      <div v-for="metric in topMetrics" :key="metric.key" class="top-metric">
        <span class="metric-ring"></span>
        <div>
          <strong>{{ metric.value }}</strong>
          <span>{{ metric.label }}</span>
        </div>
      </div>
    </div>

    <div class="status-items">
      <div class="status-item online">
        <span class="online-dot"></span>
        <span>系统在线</span>
      </div>
      <div class="status-item">当前池号：{{ currentPond.id }}</div>
      <div class="status-item time">{{ currentTime }}</div>
      <button class="screen-button" type="button" aria-label="进入大屏模式">
        <span class="screen-icon"></span>
        <span>大屏</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.top-status-bar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  height: 54px;
  padding: 0 14px 0 18px;
  color: #d9f3ff;
  background:
    linear-gradient(90deg, rgba(3, 18, 34, 0.98), rgba(7, 32, 54, 0.96), rgba(3, 18, 34, 0.98)),
    #07192d;
  border: 1px solid rgba(111, 206, 255, 0.2);
  border-top: 0;
  border-radius: 0 0 6px 6px;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04) inset;
}

.top-status-bar::after {
  content: '';
  position: absolute;
  left: 28%;
  right: 28%;
  bottom: -1px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(101, 226, 255, 0.85), transparent);
}

.system-title {
  display: flex;
  align-items: center;
  flex: 0 0 260px;
  min-width: 0;
  letter-spacing: 0;
  white-space: nowrap;
}

.system-title strong {
  display: block;
  color: #f2fdff;
  font-size: 17px;
  font-weight: 800;
}

.system-title span {
  display: block;
  margin-top: 3px;
  color: #73d8ff;
  font-size: 11px;
}

.title-mark {
  width: 18px;
  height: 18px;
  margin-right: 10px;
  border: 2px solid #7de7ff;
  border-radius: 50%;
  box-shadow:
    0 0 0 5px rgba(125, 231, 255, 0.08),
    0 0 16px rgba(125, 231, 255, 0.55);
}

.top-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex: 0 0 278px;
  min-width: 278px;
}

.top-nav span {
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 0 8px;
  color: #8fbdd0;
  font-size: 12px;
  background: rgba(4, 20, 36, 0.5);
  border: 1px solid rgba(97, 172, 210, 0.14);
  white-space: nowrap;
  word-break: keep-all;
}

.top-nav span:nth-child(2) {
  color: #eaffff;
  border-color: rgba(93, 213, 255, 0.36);
  background: rgba(16, 80, 114, 0.46);
}

.metric-strip {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 1 1 auto;
}

.top-metric {
  min-width: 76px;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  align-items: center;
  gap: 7px;
}

.metric-ring {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(105, 216, 255, 0.7);
  border-left-color: rgba(115, 224, 178, 0.92);
  border-radius: 50%;
  box-shadow: 0 0 13px rgba(84, 214, 255, 0.3);
  animation: metric-rotate 8s linear infinite;
}

.top-metric strong {
  display: block;
  overflow: hidden;
  color: #f0fbff;
  font-size: 12px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.top-metric span:last-child {
  display: block;
  margin-top: 2px;
  color: #7fa9bd;
  font-size: 11px;
}

.status-items {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  min-width: 0;
}

.status-item {
  height: 28px;
  display: inline-flex;
  align-items: center;
  padding: 0 9px;
  color: #a9cfe0;
  font-size: 12px;
  border: 1px solid rgba(118, 190, 224, 0.18);
  background: rgba(9, 30, 52, 0.62);
  white-space: nowrap;
}

.time {
  color: #e4fbff;
  font-variant-numeric: tabular-nums;
}

.online {
  color: #bdfad3;
}

.online-dot {
  width: 7px;
  height: 7px;
  margin-right: 7px;
  background: #36d681;
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(54, 214, 129, 0.75);
}

.screen-button {
  height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  color: #dffbff;
  font-size: 12px;
  background: rgba(18, 75, 108, 0.78);
  border: 1px solid rgba(111, 206, 255, 0.35);
  cursor: default;
}

.screen-icon {
  width: 13px;
  height: 13px;
  border: 1px solid currentcolor;
  border-radius: 2px;
  box-shadow: 0 0 0 2px rgba(125, 231, 255, 0.08) inset;
}

@keyframes metric-rotate {
  to {
    transform: rotate(360deg);
  }
}
</style>
