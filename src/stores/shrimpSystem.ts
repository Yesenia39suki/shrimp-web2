import { defineStore } from 'pinia'

import { isSupabaseMode } from '@/config/dataSource'
import { getAlerts } from '@/services/alertService'
import { getDevices } from '@/services/deviceService'
import { getPondDailySnapshots } from '@/services/pondSnapshotService'
import { createPond, deletePond, getPonds, updatePond } from '@/services/pondService'
import { createRobot, deleteRobot, getRobots, getRobotStatus, updateRobot } from '@/services/robotService'
import { getShrimpDailyStats, getShrimpMeasurements } from '@/services/shrimpGrowthService'
import {
  getDefaultOrganizationId,
  getMockSystemData,
  saveBusinessConfig as saveMockBusinessConfig,
} from '@/services/mockDataService'
import { shrimpDailyMetricValue } from '@/services/mappers/shrimpMapper'
import { waterDailyMetricValue } from '@/services/mappers/waterMapper'
import { getThresholds, saveThresholds } from '@/services/thresholdService'
import { getLatestWaterData, getWaterDailyStats } from '@/services/waterDataService'
import type { PondDailySnapshot } from '@/services/mappers/snapshotMapper'
import type { BusinessConfig, Pond, Robot, WaterThreshold } from '@/types/business'
import type { WaterDailyStatsRow, ShrimpDailyStatsRow } from '@/types/database'
import type { Device } from '@/types/device'
import type { RobotStatus } from '@/types/robot'
import type { ShrimpMeasurement } from '@/types/shrimp'
import type { WaterLatest } from '@/types/water'

export type MetricSource = '水质参数' | '虾群参数' | '机器人状态' | '模型评估'
export type AlertLevel = '关注' | '预警'

export interface SystemMetric {
  key: string
  label: string
  value: number | string
  unit: string
  updatedAt: string
  trend: number[]
  description?: string
}

export interface RangeThreshold {
  min: number
  max: number
}

export interface RobotInfo {
  id: string
  name: string
  online: boolean
  pondId: string
  currentTask: string
  battery: number
  feederStatus: string
  motionStatus: string
  lastRunAt: string
  nextPlanAt: string
  abnormalStatus: string
  commands: string[]
}

export interface SystemAlert {
  id: string
  time: string
  source: MetricSource
  type: string
  reason: string
  currentValue: string
  normalRange: string
  suggestion: string
  level: AlertLevel
  metricKey?: string
}

export interface PondProfile {
  pondId: string
  species: string
  systemStatus: string
  waterMetrics: SystemMetric[]
  shrimpMetrics: SystemMetric[]
}

interface ShrimpSystemState {
  loading: boolean
  error: string
  organizationId: string
  ponds: Pond[]
  selectedPondId: string
  waterLatest: Record<string, WaterLatest | null>
  waterDailyStats: Record<string, WaterDailyStatsRow[]>
  shrimpMeasurements: Record<string, ShrimpMeasurement[]>
  shrimpDailyStats: Record<string, ShrimpDailyStatsRow[]>
  alerts: SystemAlert[]
  devices: Device[]
  snapshots: PondDailySnapshot[]
  businessConfig: BusinessConfig
  editablePonds: Pond[]
  editableRobots: Robot[]
  waterThresholdsByPond: Record<string, WaterThreshold>
  robotStatusById: Record<string, RobotStatus>
  systemMeta: {
    systemName: string
    logoText: string
    online: boolean
    currentPondId: string
    currentStatus: string
  }
  pondProfiles: PondProfile[]
  waterMetrics: SystemMetric[]
  shrimpMetrics: SystemMetric[]
  robots: RobotInfo[]
  thresholds: {
    water: Record<string, RangeThreshold>
    shrimp: Record<string, RangeThreshold>
    robot: {
      minBattery: number
      requireOnline: boolean
      normalFeederStatus: string
      normalAbnormalStatus: string
    }
    model: {
      abnormalKeywords: string[]
      recommendationRiskKeywords: string[]
    }
  }
  pondConfig: {
    pondIds: string[]
    selectedPondId: string
  }
  shrimpConfig: {
    species: string
    targetRanges: Record<string, RangeThreshold>
  }
  robotConfig: {
    robots: Array<{
      id: string
      name: string
      pondId: string
    }>
  }
}

interface EditableSystemConfig {
  ponds: Pond[]
  robots: Robot[]
  waterThresholdsByPond: Record<string, WaterThreshold>
  selectedPondId: string
}

const EDITABLE_SYSTEM_STORAGE_KEY = 'shrimp_editable_system_config'

function buildTrend(value: number, offsets: number[], precision = 1) {
  return offsets.map((offset) => Number((value + offset).toFixed(precision)))
}

function cloneMetrics(metrics: SystemMetric[]) {
  return metrics.map((metric) => ({
    ...metric,
    trend: [...metric.trend],
  }))
}

function createWaterMetrics(config: {
  updatedAt: string
  temperature: number
  oxygen: number
  ph: number
  orp: number
  turbidity: number
  ammonia: number
  nitrite: number
  hardness: number
}) {
  return [
    {
      key: 'temperature',
      label: '温度',
      value: config.temperature,
      unit: '℃',
      updatedAt: config.updatedAt,
      trend: buildTrend(config.temperature, [-0.8, -0.5, -0.3, -0.1, 0.1, 0.0, 0], 1),
    },
    {
      key: 'oxygen',
      label: '溶解氧',
      value: config.oxygen,
      unit: '毫克/升',
      updatedAt: config.updatedAt,
      trend: buildTrend(config.oxygen, [-0.4, -0.3, -0.1, 0, 0.1, 0, 0], 1),
    },
    {
      key: 'ph',
      label: 'pH',
      value: config.ph,
      unit: '',
      updatedAt: config.updatedAt,
      trend: buildTrend(config.ph, [-0.2, -0.1, 0, 0, 0.1, 0, 0], 1),
    },
    {
      key: 'orp',
      label: '氧化还原电位',
      value: config.orp,
      unit: '毫伏',
      updatedAt: config.updatedAt,
      trend: buildTrend(config.orp, [-12, -8, -4, -2, 0, 1, 0], 0),
    },
    {
      key: 'turbidity',
      label: '浊度',
      value: config.turbidity,
      unit: '度',
      updatedAt: config.updatedAt,
      trend: buildTrend(config.turbidity, [2, 1, 0, 0, -1, 0, 0], 0),
    },
    {
      key: 'ammonia',
      label: '氨氮',
      value: config.ammonia,
      unit: '毫克/升',
      updatedAt: config.updatedAt,
      trend: buildTrend(config.ammonia, [-0.03, -0.02, -0.01, 0, 0, -0.01, 0], 2),
    },
    {
      key: 'nitrite',
      label: '亚硝酸盐',
      value: config.nitrite,
      unit: '毫克/升',
      updatedAt: config.updatedAt,
      trend: buildTrend(config.nitrite, [-0.01, -0.01, 0, 0, 0, -0.01, 0], 2),
    },
    {
      key: 'hardness',
      label: '钙/镁硬度',
      value: config.hardness,
      unit: '毫克/升',
      updatedAt: config.updatedAt,
      trend: buildTrend(config.hardness, [-8, -6, -4, -2, 0, -1, 0], 0),
    },
  ] satisfies SystemMetric[]
}

