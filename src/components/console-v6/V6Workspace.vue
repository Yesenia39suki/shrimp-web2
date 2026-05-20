<script setup lang="ts">
import { computed } from 'vue'

import { operationConsoleV6Mock } from '@/mock/operationConsoleV6'
import type { MetricLevel, ShrimpPond, TwinNode } from '@/types/operationConsole'

const props = defineProps<{
  pond: ShrimpPond
}>()

const nodeMap = computed(() => {
  return new Map(props.pond.twin.nodes.map((node) => [node.id, node]))
})

const sceneLinks = computed(() => {
  return props.pond.twin.links
    .map((link) => {
      const source = nodeMap.value.get(link.source)
      const target = nodeMap.value.get(link.target)

      if (!source || !target) {
        return undefined
      }

      return {
        ...link,
        source,
        target,
        labelX: (source.x + target.x) / 2,
        labelY: (source.y + target.y) / 2,
      }
    })
    .filter((link) => link !== undefined)
})

function levelClass(level: MetricLevel) {
  if (level === '预警') {
    return 'is-warning'
  }

  if (level === '关注') {
    return 'is-attention'
  }

  return 'is-normal'
}

function nodeClass(node: TwinNode) {
  return [levelClass(node.level), `node-${node.id}`]
}
</script>

