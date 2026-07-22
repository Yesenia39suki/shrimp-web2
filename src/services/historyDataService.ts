import { isSupabaseMode } from '@/config/dataSource'
import { supabase } from '@/lib/supabase'
import { getMockSystemData } from '@/services/mockDataService'
import { getAlerts } from '@/services/alertService'
import { getFeedingRecords } from '@/services/feedingService'
import { getRobots } from '@/services/robotService'
import { getRobotCommands } from '@/services/robotCommandService'
import { getShrimpDailyStats, getShrimpMeasurements } from '@/services/shrimpGrowthService'
import { resolvePondUuid, throwSupabaseError, toDateOnly } from '@/services/supabaseHelpers'
import { getWaterDailyStats, getWaterHistory } from '@/services/waterDataService'
import type { TimeRange } from '@/types/business'

export type HistoryCategory = 'water' | 'shrimp' | 'robot' | 'feeding' | 'alert' | 'config'

export interface HistoryRow {
  id: string
  time: string
  source: string
  target: string
  value: string
  status: string
  remark: string
}

function isShortRange(timeRange: TimeRange) {
  return Date.parse(timeRange.endAt) - Date.parse(timeRange.startAt) <= 8 * 24 * 60 * 60_000
}

function formatTime(value: string) {
  return value.includes('T') ? value.slice(0, 16).replace('T', ' ') : value
}

