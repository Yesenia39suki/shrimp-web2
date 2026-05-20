import { operationConsoleData } from '@/mock/operationConsole'
import type { MonitoringFeed, ShrimpPond } from '@/types/operationConsole'

const currentPond = operationConsoleData.ponds.find((pond) => pond.id === 'B-01') as ShrimpPond

export const operationConsoleV6Mock = {
  currentPond,
  ponds: operationConsoleData.ponds,
  alerts: operationConsoleData.alertOverview,
  charts: operationConsoleData.charts,
  monitorFeeds: [
    {
      id: 'v6-monitor-pool',
      title: '池面全景',
      subtitle: '水面巡检与投喂覆盖',
      status: '在线',
      level: '正常',
    },
    {
      id: 'v6-monitor-feed',
      title: '投喂区',
      subtitle: '料台摄食行为识别',
      status: '在线',
      level: '正常',
    },
    {
      id: 'v6-monitor-oxygen',
      title: '增氧区',
      subtitle: '增氧设备运行观察',
      status: '在线',
      level: '正常',
    },
    {
      id: 'v6-monitor-drain',
      title: '排水口',
      subtitle: '边缘风险区域观察',
      status: '关注',
      level: '关注',
    },
  ] satisfies MonitoringFeed[],
  navTabs: ['总览', '养殖场景', '投喂决策', '水质监测', '设备联动', '历史记录'],
  workspaceViews: ['场景视图', '水质视图', '设备视图', '风险视图'],
  workspaceTools: ['聚焦投喂点', '重置视图'],
  waterSummaryKeys: ['temperature', 'oxygen', 'ph', 'orp', 'ammonia'],
}
