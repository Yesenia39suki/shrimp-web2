import { isMockMode } from '@/config/dataSource'
import { supabase } from '@/lib/supabase'
import {
  getMockOrganizations,
  getSavedMockSession,
  updateMockOrganization,
} from '@/services/mockDataService'
import { mapOrganizationRow, mapOrganizationUpdate } from '@/services/mappers/organizationMapper'
import { throwSupabaseError } from '@/services/supabaseHelpers'
import type { Organization, OrganizationMember, UserRole } from '@/types/business'

export async function getOrganizations(): Promise<Organization[]> {
  if (isMockMode) {
    const session = getSavedMockSession()
    return Promise.resolve(getMockOrganizations(session?.user.id))
  }

  const session = getSavedMockSession()
  void session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throwSupabaseError(userError, '读取登录状态失败')
  }

  if (!user) return []

  const { data: members, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)

  if (memberError) {
    throwSupabaseError(memberError, '读取企业成员失败')
  }

  const organizationIds = (members ?? []).map((member) => member.organization_id)
  if (organizationIds.length === 0) return []

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .in('id', organizationIds)
    .order('created_at', { ascending: true })

  if (error) {
    throwSupabaseError(error, '读取企业列表失败')
  }

  return (data ?? []).map(mapOrganizationRow)
}

export async function getCurrentOrganization(): Promise<Organization | null> {
  if (isMockMode) {
    const session = getSavedMockSession()
    const organizations = getMockOrganizations(session?.user.id)
    return Promise.resolve(organizations.find((item) => item.id === session?.organizationId) ?? null)
  }

  const organizations = await getOrganizations()
  return organizations[0] ?? null
}

export async function updateOrganization(
  organizationId: string,
  payload: Partial<Organization>,
): Promise<Organization> {
  if (isMockMode) {
    const updatedOrganization = updateMockOrganization(organizationId, payload)
    return Promise.resolve(
      updatedOrganization ?? ({ id: organizationId, ...payload } as Organization),
    )
  }

  const name = payload.name?.trim()
  const shortName = payload.short_name?.trim() || (name ? name.slice(0, 12) : undefined)
  const { data, error } = await supabase
    .from('organizations')
    .update(
      mapOrganizationUpdate({
        ...payload,
        name,
        short_name: shortName,
      }),
    )
    .eq('id', organizationId)
    .select('*')
    .single()

  if (error) {
    throwSupabaseError(error, '企业信息保存失败')
  }

  return mapOrganizationRow(data)
}

export async function getOrganizationMembers(
  organizationId: string,
): Promise<OrganizationMember[]> {
  if (isMockMode) {
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

  const { data, error } = await supabase
    .from('organization_members')
    .select('*')
    .eq('organization_id', organizationId)
    .order('joined_at', { ascending: true })

  if (error) {
    throwSupabaseError(error, '读取企业成员失败')
  }

  return (data ?? []).map((member) => ({
    id: member.id,
    organization_id: member.organization_id,
    user_id: member.user_id,
    role: member.role,
    joined_at: member.joined_at,
  }))
}

export async function inviteMember(
  organizationId: string,
  payload: { email: string; role: UserRole },
): Promise<OrganizationMember> {
  // TODO: 后续应由 Edge Function 根据邮箱查找/邀请用户；前端不直接创建 Auth 用户。
  if (!isMockMode) {
    throw new Error('成员邀请需要后端函数创建邀请，当前前端不直接写 Auth 用户。')
  }

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
  if (isMockMode) {
    return Promise.resolve({
      id: memberId,
      organization_id: organizationId,
      user_id: 'mock-user',
      role,
    })
  }

  const { data, error } = await supabase
    .from('organization_members')
    .update({ role })
    .eq('organization_id', organizationId)
    .eq('id', memberId)
    .select('*')
    .single()

  if (error) {
    throwSupabaseError(error, '更新成员角色失败')
  }

  return {
    id: data.id,
    organization_id: data.organization_id,
    user_id: data.user_id,
    role: data.role,
    joined_at: data.joined_at,
  }
}

export async function removeMember(organizationId: string, memberId: string): Promise<boolean> {
  if (isMockMode) {
    void organizationId
    void memberId
    return Promise.resolve(true)
  }

  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', memberId)

  if (error) {
    throwSupabaseError(error, '删除成员失败')
  }

  return true
}