function createShrimpMetrics(config: {
  updatedAt: string
  length: number
  weight: number
  count: number
  yield: number
  cultureDays: number
  maturity: number
  modelStatus: string
  modelStatusDescription: string
  modelRecommendation: string
  modelRecommendationDescription: string
}) {
  return [
    {
      key: 'length',
      label: '实测对虾长度',
      value: config.length,
      unit: '厘米',
      updatedAt: config.updatedAt,
      trend: buildTrend(config.length, [-0.7, -0.5, -0.4, -0.2, -0.1, -0.1, 0], 1),
    },
    {
      key: 'weight',
      label: '实测对虾重量',
      value: config.weight,
      unit: '克',
      updatedAt: config.updatedAt,
      trend: buildTrend(config.weight, [-1.4, -1.1, -0.8, -0.5, -0.3, -0.1, 0], 1),
    },
    {
      key: 'count',
      label: '估测对虾数量',
      value: config.count,
      unit: '万尾',
      updatedAt: config.updatedAt,
      trend: buildTrend(config.count, [2, 2, 1, 1, 0, 0, 0], 0),
    },
    {
      key: 'yield',
      label: '对虾产量',
      value: config.yield,
      unit: '吨',
      updatedAt: config.updatedAt,
      trend: buildTrend(config.yield, [-2.0, -1.6, -1.1, -0.8, -0.4, -0.2, 0], 1),
    },
    {
      key: 'cultureDays',
      label: '养殖时间',
      value: config.cultureDays,
      unit: '天',
      updatedAt: config.updatedAt,
      trend: buildTrend(config.cultureDays, [-6, -5, -4, -3, -2, -1, 0], 0),
    },
    {
      key: 'maturity',
      label: '养殖成熟度',
      value: config.maturity,
      unit: '%',
      updatedAt: config.updatedAt,
      trend: buildTrend(config.maturity, [-8, -6, -4, -3, -2, -1, 0], 0),
    },
    {
      key: 'modelStatus',
      label: '模型养殖状态评估结果',
      value: config.modelStatus,
      unit: '',
      updatedAt: config.updatedAt,
      trend: [],
      description: config.modelStatusDescription,
    },
    {
      key: 'modelRecommendation',
      label: '模型养殖决策推荐',
      value: config.modelRecommendation,
      unit: '',
      updatedAt: config.updatedAt,
      trend: [],
      description: config.modelRecommendationDescription,
    },
  ] satisfies SystemMetric[]
}

const initialPondProfiles: PondProfile[] = [
  {
    pondId: 'A-01',
    species: '南美白对虾',
    systemStatus: '运行稳定',
    waterMetrics: createWaterMetrics({
      updatedAt: '今日 09:40',
      temperature: 28,
      oxygen: 6.8,
      ph: 7.8,
      orp: 318,
      turbidity: 18,
      ammonia: 0.16,
      nitrite: 0.05,
      hardness: 188,
    }),
    shrimpMetrics: createShrimpMetrics({
      updatedAt: '今日 09:20',
      length: 8.6,
      weight: 11.8,
      count: 146,
      yield: 17.2,
      cultureDays: 61,
      maturity: 58,
      modelStatus: '状态稳定',
      modelStatusDescription: '摄食活跃度和水体承载能力均处于稳定区间。',
      modelRecommendation: '高频少量投喂',
      modelRecommendationDescription: '建议维持每日四次少量投喂，继续观察午后溶氧变化。',
    }),
  },
  {
    pondId: 'A-02',
    species: '斑节对虾',
    systemStatus: '投喂复核',
    waterMetrics: createWaterMetrics({
      updatedAt: '今日 09:38',
      temperature: 27.4,
      oxygen: 7.1,
      ph: 7.7,
      orp: 322,
      turbidity: 16,
      ammonia: 0.14,
      nitrite: 0.04,
      hardness: 192,
    }),
    shrimpMetrics: createShrimpMetrics({
      updatedAt: '今日 09:18',
      length: 8.1,
      weight: 10.9,
      count: 152,
      yield: 15.8,
      cultureDays: 56,
      maturity: 52,
      modelStatus: '生长平稳',
      modelStatusDescription: '边缘区域摄食稳定，建议维持当前节奏。',
      modelRecommendation: '常规分时投喂',
      modelRecommendationDescription: '建议保持早中晚三段式投喂，并继续观察增氧联动。',
    }),
  },
  {
    pondId: 'B-01',
    species: '南美白对虾',
    systemStatus: '水体关注',
    waterMetrics: createWaterMetrics({
      updatedAt: '今日 09:36',
      temperature: 28.6,
      oxygen: 5.4,
      ph: 7.9,
      orp: 309,
      turbidity: 21,
      ammonia: 0.22,
      nitrite: 0.07,
      hardness: 181,
    }),
    shrimpMetrics: createShrimpMetrics({
      updatedAt: '今日 09:16',
      length: 8.9,
      weight: 12.4,
      count: 141,
      yield: 18.1,
      cultureDays: 64,
      maturity: 61,
      modelStatus: '局部应激关注',
      modelStatusDescription: '午后水层温差扩大，建议继续复核溶氧变化。',
      modelRecommendation: '午后补氧后再投喂',
      modelRecommendationDescription: '建议先执行增氧联动，再启动少量补投。',
    }),
  },
  {
    pondId: 'C-03',
    species: '日本囊对虾',
    systemStatus: '增长偏快',
    waterMetrics: createWaterMetrics({
      updatedAt: '今日 09:35',
      temperature: 29.3,
      oxygen: 6.2,
      ph: 8.1,
      orp: 327,
      turbidity: 15,
      ammonia: 0.12,
      nitrite: 0.03,
      hardness: 196,
    }),
    shrimpMetrics: createShrimpMetrics({
      updatedAt: '今日 09:14',
      length: 9.4,
      weight: 13.3,
      count: 138,
      yield: 19.6,
      cultureDays: 68,
      maturity: 66,
      modelStatus: '增重良好',
      modelStatusDescription: '该池成熟度提升较快，摄食转化效率高。',
      modelRecommendation: '保持当前投喂并强化巡检',
      modelRecommendationDescription: '建议保持当前投喂量，并增加夜间一次巡检。',
    }),
  },
  {
    pondId: 'D-05',
    species: '斑节对虾',
    systemStatus: '风险预警',
    waterMetrics: createWaterMetrics({
      updatedAt: '今日 09:34',
      temperature: 30.1,
      oxygen: 4.9,
      ph: 8.3,
      orp: 301,
      turbidity: 24,
      ammonia: 0.31,
      nitrite: 0.11,
      hardness: 176,
    }),
    shrimpMetrics: createShrimpMetrics({
      updatedAt: '今日 09:12',
      length: 8.2,
      weight: 10.4,
      count: 134,
      yield: 14.9,
      cultureDays: 59,
      maturity: 49,
      modelStatus: '低氧风险预警',
      modelStatusDescription: '模型识别到低氧和高温叠加风险，需要谨慎投喂。',
      modelRecommendation: '减量投喂并立即复测',
      modelRecommendationDescription: '建议先减量投喂 20%，并在 30 分钟内复测溶氧与氨氮。',
    }),
  },
]

