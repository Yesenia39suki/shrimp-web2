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

const viewTabs = ['场景视图', '水质视图', '设备视图', '风险视图']
const toolButtons = ['聚焦投喂点', '聚焦风险点', '重置视图']

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
  const feedingNode = props.pond.twin.nodes.find((node) => node.type === '摄食活跃')
  return feedingNode?.value ?? '正常'
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
  <section class="v4-twin-workbench">
    <div class="workbench-context">
      <div>
        <span>当前池</span>
        <strong>{{ pond.id }} · {{ pond.name }}</strong>
      </div>
      <div>
        <span>当前模式</span>
        <strong>投喂决策</strong>
      </div>
      <div>
        <span>当前风险</span>
        <strong>{{ pond.risk.level }}风险</strong>
      </div>
      <div>
        <span>当前策略</span>
        <strong>{{ pond.strategy.name }}</strong>
      </div>
    </div>

    <div class="workbench-toolbar">
      <div class="view-tabs">
        <button
          v-for="tab in viewTabs"
          :key="tab"
          type="button"
          :class="{ active: tab === '场景视图' }"
        >
          {{ tab }}
        </button>
      </div>
      <div class="tool-buttons">
        <button v-for="button in toolButtons" :key="button" type="button">{{ button }}</button>
      </div>
    </div>

    <div class="scene-stage">
      <svg class="scene-svg" viewBox="0 0 1000 610" role="img" aria-label="虾池数字孪生工作台">
        <defs>
          <linearGradient id="v4WaterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0e5274" />
            <stop offset="54%" stop-color="#0a3958" />
            <stop offset="100%" stop-color="#06172c" />
          </linearGradient>
          <radialGradient id="v4WaterGlow" cx="50%" cy="52%" r="60%">
            <stop offset="0%" stop-color="rgba(84, 214, 255, 0.32)" />
            <stop offset="58%" stop-color="rgba(19, 92, 124, 0.2)" />
            <stop offset="100%" stop-color="rgba(4, 16, 30, 0)" />
          </radialGradient>
          <filter id="v4Glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x="20" y="20" width="960" height="570" fill="rgba(3, 14, 27, 0.72)" />
        <path
          class="base-outline"
          d="M90 208 L182 148 L292 166 L352 128 L462 150 L534 106 L628 134 L742 120 L866 184 L922 260 L888 342 L924 440 L798 510 L662 492 L548 536 L426 492 L292 518 L164 452 L112 346 Z"
        />
        <path
          class="pond-outline"
          d="M246 376 C286 248 414 194 540 216 C674 240 790 318 784 398 C778 488 626 512 478 484 C340 458 220 456 246 376 Z"
        />
        <ellipse class="water-glow" cx="520" cy="374" rx="246" ry="112" />

        <g class="particle-layer">
          <circle cx="320" cy="288" r="2" />
          <circle cx="426" cy="246" r="2" />
          <circle cx="618" cy="278" r="2" />
          <circle cx="710" cy="354" r="2" />
          <circle cx="390" cy="434" r="2" />
          <circle cx="570" cy="466" r="2" />
        </g>

        <path class="water-wave" d="M292 354 C394 316 488 382 590 342 C674 310 716 338 756 316" />
        <path
          class="water-wave slow"
          d="M300 418 C412 392 490 440 604 410 C680 390 718 406 750 388"
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

        <g class="scene-nodes">
          <g
            v-for="node in pond.twin.nodes"
            :key="node.id"
            :transform="`translate(${node.x}, ${node.y})`"
          >
            <circle class="node-ring" r="30" :stroke="levelColor(node.level)" />
            <circle class="node-pulse" r="20" :stroke="levelColor(node.level)" />
            <circle
              class="node-core"
              r="10"
              :fill="nodeColor(node.type)"
              :stroke="levelColor(node.level)"
            />
            <text class="node-label" y="-40" text-anchor="middle">{{ node.label }}</text>
            <text class="node-value" y="48" text-anchor="middle">{{ node.value }}</text>
          </g>
        </g>

        <g class="feed-device" transform="translate(500 306)" filter="url(#v4Glow)">
          <circle r="78" />
          <circle r="48" />
          <path d="M0 -72 L30 -26 L16 44 L-16 44 L-30 -26 Z" />
          <line x1="0" y1="-72" x2="0" y2="48" />
          <line x1="-30" y1="-26" x2="30" y2="-26" />
        </g>
      </svg>

      <div class="feed-overlay">
        <span>当前推荐投喂量</span>
        <strong>{{ pond.strategy.recommendationFeedKg }} 千克</strong>
        <p>{{ pond.strategy.name }} · {{ pond.strategy.frequency }}</p>
      </div>

      <div class="status-window risk-window">
        <span>风险提示</span>
        <strong>{{ pond.risk.summary }}</strong>
      </div>

      <div class="status-window activity-window">
        <span>摄食活跃度</span>
        <strong>{{ activeRate }}</strong>
      </div>

      <div class="status-window maturity-window">
        <span>养殖成熟度</span>
        <strong>{{ pond.shrimp.maturity }}%</strong>
      </div>
    </div>
  </section>
