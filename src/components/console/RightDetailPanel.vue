<script setup lang="ts">
import { computed } from 'vue'

import type { MetricLevel, RiskLevel, ShrimpPond } from '@/types/operationConsole'

const props = defineProps<{
  pond: ShrimpPond
}>()

const estimatedCountText = computed(() => {
  return `${(props.pond.shrimp.estimatedCount / 10000).toFixed(0)} 万尾`
})

const productionText = computed(() => {
  return `${props.pond.shrimp.productionTon.toFixed(1)} 吨`
})

const waterReadings = computed(() => props.pond.waterQuality.slice(0, 4))

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
  <aside class="right-detail-panel">
    <section class="device-section">
      <div class="section-title">
        <span>设备运行面板</span>
        <strong :class="levelClass(pond.risk.level)">{{ pond.risk.level }}风险</strong>
      </div>

      <div class="device-scene">
        <div class="wire-box">
          <span class="wire-column"></span>
          <span class="wire-left"></span>
          <span class="wire-right"></span>
          <i></i>
        </div>
        <strong>设备运行良好</strong>
        <p>投喂与增氧联动正常</p>
      </div>
    </section>

    <section class="property-section">
      <div class="section-title">
        <span>实时读数</span>
        <strong>{{ pond.model.updatedAt }}</strong>
      </div>

      <div class="reading-list">
        <div v-for="metric in waterReadings" :key="metric.key" class="reading-row">
          <span class="reading-ring" :class="levelClass(metric.level)"></span>
          <div>
            <strong>{{ metric.value }}</strong>
            <span>{{ metric.label }}</span>
          </div>
          <em :class="levelClass(metric.level)">{{ metric.trend }}</em>
        </div>
      </div>
    </section>

    <section class="property-section shrimp-summary">
      <div class="section-title">
        <span>规格与产量</span>
        <strong>{{ pond.area }}</strong>
      </div>

      <div class="summary-grid">
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
          <span>成活率</span>
          <strong>{{ pond.shrimp.survivalRate }}%</strong>
        </div>
      </div>
    </section>

    <section class="property-section maturity-section">
      <div class="section-title">
        <span>养殖成熟度</span>
        <strong>{{ pond.shrimp.growthStage }}</strong>
      </div>
      <div class="maturity-line">
        <span>{{ pond.shrimp.maturity }}%</span>
        <div class="maturity-track">
          <i :style="{ width: `${pond.shrimp.maturity}%` }"></i>
        </div>
      </div>
    </section>

    <section class="property-section strategy-section">
      <div class="section-title">
        <span>当前策略</span>
        <strong>{{ pond.strategy.frequency }}</strong>
      </div>
      <div class="strategy-name">{{ pond.strategy.name }}</div>
      <div class="property-row">
        <span>推荐投喂时间</span>
        <strong>{{ pond.strategy.feedingTime }}</strong>
      </div>
      <div class="property-row">
        <span>推荐投喂量</span>
        <strong>{{ pond.strategy.recommendationFeedKg }} 千克</strong>
      </div>
      <div class="property-row">
        <span>推荐方式</span>
        <strong>{{ pond.strategy.feedingMethod }}</strong>
      </div>
    </section>

    <section class="property-section model-section">
      <div class="section-title">
        <span>模型状态</span>
        <strong>{{ pond.model.confidence }}%</strong>
      </div>
      <p>{{ pond.model.result }}</p>
      <div class="risk-list">
        <span v-for="item in pond.risk.items" :key="item">{{ item }}</span>
      </div>
    </section>
  </aside>
</template>

<style scoped>
.right-detail-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: none;
}

.right-detail-panel::-webkit-scrollbar {
  display: none;
}

.device-section,
.property-section {
  position: relative;
  flex-shrink: 0;
  padding: 10px;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(13, 45, 74, 0.82), rgba(4, 18, 34, 0.86)), rgba(5, 20, 36, 0.86);
  border: 1px solid rgba(91, 184, 226, 0.18);
  box-shadow: 0 0 22px rgba(0, 0, 0, 0.15) inset;
}

.device-section::before,
.property-section::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 18px;
  height: 18px;
  border-top: 1px solid rgba(105, 216, 255, 0.75);
  border-left: 1px solid rgba(105, 216, 255, 0.75);
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 9px;
  color: #e1f7ff;
  font-size: 13px;
  font-weight: 700;
}

