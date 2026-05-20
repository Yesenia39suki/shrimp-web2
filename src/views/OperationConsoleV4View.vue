<script setup lang="ts">
import V4AnalysisBand from '@/components/console-v4/V4AnalysisBand.vue'
import V4AttributeStrategyPanel from '@/components/console-v4/V4AttributeStrategyPanel.vue'
import V4LeftSystemPanel from '@/components/console-v4/V4LeftSystemPanel.vue'
import V4TopSystemBar from '@/components/console-v4/V4TopSystemBar.vue'
import V4TwinWorkbench from '@/components/console-v4/V4TwinWorkbench.vue'
import { useOperationConsoleStore } from '@/stores/operationConsole'

const consoleStore = useOperationConsoleStore()
</script>

<template>
  <main class="operation-console-v4">
    <V4TopSystemBar :current-pond="consoleStore.currentPond" />

    <section class="v4-body">
      <V4LeftSystemPanel
        :ponds="consoleStore.ponds"
        :selected-pond-id="consoleStore.selectedPondId"
        :current-pond="consoleStore.currentPond"
        :alert-overview="consoleStore.alertOverview"
        :monitor-feeds="consoleStore.monitorFeeds"
        @select-pond="consoleStore.selectPond"
      />

      <V4TwinWorkbench :pond="consoleStore.currentPond" />

      <V4AttributeStrategyPanel :pond="consoleStore.currentPond" />
    </section>

    <V4AnalysisBand :charts="consoleStore.charts" :current-pond="consoleStore.currentPond" />
  </main>
</template>

<style scoped>
.operation-console-v4 {
  height: 100vh;
  min-width: 0;
  display: grid;
  grid-template-rows: 62px minmax(0, 1fr) 190px;
  gap: 8px;
  padding: 0 10px 10px;
  overflow: hidden;
  color: #d9f3ff;
  background:
    radial-gradient(circle at 50% 40%, rgba(20, 100, 130, 0.22), transparent 38%),
    linear-gradient(rgba(78, 165, 206, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(78, 165, 206, 0.045) 1px, transparent 1px), #030d1b;
  background-size:
    auto,
    44px 44px,
    44px 44px,
    auto;
}

.v4-body {
  min-height: 0;
  display: grid;
  grid-template-columns: 310px minmax(0, 1fr) 318px;
  gap: 8px;
}
</style>
