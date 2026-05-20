<script setup lang="ts">
import { computed } from 'vue'

import type { MetricLevel, RiskLevel, ShrimpPond } from '@/types/operationConsole'

const props = defineProps<{
  pond: ShrimpPond
}>()

const estimatedCountText = computed(
  () => `${(props.pond.shrimp.estimatedCount / 10000).toFixed(0)} 万尾`,
)
const productionText = computed(() => `${props.pond.shrimp.productionTon.toFixed(1)} 吨`)

function levelClass(level: RiskLevel | MetricLevel) {
  if (level === '高' || level === '预警') {
    return 'is-warning'
  }

  if (level === '中' || level === '关注') {
    return 'is-attention'
  }

  return 'is-normal'
}
</script>

<template>
  <aside class="v4-attribute-strategy-panel">
    <section class="object-card">
      <div class="object-main">
        <span>当前池详情</span>
        <strong>{{ pond.id }} · {{ pond.name }}</strong>
        <p>{{ pond.statusText }}</p>
      </div>
      <div class="object-status" :class="levelClass(pond.risk.level)">
        <i></i>
        <span>{{ pond.risk.level }}风险</span>
      </div>
    </section>

    <section class="panel-group compact">
      <div class="panel-head">
        <span>规格与产量</span>
        <strong>{{ pond.area }}</strong>
      </div>
      <div class="spec-grid">
        <div>
          <span>实测重量</span>
          <strong>{{ pond.shrimp.averageWeightG }} 克</strong>
        </div>
        <div>
          <span>估测数量</span>
          <strong>{{ estimatedCountText }}</strong>
        </div>
        <div>
          <span>对虾产量</span>
          <strong>{{ productionText }}</strong>
        </div>
        <div>
          <span>养殖天数</span>
          <strong>{{ pond.shrimp.farmingDays }} 天</strong>
        </div>
      </div>
    </section>

    <section class="panel-group shrimp-group">
      <div class="panel-head">
        <span>虾群参数</span>
        <strong>{{ pond.shrimp.growthStage }}</strong>
      </div>
      <div class="property-row">
        <span>实测长度</span>
        <strong>{{ pond.shrimp.averageLengthCm }} 厘米</strong>
      </div>
      <div class="property-row">
        <span>成活率</span>
        <strong>{{ pond.shrimp.survivalRate }}%</strong>
      </div>
      <div class="maturity-row">
        <span>成熟度</span>
        <strong>{{ pond.shrimp.maturity }}%</strong>
        <div>
          <i :style="{ width: `${pond.shrimp.maturity}%` }"></i>
        </div>
      </div>
    </section>

    <section class="panel-group important">
      <div class="panel-head">
        <span>当前策略</span>
        <strong>{{ pond.strategy.frequency }}</strong>
      </div>
      <div class="strategy-name">{{ pond.strategy.name }}</div>
      <div class="property-row">
        <span>投喂时间</span>
        <strong>{{ pond.strategy.feedingTime }}</strong>
      </div>
      <div class="property-row">
        <span>投喂量</span>
        <strong>{{ pond.strategy.recommendationFeedKg }} 千克</strong>
      </div>
      <div class="property-row">
        <span>投喂方式</span>
        <strong>{{ pond.strategy.feedingMethod }}</strong>
      </div>
    </section>

    <section class="panel-group important">
      <div class="panel-head">
        <span>模型状态</span>
        <strong>{{ pond.model.confidence }}%</strong>
      </div>
      <div class="model-result">{{ pond.model.result }}</div>
      <div class="property-row">
        <span>状态</span>
        <strong>{{ pond.model.status }}</strong>
      </div>
      <div class="property-row">
        <span>更新时间</span>
        <strong>{{ pond.model.updatedAt }}</strong>
      </div>
    </section>

    <section class="panel-group risk-group">
      <div class="panel-head">
        <span>风险摘要</span>
        <strong :class="levelClass(pond.risk.level)">{{ pond.risk.level }}风险</strong>
      </div>
      <p>{{ pond.risk.summary }}</p>
      <ul>
        <li v-for="item in pond.risk.items" :key="item">{{ item }}</li>
      </ul>
    </section>
  </aside>
</template>

<style scoped>
.v4-attribute-strategy-panel {
  min-height: 0;
  display: grid;
  grid-template-rows: 70px 86px 78px 112px 88px minmax(0, 1fr);
  gap: 8px;
  overflow: hidden;
}

.object-card,
.panel-group {
  min-height: 0;
  padding: 10px;
  overflow: hidden;
  background: rgba(5, 22, 39, 0.88);
  border: 1px solid rgba(91, 184, 226, 0.18);
}

.object-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 10px;
}

.object-main span,
.panel-head span {
  color: #9ec5d5;
  font-size: 12px;
}

.object-main strong {
  display: block;
  margin-top: 4px;
  overflow: hidden;
  color: #f5feff;
  font-size: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.object-main p {
  margin: 4px 0 0;
  overflow: hidden;
  color: #8fb3c5;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.object-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 7px;
  border: 1px solid currentcolor;
  font-size: 12px;
}

.object-status i {
  width: 7px;
  height: 7px;
  background: currentcolor;
  border-radius: 50%;
}

.panel-head {
  height: 23px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
  border-bottom: 1px solid rgba(91, 184, 226, 0.13);
}

.panel-head span {
  color: #e1f7ff;
  font-size: 13px;
  font-weight: 700;
}

.panel-head strong {
  overflow: hidden;
  color: #69d8ff;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.spec-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5px;
}

.spec-grid div {
  min-width: 0;
  padding: 4px 6px;
  background: rgba(3, 16, 30, 0.58);
  border: 1px solid rgba(91, 184, 226, 0.1);
}

.spec-grid span,
.property-row span,
.maturity-row span {
  display: block;
  margin-bottom: 3px;
  color: #8fb3c5;
  font-size: 11px;
}

.spec-grid strong,
.property-row strong,
.maturity-row strong {
  display: block;
  overflow: hidden;
  color: #e8fbff;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.property-row {
  min-height: 19px;
  display: grid;
  grid-template-columns: 68px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}

.property-row span {
  margin-bottom: 0;
}

.property-row strong {
  text-align: left;
}

.maturity-row {
  display: grid;
  grid-template-columns: 52px 44px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  margin-top: 5px;
}

.maturity-row span {
  margin-bottom: 0;
}

.maturity-row div {
  height: 8px;
  overflow: hidden;
  background: rgba(3, 16, 30, 0.8);
  border-radius: 999px;
}

.maturity-row i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #54d6ff, #b894ff);
}

.important {
  border-color: rgba(84, 214, 255, 0.28);
}

.strategy-name {
  margin-bottom: 6px;
  color: #73e0b2;
  font-size: 14px;
  font-weight: 800;
}

.model-result {
  margin-bottom: 6px;
  color: #e8fbff;
  font-size: 12px;
  line-height: 1.45;
}

.risk-group p {
  margin: 0 0 6px;
  color: #e8fbff;
  font-size: 11px;
  line-height: 1.45;
}

.risk-group ul {
  display: grid;
  gap: 5px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.risk-group li {
  position: relative;
  padding-left: 11px;
  color: #9ec5d5;
  font-size: 11px;
  line-height: 1.35;
}

.risk-group li:nth-child(n + 3) {
  display: none;
}

.risk-group li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  width: 4px;
  height: 4px;
  background: #ffd36e;
  border-radius: 50%;
}

.is-normal {
  color: #69e2a4;
}

.is-attention {
  color: #ffd36e;
}

.is-warning {
  color: #ff7c7c;
}
</style>
