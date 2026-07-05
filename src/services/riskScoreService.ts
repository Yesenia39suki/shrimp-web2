import type { WaterThreshold } from '@/types/business'
import type { FeedingRecord } from '@/types/feeding'
import type { RiskLevel } from '@/types/ai'
import type { RobotStatus } from '@/types/robot'
import type { GrowthSummary, ShrimpEstimate, ShrimpMeasurement } from '@/types/shrimp'
import type { WaterReading } from '@/types/water'

export interface RiskCalculationResult {
  waterRiskScore: number
  feedingRiskScore: number
  growthRiskScore: number
  robotRiskScore: number
  totalRiskScore: number
  riskLevel: RiskLevel
  calculationDetail: string
}

interface TotalRiskInput {
  waterData: WaterReading
  thresholds: WaterThreshold
  feedingRecords: FeedingRecord[]
  shrimpData: ShrimpEstimate | GrowthSummary | ShrimpMeasurement[]
  robotStatus: RobotStatus
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)))
}

function toRiskLevel(score: number): RiskLevel {
  if (score >= 76) return '高风险'
  if (score >= 56) return '预警'
  if (score >= 31) return '关注'
  return '低风险'
}

export function calculateWaterRisk(
  waterData: WaterReading,
  thresholds: WaterThreshold,
): Pick<RiskCalculationResult, 'waterRiskScore' | 'riskLevel' | 'calculationDetail'> {
  const checks = [
    ['温度', waterData.temperature, thresholds.temperature],
    ['溶解氧', waterData.dissolvedOxygen, thresholds.oxygen],
    ['pH', waterData.ph, thresholds.ph],
    ['氧化还原电位', waterData.orp, thresholds.orp],
    ['浊度', waterData.turbidity, thresholds.turbidity],
    ['氨氮', waterData.ammonia, thresholds.ammonia],
    ['亚硝酸盐', waterData.nitrite, thresholds.nitrite],
    ['钙/镁硬度', waterData.hardness, thresholds.hardness],
  ] as const
  const abnormal = checks.filter(([, value, range]) => value < range.min || value > range.max)
  const score = clampScore(abnormal.length * 14)

  return {
    waterRiskScore: score,
    riskLevel: toRiskLevel(score),
    calculationDetail: abnormal.length
      ? `水质异常项：${abnormal.map(([label]) => label).join('、')}`
      : '水质参数均处于阈值范围内',
  }
}

export function calculateFeedingRisk(
  feedingRecords: FeedingRecord[],
): Pick<RiskCalculationResult, 'feedingRiskScore' | 'riskLevel' | 'calculationDetail'> {
  const totalFeedKg = feedingRecords.reduce((sum, record) => sum + record.feedAmountKg, 0)
  const score = clampScore(feedingRecords.length === 0 ? 45 : totalFeedKg > 80 ? 42 : 18)

  return {
    feedingRiskScore: score,
    riskLevel: toRiskLevel(score),
    calculationDetail:
      feedingRecords.length === 0
        ? '当前时间范围内没有投喂记录'
        : `当前时间范围累计投喂 ${totalFeedKg.toFixed(1)} 千克`,
  }
}

export function calculateGrowthRisk(
  shrimpData: ShrimpEstimate | GrowthSummary | ShrimpMeasurement[],
): Pick<RiskCalculationResult, 'growthRiskScore' | 'riskLevel' | 'calculationDetail'> {
  let score = 22
  let detail = '虾群生长数据处于可观察范围'

  if (Array.isArray(shrimpData)) {
    const latest = shrimpData[shrimpData.length - 1]
    if (!latest) {
      score = 40
      detail = '缺少虾群测量记录'
    } else if (latest.average_weight_g < 8) {
      score = 52
      detail = '平均体重低于建议观察值'
    }
  } else if ('maturity_percent' in shrimpData) {
    score = shrimpData.maturity_percent < 45 ? 48 : 20
    detail = `当前成熟度 ${shrimpData.maturity_percent}%`
  } else {
    score = shrimpData.weightGrowthG < 0.5 ? 44 : 18
    detail = shrimpData.summary
  }

  return {
    growthRiskScore: clampScore(score),
    riskLevel: toRiskLevel(score),
    calculationDetail: detail,
  }
}

export function calculateRobotRisk(
  robotStatus: RobotStatus,
): Pick<RiskCalculationResult, 'robotRiskScore' | 'riskLevel' | 'calculationDetail'> {
  const score = clampScore(
    (robotStatus.online ? 0 : 55) +
      (robotStatus.battery < 30 ? 28 : 0) +
      (robotStatus.faultCode ? 24 : 0),
  )

  return {
    robotRiskScore: score,
    riskLevel: toRiskLevel(score),
    calculationDetail: robotStatus.online
      ? `机器人在线，电量 ${robotStatus.battery}%`
      : '机器人离线，需要人工复核',
  }
}

export function calculateTotalRisk(input: TotalRiskInput): RiskCalculationResult {
  const water = calculateWaterRisk(input.waterData, input.thresholds)
  const feeding = calculateFeedingRisk(input.feedingRecords)
  const growth = calculateGrowthRisk(input.shrimpData)
  const robot = calculateRobotRisk(input.robotStatus)
  const totalRiskScore = clampScore(
    water.waterRiskScore * 0.38 +
      feeding.feedingRiskScore * 0.2 +
      growth.growthRiskScore * 0.18 +
      robot.robotRiskScore * 0.24,
  )

  return {
    waterRiskScore: water.waterRiskScore,
    feedingRiskScore: feeding.feedingRiskScore,
    growthRiskScore: growth.growthRiskScore,
    robotRiskScore: robot.robotRiskScore,
    totalRiskScore,
    riskLevel: toRiskLevel(totalRiskScore),
    calculationDetail: [
      water.calculationDetail,
      feeding.calculationDetail,
      growth.calculationDetail,
      robot.calculationDetail,
    ].join('；'),
  }
}
