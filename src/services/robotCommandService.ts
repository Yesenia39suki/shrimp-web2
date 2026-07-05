import { API_ENDPOINTS } from '@/constants/apiEndpoints'
import type {
  RobotCommand,
  RobotCommandAck,
  RobotCommandStatus,
  RobotCommandType,
} from '@/types/robot'

interface RobotCommandFilters {
  status?: RobotCommandStatus
  type?: RobotCommandType
}

const commandStore = new Map<string, RobotCommand[]>()

function commandKey(organizationId: string, robotId: string) {
  return `${organizationId}:${robotId}`
}

function getCommandsByKey(organizationId: string, robotId: string) {
  const key = commandKey(organizationId, robotId)
  const commands = commandStore.get(key)

  if (commands) {
    return commands
  }

  const seed: RobotCommand[] = [
    {
      id: `command-${Date.now()}`,
      organizationId,
      robotId,
      type: 'patrol',
      status: 'success',
      payload: { routeName: '默认巡航线' },
      createdAt: new Date(Date.now() - 30 * 60_000).toISOString(),
    },
  ]
  commandStore.set(key, seed)
  return seed
}

export async function createRobotCommand(
  organizationId: string,
  robotId: string,
  command: Omit<RobotCommand, 'id' | 'organizationId' | 'robotId' | 'status' | 'createdAt'> & {
    status?: RobotCommandStatus
  },
): Promise<RobotCommand> {
  // TODO: 后续调用 API_ENDPOINTS.robotControl.createRobotCommand，由后端验权、写 robot_commands、下发 MQTT。
  void API_ENDPOINTS.robotControl.createRobotCommand
  const nextCommand: RobotCommand = {
    id: `command-${Date.now()}`,
    organizationId,
    pondId: command.pondId,
    robotId,
    type: command.type,
    status: command.status ?? 'pending',
    payload: command.payload,
    createdBy: command.createdBy,
    createdAt: new Date().toISOString(),
  }
  getCommandsByKey(organizationId, robotId).unshift(nextCommand)
  return Promise.resolve(nextCommand)
}

export async function getRobotCommands(
  organizationId: string,
  robotId: string,
  filters: RobotCommandFilters = {},
): Promise<RobotCommand[]> {
  const commands = getCommandsByKey(organizationId, robotId)
  return Promise.resolve(
    commands.filter((command) => {
      if (filters.status && command.status !== filters.status) return false
      if (filters.type && command.type !== filters.type) return false
      return true
    }),
  )
}

export async function getRobotCommandStatus(
  organizationId: string,
  commandId: string,
): Promise<RobotCommandStatus> {
  // TODO: 后续调用 /functions/v1/get-robot-command-status。
  const command = Array.from(commandStore.values())
    .flat()
    .find((item) => item.organizationId === organizationId && item.id === commandId)
  return Promise.resolve(command?.status ?? 'pending')
}

export async function cancelRobotCommand(
  organizationId: string,
  commandId: string,
): Promise<RobotCommand> {
  // TODO: 后续调用 /functions/v1/cancel-robot-command，并写 audit_logs。
  const command = Array.from(commandStore.values())
    .flat()
    .find((item) => item.organizationId === organizationId && item.id === commandId)

  if (!command) {
    return Promise.reject(new Error('未找到机器人指令'))
  }

  command.status = 'cancelled'
  return Promise.resolve(command)
}

export async function receiveRobotCommandAck(payload: RobotCommandAck): Promise<RobotCommandAck> {
  // TODO: 后续由 /functions/v1/robot-command-ack 接收机器人小车回执。
  const command = Array.from(commandStore.values())
    .flat()
    .find((item) => item.organizationId === payload.organizationId && item.id === payload.commandId)

  if (command) {
    command.status = payload.status
  }

  return Promise.resolve({
    ...payload,
    acknowledgedAt: payload.acknowledgedAt || new Date().toISOString(),
  })
}

export async function mockSendCommand(
  organizationId: string,
  robotId: string,
  command: {
    type: RobotCommandType
    pondId?: string
    payload?: Record<string, unknown>
    createdBy?: string
  },
): Promise<RobotCommand> {
  const created = await createRobotCommand(organizationId, robotId, {
    pondId: command.pondId,
    type: command.type,
    payload: command.payload ?? {},
    createdBy: command.createdBy,
    status: 'sent',
  })

  window.setTimeout(() => {
    void receiveRobotCommandAck({
      organizationId,
      robotId,
      commandId: created.id,
      status: 'success',
      message: 'mock 指令已完成',
      acknowledgedAt: new Date().toISOString(),
    })
  }, 500)

  return created
}
