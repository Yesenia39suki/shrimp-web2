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

function handleOrganizationChange(event: Event) {
  authStore.switchOrganization((event.target as HTMLSelectElement).value)
}

function handleLogout() {
  authStore.logout()
  router.replace('/login')
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
        <select
          :value="authStore.currentOrganization?.id"
          aria-label="切换当前企业"
          @change="handleOrganizationChange"
        >
          <option
            v-for="organization in authStore.organizations"
            :key="organization.id"
            :value="organization.id"
          >
            {{ organization.name }}
          </option>
        </select>
      </div>
      <button type="button" class="logout-button" @click="handleLogout">退出</button>
    </section>
  </header>
</template>

<style scoped>
.system-top-nav {
  position: relative;
  z-index: 3;
  height: 70px;
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr) 560px;
  align-items: center;
  gap: 14px;
  padding: 0 18px;
  color: var(--text-normal);
  background:
    linear-gradient(112deg, transparent 0 42%, rgba(121, 210, 255, 0.06) 43%, transparent 46% 100%),
    rgba(3, 14, 36, 0.28);
  border-bottom: 1px solid rgba(121, 210, 255, 0.28);
  box-shadow: 0 10px 24px rgba(10, 31, 81, 0.24);
  backdrop-filter: blur(8px);
}

.system-top-nav::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(91, 214, 255, 0.72), transparent);
}

.logo-link {
  min-width: 0;
  height: 54px;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 10px 0 4px;
  color: var(--text-main);
  text-decoration: none;
  border: 1px solid transparent;
  border-radius: 14px;
}

.logo-mark {
  position: relative;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(121, 210, 255, 0.82);
  border-radius: 12px;
  background: rgba(3, 14, 36, 0.16);
  box-shadow:
    0 0 18px rgba(121, 210, 255, 0.34),
    0 0 0 5px rgba(27, 93, 247, 0.08);
}

.logo-mark::before,
.logo-mark::after {
  content: '';
  position: absolute;
  border: 1px solid rgba(121, 210, 255, 0.24);
  border-radius: inherit;
}

.logo-mark::before {
  inset: -4px;
}

.logo-mark::after {
  inset: 8px;
  transform: rotate(45deg);
}

.logo-mark i {
  width: 13px;
  height: 13px;
  border: 3px solid #7aeec3;
  border-right-color: #5bd6ff;
  border-radius: 50%;
}

.logo-copy {
  min-width: 0;
  display: grid;
  gap: 4px;
  align-content: center;
  transform: translateY(-1px);
}

.logo-link strong {
  overflow: hidden;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1.05;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logo-link em {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 11.5px;
  font-style: normal;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.main-nav {
  min-width: 0;
  height: 42px;
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 4px;
  padding: 3px 5px;
  background: rgba(3, 14, 36, 0.12);
  border: 1px solid rgba(121, 210, 255, 0.18);
  border-radius: 999px;
}

.nav-group {
  position: relative;
  padding-bottom: 34px;
}

.nav-link {
  position: relative;
  height: 40px;
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  color: #bfe8f6;
  font-size: 13px;
  line-height: 1.2;
  text-decoration: none;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 999px;
  transition:
    color 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease;
}

.nav-link::before {
  content: '';
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 6px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(91, 214, 255, 0.72), transparent);
  opacity: 0;
  transition: opacity 0.18s ease;
}

.nav-link.router-link-active,
.nav-link.active,
.nav-link:hover {
  color: #ffffff;
  background:
    radial-gradient(circle at 50% 0, rgba(121, 210, 255, 0.14), transparent 68%),
    rgba(3, 14, 36, 0.26);
  border-color: rgba(121, 210, 255, 0.28);
  box-shadow:
    0 0 18px rgba(74, 169, 255, 0.18),
    0 0 0 1px rgba(255, 255, 255, 0.04) inset;
}

.nav-link.router-link-active::before,
.nav-link.active::before,
.nav-link:hover::before {
  opacity: 1;
}

.nav-link.active::after,
.nav-link.router-link-active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -8px;
  width: 8px;
  height: 8px;
  background: #5bd6ff;
  border-radius: 50%;
  box-shadow: 0 0 14px rgba(91, 214, 255, 0.9);
  transform: translateX(-50%);
}