<template>
  <section class="v6-workspace">
    <div class="workspace-context-strip">
      <div>
        <span>当前池</span>
        <strong>{{ pond.name }}</strong>
      </div>
      <div>
        <span>当前模式</span>
        <strong>投喂态势</strong>
      </div>
      <div>
        <span>当前风险</span>
        <strong
          :class="
            levelClass(
              pond.risk.level === '高' ? '预警' : pond.risk.level === '中' ? '关注' : '正常',
            )
          "
        >
          {{ pond.risk.level }}风险
        </strong>
      </div>
      <div>
        <span>当前策略</span>
        <strong>{{ pond.strategy.name }}</strong>
      </div>
    </div>

    <div class="workspace-tool-strip">
      <div class="view-tabs">
        <button
          v-for="view in operationConsoleV6Mock.workspaceViews"
          :key="view"
          type="button"
          :class="{ active: view === '场景视图' }"
        >
          {{ view }}
        </button>
      </div>
      <div class="scene-tools">
        <button v-for="tool in operationConsoleV6Mock.workspaceTools" :key="tool" type="button">
          {{ tool }}
        </button>
      </div>
    </div>

    <div class="workspace-canvas-shell">
      <div class="canvas-meta left-top">
        <span>水体状态</span>
        <strong>{{ pond.twin.waterBody }}</strong>
      </div>
      <div class="canvas-meta right-top">
        <span>摄食活跃度</span>
        <strong>{{ pond.twin.nodes.find((node) => node.id === 'feeding-hot')?.value }}</strong>
      </div>
      <div class="canvas-meta left-bottom">
        <span>成熟度</span>
        <strong>{{ pond.shrimp.maturity }}%</strong>
      </div>
      <div class="canvas-meta right-bottom">
        <span>风险等级</span>
        <strong>{{ pond.risk.level }}风险</strong>
      </div>

      <svg class="twin-canvas" viewBox="0 0 1000 600" role="img" aria-label="虾池数字孪生工作台">
        <defs>
          <pattern id="v6-grid" width="34" height="34" patternUnits="userSpaceOnUse">
            <path
              d="M 34 0 L 0 0 0 34"
              fill="none"
              stroke="rgba(130,213,255,0.12)"
              stroke-width="1"
            />
          </pattern>
          <linearGradient id="v6-water" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0b4b72" stop-opacity="0.72" />
            <stop offset="48%" stop-color="#0b6f90" stop-opacity="0.78" />
            <stop offset="100%" stop-color="#082d54" stop-opacity="0.86" />
          </linearGradient>
          <radialGradient id="v6-feed-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#e8fbff" stop-opacity="0.9" />
            <stop offset="42%" stop-color="#54d6ff" stop-opacity="0.28" />
            <stop offset="100%" stop-color="#54d6ff" stop-opacity="0" />
          </radialGradient>
          <filter id="v6-soft-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="1000" height="600" fill="url(#v6-grid)" />
        <path
          class="scene-base"
          d="M144 116 C220 80 772 80 854 116 L928 190 C958 224 958 378 928 412 L854 484 C776 520 224 520 144 484 L74 412 C42 376 42 226 74 190 Z"
        />
        <path
          class="water-body"
          d="M184 148 C252 122 740 122 814 148 L888 214 C912 238 912 360 888 386 L812 452 C740 482 260 482 184 452 L108 386 C86 360 86 238 108 214 Z"
        />
        <path class="water-wave" d="M166 292 C286 250 384 342 510 296 C636 250 722 334 842 292" />
        <path
          class="water-wave secondary"
          d="M166 346 C286 306 388 386 506 344 C626 302 728 376 842 346"
        />
        <path
          class="pool-outline"
          d="M184 148 C252 122 740 122 814 148 L888 214 C912 238 912 360 888 386 L812 452 C740 482 260 482 184 452 L108 386 C86 360 86 238 108 214 Z"
        />

        <g class="connection-layer">
          <g v-for="link in sceneLinks" :key="`${link.source.id}-${link.target.id}`">
            <line :x1="link.source.x" :y1="link.source.y" :x2="link.target.x" :y2="link.target.y" />
            <text :x="link.labelX" :y="link.labelY - 8">{{ link.label }}</text>
          </g>
        </g>

        <g class="area-markers">
          <ellipse cx="610" cy="400" rx="104" ry="52" class="feeding-area" />
          <ellipse cx="370" cy="205" rx="86" ry="42" class="risk-area" />
          <path
            class="low-profile-shrimp"
            d="M390 344 C414 326 448 330 468 350 C448 366 414 366 390 344 Z"
          />
          <path class="low-profile-shrimp tail" d="M468 350 L496 336 L496 364 Z" />
        </g>

        <g class="node-layer">
          <g
            v-for="node in pond.twin.nodes"
            :key="node.id"
            class="scene-node"
            :class="nodeClass(node)"
            :transform="`translate(${node.x} ${node.y})`"
          >
            <circle class="node-halo" r="32" />
            <circle class="node-core" r="8" />
            <text class="node-label" x="0" y="-42">{{ node.label }}</text>
            <text class="node-value" x="0" y="30">{{ node.value }}</text>
          </g>
        </g>
      </svg>

      <div class="feed-control-panel">
        <span>当前推荐投喂量</span>
        <strong>{{ pond.strategy.recommendationFeedKg }}<small>千克</small></strong>
        <em>{{ pond.strategy.name }}</em>
        <div class="control-row">
          <b>可信度 {{ pond.model.confidence }}%</b>
          <b>{{ pond.strategy.frequency }}</b>
        </div>
      </div>
    </div>

    <div class="workspace-status-strip">
      <div>
        <span>投喂方式</span>
        <strong>{{ pond.strategy.feedingMethod }}</strong>
      </div>
      <div>
        <span>推荐时间</span>
        <strong>{{ pond.strategy.feedingTime }}</strong>
      </div>
      <div>
        <span>模型评估</span>
        <strong>{{ pond.model.result }}</strong>
      </div>
      <div>
        <span>设备联动状态</span>
        <strong>增氧设备联动正常</strong>
      </div>
    </div>
  </section>
</template>

<style scoped>
.v6-workspace {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: 46px 40px minmax(0, 1fr) 78px;
  gap: 8px;
  overflow: hidden;
}

.workspace-context-strip,
.workspace-tool-strip,
.workspace-status-strip {
  background: rgba(5, 22, 39, 0.9);
  border: 1px solid rgba(91, 184, 226, 0.18);
}

.workspace-context-strip {
  display: grid;
  grid-template-columns: 1.2fr 0.9fr 0.85fr 1.55fr;
}

.workspace-context-strip div {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border-right: 1px solid rgba(91, 184, 226, 0.12);
}

.workspace-context-strip div:last-child {
  border-right: 0;
}

.workspace-context-strip span,
.workspace-status-strip span,
.canvas-meta span {
  flex: 0 0 auto;
  color: #84aebe;
  font-size: 11px;
}

.workspace-context-strip strong {
  min-width: 0;
  overflow: hidden;
  color: #ecfbff;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workspace-tool-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 8px;
}

.view-tabs,
.scene-tools {
  display: flex;
  align-items: center;
  gap: 6px;
}

.workspace-tool-strip button {
  height: 26px;
  padding: 0 10px;
  color: #9fc8d9;
  font-size: 12px;
  background: rgba(3, 16, 30, 0.74);
  border: 1px solid rgba(91, 184, 226, 0.14);
}

.workspace-tool-strip button.active,
.workspace-tool-strip button:hover {
  color: #f4fcff;
  background: rgba(21, 96, 132, 0.72);
  border-color: rgba(84, 214, 255, 0.42);
}

.workspace-canvas-shell {
  position: relative;
  min-height: 0;
  overflow: hidden;
  background:
    linear-gradient(rgba(91, 184, 226, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(91, 184, 226, 0.08) 1px, transparent 1px),
    radial-gradient(circle at 50% 48%, rgba(19, 105, 137, 0.34), transparent 46%),
    rgba(2, 12, 24, 0.95);
  background-size:
    28px 28px,
    28px 28px,
    auto,
    auto;
  border: 1px solid rgba(91, 184, 226, 0.2);
}

.twin-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.scene-base {
  fill: rgba(3, 12, 24, 0.76);
  stroke: rgba(101, 206, 255, 0.22);
  stroke-width: 2;
}

.water-body {
  fill: url(#v6-water);
  stroke: rgba(180, 239, 255, 0.3);
  stroke-width: 2;
}

.pool-outline {
  fill: none;
  stroke: rgba(226, 252, 255, 0.52);
  stroke-width: 1.5;
  stroke-dasharray: 8 8;
}

.water-wave {
  fill: none;
  stroke: rgba(191, 243, 255, 0.18);
  stroke-width: 2;
}

.water-wave.secondary {
  stroke: rgba(115, 224, 178, 0.12);
}

.connection-layer line {
  stroke: rgba(104, 216, 255, 0.4);
  stroke-width: 1.6;
  stroke-dasharray: 7 7;
}

.connection-layer text {
  fill: rgba(188, 226, 240, 0.72);
  font-size: 13px;
  text-anchor: middle;
}

.feeding-area {
  fill: rgba(115, 224, 178, 0.16);
  stroke: rgba(115, 224, 178, 0.42);
  stroke-width: 1.5;
}

.risk-area {
  fill: rgba(255, 211, 110, 0.1);
  stroke: rgba(255, 211, 110, 0.36);
  stroke-width: 1.5;
}

.low-profile-shrimp {
  fill: rgba(228, 250, 255, 0.18);
  stroke: rgba(228, 250, 255, 0.22);
}

.low-profile-shrimp.tail {
  fill: rgba(84, 214, 255, 0.12);
}

.scene-node {
  filter: url(#v6-soft-glow);
}

.node-halo {
  fill: rgba(84, 214, 255, 0.08);
  stroke-width: 1.5;
}

.node-core {
  fill: #54d6ff;
}

.scene-node.is-normal .node-halo {
  stroke: rgba(105, 226, 164, 0.56);
}

.scene-node.is-normal .node-core {
  fill: #69e2a4;
}

.scene-node.is-attention .node-halo {
  stroke: rgba(255, 211, 110, 0.62);
}

.scene-node.is-attention .node-core {
  fill: #ffd36e;
}

.scene-node.is-warning .node-halo {
  stroke: rgba(255, 124, 124, 0.72);
}

.scene-node.is-warning .node-core {
  fill: #ff7c7c;
}

.node-label,
.node-value {
  fill: #e8fbff;
  font-size: 14px;
  text-anchor: middle;
}

.node-value {
  fill: #9ec5d5;
  font-size: 12px;
}

.canvas-meta {
  position: absolute;
  z-index: 2;
  width: 132px;
  padding: 8px 10px;
  background: rgba(3, 16, 30, 0.72);
  border: 1px solid rgba(91, 184, 226, 0.18);
}

.canvas-meta strong {
  display: block;
  margin-top: 4px;
  overflow: hidden;
  color: #f1fbff;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.left-top {
  left: 14px;
  top: 14px;
}

.right-top {
  top: 14px;
  right: 14px;
}

.left-bottom {
  left: 14px;
  bottom: 14px;
}

.right-bottom {
  right: 14px;
  bottom: 14px;
}

.feed-control-panel {
  position: absolute;
  z-index: 3;
  left: 50%;
  top: 50%;
  width: 214px;
  padding: 14px 16px;
  color: #f4fcff;
  text-align: center;
  background: linear-gradient(180deg, rgba(7, 42, 66, 0.92), rgba(3, 18, 33, 0.92));
  border: 1px solid rgba(84, 214, 255, 0.45);
  box-shadow: 0 18px 42px rgba(0, 8, 18, 0.42);
  transform: translate(-50%, -50%);
}

.feed-control-panel::before {
  content: '';
  position: absolute;
  inset: -26px;
  z-index: -1;
  background: radial-gradient(circle, rgba(84, 214, 255, 0.24), transparent 64%);
}

.feed-control-panel span,
.feed-control-panel em,
.feed-control-panel b {
  display: block;
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
}

.feed-control-panel span {
  color: #8fb3c5;
}

.feed-control-panel strong {
  display: block;
  margin: 5px 0;
  color: #ffffff;
  font-size: 36px;
  line-height: 1;
}

.feed-control-panel small {
  margin-left: 4px;
  color: #a7d8e8;
  font-size: 13px;
}

.feed-control-panel em {
  color: #69e2a4;
}

.control-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  margin-top: 10px;
}

.feed-control-panel b {
  padding: 4px 5px;
  color: #c8e5f0;
  background: rgba(3, 16, 30, 0.62);
  border: 1px solid rgba(91, 184, 226, 0.14);
}

.workspace-status-strip {
  min-height: 0;
  display: grid;
  grid-template-columns: 1.1fr 1fr 1.45fr 1fr;
}

.workspace-status-strip div {
  min-width: 0;
  padding: 10px 12px;
  border-right: 1px solid rgba(91, 184, 226, 0.12);
}

.workspace-status-strip div:last-child {
  border-right: 0;
}

.workspace-status-strip strong {
  display: block;
  margin-top: 7px;
  overflow: hidden;
  color: #ecfbff;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
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