const initialRobots: RobotInfo[] = [
  {
    id: 'RB-01',
    name: '一号投喂巡检机器人',
    online: true,
    pondId: 'A-01',
    currentTask: '池面巡航与投喂校验',
    battery: 82,
    feederStatus: '正常',
    motionStatus: '巡航中',
    lastRunAt: '今日 09:10',
    nextPlanAt: '今日 11:30',
    abnormalStatus: '无',
    commands: ['09:10 执行池面巡航', '08:50 校验投喂机状态', '08:30 上传水质采样结果'],
  },
  {
    id: 'RB-02',
    name: '二号增氧联动机器人',
    online: true,
    pondId: 'A-02',
    currentTask: '增氧区设备观察',
    battery: 76,
    feederStatus: '正常',
    motionStatus: '待命',
    lastRunAt: '今日 08:55',
    nextPlanAt: '今日 10:40',
    abnormalStatus: '无',
    commands: ['08:55 返回待命点', '08:35 完成增氧区巡检', '08:20 接收水质联动任务'],
  },
  {
    id: 'RB-03',
    name: '三号水质采样机器人',
    online: true,
    pondId: 'B-01',
    currentTask: '水质采样与边缘巡检',
    battery: 68,
    feederStatus: '正常',
    motionStatus: '采样中',
    lastRunAt: '今日 09:18',
    nextPlanAt: '今日 12:10',
    abnormalStatus: '无',
    commands: ['09:18 开始水质采样', '09:02 校准采样臂', '08:46 上传边缘点位图像'],
  },
  {
    id: 'RB-04',
    name: '四号料台观察机器人',
    online: true,
    pondId: 'C-03',
    currentTask: '料台摄食行为观察',
    battery: 59,
    feederStatus: '正常',
    motionStatus: '定点观察',
    lastRunAt: '今日 09:05',
    nextPlanAt: '今日 11:05',
    abnormalStatus: '无',
    commands: ['09:05 进入料台观察点', '08:42 完成摄食图像上传', '08:20 接收投喂复核任务'],
  },
  {
    id: 'RB-05',
    name: '五号投喂辅助机器人',
    online: true,
    pondId: 'D-05',
    currentTask: '投喂路径待命',
    battery: 71,
    feederStatus: '正常',
    motionStatus: '待命',
    lastRunAt: '今日 08:48',
    nextPlanAt: '今日 10:30',
    abnormalStatus: '无',
    commands: ['08:48 返回待命点', '08:28 完成路径复核', '08:06 同步投喂计划'],
  },
]

const defaultPondProfile = initialPondProfiles[0]!
const defaultOrganizationId = getDefaultOrganizationId()
const defaultSystemData = getMockSystemData(defaultOrganizationId)

function isNumberValue(value: number | string): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function formatValue(metric: SystemMetric) {
  return `${metric.value}${metric.unit}`
}

function formatRange(range: RangeThreshold, unit: string) {
  return `${range.min}${unit} - ${range.max}${unit}`
}

function buildRangeAlerts(
  metrics: SystemMetric[],
  thresholds: Record<string, RangeThreshold>,
  source: MetricSource,
): SystemAlert[] {
  return metrics.flatMap((metric) => {
    const range = thresholds[metric.key]

    if (!range || !isNumberValue(metric.value)) {
      return []
    }

    if (metric.value >= range.min && metric.value <= range.max) {
      return []
    }

    const isHigh = metric.value > range.max
    const type = isHigh ? '超过上限' : '低于下限'

    return [
      {
        id: `${source}-${metric.key}`,
        time: metric.updatedAt,
        source,
        type: `${metric.label}${type}`,
        reason: `${metric.label}当前值${type}，已经偏离用户配置的正常范围。`,
        currentValue: formatValue(metric),
        normalRange: formatRange(range, metric.unit),
        suggestion: isHigh
          ? `建议复核${metric.label}传感器，并调整投喂、增氧或换水策略。`
          : `建议检查${metric.label}偏低原因，并复核设备运行与水体交换情况。`,
        level: source === '水质参数' ? '预警' : '关注',
        metricKey: metric.key,
      },
    ]
  })
}

