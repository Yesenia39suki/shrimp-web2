import { API_ENDPOINTS } from '@/constants/apiEndpoints'
import { isSupabaseMode } from '@/config/dataSource'
import { supabase } from '@/lib/supabase'
import {
  mapRobotCommandAckRow,
  mapRobotCommandRow,
} from '@/services/mappers/robotMapper'
import { resolvePondUuid, resolveRobotUuid, throwSupabaseError } from '@/services/supabaseHelpers'
import type { Inserts, Json } from '@/types/database'
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
  if (!isSupabaseMode) {
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

  void API_ENDPOINTS.robotControl.createRobotCommand
  const robotUuid = await resolveRobotUuid(organizationId, robotId)
  const pondUuid = command.pondId ? await resolvePondUuid(organizationId, command.pondId) : null
  const row: Inserts<'robot_commands'> = {
    organization_id: organizationId,
    pond_id: pondUuid,
    robot_id: robotUuid,
    type: command.type,
    status: command.status ?? 'pending',
    payload: JSON.parse(JSON.stringify(command.payload ?? {})) as Json,
    created_by: command.createdBy ?? null,
  }
  const { data, error } = await supabase.from('robot_commands').insert(row).select('*').single()

  if (error) {
    throwSupabaseError(error, '创建机器人指令失败')
  }

  return mapRobotCommandRow(data)
}

export async function getRobotCommands(
  organizationId: string,
  robotId: string,
  filters: RobotCommandFilters = {},
): Promise<RobotCommand[]> {
  if (!isSupabaseMode) {
    const commands = getCommandsByKey(organizationId, robotId)
    return Promise.resolve(
      commands.filter((command) => {
        if (filters.status && command.status !== filters.status) return false
        if (filters.type && command.type !== filters.type) return false
        return true
      }),
    )
  }

  const robotUuid = await resolveRobotUuid(organizationId, robotId)
  let query = supabase
    .from('robot_commands')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('robot_id', robotUuid)
    .order('created_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.type) query = query.eq('type', filters.type)

  const { data, error } = await query

  if (error) {
    throwSupabaseError(error, '读取机器人指令失败')
  }

  return (data ?? []).map(mapRobotCommandRow)
}

export async function getRobotCommandStatus(
  organizationId: string,
  commandId: string,
): Promise<RobotCommandStatus> {
  if (!isSupabaseMode) {
    const command = Array.from(commandStore.values())
      .flat()
      .find((item) => item.organizationId === organizationId && item.id === commandId)
    return Promise.resolve(command?.status ?? 'pending')
  }

  void API_ENDPOINTS.robotControl.getRobotCommandStatus
  const { data, error } = await supabase
    .from('robot_commands')
    .select('status')
    .eq('organization_id', organizationId)
    .eq('id', commandId)
    .single()

  if (error) {
    throwSupabaseError(error, '读取机器人指令状态失败')
  }

  return data.status
}

export async function cancelRobotCommand(
  organizationId: string,
  commandId: string,
): Promise<RobotCommand> {
  if (!isSupabaseMode) {
    const command = Array.from(commandStore.values())
      .flat()
      .find((item) => item.organizationId === organizationId && item.id === commandId)

    if (!command) {
      return Promise.reject(new Error('未找到机器人指令'))
    }

    command.status = 'cancelled'
    return Promise.resolve(command)
  }

  void API_ENDPOINTS.robotControl.cancelRobotCommand
  const { data, error } = await supabase
    .from('robot_commands')
    .update({ status: 'cancelled' })
    .eq('organization_id', organizationId)
    .eq('id', commandId)
    .select('*')
    .single()

  if (error) {
    throwSupabaseError(error, '取消机器人指令失败')
  }

  return mapRobotCommandRow(data)
}

export async function receiveRobotCommandAck(payload: RobotCommandAck): Promise<RobotCommandAck> {
  if (!isSupabaseMode) {
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

  const robotUuid = await resolveRobotUuid(payload.organizationId, payload.robotId)
  const acknowledgedAt = payload.acknowledgedAt || new Date().toISOString()
  const ackRow: Inserts<'robot_command_acks'> = {
    organization_id: payload.organizationId,
    robot_id: robotUuid,
    command_id: payload.commandId,
    status: payload.status,
    message: payload.message,
    acknowledged_at: acknowledgedAt,
  }

  const [{ error: updateError }, { data, error: insertError }] = await Promise.all([
    supabase
      .from('robot_commands')
      .update({ status: payload.status })
      .eq('organization_id', payload.organizationId)
      .eq('id', payload.commandId),
    supabase.from('robot_command_acks').insert(ackRow).select('*').single(),
  ])

  if (updateError) {
    throwSupabaseError(updateError, '更新机器人指令状态失败')
  }

  if (insertError) {
    throwSupabaseError(insertError, '写入机器人回执失败')
  }

  return mapRobotCommandAckRow(data)
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
    status: isSupabaseMode ? 'pending' : 'sent',
  })

  if (!isSupabaseMode) {
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
  }

  return created
}
