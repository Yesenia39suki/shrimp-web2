import { isMockMode, isSupabaseMode } from '@/config/dataSource'
import { supabase } from '@/lib/supabase'
import {
  authenticateMockUser,
  clearMockSession,
  getMockOrganizations,
  getOrganizationRole,
  getSavedMockSession,
  registerMockUser,
  saveMockSession,
} from '@/services/mockDataService'
import { mapProfileRow } from '@/services/mappers/authMapper'
import { mapOrganizationRow } from '@/services/mappers/organizationMapper'
import { throwSupabaseError } from '@/services/supabaseHelpers'
import type { MockRegisterPayload, MockSession } from '@/services/mockDataService'
import type { Organization, OrganizationRole, UserProfile } from '@/types/business'

const SELECTED_ORGANIZATION_STORAGE_KEY = 'shrimp_supabase_selected_organization_id'

function canUseLocalStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function getSelectedOrganizationId() {
  if (!canUseLocalStorage()) return ''
  return window.localStorage.getItem(SELECTED_ORGANIZATION_STORAGE_KEY) ?? ''
}

function saveSelectedOrganizationId(organizationId: string) {
  if (!canUseLocalStorage()) return
  window.localStorage.setItem(SELECTED_ORGANIZATION_STORAGE_KEY, organizationId)
}

async function buildSupabaseSession(preferredOrganizationId = ''): Promise<MockSession | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    if (userError.message.toLowerCase().includes('session missing')) {
      return null
    }

    throwSupabaseError(userError, '登录状态已失效，请重新登录')
  }

  if (!user) {
    return null
  }

  const [profileResult, memberResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase
      .from('organization_members')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
  ])

  if (profileResult.error) {
    throwSupabaseError(profileResult.error, '读取用户资料失败')
  }

  if (memberResult.error) {
    throwSupabaseError(memberResult.error, '读取企业成员失败')
  }

  const members = memberResult.data ?? []

  if (members.length === 0) {
    throw new Error('当前账号尚未加入企业，请联系管理员。')
  }

  const organizationIds = members.map((member) => member.organization_id)
  const { data: organizationRows, error: organizationError } = await supabase
    .from('organizations')
    .select('*')
    .in('id', organizationIds)

  if (organizationError) {
    throwSupabaseError(organizationError, '读取企业列表失败')
  }

  const organizations = organizationRows ?? []
  const selectedOrganization =
    organizations.find(
      (organization) =>
        organization.id === preferredOrganizationId || organization.id === getSelectedOrganizationId(),
    ) ?? organizations[0]
  const selectedMember = members.find(
    (member) => member.organization_id === selectedOrganization?.id,
  )

  if (!selectedOrganization || !selectedMember) {
    throw new Error('当前账号尚未加入企业，请联系管理员。')
  }

  saveSelectedOrganizationId(selectedOrganization.id)

  const profile: UserProfile = profileResult.data
    ? mapProfileRow(profileResult.data)
    : {
        id: user.id,
        display_name:
          String(user.user_metadata.display_name ?? user.user_metadata.name ?? '').trim() ||
          user.email?.split('@')[0] ||
          '新用户',
        email: user.email ?? '',
      }

  return {
    user: profile,
    organizationId: selectedOrganization.id,
    role: selectedMember.role,
  }
}

export async function getCurrentSession(): Promise<MockSession | null> {
  if (isMockMode) {
    return Promise.resolve(getSavedMockSession())
  }

  return buildSupabaseSession()
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  if (isMockMode) {
    const session = getSavedMockSession()
    return Promise.resolve(session?.user ?? null)
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    throwSupabaseError(error, '登录状态已失效，请重新登录')
  }

  if (!user) return null
  return loadUserProfile(user.id)
}

export async function loginWithEmail(email: string, password: string): Promise<MockSession | null> {
  if (isMockMode) {
    const session = authenticateMockUser(email, password)
    if (session) {
      saveMockSession(session)
    }
    return Promise.resolve(session)
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error('邮箱或密码错误，请检查后重试。')
  }

  return buildSupabaseSession()
}

export async function registerWithEmail(payload: MockRegisterPayload) {
  if (isMockMode) {
    return Promise.resolve(registerMockUser(payload))
  }

  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        display_name: payload.displayName,
        organization_name: payload.organizationName,
      },
    },
  })

  if (error) {
    throwSupabaseError(error, '注册失败')
  }

  if (!data.session) {
    return {
      success: true,
      message: '注册成功，请根据邮箱提示完成验证后登录。',
      session: null,
    }
  }

  const session = await buildSupabaseSession()

  return {
    success: true,
    message: session ? '注册成功' : '注册成功，请根据邮箱提示完成验证后登录。',
    session,
  }
}

export async function logout(): Promise<void> {
  if (isMockMode) {
    clearMockSession()
    return Promise.resolve()
  }

  const { error } = await supabase.auth.signOut()
  if (error) {
    throwSupabaseError(error, '退出登录失败')
  }
}

export async function loadUserProfile(userId: string): Promise<UserProfile | null> {
  if (isMockMode) {
    const session = getSavedMockSession()
    return Promise.resolve(session?.user.id === userId ? session.user : null)
  }

  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()

  if (error) {
    throwSupabaseError(error, '读取用户资料失败')
  }

  return data ? mapProfileRow(data) : null
}

export async function loadUserOrganizations(userId: string): Promise<Organization[]> {
  if (isMockMode) {
    return Promise.resolve(getMockOrganizations(userId))
  }

  const { data: members, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)

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

export async function loadOrganizationRole(
  userId: string,
  organizationId: string,
): Promise<OrganizationRole | null> {
  if (isMockMode) {
    return Promise.resolve(getOrganizationRole(userId, organizationId))
  }

  const { data, error } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (error) {
    throwSupabaseError(error, '读取企业角色失败')
  }

  return data?.role ?? null
}

export async function switchOrganization(organizationId: string): Promise<MockSession | null> {
  if (isMockMode) {
    const session = getSavedMockSession()
    if (!session) return Promise.resolve(null)

    const organization = getMockOrganizations(session.user.id).find(
      (item) => item.id === organizationId,
    )
    if (!organization) return Promise.resolve(null)

    const nextSession = { ...session, organizationId }
    saveMockSession(nextSession)
    return Promise.resolve(nextSession)
  }

  return buildSupabaseSession(organizationId)
}

export function onAuthStateChange(callback: () => void) {
  if (!isSupabaseMode) {
    return () => undefined
  }

  const { data } = supabase.auth.onAuthStateChange(() => {
    callback()
  })

  return () => data.subscription.unsubscribe()
}
