import type { OrganizationMember, UserProfile } from '@/types/business'
import type { OrganizationMemberRow, ProfileRow } from '@/types/database'

export function mapProfileRow(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    display_name: row.display_name,
    email: row.email,
    phone: row.phone ?? undefined,
    avatar_url: row.avatar_url ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function mapOrganizationMemberRow(row: OrganizationMemberRow): OrganizationMember {
  return {
    id: row.id,
    organization_id: row.organization_id,
    user_id: row.user_id,
    role: row.role,
    joined_at: row.joined_at,
  }
}
