import { isSupabaseMode } from '@/config/dataSource'
import { supabase } from '@/lib/supabase'
import { throwSupabaseError } from '@/services/supabaseHelpers'
import type { Inserts } from '@/types/database'
import type { LogFilters, OperationLog } from '@/types/system'

const OPERATION_LOG_STORAGE_KEY = 'shrimp_operation_logs'

function canUseLocalStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function readLogs() {
  if (!canUseLocalStorage()) {
    return [] as OperationLog[]
  }

  try {
    return JSON.parse(
      window.localStorage.getItem(OPERATION_LOG_STORAGE_KEY) ?? '[]',
    ) as OperationLog[]
  } catch {
    return []
  }
}

function writeLogs(logs: OperationLog[]) {
  if (!canUseLocalStorage()) {
    return
  }

  window.localStorage.setItem(OPERATION_LOG_STORAGE_KEY, JSON.stringify(logs))
}

function mapOperationLogRow(row: {
  id: string
  organization_id: string
  user_id: string | null
  action: string
  target_type: string
  target_id: string | null
  detail: string | null
  created_at: string
}): OperationLog {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id ?? undefined,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id ?? undefined,
    detail: row.detail ?? undefined,
    createdAt: row.created_at,
  }
}

export async function createOperationLog(
  organizationId: string,
  payload: Omit<OperationLog, 'id' | 'organizationId' | 'createdAt'> & {
    createdAt?: string
  },
): Promise<OperationLog> {
  if (!isSupabaseMode) {
    const log: OperationLog = {
      id: `operation-log-${Date.now()}`,
      organizationId,
      userId: payload.userId,
      action: payload.action,
      targetType: payload.targetType,
      targetId: payload.targetId,
      detail: payload.detail,
      createdAt: payload.createdAt ?? new Date().toISOString(),
    }
    const logs = readLogs()
    logs.unshift(log)
    writeLogs(logs.slice(0, 300))
    return Promise.resolve(log)
  }

  const row: Inserts<'operation_logs'> = {
    organization_id: organizationId,
    user_id: payload.userId ?? null,
    action: payload.action,
    target_type: payload.targetType,
    target_id: payload.targetId ?? null,
    detail: payload.detail ?? null,
    created_at: payload.createdAt,
  }
  const { data, error } = await supabase.from('operation_logs').insert(row).select('*').single()

  if (error) {
    throwSupabaseError(error, '写入操作日志失败')
  }

  return mapOperationLogRow(data)
}

export async function getOperationLogs(
  organizationId: string,
  filters: LogFilters = {},
): Promise<OperationLog[]> {
  if (!isSupabaseMode) {
    const logs = readLogs().filter((log) => log.organizationId === organizationId)
    return Promise.resolve(
      logs.filter((log) => {
        if (filters.userId && log.userId !== filters.userId) return false
        if (filters.action && log.action !== filters.action) return false
        if (filters.targetType && log.targetType !== filters.targetType) return false
        if (filters.timeRange) {
          if (log.createdAt < filters.timeRange.startAt || log.createdAt > filters.timeRange.endAt) {
            return false
          }
        }
        return true
      }),
    )
  }

  let query = supabase
    .from('operation_logs')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(300)

  if (filters.userId) query = query.eq('user_id', filters.userId)
  if (filters.action) query = query.eq('action', filters.action)
  if (filters.targetType) query = query.eq('target_type', filters.targetType)
  if (filters.timeRange) {
    query = query.gte('created_at', filters.timeRange.startAt).lte('created_at', filters.timeRange.endAt)
  }

  const { data, error } = await query

  if (error) {
    throwSupabaseError(error, '读取操作日志失败')
  }

  return (data ?? []).map(mapOperationLogRow)
}

export async function getUserOperationLogs(
  organizationId: string,
  userId: string,
): Promise<OperationLog[]> {
  return getOperationLogs(organizationId, { userId })
}
