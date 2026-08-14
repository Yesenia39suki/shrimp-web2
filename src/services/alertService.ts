import { isSupabaseMode } from '@/config/dataSource'
import { supabase } from '@/lib/supabase'
import { mapAlertInsert, mapAlertRow } from '@/services/mappers/alertMapper'
import { resolvePondUuid, resolveRobotUuid, throwSupabaseError } from '@/services/supabaseHelpers'
import type { Alert, AlertFilters, AlertResolvePayload } from '@/types/alert'
import type { AlertRow } from '@/types/database'

const mockAlerts = new Map<string, Alert[]>()

function getMockAlerts(organizationId: string): Alert[] {
  const alerts = mockAlerts.get(organizationId)

  if (alerts) {
    return alerts
  }

  const seed: Alert[] = [
    {
      id: 'alert-mock-01',
      organizationId,
      pondId: 'P-01',
      type: 'water_quality',
      level: 'warning',
      title: '溶解氧低于建议值',
      content: '建议复核增氧设备状态，并暂缓加量投喂。',
      readStatus: 'unread',
      createdAt: new Date().toISOString(),
    },
  ]
  mockAlerts.set(organizationId, seed)
  return seed
}

async function resolveAlertFilters(organizationId: string, filters: AlertFilters) {
  const pondId = filters.pondId ? await resolvePondUuid(organizationId, filters.pondId) : undefined
  const robotId = filters.robotId ? await resolveRobotUuid(organizationId, filters.robotId) : undefined

  return { pondId, robotId }
}

function filterMockAlerts(alerts: Alert[], filters: AlertFilters) {
  return alerts.filter((alert) => {
    if (filters.pondId && alert.pondId !== filters.pondId) return false
    if (filters.robotId && alert.robotId !== filters.robotId) return false
    if (filters.type && alert.type !== filters.type) return false
    if (filters.level && alert.level !== filters.level) return false
    if (filters.readStatus && alert.readStatus !== filters.readStatus) return false
    if (filters.timeRange) {
      if (alert.createdAt < filters.timeRange.startAt || alert.createdAt > filters.timeRange.endAt) {
        return false
      }
    }
    return true
  })
}

export async function getAlerts(
  organizationId: string,
  filters: AlertFilters = {},
): Promise<Alert[]> {
  if (!isSupabaseMode) {
    return Promise.resolve(filterMockAlerts(getMockAlerts(organizationId), filters))
  }

  const resolved = await resolveAlertFilters(organizationId, filters)
  let query = supabase
    .from('alerts')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (resolved.pondId) query = query.eq('pond_id', resolved.pondId)
  if (resolved.robotId) query = query.eq('robot_id', resolved.robotId)
  if (filters.type) query = query.eq('type', filters.type)
  if (filters.level) query = query.eq('level', filters.level)
  if (filters.readStatus) query = query.eq('read_status', filters.readStatus)
  if (filters.timeRange) {
    query = query.gte('created_at', filters.timeRange.startAt).lte('created_at', filters.timeRange.endAt)
  }

  const { data, error } = await query

  if (error) {
    throwSupabaseError(error, '读取报警列表失败')
  }

  return (data ?? []).map(mapAlertRow)
}

export async function getUnreadAlertCount(organizationId: string): Promise<number> {
  if (!isSupabaseMode) {
    return Promise.resolve(getMockAlerts(organizationId).filter((alert) => alert.readStatus === 'unread').length)
  }

  const { count, error } = await supabase
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('read_status', 'unread')

  if (error) {
    throwSupabaseError(error, '读取未读报警数量失败')
  }

  return count ?? 0
}

export async function createAlert(organizationId: string, payload: Partial<Alert>): Promise<Alert> {
  if (!isSupabaseMode) {
    const alert: Alert = {
      ...getMockAlerts(organizationId)[0]!,
      ...payload,
      id: `alert-${Date.now()}`,
      organizationId,
      createdAt: payload.createdAt ?? new Date().toISOString(),
    }
    getMockAlerts(organizationId).unshift(alert)
    return Promise.resolve(alert)
  }

  const pondId = payload.pondId ? await resolvePondUuid(organizationId, payload.pondId) : undefined
  const robotId = payload.robotId ? await resolveRobotUuid(organizationId, payload.robotId) : undefined
  const { data, error } = await supabase
    .from('alerts')
    .insert(mapAlertInsert(organizationId, { ...payload, pondId, robotId }))
    .select('*')
    .single()

  if (error) {
    throwSupabaseError(error, '创建报警失败')
  }

  return mapAlertRow(data)
}

export async function markAlertRead(organizationId: string, alertId: string): Promise<boolean> {
  if (!isSupabaseMode) {
    const alert = getMockAlerts(organizationId).find((item) => item.id === alertId)
    if (alert && alert.readStatus === 'unread') {
      alert.readStatus = 'read'
    }
    return Promise.resolve(true)
  }

  const { error } = await supabase
    .from('alerts')
    .update({ read_status: 'read' })
    .eq('organization_id', organizationId)
    .eq('id', alertId)

  if (error) {
    throwSupabaseError(error, '标记报警已读失败')
  }

  return true
}

export async function markAllAlertsRead(organizationId: string): Promise<boolean> {
  if (!isSupabaseMode) {
    getMockAlerts(organizationId).forEach((alert) => {
      if (alert.readStatus === 'unread') alert.readStatus = 'read'
    })
    return Promise.resolve(true)
  }

  const { error } = await supabase
    .from('alerts')
    .update({ read_status: 'read' })
    .eq('organization_id', organizationId)
    .eq('read_status', 'unread')

  if (error) {
    throwSupabaseError(error, '批量标记报警已读失败')
  }

  return true
}

export async function resolveAlert(
  organizationId: string,
  alertId: string,
  payload: AlertResolvePayload,
): Promise<Alert> {
  if (!isSupabaseMode) {
    const alert = getMockAlerts(organizationId).find((item) => item.id === alertId)
    if (!alert) {
      throw new Error('未找到报警')
    }
    alert.readStatus = 'resolved'
    alert.resolvedAt = new Date().toISOString()
    alert.content = payload.remark || alert.content
    return Promise.resolve(alert)
  }

  const { data, error } = await supabase
    .from('alerts')
    .update({
      read_status: 'resolved',
      resolved_at: new Date().toISOString(),
      suggestion: payload.remark,
    })
    .eq('organization_id', organizationId)
    .eq('id', alertId)
    .select('*')
    .single()

  if (error) {
    throwSupabaseError(error, '处理报警失败')
  }

  return mapAlertRow(data)
}

export function subscribeAlerts(organizationId: string, callback: (alert: Alert) => void): string {
  if (!isSupabaseMode) {
    const subscriptionId = `alert-sub-${organizationId}-${Date.now()}`
    window.setTimeout(() => callback(getMockAlerts(organizationId)[0]!), 300)
    return subscriptionId
  }

  const channel = supabase
    .channel(`alerts:${organizationId}`)
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

  return channel.topic
}
