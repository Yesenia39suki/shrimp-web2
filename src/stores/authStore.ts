import { defineStore } from 'pinia'

import {
  authenticateMockUser,
  clearMockSession,
  getMockOrganizations,
  getOrganizationRole,
  getSavedMockSession,
  registerMockUser,
  saveMockSession,
  updateMockOrganization,
} from '@/services/mockDataService'
import type { Organization, OrganizationRole, UserProfile } from '@/types/business'
import type { MockRegisterPayload } from '@/services/mockDataService'

const roleTextMap: Record<OrganizationRole, string> = {
  owner: '所有者',
  admin: '管理员',
  operator: '操作员',
  viewer: '查看者',
}

interface AuthState {
  isLoggedIn: boolean
  currentUser: UserProfile | null
  currentOrganization: Organization | null
  currentRole: OrganizationRole | null
  organizations: Organization[]
  sessionLoaded: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    isLoggedIn: false,
    currentUser: null,
    currentOrganization: null,
    currentRole: null,
    organizations: [],
    sessionLoaded: false,
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
  },
  actions: {
    applySession(user: UserProfile, organizationId: string, role: OrganizationRole) {
      this.organizations = getMockOrganizations(user.id)
      const organization = this.organizations.find((item) => item.id === organizationId)
      const resolvedRole = organization ? getOrganizationRole(user.id, organization.id) : null

      if (!organization || !resolvedRole) {
        this.isLoggedIn = false
        this.currentUser = null
        this.currentOrganization = null
        this.currentRole = null
        this.organizations = []
        return
      }

      this.isLoggedIn = true
      this.currentUser = user
      this.currentOrganization = organization
      this.currentRole = resolvedRole ?? role
    },
    login(email: string, password: string) {
      const session = authenticateMockUser(email, password)

      if (!session) {
        return {
          success: false,
          message: '邮箱或密码错误，请使用演示账号登录。',
        }
      }

      this.applySession(session.user, session.organizationId, session.role)
      saveMockSession(session)
      this.sessionLoaded = true

      return {
        success: true,
        message: '登录成功',
      }
    },
    register(payload: MockRegisterPayload) {
      const result = registerMockUser(payload)

      if (!result.success || !result.session) {
        return {
          success: false,
          message: result.message,
        }
      }

      this.applySession(result.session.user, result.session.organizationId, result.session.role)
      this.sessionLoaded = true

      return {
        success: true,
        message: result.message,
      }
    },
    logout() {
      clearMockSession()
      this.isLoggedIn = false
      this.currentUser = null
      this.currentOrganization = null
      this.currentRole = null
      this.organizations = []
      this.sessionLoaded = true
    },
    switchOrganization(organizationId: string) {
      if (!this.currentUser) {
        return false
      }

      const organization = this.organizations.find((item) => item.id === organizationId)
      const role = getOrganizationRole(this.currentUser.id, organizationId)

      if (!organization || !role) {
        return false
      }

      this.currentOrganization = organization
      this.currentRole = role
      saveMockSession({
        user: this.currentUser,
        organizationId: organization.id,
        role,
      })

      return true
    },
    updateCurrentOrganization(payload: Partial<Organization>) {
      if (!this.currentUser || !this.currentOrganization) {
        return {
          success: false,
          message: '未选择企业。',
        }
      }

      const updatedOrganization = updateMockOrganization(this.currentOrganization.id, payload)

      if (!updatedOrganization) {
        return {
          success: false,
          message: '企业信息保存失败。',
        }
      }

      this.organizations = getMockOrganizations(this.currentUser.id)
      this.currentOrganization =
        this.organizations.find((item) => item.id === updatedOrganization.id) ??
        updatedOrganization

      return {
        success: true,
        message: '企业信息已保存',
      }
    },
    loadMockSession() {
      if (this.sessionLoaded) {
        return
      }

      const session = getSavedMockSession()

      if (session) {
        this.applySession(session.user, session.organizationId, session.role)
      } else {
        this.isLoggedIn = false
        this.currentUser = null
        this.currentOrganization = null
        this.currentRole = null
        this.organizations = []
      }

      this.sessionLoaded = true
    },
  },
})