.dropdown-panel {
  position: absolute;
  top: 48px;
  left: 0;
  z-index: 8;
  width: 296px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 7px;
  padding: 12px;
  background:
    radial-gradient(circle at 18% 0, rgba(121, 210, 255, 0.12), transparent 44%),
    rgba(3, 14, 36, 0.76);
  border: 1px solid rgba(121, 210, 255, 0.34);
  border-radius: 10px;
  box-shadow:
    0 22px 52px rgba(13, 38, 95, 0.34),
    0 0 22px rgba(74, 169, 255, 0.16);
  opacity: 0;
  pointer-events: none;
  transform: translateY(8px);
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.dropdown-panel::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: -34px;
  height: 34px;
}

.nav-group:hover .dropdown-panel {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.dropdown-panel a {
  position: relative;
  min-width: 0;
  min-height: 34px;
  display: flex;
  align-items: center;
  padding: 6px 10px 6px 12px;
  color: #bfe8f6;
  font-size: 12px;
  line-height: 1.45;
  text-decoration: none;
  background: rgba(12, 45, 120, 0.42);
  border: 1px solid rgba(121, 210, 255, 0.14);
  border-radius: 6px;
  transition:
    color 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;
}

.dropdown-panel a::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 2px;
  background: var(--cyan);
  opacity: 0;
  box-shadow: 0 0 10px rgba(91, 214, 255, 0.72);
}

.dropdown-panel a:hover,
.dropdown-panel a.router-link-active {
  color: #ffffff;
  background: rgba(3, 14, 36, 0.32);
  border-color: rgba(121, 210, 255, 0.38);
}

.dropdown-panel a:hover::before,
.dropdown-panel a.router-link-active::before {
  opacity: 1;
}

.nav-status {
  display: grid;
  grid-template-columns: 78px 188px minmax(220px, 250px) 50px;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.time-box {
  height: 36px;
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  color: #cceefa;
  font-size: 12px;
  background: rgba(3, 14, 36, 0.16);
  border: 1px solid rgba(121, 210, 255, 0.18);
  border-radius: 999px;
  box-shadow: 0 0 14px rgba(22, 67, 164, 0.14) inset;
}

.time-box {
  justify-content: center;
  font-variant-numeric: tabular-nums;
}

.user-box {
  min-width: 0;
  height: 46px;
  display: grid;
  grid-template-columns: minmax(82px, 0.72fr) minmax(126px, 1fr);
  align-items: center;
  gap: 6px;
  padding: 5px 7px;
  background: rgba(3, 14, 36, 0.16);
  border: 1px solid rgba(121, 210, 255, 0.18);
  border-radius: 8px;
  box-shadow: 0 0 14px rgba(22, 67, 164, 0.14) inset;
}

.user-line {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.user-line strong {
  overflow: hidden;
  color: var(--text-main);
  font-size: 12px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-line span {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  overflow: hidden;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-line i {
  width: 7px;
  height: 7px;
  margin-right: 7px;
  background: #69e2a4;
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(105, 226, 164, 0.75);
}

.user-line i.offline {
  background: var(--danger);
  box-shadow: 0 0 10px rgba(255, 111, 125, 0.72);
}

.user-box select {
  min-width: 0;
  height: 30px;
  color: var(--text-main);
  font-size: 12px;
  background: rgba(3, 14, 36, 0.34);
  border: 1px solid rgba(121, 210, 255, 0.16);
  outline: none;
}

.logout-button {
  height: 34px;
  color: #dff8ff;
  font-size: 12px;
  background: rgba(3, 14, 36, 0.2);
  border: 1px solid rgba(121, 210, 255, 0.18);
  border-radius: 999px;
  cursor: pointer;
}

.logout-button:hover {
  border-color: rgba(121, 210, 255, 0.38);
}
</style>
