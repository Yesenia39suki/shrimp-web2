<script setup lang="ts">
import { computed, ref } from 'vue'

import type { MetricSource } from '@/stores/shrimpSystem'
import { useShrimpSystemStore } from '@/stores/shrimpSystem'

const store = useShrimpSystemStore()
const activeFilter = ref<'全部' | MetricSource>('全部')

const filterOptions: Array<'全部' | MetricSource> = ['全部', '水质参数', '虾群参数', '机器人状态', '模型评估']

const filteredAlerts = computed(() => {
  if (activeFilter.value === '全部') {
    return store.allAlerts
  }

  return store.allAlerts.filter((alert) => alert.source === activeFilter.value)
})

function sourceLabel(source: '全部' | MetricSource) {
  if (source === '水质参数') return '水质'
  if (source === '虾群参数') return '虾群'
  if (source === '机器人状态') return '机器人'
  if (source === '模型评估') return '模型'
  return '全部'
}
</script>

<template>
  <section class="notification-panel">
    <div class="panel-head">
      <div>
        <span>告警中心</span>
        <strong>异常消息</strong>
      </div>
      <span class="count-badge">{{ store.activeAlertCount }} 条</span>
    </div>

    <div class="filter-tabs">
      <button
        v-for="option in filterOptions"
        :key="option"
        type="button"
        :class="{ active: activeFilter === option }"
        @click="activeFilter = option"
      >
        {{ sourceLabel(option) }}
      </button>
    </div>

    <div v-if="filteredAlerts.length === 0" class="empty-message">当前没有异常消息</div>

    <div v-else class="message-list">
      <article
        v-for="alert in filteredAlerts"
        :key="alert.id"
        class="message-item"
        :class="{ danger: alert.level === '预警' }"
      >
        <div class="message-title">
          <strong>{{ alert.type }}</strong>
          <em>{{ alert.level }}</em>
        </div>
        <dl>
          <div>
            <dt>异常时间</dt>
            <dd>{{ alert.time }}</dd>
          </div>
          <div>
            <dt>异常来源</dt>
            <dd>{{ alert.source }}</dd>
          </div>
          <div>
            <dt>异常原因</dt>
            <dd>{{ alert.reason }}</dd>
          </div>
          <div>
            <dt>当前值</dt>
            <dd>{{ alert.currentValue }}</dd>
          </div>
          <div>
            <dt>正常范围</dt>
            <dd>{{ alert.normalRange }}</dd>
          </div>
          <div>
            <dt>处理建议</dt>
            <dd>{{ alert.suggestion }}</dd>
          </div>
        </dl>
      </article>
    </div>
  </section>
</template>

<style scoped>
.notification-panel {
  position: absolute;
  top: 44px;
  right: 0;
  width: 540px;
  max-height: 560px;
  overflow: hidden;
  color: var(--text-normal);
  background:
    linear-gradient(180deg, rgba(34, 100, 228, 0.1), rgba(14, 48, 126, 0.06)),
    rgba(10, 36, 94, 0.12);
  border: 1px solid rgba(121, 210, 255, 0.18);
  box-shadow:
    0 20px 44px rgba(8, 24, 65, 0.26),
    0 0 24px rgba(74, 169, 255, 0.08);
  backdrop-filter: blur(10px);
}

.notification-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(120deg, transparent 0 48%, rgba(121, 210, 255, 0.04) 49%, transparent 52%),
    linear-gradient(90deg, rgba(121, 210, 255, 0.03) 1px, transparent 1px),
    linear-gradient(rgba(121, 210, 255, 0.025) 1px, transparent 1px);
  background-size:
    100% 100%,
    26px 26px,
    26px 26px;
}

.panel-head {
  position: relative;
  z-index: 1;
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  background: rgba(12, 40, 104, 0.18);
  border-bottom: 1px solid rgba(121, 210, 255, 0.1);
}

.panel-head div > span {
  color: var(--cyan);
  font-size: 11px;
}

.panel-head strong {
  display: block;
  margin-top: 3px;
  color: var(--text-main);
  font-size: 15px;
}

.count-badge {
  padding: 4px 8px;
  color: #d7f1ff;
  font-size: 13px;
  background: rgba(74, 169, 255, 0.12);
  border: 1px solid rgba(121, 210, 255, 0.2);
}

.filter-tabs {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
  padding: 10px;
  background: rgba(12, 40, 104, 0.12);
  border-bottom: 1px solid rgba(121, 210, 255, 0.08);
}

.filter-tabs button {
  height: 28px;
  color: var(--text-muted);
  font-size: 12px;
  background: rgba(16, 54, 138, 0.16);
  border: 1px solid rgba(121, 210, 255, 0.12);
  border-radius: 999px;
}

.filter-tabs button.active,
.filter-tabs button:hover {
  color: var(--text-main);
  background: rgba(74, 169, 255, 0.16);
  border-color: rgba(121, 210, 255, 0.24);
}

.empty-message {
  position: relative;
  z-index: 1;
  padding: 26px 14px;
  color: var(--text-muted);
  font-size: 13px;
  text-align: center;
}

.message-list {
  position: relative;
  z-index: 1;
  max-height: 456px;
  overflow-y: auto;
  padding: 10px;
}

.message-item {
  position: relative;
  margin-bottom: 8px;
  padding: 10px;
  background: rgba(16, 54, 138, 0.1);
  border: 1px solid rgba(121, 210, 255, 0.1);
}

.message-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 10px;
  bottom: 10px;
  width: 3px;
  background: rgba(255, 191, 107, 0.82);
}

.message-item.danger {
  border-color: rgba(255, 111, 125, 0.18);
}

.message-item.danger::before {
  background: rgba(255, 111, 125, 0.88);
}

.message-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  padding-left: 10px;
}

.message-title strong {
  color: var(--text-main);
  font-size: 13px;
  line-height: 1.45;
  word-break: break-all;
}

.message-title em {
  padding: 2px 7px;
  color: var(--warning);
  font-size: 12px;
  font-style: normal;
  background: rgba(255, 191, 107, 0.08);
  border: 1px solid rgba(255, 191, 107, 0.14);
}

.danger .message-title em {
  color: var(--danger);
  background: rgba(255, 111, 125, 0.08);
  border-color: rgba(255, 111, 125, 0.14);
}

dl {
  display: grid;
  gap: 5px;
  margin: 0;
  padding-left: 10px;
}

dl div {
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr);
  gap: 8px;
}

dt {
  color: var(--text-muted);
  font-size: 12px;
}

dd {
  min-width: 0;
  margin: 0;
  color: var(--text-normal);
  font-size: 12px;
  line-height: 1.45;
  word-break: break-all;
}
</style>
