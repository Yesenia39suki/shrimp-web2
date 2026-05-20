<script setup lang="ts">
import { computed } from 'vue'

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

      return {
        ...link,
        sourceNode,
        targetNode,
      }
    })
    .filter((link): link is ResolvedTwinLink => link !== null)
})

const riskNodes = computed(() => {
  return props.pond.twin.nodes.filter((node) => node.type === '风险点位')
})

const sceneMetrics = computed(() => {
  return [
    props.pond.waterQuality[0],
    props.pond.waterQuality[1],
    props.pond.waterQuality[2],
    props.pond.waterQuality[5],
  ].filter((metric) => metric !== undefined)
})

const nodeFillMap: Record<TwinNodeType, string> = {
  投喂中心: '#54d6ff',
  增氧设备: '#73e0b2',
  摄食活跃: '#ffd36e',
  风险点位: '#ff7c7c',
  水质监测: '#8ab8ff',
  成熟度: '#b894ff',
}

function nodeFill(type: TwinNodeType) {
  return nodeFillMap[type]
}

function nodeStroke(level: MetricLevel) {
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
  <section class="digital-twin-workspace">
    <div class="workspace-header">
      <div>
        <span class="eyebrow">数字孪生主场景</span>
        <h2>{{ pond.name }}投喂态势地图</h2>
      </div>
      <div class="header-status">
        <span>{{ pond.statusText }}</span>
      </div>
    </div>

    <div class="scene-shell">
      <div class="scene-metric-rail">
        <div v-for="metric in sceneMetrics" :key="metric.key" class="scene-metric">
          <span class="metric-orbit"></span>
          <div>
            <strong>{{ metric.value }}</strong>
            <span>{{ metric.label }}</span>
          </div>
        </div>
      </div>

      <svg class="twin-svg" viewBox="0 0 1000 620" role="img" aria-label="虾池数字孪生态势地图">
        <defs>
          <linearGradient id="mapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0e3d58" />
            <stop offset="45%" stop-color="#0b2d47" />
            <stop offset="100%" stop-color="#06172b" />
          </linearGradient>
          <radialGradient id="waterCore" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stop-color="rgba(84, 214, 255, 0.3)" />
            <stop offset="54%" stop-color="rgba(26, 102, 132, 0.22)" />
            <stop offset="100%" stop-color="rgba(5, 18, 34, 0.05)" />
          </radialGradient>
          <filter id="sceneGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x="18" y="26" width="964" height="568" fill="rgba(3, 14, 27, 0.72)" />
        <path
          class="map-outline"
          d="M102 204 L174 158 L276 170 L336 132 L438 150 L512 108 L612 136 L720 122 L850 180 L910 252 L876 344 L914 438 L794 508 L662 490 L548 536 L426 492 L292 518 L170 456 L116 346 Z"
        />
        <path
          class="map-outline secondary"
          d="M184 286 L264 234 L370 248 L466 202 L582 236 L696 214 L808 280 L774 370 L824 442 L682 454 L560 418 L462 462 L330 428 L238 454 L160 374 Z"
        />

        <path
          class="pond-body"
          d="M246 372 C286 248 410 194 538 216 C662 238 774 312 780 394 C786 488 626 512 478 484 C340 458 220 454 246 372 Z"
        />
        <ellipse class="water-core" cx="510" cy="374" rx="226" ry="96" />
        <path class="water-flow" d="M290 356 C386 318 484 382 580 342 C662 310 704 338 748 316" />
        <path
          class="water-flow slow"
          d="M300 420 C410 392 488 440 598 410 C672 390 712 406 744 388"
        />

        <g class="radar" transform="translate(500 338)">
          <circle r="74" />
          <circle r="48" />
          <circle r="22" />
          <line x1="-86" y1="0" x2="86" y2="0" />
          <line x1="0" y1="-86" x2="0" y2="86" />
          <path d="M0 0 L78 -18 A80 80 0 0 1 56 58 Z" />
        </g>

        <g v-for="node in riskNodes" :key="`risk-${node.id}`">
          <circle
            :cx="node.x"
            :cy="node.y"
            r="64"
            fill="rgba(255, 124, 124, 0.12)"
            stroke="rgba(255, 124, 124, 0.42)"
            stroke-width="1.4"
            stroke-dasharray="7 9"
          />
        </g>

        <g class="links">
          <line
            v-for="link in resolvedLinks"
            :key="`${link.source}-${link.target}`"
            :x1="link.sourceNode.x"
            :y1="link.sourceNode.y"
            :x2="link.targetNode.x"
            :y2="link.targetNode.y"
          />
        </g>

        <g class="center-device" transform="translate(500 300)" filter="url(#sceneGlow)">
          <path d="M0 -76 L28 -34 L14 38 L-14 38 L-28 -34 Z" />
          <line x1="0" y1="-74" x2="0" y2="46" />
          <line x1="-28" y1="-34" x2="28" y2="-34" />
          <line x1="-18" y1="0" x2="18" y2="0" />
          <circle r="9" />
        </g>

        <g
          v-for="node in pond.twin.nodes"
          :key="node.id"
          class="node-group"
          :transform="`translate(${node.x}, ${node.y})`"
        >
          <circle class="node-halo" r="34" :stroke="nodeStroke(node.level)" />
          <circle class="node-pulse" r="22" :stroke="nodeStroke(node.level)" />
          <circle
            class="node-core"
            r="10"
            :fill="nodeFill(node.type)"
            :stroke="nodeStroke(node.level)"
          />
          <text y="-42" text-anchor="middle" class="node-label">{{ node.label }}</text>
          <text y="50" text-anchor="middle" class="node-value">{{ node.value }}</text>
        </g>

        <g class="map-labels">
          <text x="104" y="548">水体状态：{{ pond.twin.waterBody }}</text>
          <text x="370" y="548">养殖阶段：{{ pond.shrimp.growthStage }}</text>
          <text x="666" y="548">设备联动：投喂、增氧、监测协同</text>
        </g>
      </svg>

      <div class="decision-card">
        <span>当前推荐投喂量</span>
        <strong>{{ pond.strategy.recommendationFeedKg }} 千克</strong>
        <p>{{ pond.strategy.name }} · {{ pond.strategy.frequency }}</p>
      </div>

      <div class="device-mini-panel">
        <div class="device-wireframe">
          <span></span>
          <i></i>
        </div>
        <strong>设备运行良好</strong>
        <div class="device-rows">
          <span>增氧联动</span>
          <em>{{ pond.twin.nodes.find((node) => node.type === '增氧设备')?.value ?? '运行' }}</em>
          <span>模型可信度</span>
          <em>{{ pond.model.confidence }}%</em>
          <span>风险等级</span>
          <em>{{ pond.risk.level }}风险</em>
        </div>
      </div>
    </div>

    <div class="workspace-footer">
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
    </div>
  </section>
</template>

<style scoped>
.digital-twin-workspace {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 8px;
  overflow: hidden;
}

.workspace-header {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  min-height: 50px;
  padding: 10px 12px;
  background: linear-gradient(90deg, rgba(7, 30, 50, 0.9), rgba(3, 16, 30, 0.78));
  border: 1px solid rgba(91, 184, 226, 0.18);
}

.workspace-header::after {
  content: '';
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 0;
  height: 1px;
  background: linear-gradient(90deg, rgba(84, 214, 255, 0.6), transparent);
}

.eyebrow {
  display: block;
  margin-bottom: 5px;
  color: #68d7ff;
  font-size: 12px;
}

h2 {
  margin: 0;
  color: #eefcff;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: 0;
}

.header-status {
  max-width: 320px;
  padding: 7px 10px;
  color: #c6edf8;
  font-size: 13px;
  line-height: 1.5;
  text-align: right;
  background: rgba(4, 18, 34, 0.66);
  border: 1px solid rgba(111, 206, 255, 0.16);
}

.scene-shell {
  position: relative;
  min-height: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 48%, rgba(34, 138, 171, 0.22), transparent 38%),
    linear-gradient(rgba(125, 231, 255, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(125, 231, 255, 0.045) 1px, transparent 1px), #03101f;
  background-size:
    auto,
    38px 38px,
    38px 38px,
    auto;
  border: 1px solid rgba(91, 184, 226, 0.18);
}

.scene-shell::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: -35%;
  height: 28%;
  background: linear-gradient(180deg, transparent, rgba(84, 214, 255, 0.12), transparent);
  animation: scene-scan 7s linear infinite;
  pointer-events: none;
}

