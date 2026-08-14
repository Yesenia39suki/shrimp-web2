import { isSupabaseMode } from '@/config/dataSource'
import { supabase } from '@/lib/supabase'
import {
  mapFeedingPlanInsert,
  mapFeedingPlanRow,
  mapFeedingRecordRow,
  mapFeedingSummary,
  mapFeedingTaskRow,
} from '@/services/mappers/feedingMapper'
import { resolvePondUuid, resolveRobotUuid, throwSupabaseError, toDateOnly } from '@/services/supabaseHelpers'
import type { TimeRange } from '@/types/business'
import type { FeedingPlan, FeedingRecord, FeedingSummary, FeedingTask } from '@/types/feeding'

const planStore = new Map<string, FeedingPlan[]>()
const recordStore = new Map<string, FeedingRecord[]>()

function storeKey(organizationId: string, pondId: string) {
  return `${organizationId}:${pondId}`
}

function getPlansByKey(organizationId: string, pondId: string) {
  const key = storeKey(organizationId, pondId)
  const plans = planStore.get(key)

  if (plans) {
    return plans
  }

  const seed: FeedingPlan[] = [
    {
      id: `feeding-plan-${pondId}-morning`,
      organizationId,
      pondId,
      name: '少量多次投喂计划',
      mode: 'scheduled',
      feedAmountKg: 18,
      times: ['08:00', '12:00', '17:30'],
      enabled: true,
    },
  ]
  planStore.set(key, seed)
  return seed
}

function getRecordsByKey(organizationId: string, pondId: string) {
  const key = storeKey(organizationId, pondId)
  const records = recordStore.get(key)

  if (records) {
    return records
  }

  const seed: FeedingRecord[] = [
    {
      id: `feeding-record-${pondId}-01`,
      organizationId,
      pondId,
      feedAmountKg: 18,
      mode: 'scheduled',
      adviceSource: 'rule_engine',
      executedAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
      remark: '按计划投喂',
    },
  ]
  recordStore.set(key, seed)
  return seed
}

function filterByTimeRange<T extends { executedAt: string }>(rows: T[], timeRange: TimeRange) {
  return rows.filter((row) => row.executedAt >= timeRange.startAt && row.executedAt <= timeRange.endAt)
}

export async function getFeedingPlans(
  organizationId: string,
  pondId: string,
): Promise<FeedingPlan[]> {
  if (!isSupabaseMode) {
    return Promise.resolve([...getPlansByKey(organizationId, pondId)])
  }

  const pondUuid = await resolvePondUuid(organizationId, pondId)
  const { data, error } = await supabase
    .from('feeding_plans')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('pond_id', pondUuid)
    .order('created_at', { ascending: false })

  if (error) {
    throwSupabaseError(error, '读取投喂计划失败')
  }

  return (data ?? []).map(mapFeedingPlanRow)
}

export async function createFeedingPlan(
  organizationId: string,
  pondId: string,
  payload: Partial<FeedingPlan>,
): Promise<FeedingPlan> {
  if (!isSupabaseMode) {
    const plan: FeedingPlan = {
      id: `feeding-plan-${Date.now()}`,
      organizationId,
      pondId,
      name: payload.name ?? '新建投喂计划',
      mode: payload.mode ?? 'scheduled',
      feedAmountKg: payload.feedAmountKg ?? 0,
      times: payload.times ?? [],
      enabled: payload.enabled ?? true,
    }
    getPlansByKey(organizationId, pondId).unshift(plan)
    return Promise.resolve(plan)
  }

  const pondUuid = await resolvePondUuid(organizationId, pondId)
  const { data, error } = await supabase
    .from('feeding_plans')
    .insert(mapFeedingPlanInsert(organizationId, pondUuid, payload))
    .select('*')
    .single()

  if (error) {
    throwSupabaseError(error, '创建投喂计划失败')
  }

  return mapFeedingPlanRow(data)
}

export async function updateFeedingPlan(
  organizationId: string,
  planId: string,
  payload: Partial<FeedingPlan>,
): Promise<FeedingPlan> {
  if (!isSupabaseMode) {
    const plan = Array.from(planStore.values())
      .flat()
      .find((item) => item.organizationId === organizationId && item.id === planId)

    if (!plan) {
      return Promise.reject(new Error('未找到投喂计划'))
    }

    Object.assign(plan, payload)
    return Promise.resolve(plan)
  }

  const { data, error } = await supabase
    .from('feeding_plans')
    .update({
      name: payload.name,
      mode: payload.mode,
      feed_amount_kg: payload.feedAmountKg,
      times: payload.times,
      enabled: payload.enabled,
    })
    .eq('organization_id', organizationId)
    .eq('id', planId)
    .select('*')
    .single()

  if (error) {
    throwSupabaseError(error, '更新投喂计划失败')
  }

  return mapFeedingPlanRow(data)
}

export async function deleteFeedingPlan(organizationId: string, planId: string): Promise<boolean> {
  if (!isSupabaseMode) {
    for (const [key, plans] of planStore.entries()) {
      planStore.set(
        key,
        plans.filter((plan) => !(plan.organizationId === organizationId && plan.id === planId)),
      )
    }
    return Promise.resolve(true)
  }

  const { error } = await supabase
    .from('feeding_plans')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', planId)

  if (error) {
    throwSupabaseError(error, '删除投喂计划失败')
  }

  return true
}

