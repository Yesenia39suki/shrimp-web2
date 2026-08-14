import { defineStore } from 'pinia'

import {
  getCurrentSession,
  loadOrganizationRole,
  loadUserOrganizations,
  loginWithEmail,
  logout as logoutService,
  registerWithEmail,
  switchOrganization as switchOrganizationService,
} from '@/services/authService'
import { updateOrganization } from '@/services/organizationService'
import type { Organization, OrganizationRole, UserProfile } from '@/types/business'
import type { MockRegisterPayload, MockSession } from '@/services/mockDataService'

const roleTextMap: Record<OrganizationRole, string> = {
  owner: '所有者',
  admin: '管理员',
  operator: '操作员',
  viewer: '查看者',
}

interface AuthState {
  isLoggedIn: boolean
  currentUser: UserProfile | null
  currentProfile: UserProfile | null
  currentOrganization: Organization | null
  currentRole: OrganizationRole | null
  organizations: Organization[]
  sessionLoaded: boolean
  error: string
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    isLoggedIn: false,
    currentUser: null,
    currentProfile: null,
    currentOrganization: null,
    currentRole: null,
    organizations: [],
    sessionLoaded: false,
    error: '',
  }),
  getters: {
    currentRoleText(state) {
      return state.currentRole ? roleTextMap[state.currentRole] : '未登录'
    },
    canEditBusinessConfig(state) {
      return (
        state.currentRole === 'owner' ||
        state.currentRole === 'admin' ||
        state.currentRole === 'operator'
      )
    },
    canDeleteBusinessConfig(state) {
      return state.currentRole === 'owner' || state.currentRole === 'admin'
    },
  },
  actions: {
    resetSessionState(message = '') {
      this.isLoggedIn = false
      this.currentUser = null
      this.currentProfile = null
      this.currentOrganization = null
      this.currentRole = null
      this.organizations = []
      this.error = message
    },
    async applySession(session: MockSession | null) {
      if (!session) {
        this.resetSessionState()
        return
      }

      this.organizations = await loadUserOrganizations(session.user.id)
      const organization =
        this.organizations.find((item) => item.id === session.organizationId) ??
        this.organizations[0]

      if (!organization) {
        this.resetSessionState('当前账号尚未加入企业，请联系管理员。')
        return
      }

      const resolvedRole = await loadOrganizationRole(session.user.id, organization.id)

      if (!resolvedRole) {
        this.resetSessionState('当前账号尚未加入企业，请联系管理员。')
        return
      }

      this.isLoggedIn = true
      this.currentUser = session.user
      this.currentProfile = session.user
      this.currentOrganization = organization
      this.currentRole = resolvedRole
      this.error = ''
    },
    async login(email: string, password: string) {
      try {
        const session = await loginWithEmail(email, password)

        if (!session) {
          return {
            success: false,
            message: '邮箱或密码错误，请检查后重试。',
          }
        }

        await this.applySession(session)
        this.sessionLoaded = true

        if (!this.isLoggedIn) {
          return {
            success: false,
            message: this.error || '当前账号尚未加入企业，请联系管理员。',
          }
        }

        return {
          success: true,
          message: '登录成功',
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '登录失败'
        this.resetSessionState(message)
        this.sessionLoaded = true
        return {
          success: false,
          message,
        }
      }
    },
    async register(payload: MockRegisterPayload) {
      try {
        const result = await registerWithEmail(payload)

        if (!result.success || !result.session) {
          return {
            success: result.success,
            message: result.message,
          }
        }

        await this.applySession(result.session)
        this.sessionLoaded = true

        return {
          success: this.isLoggedIn,
          message: this.isLoggedIn
            ? result.message
            : this.error || '注册成功，请登录后继续。',
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '注册失败'
        return {
          success: false,
          message,
        }
      }
    },
    async logout() {
      await logoutService()
      this.resetSessionState()
      this.sessionLoaded = true
    },
    async switchOrganization(organizationId: string) {
      if (!this.currentUser) {
        return false
      }

      try {
        const session = await switchOrganizationService(organizationId)
        if (!session) return false
        await this.applySession(session)
        return this.currentOrganization?.id === organizationId
      } catch (error) {
        this.error = error instanceof Error ? error.message : '切换企业失败'
        return false
      }
    },
    async updateCurrentOrganization(payload: Partial<Organization>) {
      if (!this.currentUser || !this.currentOrganization) {
        return {
          success: false,
          message: '未选择企业。',
        }
      }

      try {
        const updatedOrganization = await updateOrganization(this.currentOrganization.id, payload)
        this.organizations = await loadUserOrganizations(this.currentUser.id)
        this.currentOrganization =
          this.organizations.find((item) => item.id === updatedOrganization.id) ??
          updatedOrganization

        return {
          success: true,
          message: '企业信息已保存',
        }
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : '企业信息保存失败。',
        }
      }
    },
    async loadMockSession() {
      if (this.sessionLoaded) {
        return
      }

      try {
        await this.applySession(await getCurrentSession())
      } catch (error) {
        this.resetSessionState(error instanceof Error ? error.message : '登录状态已失效，请重新登录')
      } finally {
        this.sessionLoaded = true
      }
    },
  },
})
