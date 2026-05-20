<script setup lang="ts">
import { ref } from 'vue'

import NotificationPanel from '@/components/system/NotificationPanel.vue'
import { useShrimpSystemStore } from '@/stores/shrimpSystem'

const store = useShrimpSystemStore()
const panelVisible = ref(false)
</script>

<template>
  <div class="notification-bell">
    <button type="button" class="bell-button" @click="panelVisible = !panelVisible">
      <span class="bell-shape"></span>
      <i v-if="store.hasActiveAlert"></i>
      <strong v-if="store.hasActiveAlert">{{ store.activeAlertCount }}</strong>
    </button>
    <NotificationPanel v-if="panelVisible" />
  </div>
</template>

<style scoped>
.notification-bell {
  position: relative;
}

.bell-button {
  position: relative;
  width: 42px;
  height: 36px;
  display: grid;
  place-items: center;
  color: var(--text-normal);
  background:
    radial-gradient(circle at 50% 0, rgba(121, 210, 255, 0.14), transparent 65%),
    linear-gradient(180deg, rgba(34, 100, 228, 0.12), rgba(14, 48, 126, 0.1)),
    rgba(10, 36, 94, 0.18);
  border: 1px solid rgba(121, 210, 255, 0.18);
  border-radius: 12px;
  box-shadow: 0 0 14px rgba(8, 24, 65, 0.18) inset;
  cursor: pointer;
  clip-path: polygon(
    10px 0,
    100% 0,
    100% calc(100% - 10px),
    calc(100% - 10px) 100%,
    0 100%,
    0 10px
  );
}

.bell-button::before {
  content: '';
  position: absolute;
  inset: 6px;
  border: 1px solid rgba(121, 210, 255, 0.1);
  border-radius: 9px;
  opacity: 0.75;
}

.bell-button:hover {
  border-color: rgba(121, 210, 255, 0.28);
  box-shadow:
    0 0 16px rgba(74, 169, 255, 0.12),
    0 0 14px rgba(8, 24, 65, 0.18) inset;
}

.bell-shape {
  position: relative;
  width: 15px;
  height: 15px;
  border: 2px solid #cbeaff;
  border-bottom: 0;
  border-radius: 9px 9px 3px 3px;
}

.bell-shape::before {
  content: '';
  position: absolute;
  left: 2px;
  right: 2px;
  bottom: -6px;
  height: 2px;
  background: #cbeaff;
}

.bell-shape::after {
  content: '';
  position: absolute;
  left: 5px;
  bottom: -10px;
  width: 4px;
  height: 4px;
  background: #cbeaff;
  border-radius: 50%;
}

.bell-button i {
  position: absolute;
  top: 6px;
  right: 8px;
  width: 8px;
  height: 8px;
  background: var(--danger);
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(255, 111, 125, 0.7);
}

.bell-button i::after {
  content: '';
  position: absolute;
  inset: -5px;
  border: 1px solid rgba(255, 111, 125, 0.32);
  border-radius: 50%;
}

.bell-button strong {
  position: absolute;
  top: -8px;
  right: -8px;
  min-width: 19px;
  height: 19px;
  display: grid;
  place-items: center;
  padding: 0 5px;
  color: #fff;
  font-size: 11px;
  line-height: 1;
  background: var(--danger);
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(255, 111, 125, 0.3);
}
</style>
