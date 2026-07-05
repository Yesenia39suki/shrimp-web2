import type { TimeRange } from '@/types/business'

export type AlertType = 'water_quality' | 'robot_fault' | 'feeding' | 'growth' | 'device' | 'ai'
export type AlertLevel = 'info' | 'warning' | 'critical'
export type AlertReadStatus = 'unread' | 'read' | 'resolved'

export interface Alert {
  id: string
  organizationId: string
  pondId?: string
  robotId?: string
  type: AlertType
  level: AlertLevel
  title: string
  content: string
  readStatus: AlertReadStatus
  createdAt: string
  resolvedAt?: string
}

export interface AlertRule {
  id: string
  organizationId: string
  pondId?: string
  type: AlertType
  metricKey?: string
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'contains'
  thresholdValue: number | string
  level: AlertLevel
  enabled: boolean
}

export interface AlertResolvePayload {
  organizationId: string
  alertId: string
  resolvedBy: string
  remark: string
}

export interface AlertFilters {
  pondId?: string
  robotId?: string
  type?: AlertType
  level?: AlertLevel
  readStatus?: AlertReadStatus
  timeRange?: TimeRange
}