.scene-metric-rail {
  position: absolute;
  z-index: 2;
  left: 18px;
  right: 18px;
  top: 14px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.scene-metric {
  min-width: 0;
  height: 45px;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  background: rgba(4, 18, 34, 0.66);
  border: 1px solid rgba(111, 206, 255, 0.16);
}

.metric-orbit {
  width: 26px;
  height: 26px;
  border: 2px solid rgba(84, 214, 255, 0.72);
  border-right-color: rgba(184, 148, 255, 0.72);
  border-radius: 50%;
  box-shadow: 0 0 12px rgba(84, 214, 255, 0.28);
}

.scene-metric strong {
  display: block;
  overflow: hidden;
  color: #f5feff;
  font-size: 13px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scene-metric span:last-child {
  display: block;
  margin-top: 2px;
  color: #7fa9bd;
  font-size: 11px;
}

.twin-svg {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  min-height: 386px;
}

.map-outline {
  fill: url(#mapGradient);
  stroke: rgba(83, 205, 255, 0.48);
  stroke-width: 2;
  filter: drop-shadow(0 0 10px rgba(84, 214, 255, 0.18));
}

.map-outline.secondary {
  fill: rgba(5, 25, 42, 0.55);
  stroke: rgba(109, 210, 255, 0.25);
  stroke-width: 1.4;
  stroke-dasharray: 9 12;
}

.pond-body {
  fill: rgba(22, 109, 139, 0.34);
  stroke: rgba(142, 238, 255, 0.6);
  stroke-width: 2.2;
}

.water-core {
  fill: url(#waterCore);
  stroke: rgba(142, 238, 255, 0.14);
}

.water-flow {
  fill: none;
  stroke: rgba(224, 252, 255, 0.26);
  stroke-width: 2;
  stroke-dasharray: 9 12;
  animation: dash-flow 12s linear infinite;
}

.water-flow.slow {
  opacity: 0.72;
  animation-duration: 18s;
}

.radar circle,
.radar line {
  fill: none;
  stroke: rgba(132, 225, 255, 0.26);
  stroke-width: 1.4;
}

.radar path {
  fill: rgba(84, 214, 255, 0.16);
  animation: radar-turn 6s linear infinite;
  transform-origin: center;
}

.links line {
  stroke: rgba(185, 240, 255, 0.45);
  stroke-width: 1.5;
  stroke-dasharray: 7 8;
  animation: dash-flow 10s linear infinite;
}

.center-device path,
.center-device line,
.center-device circle {
  fill: rgba(84, 214, 255, 0.08);
  stroke: rgba(214, 250, 255, 0.82);
  stroke-width: 1.6;
}

.node-halo {
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
  font-size: 14px;
  font-weight: 700;
}

.node-value {
  fill: #b8d8e6;
  font-size: 12px;
  font-weight: 600;
}

.map-labels text {
  fill: #b8d8e6;
  font-size: 13px;
  font-weight: 600;
}

.decision-card {
  position: absolute;
  z-index: 3;
  left: 50%;
  top: 50%;
  width: 212px;
  padding: 14px 16px;
  color: #e8fbff;
  text-align: center;
  background: rgba(3, 16, 30, 0.84);
  border: 1px solid rgba(132, 225, 255, 0.52);
  box-shadow:
    0 0 28px rgba(84, 214, 255, 0.16),
    0 0 0 1px rgba(255, 255, 255, 0.04) inset;
  transform: translate(-50%, -42%);
}

.decision-card span {
  color: #9acada;
  font-size: 12px;
}

.decision-card strong {
  display: block;
  margin-top: 6px;
  color: #f5feff;
  font-size: 30px;
  font-weight: 800;
}

.decision-card p {
  margin: 6px 0 0;
  color: #73e0b2;
  font-size: 12px;
}

.device-mini-panel {
  position: absolute;
  z-index: 3;
  right: 18px;
  top: 76px;
  width: 172px;
  padding: 12px;
  background: rgba(3, 16, 30, 0.76);
  border: 1px solid rgba(111, 206, 255, 0.2);
}

.device-wireframe {
  height: 76px;
  position: relative;
  margin-bottom: 8px;
}

.device-wireframe span {
  position: absolute;
  left: 50%;
  top: 6px;
  width: 42px;
  height: 54px;
  border: 1px solid rgba(218, 252, 255, 0.74);
  transform: translateX(-50%) skewY(-8deg);
  box-shadow:
    -18px 18px 0 rgba(84, 214, 255, 0.08),
    18px 18px 0 rgba(84, 214, 255, 0.08);
}

.device-wireframe i {
  position: absolute;
  left: 35px;
  right: 35px;
  bottom: 9px;
  height: 18px;
  border: 1px solid rgba(218, 252, 255, 0.72);
  border-radius: 50%;
}

.device-mini-panel > strong {
  display: block;
  margin-bottom: 9px;
  color: #f5feff;
  font-size: 14px;
  text-align: center;
}

.device-rows {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px 10px;
  color: #8fb3c5;
  font-size: 11px;
}

.device-rows em {
  color: #dffbff;
  font-style: normal;
}

.workspace-footer {
  display: grid;
  grid-template-columns: 1.05fr 1fr 1.2fr;
  gap: 8px;
}

.workspace-footer div {
  min-width: 0;
  padding: 8px 10px;
  background: rgba(7, 30, 50, 0.86);
  border: 1px solid rgba(91, 184, 226, 0.16);
}

.workspace-footer span {
  display: block;
  margin-bottom: 5px;
  color: #87adbf;
  font-size: 11px;
}

.workspace-footer strong {
  display: block;
  min-width: 0;
  overflow: hidden;
  color: #e8fbff;
  font-size: 12px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes dash-flow {
  to {
    stroke-dashoffset: -80;
  }
}

@keyframes radar-turn {
  to {
    transform: rotate(360deg);
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
</style>
