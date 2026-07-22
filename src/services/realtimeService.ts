import type { RealtimeChannel } from '@supabase/supabase-js'

import { isSupabaseMode } from '@/config/dataSource'
import { supabase } from '@/lib/supabase'
import { getAlerts } from '@/services/alertService'
import { mapAlertRow } from '@/services/mappers/alertMapper'
import { mapRobotCommandRow, mapRobotPositionRow } from '@/services/mappers/robotMapper'
import { mapWaterLatestRow } from '@/services/mappers/waterMapper'
import { getLatestRobotPosition } from '@/services/robotPositionService'
import { resolvePondUuid, resolveRobotUuid } from '@/services/supabaseHelpers'
import { getLatestWaterData } from '@/services/waterDataService'
import type { Alert } from '@/types/alert'
import type { AlertRow, RobotCommandRow, RobotPositionLatestRow, WaterLatestRow } from '@/types/database'
import type { RobotCommand, RobotPositionLatest } from '@/types/robot'
import type { WaterLatest } from '@/types/water'

const subscriptionTimers = new Map<string, number>()
const realtimeChannels = new Map<string, RealtimeChannel>()

function createSubscriptionId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createTableFilter(filters: Record<string, unknown>) {
  const organizationId = filters.organizationId ?? filters.organization_id
  return typeof organizationId === 'string' ? `organization_id=eq.${organizationId}` : undefined
}

export function subscribeTableChanges<TPayload = unknown>(
  tableName: string,
  filters: Record<string, unknown>,
  callback: (payload: TPayload) => void,
): string {
  if (!isSupabaseMode) {
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

  const subscriptionId = createSubscriptionId(`table-${tableName}`)
  const channel = supabase
    .channel(subscriptionId)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: tableName,
        filter: createTableFilter(filters),
      },
      (payload) => callback(payload as TPayload),
    )
    .subscribe()

  realtimeChannels.set(subscriptionId, channel)
  return subscriptionId
}

export function unsubscribe(subscriptionId: string): boolean {
  const timerId = subscriptionTimers.get(subscriptionId)
  if (timerId !== undefined) {
    window.clearInterval(timerId)
    subscriptionTimers.delete(subscriptionId)
  }

  const channel = realtimeChannels.get(subscriptionId)
  if (channel) {
    void supabase.removeChannel(channel)
    realtimeChannels.delete(subscriptionId)
  }

  return true
}

export function subscribeWaterLatest(
  organizationId: string,
  pondId: string,
  callback: (payload: WaterLatest) => void,
): string {
  if (!isSupabaseMode) {
    const subscriptionId = createSubscriptionId(`water-latest-${organizationId}-${pondId}`)
    const timerId = window.setInterval(async () => {
      callback(await getLatestWaterData(organizationId, pondId))
    }, 2500)
    subscriptionTimers.set(subscriptionId, timerId)
    return subscriptionId
  }

  const subscriptionId = createSubscriptionId(`water-latest-${organizationId}-${pondId}`)
  void resolvePondUuid(organizationId, pondId).then((pondUuid) => {
    const channel = supabase
      .channel(subscriptionId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'water_latest',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const row = payload.new as WaterLatestRow | null
          if (row?.pond_id === pondUuid) {
            callback(mapWaterLatestRow(row))
          }
        },
      )
      .subscribe()
    realtimeChannels.set(subscriptionId, channel)
  })

  return subscriptionId
}

export function subscribeRobotPosition(
  organizationId: string,
  robotId: string,
  callback: (payload: RobotPositionLatest) => void,
): string {
  if (!isSupabaseMode) {
    const subscriptionId = createSubscriptionId(`robot-position-${organizationId}-${robotId}`)
    const timerId = window.setInterval(async () => {
      callback(await getLatestRobotPosition(organizationId, robotId))
    }, 1500)
    subscriptionTimers.set(subscriptionId, timerId)
    return subscriptionId
  }

  const subscriptionId = createSubscriptionId(`robot-position-${organizationId}-${robotId}`)
  void resolveRobotUuid(organizationId, robotId).then((robotUuid) => {
    const channel = supabase
      .channel(subscriptionId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'robot_position_latest',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const row = payload.new as RobotPositionLatestRow | null
          if (row?.robot_id === robotUuid) {
            callback(mapRobotPositionRow(row))
          }
        },
      )
      .subscribe()
    realtimeChannels.set(subscriptionId, channel)
  })

  return subscriptionId
}

export function subscribeAlerts(
  organizationId: string,
  callback: (payload: Alert) => void,
): string {
  if (!isSupabaseMode) {
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

  const subscriptionId = createSubscriptionId(`alerts-${organizationId}`)
  const channel = supabase
    .channel(subscriptionId)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'alerts',
        filter: `organization_id=eq.${organizationId}`,
      },
      (payload) => {
        const row = payload.new as AlertRow | null
        if (row?.id) {
          callback(mapAlertRow(row))
        }
      },
    )
    .subscribe()
  realtimeChannels.set(subscriptionId, channel)
  return subscriptionId
}

export function subscribeRobotCommands(
  organizationId: string,
  robotId: string,
  callback: (payload: RobotCommand) => void,
): string {
  if (!isSupabaseMode) {
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

  const subscriptionId = createSubscriptionId(`robot-command-${organizationId}-${robotId}`)
  void resolveRobotUuid(organizationId, robotId).then((robotUuid) => {
    const channel = supabase
      .channel(subscriptionId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'robot_commands',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const row = payload.new as RobotCommandRow | null
          if (row?.robot_id === robotUuid) {
            callback(mapRobotCommandRow(row))
          }
        },
      )
      .subscribe()
    realtimeChannels.set(subscriptionId, channel)
  })

  return subscriptionId
}
