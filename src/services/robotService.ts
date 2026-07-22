import { isMockMode } from '@/config/dataSource'
import { supabase } from '@/lib/supabase'
import { getBusinessConfig, getMockSystemData } from '@/services/mockDataService'
import {
  mapRobotInsert,
  mapRobotRow,
  mapRobotStatusRow,
  mapRobotUpdate,
} from '@/services/mappers/robotMapper'
import { resolvePondUuid, resolveRobotUuid, throwSupabaseError } from '@/services/supabaseHelpers'
import type { Robot } from '@/types/business'
import type { RobotStatus, RobotWorkMode } from '@/types/robot'

function toRobot(
  organizationId: string,
  robot: ReturnType<typeof getMockSystemData>['robots'][number],
) {
  return {
    id: robot.id,
    organization_id: organizationId,
    pond_id: robot.pondId,
    robot_code: robot.id,
    robot_name: robot.name,
    robot_type: robot.currentTask.includes('增氧') ? '增氧联动型' : '投喂巡检型',
    status: robot.online ? robot.motionStatus : '离线',
  } satisfies Robot
}

export async function getRobots(organizationId: string): Promise<Robot[]> {
  if (isMockMode) {
    const data = getMockSystemData(organizationId)
    return Promise.resolve(data.robots.map((robot) => toRobot(organizationId, robot)))
  }

  const { data, error } = await supabase
    .from('robots')
    .select('*')
    .eq('organization_id', organizationId)
    .order('robot_code', { ascending: true })

  if (error) {
    throwSupabaseError(error, '读取机器人失败')
  }

  return (data ?? []).map(mapRobotRow)
}

export async function getRobotById(organizationId: string, robotId: string): Promise<Robot | null> {
  if (isMockMode) {
    const robots = await getRobots(organizationId)
    return robots.find((robot) => robot.id === robotId || robot.robot_code === robotId) ?? null
  }

  const query = supabase.from('robots').select('*').eq('organization_id', organizationId).limit(1)
  const { data, error } = /^[0-9a-f-]{36}$/i.test(robotId)
    ? await query.eq('id', robotId).maybeSingle()
    : await query.eq('robot_code', robotId).maybeSingle()

  if (error) {
    throwSupabaseError(error, '读取机器人失败')
  }

  return data ? mapRobotRow(data) : null
}

export async function createRobot(organizationId: string, payload: Partial<Robot>): Promise<Robot> {
  if (isMockMode) {
    return Promise.resolve({
      id: `robot-${Date.now()}`,
      organization_id: organizationId,
      pond_id: payload.pond_id ?? getBusinessConfig(organizationId).pond.id,
      robot_code: payload.robot_code ?? 'RB-NEW',
      robot_name: payload.robot_name ?? '新建投喂机器人',
      robot_type: payload.robot_type ?? '投喂巡检型',
      status: payload.status ?? '待命',
    })
  }

  let pondUuid = ''

  if (payload.pond_id) {
    pondUuid = await resolvePondUuid(organizationId, payload.pond_id)
  } else {
    const { data: firstPond, error: pondError } = await supabase
      .from('ponds')
      .select('id')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (pondError) {
      throwSupabaseError(pondError, '读取池塘失败')
    }

    if (!firstPond) {
      throw new Error('请先添加池塘，再新增机器人')
    }

    pondUuid = firstPond.id
  }
  const { data, error } = await supabase
    .from('robots')
    .insert(mapRobotInsert(organizationId, pondUuid, payload))
    .select('*')
    .single()

  if (error) {
    throwSupabaseError(error, '新增机器人失败')
  }

  return mapRobotRow(data)
}

