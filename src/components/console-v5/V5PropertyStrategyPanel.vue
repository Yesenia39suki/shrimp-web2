<script setup lang="ts">
import type { MetricLevel, RiskLevel, ShrimpPond } from '@/types/operationConsole'

defineProps<{
  pond: ShrimpPond
}>()

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
  <aside class="v5-property-panel">
    <section class="object-section">
      <div>
        <span>当前池详情</span>
        <strong>{{ pond.name }}</strong>
        <p>{{ pond.shrimp.growthStage }}</p>
      </div>
      <em :class="levelClass(pond.risk.level)">{{ pond.risk.level }}风险</em>
    </section>

    <section class="property-section production-section">
      <div class="section-title">
        <span>规格与产量</span>
        <strong>{{ pond.area }}</strong>
      </div>
      <div class="property-grid">
        <div>
          <span>池体面积</span>
          <strong>{{ pond.area }}</strong>
        </div>
        <div>
          <span>养殖时间</span>
          <strong>{{ pond.shrimp.farmingDays }} 天</strong>
        </div>
        <div>
          <span>实测重量</span>
          <strong>{{ pond.shrimp.averageWeightG }} 克</strong>
        </div>
        <div>
          <span>估测数量</span>
          <strong>{{ (pond.shrimp.estimatedCount / 10000).toFixed(0) }} 万尾</strong>
        </div>
        <div>
          <span>当前产量</span>
          <strong>{{ pond.shrimp.productionTon }} 吨</strong>
        </div>
        <div>
          <span>成活率</span>
          <strong>{{ pond.shrimp.survivalRate }}%</strong>
        </div>
      </div>
    </section>

    <section class="property-section strategy-section">
      <div class="section-title">
        <span>当前策略</span>
        <strong>{{ pond.strategy.frequency }}</strong>
      </div>
      <div class="strategy-name">{{ pond.strategy.name }}</div>
      <div class="row-item">
        <span>推荐投喂时间</span>
        <strong>{{ pond.strategy.feedingTime }}</strong>
      </div>
      <div class="row-item">
        <span>推荐投喂量</span>
        <strong>{{ pond.strategy.recommendationFeedKg }} 千克</strong>
      </div>
      <div class="row-item">
        <span>推荐方式</span>
        <strong>{{ pond.strategy.feedingMethod }}</strong>
      </div>
    </section>

    <section class="property-section model-section">
      <div class="section-title">
        <span>模型状态</span>
        <strong>{{ pond.model.confidence }}%</strong>
      </div>
      <div class="model-result">{{ pond.model.result }}</div>
      <div class="row-item">
        <span>模型结论</span>
        <strong>{{ pond.model.status }}</strong>
      </div>
      <div class="row-item">
        <span>风险摘要</span>
        <strong>{{ pond.risk.summary }}</strong>
      </div>
      <div class="reason-list">
        <span v-for="item in pond.risk.items" :key="item">{{ item }}</span>
      </div>
    </section>
  </aside>
</template>

<style scoped>
.v5-property-panel {
  min-height: 0;
  display: grid;
  grid-template-rows: 68px 126px 104px minmax(0, 1fr);
  gap: 10px;
  overflow: hidden;
}

.object-section,
.property-section {
  min-height: 0;
  padding: 8px 10px;
  overflow: hidden;
  background: rgba(5, 22, 39, 0.9);
  border: 1px solid rgba(91, 184, 226, 0.18);
}

.object-section {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: start;
}

.object-section span {
  color: #8fb3c5;
  font-size: 12px;
}

.object-section strong {
  display: block;
  margin-top: 4px;
  color: #f5feff;
  font-size: 16px;
}

.object-section p {
  margin: 4px 0 0;
  color: #7fa9bd;
  font-size: 12px;
}

.object-section em {
  padding: 5px 8px;
  font-size: 12px;
  font-style: normal;
  border: 1px solid currentcolor;
}

.section-title {
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 7px;
  border-bottom: 1px solid rgba(91, 184, 226, 0.13);
}

.section-title span {
  color: #e1f7ff;
  font-size: 13px;
  font-weight: 700;
}

.section-title strong {
  color: #69d8ff;
  font-size: 12px;
}

.property-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
}

.property-grid div {
  min-width: 0;
  padding: 3px 6px;
  background: rgba(3, 16, 30, 0.58);
  border: 1px solid rgba(91, 184, 226, 0.1);
}

.property-grid span,
.row-item span {
  display: block;
  margin-bottom: 2px;
  color: #8fb3c5;
  font-size: 11px;
}

.property-grid strong,
.row-item strong {
  display: block;
  overflow: hidden;
  color: #e8fbff;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.strategy-section {
  border-color: rgba(84, 214, 255, 0.28);
}

.strategy-name {
  margin-bottom: 4px;
  color: #73e0b2;
  font-size: 14px;
  font-weight: 800;
}

.row-item {
  min-height: 19px;
  display: grid;
  grid-template-columns: 94px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}

.row-item span {
  margin-bottom: 0;
}

.model-result {
  margin-bottom: 6px;
  color: #e8fbff;
  font-size: 12px;
  line-height: 1.5;
}

.reason-list {
  display: grid;
  gap: 4px;
  margin-top: 6px;
}

.reason-list span {
  position: relative;
  padding-left: 11px;
  color: #9ec5d5;
  font-size: 11px;
}

.reason-list span::before {
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
