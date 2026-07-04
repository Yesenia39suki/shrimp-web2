<script setup lang="ts">
import { watch } from 'vue'
import { RouterView } from 'vue-router'

import QingdaoMapBackground from '@/components/system/QingdaoMapBackground.vue'
import SystemTopNav from '@/components/system/SystemTopNav.vue'
import { useAuthStore } from '@/stores/authStore'
import { useShrimpSystemStore } from '@/stores/shrimpSystem'

const authStore = useAuthStore()
const systemStore = useShrimpSystemStore()

watch(
  () => authStore.currentOrganization?.id,
  (organizationId) => {
    if (organizationId) {
      systemStore.loadOrganizationData(organizationId)
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
  </div>
</template>

<style scoped>
.system-shell-layout {
  position: relative;
  height: 100vh;
  min-width: 0;
  overflow: hidden;
  color: var(--text-normal);
  background:
    radial-gradient(ellipse at 58% 42%, rgba(121, 210, 255, 0.22), transparent 58%),
    radial-gradient(ellipse at 8% 12%, rgba(27, 93, 247, 0.18), transparent 32%),
    radial-gradient(ellipse at 82% 76%, rgba(74, 169, 255, 0.12), transparent 38%),
    linear-gradient(180deg, #1f56cb 0%, #173f9e 48%, #112d72 100%);
}

.system-shell-layout::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(91, 214, 255, 0.055) 1px, transparent 1px),
    linear-gradient(rgba(91, 214, 255, 0.045) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(circle at 50% 50%, black 0 62%, transparent 88%);
}

.system-shell-layout::after {
  content: '';
  position: absolute;
  inset: 70px 0 0;
  z-index: 1;
  pointer-events: none;
  background:
    linear-gradient(118deg, transparent 0 28%, rgba(121, 210, 255, 0.07) 29%, transparent 32% 100%),
    linear-gradient(145deg, transparent 0 64%, rgba(74, 169, 255, 0.05) 65%, transparent 68% 100%),
    linear-gradient(180deg, rgba(21, 63, 151, 0.01), rgba(21, 63, 151, 0.05)),
    radial-gradient(circle at 50% 48%, transparent 0 42%, rgba(15, 48, 118, 0.05) 82%);
}

.system-content {
  position: relative;
  z-index: 2;
  height: calc(100vh - 70px);
  padding: 14px;
  overflow: auto;
  overscroll-behavior: contain;
}

.system-content::before {
  content: '';
  position: absolute;
  left: 22px;
  right: 22px;
  top: 12px;
  height: 1px;
  pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(91, 214, 255, 0.28), transparent);
}
</style>
