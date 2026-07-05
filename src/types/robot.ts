import type { TimeRange } from '@/types/business'

export type RobotWorkMode = 'standby' | 'feeding' | 'patrol' | 'manual' | 'charging' | 'fault'
export type RobotCommandType =
  | 'feed'
  | 'stop'
  | 'return_home'
  | 'patrol'
  | 'pause'
  | 'resume'
  | 'manual_move'
  | 'calibrate'
  | 'charge'
export type RobotCommandStatus = 'pending' | 'sent' | 'running' | 'success' | 'failed' | 'cancelled'

export interface RobotStatus {
  organizationId: string
  pondId: string
  robotId: string
  online: boolean
  workMode: RobotWorkMode
  battery: number
  speed: number
  faultCode?: string
  updatedAt: string
}

export interface RobotPositionLatest {
  organizationId: string
  pondId?: string
  robotId: string
  x: number
  y: number
  z: number
  heading: number
  speed: number
  battery: number
  status: RobotWorkMode
  recordedAt: string
}

export interface RobotPositionHistory extends RobotPositionLatest {
  id: string
}

export interface RobotRoutePoint {
  x: number
  y: number
  z: number
  heading?: number
  action?: string
  order: number
}

export interface RobotRoute {
  id: string
  organizationId: string
  pondId: string
  robotId: string
  name: string
  points: RobotRoutePoint[]
}

export interface RobotTrack {
  organizationId: string
  robotId: string
  timeRange: TimeRange
  points: RobotPositionHistory[]
}

export interface RobotFault {
  id: string
  organizationId: string
  pondId?: string
  robotId: string
  code: string
  message: string
  level: '关注' | '预警'
  occurredAt: string
}

export interface RobotCommand {
  id: string
  organizationId: string
  pondId?: string
  robotId: string
  type: RobotCommandType
  status: RobotCommandStatus
  payload: Record<string, unknown>
  createdBy?: string
  createdAt: string
}

export interface RobotCommandAck {
  organizationId: string
  robotId: string
  commandId: string
  status: RobotCommandStatus
  message: string
  acknowledgedAt: string
}

export interface RobotTask {
  id: string
  organizationId: string
  pondId: string
  robotId: string
  name: string
  workMode: RobotWorkMode
  status: 'pending' | 'running' | 'done' | 'cancelled'
  plannedAt: string
}

export interface RobotTaskPlan {
  organizationId: string
  pondId: string
  robotId: string
  tasks: RobotTask[]
  generatedBy: 'manual' | 'ai' | 'rule'
}

export interface RobotControlPayload {
  organizationId: string
  pondId?: string
  robotId: string
  commandType: RobotCommandType
  payload: Record<string, unknown>
}
