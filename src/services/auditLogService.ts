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

export async function createOperationLog(
  organizationId: string,
  payload: Omit<OperationLog, 'id' | 'organizationId' | 'createdAt'> & {
    createdAt?: string
  },
): Promise<OperationLog> {
  // TODO: 后续所有新增、修改、删除、下发命令、采纳 AI 建议都写 operation_logs/audit_logs。
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

export async function getOperationLogs(
  organizationId: string,
  filters: LogFilters = {},
): Promise<OperationLog[]> {
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

export async function getUserOperationLogs(
  organizationId: string,
  userId: string,
): Promise<OperationLog[]> {
  return getOperationLogs(organizationId, { userId })
}
