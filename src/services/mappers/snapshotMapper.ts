import type { PondDailySnapshotRow } from '@/types/database'

export interface PondDailySnapshot {
  id: string
  organizationId: string
  pondId: string
  statDate: string
  waterScore: number | null
  totalFeedKg: number | null
  avgShrimpLengthCm: number | null
  avgShrimpWeightG: number | null
  estimatedYieldKg: number | null
  alertCount: number
  robotRunningMinutes: number
  aiRiskLevel?: string
  summary?: string
}

export function mapPondDailySnapshotRow(row: PondDailySnapshotRow): PondDailySnapshot {
  return {
    id: row.id,
    organizationId: row.organization_id,
    pondId: row.pond_id,
    statDate: row.stat_date,
    waterScore: row.water_score,
    totalFeedKg: row.total_feed_kg,
    avgShrimpLengthCm: row.avg_shrimp_length_cm,
    avgShrimpWeightG: row.avg_shrimp_weight_g,
    estimatedYieldKg: row.estimated_yield_kg,
    alertCount: row.alert_count,
    robotRunningMinutes: row.robot_running_minutes,
    aiRiskLevel: row.ai_risk_level ?? undefined,
    summary: row.summary ?? undefined,
  }
}
