import type { Device } from '@/types/device'
import type { DeviceRow, Inserts, Updates } from '@/types/database'

export function mapDeviceRow(row: DeviceRow): Device {
  return {
    id: row.id,
    organizationId: row.organization_id,
    pondId: row.pond_id ?? undefined,
    robotId: row.robot_id ?? undefined,
    name: row.name,
    type: row.type,
    status: row.status,
    firmwareVersion: row.firmware_version ?? undefined,
    lastHeartbeatAt: row.last_heartbeat_at ?? undefined,
    createdAt: row.created_at,
  }
}

export function mapDeviceInsert(
  organizationId: string,
  payload: Partial<Device>,
): Inserts<'devices'> {
  return {
    organization_id: organizationId,
    pond_id: payload.pondId ?? null,
    robot_id: payload.robotId ?? null,
    name: payload.name?.trim() || '新建设备',
    type: payload.type ?? 'water_sensor',
    status: payload.status ?? 'offline',
    firmware_version: payload.firmwareVersion ?? null,
    last_heartbeat_at: payload.lastHeartbeatAt ?? null,
  }
}

export function mapDeviceUpdate(payload: Partial<Device>): Updates<'devices'> {
  return {
    pond_id: payload.pondId,
    robot_id: payload.robotId,
    name: payload.name,
    type: payload.type,
    status: payload.status,
    firmware_version: payload.firmwareVersion,
    last_heartbeat_at: payload.lastHeartbeatAt,
  }
}
