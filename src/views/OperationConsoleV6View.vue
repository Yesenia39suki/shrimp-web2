<script setup lang="ts">
import V6AnalysisStrip from '@/components/console-v6/V6AnalysisStrip.vue'
import V6Inspector from '@/components/console-v6/V6Inspector.vue'
import V6Sidebar from '@/components/console-v6/V6Sidebar.vue'
import V6TopBar from '@/components/console-v6/V6TopBar.vue'
import V6Workspace from '@/components/console-v6/V6Workspace.vue'
import { operationConsoleV6Mock } from '@/mock/operationConsoleV6'

const currentPond = operationConsoleV6Mock.currentPond
</script>

<template>
  <main class="operation-console-v6">
    <V6TopBar :pond="currentPond" />

    <section class="v6-middle-region">
      <V6Sidebar :current-pond="currentPond" :ponds="operationConsoleV6Mock.ponds" />
      <V6Workspace :pond="currentPond" />
      <V6Inspector :pond="currentPond" />
    </section>

    <V6AnalysisStrip :charts="operationConsoleV6Mock.charts" :pond="currentPond" />
  </main>
</template>

<style scoped>
.operation-console-v6 {
  height: 100vh;
  min-width: 1360px;
  display: grid;
  grid-template-rows: 72px minmax(0, 1fr) 260px;
  gap: 10px;
  padding: 0 12px 12px;
  overflow: hidden;
  color: #d9f3ff;
  background:
    linear-gradient(rgba(78, 165, 206, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(78, 165, 206, 0.04) 1px, transparent 1px),
    radial-gradient(circle at 50% 42%, rgba(20, 100, 130, 0.16), transparent 42%), #030d1b;
  background-size:
    42px 42px,
    42px 42px,
    auto,
    auto;
}

.v6-middle-region {
  min-height: 0;
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr) 360px;
  gap: 10px;
  overflow: hidden;
}

:deep(button) {
  font-family: inherit;
}
</style>
