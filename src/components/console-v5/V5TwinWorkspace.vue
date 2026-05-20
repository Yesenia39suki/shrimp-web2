<script setup lang="ts">
import { computed } from 'vue'

import { operationConsoleV5Mock } from '@/mock/operationConsoleV5'
import type {
  MetricLevel,
  ShrimpPond,
  TwinLink,
  TwinNode,
  TwinNodeType,
} from '@/types/operationConsole'

const props = defineProps<{
  pond: ShrimpPond
}>()

interface ResolvedTwinLink extends TwinLink {
  sourceNode: TwinNode
  targetNode: TwinNode
}

const resolvedLinks = computed<ResolvedTwinLink[]>(() => {
  const nodeMap = new Map(props.pond.twin.nodes.map((node) => [node.id, node]))

  return props.pond.twin.links
    .map((link) => {
      const sourceNode = nodeMap.get(link.source)
      const targetNode = nodeMap.get(link.target)

      if (!sourceNode || !targetNode) {
        return null
      }

      return { ...link, sourceNode, targetNode }
    })
    .filter((link): link is ResolvedTwinLink => link !== null)
})

const activeRate = computed(() => {
  return props.pond.twin.nodes.find((node) => node.type === '摄食活跃')?.value ?? '正常'
})

const nodeColorMap: Record<TwinNodeType, string> = {
  投喂中心: '#54d6ff',
  增氧设备: '#73e0b2',
  摄食活跃: '#ffd36e',
  风险点位: '#ff7c7c',
  水质监测: '#8ab8ff',
  成熟度: '#b894ff',
}

function nodeColor(type: TwinNodeType) {
  return nodeColorMap[type]
}

function levelColor(level: MetricLevel) {
  if (level === '预警') {
    return '#ff8585'
  }

  if (level === '关注') {
    return '#ffd36e'
  }

  return '#8ff3c1'
}
</script>

<template>
  <section class="v5-twin-workspace">
    <div class="workspace-context">
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
        <strong>{{ pond.risk.level }}风险</strong>
      </div>
      <div>
        <span>当前策略</span>
        <strong>{{ pond.strategy.name }}</strong>
      </div>
      <div class="workspace-tools">
        <button
          v-for="view in operationConsoleV5Mock.workspaceViews"
          :key="view"
          type="button"
          :class="{ active: view === '场景视图' }"
        >
          {{ view }}
        </button>
        <button v-for="tool in operationConsoleV5Mock.workspaceTools" :key="tool" type="button">
          {{ tool }}
        </button>
      </div>
    </div>

    <div class="scene-workbench">
      <svg class="scene-svg" viewBox="0 0 1000 620" role="img" aria-label="虾池数字孪生工作台">
        <defs>
          <linearGradient id="v5PoolGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0c5778" />
            <stop offset="52%" stop-color="#0a3654" />
            <stop offset="100%" stop-color="#06172c" />
          </linearGradient>
          <radialGradient id="v5WaterGlow" cx="50%" cy="54%" r="62%">
            <stop offset="0%" stop-color="rgba(84, 214, 255, 0.3)" />
            <stop offset="60%" stop-color="rgba(19, 92, 124, 0.2)" />
            <stop offset="100%" stop-color="rgba(4, 16, 30, 0)" />
          </radialGradient>
          <filter id="v5Glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x="20" y="20" width="960" height="580" fill="rgba(3, 14, 27, 0.72)" />
        <path
          class="base-platform"
          d="M96 212 L184 150 L300 168 L364 126 L476 152 L548 108 L638 136 L752 122 L872 188 L926 264 L894 344 L930 442 L804 512 L668 494 L552 538 L430 494 L294 520 L162 454 L110 346 Z"
        />
        <path
          class="pool-body"
          d="M238 382 C280 248 414 192 544 216 C684 242 804 324 790 408 C776 494 624 516 474 486 C338 460 212 460 238 382 Z"
        />
        <ellipse class="water-layer" cx="520" cy="382" rx="252" ry="118" />

        <g class="water-particles">
          <circle cx="306" cy="294" r="2" />
          <circle cx="416" cy="252" r="2" />
          <circle cx="618" cy="282" r="2" />
          <circle cx="720" cy="362" r="2" />
          <circle cx="388" cy="438" r="2" />
          <circle cx="570" cy="472" r="2" />
          <circle cx="682" cy="438" r="2" />
        </g>

        <path class="wave-line" d="M292 360 C394 318 488 386 590 346 C676 310 718 342 760 318" />
        <path
          class="wave-line slow"
          d="M300 426 C412 396 492 444 608 414 C684 392 722 410 754 390"
        />

        <g class="risk-zones">
          <circle
            v-for="node in pond.twin.nodes.filter((item) => item.type === '风险点位')"
            :key="node.id"
            :cx="node.x"
            :cy="node.y"
            r="64"
          />
        </g>

        <g class="node-links">
          <line
            v-for="link in resolvedLinks"
            :key="`${link.source}-${link.target}`"
            :x1="link.sourceNode.x"
            :y1="link.sourceNode.y"
            :x2="link.targetNode.x"
            :y2="link.targetNode.y"
          />
        </g>

        <g
          v-for="node in pond.twin.nodes"
          :key="node.id"
          class="scene-node"
          :transform="`translate(${node.x}, ${node.y})`"
        >
          <circle class="node-ring" r="31" :stroke="levelColor(node.level)" />
          <circle class="node-pulse" r="21" :stroke="levelColor(node.level)" />
          <circle
            class="node-core"
            r="10"
            :fill="nodeColor(node.type)"
            :stroke="levelColor(node.level)"
          />
          <text class="node-label" y="-42" text-anchor="middle">{{ node.label }}</text>
          <text class="node-value" y="49" text-anchor="middle">{{ node.value }}</text>
        </g>

        <g class="feed-device" transform="translate(500 312)" filter="url(#v5Glow)">
          <circle r="82" />
          <circle r="52" />
          <path d="M0 -74 L32 -26 L16 46 L-16 46 L-32 -26 Z" />
          <line x1="0" y1="-74" x2="0" y2="50" />
          <line x1="-32" y1="-26" x2="32" y2="-26" />
        </g>
      </svg>

      <div class="core-control-panel">
        <span>中央投喂控制</span>
        <strong>{{ pond.strategy.recommendationFeedKg }} 千克</strong>
        <p>{{ pond.strategy.name }} · {{ pond.strategy.frequency }}</p>
        <div>
          <em>摄食 {{ activeRate }}</em>
          <em>成熟度 {{ pond.shrimp.maturity }}%</em>
        </div>
      </div>

      <div class="float-note risk-note">
        <span>风险点位</span>
        <strong>{{ pond.risk.summary }}</strong>
      </div>
      <div class="float-note oxygen-note">
        <span>设备联动</span>
        <strong>投喂、增氧、监测协同</strong>
      </div>
    </div>

    <div class="scene-summary">
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
        <strong>增氧与监测联动正常</strong>
      </div>
      <div>
        <span>场景说明</span>
        <strong>当前工作台聚焦投喂中心、摄食响应和水质边界</strong>
      </div>
    </div>
  </section>
