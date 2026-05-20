<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import * as echarts from 'echarts'

const mapRef = ref<HTMLDivElement | null>(null)
const loadFailed = ref(false)

let chart: echarts.ECharts | null = null

function resizeChart() {
  chart?.resize()
}

async function initMap() {
  if (!mapRef.value) {
    return
  }

  try {
    const response = await fetch('/maps/qingdao.geojson')

    if (!response.ok) {
      throw new Error('青岛地图文件加载失败')
    }

    const geojson = await response.json()
    echarts.registerMap('qingdao', geojson)

    chart = echarts.init(mapRef.value)
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { show: false },
      geo: {
        map: 'qingdao',
        roam: false,
        silent: true,
        layoutCenter: ['50%', '52%'],
        layoutSize: '138%',
        label: { show: false },
        emphasis: {
          disabled: true,
          label: { show: false },
        },
        itemStyle: {
          areaColor: 'rgba(24, 84, 214, 0.05)',
          borderColor: 'rgba(184, 224, 255, 0.72)',
          borderWidth: 0.84,
          shadowBlur: 24,
          shadowColor: 'rgba(74, 169, 255, 0.26)',
        },
      },
      series: [
        {
          type: 'map',
          map: 'qingdao',
          roam: false,
          silent: true,
          selectedMode: false,
          geoIndex: 0,
          label: { show: false },
          emphasis: {
            disabled: true,
            label: { show: false },
          },
          itemStyle: {
            areaColor: 'rgba(24, 84, 214, 0.04)',
            borderColor: 'rgba(121, 210, 255, 0.42)',
            borderWidth: 0.68,
            shadowBlur: 16,
            shadowColor: 'rgba(74, 169, 255, 0.2)',
          },
          emphasisItemStyle: {
            areaColor: 'rgba(21, 116, 158, 0.055)',
          },
        },
      ],
    })

    window.addEventListener('resize', resizeChart)
  } catch {
    loadFailed.value = true
  }
}

onMounted(() => {
  nextTick(initMap)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart)
  chart?.dispose()
})
</script>

<template>
  <div class="qingdao-map-background" aria-hidden="true">
    <div ref="mapRef" class="map-layer"></div>
    <div v-if="loadFailed" class="map-fallback">青岛轮廓背景待加载</div>
  </div>
</template>

<style scoped>
.qingdao-map-background {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.qingdao-map-background::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 58% 46%, rgba(74, 169, 255, 0.16), transparent 36%),
    radial-gradient(ellipse at 35% 64%, rgba(121, 210, 255, 0.07), transparent 32%),
    linear-gradient(rgba(121, 210, 255, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(121, 210, 255, 0.06) 1px, transparent 1px);
  background-size:
    auto,
    34px 34px,
    34px 34px;
}

.qingdao-map-background::after {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.28;
  background:
    radial-gradient(circle at 18% 24%, rgba(121, 210, 255, 0.24) 0 1px, transparent 2px),
    radial-gradient(circle at 72% 38%, rgba(74, 169, 255, 0.18) 0 1px, transparent 2px),
    radial-gradient(circle at 44% 72%, rgba(121, 210, 255, 0.18) 0 1px, transparent 2px),
    linear-gradient(118deg, transparent 0 32%, rgba(121, 210, 255, 0.06) 33%, transparent 36% 100%),
    linear-gradient(145deg, transparent 0 57%, rgba(27, 93, 247, 0.05) 58%, transparent 61% 100%);
  background-size:
    170px 150px,
    210px 190px,
    260px 230px,
    100% 100%,
    100% 100%;
}

.qingdao-map-background .map-layer::after {
  content: '';
  position: absolute;
  inset: 14% 18%;
  border: 1px solid rgba(121, 210, 255, 0.1);
  border-radius: 50%;
  transform: rotate(-12deg);
}

.map-layer {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 170vw;
  height: 170vh;
  opacity: 0.56;
  filter: drop-shadow(0 0 34px rgba(74, 169, 255, 0.32));
  transform: translate(-50%, -50%) rotate(-18deg);
  transform-origin: center center;
}

.map-fallback {
  position: absolute;
  right: 38px;
  bottom: 24px;
  color: rgba(125, 191, 214, 0.5);
  font-size: 12px;
}
</style>
