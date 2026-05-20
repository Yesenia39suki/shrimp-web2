<script setup lang="ts">
import V5AnalysisBand from '@/components/console-v5/V5AnalysisBand.vue'
import V5FunctionSidebar from '@/components/console-v5/V5FunctionSidebar.vue'
import V5PropertyStrategyPanel from '@/components/console-v5/V5PropertyStrategyPanel.vue'
import V5SystemHeader from '@/components/console-v5/V5SystemHeader.vue'
import V5TwinWorkspace from '@/components/console-v5/V5TwinWorkspace.vue'
import { operationConsoleV5Mock } from '@/mock/operationConsoleV5'

const currentPond = operationConsoleV5Mock.currentPond
</script>

<template>
  <main class="operation-console-v5">
    <V5SystemHeader :pond="currentPond" />

    <section class="v5-main-zone">
      <V5FunctionSidebar :current-pond="currentPond" :ponds="operationConsoleV5Mock.ponds" />
      <V5TwinWorkspace :pond="currentPond" />
      <V5PropertyStrategyPanel :pond="currentPond" />
    </section>

    <V5AnalysisBand :charts="operationConsoleV5Mock.charts" :pond="currentPond" />
  </main>
</template>

<style scoped>
.operation-console-v5 {
  height: 100vh;
  min-width: 1360px;
  display: grid;
  grid-template-rows: 72px minmax(0, 1fr) 260px;
  gap: 10px;
  padding: 0 12px 12px;
  overflow: hidden;
  color: #d9f3ff;
  background:
    radial-gradient(circle at 50% 42%, rgba(20, 100, 130, 0.2), transparent 40%),
    linear-gradient(rgba(78, 165, 206, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(78, 165, 206, 0.04) 1px, transparent 1px), #030d1b;
  background-size:
    auto,
    44px 44px,
    44px 44px,
    auto;
}

.v5-main-zone {
  min-height: 0;
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr) 360px;
  gap: 10px;
}
</style>
