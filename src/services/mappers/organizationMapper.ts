import type { Organization } from '@/types/business'
import type { OrganizationRow, Updates } from '@/types/database'

export function mapOrganizationRow(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    short_name: row.short_name,
    region: row.region,
    status: row.status,
    owner_user_id: row.owner_user_id ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function mapOrganizationUpdate(payload: Partial<Organization>): Updates<'organizations'> {
  return {
    name: payload.name,
    short_name: payload.short_name,
    region: payload.region,
    status: payload.status,
    owner_user_id: payload.owner_user_id,
  }
}