export async function enableFeedingPlan(
  organizationId: string,
  planId: string,
): Promise<FeedingPlan> {
  return updateFeedingPlan(organizationId, planId, { enabled: true })
}

export async function disableFeedingPlan(
  organizationId: string,
  planId: string,
): Promise<FeedingPlan> {
  return updateFeedingPlan(organizationId, planId, { enabled: false })
}

export async function getTodayFeedingTasks(
  organizationId: string,
  pondId: string,
): Promise<FeedingTask[]> {
  if (!isSupabaseMode) {
    const plans = await getFeedingPlans(organizationId, pondId)
    return Promise.resolve(
      plans.flatMap((plan) =>
        plan.times.map((time, index) => ({
          id: `feeding-task-${plan.id}-${index}`,
          organizationId,
          pondId,
          planId: plan.id,
          scheduledAt: `${new Date().toISOString().slice(0, 10)}T${time}:00`,
          feedAmountKg: plan.feedAmountKg,
          status: index === 0 ? 'done' : 'pending',
        })),
      ),
    )
  }

  const pondUuid = await resolvePondUuid(organizationId, pondId)
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('feeding_tasks')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('pond_id', pondUuid)
    .gte('scheduled_at', `${today}T00:00:00.000Z`)
    .lte('scheduled_at', `${today}T23:59:59.999Z`)
    .order('scheduled_at', { ascending: true })

  if (error) {
    throwSupabaseError(error, '读取今日投喂任务失败')
  }

  return (data ?? []).map(mapFeedingTaskRow)
}

export async function createFeedingRecord(
  organizationId: string,
  pondId: string,
  payload: Partial<FeedingRecord>,
): Promise<FeedingRecord> {
  if (!isSupabaseMode) {
    const record: FeedingRecord = {
      id: `feeding-record-${Date.now()}`,
      organizationId,
      pondId,
      robotId: payload.robotId,
      feedAmountKg: payload.feedAmountKg ?? 0,
      mode: payload.mode ?? 'manual',
      adviceSource: payload.adviceSource,
      executedAt: payload.executedAt ?? new Date().toISOString(),
      remark: payload.remark,
    }
    getRecordsByKey(organizationId, pondId).unshift(record)
    return Promise.resolve(record)
  }

  const pondUuid = await resolvePondUuid(organizationId, pondId)
  const robotUuid = payload.robotId ? await resolveRobotUuid(organizationId, payload.robotId) : null
  const executedAt = payload.executedAt ?? new Date().toISOString()

  const { error: rpcError } = await supabase.rpc('record_feeding', {
    p_organization_id: organizationId,
    p_pond_id: pondUuid,
    p_robot_id: robotUuid,
    p_feed_amount_kg: payload.feedAmountKg ?? 0,
    p_mode: payload.mode ?? 'manual',
    p_advice_source: payload.adviceSource ?? null,
    p_executed_at: executedAt,
    p_remark: payload.remark ?? null,
  })

  if (rpcError) {
    throwSupabaseError(rpcError, '保存投喂记录失败')
  }

  const { data, error } = await supabase
    .from('feeding_records')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('pond_id', pondUuid)
    .order('executed_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    throwSupabaseError(error, '读取投喂记录失败')
  }

  return mapFeedingRecordRow(data)
}

export async function getFeedingRecords(
  organizationId: string,
  pondId: string,
  timeRange: TimeRange,
): Promise<FeedingRecord[]> {
  if (!isSupabaseMode) {
    return Promise.resolve(filterByTimeRange([...getRecordsByKey(organizationId, pondId)], timeRange))
  }

  const pondUuid = await resolvePondUuid(organizationId, pondId)
  const { data, error } = await supabase
    .from('feeding_records')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('pond_id', pondUuid)
    .gte('executed_at', timeRange.startAt)
    .lte('executed_at', timeRange.endAt)
    .order('executed_at', { ascending: false })

  if (error) {
    throwSupabaseError(error, '读取投喂历史失败')
  }

  return (data ?? []).map(mapFeedingRecordRow)
}

export async function getFeedingSummary(
  organizationId: string,
  pondId: string,
  timeRange: TimeRange,
): Promise<FeedingSummary> {
  if (!isSupabaseMode) {
    const records = await getFeedingRecords(organizationId, pondId, timeRange)
    const totalFeedKg = records.reduce((sum, record) => sum + record.feedAmountKg, 0)

    return Promise.resolve({
      organizationId,
      pondId,
      timeRange,
      totalFeedKg,
      taskCount: records.length,
      averageDailyFeedKg: Number((totalFeedKg / Math.max(1, records.length ? 1 : 0)).toFixed(1)),
    })
  }

  const pondUuid = await resolvePondUuid(organizationId, pondId)
  const { data, error } = await supabase
    .from('feeding_daily_stats')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('pond_id', pondUuid)
    .gte('stat_date', toDateOnly(timeRange.startAt))
    .lte('stat_date', toDateOnly(timeRange.endAt))
    .order('stat_date', { ascending: true })

  if (error) {
    throwSupabaseError(error, '读取投喂统计失败')
  }

  return mapFeedingSummary(organizationId, pondUuid, timeRange, data ?? [])
}
