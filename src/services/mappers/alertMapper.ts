import type { Alert, AlertRule } from '@/types/alert'
import type { AlertRow, AlertRuleRow, Inserts } from '@/types/database'

export function mapAlertRow(row: AlertRow): Alert {
  return {
    id: row.id,
    organizationId: row.organization_id,
    pondId: row.pond_id ?? undefined,
    robotId: row.robot_id ?? undefined,
    type: row.type,
    level: row.level,
    title: row.title,
    content: row.content,
    readStatus: row.read_status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? undefined,
  }
}

export function mapAlertRuleRow(row: AlertRuleRow): AlertRule {
  return {
    id: row.id,
    organizationId: row.organization_id,
    pondId: row.pond_id ?? undefined,
    type: row.type,
    metricKey: row.metric_key ?? undefined,
    operator: row.operator,
    thresholdValue: row.threshold_value,
    level: row.level,
    enabled: row.enabled,
  }
}

export function mapAlertInsert(
  organizationId: string,
  payload: Partial<Alert>,
): Inserts<'alerts'> {
  return {
    organization_id: organizationId,
    pond_id: payload.pondId ?? null,
    robot_id: payload.robotId ?? null,
    type: payload.type ?? 'water_quality',
    level: payload.level ?? 'warning',
    title: payload.title ?? '新增报警',
    content: payload.content ?? '报警内容待补充',
    metric_key: null,
    current_value: null,
    normal_range: null,
    suggestion: null,
    source: null,
    read_status: payload.readStatus ?? 'unread',
    resolved_at: payload.resolvedAt ?? null,
  }
}
