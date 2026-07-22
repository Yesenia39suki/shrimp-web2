import type {
  ShrimpDailyStatsRow,
  ShrimpMeasurementRow,
} from '@/types/database'
import type { GrowthSummary, ShrimpEstimate, ShrimpMeasurement } from '@/types/shrimp'
import type { TimeRange } from '@/types/business'

export function mapShrimpMeasurementRow(row: ShrimpMeasurementRow): ShrimpMeasurement {
  return {
    id: row.id,
    organizationId: row.organization_id,
    pondId: row.pond_id,
    average_length_cm: Number(row.average_length_cm),
    average_weight_g: Number(row.average_weight_g),
    sampleCount: row.sample_count,
    measuredAt: row.measured_at,
    source: row.source,
  }
}

export function mapShrimpEstimateFromDailyRow(row: ShrimpDailyStatsRow): ShrimpEstimate {
  return {
    organizationId: row.organization_id,
    pondId: row.pond_id,
    estimated_count: row.estimated_count ?? 0,
    estimated_yield_kg: Number(row.estimated_yield_kg ?? 0),
    maturity_percent: Number(row.maturity_percent ?? 0),
    updatedAt: row.updated_at,
  }
}

export function mapGrowthSummary(
  organizationId: string,
  pondId: string,
  timeRange: TimeRange,
  rows: ShrimpDailyStatsRow[],
): GrowthSummary {
  const ordered = [...rows].sort((a, b) => a.stat_date.localeCompare(b.stat_date))
  const first = ordered[0]
  const last = ordered[ordered.length - 1]

  return {
    organizationId,
    pondId,
    timeRange,
    lengthGrowthCm: Number(((last?.avg_length_cm ?? 0) - (first?.avg_length_cm ?? 0)).toFixed(2)),
    weightGrowthG: Number(((last?.avg_weight_g ?? 0) - (first?.avg_weight_g ?? 0)).toFixed(2)),
    maturityChangePercent: Number(
      ((last?.maturity_percent ?? 0) - (first?.maturity_percent ?? 0)).toFixed(2),
    ),
    summary: rows.length ? '当前虾群历史数据已从数据库汇总。' : '暂无虾群历史数据。',
  }
}

export function shrimpDailyMetricValue(row: ShrimpDailyStatsRow, metricKey: string) {
  const metricMap: Record<string, number | null> = {
    length: row.avg_length_cm,
    average_length_cm: row.avg_length_cm,
    weight: row.avg_weight_g,
    average_weight_g: row.avg_weight_g,
    count: row.estimated_count,
    yield: row.estimated_yield_kg,
    maturity: row.maturity_percent,
  }

  return Number(metricMap[metricKey] ?? 0)
}