export async function updateRobot(
  organizationId: string,
  robotId: string,
  payload: Partial<Robot>,
): Promise<Robot> {
  if (isMockMode) {
    return Promise.resolve({
      ...((await getRobotById(organizationId, robotId)) ?? (await createRobot(organizationId, {}))),
      ...payload,
      id: robotId,
      organization_id: organizationId,
    })
  }

  const robotUuid = await resolveRobotUuid(organizationId, robotId)
  const pondUuid = payload.pond_id
    ? await resolvePondUuid(organizationId, payload.pond_id)
    : undefined
  const { data, error } = await supabase
    .from('robots')
    .update(mapRobotUpdate(payload, pondUuid))
    .eq('organization_id', organizationId)
    .eq('id', robotUuid)
    .select('*')
    .single()

  if (error) {
    throwSupabaseError(error, '保存机器人失败')
  }

  return mapRobotRow(data)
}

export async function deleteRobot(organizationId: string, robotId: string): Promise<boolean> {
  if (isMockMode) {
    void organizationId
    void robotId
    return Promise.resolve(true)
  }

  const robotUuid = await resolveRobotUuid(organizationId, robotId)
  const { error } = await supabase
    .from('robots')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', robotUuid)

  if (error) {
    throwSupabaseError(error, '删除机器人失败')
  }

  return true
}

export async function bindRobotToPond(
  organizationId: string,
  robotId: string,
  pondId: string,
): Promise<Robot> {
  return updateRobot(organizationId, robotId, { pond_id: pondId })
}

export async function getRobotStatus(
  organizationId: string,
  robotId: string,
): Promise<RobotStatus> {
  if (isMockMode) {
    const data = getMockSystemData(organizationId)
    const robot = data.robots.find((item) => item.id === robotId) ?? data.robots[0]!
    const workMode: RobotWorkMode = robot.online
      ? robot.motionStatus.includes('巡航')
        ? 'patrol'
        : robot.motionStatus.includes('采样')
          ? 'patrol'
          : robot.motionStatus.includes('待命')
            ? 'standby'
            : 'manual'
      : 'fault'

    return Promise.resolve({
      organizationId,
      pondId: robot.pondId,
      robotId: robot.id,
      online: robot.online,
      workMode,
      battery: robot.battery,
      speed: robot.online ? 0.8 : 0,
      faultCode: robot.abnormalStatus !== '无' ? robot.abnormalStatus : undefined,
      updatedAt: new Date().toISOString(),
    })
  }

  const robotUuid = await resolveRobotUuid(organizationId, robotId)
  const { data, error } = await supabase
    .from('robot_status')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('robot_id', robotUuid)
    .maybeSingle()

  if (error) {
    throwSupabaseError(error, '读取机器人状态失败')
  }

  if (data) {
    return mapRobotStatusRow(data)
  }

  const robot = await getRobotById(organizationId, robotUuid)
  if (!robot) {
    throw new Error('未找到机器人')
  }

  return {
    organizationId,
    pondId: robot.pond_id,
    robotId: robot.id,
    online: robot.status !== '离线',
    workMode: robot.status === '离线' ? 'fault' : 'standby',
    battery: 0,
    speed: 0,
    faultCode: robot.status === '离线' ? '离线' : undefined,
    updatedAt: robot.updated_at ?? new Date().toISOString(),
  }
}

export async function updateRobotStatus(
  organizationId: string,
  robotId: string,
  status: RobotStatus,
): Promise<RobotStatus> {
  if (isMockMode) {
    return Promise.resolve({
      ...status,
      organizationId,
      robotId,
      updatedAt: new Date().toISOString(),
    })
  }

  const robotUuid = await resolveRobotUuid(organizationId, robotId)
  const pondUuid = await resolvePondUuid(organizationId, status.pondId)
  const { data, error } = await supabase
    .from('robot_status')
    .upsert(
      {
        organization_id: organizationId,
        pond_id: pondUuid,
        robot_id: robotUuid,
        online: status.online,
        work_mode: status.workMode,
        battery: status.battery,
        speed: status.speed,
        fault_code: status.faultCode ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id,robot_id' },
    )
    .select('*')
    .single()

  if (error) {
    throwSupabaseError(error, '更新机器人状态失败')
  }

  return mapRobotStatusRow(data)
}
