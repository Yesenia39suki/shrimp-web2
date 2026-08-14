import type { WaterThreshold } from '@/types/business'
import type { Inserts, Updates, WaterThresholdRow } from '@/types/database'

function isUuidLike(value: string | undefined) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  )
}

export function mapThresholdRow(row: WaterThresholdRow): WaterThreshold {
  return {
    id: row.id,
    organization_id: row.organization_id,
    pond_id: row.pond_id,
    temperature: { min: Number(row.temperature_min), max: Number(row.temperature_max) },
    oxygen: {
      min: Number(row.dissolved_oxygen_min),
      max: Number(row.dissolved_oxygen_max),
    },
    ph: { min: Number(row.ph_min), max: Number(row.ph_max) },
    orp: { min: Number(row.orp_min), max: Number(row.orp_max) },
    turbidity: { min: Number(row.turbidity_min), max: Number(row.turbidity_max) },
    ammonia: { min: Number(row.ammonia_min), max: Number(row.ammonia_max) },
    nitrite: { min: Number(row.nitrite_min), max: Number(row.nitrite_max) },
    hardness: { min: Number(row.hardness_min), max: Number(row.hardness_max) },
  }
}

export function mapThresholdUpsert(
  organizationId: string,
  pondId: string,
  payload: WaterThreshold,
): Inserts<'water_thresholds'> {
  const row: Inserts<'water_thresholds'> = {
    organization_id: organizationId,
    pond_id: pondId,
    temperature_min: payload.temperature.min,
    temperature_max: payload.temperature.max,
    dissolved_oxygen_min: payload.oxygen.min,
    dissolved_oxygen_max: payload.oxygen.max,
    ph_min: payload.ph.min,
    ph_max: payload.ph.max,
    orp_min: payload.orp.min,
    orp_max: payload.orp.max,
    turbidity_min: payload.turbidity.min,
    turbidity_max: payload.turbidity.max,
    ammonia_min: payload.ammonia.min,
    ammonia_max: payload.ammonia.max,
    nitrite_min: payload.nitrite.min,
    nitrite_max: payload.nitrite.max,
    hardness_min: payload.hardness.min,
    hardness_max: payload.hardness.max,
  }

  if (isUuidLike(payload.id)) {
    row.id = payload.id
  }

  return row
}

export function mapThresholdUpdate(payload: WaterThreshold): Updates<'water_thresholds'> {
  return mapThresholdUpsert(payload.organization_id, payload.pond_id ?? '', payload)
}
