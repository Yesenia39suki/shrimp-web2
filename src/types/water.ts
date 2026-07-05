import type { TimeRange, WaterThreshold } from '@/types/business'

export interface WaterReading {
  id: string
  organizationId: string
  pondId: string
  deviceId?: string
  temperature: number
  dissolvedOxygen: number
  ph: number
  orp: number
  turbidity: number
  ammonia: number
  nitrite: number
  hardness: number
  recordedAt: string
}

export interface WaterLatest {
  organizationId: string
  pondId: string
  reading: WaterReading
  updatedAt: string
}

export interface WaterHistoryQuery {
  organizationId: string
  pondId: string
  timeRange: TimeRange
  limit?: number
}

export interface WaterQualitySummary {
  organizationId: string
  pondId: string
  timeRange: TimeRange
  averageTemperature: number
  averageOxygen: number
  averagePh: number
  warningCount: number
  status: '稳定' | '关注' | '预警'
}

export interface WaterQualityWarning {
  organizationId: string
  pondId: string
  metricKey: string
  metricLabel: string
  currentValue: number
  min?: number
  max?: number
  level: '关注' | '预警'
  message: string
}

export interface WaterUploadPayload {
  organizationId: string
  pondId: string
  deviceId: string
  reading: Omit<WaterReading, 'id' | 'organizationId' | 'pondId'>
}

export interface WaterThresholdCheckInput {
  waterData: WaterReading
  thresholds: WaterThreshold
}
