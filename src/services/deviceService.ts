import { isMockMode } from '@/config/dataSource'
import { supabase } from '@/lib/supabase'
import { mapDeviceInsert, mapDeviceRow, mapDeviceUpdate } from '@/services/mappers/deviceMapper'
import { resolvePondUuid, resolveRobotUuid, throwSupabaseError } from '@/services/supabaseHelpers'
import type {
  Device,
  DeviceHeartbeat,
  DeviceStatus,
  HardwareUploadPayload,
  HardwareUploadResult,
} from '@/types/device'

export async function getDevices(organizationId: string): Promise<Device[]> {
  if (isMockMode) {
    return Promise.resolve([
      {
        id: 'device-water-01',
        organizationId,
        pondId: 'P-01',
        name: '一号水质传感器',
        type: 'water_sensor',
        status: 'online',
        lastHeartbeatAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ])
  }

  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true })

  if (error) {
    throwSupabaseError(error, '读取设备失败')
  }

  return (data ?? []).map(mapDeviceRow)
}

export async function getDeviceById(
  organizationId: string,
  deviceId: string,
): Promise<Device | null> {
  if (isMockMode) {
    return (await getDevices(organizationId)).find((device) => device.id === deviceId) ?? null
  }

  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', deviceId)
    .maybeSingle()

  if (error) {
    throwSupabaseError(error, '读取设备失败')
  }

  return data ? mapDeviceRow(data) : null
}

export async function createDevice(
  organizationId: string,
  payload: Partial<Device>,
): Promise<Device> {
  if (isMockMode) {
    return Promise.resolve({
      id: `device-${Date.now()}`,
      organizationId,
      name: payload.name ?? '新建设备',
      type: payload.type ?? 'water_sensor',
      status: payload.status ?? 'offline',
      createdAt: new Date().toISOString(),
    })
  }

  const pondId = payload.pondId ? await resolvePondUuid(organizationId, payload.pondId) : undefined
  const robotId = payload.robotId
    ? await resolveRobotUuid(organizationId, payload.robotId)
    : undefined
  const { data, error } = await supabase
    .from('devices')
    .insert(mapDeviceInsert(organizationId, { ...payload, pondId, robotId }))
    .select('*')
    .single()

  if (error) {
    throwSupabaseError(error, '新增设备失败')
  }

  return mapDeviceRow(data)
}

export async function updateDevice(
  organizationId: string,
  deviceId: string,
  payload: Partial<Device>,
): Promise<Device> {
  if (isMockMode) {
    return Promise.resolve({
      ...(await getDeviceById(organizationId, deviceId)),
      ...payload,
    } as Device)
  }

  const pondId = payload.pondId ? await resolvePondUuid(organizationId, payload.pondId) : undefined
  const robotId = payload.robotId
    ? await resolveRobotUuid(organizationId, payload.robotId)
    : undefined
  const { data, error } = await supabase
    .from('devices')
    .update(mapDeviceUpdate({ ...payload, pondId, robotId }))
    .eq('organization_id', organizationId)
    .eq('id', deviceId)
    .select('*')
    .single()

  if (error) {
    throwSupabaseError(error, '保存设备失败')
  }

  return mapDeviceRow(data)
}

export async function deleteDevice(organizationId: string, deviceId: string): Promise<boolean> {
  if (isMockMode) {
    void organizationId
    void deviceId
    return Promise.resolve(true)
  }

  const { error } = await supabase
    .from('devices')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', deviceId)

  if (error) {
    throwSupabaseError(error, '删除设备失败')
  }

  return true
}

export async function updateDeviceStatus(
  organizationId: string,
  deviceId: string,
  status: DeviceStatus,
): Promise<Device> {
  return updateDevice(organizationId, deviceId, {
    status,
    lastHeartbeatAt: new Date().toISOString(),
  })
}

export async function receiveDeviceHeartbeat(
  payload: DeviceHeartbeat,
): Promise<HardwareUploadResult> {
  if (isMockMode) {
    return Promise.resolve({
      accepted: true,
      message: `已接收设备 ${payload.deviceId} 心跳`,
      receivedAt: new Date().toISOString(),
    })
  }

  await updateDeviceStatus(payload.organizationId, payload.deviceId, payload.status)
  return {
    accepted: true,
    message: `已接收设备 ${payload.deviceId} 心跳`,
    receivedAt: new Date().toISOString(),
    recordId: payload.deviceId,
  }
}

export async function verifyDeviceToken(deviceId: string, token: string): Promise<boolean> {
  // 真实 token 只允许后端校验，前端不保存设备密钥。
  return Promise.resolve(Boolean(deviceId && token))
}

export async function receiveHardwareUpload(
  payload: HardwareUploadPayload,
): Promise<HardwareUploadResult> {
  if (isMockMode) {
    return Promise.resolve({
      accepted: true,
      message: '硬件上传 mock 已接收',
      receivedAt: new Date().toISOString(),
      recordId: `${payload.deviceId}-${Date.now()}`,
    })
  }

  return {
    accepted: false,
    message: '硬件上传必须通过后端 Edge Function，不由前端直接接收。',
    receivedAt: new Date().toISOString(),
  }
}
