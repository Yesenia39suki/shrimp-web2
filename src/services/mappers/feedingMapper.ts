import type {
  FeedingDailyStatsRow,
  FeedingPlanRow,
  FeedingRecordRow,
  FeedingTaskRow,
  Inserts,
} from '@/types/database'
import type { FeedingPlan, FeedingRecord, FeedingSummary, FeedingTask } from '@/types/feeding'
import type { TimeRange } from '@/types/business'

function jsonStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export function mapFeedingPlanRow(row: FeedingPlanRow): FeedingPlan {
  return {
    id: row.id,
    organizationId: row.organization_id,
    pondId: row.pond_id,
    name: row.name,
    mode: row.mode,
    feedAmountKg: Number(row.feed_amount_kg),
    times: jsonStringArray(row.times),
    enabled: row.enabled,
  }
}

export function mapFeedingTaskRow(row: FeedingTaskRow): FeedingTask {
  return {
    id: row.id,
    organizationId: row.organization_id,
    pondId: row.pond_id,
    planId: row.plan_id ?? undefined,
    robotId: row.robot_id ?? undefined,
    scheduledAt: row.scheduled_at,
    feedAmountKg: Number(row.feed_amount_kg),
    status: row.status,
  }
}

export function mapFeedingRecordRow(row: FeedingRecordRow): FeedingRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    pondId: row.pond_id,
    robotId: row.robot_id ?? undefined,
    feedAmountKg: Number(row.feed_amount_kg),
    mode: row.mode,
    adviceSource: row.advice_source ?? undefined,
    executedAt: row.executed_at,
    remark: row.remark ?? undefined,
  }
}

export function mapFeedingPlanInsert(
  organizationId: string,
  pondId: string,
  payload: Partial<FeedingPlan>,
): Inserts<'feeding_plans'> {
  return {
    organization_id: organizationId,
    pond_id: pondId,
    name: payload.name?.trim() || '新建投喂计划',
    mode: payload.mode ?? 'scheduled',
    feed_amount_kg: payload.feedAmountKg ?? 0,
    times: payload.times ?? [],
    enabled: payload.enabled ?? true,
  }
}

export function mapFeedingSummary(
  organizationId: string,
  pondId: string,
  timeRange: TimeRange,
  rows: FeedingDailyStatsRow[],
): FeedingSummary {
  const totalFeedKg = rows.reduce((sum, row) => sum + Number(row.total_feed_kg), 0)
  const taskCount = rows.reduce((sum, row) => sum + row.feeding_count, 0)

  return {
    organizationId,
    pondId,
    timeRange,
    totalFeedKg,
    taskCount,
    averageDailyFeedKg: Number((totalFeedKg / Math.max(1, rows.length)).toFixed(2)),
  }
}
