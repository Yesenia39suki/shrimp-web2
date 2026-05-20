<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

import type { ShrimpPond } from '@/types/operationConsole'

defineProps<{
  currentPond: ShrimpPond
}>()

const navItems = ['总览', '养殖场景', '投喂决策', '水质监测', '设备联动', '历史记录']
const currentTime = ref('')
let timerId: number | undefined

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
  <header class="v4-top-system-bar">
    <div class="system-brand">
      <div class="system-logo">
        <span></span>
      </div>
      <div class="system-title">
        <strong>虾群养殖投喂可视化操作系统</strong>
        <span>投喂决策 · 水质监测 · 设备联动 · 风险处置</span>
      </div>
    </div>

    <nav class="primary-tabs" aria-label="一级导航">
      <button
        v-for="item in navItems"
        :key="item"
        type="button"
        :class="{ active: item === '投喂决策' }"
      >
        {{ item }}
      </button>
    </nav>

    <div class="system-actions">
      <div class="context-pill time">{{ currentTime }}</div>
      <div class="context-pill online">
        <i></i>
        <span>系统在线</span>
      </div>
      <div class="context-pill">当前池号：{{ currentPond.id }}</div>
      <div class="context-pill">页面模式：操作控制台</div>
      <button type="button">全屏</button>
      <button type="button">设置</button>
    </div>
  </header>
</template>

<style scoped>
.v4-top-system-bar {
  height: 62px;
  display: grid;
  grid-template-columns: 330px minmax(460px, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 0 14px;
  color: #d9f3ff;
  background: linear-gradient(180deg, rgba(8, 30, 51, 0.98), rgba(4, 18, 33, 0.98)), #061426;
  border-bottom: 1px solid rgba(96, 190, 230, 0.26);
}

.system-brand {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.system-logo {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  background: rgba(3, 16, 30, 0.78);
  border: 1px solid rgba(84, 214, 255, 0.52);
}

.system-logo span {
  width: 18px;
  height: 18px;
  border: 3px solid #54d6ff;
  border-right-color: #73e0b2;
  border-radius: 50%;
  box-shadow: 0 0 15px rgba(84, 214, 255, 0.45);
}

.system-title {
  min-width: 0;
}

.system-title strong {
  display: block;
  overflow: hidden;
  color: #f5feff;
  font-size: 17px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.system-title span {
  display: block;
  margin-top: 4px;
  overflow: hidden;
  color: #80b6ca;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.primary-tabs {
  height: 36px;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  background: rgba(3, 16, 30, 0.7);
  border: 1px solid rgba(91, 184, 226, 0.16);
}

.primary-tabs button {
  min-width: 0;
  color: #9ec5d5;
  font-size: 13px;
  background: transparent;
  border: 0;
  border-right: 1px solid rgba(91, 184, 226, 0.12);
  cursor: default;
}

.primary-tabs button:last-child {
  border-right: 0;
}

.primary-tabs button.active {
  color: #f5feff;
  font-weight: 700;
  background: linear-gradient(180deg, rgba(23, 106, 145, 0.76), rgba(7, 44, 68, 0.78));
  box-shadow: 0 -2px 0 #54d6ff inset;
}

.system-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
}

.context-pill,
.system-actions button {
  height: 30px;
  display: inline-flex;
  align-items: center;
  padding: 0 9px;
  color: #b8d8e6;
  font-size: 12px;
  background: rgba(3, 16, 30, 0.72);
  border: 1px solid rgba(91, 184, 226, 0.18);
  white-space: nowrap;
}

.context-pill.time {
  color: #e8fbff;
  font-variant-numeric: tabular-nums;
}

.context-pill.online {
  color: #9df2c3;
}

.context-pill.online i {
  width: 7px;
  height: 7px;
  margin-right: 6px;
  background: #45d88d;
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(69, 216, 141, 0.78);
}

.system-actions button {
  color: #e8fbff;
  background: rgba(10, 50, 75, 0.75);
}
</style>
