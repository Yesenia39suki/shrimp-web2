export type DeviceType = 'water_sensor' | 'gateway' | 'robot' | 'camera' | 'aerator' | 'feeder'
export type DeviceStatus = 'online' | 'offline' | 'warning' | 'fault' | 'maintenance'

export interface Device {
  id: string
  organizationId: string
  pondId?: string
  robotId?: string
  name: string
  type: DeviceType
  status: DeviceStatus
  firmwareVersion?: string
  lastHeartbeatAt?: string
  createdAt: string
}

export interface DeviceAuthToken {
  id: string
  organizationId: string
  deviceId: string
  tokenMasked: string
  expiresAt?: string
  enabled: boolean
}

export interface SensorDevice extends Device {
  type: 'water_sensor'
  metrics: string[]
  samplingIntervalSeconds: number
}

export interface GatewayDevice extends Device {
  type: 'gateway'
  ipAddress?: string
  connectedDeviceIds: string[]
}

export interface HardwareUploadPayload {
  organizationId: string
  pondId?: string
  robotId?: string
  deviceId: string
  deviceType: DeviceType
  recordedAt: string
  payload: Record<string, unknown>
}

export interface HardwareUploadResult {
  accepted: boolean
  message: string
  receivedAt: string
  recordId?: string
}

export interface DeviceHeartbeat {
  organizationId: string
  pondId?: string
  robotId?: string
  deviceId: string
  status: DeviceStatus
  battery?: number
  signalStrength?: number
  recordedAt: string
}

export interface DeviceCommandAck {
  organizationId: string
  deviceId: string
  robotId?: string
  commandId: string
  success: boolean
  message: string
  acknowledgedAt: string
}
