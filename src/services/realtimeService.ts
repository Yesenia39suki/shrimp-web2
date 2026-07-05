import { getAlerts } from '@/services/alertService'
import { getLatestRobotPosition } from '@/services/robotPositionService'
import { getLatestWaterData } from '@/services/waterDataService'
import type { Alert } from '@/types/alert'
import type { RobotCommand } from '@/types/robot'
import type { RobotPositionLatest } from '@/types/robot'
import type { WaterLatest } from '@/types/water'

const subscriptionTimers = new Map<string, number>()

function createSubscriptionId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function subscribeTableChanges<TPayload = unknown>(
  tableName: string,
  filters: Record<string, unknown>,
  callback: (payload: TPayload) => void,
): string {
  // TODO: 后续统一封装 Supabase Realtime channel 或 WebSocket。
  const subscriptionId = createSubscriptionId(`table-${tableName}`)
  const timerId = window.setInterval(() => {
    callback({
      tableName,
      filters,
      eventType: 'mock_update',
      receivedAt: new Date().toISOString(),
    } as TPayload)
  }, 3000)
  subscriptionTimers.set(subscriptionId, timerId)
  return subscriptionId
}

export function unsubscribe(subscriptionId: string): boolean {
  const timerId = subscriptionTimers.get(subscriptionId)
  if (timerId !== undefined) {
    window.clearInterval(timerId)
    subscriptionTimers.delete(subscriptionId)
  }
  return true
}

export function subscribeWaterLatest(
  organizationId: string,
  pondId: string,
  callback: (payload: WaterLatest) => void,
): string {
  const subscriptionId = createSubscriptionId(`water-latest-${organizationId}-${pondId}`)
  const timerId = window.setInterval(async () => {
    callback(await getLatestWaterData(organizationId, pondId))
  }, 2500)
  subscriptionTimers.set(subscriptionId, timerId)
  return subscriptionId
}

export function subscribeRobotPosition(
  organizationId: string,
  robotId: string,
  callback: (payload: RobotPositionLatest) => void,
): string {
  const subscriptionId = createSubscriptionId(`robot-position-${organizationId}-${robotId}`)
  const timerId = window.setInterval(async () => {
    callback(await getLatestRobotPosition(organizationId, robotId))
  }, 1500)
  subscriptionTimers.set(subscriptionId, timerId)
  return subscriptionId
}

export function subscribeAlerts(
  organizationId: string,
  callback: (payload: Alert) => void,
): string {
  const subscriptionId = createSubscriptionId(`alerts-${organizationId}`)
  const timerId = window.setInterval(async () => {
    const alerts = await getAlerts(organizationId)
    if (alerts[0]) {
      callback(alerts[0])
    }
  }, 5000)
  subscriptionTimers.set(subscriptionId, timerId)
  return subscriptionId
}

export function subscribeRobotCommands(
  organizationId: string,
  robotId: string,
  callback: (payload: RobotCommand) => void,
): string {
  const subscriptionId = createSubscriptionId(`robot-command-${organizationId}-${robotId}`)
  const timerId = window.setInterval(() => {
    callback({
      id: `mock-command-${Date.now()}`,
      organizationId,
      robotId,
      type: 'patrol',
      status: 'sent',
      payload: { source: 'mock-realtime' },
      createdAt: new Date().toISOString(),
    })
  }, 6000)
  subscriptionTimers.set(subscriptionId, timerId)
  return subscriptionId
}
