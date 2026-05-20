<script setup lang="ts">
import type { RiskLevel, ShrimpPond } from '@/types/operationConsole'

const props = defineProps<{
  pond: ShrimpPond
}>()

function riskClass(level: RiskLevel) {
  if (level === '高') {
    return 'is-warning'
  }

  if (level === '中') {
    return 'is-attention'
  }

  return 'is-normal'
}

function formatCount(value: number) {
  return `${(value / 10000).toFixed(0)}万尾`
}
</script>

<template>
  <aside class="v6-inspector">
    <section class="inspector-module current-object">
      <div class="module-title">
        <span>当前池详情</span>
        <em>对象属性</em>
      </div>
      <div class="object-head">
        <div>
          <span>池名</span>
          <strong>{{ props.pond.name }}</strong>
        </div>
        <b :class="riskClass(props.pond.risk.level)">{{ props.pond.risk.level }}风险</b>
      </div>
      <div class="property-line">
        <span>当前阶段</span>
        <strong>{{ props.pond.shrimp.growthStage }}</strong>
      </div>
      <div class="property-line">
        <span>运行状态</span>
        <strong>{{ props.pond.status }}</strong>
      </div>
    </section>

    <section class="inspector-module production-module">
      <div class="module-title">
        <span>规格与产量</span>
        <em>生产参数</em>
      </div>
      <div class="property-grid">
        <div>
          <span>池体面积</span>
          <strong>{{ props.pond.area }}</strong>
        </div>
        <div>
          <span>养殖时间</span>
          <strong>{{ props.pond.shrimp.farmingDays }}天</strong>
        </div>
        <div>
          <span>实测重量</span>
          <strong>{{ props.pond.shrimp.averageWeightG }}克</strong>
        </div>
        <div>
          <span>估测数量</span>
          <strong>{{ formatCount(props.pond.shrimp.estimatedCount) }}</strong>
        </div>
        <div>
          <span>当前产量</span>
          <strong>{{ props.pond.shrimp.productionTon }}吨</strong>
        </div>
        <div>
          <span>成活率</span>
          <strong>{{ props.pond.shrimp.survivalRate }}%</strong>
        </div>
      </div>
    </section>

    <section class="inspector-module strategy-module">
      <div class="module-title">
        <span>当前策略</span>
        <em>投喂决策</em>
      </div>
      <div class="strategy-highlight">
        <span>推荐投喂量</span>
        <strong>{{ props.pond.strategy.recommendationFeedKg }}<small>千克</small></strong>
      </div>
      <div class="property-line">
        <span>推荐时间</span>
        <strong>{{ props.pond.strategy.feedingTime }}</strong>
      </div>
      <div class="property-line">
        <span>推荐方式</span>
        <strong>{{ props.pond.strategy.feedingMethod }}</strong>
      </div>
      <div class="property-line">
        <span>投喂频次</span>
        <strong>{{ props.pond.strategy.frequency }}</strong>
      </div>
    </section>

    <section class="inspector-module model-module">
      <div class="module-title">
        <span>模型状态</span>
        <em>结论与风险</em>
      </div>
      <div class="model-state">
        <span>{{ props.pond.model.status }}</span>
        <strong>{{ props.pond.model.confidence }}%</strong>
      </div>
      <div class="confidence-track">
        <i :style="{ width: `${props.pond.model.confidence}%` }"></i>
      </div>
      <div class="model-result">
        <span>模型结论</span>
        <p>{{ props.pond.model.result }}</p>
      </div>
      <div class="model-result">
        <span>风险说明</span>
        <p>{{ props.pond.risk.summary }}</p>
      </div>
    </section>
  </aside>
</template>

<style scoped>
.v6-inspector {
  min-height: 0;
  display: grid;
  grid-template-rows: 132px 180px 178px minmax(0, 1fr);
  gap: 10px;
  overflow: hidden;
}

.inspector-module {
  min-height: 0;
  padding: 10px;
  overflow: hidden;
  background: rgba(5, 22, 39, 0.9);
  border: 1px solid rgba(91, 184, 226, 0.18);
}

.module-title {
  height: 27px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 9px;
  border-bottom: 1px solid rgba(91, 184, 226, 0.13);
}

.module-title span {
  color: #e1f7ff;
  font-size: 13px;
  font-weight: 700;
}

.module-title em {
  color: #69d8ff;
  font-size: 11px;
  font-style: normal;
}

.object-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 76px;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.object-head span,
.property-line span,
.property-grid span,
.strategy-highlight span,
.model-result span,
.model-state span {
  display: block;
  color: #86b0c1;
  font-size: 11px;
}

.object-head strong {
  display: block;
  margin-top: 5px;
  overflow: hidden;
  color: #f4fcff;
  font-size: 17px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.object-head b {
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  background: rgba(3, 16, 30, 0.7);
  border: 1px solid rgba(91, 184, 226, 0.16);
}

.property-line {
  min-height: 27px;
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: center;
  border-top: 1px solid rgba(91, 184, 226, 0.08);
}

.property-line strong {
  min-width: 0;
  overflow: hidden;
  color: #e8fbff;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.property-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.property-grid div {
  min-width: 0;
  padding: 8px;
  background: rgba(3, 16, 30, 0.58);
  border: 1px solid rgba(91, 184, 226, 0.1);
}

.property-grid strong {
  display: block;
  margin-top: 6px;
  overflow: hidden;
  color: #f1fbff;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.strategy-highlight {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 10px;
  margin-bottom: 8px;
  padding: 10px;
  background: linear-gradient(90deg, rgba(21, 96, 132, 0.64), rgba(3, 16, 30, 0.72));
  border: 1px solid rgba(84, 214, 255, 0.3);
}

.strategy-highlight strong {
  color: #ffffff;
  font-size: 26px;
  line-height: 1;
}

.strategy-highlight small {
  margin-left: 3px;
  color: #a8d8e8;
  font-size: 12px;
}

.model-state {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.model-state strong {
  color: #69e2a4;
  font-size: 22px;
}

.confidence-track {
  height: 7px;
  margin: 8px 0 10px;
  background: rgba(3, 16, 30, 0.82);
  border: 1px solid rgba(91, 184, 226, 0.14);
}

.confidence-track i {
  height: 100%;
  display: block;
  background: linear-gradient(90deg, #54d6ff, #69e2a4);
}

.model-result {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(91, 184, 226, 0.08);
}

.model-result p {
  margin: 5px 0 0;
  color: #e8fbff;
  font-size: 12px;
  line-height: 1.55;
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
