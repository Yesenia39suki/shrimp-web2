import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { operationConsoleData } from '@/mock/operationConsole'
import type { ShrimpPond } from '@/types/operationConsole'

const defaultPond = operationConsoleData.ponds[0] as ShrimpPond

export const useOperationConsoleStore = defineStore('operationConsole', () => {
  const selectedPondId = ref(defaultPond.id)

  const ponds = operationConsoleData.ponds
  const alertOverview = operationConsoleData.alertOverview
  const miniStatus = operationConsoleData.miniStatus
  const monitorFeeds = operationConsoleData.monitorFeeds
  const charts = operationConsoleData.charts

  const currentPond = computed<ShrimpPond>(() => {
    return ponds.find((pond) => pond.id === selectedPondId.value) ?? defaultPond
  })

  function selectPond(pondId: string) {
    if (ponds.some((pond) => pond.id === pondId)) {
      selectedPondId.value = pondId
    }
  }

  return {
    selectedPondId,
    ponds,
    alertOverview,
    miniStatus,
    monitorFeeds,
    charts,
    currentPond,
    selectPond,
  }
})
