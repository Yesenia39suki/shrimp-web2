<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import NotificationPanel from '@/components/system/NotificationPanel.vue'
import { useShrimpSystemStore } from '@/stores/shrimpSystem'

const store = useShrimpSystemStore()
const route = useRoute()
const indicatorRef = ref<HTMLElement | null>(null)
const panelVisible = ref(false)

const hasAlerts = computed(() => store.hasActiveAlert)
const statusText = computed(() => (hasAlerts.value ? `${store.activeAlertCount} 条异常` : '正常'))

function closePanel() {
  panelVisible.value = false
}

function togglePanel() {
  if (!hasAlerts.value) {
    closePanel()
    return
  }

  panelVisible.value = !panelVisible.value
}

function handleOutsideClick(event: MouseEvent) {
  if (!indicatorRef.value || indicatorRef.value.contains(event.target as Node)) {
    return
  }

  closePanel()
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closePanel()
  }
}

watch(
  () => store.activeAlertCount,
  (count) => {
    if (count === 0) {
      closePanel()
    }
  },
)

watch(
  () => route.fullPath,
  () => closePanel(),
)

onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div
    ref="indicatorRef"
    class="notification-bell"
    :class="{ active: panelVisible, warning: hasAlerts, normal: !hasAlerts }"
  >
    <button
      type="button"
      class="bell-button"
      :aria-label="hasAlerts ? `告警中心，当前 ${store.activeAlertCount} 条异常` : '系统当前无异常'"
      :aria-expanded="panelVisible"
      :disabled="!hasAlerts"
      @click.stop="togglePanel"
    >
      <span v-if="hasAlerts" class="warning-symbol" aria-hidden="true"></span>
      <span v-else class="signal-ring" aria-hidden="true"></span>
      <em>{{ statusText }}</em>
    </button>
    <strong v-if="hasAlerts" class="alert-count">{{ store.activeAlertCount }}</strong>
    <NotificationPanel v-if="panelVisible" />
  </div>
</template>

<style scoped>
.notification-bell {
  position: relative;
  width: 78px;
  height: 42px;
  display: grid;
  place-items: center;
  z-index: 20;
}

.bell-button {
  position: relative;
  width: 72px;
  height: 36px;
  display: inline-grid;
  grid-template-columns: 16px minmax(0, 1fr);
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  color: var(--text-normal);
  background: rgba(3, 14, 36, 0.32);
  border: 1px solid rgba(121, 210, 255, 0.22);
  border-radius: 999px;
  box-shadow:
    0 0 14px rgba(8, 24, 65, 0.18) inset,
    0 0 12px rgba(91, 214, 255, 0.06);
  cursor: pointer;
}

.bell-button:hover {
  border-color: rgba(121, 210, 255, 0.42);
  box-shadow:
    0 0 16px rgba(74, 169, 255, 0.12),
    0 0 14px rgba(8, 24, 65, 0.18) inset;
}

.bell-button:disabled {
  cursor: default;
}

.notification-bell.active .bell-button {
  border-color: rgba(121, 210, 255, 0.56);
  box-shadow:
    0 0 18px rgba(91, 214, 255, 0.18),
    0 0 14px rgba(8, 24, 65, 0.18) inset;
}

.notification-bell.normal .bell-button {
  opacity: 0.86;
}

.signal-ring {
  position: relative;
  width: 12px;
  height: 12px;
  border: 1px solid rgba(105, 226, 164, 0.58);
  border-radius: 50%;
  box-shadow: 0 0 12px rgba(105, 226, 164, 0.18);
}

.signal-ring::before {
  content: '';
  position: absolute;
  inset: 3px;
  background: #69e2a4;
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(105, 226, 164, 0.75);
}

.notification-bell.warning .signal-ring {
  border-color: rgba(255, 111, 125, 0.68);
  box-shadow: 0 0 14px rgba(255, 111, 125, 0.3);
}

.notification-bell.warning .signal-ring::before {
  background: var(--danger);
  box-shadow: 0 0 12px rgba(255, 111, 125, 0.82);
}

.warning-symbol {
  position: relative;
  width: 16px;
  height: 15px;
  display: block;
  background: #ff5f6f;
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
  filter: drop-shadow(0 0 8px rgba(255, 95, 111, 0.62));
}

.warning-symbol::after {
  content: '!';
  position: absolute;
  left: 0;
  right: 0;
  top: 3px;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  text-align: center;
}

.bell-button em {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 11px;
  font-style: normal;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-bell.warning .bell-button em {
  color: #ffd5da;
}

.alert-count {
  position: absolute;
  top: -2px;
  right: -3px;
  min-width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  padding: 0 5px;
  color: #fff;
  font-size: 10px;
  line-height: 1;
  background: var(--danger);
  border: 1px solid rgba(255, 218, 222, 0.58);
  border-radius: 10px;
  box-shadow: 0 0 12px rgba(255, 111, 125, 0.45);
}
</style>
