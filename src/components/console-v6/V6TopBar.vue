<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { operationConsoleV6Mock } from '@/mock/operationConsoleV6'
import type { ShrimpPond } from '@/types/operationConsole'

const props = defineProps<{
  pond: ShrimpPond
}>()

const currentTime = ref('')
let timerId: number | undefined

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
  <header class="v6-top-bar">
    <section class="system-identity">
      <div class="system-logo">
        <span></span>
      </div>
      <div class="system-copy">
        <strong>虾群养殖投喂可视化操作系统</strong>
        <em>数字孪生监控台</em>
      </div>
    </section>

    <nav class="system-nav" aria-label="一级导航">
      <button
        v-for="tab in operationConsoleV6Mock.navTabs"
        :key="tab"
        type="button"
        :class="{ active: tab === '投喂决策' }"
      >
        {{ tab }}
      </button>
    </nav>

    <section class="runtime-area">
      <div class="runtime-item time">{{ currentTime }}</div>
      <div class="runtime-item online">
        <i></i>
        <span>系统在线</span>
      </div>
      <div class="runtime-item">当前池号：{{ pond.id }}</div>
      <div class="runtime-item">当前模式：投喂态势</div>
      <div class="runtime-item compact">溶氧：{{ oxygen?.value }}</div>
      <div class="runtime-item compact">酸碱度：{{ ph?.value }}</div>
      <button type="button">大屏</button>
      <button type="button">设置</button>
    </section>
  </header>
</template>

<style scoped>
.v6-top-bar {
  height: 72px;
  min-width: 0;
  display: grid;
  grid-template-columns: 332px minmax(430px, 1fr) 520px;
  align-items: center;
  gap: 12px;
  padding: 0 14px;
  color: #dceff7;
  background: linear-gradient(180deg, rgba(8, 29, 49, 0.98), rgba(5, 18, 34, 0.98));
  border-bottom: 1px solid rgba(93, 186, 226, 0.26);
}

.system-identity {
  min-width: 0;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
}

.system-logo {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  background: rgba(3, 15, 29, 0.74);
  border: 1px solid rgba(84, 214, 255, 0.52);
}

.system-logo span {
  width: 20px;
  height: 20px;
  border: 3px solid #54d6ff;
  border-right-color: #73e0b2;
  border-radius: 50%;
}

.system-copy {
  min-width: 0;
}

.system-copy strong {
  display: block;
  overflow: hidden;
  color: #f4fcff;
  font-size: 18px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.system-copy em {
  display: block;
  margin-top: 5px;
  color: #7eaec2;
  font-size: 12px;
  font-style: normal;
}

.system-nav {
  height: 38px;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  background: rgba(3, 15, 29, 0.68);
  border: 1px solid rgba(93, 186, 226, 0.16);
}

.system-nav button {
  min-width: 0;
  color: #a9cfe0;
  font-size: 13px;
  background: transparent;
  border: 0;
  border-right: 1px solid rgba(93, 186, 226, 0.12);
  cursor: default;
}

.system-nav button:last-child {
  border-right: 0;
}

.system-nav button.active {
  color: #f4fcff;
  font-weight: 700;
  background: linear-gradient(180deg, rgba(23, 101, 140, 0.74), rgba(6, 42, 66, 0.78));
  box-shadow: 0 -2px 0 #54d6ff inset;
}

.runtime-area {
  min-width: 0;
  display: grid;
  grid-template-columns: 154px 76px 96px 118px;
  grid-auto-rows: 28px;
  justify-content: end;
  gap: 5px;
}

.runtime-item,
.runtime-area button {
  min-width: 0;
  height: 28px;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  color: #b9d7e5;
  font-size: 11px;
  background: rgba(3, 15, 29, 0.68);
  border: 1px solid rgba(93, 186, 226, 0.16);
  white-space: nowrap;
}

.runtime-item.time {
  color: #e8fbff;
  font-variant-numeric: tabular-nums;
}

.runtime-item.online {
  color: #9df2c3;
}

.runtime-item.online i {
  width: 7px;
  height: 7px;
  margin-right: 6px;
  background: #45d88d;
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(69, 216, 141, 0.75);
}

.runtime-item.compact {
  justify-content: center;
}

.runtime-area button {
  justify-content: center;
  color: #e8fbff;
  background: rgba(12, 54, 82, 0.75);
}
</style>
