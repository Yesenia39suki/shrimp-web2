export type PondStatus = '运行稳定' | '重点观察' | '风险预警'

export type MetricLevel = '正常' | '关注' | '预警'

export type RiskLevel = '低' | '中' | '高'

export type TwinNodeType = '投喂中心' | '增氧设备' | '摄食活跃' | '风险点位' | '水质监测' | '成熟度'

export interface WaterQualityMetric {
  key: string
  label: string
  value: string
  trend: string
  level: MetricLevel
}

export interface ShrimpMetrics {
  averageLengthCm: number
  averageWeightG: number
  estimatedCount: number
  productionTon: number
  farmingDays: number
  maturity: number
  survivalRate: number
  growthStage: string
}

export interface FeedingStrategy {
  name: string
  recommendationFeedKg: number
  feedingTime: string
  feedingMethod: string
  frequency: string
  note: string
}

export interface ModelState {
  status: string
  confidence: number
  result: string
  updatedAt: string
}

export interface RiskSummary {
  level: RiskLevel
  summary: string
  items: string[]
}

export interface TwinNode {
  id: string
  type: TwinNodeType
  label: string
  value: string
  x: number
  y: number
  level: MetricLevel
}

export interface TwinLink {
  source: string
  target: string
  label: string
}

export interface TwinScene {
  waterBody: string
  maturityZone: string
  nodes: TwinNode[]
  links: TwinLink[]
}

export interface ShrimpPond {
  id: string
  name: string
  area: string
  status: PondStatus
  statusText: string
  waterQuality: WaterQualityMetric[]
  shrimp: ShrimpMetrics
  strategy: FeedingStrategy
  model: ModelState
  risk: RiskSummary
  twin: TwinScene
}

export interface AlertMessage {
  id: string
  level: RiskLevel
  text: string
  pondId: string
}

export interface AlertOverview {
  total: number
  high: number
  medium: number
  low: number
  messages: AlertMessage[]
}

export interface MiniStatus {
  label: string
  value: string
  level: MetricLevel
}

export interface MonitoringFeed {
  id: string
  title: string
  subtitle: string
  status: string
  level: MetricLevel
}

export interface BarChartData {
  categories: string[]
  feed: number[]
  maturity: number[]
  oxygenIndex: number[]
}

export interface LineChartData {
  dates: string[]
  temperature: number[]
  maturity: number[]
}

export interface PieChartItem {
  name: string
  value: number
}

export interface ChartData {
  bar: BarChartData
  line: LineChartData
  pie: PieChartItem[]
}

export interface OperationConsoleMockData {
  ponds: ShrimpPond[]
  alertOverview: AlertOverview
  miniStatus: MiniStatus[]
  monitorFeeds: MonitoringFeed[]
  charts: ChartData
}
