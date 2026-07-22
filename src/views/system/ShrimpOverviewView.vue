<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import MetricCard from '@/components/system/MetricCard.vue'
import { useShrimpSystemStore } from '@/stores/shrimpSystem'

const router = useRouter()
const store = useShrimpSystemStore()
const currentSpecies = computed(
  () => store.selectedPondProfile?.species ?? store.shrimpConfig.species,
)
const pondRows = computed(() =>
  store.pondProfiles.map((profile) => {
    const weightMetric = profile.shrimpMetrics.find((metric) => metric.key === 'weight')
    const maturityMetric = profile.shrimpMetrics.find((metric) => metric.key === 'maturity')
    const weight = Number(weightMetric?.value)
    const maturity = Number(maturityMetric?.value)

    return {
      pondId: profile.pondId,
      species: profile.species,
      weight: Number.isFinite(weight) ? weight : 0,
      maturity: Number.isFinite(maturity) ? maturity : 0,
      active: profile.pondId === store.pondConfig.selectedPondId,
    }
  }),
)

function getAlert(metricKey: string) {
  return store.allAlerts.find((alert) => alert.metricKey === metricKey)
}

function openMetric(metricKey: string) {
  router.push(`/system/shrimp/${metricKey}`)
}

function handlePondChange(event: Event) {
  store.selectPond((event.target as HTMLSelectElement).value)
}
</script>

<template>
  <section class="system-page">
    <div class="page-head">
      <div class="head-copy">
        <span>虾群参数监测子系统</span>
        <div class="headline-row">
          <h1>虾群总览</h1>
          <p>虾种 {{ currentSpecies }}，模型评估参与告警判断</p>
        </div>
      </div>
      <div class="head-actions">
        <label class="pond-switch">
          <span>当前虾池</span>
          <select :value="store.pondConfig.selectedPondId" @change="handlePondChange">
            <option v-for="pondId in store.pondConfig.pondIds" :key="pondId" :value="pondId">
              {{ pondId }}
            </option>
          </select>
        </label>
        <strong
          >{{ currentSpecies }} /
          {{ store.shrimpAlerts.length + store.modelAlerts.length }} 条异常</strong
        >
      </div>
    </div>

    <section class="pond-strip">
      <article v-for="row in pondRows" :key="row.pondId" :class="{ active: row.active }">
        <div>
          <span>{{ row.pondId }}</span>
          <strong>{{ row.species }}</strong>
        </div>
        <p>重量 {{ row.weight }}克 / 成熟度 {{ row.maturity }}%</p>
      </article>
    </section>

    <div class="metric-grid">
      <MetricCard
        v-for="metric in store.shrimpMetrics"
        :key="metric.key"
        :metric="metric"
        :threshold="store.thresholds.shrimp[metric.key]"
        :alert="getAlert(metric.key)"
        @open="openMetric"
      />
    </div>
  </section>
</template>

<style scoped>
.system-page {
  height: 100%;
  display: grid;
  grid-template-rows: 74px 86px minmax(0, 1fr);
  gap: 12px;
  overflow: hidden;
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 18px;
  background:
    linear-gradient(180deg, rgba(34, 100, 228, 0.12), rgba(14, 48, 126, 0.08)),
    rgba(10, 36, 94, 0.18);
  border: 1px solid rgba(121, 210, 255, 0.16);
  box-shadow: 0 14px 30px rgba(8, 24, 65, 0.18);
}

.head-copy {
  min-width: 0;
}

.page-head span {
  color: var(--cyan);
  font-size: 13px;
}

.headline-row {
  min-width: 0;
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin-top: 6px;
}

.page-head h1 {
  flex: 0 0 auto;
  margin: 0;
  color: var(--text-main);
  font-size: 24px;
  line-height: 1.08;
}

.page-head p {
  min-width: 0;
  margin: 0 0 2px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.head-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.pond-switch {
  height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  background: rgba(16, 54, 138, 0.18);
  border: 1px solid rgba(121, 210, 255, 0.14);
}

.pond-switch span {
  color: var(--text-muted);
  font-size: 12px;
}

.pond-switch select {
  min-width: 88px;
  height: 24px;
  color: var(--text-main);
  background: rgba(8, 30, 78, 0.78);
  border: 1px solid rgba(121, 210, 255, 0.14);
  outline: none;
}

.page-head strong {
  height: 36px;
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  color: var(--warning);
  font-size: 14px;
  background: rgba(255, 191, 107, 0.08);
  border: 1px solid rgba(255, 191, 107, 0.18);
}

.metric-grid {
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  overflow: auto;
  padding: 1px 2px 2px 1px;
}

.pond-strip {
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.pond-strip article {
  padding: 12px;
  background:
    linear-gradient(180deg, rgba(34, 100, 228, 0.1), rgba(14, 48, 126, 0.06)),
    rgba(10, 36, 94, 0.12);
  border: 1px solid rgba(121, 210, 255, 0.12);
  box-shadow: 0 10px 24px rgba(8, 24, 65, 0.12);
}

.pond-strip article.active {
  border-color: rgba(121, 210, 255, 0.28);
  box-shadow: 0 0 14px rgba(74, 169, 255, 0.12);
}

.pond-strip span {
  display: block;
  color: var(--text-muted);
  font-size: 12px;
}

.pond-strip strong {
  display: block;
  margin-top: 4px;
  color: var(--text-main);
  font-size: 13px;
}

.pond-strip p {
  margin: 7px 0 0;
  color: var(--text-normal);
  font-size: 12px;
  line-height: 1.45;
  word-break: break-all;
}
</style>
