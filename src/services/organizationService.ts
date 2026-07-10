import {
  getMockOrganizations,
  getSavedMockSession,
  updateMockOrganization,
} from '@/services/mockDataService'
import type { Organization, OrganizationMember, UserRole } from '@/types/business'

export async function getOrganizations(): Promise<Organization[]> {
  const session = getSavedMockSession()
  return Promise.resolve(getMockOrganizations(session?.user.id))
}

export async function getCurrentOrganization(): Promise<Organization | null> {
  const session = getSavedMockSession()
  const organizations = getMockOrganizations(session?.user.id)
  return Promise.resolve(organizations.find((item) => item.id === session?.organizationId) ?? null)
}

export async function updateOrganization(
  organizationId: string,
  payload: Partial<Organization>,
): Promise<Organization> {
  // TODO: 调用 /functions/v1 或 Supabase 更新企业，并写 operation_logs。
  const updatedOrganization = updateMockOrganization(organizationId, payload)
  return Promise.resolve(
    updatedOrganization ?? ({ id: organizationId, ...payload } as Organization),
  )
}

export async function getOrganizationMembers(
  organizationId: string,
): Promise<OrganizationMember[]> {
  // TODO: 从 organization_members 按 organizationId 查询。
  return Promise.resolve([
    {
      id: 'mock-member-owner',
      organization_id: organizationId,
      user_id: getSavedMockSession()?.user.id ?? 'mock-user',
      role: 'owner',
      display_name: getSavedMockSession()?.user.display_name ?? '当前用户',
      email: getSavedMockSession()?.user.email ?? 'mock@example.com',
    },
  ])
}

export async function inviteMember(
  organizationId: string,
  payload: { email: string; role: UserRole },
): Promise<OrganizationMember> {
  // TODO: owner/admin 可邀请成员，后续写 audit_logs。
  return Promise.resolve({
    id: `member-${Date.now()}`,
    organization_id: organizationId,
    user_id: `pending-${payload.email}`,
    role: payload.role,
    email: payload.email,
  })
}

export async function updateMemberRole(
  organizationId: string,
  memberId: string,
  role: UserRole,
): Promise<OrganizationMember> {
  // TODO: owner/admin 可改角色，viewer/operator 禁止。
  return Promise.resolve({
    id: memberId,
    organization_id: organizationId,
    user_id: 'mock-user',
    role,
  })
}

export async function removeMember(organizationId: string, memberId: string): Promise<boolean> {
  // TODO: 删除 organization_members 并写 audit_logs。
  void organizationId
  void memberId
  return Promise.resolve(true)
}
