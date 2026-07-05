import { getMockSystemData } from '@/services/mockDataService'
import type { TimeRange } from '@/types/business'
import type {
  GrowthSummary,
  ShrimpEstimate,
  ShrimpMeasurement,
  ShrimpImageMeasurement,
} from '@/types/shrimp'

function metricNumber(
  metrics: ReturnType<typeof getMockSystemData>['shrimpMetrics'],
  key: string,
  fallback: number,
) {
  const value = metrics.find((metric) => metric.key === key)?.value
  return typeof value === 'number' ? value : fallback
}

function createMockMeasurement(organizationId: string, pondId: string): ShrimpMeasurement {
  const data = getMockSystemData(organizationId)
  return {
    id: `shrimp-measurement-${Date.now()}`,
    organizationId,
    pondId,
    average_length_cm: metricNumber(data.shrimpMetrics, 'length', 8.6),
    average_weight_g: metricNumber(data.shrimpMetrics, 'weight', 11.8),
    sampleCount: 50,
    measuredAt: new Date().toISOString(),
    source: 'manual',
  }
}

export async function getShrimpMeasurements(
  organizationId: string,
  pondId: string,
  timeRange: TimeRange,
): Promise<ShrimpMeasurement[]> {
  // TODO: 后续读取 shrimp_measurements，并支持 App 上传数据筛选。
  void timeRange
  return Promise.resolve(
    Array.from({ length: 5 }, (_, index) => ({
      ...createMockMeasurement(organizationId, pondId),
      id: `shrimp-measurement-${index}`,
      average_length_cm: Number((8 + index * 0.2).toFixed(1)),
      average_weight_g: Number((10.2 + index * 0.4).toFixed(1)),
      measuredAt: new Date(Date.now() - (4 - index) * 24 * 60 * 60_000).toISOString(),
    })),
  )
}

export async function createShrimpMeasurement(
  organizationId: string,
  pondId: string,
  payload: Partial<ShrimpMeasurement>,
): Promise<ShrimpMeasurement> {
  // TODO: operator/admin/owner 写 shrimp_measurements，并记录来源 manual/app/image_ai。
  return Promise.resolve({
    ...createMockMeasurement(organizationId, pondId),
    ...payload,
    id: `shrimp-measurement-${Date.now()}`,
    organizationId,
    pondId,
  })
}

export async function getShrimpEstimate(
  organizationId: string,
  pondId: string,
): Promise<ShrimpEstimate> {
  const data = getMockSystemData(organizationId)
  return Promise.resolve({
    organizationId,
    pondId,
    estimated_count: metricNumber(data.shrimpMetrics, 'count', 120) * 10_000,
    estimated_yield_kg: metricNumber(data.shrimpMetrics, 'yield', 13.8) * 1000,
    maturity_percent: metricNumber(data.shrimpMetrics, 'maturity', 55),
    updatedAt: new Date().toISOString(),
  })
}

export async function updateShrimpEstimate(
  organizationId: string,
  pondId: string,
  payload: Partial<ShrimpEstimate>,
): Promise<ShrimpEstimate> {
  // TODO: 后续更新 shrimp_estimates，可由人工、模型或 App 复核触发。
  return Promise.resolve({
    ...(await getShrimpEstimate(organizationId, pondId)),
    ...payload,
    organizationId,
    pondId,
    updatedAt: new Date().toISOString(),
  })
}

export async function calculateGrowthSummary(
  organizationId: string,
  pondId: string,
  timeRange: TimeRange,
): Promise<GrowthSummary> {
  const measurements = await getShrimpMeasurements(organizationId, pondId, timeRange)
  const first = measurements[0]!
  const last = measurements[measurements.length - 1]!

  return Promise.resolve({
    organizationId,
    pondId,
    timeRange,
    lengthGrowthCm: Number((last.average_length_cm - first.average_length_cm).toFixed(1)),
    weightGrowthG: Number((last.average_weight_g - first.average_weight_g).toFixed(1)),
    maturityChangePercent: 8,
    summary: '当前虾群增长趋势平稳，建议继续结合水体和摄食数据复核。',
  })
}

export async function importShrimpMeasurementFromApp(
  organizationId: string,
  pondId: string,
  payload: Partial<ShrimpMeasurement> | ShrimpImageMeasurement,
): Promise<ShrimpMeasurement> {
  // TODO: 预留虾长度测量 App 接口；图片识别文件应由后端或边缘函数处理。
  if ('detectedLengthCm' in payload) {
    return createShrimpMeasurement(organizationId, pondId, {
      average_length_cm: payload.detectedLengthCm,
      sampleCount: 1,
      source: 'image_ai',
    })
  }

  return createShrimpMeasurement(organizationId, pondId, {
    average_length_cm: payload.average_length_cm,
    average_weight_g: payload.average_weight_g,
    sampleCount: payload.sampleCount ?? 1,
    source: 'app',
  })
}