</template>

<style scoped>
.v5-twin-workspace {
  min-height: 0;
  display: grid;
  grid-template-rows: 52px minmax(0, 1fr) 84px;
  gap: 10px;
  overflow: hidden;
}

.workspace-context {
  min-width: 0;
  display: grid;
  grid-template-columns: 1fr 0.78fr 0.7fr 1fr minmax(360px, 1.6fr);
  gap: 8px;
}

.workspace-context > div {
  min-width: 0;
  padding: 8px 10px;
  background: rgba(5, 22, 39, 0.9);
  border: 1px solid rgba(91, 184, 226, 0.18);
}

.workspace-context span {
  display: block;
  margin-bottom: 5px;
  color: #7fa9bd;
  font-size: 11px;
}

.workspace-context strong {
  display: block;
  overflow: hidden;
  color: #f0fbff;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workspace-tools {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  padding: 6px;
}

.workspace-tools button {
  height: 28px;
  padding: 0 9px;
  color: #a9cfe0;
  font-size: 12px;
  background: rgba(3, 16, 30, 0.64);
  border: 1px solid rgba(91, 184, 226, 0.15);
}

.workspace-tools button.active,
.workspace-tools button:hover {
  color: #f4fcff;
  background: rgba(22, 102, 139, 0.68);
  border-color: rgba(84, 214, 255, 0.42);
}

.scene-workbench {
  position: relative;
  min-height: 0;
  overflow: hidden;
  background:
    linear-gradient(rgba(125, 231, 255, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(125, 231, 255, 0.045) 1px, transparent 1px),
    radial-gradient(circle at 50% 48%, rgba(31, 133, 171, 0.22), transparent 42%), #03101f;
  background-size:
    38px 38px,
    38px 38px,
    auto,
    auto;
  border: 1px solid rgba(91, 184, 226, 0.2);
}

.scene-workbench::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: -32%;
  height: 28%;
  background: linear-gradient(180deg, transparent, rgba(84, 214, 255, 0.11), transparent);
  animation: scene-scan 7s linear infinite;
}

.scene-svg {
  display: block;
  width: 100%;
  height: 100%;
}

