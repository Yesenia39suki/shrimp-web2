import type { TimeRange } from '@/types/business'

export interface ShrimpMeasurement {
  id: string
  organizationId: string
  pondId: string
  average_length_cm: number
  average_weight_g: number
  sampleCount: number
  measuredAt: string
  source: 'manual' | 'app' | 'image_ai'
}

export interface ShrimpEstimate {
  organizationId: string
  pondId: string
  estimated_count: number
  estimated_yield_kg: number
  maturity_percent: number
  updatedAt: string
}

export interface GrowthRecord {
  id: string
  organizationId: string
  pondId: string
  average_length_cm: number
  average_weight_g: number
  estimated_count: number
  estimated_yield_kg: number
  maturity_percent: number
  recordedAt: string
}

export interface GrowthSummary {
  organizationId: string
  pondId: string
  timeRange: TimeRange
  lengthGrowthCm: number
  weightGrowthG: number
  maturityChangePercent: number
  summary: string
}

export interface ShrimpImageMeasurement {
  id: string
  organizationId: string
  pondId: string
  imageUrl: string
  detectedLengthCm: number
  confidence: number
  measuredAt: string
}

export interface ShrimpLengthWeightMapping {
  id: string
  organizationId: string
  species: string
  lengthCm: number
  weightG: number
}