.section-title span {
  position: relative;
  padding-left: 10px;
}

.section-title span::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  width: 3px;
  height: 11px;
  background: #54d6ff;
  box-shadow: 0 0 10px rgba(84, 214, 255, 0.8);
}

.section-title strong {
  min-width: 0;
  overflow: hidden;
  color: #73d8ff;
  font-size: 12px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-section {
  flex: 0 0 154px;
}

.device-scene {
  height: 108px;
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  grid-template-rows: 1fr auto;
  column-gap: 12px;
  align-items: center;
}

.wire-box {
  position: relative;
  width: 108px;
  height: 78px;
  justify-self: center;
  background: radial-gradient(circle, rgba(84, 214, 255, 0.14), transparent 64%);
}

.wire-column {
  position: absolute;
  left: 42px;
  top: 8px;
  width: 28px;
  height: 50px;
  border: 1px solid rgba(218, 252, 255, 0.78);
  transform: skewY(-8deg);
  box-shadow: 0 0 14px rgba(84, 214, 255, 0.2);
}

.wire-left,
.wire-right {
  position: absolute;
  bottom: 16px;
  width: 44px;
  height: 24px;
  border: 1px solid rgba(218, 252, 255, 0.7);
  border-radius: 50%;
}

.wire-left {
  left: 6px;
  transform: rotate(18deg);
}

.wire-right {
  right: 6px;
  transform: rotate(-18deg);
}

.wire-box i {
  position: absolute;
  left: 20px;
  right: 20px;
  bottom: 4px;
  height: 1px;
  background: rgba(218, 252, 255, 0.42);
}

.device-scene > strong {
  color: #f5feff;
  font-size: 17px;
  font-weight: 800;
}

.device-scene p {
  grid-column: 2;
  margin: -18px 0 0;
  color: #8fb3c5;
  font-size: 12px;
}

.reading-list {
  display: grid;
  gap: 7px;
}

.reading-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 48px;
  align-items: center;
  min-height: 30px;
  gap: 8px;
}

.reading-ring {
  width: 22px;
  height: 22px;
  border: 2px solid currentcolor;
  border-radius: 50%;
  box-shadow: 0 0 12px rgba(84, 214, 255, 0.24);
}

.reading-row strong {
  display: block;
  overflow: hidden;
  color: #f0fbff;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reading-row span:last-child {
  display: block;
  margin-top: 2px;
  color: #7fa9bd;
  font-size: 11px;
}

.reading-row em {
  font-size: 11px;
  font-style: normal;
  text-align: right;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.summary-grid div {
  min-height: 42px;
  padding: 7px;
  background: rgba(3, 15, 28, 0.62);
  border: 1px solid rgba(111, 206, 255, 0.1);
}

.summary-grid span,
.property-row span {
  display: block;
  margin-bottom: 5px;
  color: #8fb3c5;
  font-size: 11px;
}

.summary-grid strong,
.property-row strong {
  display: block;
  min-width: 0;
  overflow: hidden;
  color: #e8fbff;
  font-size: 12px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.maturity-line {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}

.maturity-line span {
  color: #b894ff;
  font-size: 20px;
  font-weight: 800;
}

.maturity-track {
  height: 8px;
  overflow: hidden;
  background: rgba(6, 20, 36, 0.9);
  border-radius: 999px;
}

.maturity-track i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #54d6ff, #b894ff);
  border-radius: inherit;
}

.strategy-name {
  margin-bottom: 8px;
  color: #73e0b2;
  font-size: 15px;
  font-weight: 800;
}

.property-row {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr);
  align-items: center;
  min-height: 24px;
  gap: 8px;
}

.property-row span {
  margin-bottom: 0;
}

.property-row strong {
  text-align: right;
}

.model-section p {
  margin: 0 0 8px;
  color: #d9f3ff;
  font-size: 12px;
  line-height: 1.5;
}

.risk-list {
  display: grid;
  gap: 5px;
}

.risk-list span:nth-child(n + 3) {
  display: none;
}

.risk-list span {
  position: relative;
  padding-left: 11px;
  color: #9ec5d5;
  font-size: 11px;
}

.risk-list span::before {
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
