import { isMockMode } from '@/config/dataSource'
import { supabase } from '@/lib/supabase'
import { getBusinessConfig, saveBusinessConfig } from '@/services/mockDataService'
import { mapThresholdRow, mapThresholdUpsert } from '@/services/mappers/thresholdMapper'
import { resolvePondUuid, throwSupabaseError } from '@/services/supabaseHelpers'
import type { WaterThreshold } from '@/types/business'
import type { WaterQualityWarning, WaterReading } from '@/types/water'

function defaultThreshold(organizationId: string, pondId: string): WaterThreshold {
  return {
    id: `threshold-${organizationId}-${pondId}`,
    organization_id: organizationId,
    pond_id: pondId,
    temperature: { min: 20, max: 35 },
    oxygen: { min: 5, max: 9 },
    ph: { min: 7, max: 8.6 },
    orp: { min: 250, max: 420 },
    turbidity: { min: 0, max: 30 },
    ammonia: { min: 0, max: 0.3 },
    nitrite: { min: 0, max: 0.12 },
    hardness: { min: 120, max: 260 },
  }
}

export async function getThresholds(
  organizationId: string,
  pondId: string,
): Promise<WaterThreshold> {
  if (isMockMode) {
    const thresholds = getBusinessConfig(organizationId).waterThreshold
    return Promise.resolve({ ...thresholds, pond_id: pondId })
  }

  const pondUuid = await resolvePondUuid(organizationId, pondId)
  const { data, error } = await supabase
    .from('water_thresholds')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('pond_id', pondUuid)
    .maybeSingle()

  if (error) {
    throwSupabaseError(error, '读取水质阈值失败')
  }

  return data ? mapThresholdRow(data) : defaultThreshold(organizationId, pondUuid)
}

export async function saveThresholds(
  organizationId: string,
  pondId: string,
  payload: WaterThreshold,
): Promise<WaterThreshold> {
  if (isMockMode) {
    const config = getBusinessConfig(organizationId)
    saveBusinessConfig(organizationId, {
      ...config,
      waterThreshold: { ...payload, organization_id: organizationId, pond_id: pondId },
    })
    return Promise.resolve(payload)
  }

  const pondUuid = await resolvePondUuid(organizationId, pondId)
  const { data, error } = await supabase
    .from('water_thresholds')
    .upsert(mapThresholdUpsert(organizationId, pondUuid, payload), {
      onConflict: 'organization_id,pond_id',
    })
    .select('*')
    .single()

  if (error) {
    throwSupabaseError(error, '保存水质阈值失败')
  }

  return mapThresholdRow(data)
}

export async function resetDefaultThresholds(
  organizationId: string,
  pondId: string,
): Promise<WaterThreshold> {
  return saveThresholds(organizationId, pondId, defaultThreshold(organizationId, pondId))
}

export function checkWaterWarning(
  waterData: WaterReading,
  thresholds: WaterThreshold,
): WaterQualityWarning[] {
  const checks = [
    ['temperature', '温度', waterData.temperature, thresholds.temperature],
    ['oxygen', '溶解氧', waterData.dissolvedOxygen, thresholds.oxygen],
    ['ph', 'pH', waterData.ph, thresholds.ph],
    ['ammonia', '氨氮', waterData.ammonia, thresholds.ammonia],
  ] as const

  return checks.flatMap(([metricKey, metricLabel, currentValue, range]) => {
    if (currentValue >= range.min && currentValue <= range.max) return []
    return [
      {
        organizationId: waterData.organizationId,
        pondId: waterData.pondId,
        metricKey,
        metricLabel,
        currentValue,
        min: range.min,
        max: range.max,
        level: '预警',
        message: `${metricLabel}超出阈值范围`,
      },
    ]
  })
}
