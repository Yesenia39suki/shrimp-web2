import { getBusinessConfig, saveBusinessConfig } from '@/services/mockDataService'
import type { WaterThreshold } from '@/types/business'
import type { WaterQualityWarning, WaterReading } from '@/types/water'

export async function getThresholds(
  organizationId: string,
  pondId: string,
): Promise<WaterThreshold> {
  const thresholds = getBusinessConfig(organizationId).waterThreshold
  return Promise.resolve({ ...thresholds, pond_id: pondId })
}

export async function saveThresholds(
  organizationId: string,
  pondId: string,
  payload: WaterThreshold,
): Promise<WaterThreshold> {
  const config = getBusinessConfig(organizationId)
  saveBusinessConfig(organizationId, {
    ...config,
    waterThreshold: { ...payload, organization_id: organizationId, pond_id: pondId },
  })
  return Promise.resolve(payload)
}

export async function resetDefaultThresholds(
  organizationId: string,
  pondId: string,
): Promise<WaterThreshold> {
  return getThresholds(organizationId, pondId)
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
