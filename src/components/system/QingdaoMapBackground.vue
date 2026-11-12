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
      throw new Error('地图文件加载失败')
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
    <div v-if="loadFailed" class="map-fallback">区域轮廓背景待加载</div>
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

.map-layer {
  position: absolute;
  left: 49%;
  top: 51%;
  width: max(900px, 120vw);
  height: 125vh;
  opacity: 0.22;
  transform: translate(-50%, -50%) rotate(-10deg);
}

.map-fallback {
  position: absolute;
  right: 24px;
  bottom: 20px;
  color: var(--text-subtle);
  font-size: 12px;
}
</style>
