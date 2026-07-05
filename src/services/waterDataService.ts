import type { TimeRange } from '@/types/business'
import type {
  WaterHistoryQuery,
  WaterLatest,
  WaterQualitySummary,
  WaterReading,
  WaterUploadPayload,
} from '@/types/water'

function createMockReading(organizationId: string, pondId: string): WaterReading {
  return {
    id: `water-${Date.now()}`,
    organizationId,
    pondId,
    temperature: 28,
    dissolvedOxygen: 6.8,
    ph: 7.8,
    orp: 318,
    turbidity: 18,
    ammonia: 0.16,
    nitrite: 0.05,
    hardness: 188,
    recordedAt: new Date().toISOString(),
  }
}

export async function getLatestWaterData(
  organizationId: string,
  pondId: string,
): Promise<WaterLatest> {
  return Promise.resolve({
    organizationId,
    pondId,
    reading: createMockReading(organizationId, pondId),
    updatedAt: new Date().toISOString(),
  })
}

export async function getWaterHistory(
  organizationId: string,
  pondId: string,
  timeRange: TimeRange,
): Promise<WaterReading[]> {
  const query: WaterHistoryQuery = { organizationId, pondId, timeRange }
  void query
  return Promise.resolve(
    Array.from({ length: 8 }, (_, index) => ({
      ...createMockReading(organizationId, pondId),
      id: `water-${index}`,
      temperature: 27 + index * 0.2,
    })),
  )
}

export async function getWaterQualitySummary(
  organizationId: string,
  pondId: string,
  timeRange: TimeRange,
): Promise<WaterQualitySummary> {
  return Promise.resolve({
    organizationId,
    pondId,
    timeRange,
    averageTemperature: 28,
    averageOxygen: 6.8,
    averagePh: 7.8,
    warningCount: 0,
    status: '稳定',
  })
}

export async function uploadWaterData(payload: WaterUploadPayload): Promise<WaterReading> {
  // TODO: 后续改为调用 /functions/v1/ingest-water。
  return Promise.resolve({
    ...payload.reading,
    id: `water-${Date.now()}`,
    organizationId: payload.organizationId,
    pondId: payload.pondId,
  })
}

export function subscribeWaterData(
  organizationId: string,
  pondId: string,
  callback: (reading: WaterReading) => void,
): string {
  // TODO: 后续接 Supabase Realtime 或 MQTT/WebSocket。
  const subscriptionId = `water-sub-${organizationId}-${pondId}-${Date.now()}`
  window.setTimeout(() => callback(createMockReading(organizationId, pondId)), 300)
  return subscriptionId
}

export function unsubscribeWaterData(subscriptionId: string): boolean {
  void subscriptionId
  return true
}
