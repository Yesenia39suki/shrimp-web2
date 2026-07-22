import { isSupabaseMode } from '@/config/dataSource'
import { supabase } from '@/lib/supabase'
import { getMockSystemData } from '@/services/mockDataService'
import {
  mapGrowthSummary,
  mapShrimpEstimateFromDailyRow,
  mapShrimpMeasurementRow,
} from '@/services/mappers/shrimpMapper'
import { resolvePondUuid, throwSupabaseError, toDateOnly } from '@/services/supabaseHelpers'
import type { TimeRange } from '@/types/business'
import type { Inserts, ShrimpDailyStatsRow } from '@/types/database'
import type {
  GrowthSummary,
  ShrimpEstimate,
  ShrimpImageMeasurement,
  ShrimpMeasurement,
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

export async function getShrimpDailyStats(
  organizationId: string,
  pondId: string,
  timeRange: TimeRange,
): Promise<ShrimpDailyStatsRow[]> {
  if (!isSupabaseMode) {
    return []
  }

  const pondUuid = await resolvePondUuid(organizationId, pondId)
  const { data, error } = await supabase
    .from('shrimp_daily_stats')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('pond_id', pondUuid)
    .gte('stat_date', toDateOnly(timeRange.startAt))
    .lte('stat_date', toDateOnly(timeRange.endAt))
    .order('stat_date', { ascending: true })

  if (error) {
    throwSupabaseError(error, '读取虾群日统计失败')
  }

  return data ?? []
}

export async function getShrimpMeasurements(
  organizationId: string,
  pondId: string,
  timeRange: TimeRange,
): Promise<ShrimpMeasurement[]> {
  if (!isSupabaseMode) {
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

  const pondUuid = await resolvePondUuid(organizationId, pondId)
  const { data, error } = await supabase
    .from('shrimp_measurements')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('pond_id', pondUuid)
    .gte('measured_at', timeRange.startAt)
    .lte('measured_at', timeRange.endAt)
    .order('measured_at', { ascending: true })

  if (error) {
    throwSupabaseError(error, '读取虾群测量记录失败')
  }

  return (data ?? []).map(mapShrimpMeasurementRow)
}

export async function createShrimpMeasurement(
  organizationId: string,
  pondId: string,
  payload: Partial<ShrimpMeasurement>,
): Promise<ShrimpMeasurement> {
  if (!isSupabaseMode) {
    return Promise.resolve({
      ...createMockMeasurement(organizationId, pondId),
      ...payload,
      id: `shrimp-measurement-${Date.now()}`,
      organizationId,
      pondId,
    })
  }

  const pondUuid = await resolvePondUuid(organizationId, pondId)
  const measuredAt = payload.measuredAt ?? new Date().toISOString()
  const { error: rpcError } = await supabase.rpc('record_shrimp_measurement', {
    p_organization_id: organizationId,
    p_pond_id: pondUuid,
    p_average_length_cm: payload.average_length_cm ?? 0,
    p_average_weight_g: payload.average_weight_g ?? 0,
    p_sample_count: payload.sampleCount ?? 1,
    p_measured_at: measuredAt,
    p_source: payload.source ?? 'manual',
    p_estimated_count: null,
    p_estimated_yield_kg: null,
    p_maturity_percent: null,
  })

  if (rpcError) {
    throwSupabaseError(rpcError, '保存虾群测量记录失败')
  }

  const { data, error } = await supabase
    .from('shrimp_measurements')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('pond_id', pondUuid)
    .order('measured_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    throwSupabaseError(error, '读取虾群测量记录失败')
  }

  return mapShrimpMeasurementRow(data)
}

export async function getShrimpEstimate(
  organizationId: string,
  pondId: string,
): Promise<ShrimpEstimate> {
  if (!isSupabaseMode) {
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

  const pondUuid = await resolvePondUuid(organizationId, pondId)
  const { data, error } = await supabase
    .from('shrimp_daily_stats')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('pond_id', pondUuid)
    .order('stat_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throwSupabaseError(error, '读取虾群估算失败')
  }

  if (!data) {
    throw new Error('暂无虾群估算数据，请先添加测量记录')
  }

  return mapShrimpEstimateFromDailyRow(data)
}

export async function updateShrimpEstimate(
  organizationId: string,
  pondId: string,
  payload: Partial<ShrimpEstimate>,
): Promise<ShrimpEstimate> {
  if (!isSupabaseMode) {
    return Promise.resolve({
      ...(await getShrimpEstimate(organizationId, pondId)),
      ...payload,
      organizationId,
      pondId,
      updatedAt: new Date().toISOString(),
    })
  }

  const pondUuid = await resolvePondUuid(organizationId, pondId)
  const row: Inserts<'shrimp_daily_stats'> = {
    organization_id: organizationId,
    pond_id: pondUuid,
    stat_date: toDateOnly(new Date().toISOString()),
    avg_length_cm: null,
    avg_weight_g: null,
    sample_count: 0,
    estimated_count: payload.estimated_count ?? null,
    estimated_yield_kg: payload.estimated_yield_kg ?? null,
    maturity_percent: payload.maturity_percent ?? null,
  }
  const { data, error } = await supabase
    .from('shrimp_daily_stats')
    .upsert(row, { onConflict: 'organization_id,pond_id,stat_date' })
    .select('*')
    .single()

  if (error) {
    throwSupabaseError(error, '更新虾群估算失败')
  }

  return mapShrimpEstimateFromDailyRow(data)
}

export async function calculateGrowthSummary(
  organizationId: string,
  pondId: string,
  timeRange: TimeRange,
): Promise<GrowthSummary> {
  if (!isSupabaseMode) {
    const measurements = await getShrimpMeasurements(organizationId, pondId, timeRange)
    const first = measurements[0]
    const last = measurements[measurements.length - 1]

    return Promise.resolve({
      organizationId,
      pondId,
      timeRange,
      lengthGrowthCm: Number(((last?.average_length_cm ?? 0) - (first?.average_length_cm ?? 0)).toFixed(1)),
      weightGrowthG: Number(((last?.average_weight_g ?? 0) - (first?.average_weight_g ?? 0)).toFixed(1)),
      maturityChangePercent: 8,
      summary: '当前虾群增长趋势平稳，建议继续结合水体和摄食数据复核。',
    })
  }

  const rows = await getShrimpDailyStats(organizationId, pondId, timeRange)
  const pondUuid = await resolvePondUuid(organizationId, pondId)
  return mapGrowthSummary(organizationId, pondUuid, timeRange, rows)
}

export async function importShrimpMeasurementFromApp(
  organizationId: string,
  pondId: string,
  payload: Partial<ShrimpMeasurement> | ShrimpImageMeasurement,
): Promise<ShrimpMeasurement> {
  if ('detectedLengthCm' in payload) {
    return createShrimpMeasurement(organizationId, pondId, {
      average_length_cm: payload.detectedLengthCm,
      average_weight_g: 0,
      sampleCount: 1,
      source: 'image_ai',
      measuredAt: payload.measuredAt,
    })
  }

  return createShrimpMeasurement(organizationId, pondId, {
    average_length_cm: payload.average_length_cm,
    average_weight_g: payload.average_weight_g,
    sampleCount: payload.sampleCount ?? 1,
    source: 'app',
    measuredAt: payload.measuredAt,
  })
}