</template>

<style scoped>
.v4-twin-workbench {
  min-height: 0;
  display: grid;
  grid-template-rows: 56px 42px minmax(0, 1fr);
  gap: 8px;
  overflow: hidden;
}

.workbench-context {
  display: grid;
  grid-template-columns: 1.28fr 0.85fr 0.75fr 1.12fr;
  gap: 8px;
}

.workbench-context div {
  min-width: 0;
  padding: 8px 10px;
  background: rgba(5, 22, 39, 0.88);
  border: 1px solid rgba(91, 184, 226, 0.18);
}

.workbench-context span {
  display: block;
  margin-bottom: 5px;
  color: #7fa9bd;
  font-size: 11px;
}

.workbench-context strong {
  display: block;
  overflow: hidden;
  color: #e8fbff;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workbench-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px;
  background: rgba(5, 22, 39, 0.88);
  border: 1px solid rgba(91, 184, 226, 0.18);
}

.view-tabs,
.tool-buttons {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.view-tabs button,
.tool-buttons button {
  height: 28px;
  padding: 0 12px;
  color: #a9cfe0;
  font-size: 12px;
  background: rgba(3, 16, 30, 0.64);
  border: 1px solid rgba(91, 184, 226, 0.15);
}

.view-tabs button.active,
.view-tabs button:hover,
.tool-buttons button:hover {
  color: #f3fdff;
  background: rgba(22, 102, 139, 0.66);
  border-color: rgba(84, 214, 255, 0.42);
}

.scene-stage {
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

.scene-stage::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: -32%;
  height: 28%;
  background: linear-gradient(180deg, transparent, rgba(84, 214, 255, 0.12), transparent);
  animation: scene-scan 7s linear infinite;
}

.scene-svg {
  display: block;
  width: 100%;
  height: 100%;
}

.base-outline {
  fill: url(#v4WaterGradient);
  stroke: rgba(83, 205, 255, 0.48);
  stroke-width: 2;
}

.pond-outline {
  fill: rgba(22, 109, 139, 0.34);
  stroke: rgba(142, 238, 255, 0.62);
  stroke-width: 2.2;
}

.water-glow {
  fill: url(#v4WaterGlow);
  stroke: rgba(142, 238, 255, 0.12);
}

.particle-layer circle {
  fill: rgba(220, 252, 255, 0.72);
  animation: particle-float 5s ease-in-out infinite;
}

.particle-layer circle:nth-child(2n) {
  animation-delay: 1.4s;
}

.particle-layer circle:nth-child(3n) {
  animation-delay: 2.1s;
}

.water-wave {
  fill: none;
  stroke: rgba(224, 252, 255, 0.26);
  stroke-width: 2;
  stroke-dasharray: 9 12;
  animation: dash-flow 12s linear infinite;
}

.water-wave.slow {
  opacity: 0.72;
  animation-duration: 18s;
}

.risk-zones circle {
  fill: rgba(255, 124, 124, 0.12);
  stroke: rgba(255, 124, 124, 0.42);
  stroke-width: 1.4;
  stroke-dasharray: 7 9;
}

.links line {
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

.feed-overlay {
  position: absolute;
  left: 50%;
  top: 52%;
  width: 226px;
  padding: 14px 16px;
  text-align: center;
  background: rgba(3, 16, 30, 0.86);
  border: 1px solid rgba(132, 225, 255, 0.52);
  transform: translate(-50%, -50%);
}

.feed-overlay span,
.status-window span {
  color: #9acada;
  font-size: 12px;
}

.feed-overlay strong {
  display: block;
  margin-top: 7px;
  color: #f5feff;
  font-size: 30px;
  font-weight: 800;
}

.feed-overlay p {
  margin: 6px 0 0;
  color: #73e0b2;
  font-size: 12px;
}

.status-window {
  position: absolute;
  min-width: 150px;
  padding: 9px 10px;
  background: rgba(3, 16, 30, 0.78);
  border: 1px solid rgba(91, 184, 226, 0.22);
}

.status-window strong {
  display: block;
  margin-top: 5px;
  color: #f2fdff;
  font-size: 12px;
  line-height: 1.45;
}

.risk-window {
  left: 16px;
  top: 16px;
  max-width: 236px;
}

.activity-window {
  right: 18px;
  top: 18px;
}

.maturity-window {
  right: 18px;
  bottom: 18px;
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
