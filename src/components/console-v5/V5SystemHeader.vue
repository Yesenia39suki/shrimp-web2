<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { operationConsoleV5Mock } from '@/mock/operationConsoleV5'
import type { ShrimpPond } from '@/types/operationConsole'

const props = defineProps<{
  pond: ShrimpPond
}>()

const currentTime = ref('')
let timerId: number | undefined

const temperature = computed(() =>
  props.pond.waterQuality.find((metric) => metric.key === 'temperature'),
)
const oxygen = computed(() => props.pond.waterQuality.find((metric) => metric.key === 'oxygen'))
const ph = computed(() => props.pond.waterQuality.find((metric) => metric.key === 'ph'))

function pad(value: number) {
  return value.toString().padStart(2, '0')
}

function updateTime() {
  const date = new Date()
  currentTime.value = `${date.getFullYear()}年${pad(date.getMonth() + 1)}月${pad(date.getDate())}日 ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
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
  <header class="v5-system-header">
    <section class="brand-block">
      <div class="logo-box">
        <span></span>
      </div>
      <div class="brand-copy">
        <strong>虾群养殖投喂可视化操作系统</strong>
        <em>数字孪生监控台</em>
      </div>
    </section>

    <nav class="primary-nav" aria-label="一级导航">
      <button
        v-for="item in operationConsoleV5Mock.navigationTabs"
        :key="item"
        type="button"
        :class="{ active: item === '投喂决策' }"
      >
        {{ item }}
      </button>
    </nav>

    <section class="runtime-block">
      <div class="metric-pill">
        <span>温度</span>
        <strong>{{ temperature?.value }}</strong>
      </div>
      <div class="metric-pill">
        <span>溶氧</span>
        <strong>{{ oxygen?.value }}</strong>
      </div>
      <div class="metric-pill">
        <span>酸碱度</span>
        <strong>{{ ph?.value }}</strong>
      </div>
      <div class="status-pill online">
        <i></i>
        <span>系统在线</span>
      </div>
      <div class="status-pill">当前池号：{{ pond.id }}</div>
      <div class="status-pill time">{{ currentTime }}</div>
      <button type="button">大屏</button>
      <button type="button">设置</button>
    </section>
  </header>
</template>

<style scoped>
.v5-system-header {
  height: 72px;
  min-width: 0;
  display: grid;
  grid-template-columns: 300px minmax(500px, 1fr) 520px;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  color: #dceff7;
  background: linear-gradient(180deg, rgba(8, 29, 49, 0.98), rgba(5, 18, 34, 0.98)), #061427;
  border-bottom: 1px solid rgba(93, 186, 226, 0.26);
}

.brand-block {
  min-width: 0;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
}

.logo-box {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  background: rgba(3, 15, 29, 0.74);
  border: 1px solid rgba(84, 214, 255, 0.5);
}

.logo-box span {
  width: 20px;
  height: 20px;
  border: 3px solid #54d6ff;
  border-right-color: #73e0b2;
  border-radius: 50%;
}

.brand-copy {
  min-width: 0;
}

.brand-copy strong {
  display: block;
  overflow: hidden;
  color: #f4fcff;
  font-size: 18px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.brand-copy em {
  display: block;
  margin-top: 5px;
  color: #7eaec2;
  font-size: 12px;
  font-style: normal;
}

.primary-nav {
  height: 38px;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  background: rgba(3, 15, 29, 0.68);
  border: 1px solid rgba(93, 186, 226, 0.16);
}

.primary-nav button {
  min-width: 0;
  color: #a9cfe0;
  font-size: 13px;
  background: transparent;
  border: 0;
  border-right: 1px solid rgba(93, 186, 226, 0.12);
}

.primary-nav button:last-child {
  border-right: 0;
}

.primary-nav button.active {
  color: #f4fcff;
  font-weight: 700;
  background: linear-gradient(180deg, rgba(23, 101, 140, 0.74), rgba(6, 42, 66, 0.78));
  box-shadow: 0 -2px 0 #54d6ff inset;
}

.runtime-block {
  min-width: 0;
  display: grid;
  grid-template-columns: 58px 72px 54px 82px 88px;
  grid-auto-rows: 28px;
  align-items: center;
  justify-content: flex-end;
  gap: 4px 5px;
}

.metric-pill,
.status-pill,
.runtime-block button {
  height: 28px;
  display: inline-flex;
  align-items: center;
  padding: 0 7px;
  color: #b9d7e5;
  font-size: 11px;
  background: rgba(3, 15, 29, 0.68);
  border: 1px solid rgba(93, 186, 226, 0.16);
  white-space: nowrap;
}

.metric-pill {
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  min-width: 58px;
}

.metric-pill span {
  color: #7fa9bd;
  font-size: 10px;
}

.metric-pill strong {
  color: #f2fbff;
  font-size: 11px;
}

.status-pill.online {
  color: #9df2c3;
}

.status-pill.online i {
  width: 7px;
  height: 7px;
  margin-right: 6px;
  background: #45d88d;
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(69, 216, 141, 0.75);
}

.status-pill.time {
  color: #e8fbff;
  font-variant-numeric: tabular-nums;
  grid-column: span 2;
}

.runtime-block button {
  color: #e8fbff;
  background: rgba(12, 54, 82, 0.75);
}
</style>
