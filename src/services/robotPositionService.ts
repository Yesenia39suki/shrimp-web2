import type { RealtimeChannel } from '@supabase/supabase-js'

import { isSupabaseMode } from '@/config/dataSource'
import { supabase } from '@/lib/supabase'
import { getMockSystemData } from '@/services/mockDataService'
import {
  mapRobotPositionHistoryRow,
  mapRobotPositionRow,
} from '@/services/mappers/robotMapper'
import { resolvePondUuid, resolveRobotUuid, throwSupabaseError } from '@/services/supabaseHelpers'
import type { TimeRange } from '@/types/business'
import type { Inserts, RobotPositionLatestRow } from '@/types/database'
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
const realtimeChannels = new Map<string, RealtimeChannel>()

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

async function loadRobotPondId(organizationId: string, robotUuid: string) {
  const { data, error } = await supabase
    .from('robots')
    .select('pond_id')
    .eq('organization_id', organizationId)
    .eq('id', robotUuid)
    .single()

  if (error) {
    throwSupabaseError(error, '读取机器人绑定池塘失败')
  }

  return data.pond_id
}

async function normalizePositionPayload(
  organizationId: string,
  robotId: string,
  position: RobotPositionUploadPayload,
) {
  const robotUuid = await resolveRobotUuid(organizationId, robotId)
  const pondUuid = position.pondId
    ? await resolvePondUuid(organizationId, position.pondId)
    : await loadRobotPondId(organizationId, robotUuid)
  const recordedAt = position.recordedAt ?? new Date().toISOString()

  return {
    latest: {
      organization_id: organizationId,
      pond_id: pondUuid,
      robot_id: robotUuid,
      x: position.x,
      y: position.y,
      z: position.z,
      heading: position.heading,
      speed: position.speed,
      battery: position.battery,
      status: position.status,
      recorded_at: recordedAt,
      updated_at: new Date().toISOString(),
    } satisfies RobotPositionLatestRow,
    history: {
      organization_id: organizationId,
      pond_id: pondUuid,
      robot_id: robotUuid,
      x: position.x,
      y: position.y,
      z: position.z,
      heading: position.heading,
      speed: position.speed,
      battery: position.battery,
      status: position.status,
      recorded_at: recordedAt,
    } satisfies Inserts<'robot_position_history'>,
  }
}

export async function getLatestRobotPosition(
  organizationId: string,
  robotId: string,
): Promise<RobotPositionLatest> {
  if (!isSupabaseMode) {
    const key = cacheKey(organizationId, robotId)
    const cached = positionCache.get(key)
    const nextPosition = cached
      ? { ...createMockPosition(organizationId, robotId), battery: cached.battery }
      : createMockPosition(organizationId, robotId)
    positionCache.set(key, nextPosition)
    return Promise.resolve(nextPosition)
  }

  const robotUuid = await resolveRobotUuid(organizationId, robotId)
  const { data, error } = await supabase
    .from('robot_position_latest')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('robot_id', robotUuid)
    .maybeSingle()

  if (error) {
    throwSupabaseError(error, '读取小车最新坐标失败')
  }

  if (!data) {
    throw new Error('暂无小车定位数据，请先上传机器人坐标')
  }

  return mapRobotPositionRow(data)
}

export async function getRobotPositionHistory(
  organizationId: string,
  robotId: string,
  timeRange: TimeRange,
): Promise<RobotPositionHistory[]> {
  if (!isSupabaseMode) {
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

  const robotUuid = await resolveRobotUuid(organizationId, robotId)
  const { data, error } = await supabase
    .from('robot_position_history')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('robot_id', robotUuid)
    .gte('recorded_at', timeRange.startAt)
    .lte('recorded_at', timeRange.endAt)
    .order('recorded_at', { ascending: true })

  if (error) {
    throwSupabaseError(error, '读取小车历史轨迹失败')
  }

  return (data ?? []).map(mapRobotPositionHistoryRow)
}

export async function updateRobotPosition(
  organizationId: string,
  robotId: string,
  position: RobotPositionLatest,
): Promise<RobotPositionLatest> {
  if (!isSupabaseMode) {
    const normalized = {
      ...position,
      organizationId,
      robotId,
      recordedAt: position.recordedAt || new Date().toISOString(),
    }
    positionCache.set(cacheKey(organizationId, robotId), normalized)
    return Promise.resolve(normalized)
  }

  const normalized = await normalizePositionPayload(organizationId, robotId, position)
  const { data, error } = await supabase
    .from('robot_position_latest')
    .upsert(normalized.latest, { onConflict: 'organization_id,robot_id' })
    .select('*')
    .single()

  if (error) {
    throwSupabaseError(error, '更新小车最新坐标失败')
  }

  const { error: historyError } = await supabase.from('robot_position_history').insert(normalized.history)
  if (historyError) {
    throwSupabaseError(historyError, '写入小车轨迹失败')
  }

  return mapRobotPositionRow(data)
}

export async function uploadRobotPosition(
  payload: RobotPositionUploadPayload,
): Promise<RobotPositionLatest> {
  if (!isSupabaseMode) {
    const position: RobotPositionLatest = {
      ...payload,
      recordedAt: payload.recordedAt ?? new Date().toISOString(),
    }
    positionCache.set(cacheKey(position.organizationId, position.robotId), position)
    return Promise.resolve(position)
  }

  return updateRobotPosition(payload.organizationId, payload.robotId, {
    ...payload,
    recordedAt: payload.recordedAt ?? new Date().toISOString(),
  })
}

export function subscribeRobotPosition(
  organizationId: string,
  robotId: string,
  callback: (position: RobotPositionLatest) => void,
): string {
  if (!isSupabaseMode) {
    const subscriptionId = `robot-position-sub-${organizationId}-${robotId}-${Date.now()}`
    const timerId = window.setInterval(async () => {
      callback(await getLatestRobotPosition(organizationId, robotId))
    }, 1200)
    subscriptionTimers.set(subscriptionId, timerId)
    return subscriptionId
  }

  const subscriptionId = `robot-position:${organizationId}:${robotId}:${Date.now()}`
  void resolveRobotUuid(organizationId, robotId).then((robotUuid) => {
    const channel = supabase
      .channel(subscriptionId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'robot_position_latest',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const row = payload.new as RobotPositionLatestRow | null
          if (row?.robot_id === robotUuid) {
            callback(mapRobotPositionRow(row))
          }
        },
      )
      .subscribe()
    realtimeChannels.set(subscriptionId, channel)
  })

  return subscriptionId
}

export function unsubscribeRobotPosition(subscriptionId: string): boolean {
  const timerId = subscriptionTimers.get(subscriptionId)
  if (timerId !== undefined) {
    window.clearInterval(timerId)
    subscriptionTimers.delete(subscriptionId)
  }

  const channel = realtimeChannels.get(subscriptionId)
  if (channel) {
    void supabase.removeChannel(channel)
    realtimeChannels.delete(subscriptionId)
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
  if (!isSupabaseMode) {
    void organizationId
    void robotId
    return Promise.resolve(true)
  }

  const robotUuid = await resolveRobotUuid(organizationId, robotId)
  const { error } = await supabase
    .from('robot_position_history')
    .delete()
    .eq('organization_id', organizationId)
    .eq('robot_id', robotUuid)

  if (error) {
    throwSupabaseError(error, '清理小车轨迹失败')
  }

  return true
}
