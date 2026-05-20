import { defineStore } from 'pinia'

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

export const useShrimpSystemStore = defineStore('shrimpSystem', {
  state: (): ShrimpSystemState => ({
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
      return state.pondProfiles.find((profile) => profile.pondId === state.pondConfig.selectedPondId)
    },
    waterAlerts(state): SystemAlert[] {
      return buildRangeAlerts(state.waterMetrics, state.thresholds.water, '水质参数')
    },
    shrimpAlerts(state): SystemAlert[] {
      return buildRangeAlerts(state.shrimpMetrics, state.thresholds.shrimp, '虾群参数')
    },
    robotAlerts(state): SystemAlert[] {
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
    selectPond(pondId: string) {
      this.pondConfig.selectedPondId = pondId
      this.systemMeta.currentPondId = pondId

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
