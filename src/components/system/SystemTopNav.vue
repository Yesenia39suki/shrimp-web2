<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import NotificationBell from '@/components/system/NotificationBell.vue'
import { useAuthStore } from '@/stores/authStore'
import { useShrimpSystemStore } from '@/stores/shrimpSystem'

const store = useShrimpSystemStore()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const currentTime = ref('')
let timerId: number | undefined

const waterMenu = computed(() => store.waterMetrics)
const shrimpMenu = computed(() => store.shrimpMetrics)
const activeSection = computed(() => {
  if (route.path.startsWith('/system/water')) {
    return 'water'
  }

  if (route.path.startsWith('/system/shrimp')) {
    return 'shrimp'
  }

  if (route.path.startsWith('/system/robot')) {
    return 'robot'
  }

  if (route.path.startsWith('/system/extensions')) {
    return 'extensions'
  }

  if (route.path.startsWith('/system/history')) {
    return 'history'
  }

  if (route.path.startsWith('/system/config')) {
    return 'config'
  }

  return 'overview'
})

function pad(value: number) {
  return value.toString().padStart(2, '0')
}

function updateTime() {
  const now = new Date()
  currentTime.value = `${now.getFullYear()}年${pad(now.getMonth() + 1)}月${pad(now.getDate())}日 ${pad(
    now.getHours(),
  )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

async function handleLogout() {
  await authStore.logout()
  router.replace('/login')
}

function openHistoryData() {
  router.push('/system/history')
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
  <header class="system-top-nav">
    <RouterLink to="/system" class="logo-link">
      <span class="logo-mark"><i></i></span>
      <span class="logo-copy">
        <strong>{{ store.systemMeta.logoText }}</strong>
        <em>投喂管理系统</em>
      </span>
    </RouterLink>

    <nav class="main-nav" aria-label="系统导航">
      <div class="nav-group">
        <RouterLink
          to="/system/water"
          class="nav-link"
          :class="{ active: activeSection === 'water' }"
        >
          水质监测
        </RouterLink>
        <div class="dropdown-panel">
          <RouterLink
            v-for="metric in waterMenu"
            :key="metric.key"
            :to="`/system/water/${metric.key}`"
          >
            {{ metric.label }}
          </RouterLink>
        </div>
      </div>

      <div class="nav-group">
        <RouterLink
          to="/system/shrimp"
          class="nav-link"
          :class="{ active: activeSection === 'shrimp' }"
        >
          虾群分析
        </RouterLink>
        <div class="dropdown-panel">
          <RouterLink
            v-for="metric in shrimpMenu"
            :key="metric.key"
            :to="`/system/shrimp/${metric.key}`"
          >
            {{ metric.label }}
          </RouterLink>
        </div>
      </div>

      <RouterLink
        to="/system/robot"
        class="nav-link"
        :class="{ active: activeSection === 'robot' }"
      >
        机器人监测
      </RouterLink>
      <RouterLink
        to="/system/extensions"
        class="nav-link"
        :class="{ active: activeSection === 'extensions' }"
      >
        扩展接口
      </RouterLink>
      <RouterLink
        to="/system/config"
        class="nav-link"
        :class="{ active: activeSection === 'config' }"
      >
        自定义内容
      </RouterLink>
    </nav>

    <section class="nav-status">
      <NotificationBell />
      <div class="time-box">{{ currentTime }}</div>
      <div class="user-box">
        <div class="user-line">
          <strong>{{ authStore.currentUser?.display_name ?? '未登录用户' }}</strong>
          <span>
            <i :class="{ offline: !store.systemMeta.online }"></i>
            {{ authStore.currentRoleText }}
          </span>
        </div>
        <button type="button" class="history-button" @click="openHistoryData">历史数据</button>
      </div>
      <button type="button" class="logout-button" @click="handleLogout">退出</button>
    </section>
  </header>
</template>

<style scoped>
.system-top-nav {
  position: relative;
  z-index: 3;
  min-height: 64px;
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr) max-content;
  align-items: center;
  gap: clamp(8px, 1.5vw, 24px);
  padding: 8px clamp(12px, 1.6vw, 26px);
  color: var(--text-normal);
  background: var(--nav-bg);
  border-bottom: 1px solid rgba(121, 210, 255, 0.28);
}

.logo-link {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  color: inherit;
  text-decoration: none;
  border-radius: var(--control-radius);
}

.logo-mark {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  border: 1px solid var(--border-cyan-strong);
  background: rgba(3, 14, 36, 0.16);
}

.logo-mark i {
  width: 13px;
  height: 13px;
  border: 2px solid #7aeec3;
  border-right-color: #5bd6ff;
  border-radius: 50%;
}

.logo-copy {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.logo-link strong {
  overflow: hidden;
  font-size: 16px;
  font-weight: 650;
  letter-spacing: -0.025em;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logo-link em {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 11px;
  font-style: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.main-nav {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
}

.nav-group {
  position: relative;
  min-width: 0;
}

.nav-link {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  padding: 0 clamp(6px, 0.8vw, 12px);
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.2;
  text-decoration: none;
  white-space: nowrap;
  border-radius: 999px;
}

.nav-link:hover,
.nav-link.active,
.nav-link.router-link-active {
  color: var(--on-primary);
  background: rgba(3, 14, 36, 0.26);
}

.nav-link.active,
.nav-link.router-link-active {
  font-weight: 600;
}

.dropdown-panel {
  position: absolute;
  top: calc(100% + 7px);
  left: 0;
  z-index: 8;
  width: min(232px, calc(100vw - 24px));
  display: grid;
  gap: 2px;
  padding: 6px;
  color: var(--text-normal);
  background: var(--overlay-bg);
  border: 1px solid var(--border-cyan);
  border-radius: 14px;
  box-shadow: var(--surface-shadow);
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
  transform: translateY(3px);
  transition: opacity 150ms ease, transform 150ms ease;
}

.dropdown-panel::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: -7px;
  height: 7px;
}

.nav-group:hover .dropdown-panel,
.nav-group:focus-within .dropdown-panel {
  visibility: visible;
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.dropdown-panel a {
  min-height: 34px;
  display: flex;
  align-items: center;
  padding: 6px 10px;
  color: var(--text-normal);
  font-size: 13px;
  text-decoration: none;
  border-radius: 8px;
}

.dropdown-panel a:hover,
.dropdown-panel a.router-link-active {
  color: var(--text-main);
  background: var(--panel-bg-strong);
}

.nav-status {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 9px;
}

.time-box {
  color: var(--text-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.user-box {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 10px;
  border-left: 1px solid var(--border-cyan);
}

.user-line {
  min-width: 0;
  max-width: 105px;
  display: grid;
  gap: 2px;
}

.user-line strong {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-line span {
  display: flex;
  align-items: center;
  color: var(--text-muted);
  font-size: 11px;
  white-space: nowrap;
}

.user-line i {
  width: 6px;
  height: 6px;
  margin-right: 5px;
  background: #69e2a4;
  border-radius: 50%;
}

.user-line i.offline { background: var(--danger); }

.history-button,
.logout-button {
  min-height: 32px;
  padding: 0 10px;
  color: var(--on-primary);
  font-size: 12px;
  white-space: nowrap;
  background: rgba(3, 14, 36, 0.2);
  border: 1px solid var(--border-cyan);
  border-radius: 999px;
  cursor: pointer;
}

.history-button:hover,
.logout-button:hover {
  border-color: var(--border-cyan-strong);
}

:is(.logo-link, .nav-link, .history-button, .logout-button):focus-visible {
  outline-color: var(--on-primary);
}

@media (max-width: 1120px) {
  .system-top-nav { grid-template-columns: minmax(0, 1fr) max-content; gap: 5px 12px; }
  .main-nav { grid-row: 2; grid-column: 1 / -1; justify-content: center; }
}

@media (max-width: 620px) {
  .system-top-nav { grid-template-columns: minmax(0, 1fr); }
  .nav-status { justify-content: flex-start; flex-wrap: wrap; gap: 5px 8px; }
  .main-nav { grid-row: auto; justify-content: flex-start; flex-wrap: wrap; }
  .nav-link { min-height: 30px; font-size: 12px; }
  .user-box { padding-left: 5px; gap: 5px; }
  .user-line { max-width: 72px; }
  .time-box { font-size: 11px; }
}

@media (prefers-reduced-motion: reduce) {
  .dropdown-panel { transition: none; }
}
</style>
