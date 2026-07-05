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

export async function getFeedingPlans(
  organizationId: string,
  pondId: string,
): Promise<FeedingPlan[]> {
  return Promise.resolve([...getPlansByKey(organizationId, pondId)])
}

export async function createFeedingPlan(
  organizationId: string,
  pondId: string,
  payload: Partial<FeedingPlan>,
): Promise<FeedingPlan> {
  // TODO: operator/admin/owner 创建 feeding_plans，并写 operation_logs。
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

export async function updateFeedingPlan(
  organizationId: string,
  planId: string,
  payload: Partial<FeedingPlan>,
): Promise<FeedingPlan> {
  // TODO: 后续按 organizationId + planId 更新 feeding_plans。
  const plan = Array.from(planStore.values())
    .flat()
    .find((item) => item.organizationId === organizationId && item.id === planId)

  if (!plan) {
    return Promise.reject(new Error('未找到投喂计划'))
  }

  Object.assign(plan, payload)
  return Promise.resolve(plan)
}

export async function deleteFeedingPlan(organizationId: string, planId: string): Promise<boolean> {
  // TODO: 删除前检查 feeding_tasks 和历史记录。
  for (const [key, plans] of planStore.entries()) {
    planStore.set(
      key,
      plans.filter((plan) => !(plan.organizationId === organizationId && plan.id === planId)),
    )
  }
  return Promise.resolve(true)
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

export async function createFeedingRecord(
  organizationId: string,
  pondId: string,
  payload: Partial<FeedingRecord>,
): Promise<FeedingRecord> {
  // TODO: 机器人投喂完成后由后端写 feeding_records。
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

export async function getFeedingRecords(
  organizationId: string,
  pondId: string,
  timeRange: TimeRange,
): Promise<FeedingRecord[]> {
  void timeRange
  return Promise.resolve([...getRecordsByKey(organizationId, pondId)])
}

export async function getFeedingSummary(
  organizationId: string,
  pondId: string,
  timeRange: TimeRange,
): Promise<FeedingSummary> {
  const records = await getFeedingRecords(organizationId, pondId, timeRange)
  const totalFeedKg = records.reduce((sum, record) => sum + record.feedAmountKg, 0)

  return Promise.resolve({
    organizationId,
    pondId,
    timeRange,
    totalFeedKg,
    taskCount: records.length,
    averageDailyFeedKg: Number((totalFeedKg / 1).toFixed(1)),
  })
}
