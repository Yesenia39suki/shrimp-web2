import type {
  WaterDailyStatsRow,
  WaterLatestRow,
  WaterReadingRow,
} from '@/types/database'
import type { WaterLatest, WaterQualitySummary, WaterReading } from '@/types/water'
import type { TimeRange } from '@/types/business'

export function mapWaterReadingRow(row: WaterReadingRow): WaterReading {
  return {
    id: row.id,
    organizationId: row.organization_id,
    pondId: row.pond_id,
    deviceId: row.device_id ?? undefined,
    temperature: Number(row.temperature ?? 0),
    dissolvedOxygen: Number(row.dissolved_oxygen ?? 0),
    ph: Number(row.ph ?? 0),
    orp: Number(row.orp ?? 0),
    turbidity: Number(row.turbidity ?? 0),
    ammonia: Number(row.ammonia ?? 0),
    nitrite: Number(row.nitrite ?? 0),
    hardness: Number(row.hardness ?? 0),
    recordedAt: row.recorded_at,
  }
}

export function mapWaterLatestRow(row: WaterLatestRow): WaterLatest {
  const reading: WaterReading = {
    id: row.reading_id ?? `${row.pond_id}-${row.recorded_at}`,
    organizationId: row.organization_id,
    pondId: row.pond_id,
    temperature: Number(row.temperature ?? 0),
    dissolvedOxygen: Number(row.dissolved_oxygen ?? 0),
    ph: Number(row.ph ?? 0),
    orp: Number(row.orp ?? 0),
    turbidity: Number(row.turbidity ?? 0),
    ammonia: Number(row.ammonia ?? 0),
    nitrite: Number(row.nitrite ?? 0),
    hardness: Number(row.hardness ?? 0),
    recordedAt: row.recorded_at,
  }

  return {
    organizationId: row.organization_id,
    pondId: row.pond_id,
    reading,
    updatedAt: row.updated_at,
  }
}

export function mapWaterDailySummary(
  organizationId: string,
  pondId: string,
  timeRange: TimeRange,
  rows: WaterDailyStatsRow[],
): WaterQualitySummary {
  const count = Math.max(1, rows.length)
  const sum = (selector: (row: WaterDailyStatsRow) => number | null) =>
    rows.reduce((total, row) => total + Number(selector(row) ?? 0), 0)

  return {
    organizationId,
    pondId,
    timeRange,
    averageTemperature: Number((sum((row) => row.avg_temperature) / count).toFixed(2)),
    averageOxygen: Number((sum((row) => row.avg_dissolved_oxygen) / count).toFixed(2)),
    averagePh: Number((sum((row) => row.avg_ph) / count).toFixed(2)),
    warningCount: rows.reduce((total, row) => total + row.warning_count, 0),
    status: rows.some((row) => row.status === '预警')
      ? '预警'
      : rows.some((row) => row.status === '关注')
        ? '关注'
        : '稳定',
  }
}

export function waterDailyMetricValue(row: WaterDailyStatsRow, metricKey: string) {
  const metricMap: Record<string, number | null> = {
    temperature: row.avg_temperature,
    oxygen: row.avg_dissolved_oxygen,
    dissolvedOxygen: row.avg_dissolved_oxygen,
    ph: row.avg_ph,
    ammonia: row.max_ammonia,
    nitrite: row.max_nitrite,
  }

  return Number(metricMap[metricKey] ?? 0)
}
