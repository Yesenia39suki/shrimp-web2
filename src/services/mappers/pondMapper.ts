import type { Pond } from '@/types/business'
import type { Inserts, PondRow, Updates } from '@/types/database'

export function mapPondRow(row: PondRow): Pond {
  return {
    id: row.id,
    organization_id: row.organization_id,
    pond_code: row.pond_code,
    pond_name: row.pond_name,
    shrimp_species: row.shrimp_species,
    area: Number(row.area_mu ?? 0),
    water_depth: Number(row.water_depth_m ?? 0),
    location: row.location,
    map_position:
      row.longitude !== null && row.latitude !== null
        ? {
            organization_id: row.organization_id,
            pond_id: row.id,
            longitude: Number(row.longitude),
            latitude: Number(row.latitude),
          }
        : undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function mapPondInsert(
  organizationId: string,
  payload: Partial<Pond>,
): Inserts<'ponds'> {
  return {
    organization_id: organizationId,
    pond_code: payload.pond_code?.trim() || 'POND-001',
    pond_name: payload.pond_name?.trim() || '新建养殖池',
    shrimp_species: payload.shrimp_species?.trim() || '南美白对虾',
    area_mu: payload.area ?? 0,
    water_depth_m: payload.water_depth ?? 0,
    location: payload.location?.trim() || '未设置',
    longitude: payload.map_position?.longitude ?? null,
    latitude: payload.map_position?.latitude ?? null,
  }
}

export function mapPondUpdate(payload: Partial<Pond>): Updates<'ponds'> {
  return {
    pond_code: payload.pond_code,
    pond_name: payload.pond_name,
    shrimp_species: payload.shrimp_species,
    area_mu: payload.area,
    water_depth_m: payload.water_depth,
    location: payload.location,
    longitude: payload.map_position?.longitude,
    latitude: payload.map_position?.latitude,
  }
}
