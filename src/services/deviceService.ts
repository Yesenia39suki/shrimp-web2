import type {
  Device,
  DeviceHeartbeat,
  DeviceStatus,
  HardwareUploadPayload,
  HardwareUploadResult,
} from '@/types/device'

export async function getDevices(organizationId: string): Promise<Device[]> {
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

export async function getDeviceById(
  organizationId: string,
  deviceId: string,
): Promise<Device | null> {
  return (await getDevices(organizationId)).find((device) => device.id === deviceId) ?? null
}

export async function createDevice(
  organizationId: string,
  payload: Partial<Device>,
): Promise<Device> {
  // TODO: admin/owner 创建设备，生成后端托管 token，不把密钥暴露给前端。
  return Promise.resolve({
    id: `device-${Date.now()}`,
    organizationId,
    name: payload.name ?? '新建设备',
    type: payload.type ?? 'water_sensor',
    status: payload.status ?? 'offline',
    createdAt: new Date().toISOString(),
  })
}

export async function updateDevice(
  organizationId: string,
  deviceId: string,
  payload: Partial<Device>,
): Promise<Device> {
  return Promise.resolve({
    ...(await getDeviceById(organizationId, deviceId)),
    ...payload,
  } as Device)
}

export async function deleteDevice(organizationId: string, deviceId: string): Promise<boolean> {
  void organizationId
  void deviceId
  return Promise.resolve(true)
}

export async function updateDeviceStatus(
  organizationId: string,
  deviceId: string,
  status: DeviceStatus,
): Promise<Device> {
  return Promise.resolve({ ...(await getDeviceById(organizationId, deviceId)), status } as Device)
}

export async function receiveDeviceHeartbeat(
  payload: DeviceHeartbeat,
): Promise<HardwareUploadResult> {
  // TODO: 后续由 /functions/v1/ingest-device-heartbeat 接收硬件心跳。
  return Promise.resolve({
    accepted: true,
    message: `已接收设备 ${payload.deviceId} 心跳`,
    receivedAt: new Date().toISOString(),
  })
}

export async function verifyDeviceToken(deviceId: string, token: string): Promise<boolean> {
  // TODO: 仅后端校验 token，前端不保存真实 token。
  return Promise.resolve(Boolean(deviceId && token))
}

export async function receiveHardwareUpload(
  payload: HardwareUploadPayload,
): Promise<HardwareUploadResult> {
  return Promise.resolve({
    accepted: true,
    message: '硬件上传 mock 已接收',
    receivedAt: new Date().toISOString(),
    recordId: `${payload.deviceId}-${Date.now()}`,
  })
}
