<script setup lang="ts">
import { watch } from 'vue'
import { RouterView } from 'vue-router'

import QingdaoMapBackground from '@/components/system/QingdaoMapBackground.vue'
import PondAgentChat from '@/components/system/PondAgentChat.vue'
import SystemTopNav from '@/components/system/SystemTopNav.vue'
import { useAuthStore } from '@/stores/authStore'
import { useShrimpSystemStore } from '@/stores/shrimpSystem'

const authStore = useAuthStore()
const systemStore = useShrimpSystemStore()

watch(
  () => authStore.currentOrganization?.id,
  (organizationId) => {
    if (organizationId) {
      void systemStore.loadOrganizationData(organizationId)
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="system-shell-layout">
    <QingdaoMapBackground />
    <SystemTopNav />

    <main class="system-content">
      <RouterView />
    </main>
    <PondAgentChat v-if="authStore.isLoggedIn" />
  </div>
</template>

<style scoped>
.system-shell-layout {
  position: relative;
  height: 100dvh;
  min-width: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  color: var(--text-normal);
  background: var(--system-gradient) var(--system-bg);
}

.system-content {
  position: relative;
  z-index: 2;
  min-height: 0;
  width: min(100%, 1880px);
  justify-self: center;
  padding: 16px 20px;
  overflow: auto;
  overscroll-behavior: contain;
}

.system-content :deep(:is(select, input, textarea)) {
  max-width: 100%;
  color-scheme: dark;
  border-radius: 8px;
}

.system-content :deep(:is(select, input, textarea, button, a):focus-visible) {
  outline: 2px solid var(--cyan);
  outline-offset: 2px;
}

.system-content :deep(button:not(.metric-card)) {
  border-radius: var(--control-radius);
}

.system-content :deep(.page-actions button:not(.ghost):not(:disabled)) {
  color: var(--on-primary);
  background: var(--primary-blue);
  border-color: var(--border-cyan);
  border-radius: 999px;
}

.system-content :deep(:is(.page-head, .history-head, .extension-head, .water-stage) h1) {
  font-weight: 650;
  letter-spacing: -0.025em;
}

@media (max-width: 960px) {
  .system-content :deep(:is(.water-page, .system-page, .detail-page, .robot-page, .extension-page, .history-page, .config-page)) {
    height: auto;
    min-width: 0;
    grid-template-rows: auto;
    overflow: visible;
  }

  .system-content :deep(:is(.page-head, .history-head, .extension-head)) {
    min-height: 74px;
    padding: 12px 14px;
    flex-wrap: wrap;
  }

  .system-content :deep(:is(.water-workbench, .detail-body, .chart-top, .chart-bottom, .history-layout, .config-layout, .scene-layout)) {
    grid-template-columns: minmax(0, 1fr);
    overflow: visible;
  }

  .system-content :deep(.water-stage) {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: auto;
  }

  .system-content :deep(.metric-cloud-body) {
    height: auto;
  }

  .system-content :deep(:is(.chart-panel, .trend-band, .chart-card)) {
    min-height: 220px;
  }

  .system-content :deep(:is(.robot-grid, .metric-grid)) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .system-content :deep(.history-panel) {
    grid-template-rows: auto auto minmax(220px, 1fr);
  }

  .system-content :deep(.category-list) {
    grid-template-columns: repeat(auto-fit, minmax(108px, 1fr));
  }

  .system-content :deep(.history-table) { overflow-x: auto; }
  .system-content :deep(:is(.table-head, .table-body)) { min-width: 640px; }
}

@media (max-width: 720px) {
  .system-content { padding: 12px; }

  .system-content :deep(:is(.headline-row, .page-actions, .head-meta, .head-actions, .panel-title, .panel-controls, .panel-tools)) {
    display: flex;
    min-width: 0;
    flex-wrap: wrap;
    justify-content: flex-start;
    gap: 6px 10px;
  }

  .system-content :deep(.panel-title) { padding-block: 8px; }

  .system-content :deep(:is(.headline-row, .page-head) p) {
    white-space: normal;
  }

  .system-content :deep(.water-stage) {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'copy' 'tools' 'readings' 'meta';
  }

  .system-content :deep(.stage-tools) { justify-content: flex-start; }

  .system-content :deep(:is(.reading-strip, .water-meta, .pond-strip, .history-page .summary-grid, .config-stepbar, .list-layout, .ai-layout)) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .system-content :deep(:is(.chart-section, .chart-grid, .security-panel)) {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 490px) {
  .system-content :deep(:is(.robot-grid, .metric-grid, .metric-cloud-body, .ai-layout, .list-layout, .form-grid, .organization-editor)) {
    grid-template-columns: minmax(0, 1fr);
  }

  .system-content :deep(:is(.form-grid, .organization-editor) label) {
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
  }

  .system-content :deep(.threshold-row) {
    grid-template-columns: minmax(0, 1fr) 20px minmax(0, 1fr);
  }

  .system-content :deep(.threshold-row strong) { grid-column: 1 / -1; }
  .system-content :deep(.module-grid button) { padding: 8px; }
  .system-content :deep(.module-grid strong) { font-size: 15px; }
}
</style>