export async function getHistoryRows(input: {
  organizationId: string
  pondId: string
  category: HistoryCategory
  timeRange: TimeRange
}): Promise<HistoryRow[]> {
  if (!isSupabaseMode) {
    return getMockHistoryRows(input)
  }

  const { organizationId, pondId, category, timeRange } = input
  const pondUuid = await resolvePondUuid(organizationId, pondId)

  if (category === 'water') {
    if (isShortRange(timeRange)) {
      const readings = await getWaterHistory(organizationId, pondUuid, timeRange)
      return readings.flatMap((reading) => [
        {
          id: `${reading.id}-temperature`,
          time: formatTime(reading.recordedAt),
          source: '水质参数',
          target: `${pondId} / 温度`,
          value: `${reading.temperature}℃`,
          status: '已记录',
          remark: '来自 water_readings',
        },
        {
          id: `${reading.id}-oxygen`,
          time: formatTime(reading.recordedAt),
          source: '水质参数',
          target: `${pondId} / 溶解氧`,
          value: `${reading.dissolvedOxygen}毫克/升`,
          status: '已记录',
          remark: '来自 water_readings',
        },
        {
          id: `${reading.id}-ph`,
          time: formatTime(reading.recordedAt),
          source: '水质参数',
          target: `${pondId} / pH`,
          value: `${reading.ph}`,
          status: '已记录',
          remark: '来自 water_readings',
        },
      ])
    }

    const stats = await getWaterDailyStats(organizationId, pondUuid, timeRange)
    return stats.map((row) => ({
      id: row.id,
      time: row.stat_date,
      source: '水质日统计',
      target: `${pondId} / 温度、溶解氧、pH`,
      value: `${row.avg_temperature ?? '-'}℃ / ${row.avg_dissolved_oxygen ?? '-'}毫克/升 / ${row.avg_ph ?? '-'}`,
      status: row.status,
      remark: `读数 ${row.reading_count} 条，异常 ${row.warning_count} 条`,
    }))
  }

  if (category === 'shrimp') {
    if (isShortRange(timeRange)) {
      const measurements = await getShrimpMeasurements(organizationId, pondUuid, timeRange)
      return measurements.map((item) => ({
        id: item.id,
        time: formatTime(item.measuredAt),
        source: '虾群测量',
        target: `${pondId} / 虾长虾重`,
        value: `${item.average_length_cm}厘米 / ${item.average_weight_g}克`,
        status: '已记录',
        remark: `样本 ${item.sampleCount} 个，来源 ${item.source}`,
      }))
    }

    const stats = await getShrimpDailyStats(organizationId, pondUuid, timeRange)
    return stats.map((row) => ({
      id: row.id,
      time: row.stat_date,
      source: '虾群日统计',
      target: `${pondId} / 虾长虾重`,
      value: `${row.avg_length_cm ?? '-'}厘米 / ${row.avg_weight_g ?? '-'}克`,
      status: '已记录',
      remark: `样本 ${row.sample_count} 个，成熟度 ${row.maturity_percent ?? '-'}%`,
    }))
  }

  if (category === 'feeding') {
    const records = await getFeedingRecords(organizationId, pondUuid, timeRange)
    return records.map((record) => ({
      id: record.id,
      time: formatTime(record.executedAt),
      source: '投喂记录',
      target: `${pondId} / ${record.mode}`,
      value: `${record.feedAmountKg}千克`,
      status: '已完成',
      remark: record.remark ?? '来自 feeding_records',
    }))
  }

  if (category === 'alert') {
    const alerts = await getAlerts(organizationId, { pondId: pondUuid, timeRange })
    return alerts.map((alert) => ({
      id: alert.id,
      time: formatTime(alert.createdAt),
      source: alert.type,
      target: alert.title,
      value: alert.content,
      status: alert.readStatus,
      remark: alert.resolvedAt ? `已处理：${formatTime(alert.resolvedAt)}` : alert.level,
    }))
  }

  if (category === 'robot') {
    const robots = await getRobots(organizationId)
    const relatedRobots = robots.filter((robot) => robot.pond_id === pondUuid)
    const commandGroups = await Promise.all(
      relatedRobots.map((robot) => getRobotCommands(organizationId, robot.id)),
    )
    return commandGroups.flat().map((command) => ({
      id: command.id,
      time: formatTime(command.createdAt),
      source: '机器人指令',
      target: `${command.robotId} / ${command.type}`,
      value: command.status,
      status: command.status,
      remark: '来自 robot_commands',
    }))
  }

  const [{ data: snapshots, error: snapshotError }, { data: operations, error: operationError }] =
    await Promise.all([
      supabase
        .from('pond_daily_snapshots')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('pond_id', pondUuid)
        .gte('stat_date', toDateOnly(timeRange.startAt))
        .lte('stat_date', toDateOnly(timeRange.endAt))
        .order('stat_date', { ascending: false }),
      supabase
        .from('operation_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('created_at', timeRange.startAt)
        .lte('created_at', timeRange.endAt)
        .order('created_at', { ascending: false })
        .limit(80),
    ])

  if (snapshotError) {
    throwSupabaseError(snapshotError, '读取池塘日快照失败')
  }

  if (operationError) {
    throwSupabaseError(operationError, '读取配置操作记录失败')
  }

  return [
    ...(snapshots ?? []).map((row) => ({
      id: row.id,
      time: row.stat_date,
      source: '池塘日快照',
      target: pondId,
      value: `水质 ${row.water_score ?? '-'} / 投喂 ${row.total_feed_kg ?? '-'}千克`,
      status: row.ai_risk_level ?? '已汇总',
      remark: row.summary ?? '来自 pond_daily_snapshots',
    })),
    ...(operations ?? []).map((row) => ({
      id: row.id,
      time: formatTime(row.created_at),
      source: '操作记录',
      target: `${row.target_type}${row.target_id ? ` / ${row.target_id}` : ''}`,
      value: row.action,
      status: '已记录',
      remark: row.detail ?? '来自 operation_logs',
    })),
  ]
}

async function getMockHistoryRows(input: {
  organizationId: string
  pondId: string
  category: HistoryCategory
  timeRange: TimeRange
}) {
  void input.timeRange
  const data = getMockSystemData(input.organizationId)
  const profile =
    data.pondProfiles.find((item) => item.pondId === input.pondId) ?? data.pondProfiles[0]
  const labels = ['前6日', '前5日', '前4日', '前3日', '前2日', '昨日', '今日']

  if (input.category === 'water') {
    return (profile?.waterMetrics ?? []).flatMap((metric) =>
      labels.map((label, index) => ({
        id: `water-${metric.key}-${index}`,
        time: label,
        source: '水质参数',
        target: `${input.pondId} / ${metric.label}`,
        value: `${metric.trend[index] ?? metric.value}${metric.unit}`,
        status: '正常',
        remark: 'mock 历史记录',
      })),
    )
  }

  if (input.category === 'shrimp') {
    return (profile?.shrimpMetrics ?? []).flatMap((metric) =>
      metric.trend.length
        ? labels.map((label, index) => ({
            id: `shrimp-${metric.key}-${index}`,
            time: label,
            source: '虾群参数',
            target: `${input.pondId} / ${metric.label}`,
            value: `${metric.trend[index] ?? metric.value}${metric.unit}`,
            status: '正常',
            remark: 'mock 历史记录',
          }))
        : [],
    )
  }

  if (input.category === 'feeding') {
    return labels.map((label, index) => ({
      id: `feeding-${input.pondId}-${index}`,
      time: label,
      source: '投喂记录',
      target: input.pondId,
      value: `${16 + (index % 3)}千克`,
      status: '已完成',
      remark: 'mock 投喂记录',
    }))
  }

  if (input.category === 'alert') {
    return data.pondProfiles.slice(0, 2).map((item, index) => ({
      id: `alert-${item.pondId}-${index}`,
      time: labels[index + 4] ?? '今日',
      source: '报警',
      target: item.pondId,
      value: index === 0 ? '溶解氧偏低' : '投喂复核不足',
      status: index === 0 ? '未读' : '已读',
      remark: 'mock 报警记录',
    }))
  }

  if (input.category === 'robot') {
    return data.robots.flatMap((robot) =>
      robot.commands.map((command, index) => ({
        id: `robot-${robot.id}-${index}`,
        time: command.slice(0, 5),
        source: '机器人',
        target: `${robot.pondId} / ${robot.name}`,
        value: robot.motionStatus,
        status: robot.online ? '在线' : '离线',
        remark: command,
      })),
    )
  }

  return data.businessConfig.pond
    ? [
        {
          id: `config-pond-${data.businessConfig.pond.id}`,
          time: '当前',
          source: '池塘配置',
          target: `${data.businessConfig.pond.pond_code} / ${data.businessConfig.pond.pond_name}`,
          value: `${data.businessConfig.pond.area}亩 / ${data.businessConfig.pond.water_depth}米`,
          status: '已保存',
          remark: data.businessConfig.pond.location,
        },
      ]
    : []
}
