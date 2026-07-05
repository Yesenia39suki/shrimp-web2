import type { Alert, AlertFilters, AlertResolvePayload } from '@/types/alert'

function mockAlert(organizationId: string): Alert {
  return {
    id: 'alert-mock-01',
    organizationId,
    pondId: 'P-01',
    type: 'water_quality',
    level: 'warning',
    title: '溶解氧低于建议值',
    content: '建议复核增氧设备状态，并暂缓加量投喂。',
    readStatus: 'unread',
    createdAt: new Date().toISOString(),
  }
}

export async function getAlerts(
  organizationId: string,
  filters: AlertFilters = {},
): Promise<Alert[]> {
  void filters
  return Promise.resolve([mockAlert(organizationId)])
}

export async function getUnreadAlertCount(organizationId: string): Promise<number> {
  return Promise.resolve(
    (await getAlerts(organizationId)).filter((alert) => alert.readStatus === 'unread').length,
  )
}

export async function createAlert(organizationId: string, payload: Partial<Alert>): Promise<Alert> {
  // TODO: 创建 alerts，并触发 Realtime 通知。
  return Promise.resolve({
    ...mockAlert(organizationId),
    ...payload,
    id: `alert-${Date.now()}`,
    organizationId,
  })
}

export async function markAlertRead(organizationId: string, alertId: string): Promise<boolean> {
  void organizationId
  void alertId
  return Promise.resolve(true)
}

export async function markAllAlertsRead(organizationId: string): Promise<boolean> {
  void organizationId
  return Promise.resolve(true)
}

export async function resolveAlert(
  organizationId: string,
  alertId: string,
  payload: AlertResolvePayload,
): Promise<Alert> {
  return Promise.resolve({
    ...mockAlert(organizationId),
    id: alertId,
    readStatus: 'resolved',
    resolvedAt: new Date().toISOString(),
    content: payload.remark,
  })
}

export function subscribeAlerts(organizationId: string, callback: (alert: Alert) => void): string {
  const subscriptionId = `alert-sub-${organizationId}-${Date.now()}`
  window.setTimeout(() => callback(mockAlert(organizationId)), 300)
  return subscriptionId
}
