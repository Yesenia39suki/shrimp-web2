import { getMockSystemData } from '@/services/mockDataService'
import type { TimeRange } from '@/types/business'
import type {
  RobotPositionHistory,
  RobotPositionLatest,
  RobotTrack,
  RobotWorkMode,
} from '@/types/robot'

type RobotPositionUploadPayload = Omit<RobotPositionLatest, 'recordedAt'> & {
  recordedAt?: string
}

const positionCache = new Map<string, RobotPositionLatest>()
const subscriptionTimers = new Map<string, number>()

function cacheKey(organizationId: string, robotId: string) {
  return `${organizationId}:${robotId}`
}

function createMockPosition(organizationId: string, robotId: string): RobotPositionLatest {
  const data = getMockSystemData(organizationId)
  const robot = data.robots.find((item) => item.id === robotId) ?? data.robots[0]!
  const seconds = Date.now() / 1000
  const radius = 24 + (robot.id.length % 5)
  const x = Number((Math.cos(seconds / 8) * radius + 50).toFixed(2))
  const z = Number((Math.sin(seconds / 8) * radius + 38).toFixed(2))
  const heading = Math.round((((seconds * 18) % 360) + 360) % 360)
  const status: RobotWorkMode = robot.online ? 'patrol' : 'fault'

  return {
    organizationId,
    pondId: robot.pondId,
    robotId: robot.id,
    x,
    y: 0,
    z,
    heading,
    speed: robot.online ? 0.8 : 0,
    battery: robot.battery,
    status,
    recordedAt: new Date().toISOString(),
  }
}

export async function getLatestRobotPosition(
  organizationId: string,
  robotId: string,
): Promise<RobotPositionLatest> {
  // TODO: 后续读取 robot_position_latest，或接 Supabase Realtime/MQTT 最新坐标。
  const key = cacheKey(organizationId, robotId)
  const cached = positionCache.get(key)
  const nextPosition = cached
    ? { ...createMockPosition(organizationId, robotId), battery: cached.battery }
    : createMockPosition(organizationId, robotId)
  positionCache.set(key, nextPosition)
  return Promise.resolve(nextPosition)
}

export async function getRobotPositionHistory(
  organizationId: string,
  robotId: string,
  timeRange: TimeRange,
): Promise<RobotPositionHistory[]> {
  // TODO: 后续查询 robot_position_history，并按 organizationId、robotId、recordedAt 过滤。
  void timeRange
  const latest = await getLatestRobotPosition(organizationId, robotId)
  return Promise.resolve(
    Array.from({ length: 16 }, (_, index) => ({
      ...latest,
      id: `robot-position-${index}`,
      x: Number((latest.x - (15 - index) * 1.4).toFixed(2)),
      z: Number((latest.z + Math.sin(index / 2) * 5).toFixed(2)),
      recordedAt: new Date(Date.now() - (15 - index) * 60_000).toISOString(),
    })),
  )
}

export async function updateRobotPosition(
  organizationId: string,
  robotId: string,
  position: RobotPositionLatest,
): Promise<RobotPositionLatest> {
  // TODO: 后续写 robot_position_latest，同时追加 robot_position_history。
  const normalized = {
    ...position,
    organizationId,
    robotId,
    recordedAt: position.recordedAt || new Date().toISOString(),
  }
  positionCache.set(cacheKey(organizationId, robotId), normalized)
  return Promise.resolve(normalized)
}

export async function uploadRobotPosition(
  payload: RobotPositionUploadPayload,
): Promise<RobotPositionLatest> {
  // TODO: 后续由 /functions/v1/ingest-robot-position 接收硬件坐标。
  const position: RobotPositionLatest = {
    ...payload,
    recordedAt: payload.recordedAt ?? new Date().toISOString(),
  }
  positionCache.set(cacheKey(position.organizationId, position.robotId), position)
  return Promise.resolve(position)
}

export function subscribeRobotPosition(
  organizationId: string,
  robotId: string,
  callback: (position: RobotPositionLatest) => void,
): string {
  // TODO: 后续切换为 Supabase Realtime 或 MQTT/WebSocket 数据源。
  const subscriptionId = `robot-position-sub-${organizationId}-${robotId}-${Date.now()}`
  const timerId = window.setInterval(async () => {
    callback(await getLatestRobotPosition(organizationId, robotId))
  }, 1200)
  subscriptionTimers.set(subscriptionId, timerId)
  return subscriptionId
}

export function unsubscribeRobotPosition(subscriptionId: string): boolean {
  const timerId = subscriptionTimers.get(subscriptionId)
  if (timerId !== undefined) {
    window.clearInterval(timerId)
    subscriptionTimers.delete(subscriptionId)
  }
  return true
}

export async function getRobotTrack(
  organizationId: string,
  robotId: string,
  timeRange: TimeRange,
): Promise<RobotTrack> {
  return Promise.resolve({
    organizationId,
    robotId,
    timeRange,
    points: await getRobotPositionHistory(organizationId, robotId, timeRange),
  })
}

export async function clearRobotTrack(organizationId: string, robotId: string): Promise<boolean> {
  // TODO: 后续清理 robot_position_history 需要 owner/admin 权限和审计记录。
  void organizationId
  void robotId
  return Promise.resolve(true)
}
