import { getBusinessConfig, getMockSystemData } from '@/services/mockDataService'
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
  const data = getMockSystemData(organizationId)
  return Promise.resolve(data.robots.map((robot) => toRobot(organizationId, robot)))
}

export async function getRobotById(organizationId: string, robotId: string): Promise<Robot | null> {
  const robots = await getRobots(organizationId)
  return robots.find((robot) => robot.id === robotId || robot.robot_code === robotId) ?? null
}

export async function createRobot(organizationId: string, payload: Partial<Robot>): Promise<Robot> {
  // TODO: admin/owner 创建 robots，并同步 devices、audit_logs。
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

export async function updateRobot(
  organizationId: string,
  robotId: string,
  payload: Partial<Robot>,
): Promise<Robot> {
  // TODO: admin/owner 更新 robots，operator 不允许修改基础设备档案。
  return Promise.resolve({
    ...((await getRobotById(organizationId, robotId)) ?? (await createRobot(organizationId, {}))),
    ...payload,
    id: robotId,
    organization_id: organizationId,
  })
}

export async function deleteRobot(organizationId: string, robotId: string): Promise<boolean> {
  // TODO: 删除前检查 robot_commands、robot_position_history、feeding_tasks 引用。
  void organizationId
  void robotId
  return Promise.resolve(true)
}

export async function bindRobotToPond(
  organizationId: string,
  robotId: string,
  pondId: string,
): Promise<Robot> {
  // TODO: 写 robot_bindings，并记录 audit_logs。
  return updateRobot(organizationId, robotId, { pond_id: pondId })
}

export async function getRobotStatus(
  organizationId: string,
  robotId: string,
): Promise<RobotStatus> {
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

export async function updateRobotStatus(
  organizationId: string,
  robotId: string,
  status: RobotStatus,
): Promise<RobotStatus> {
  // TODO: 后续由 /functions/v1/ingest-robot-status 写入 robot_status。
  return Promise.resolve({
    ...status,
    organizationId,
    robotId,
    updatedAt: new Date().toISOString(),
  })
}
