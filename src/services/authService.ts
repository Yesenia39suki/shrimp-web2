import {
  authenticateMockUser,
  clearMockSession,
  getMockOrganizations,
  getSavedMockSession,
  saveMockSession,
} from '@/services/mockDataService'
import type { MockSession } from '@/services/mockDataService'
import type { Organization, UserProfile } from '@/types/business'

export async function getCurrentSession(): Promise<MockSession | null> {
  // TODO: 替换为 Supabase Auth session。
  return Promise.resolve(getSavedMockSession())
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const session = getSavedMockSession()
  return Promise.resolve(session?.user ?? null)
}

export async function loginWithEmail(email: string, password: string): Promise<MockSession | null> {
  // TODO: 替换为 Supabase Auth 邮箱登录。
  const session = authenticateMockUser(email, password)
  if (session) {
    saveMockSession(session)
  }
  return Promise.resolve(session)
}

export async function logout(): Promise<void> {
  clearMockSession()
  return Promise.resolve()
}

export async function loadUserProfile(userId: string): Promise<UserProfile | null> {
  const session = getSavedMockSession()
  return Promise.resolve(session?.user.id === userId ? session.user : null)
}

export async function loadUserOrganizations(userId: string): Promise<Organization[]> {
  return Promise.resolve(getMockOrganizations(userId))
}

export async function switchOrganization(organizationId: string): Promise<MockSession | null> {
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
