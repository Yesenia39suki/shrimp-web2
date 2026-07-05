import type { TimeRange, UserRole } from '@/types/business'

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

export interface PaginatedResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export interface OperationLog {
  id: string
  organizationId: string
  userId?: string
  action: string
  targetType: string
  targetId?: string
  detail?: string
  createdAt: string
}

export interface AuditLog extends OperationLog {
  role?: UserRole
  ipAddress?: string
  userAgent?: string
}

export interface RealtimeSubscriptionConfig {
  id: string
  organizationId: string
  tableName: string
  filters: Record<string, unknown>
  enabled: boolean
}

export interface SystemSetting {
  id: string
  organizationId: string
  key: string
  value: unknown
  updatedAt: string
}

export interface ExportTask {
  id: string
  organizationId: string
  pondId?: string
  type: 'report' | 'water' | 'feeding' | 'audit'
  status: 'pending' | 'running' | 'done' | 'failed'
  fileUrl?: string
  createdAt: string
}

export interface ImportTask {
  id: string
  organizationId: string
  pondId?: string
  type: 'shrimp_measurement' | 'pond' | 'device'
  status: 'pending' | 'running' | 'done' | 'failed'
  createdAt: string
}

export interface LogFilters {
  userId?: string
  action?: string
  targetType?: string
  timeRange?: TimeRange
}