.base-platform {
  fill: url(#v5PoolGradient);
  stroke: rgba(83, 205, 255, 0.48);
  stroke-width: 2;
}

.pool-body {
  fill: rgba(22, 109, 139, 0.34);
  stroke: rgba(142, 238, 255, 0.62);
  stroke-width: 2.2;
}

.water-layer {
  fill: url(#v5WaterGlow);
  stroke: rgba(142, 238, 255, 0.12);
}

.water-particles circle {
  fill: rgba(220, 252, 255, 0.72);
  animation: particle-float 5s ease-in-out infinite;
}

.water-particles circle:nth-child(2n) {
  animation-delay: 1.4s;
}

.water-particles circle:nth-child(3n) {
  animation-delay: 2.1s;
}

.wave-line {
  fill: none;
  stroke: rgba(224, 252, 255, 0.26);
  stroke-width: 2;
  stroke-dasharray: 9 12;
  animation: dash-flow 12s linear infinite;
}

.wave-line.slow {
  opacity: 0.72;
  animation-duration: 18s;
}

.risk-zones circle {
  fill: rgba(255, 124, 124, 0.1);
  stroke: rgba(255, 124, 124, 0.4);
  stroke-width: 1.4;
  stroke-dasharray: 7 9;
}

.node-links line {
  stroke: rgba(185, 240, 255, 0.46);
  stroke-width: 1.5;
  stroke-dasharray: 7 8;
  animation: dash-flow 10s linear infinite;
}

.node-ring {
  fill: rgba(255, 255, 255, 0.03);
  stroke-width: 1.4;
  stroke-dasharray: 5 8;
}

.node-pulse {
  fill: none;
  stroke-width: 1.2;
  opacity: 0.35;
  animation: node-pulse 2.8s ease-out infinite;
}

.node-core {
  stroke-width: 3;
  filter: drop-shadow(0 0 9px rgba(125, 231, 255, 0.5));
}

.node-label {
  fill: #e7fbff;
  font-size: 13px;
  font-weight: 700;
}

.node-value {
  fill: #b8d8e6;
  font-size: 12px;
  font-weight: 600;
}

.feed-device circle,
.feed-device path,
.feed-device line {
  fill: rgba(84, 214, 255, 0.06);
  stroke: rgba(214, 250, 255, 0.8);
  stroke-width: 1.4;
}

.feed-device circle {
  stroke-dasharray: 8 10;
}

.core-control-panel {
  position: absolute;
  left: 50%;
  top: 52%;
  width: 250px;
  padding: 14px 16px;
  text-align: center;
  background: rgba(3, 16, 30, 0.88);
  border: 1px solid rgba(132, 225, 255, 0.52);
  box-shadow: 0 0 28px rgba(84, 214, 255, 0.12);
  transform: translate(-50%, -50%);
}

.core-control-panel span,
.float-note span {
  color: #9acada;
  font-size: 12px;
}

.core-control-panel strong {
  display: block;
  margin-top: 7px;
  color: #f5feff;
  font-size: 31px;
  font-weight: 800;
}

.core-control-panel p {
  margin: 6px 0 9px;
  color: #73e0b2;
  font-size: 12px;
}

.core-control-panel div {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.core-control-panel em {
  padding: 3px 6px;
  color: #c9eaf6;
  font-size: 11px;
  font-style: normal;
  border: 1px solid rgba(91, 184, 226, 0.2);
}

.float-note {
  position: absolute;
  max-width: 260px;
  padding: 9px 10px;
  background: rgba(3, 16, 30, 0.78);
  border: 1px solid rgba(91, 184, 226, 0.22);
}

.float-note strong {
  display: block;
  margin-top: 5px;
  color: #f2fdff;
  font-size: 12px;
  line-height: 1.45;
}

.risk-note {
  left: 18px;
  top: 18px;
}

.oxygen-note {
  right: 18px;
  bottom: 18px;
}

.scene-summary {
  display: grid;
  grid-template-columns: 1fr 1fr 1.2fr 1fr 1.35fr;
  gap: 8px;
}

.scene-summary div {
  min-width: 0;
  padding: 10px;
  background: rgba(5, 22, 39, 0.9);
  border: 1px solid rgba(91, 184, 226, 0.18);
}

.scene-summary span {
  display: block;
  margin-bottom: 7px;
  color: #7fa9bd;
  font-size: 11px;
}

.scene-summary strong {
  display: block;
  overflow: hidden;
  color: #f0fbff;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes dash-flow {
  to {
    stroke-dashoffset: -80;
  }
}

@keyframes node-pulse {
  from {
    opacity: 0.45;
    transform: scale(0.7);
  }

  to {
    opacity: 0;
    transform: scale(1.8);
  }
}

@keyframes scene-scan {
  to {
    top: 100%;
  }
}

@keyframes particle-float {
  50% {
    opacity: 0.35;
    transform: translateY(-8px);
  }
}
</style>
