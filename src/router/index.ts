import { createRouter, createWebHistory } from 'vue-router'

import { useAuthStore } from '@/stores/authStore'
import LoginView from '@/views/LoginView.vue'
import OperationConsoleView from '@/views/OperationConsoleView.vue'
import OperationConsoleV4View from '@/views/OperationConsoleV4View.vue'
import OperationConsoleV5View from '@/views/OperationConsoleV5View.vue'
import OperationConsoleV6View from '@/views/OperationConsoleV6View.vue'
import SystemShellLayout from '@/components/system/SystemShellLayout.vue'
import ExtensionCenterView from '@/views/system/ExtensionCenterView.vue'
import HistoryDataView from '@/views/system/HistoryDataView.vue'
import RobotMonitorView from '@/views/system/RobotMonitorView.vue'
import ShrimpMetricDetailView from '@/views/system/ShrimpMetricDetailView.vue'
import ShrimpOverviewView from '@/views/system/ShrimpOverviewView.vue'
import SystemConfigView from '@/views/system/SystemConfigView.vue'
import SystemOverviewView from '@/views/system/SystemOverviewView.vue'
import WaterMetricDetailView from '@/views/system/WaterMetricDetailView.vue'
import WaterOverviewView from '@/views/system/WaterOverviewView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/system',
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: {
        public: true,
      },
    },
    {
      path: '/console-old',
      name: 'operation-console',
      component: OperationConsoleView,
    },
    {
      path: '/console-v4',
      name: 'operation-console-v4',
      component: OperationConsoleV4View,
    },
    {
      path: '/console-v5',
      name: 'operation-console-v5',
      component: OperationConsoleV5View,
    },
    {
      path: '/console-v6',
      name: 'operation-console-v6',
      component: OperationConsoleV6View,
    },
    {
      path: '/system',
      component: SystemShellLayout,
      children: [
        {
          path: '',
          name: 'system-overview',
          component: SystemOverviewView,
        },
        {
          path: 'water',
          name: 'system-water',
          component: WaterOverviewView,
        },
        {
          path: 'water/:metricKey',
          name: 'system-water-detail',
          component: WaterMetricDetailView,
        },
        {
          path: 'shrimp',
          name: 'system-shrimp',
          component: ShrimpOverviewView,
        },
        {
          path: 'shrimp/:metricKey',
          name: 'system-shrimp-detail',
          component: ShrimpMetricDetailView,
        },
        {
          path: 'robot',
          name: 'system-robot',
          component: RobotMonitorView,
        },
        {
          path: 'extensions',
          name: 'system-extensions',
          component: ExtensionCenterView,
        },
        {
          path: 'history',
          name: 'system-history',
          component: HistoryDataView,
        },
        {
          path: 'config',
          name: 'system-config',
          component: SystemConfigView,
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  await authStore.loadMockSession()

  if (to.meta.public && authStore.isLoggedIn) {
    return '/system'
  }

  if (!to.meta.public && !authStore.isLoggedIn) {
    return {
      path: '/login',
      query: {
        redirect: to.fullPath,
      },
    }
  }

  return true
})

export default router