function metricText(metrics: SystemMetric[], key: string) {
  return String(metrics.find((metric) => metric.key === key)?.value ?? '')
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function cloneData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function readEditableConfigMap() {
  if (!canUseLocalStorage()) {
    return {} as Record<string, EditableSystemConfig>
  }

  try {
    return JSON.parse(window.localStorage.getItem(EDITABLE_SYSTEM_STORAGE_KEY) ?? '{}') as Record<
      string,
      EditableSystemConfig
    >
  } catch {
    return {}
  }
}

function writeEditableConfig(organizationId: string, config: EditableSystemConfig) {
  if (!canUseLocalStorage()) {
    return
  }

  const configs = readEditableConfigMap()
  configs[organizationId] = cloneData(config)
  window.localStorage.setItem(EDITABLE_SYSTEM_STORAGE_KEY, JSON.stringify(configs))
}

function toWaterThreshold(
  organizationId: string,
  pondId: string,
  ranges: Record<string, RangeThreshold>,
): WaterThreshold {
  return {
    id: `threshold-${organizationId}-${pondId}`,
    organization_id: organizationId,
    pond_id: pondId,
    temperature: { ...ranges.temperature! },
    oxygen: { ...ranges.oxygen! },
    ph: { ...ranges.ph! },
    orp: { ...ranges.orp! },
    turbidity: { ...ranges.turbidity! },
    ammonia: { ...ranges.ammonia! },
    nitrite: { ...ranges.nitrite! },
    hardness: { ...ranges.hardness! },
  }
}

function waterThresholdToRangeRecord(threshold: WaterThreshold): Record<string, RangeThreshold> {
  return {
    temperature: { ...threshold.temperature },
    oxygen: { ...threshold.oxygen },
    ph: { ...threshold.ph },
    orp: { ...threshold.orp },
    turbidity: { ...threshold.turbidity },
    ammonia: { ...threshold.ammonia },
    nitrite: { ...threshold.nitrite },
    hardness: { ...threshold.hardness },
  }
}

function buildEditablePonds(
  organizationId: string,
  systemData: ReturnType<typeof getMockSystemData>,
) {
  const primaryPond = systemData.businessConfig.pond

  return systemData.pondProfiles.map((profile, index) => {
    if (profile.pondId === primaryPond.pond_code || index === 0) {
      return {
        ...primaryPond,
        organization_id: organizationId,
        pond_code: profile.pondId,
        shrimp_species: profile.species,
      }
    }

    return {
      id: `pond-${organizationId}-${profile.pondId}`,
      organization_id: organizationId,
      pond_code: profile.pondId,
      pond_name: `${profile.pondId} 号养殖池`,
      shrimp_species: profile.species,
      area: Number((primaryPond.area || 20).toFixed(1)),
      water_depth: Number((primaryPond.water_depth || 1.5).toFixed(2)),
      location: primaryPond.location,
    } satisfies Pond
  })
}

function buildEditableRobots(
  organizationId: string,
  systemData: ReturnType<typeof getMockSystemData>,
) {
  const primaryRobot = systemData.businessConfig.robot

  return systemData.robots.map((robot, index) => {
    if (robot.id === primaryRobot.robot_code || index === 0) {
      return {
        ...primaryRobot,
        organization_id: organizationId,
        pond_id: robot.pondId,
        robot_code: robot.id,
        robot_name: robot.name,
      }
    }

    return {
      id: `robot-${organizationId}-${robot.id}`,
      organization_id: organizationId,
      pond_id: robot.pondId,
      robot_code: robot.id,
      robot_name: robot.name,
      robot_type: robot.currentTask.includes('增氧')
        ? '增氧联动型'
        : robot.currentTask.includes('采样')
          ? '水质采样型'
          : '投喂巡检型',
    } satisfies Robot
  })
}

function buildThresholdsByPond(
  organizationId: string,
  pondIds: string[],
  baseRanges: Record<string, RangeThreshold>,
) {
  return pondIds.reduce<Record<string, WaterThreshold>>((result, pondId) => {
    result[pondId] = toWaterThreshold(organizationId, pondId, baseRanges)
    return result
  }, {})
}

function formatRuntimeTime(value?: string) {
  if (!value) return '暂无'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(
    2,
    '0',
  )} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function emptyPond(organizationId: string): Pond {
  return {
    id: `empty-pond-${organizationId}`,
    organization_id: organizationId,
    pond_code: '暂无',
    pond_name: '暂无池塘，请先添加',
    shrimp_species: '暂无',
    area: 0,
    water_depth: 0,
    location: '暂无',
  }
}

function emptyRobot(organizationId: string, pondCode: string): Robot {
  return {
    id: `empty-robot-${organizationId}`,
    organization_id: organizationId,
    pond_id: pondCode,
    robot_code: '暂无',
    robot_name: '暂无机器人，请先添加',
    robot_type: '暂无',
    status: '暂无',
  }
}

function emptyThreshold(organizationId: string, pondCode: string): WaterThreshold {
  return toWaterThreshold(organizationId, pondCode, {
    temperature: { min: 20, max: 35 },
    oxygen: { min: 5, max: 9 },
    ph: { min: 7, max: 8.6 },
    orp: { min: 250, max: 420 },
    turbidity: { min: 0, max: 30 },
    ammonia: { min: 0, max: 0.3 },
    nitrite: { min: 0, max: 0.12 },
    hardness: { min: 120, max: 260 },
  })
}

function buildSupabaseWaterMetrics(
  latest: WaterLatest | null,
  dailyRows: WaterDailyStatsRow[],
): SystemMetric[] {
  const reading = latest?.reading
  const updatedAt = formatRuntimeTime(latest?.updatedAt ?? reading?.recordedAt)
  const items = [
    ['temperature', '温度', '℃', reading?.temperature],
    ['oxygen', '溶解氧', '毫克/升', reading?.dissolvedOxygen],
    ['ph', 'pH', '', reading?.ph],
    ['orp', '氧化还原电位', '毫伏', reading?.orp],
    ['turbidity', '浊度', '度', reading?.turbidity],
    ['ammonia', '氨氮', '毫克/升', reading?.ammonia],
    ['nitrite', '亚硝酸盐', '毫克/升', reading?.nitrite],
    ['hardness', '钙/镁硬度', '毫克/升', reading?.hardness],
  ] as const

  return items.map(([key, label, unit, value]) => ({
    key,
    label,
    value: value ?? '暂无',
    unit,
    updatedAt,
    trend: dailyRows.map((row) => waterDailyMetricValue(row, key)),
  }))
}

function buildSupabaseShrimpMetrics(input: {
  organizationId: string
  pondId: string
  measurements: ShrimpMeasurement[]
  dailyRows: ShrimpDailyStatsRow[]
}) {
  const latestMeasurement = [...input.measurements].sort((a, b) =>
    a.measuredAt.localeCompare(b.measuredAt),
  )[input.measurements.length - 1]
  const latestDaily = input.dailyRows[input.dailyRows.length - 1]
  const updatedAt = formatRuntimeTime(latestMeasurement?.measuredAt ?? latestDaily?.updated_at)
  const metricValues = {
    length: latestMeasurement?.average_length_cm ?? latestDaily?.avg_length_cm,
    weight: latestMeasurement?.average_weight_g ?? latestDaily?.avg_weight_g,
    count: latestDaily?.estimated_count ? Number((latestDaily.estimated_count / 10_000).toFixed(1)) : undefined,
    yield: latestDaily?.estimated_yield_kg ? Number((latestDaily.estimated_yield_kg / 1000).toFixed(1)) : undefined,
    cultureDays: undefined,
    maturity: latestDaily?.maturity_percent,
  }
  const items = [
    ['length', '实测对虾长度', '厘米', metricValues.length],
    ['weight', '实测对虾重量', '克', metricValues.weight],
    ['count', '估测对虾数量', '万尾', metricValues.count],
    ['yield', '对虾产量', '吨', metricValues.yield],
    ['cultureDays', '养殖时间', '天', metricValues.cultureDays],
    ['maturity', '养殖成熟度', '%', metricValues.maturity],
  ] as const

  return [
    ...items.map(([key, label, unit, value]) => ({
      key,
      label,
      value: value ?? '暂无',
      unit,
      updatedAt,
      trend: input.dailyRows.map((row) => shrimpDailyMetricValue(row, key)),
    })),
    {
      key: 'modelStatus',
      label: '模型养殖状态评估结果',
      value: '暂无 AI 评估',
      unit: '',
      updatedAt,
      trend: [],
      description: '后续由 AI 决策中心生成并持久化。',
    },
    {
      key: 'modelRecommendation',
      label: '模型养殖决策推荐',
      value: '暂无 AI 建议',
      unit: '',
      updatedAt,
      trend: [],
      description: '后续由 AI 投喂建议生成并持久化。',
    },
  ] satisfies SystemMetric[]
}

function mapDatabaseAlert(alert: {
  id: string
  createdAt: string
  type: string
  level: string
  title: string
  content: string
  pondId?: string
}) {
  const sourceMap: Record<string, MetricSource> = {
    water_quality: '水质参数',
    robot_fault: '机器人状态',
    feeding: '模型评估',
    growth: '虾群参数',
    device: '机器人状态',
    ai: '模型评估',
  }

  return {
    id: alert.id,
    time: formatRuntimeTime(alert.createdAt),
    source: sourceMap[alert.type] ?? '模型评估',
    type: alert.title,
    reason: alert.content,
    currentValue: alert.pondId ?? '数据库报警',
    normalRange: '见报警详情',
    suggestion: '请进入报警中心处理。',
    level: alert.level === 'critical' || alert.level === 'warning' ? '预警' : '关注',
  } satisfies SystemAlert
}

function createRecentTimeRange(days = 30) {
  return {
    startAt: new Date(Date.now() - days * 24 * 60 * 60_000).toISOString(),
    endAt: new Date().toISOString(),
  }
}

export const useShrimpSystemStore = defineStore('shrimpSystem', {
  state: (): ShrimpSystemState => ({
    loading: false,
    error: '',
    organizationId: defaultOrganizationId,
    ponds: buildEditablePonds(defaultOrganizationId, defaultSystemData),
    selectedPondId: defaultPondProfile.pondId,
    waterLatest: {},
    waterDailyStats: {},
    shrimpMeasurements: {},
    shrimpDailyStats: {},
    alerts: [],
    devices: [],
    snapshots: [],
    businessConfig: defaultSystemData.businessConfig,
    editablePonds: buildEditablePonds(defaultOrganizationId, defaultSystemData),
    editableRobots: buildEditableRobots(defaultOrganizationId, defaultSystemData),
    waterThresholdsByPond: buildThresholdsByPond(
      defaultOrganizationId,
      defaultSystemData.pondConfig.pondIds,
      defaultSystemData.thresholds.water,
    ),
    robotStatusById: {},
    systemMeta: {
      systemName: '虾群养殖投喂系统',
      logoText: 'UpcShrimpFeeding',
      online: true,
      currentPondId: defaultPondProfile.pondId,
      currentStatus: defaultPondProfile.systemStatus,
    },
    pondProfiles: initialPondProfiles,
    waterMetrics: cloneMetrics(defaultPondProfile.waterMetrics),
    shrimpMetrics: cloneMetrics(defaultPondProfile.shrimpMetrics),
    robots: initialRobots,
    thresholds: {
      water: {
        temperature: { min: 20, max: 35 },
        oxygen: { min: 5, max: 9 },
        ph: { min: 7, max: 8.6 },
        orp: { min: 250, max: 420 },
        turbidity: { min: 0, max: 30 },
        ammonia: { min: 0, max: 0.3 },
        nitrite: { min: 0, max: 0.12 },
        hardness: { min: 120, max: 260 },
      },
      shrimp: {
        length: { min: 6, max: 13 },
        weight: { min: 8, max: 20 },
        count: { min: 120, max: 160 },
        yield: { min: 12, max: 26 },
        cultureDays: { min: 45, max: 90 },
        maturity: { min: 45, max: 85 },
      },
      robot: {
        minBattery: 30,
        requireOnline: true,
        normalFeederStatus: '正常',
        normalAbnormalStatus: '无',
      },
      model: {
        abnormalKeywords: ['异常', '风险', '预警', '低氧', '病害'],
        recommendationRiskKeywords: ['暂停', '减量', '复测', '风险抑制'],
      },
    },
    pondConfig: {
      pondIds: initialPondProfiles.map((profile) => profile.pondId),
      selectedPondId: defaultPondProfile.pondId,
    },
    shrimpConfig: {
      species: '南美白对虾、斑节对虾、日本囊对虾',
      targetRanges: {
        length: { min: 6, max: 13 },
        weight: { min: 8, max: 20 },
        maturity: { min: 45, max: 85 },
      },
    },
    robotConfig: {
      robots: initialRobots.map((robot) => ({
        id: robot.id,
        name: robot.name,
        pondId: robot.pondId,
      })),
    },
  }),
  getters: {
    selectedPondProfile(state): PondProfile | undefined {
      return state.pondProfiles.find(
        (profile) => profile.pondId === state.pondConfig.selectedPondId,
      )
    },
    waterAlerts(state): SystemAlert[] {
      if (isSupabaseMode) {
        return state.alerts.filter((alert) => alert.source === '水质参数')
      }

      return buildRangeAlerts(state.waterMetrics, state.thresholds.water, '水质参数')
    },
    shrimpAlerts(state): SystemAlert[] {
      if (isSupabaseMode) {
        return state.alerts.filter((alert) => alert.source === '虾群参数')
      }

      return buildRangeAlerts(state.shrimpMetrics, state.thresholds.shrimp, '虾群参数')
    },
    robotAlerts(state): SystemAlert[] {
      if (isSupabaseMode) {
        return state.alerts.filter((alert) => alert.source === '机器人状态')
      }

      return state.robots.flatMap((robot) => {
        const alerts: SystemAlert[] = []
        const config = state.robotConfig.robots.find((item) => item.id === robot.id)
        const robotName = config?.name ?? robot.name
        const pondId = config?.pondId ?? robot.pondId

        if (state.thresholds.robot.requireOnline && !robot.online) {
          alerts.push({
            id: `robot-${robot.id}-offline`,
            time: robot.lastRunAt,
            source: '机器人状态',
            type: '机器人离线',
            reason: `${robotName}处于离线状态，当前绑定虾池为 ${pondId}。`,
            currentValue: '离线',
            normalRange: '在线',
            suggestion: '请检查机器人网络、电源和调度连接状态。',
            level: '预警',
          })
        }

        if (robot.battery < state.thresholds.robot.minBattery) {
          alerts.push({
            id: `robot-${robot.id}-battery`,
            time: robot.lastRunAt,
            source: '机器人状态',
            type: '电量低于阈值',
            reason: `${robotName}电量低于用户配置的最低电量。`,
            currentValue: `${robot.battery}%`,
            normalRange: `不低于 ${state.thresholds.robot.minBattery}%`,
            suggestion: '建议安排机器人返回充电点，避免任务中断。',
            level: '关注',
          })
        }

        if (robot.feederStatus !== state.thresholds.robot.normalFeederStatus) {
          alerts.push({
            id: `robot-${robot.id}-feeder`,
            time: robot.lastRunAt,
            source: '机器人状态',
            type: '投喂机状态异常',
            reason: `${robotName}投喂机状态为 ${robot.feederStatus}。`,
            currentValue: robot.feederStatus,
            normalRange: state.thresholds.robot.normalFeederStatus,
            suggestion: '请复核投喂机料仓、出料口和执行机构。',
            level: '预警',
          })
        }

        if (robot.abnormalStatus !== state.thresholds.robot.normalAbnormalStatus) {
          alerts.push({
            id: `robot-${robot.id}-abnormal`,
            time: robot.lastRunAt,
            source: '机器人状态',
            type: '机器人异常状态',
            reason: `${robotName}异常状态为 ${robot.abnormalStatus}。`,
            currentValue: robot.abnormalStatus,
            normalRange: state.thresholds.robot.normalAbnormalStatus,
            suggestion: '请查看最近指令记录，并安排人工复核。',
            level: '预警',
          })
        }

        return alerts
      })
    },
    modelAlerts(state): SystemAlert[] {
      if (isSupabaseMode) {
        return state.alerts.filter((alert) => alert.source === '模型评估')
      }

      const modelStatus = metricText(state.shrimpMetrics, 'modelStatus')
      const recommendation = metricText(state.shrimpMetrics, 'modelRecommendation')
      const alerts: SystemAlert[] = []
      const statusTriggered = state.thresholds.model.abnormalKeywords.some((word) =>
        modelStatus.includes(word),
      )
      const recommendationTriggered = state.thresholds.model.recommendationRiskKeywords.some(
        (word) => recommendation.includes(word),
      )

      if (statusTriggered) {
        alerts.push({
          id: 'model-status-alert',
          time:
            state.shrimpMetrics.find((metric) => metric.key === 'modelStatus')?.updatedAt ?? '当前',
          source: '模型评估',
          type: '模型状态异常',
          reason: '模型养殖状态评估结果命中了用户配置的异常关键词。',
          currentValue: modelStatus,
          normalRange: `不包含：${state.thresholds.model.abnormalKeywords.join('、')}`,
          suggestion: '请复核模型输入数据，并结合现场水质和摄食情况判断。',
          level: '预警',
          metricKey: 'modelStatus',
        })
      }

      if (recommendationTriggered) {
        alerts.push({
          id: 'model-recommendation-alert',
          time:
            state.shrimpMetrics.find((metric) => metric.key === 'modelRecommendation')?.updatedAt ??
            '当前',
          source: '模型评估',
          type: '模型决策关注',
          reason: '模型养殖决策推荐命中了用户配置的风险关键词。',
          currentValue: recommendation,
          normalRange: `不包含：${state.thresholds.model.recommendationRiskKeywords.join('、')}`,
          suggestion: '请在执行投喂策略前确认风险点位和设备联动状态。',
          level: '关注',
          metricKey: 'modelRecommendation',
        })
      }

      return alerts
    },
    allAlerts(): SystemAlert[] {
      if (isSupabaseMode) {
        return this.alerts
      }

      return [...this.waterAlerts, ...this.shrimpAlerts, ...this.robotAlerts, ...this.modelAlerts]
    },
    activeAlertCount(): number {
      return this.allAlerts.length
    },
    hasActiveAlert(): boolean {
      return this.activeAlertCount > 0
    },
    getWaterMetricByKey: (state) => {
      return (metricKey: string) => state.waterMetrics.find((metric) => metric.key === metricKey)
    },
    getShrimpMetricByKey: (state) => {
      return (metricKey: string) => state.shrimpMetrics.find((metric) => metric.key === metricKey)
    },
  },
  actions: {
    async loadSupabaseOrganizationData(organizationId: string) {
      this.loading = true
      this.error = ''
      this.organizationId = organizationId
      this.ponds = []
      this.editablePonds = []
      this.editableRobots = []
      this.pondProfiles = []
      this.waterMetrics = []
      this.shrimpMetrics = []
      this.robots = []
      this.waterLatest = {}
      this.waterDailyStats = {}
      this.shrimpMeasurements = {}
      this.shrimpDailyStats = {}
      this.alerts = []
      this.devices = []
      this.snapshots = []
      this.robotStatusById = {}

      try {
        const timeRange = createRecentTimeRange(30)
        const [ponds, robots, devices, alerts] = await Promise.all([
          getPonds(organizationId),
          getRobots(organizationId),
          getDevices(organizationId),
          getAlerts(organizationId, { readStatus: 'unread' }),
        ])
        const selectedPond =
          ponds.find((pond) => pond.pond_code === this.pondConfig.selectedPondId) ?? ponds[0]
        const selectedPondCode = selectedPond?.pond_code ?? '暂无'
        const pondCodeByUuid = new Map(ponds.map((pond) => [pond.id, pond.pond_code]))
        const editableRobots = robots.map((robot) => ({
          ...robot,
          pond_id: pondCodeByUuid.get(robot.pond_id) ?? robot.pond_id,
        }))
        const thresholdsByPond: Record<string, WaterThreshold> = {}
        const waterLatest: Record<string, WaterLatest | null> = {}
        const waterDailyStats: Record<string, WaterDailyStatsRow[]> = {}
        const shrimpMeasurements: Record<string, ShrimpMeasurement[]> = {}
        const shrimpDailyStats: Record<string, ShrimpDailyStatsRow[]> = {}
        const snapshots: PondDailySnapshot[] = []
        const robotStatusById: Record<string, RobotStatus> = {}
        const profiles = await Promise.all(
          ponds.map(async (pond) => {
            const pondCode = pond.pond_code
            const [threshold, latest, waterDaily, measurements, shrimpDaily, pondSnapshots] =
              await Promise.all([
                getThresholds(organizationId, pond.id).catch(() =>
                  emptyThreshold(organizationId, pondCode),
                ),
                getLatestWaterData(organizationId, pond.id).catch(() => null),
                getWaterDailyStats(organizationId, pond.id, timeRange).catch(() => []),
                getShrimpMeasurements(organizationId, pond.id, timeRange).catch(() => []),
                getShrimpDailyStats(organizationId, pond.id, timeRange).catch(() => []),
                getPondDailySnapshots(organizationId, pond.id, timeRange).catch(() => []),
              ])

            thresholdsByPond[pondCode] = {
              ...threshold,
              organization_id: organizationId,
              pond_id: pondCode,
            }
            waterLatest[pondCode] = latest
            waterDailyStats[pondCode] = waterDaily
            shrimpMeasurements[pondCode] = measurements
            shrimpDailyStats[pondCode] = shrimpDaily
            snapshots.push(...pondSnapshots)

            const pondAlerts = alerts.filter(
              (alert) => !alert.pondId || alert.pondId === pond.id || alert.pondId === pondCode,
            )
            const hasCritical = pondAlerts.some((alert) => alert.level === 'critical')
            const hasWarning = pondAlerts.some((alert) => alert.level === 'warning')

            return {
              pondId: pondCode,
              species: pond.shrimp_species,
              systemStatus: hasCritical ? '风险预警' : hasWarning ? '需要关注' : '运行稳定',
              waterMetrics: buildSupabaseWaterMetrics(latest, waterDaily),
              shrimpMetrics: buildSupabaseShrimpMetrics({
                organizationId,
                pondId: pondCode,
                measurements,
                dailyRows: shrimpDaily,
              }),
            } satisfies PondProfile
          }),
        )
        const robotInfos = await Promise.all(
          editableRobots.map(async (robot) => {
            const status = await getRobotStatus(organizationId, robot.id).catch(() => null)

            if (status) {
              robotStatusById[robot.id] = status
              robotStatusById[robot.robot_code] = status
            }

            return {
              id: robot.robot_code,
              name: robot.robot_name,
              online: status?.online ?? robot.status !== '离线',
              pondId: robot.pond_id,
              currentTask: robot.status ?? '待命',
              battery: status?.battery ?? 0,
              feederStatus: '待接入',
              motionStatus: status?.workMode ?? robot.status ?? '待命',
              lastRunAt: formatRuntimeTime(status?.updatedAt ?? robot.updated_at),
              nextPlanAt: '暂无计划',
              abnormalStatus: status?.faultCode ?? '无',
              commands: [],
            } satisfies RobotInfo
          }),
        )
        const selectedThreshold =
          thresholdsByPond[selectedPondCode] ?? emptyThreshold(organizationId, selectedPondCode)
        const selectedRobot =
          editableRobots.find((robot) => robot.pond_id === selectedPondCode) ??
          editableRobots[0] ??
          emptyRobot(organizationId, selectedPondCode)
        const selectedBusinessPond = selectedPond ?? emptyPond(organizationId)
        const selectedProfile = profiles.find((profile) => profile.pondId === selectedPondCode)

        this.ponds = cloneData(ponds)
        this.editablePonds = cloneData(ponds)
        this.editableRobots = cloneData(editableRobots)
        this.waterThresholdsByPond = cloneData(thresholdsByPond)
        this.waterLatest = waterLatest
        this.waterDailyStats = waterDailyStats
        this.shrimpMeasurements = shrimpMeasurements
        this.shrimpDailyStats = shrimpDailyStats
        this.devices = devices
        this.snapshots = snapshots
        this.robotStatusById = cloneData(robotStatusById)
        this.alerts = alerts.map((alert) =>
          mapDatabaseAlert({
            ...alert,
            pondId: alert.pondId ? (pondCodeByUuid.get(alert.pondId) ?? alert.pondId) : undefined,
          }),
        )
        this.systemMeta = {
          systemName: '虾群养殖投喂系统',
          logoText: '智慧养殖系统',
          online: devices.some((device) => device.status === 'online') || robotInfos.some((robot) => robot.online),
          currentPondId: selectedPondCode,
          currentStatus: selectedProfile?.systemStatus ?? '暂无数据',
        }
        this.pondProfiles = profiles
        this.robots = robotInfos
        this.thresholds = {
          ...this.thresholds,
          water: waterThresholdToRangeRecord(selectedThreshold),
        }
        this.pondConfig = {
          pondIds: ponds.map((pond) => pond.pond_code),
          selectedPondId: selectedPondCode,
        }
        this.selectedPondId = selectedPondCode
        this.shrimpConfig = {
          ...this.shrimpConfig,
          species: ponds.map((pond) => pond.shrimp_species).filter(Boolean).join('、') || '暂无',
        }
        this.robotConfig = {
          robots: robotInfos.map((robot) => ({
            id: robot.id,
            name: robot.name,
            pondId: robot.pondId,
          })),
        }
        this.businessConfig = {
          organization_id: organizationId,
          pond: cloneData(selectedBusinessPond),
          robot: cloneData(selectedRobot),
          waterThreshold: cloneData(selectedThreshold),
        }
        this.selectPond(selectedPondCode)
      } catch (error) {
        this.error = error instanceof Error ? error.message : '数据库连接失败'
        throw error
      } finally {
        this.loading = false
      }
    },
    async loadOrganizationData(organizationId: string) {
      if (isSupabaseMode) {
        await this.loadSupabaseOrganizationData(organizationId)
        return
      }

      const systemData = getMockSystemData(organizationId)
      const savedEditableConfig = readEditableConfigMap()[organizationId]
      const defaultPonds = buildEditablePonds(organizationId, systemData)
      const defaultRobots = buildEditableRobots(organizationId, systemData)
      const defaultThresholdsByPond = buildThresholdsByPond(
        organizationId,
        defaultPonds.map((pond) => pond.pond_code),
        systemData.thresholds.water,
      )
      const editablePonds = savedEditableConfig?.ponds?.length
        ? savedEditableConfig.ponds
        : defaultPonds
      const editableRobots = savedEditableConfig?.robots?.length
        ? savedEditableConfig.robots
        : defaultRobots
      const waterThresholdsByPond = {
        ...defaultThresholdsByPond,
        ...(savedEditableConfig?.waterThresholdsByPond ?? {}),
      }
      const selectedPondId =
        savedEditableConfig?.selectedPondId &&
        editablePonds.some((pond) => pond.pond_code === savedEditableConfig.selectedPondId)
          ? savedEditableConfig.selectedPondId
          : editablePonds[0]?.pond_code

      this.loading = false
      this.error = ''
      this.organizationId = organizationId
      this.ponds = cloneData(editablePonds)
      this.selectedPondId = selectedPondId ?? systemData.pondConfig.selectedPondId
      this.waterLatest = {}
      this.waterDailyStats = {}
      this.shrimpMeasurements = {}
      this.shrimpDailyStats = {}
      this.alerts = []
      this.devices = []
      this.snapshots = []
      this.robotStatusById = {}
      this.businessConfig = systemData.businessConfig
      this.systemMeta = systemData.systemMeta
      this.pondProfiles = systemData.pondProfiles
      this.waterMetrics = cloneMetrics(systemData.waterMetrics)
      this.shrimpMetrics = cloneMetrics(systemData.shrimpMetrics)
      this.robots = systemData.robots
      this.thresholds = systemData.thresholds
      this.pondConfig = systemData.pondConfig
      this.shrimpConfig = systemData.shrimpConfig
      this.robotConfig = systemData.robotConfig
      this.editablePonds = cloneData(editablePonds)
      this.editableRobots = cloneData(editableRobots)
      this.waterThresholdsByPond = cloneData(waterThresholdsByPond)
      this.rebuildEditableRuntime(selectedPondId ?? systemData.pondConfig.selectedPondId)
    },
    async saveBusinessConfig(config: BusinessConfig) {
      if (isSupabaseMode) {
        await Promise.all([
          updatePond(this.organizationId, config.pond.id, config.pond),
          updateRobot(this.organizationId, config.robot.id, config.robot),
          saveThresholds(
            this.organizationId,
            config.pond.pond_code,
            config.waterThreshold,
          ),
        ])
        await this.loadSupabaseOrganizationData(this.organizationId)
        return
      }

      saveMockBusinessConfig(this.organizationId, config)
      this.loadOrganizationData(this.organizationId)
    },
    persistEditableRuntime() {
      if (isSupabaseMode) {
        return
      }

      writeEditableConfig(this.organizationId, {
        ponds: this.editablePonds,
        robots: this.editableRobots,
        waterThresholdsByPond: this.waterThresholdsByPond,
        selectedPondId: this.pondConfig.selectedPondId,
      })
    },
    rebuildRobotRuntimeFromEditable() {
      const robotInfos = this.editableRobots.map((robot) => {
        const status = this.robotStatusById[robot.id] ?? this.robotStatusById[robot.robot_code]

        return {
          id: robot.robot_code,
          name: robot.robot_name,
          online: status?.online ?? robot.status !== '离线',
          pondId: robot.pond_id,
          currentTask: robot.status ?? '待命',
          battery: status?.battery ?? 0,
          feederStatus: '待接入',
          motionStatus: status?.workMode ?? robot.status ?? '待命',
          lastRunAt: formatRuntimeTime(status?.updatedAt ?? robot.updated_at),
          nextPlanAt: '暂无计划',
          abnormalStatus: status?.faultCode ?? '无',
          commands: [],
        } satisfies RobotInfo
      })

      this.robots = robotInfos
      this.robotConfig = {
        robots: robotInfos.map((robot) => ({
          id: robot.id,
          name: robot.name,
          pondId: robot.pondId,
        })),
      }
      this.systemMeta = {
        ...this.systemMeta,
        online:
          this.devices.some((device) => device.status === 'online') ||
          robotInfos.some((robot) => robot.online),
      }

      const selectedRobot =
        this.editableRobots.find((robot) => robot.pond_id === this.pondConfig.selectedPondId) ??
        this.editableRobots[0]

      if (selectedRobot) {
        this.businessConfig = {
          ...this.businessConfig,
          organization_id: this.organizationId,
          robot: cloneData(selectedRobot),
        }
      }
    },
    async reloadSupabaseRobots(selectedRobotId?: string) {
      const robots = await getRobots(this.organizationId)
      const pondCodeByUuid = new Map(this.editablePonds.map((pond) => [pond.id, pond.pond_code]))
      const editableRobots = robots.map((robot) => ({
        ...robot,
        pond_id: pondCodeByUuid.get(robot.pond_id) ?? robot.pond_id,
      }))

      this.editableRobots = cloneData(editableRobots)
      this.rebuildRobotRuntimeFromEditable()

      return (
        (selectedRobotId
          ? this.editableRobots.find(
              (robot) => robot.id === selectedRobotId || robot.robot_code === selectedRobotId,
            )
          : undefined) ??
        this.editableRobots[0] ??
        null
      )
    },
    rebuildEditableRuntime(selectedPondId?: string) {
      const fallbackProfile = this.pondProfiles[0]
      const profileByPondId = new Map(this.pondProfiles.map((profile) => [profile.pondId, profile]))
      const robotByCode = new Map(this.robots.map((robot) => [robot.id, robot]))
      const pondCodes = this.editablePonds.map((pond) => pond.pond_code)
      const resolvedSelectedPondId =
        selectedPondId && pondCodes.includes(selectedPondId)
          ? selectedPondId
          : (pondCodes[0] ?? this.pondConfig.selectedPondId)

      this.pondProfiles = this.editablePonds.map((pond, index) => {
        const sourceProfile = profileByPondId.get(pond.pond_code) ?? fallbackProfile

        return {
          pondId: pond.pond_code,
          species: pond.shrimp_species,
          systemStatus: sourceProfile?.systemStatus ?? '运行稳定',
          waterMetrics: cloneMetrics(sourceProfile?.waterMetrics ?? []),
          shrimpMetrics: cloneMetrics(sourceProfile?.shrimpMetrics ?? []),
        }
      })

      this.robots = this.editableRobots.map((robot) => {
        const sourceRobot = robotByCode.get(robot.robot_code)

        return {
          id: robot.robot_code,
          name: robot.robot_name,
          online: sourceRobot?.online ?? true,
          pondId: robot.pond_id,
          currentTask: sourceRobot?.currentTask ?? `${robot.robot_type}待命`,
          battery: sourceRobot?.battery ?? 80,
          feederStatus: sourceRobot?.feederStatus ?? '正常',
          motionStatus: sourceRobot?.motionStatus ?? '待命',
          lastRunAt: sourceRobot?.lastRunAt ?? '今日 09:00',
          nextPlanAt: sourceRobot?.nextPlanAt ?? '今日 12:00',
          abnormalStatus: sourceRobot?.abnormalStatus ?? '无',
          commands: sourceRobot?.commands ?? ['09:00 同步本地配置'],
        }
      })

      this.pondConfig = {
        pondIds: this.pondProfiles.map((profile) => profile.pondId),
        selectedPondId: resolvedSelectedPondId,
      }
      this.robotConfig = {
        robots: this.robots.map((robot) => ({
          id: robot.id,
          name: robot.name,
          pondId: robot.pondId,
        })),
      }

      const selectedPond = this.editablePonds.find(
        (pond) => pond.pond_code === resolvedSelectedPondId,
      )
      const selectedRobot =
        this.editableRobots.find((robot) => robot.pond_id === resolvedSelectedPondId) ??
        this.editableRobots[0]
      const selectedThreshold =
        this.waterThresholdsByPond[resolvedSelectedPondId] ??
        toWaterThreshold(this.organizationId, resolvedSelectedPondId, this.thresholds.water)

      if (selectedPond && selectedRobot) {
        this.businessConfig = {
          organization_id: this.organizationId,
          pond: cloneData(selectedPond),
          robot: cloneData(selectedRobot),
          waterThreshold: cloneData(selectedThreshold),
        }
      }

      this.thresholds = {
        ...this.thresholds,
        water: waterThresholdToRangeRecord(selectedThreshold),
      }
      this.selectPond(resolvedSelectedPondId)
    },
    async saveEditablePond(pond: Pond) {
      const previousPond = this.editablePonds.find((item) => item.id === pond.id)
      const previousPondCode = previousPond?.pond_code
      const normalizedPond = {
        ...pond,
        organization_id: this.organizationId,
        pond_code: pond.pond_code.trim() || `P-${this.editablePonds.length + 1}`,
        pond_name: pond.pond_name.trim() || '未命名养殖池',
        shrimp_species: pond.shrimp_species.trim() || '南美白对虾',
        location: pond.location.trim() || '未设置',
      }

      if (isSupabaseMode) {
        const saved = await updatePond(this.organizationId, pond.id, normalizedPond)
        await this.loadSupabaseOrganizationData(this.organizationId)
        this.selectPond(saved.pond_code)
        return
      }

      this.editablePonds = this.editablePonds.map((item) =>
        item.id === normalizedPond.id ? normalizedPond : item,
      )

      if (previousPondCode && previousPondCode !== normalizedPond.pond_code) {
        this.editableRobots = this.editableRobots.map((robot) =>
          robot.pond_id === previousPondCode
            ? { ...robot, pond_id: normalizedPond.pond_code }
            : robot,
        )
        this.waterThresholdsByPond[normalizedPond.pond_code] =
          this.waterThresholdsByPond[previousPondCode] ??
          toWaterThreshold(this.organizationId, normalizedPond.pond_code, this.thresholds.water)
        delete this.waterThresholdsByPond[previousPondCode]
      }

      this.rebuildEditableRuntime(normalizedPond.pond_code)
      this.persistEditableRuntime()
    },
    async addEditablePond() {
      const nextIndex = this.editablePonds.length + 1
      const pondCode = `P-${String(nextIndex).padStart(2, '0')}`
      const pond: Pond = {
        id: `pond-${this.organizationId}-${Date.now()}`,
        organization_id: this.organizationId,
        pond_code: pondCode,
        pond_name: `新增养殖池 ${nextIndex}`,
        shrimp_species: '南美白对虾',
        area: 20,
        water_depth: 1.5,
        location: '未设置',
      }

      if (isSupabaseMode) {
        const created = await createPond(this.organizationId, pond)
        await this.loadSupabaseOrganizationData(this.organizationId)
        this.selectPond(created.pond_code)
        return created
      }

      this.editablePonds.push(pond)
      this.waterThresholdsByPond[pondCode] = toWaterThreshold(
        this.organizationId,
        pondCode,
        this.thresholds.water,
      )
      this.rebuildEditableRuntime(pondCode)
      this.persistEditableRuntime()
      return pond
    },
    async deleteEditablePond(pondCode: string) {
      if (this.editablePonds.length <= 1) {
        return false
      }

      if (isSupabaseMode) {
        await deletePond(this.organizationId, pondCode)
        await this.loadSupabaseOrganizationData(this.organizationId)
        return true
      }

      this.editablePonds = this.editablePonds.filter((pond) => pond.pond_code !== pondCode)
      this.editableRobots = this.editableRobots.filter((robot) => robot.pond_id !== pondCode)
      delete this.waterThresholdsByPond[pondCode]

      if (this.editableRobots.length === 0 && this.editablePonds[0]) {
        this.editableRobots.push({
          id: `robot-${this.organizationId}-${Date.now()}`,
          organization_id: this.organizationId,
          pond_id: this.editablePonds[0].pond_code,
          robot_code: 'RB-01',
          robot_name: '默认投喂机器人',
          robot_type: '投喂巡检型',
        })
      }

      this.rebuildEditableRuntime(this.editablePonds[0]?.pond_code)
      this.persistEditableRuntime()
      return true
    },
    async saveEditableRobot(robot: Robot) {
      const normalizedRobot = {
        ...robot,
        organization_id: this.organizationId,
        robot_code: robot.robot_code.trim() || `RB-${this.editableRobots.length + 1}`,
        robot_name: robot.robot_name.trim() || '未命名机器人',
        robot_type: robot.robot_type.trim() || '投喂巡检型',
        pond_id: robot.pond_id || this.pondConfig.selectedPondId,
      }

      if (isSupabaseMode) {
        const saved = await updateRobot(this.organizationId, robot.id, normalizedRobot)
        const refreshedRobot = await this.reloadSupabaseRobots(saved.id)
        return (
          refreshedRobot ?? {
            ...saved,
            pond_id: normalizedRobot.pond_id,
          }
        )
      }

      this.editableRobots = this.editableRobots.map((item) =>
        item.id === normalizedRobot.id ? normalizedRobot : item,
      )
      this.rebuildEditableRuntime(normalizedRobot.pond_id)
      this.persistEditableRuntime()
      return normalizedRobot
    },
    async addEditableRobot(pondCode?: string) {
      const nextIndex = this.editableRobots.length + 1
      const robot: Robot = {
        id: `robot-${this.organizationId}-${Date.now()}`,
        organization_id: this.organizationId,
        pond_id: pondCode ?? this.pondConfig.selectedPondId,
        robot_code: `RB-${String(nextIndex).padStart(2, '0')}`,
        robot_name: `新增机器人 ${nextIndex}`,
        robot_type: '投喂巡检型',
      }

      if (isSupabaseMode) {
        const created = await createRobot(this.organizationId, robot)
        const refreshedRobot = await this.reloadSupabaseRobots(created.id)
        return refreshedRobot ?? {
          ...created,
          pond_id: pondCode ?? this.pondConfig.selectedPondId,
        }
      }

      this.editableRobots.push(robot)
      this.rebuildEditableRuntime(robot.pond_id)
      this.persistEditableRuntime()
      return robot
    },
    async deleteEditableRobot(robotId: string) {
      if (this.editableRobots.length <= 1) {
        return false
      }

      if (isSupabaseMode) {
        await deleteRobot(this.organizationId, robotId)
        await this.reloadSupabaseRobots()
        return true
      }

      const robot = this.editableRobots.find((item) => item.id === robotId)
      this.editableRobots = this.editableRobots.filter((item) => item.id !== robotId)
      this.rebuildEditableRuntime(robot?.pond_id ?? this.pondConfig.selectedPondId)
      this.persistEditableRuntime()
      return true
    },
    async saveEditableThreshold(pondCode: string, threshold: WaterThreshold) {
      if (isSupabaseMode) {
        await saveThresholds(this.organizationId, pondCode, threshold)
        await this.loadSupabaseOrganizationData(this.organizationId)
        this.selectPond(pondCode)
        return
      }

      this.waterThresholdsByPond[pondCode] = {
        ...threshold,
        organization_id: this.organizationId,
        pond_id: pondCode,
      }
      this.rebuildEditableRuntime(pondCode)
      this.persistEditableRuntime()
    },
    selectPond(pondId: string) {
      this.pondConfig.selectedPondId = pondId
      this.selectedPondId = pondId
      this.systemMeta.currentPondId = pondId
      const threshold = this.waterThresholdsByPond[pondId]

      if (threshold) {
        this.thresholds = {
          ...this.thresholds,
          water: waterThresholdToRangeRecord(threshold),
        }
      }

      const profile = this.pondProfiles.find((item) => item.pondId === pondId)

      if (!profile) {
        return
      }

      this.systemMeta.currentStatus = profile.systemStatus
      this.waterMetrics = cloneMetrics(profile.waterMetrics)
      this.shrimpMetrics = cloneMetrics(profile.shrimpMetrics)
    },
  },
})
