import type { TimeRange } from '@/types/business'

export type FeedingMode = 'manual' | 'scheduled' | 'ai_advice' | 'emergency'
export type FeedingAdviceSource =
  | 'manual'
  | 'rule_engine'
  | 'openai'
  | 'deepseek'
  | 'local_model'
  | 'hybrid'

export interface FeedingPlan {
  id: string
  organizationId: string
  pondId: string
  name: string
  mode: FeedingMode
  feedAmountKg: number
  times: string[]
  enabled: boolean
}

export interface FeedingTask {
  id: string
  organizationId: string
  pondId: string
  planId?: string
  robotId?: string
  scheduledAt: string
  feedAmountKg: number
  status: 'pending' | 'running' | 'done' | 'cancelled'
}

export interface FeedingRecord {
  id: string
  organizationId: string
  pondId: string
  robotId?: string
  feedAmountKg: number
  mode: FeedingMode
  adviceSource?: FeedingAdviceSource
  executedAt: string
  remark?: string
}

export interface FeedBatch {
  id: string
  organizationId: string
  batchNo: string
  feedName: string
  proteinPercent?: number
  producedAt?: string
}

export interface FeedInventory {
  id: string
  organizationId: string
  feedBatchId: string
  stockKg: number
  updatedAt: string
}

export interface FeedingSummary {
  organizationId: string
  pondId: string
  timeRange: TimeRange
  totalFeedKg: number
  taskCount: number
  averageDailyFeedKg: number
}
