import type { Robot } from '@/types/business'
import type {
  Inserts,
  RobotCommandAckRow,
  RobotCommandRow,
  RobotPositionLatestRow,
  RobotPositionRow,
  RobotRow,
  RobotStatusRow,
  Updates,
} from '@/types/database'
import type {
  RobotCommand,
  RobotCommandAck,
  RobotPositionHistory,
  RobotPositionLatest,
  RobotStatus,
} from '@/types/robot'

export function mapRobotRow(row: RobotRow): Robot {
  return {
    id: row.id,
    organization_id: row.organization_id,
    pond_id: row.pond_id,
    robot_code: row.robot_code,
    robot_name: row.robot_name,
    robot_type: row.robot_type,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function mapRobotInsert(
  organizationId: string,
  pondId: string,
  payload: Partial<Robot>,
): Inserts<'robots'> {
  return {
    organization_id: organizationId,
    pond_id: pondId,
    robot_code: payload.robot_code?.trim() || 'ROBOT-001',
    robot_name: payload.robot_name?.trim() || '新建投喂机器人',
    robot_type: payload.robot_type?.trim() || '投喂巡检型',
    status: payload.status ?? '待命',
  }
}

export function mapRobotUpdate(payload: Partial<Robot>, pondId?: string): Updates<'robots'> {
  return {
    pond_id: pondId,
    robot_code: payload.robot_code,
    robot_name: payload.robot_name,
    robot_type: payload.robot_type,
    status: payload.status,
  }
}

export function mapRobotStatusRow(row: RobotStatusRow): RobotStatus {
  return {
    organizationId: row.organization_id,
    pondId: row.pond_id,
    robotId: row.robot_id,
    online: row.online,
    workMode: row.work_mode,
    battery: Number(row.battery ?? 0),
    speed: Number(row.speed ?? 0),
    faultCode: row.fault_code ?? undefined,
    updatedAt: row.updated_at,
  }
}

export function mapRobotPositionRow(row: RobotPositionRow | RobotPositionLatestRow) {
  return {
    organizationId: row.organization_id,
    pondId: row.pond_id ?? undefined,
    robotId: row.robot_id,
    x: Number(row.x),
    y: Number(row.y),
    z: Number(row.z),
    heading: Number(row.heading),
    speed: Number(row.speed),
    battery: Number(row.battery),
    status: row.status,
    recordedAt: row.recorded_at,
  } satisfies RobotPositionLatest
}

export function mapRobotPositionHistoryRow(row: RobotPositionRow): RobotPositionHistory {
  return {
    id: row.id,
    ...mapRobotPositionRow(row),
  }
}

export function mapRobotCommandRow(row: RobotCommandRow): RobotCommand {
  const payload =
    typeof row.payload === 'object' && row.payload !== null && !Array.isArray(row.payload)
      ? (row.payload as Record<string, unknown>)
      : {}

  return {
    id: row.id,
    organizationId: row.organization_id,
    pondId: row.pond_id ?? undefined,
    robotId: row.robot_id,
    type: row.type,
    status: row.status,
    payload,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
  }
}

export function mapRobotCommandAckRow(row: RobotCommandAckRow): RobotCommandAck {
  return {
    organizationId: row.organization_id,
    robotId: row.robot_id,
    commandId: row.command_id,
    status: row.status,
    message: row.message,
    acknowledgedAt: row.acknowledged_at,
  }
}
