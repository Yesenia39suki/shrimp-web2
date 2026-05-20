import { operationConsoleData } from '@/mock/operationConsole'
import type { MonitoringFeed, ShrimpPond } from '@/types/operationConsole'

const currentPond = operationConsoleData.ponds.find((pond) => pond.id === 'B-01') as ShrimpPond

export const operationConsoleV5Mock = {
  currentPond,
  ponds: operationConsoleData.ponds,
  monitorFeeds: operationConsoleData.monitorFeeds.map((feed, index): MonitoringFeed => {
    const descriptions = [
      '水面巡检与投喂覆盖',
      '料台摄食行为识别',
      '增氧设备运行观察',
      '边缘风险区域观察',
    ]

    return {
      ...feed,
      subtitle: descriptions[index] ?? feed.subtitle,
    }
  }),
  charts: operationConsoleData.charts,
  leftWaterKeys: ['temperature', 'oxygen', 'ph', 'orp', 'ammonia'],
  navigationTabs: ['总览', '养殖场景', '投喂决策', '水质监测', '设备联动', '历史记录'],
  workspaceViews: ['场景视图', '水质视图', '设备视图', '风险视图'],
  workspaceTools: ['聚焦投喂点', '重置视图'],
}
