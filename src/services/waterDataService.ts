import { isMockMode } from '@/config/dataSource'
import { supabase } from '@/lib/supabase'
import {
  mapWaterDailySummary,
  mapWaterLatestRow,
  mapWaterReadingRow,
} from '@/services/mappers/waterMapper'
import { resolvePondUuid, throwSupabaseError, toDateOnly } from '@/services/supabaseHelpers'
import type { TimeRange } from '@/types/business'
import type { WaterDailyStatsRow, WaterLatestRow } from '@/types/database'
import type {
  WaterHistoryQuery,
  WaterLatest,
  WaterQualitySummary,
  WaterReading,
  WaterUploadPayload,
} from '@/types/water'

const waterSubscriptions = new Map<string, { unsubscribe: () => void }>()

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
  if (isMockMode) {
    return Promise.resolve({
      organizationId,
      pondId,
      reading: createMockReading(organizationId, pondId),
      updatedAt: new Date().toISOString(),
    })
  }

  const pondUuid = await resolvePondUuid(organizationId, pondId)
  const { data, error } = await supabase
    .from('water_latest')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('pond_id', pondUuid)
    .maybeSingle()

  if (error) {
    throwSupabaseError(error, '读取最新水质失败')
  }

  if (!data) {
    throw new Error('暂无水质数据，请先添加')
  }

  return mapWaterLatestRow(data)
}

export async function getWaterHistory(
  organizationId: string,
  pondId: string,
  timeRange: TimeRange,
): Promise<WaterReading[]> {
  if (isMockMode) {
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

  const pondUuid = await resolvePondUuid(organizationId, pondId)
  const { data, error } = await supabase
    .from('water_readings')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('pond_id', pondUuid)
    .gte('recorded_at', timeRange.startAt)
    .lte('recorded_at', timeRange.endAt)
    .order('recorded_at', { ascending: true })

  if (error) {
    throwSupabaseError(error, '读取水质历史失败')
  }

  return (data ?? []).map(mapWaterReadingRow)
}

export async function getWaterQualitySummary(
  organizationId: string,
  pondId: string,
  timeRange: TimeRange,
): Promise<WaterQualitySummary> {
  if (isMockMode) {
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

  const pondUuid = await resolvePondUuid(organizationId, pondId)
  const { data, error } = await supabase
    .from('water_daily_stats')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('pond_id', pondUuid)
    .gte('stat_date', toDateOnly(timeRange.startAt))
    .lte('stat_date', toDateOnly(timeRange.endAt))
    .order('stat_date', { ascending: true })

  if (error) {
    throwSupabaseError(error, '读取水质统计失败')
  }

  return mapWaterDailySummary(organizationId, pondUuid, timeRange, data ?? [])
}

export async function getWaterDailyStats(
  organizationId: string,
  pondId: string,
  timeRange: TimeRange,
): Promise<WaterDailyStatsRow[]> {
  if (isMockMode) {
    return []
  }

  const pondUuid = await resolvePondUuid(organizationId, pondId)
  const { data, error } = await supabase
    .from('water_daily_stats')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('pond_id', pondUuid)
    .gte('stat_date', toDateOnly(timeRange.startAt))
    .lte('stat_date', toDateOnly(timeRange.endAt))
    .order('stat_date', { ascending: true })

  if (error) {
    throwSupabaseError(error, '读取水质日统计失败')
  }

  return data ?? []
}

export async function uploadWaterData(payload: WaterUploadPayload): Promise<WaterReading> {
  if (isMockMode) {
    return Promise.resolve({
      ...payload.reading,
      id: `water-${Date.now()}`,
      organizationId: payload.organizationId,
      pondId: payload.pondId,
    })
  }

  const pondUuid = await resolvePondUuid(payload.organizationId, payload.pondId)
  const { error } = await supabase.rpc('ingest_water_reading', {
    p_organization_id: payload.organizationId,
    p_pond_id: pondUuid,
    p_device_id: payload.deviceId || payload.reading.deviceId || null,
    p_recorded_at: payload.reading.recordedAt,
    p_temperature: payload.reading.temperature,
    p_dissolved_oxygen: payload.reading.dissolvedOxygen,
    p_ph: payload.reading.ph,
    p_orp: payload.reading.orp,
    p_turbidity: payload.reading.turbidity,
    p_ammonia: payload.reading.ammonia,
    p_nitrite: payload.reading.nitrite,
    p_hardness: payload.reading.hardness,
  })

  if (error) {
    throwSupabaseError(error, '保存水质读数失败')
  }

  return (await getLatestWaterData(payload.organizationId, pondUuid)).reading
}

export function subscribeWaterData(
  organizationId: string,
  pondId: string,
  callback: (reading: WaterReading) => void,
): string {
  const subscriptionId = `water-sub-${organizationId}-${pondId}-${Date.now()}`

  if (isMockMode) {
    window.setTimeout(() => callback(createMockReading(organizationId, pondId)), 300)
    return subscriptionId
  }

  void resolvePondUuid(organizationId, pondId).then((pondUuid) => {
    const channel = supabase
      .channel(subscriptionId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'water_latest',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const row = payload.new as WaterLatestRow
          if (row.pond_id === pondUuid) {
            callback(mapWaterLatestRow(row).reading)
          }
        },
      )
      .subscribe()

    waterSubscriptions.set(subscriptionId, {
      unsubscribe: () => {
        void supabase.removeChannel(channel)
      },
    })
  })

  return subscriptionId
}

export function unsubscribeWaterData(subscriptionId: string): boolean {
  const subscription = waterSubscriptions.get(subscriptionId)
  subscription?.unsubscribe()
  waterSubscriptions.delete(subscriptionId)
  return true
}
