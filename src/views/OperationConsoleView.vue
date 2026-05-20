<script setup lang="ts">
import BottomAnalyticsPanel from '@/components/console/BottomAnalyticsPanel.vue'
import DigitalTwinWorkspace from '@/components/console/DigitalTwinWorkspace.vue'
import LeftOverviewPanel from '@/components/console/LeftOverviewPanel.vue'
import RightDetailPanel from '@/components/console/RightDetailPanel.vue'
import TopStatusBar from '@/components/console/TopStatusBar.vue'
import { useOperationConsoleStore } from '@/stores/operationConsole'

const consoleStore = useOperationConsoleStore()
</script>

<template>
  <main class="operation-console">
    <TopStatusBar :current-pond="consoleStore.currentPond" />

    <section class="console-body">
      <LeftOverviewPanel
        :ponds="consoleStore.ponds"
        :selected-pond-id="consoleStore.selectedPondId"
        :current-pond="consoleStore.currentPond"
        :alert-overview="consoleStore.alertOverview"
        :mini-status="consoleStore.miniStatus"
        :monitor-feeds="consoleStore.monitorFeeds"
        @select-pond="consoleStore.selectPond"
      />

      <DigitalTwinWorkspace :pond="consoleStore.currentPond" />

      <RightDetailPanel :pond="consoleStore.currentPond" />
    </section>

    <BottomAnalyticsPanel :charts="consoleStore.charts" />
  </main>
</template>

<style scoped>
.operation-console {
  height: 100vh;
  min-width: 0;
  display: grid;
  grid-template-rows: 54px minmax(0, 1fr) 210px;
  gap: 8px;
  padding: 0 10px 10px;
  overflow: hidden;
  color: #d9f3ff;
  background:
    radial-gradient(circle at 50% 40%, rgba(20, 100, 130, 0.24), transparent 38%),
    linear-gradient(rgba(78, 165, 206, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(78, 165, 206, 0.045) 1px, transparent 1px), #030d1b;
  background-size:
    auto,
    44px 44px,
    42px 42px,
    auto;
}

.console-body {
  min-height: 0;
  display: grid;
  grid-template-columns: 310px minmax(0, 1fr) 300px;
  gap: 8px;
}
</style>
