import { isSupabaseMode } from '@/config/dataSource'
import { API_ENDPOINTS } from '@/constants/apiEndpoints'
import { supabase } from '@/lib/supabase'
import {
  mapAiEvaluationRow,
  mapAiFeedingAdviceRow,
  mapAiResultFeedbackRow,
} from '@/services/mappers/aiMapper'
import { resolvePondUuid, throwSupabaseError } from '@/services/supabaseHelpers'
import type { TimeRange } from '@/types/business'
import type { Inserts } from '@/types/database'
import type {
  AiAlertExplanation,
  AiAnomalyResult,
  AiChatMessage,
  AiFeedingAdviceInput,
  AiFeedingAdviceResult,
  AiPondEvaluationInput,
  AiPondEvaluationResult,
  AiProviderType,
  AiReport,
  AiResultFeedback,
  AiRobotTaskPlanResult,
  AiStructuredResult,
} from '@/types/ai'
import type { ApiResponse } from '@/types/system'

interface AiRequestOptions {
  providerType?: AiProviderType
  needManualConfirm?: boolean
}

function createStructuredResult(options: AiRequestOptions = {}): AiStructuredResult {
  return {
    riskLevel: '关注',
    riskScore: 42,
    summary: '当前池塘整体可控，溶氧和投喂节奏需要持续观察。',
    problems: ['午后溶氧有下探趋势', '投喂后料台复核次数偏少'],
    recommendations: ['投喂前先复核最近 30 分钟溶氧', '保持少量多次投喂，并增加一次料台观察'],
    confidence: options.providerType === 'rule_engine' ? 0.72 : 0.81,
    needManualConfirm: options.needManualConfirm ?? true,
  }
}

async function writeAiRequestLog(input: {
  organizationId: string
  pondId?: string
  providerType: AiProviderType
  endpoint: string
  success: boolean
  errorMessage?: string
  durationMs?: number
}) {
  if (!isSupabaseMode) return

  const row: Inserts<'ai_request_logs'> = {
    organization_id: input.organizationId,
    pond_id: input.pondId ?? null,
    provider_type: input.providerType,
    endpoint: input.endpoint,
    success: input.success,
    error_message: input.errorMessage ?? null,
    duration_ms: input.durationMs ?? null,
  }

  const { error } = await supabase.from('ai_request_logs').insert(row)
  if (error) {
    throwSupabaseError(error, '写入 AI 请求日志失败')
  }
}

export async function requestPondEvaluation(
  organizationId: string,
  pondId: string,
  options: AiRequestOptions = {},
): Promise<AiPondEvaluationResult> {
  // TODO: 后续调用 Supabase Edge Function：API_ENDPOINTS.ai.evaluatePond。
  // 前端禁止直接请求 OpenAI、DeepSeek 或自研模型服务。
  const providerType = options.providerType ?? 'rule_engine'
  const input: AiPondEvaluationInput = {
    organizationId,
    pondId,
    providerType,
  }
  void input
  const result = createStructuredResult({ ...options, providerType })

  if (!isSupabaseMode) {
    return Promise.resolve({ organizationId, pondId, ...result })
  }

  const startedAt = performance.now()
  const pondUuid = await resolvePondUuid(organizationId, pondId)
  const row: Inserts<'ai_evaluations'> = {
    organization_id: organizationId,
    pond_id: pondUuid,
    provider_type: providerType,
    risk_level: result.riskLevel,
    risk_score: result.riskScore,
    summary: result.summary,
    problems: result.problems,
    recommendations: result.recommendations,
    confidence: result.confidence,
    need_manual_confirm: result.needManualConfirm,
  }
  const { data, error } = await supabase.from('ai_evaluations').insert(row).select('*').single()

  if (error) {
    await writeAiRequestLog({
      organizationId,
      pondId: pondUuid,
      providerType,
      endpoint: API_ENDPOINTS.ai.evaluatePond,
      success: false,
      errorMessage: error.message,
      durationMs: Math.round(performance.now() - startedAt),
    })
    throwSupabaseError(error, '保存 AI 状态评估失败')
  }

  await writeAiRequestLog({
    organizationId,
    pondId: pondUuid,
    providerType,
    endpoint: API_ENDPOINTS.ai.evaluatePond,
    success: true,
    durationMs: Math.round(performance.now() - startedAt),
  })

  const saved = mapAiEvaluationRow(data)
  return {
    organizationId: saved.organizationId,
    pondId: saved.pondId,
    riskLevel: saved.riskLevel,
    riskScore: saved.riskScore,
    summary: saved.summary,
    problems: saved.problems,
    recommendations: saved.recommendations,
    confidence: saved.confidence,
    needManualConfirm: saved.needManualConfirm,
  }
}

export async function requestFeedingAdvice(
  organizationId: string,
  pondId: string,
  options: AiRequestOptions = {},
): Promise<AiFeedingAdviceResult> {
  // TODO: 后续调用 Supabase Edge Function：API_ENDPOINTS.ai.feedingAdvice。
  const providerType = options.providerType ?? 'rule_engine'
  const input: AiFeedingAdviceInput = { organizationId, pondId, providerType }
  void input
  const result = {
    organizationId,
    pondId,
    ...createStructuredResult({ ...options, providerType }),
    recommendedFeedKg: 18,
    recommendedTime: '17:30',
    feedingMethod: '分区少量多次投喂',
  }

  if (!isSupabaseMode) {
    return Promise.resolve(result)
  }

  const startedAt = performance.now()
  const pondUuid = await resolvePondUuid(organizationId, pondId)
  const row: Inserts<'ai_feeding_advices'> = {
    organization_id: organizationId,
    pond_id: pondUuid,
    provider_type: providerType,
    risk_level: result.riskLevel,
    risk_score: result.riskScore,
    summary: result.summary,
    problems: result.problems,
    recommendations: result.recommendations,
    confidence: result.confidence,
    need_manual_confirm: result.needManualConfirm,
    recommended_feed_kg: result.recommendedFeedKg,
    recommended_time: result.recommendedTime,
    feeding_method: result.feedingMethod,
  }
  const { data, error } = await supabase.from('ai_feeding_advices').insert(row).select('*').single()

  if (error) {
    await writeAiRequestLog({
      organizationId,
      pondId: pondUuid,
      providerType,
      endpoint: API_ENDPOINTS.ai.feedingAdvice,
      success: false,
      errorMessage: error.message,
      durationMs: Math.round(performance.now() - startedAt),
    })
    throwSupabaseError(error, '保存 AI 投喂建议失败')
  }

  await writeAiRequestLog({
    organizationId,
    pondId: pondUuid,
    providerType,
    endpoint: API_ENDPOINTS.ai.feedingAdvice,
    success: true,
    durationMs: Math.round(performance.now() - startedAt),
  })

  const saved = mapAiFeedingAdviceRow(data)
  return {
    organizationId: saved.organizationId,
    pondId: saved.pondId,
    riskLevel: saved.riskLevel,
    riskScore: saved.riskScore,
    summary: saved.summary,
    problems: saved.problems,
    recommendations: saved.recommendations,
    confidence: saved.confidence,
    needManualConfirm: saved.needManualConfirm,
    recommendedFeedKg: saved.recommendedFeedKg,
    recommendedTime: saved.recommendedTime,
    feedingMethod: saved.feedingMethod,
  }
}

export async function explainAlert(
  organizationId: string,
  pondId: string,
  alertId: string,
  options: AiRequestOptions = {},
): Promise<AiAlertExplanation> {
  // TODO: 后续调用 Supabase Edge Function：API_ENDPOINTS.ai.explainAlert。
  void API_ENDPOINTS.ai.explainAlert
  const providerType = options.providerType ?? 'rule_engine'
  if (isSupabaseMode) {
    await writeAiRequestLog({
      organizationId,
      pondId: await resolvePondUuid(organizationId, pondId),
      providerType,
      endpoint: API_ENDPOINTS.ai.explainAlert,
      success: true,
    })
  }

  return Promise.resolve({
    id: `ai-alert-explanation-${alertId}`,
    organizationId,
    pondId,
    alertId,
    ...createStructuredResult({ ...options, providerType }),
    summary: '该报警主要由水质波动和投喂前复核不足触发。',
  })
}

export async function generateReport(
  organizationId: string,
  pondId: string,
  reportType: string,
  dateRange: TimeRange,
  options: AiRequestOptions = {},
): Promise<AiReport> {
  // TODO: 后续调用 Supabase Edge Function：API_ENDPOINTS.ai.generateReport，并存 ai_reports。
  const providerType = options.providerType ?? 'rule_engine'
  if (isSupabaseMode) {
    await writeAiRequestLog({
      organizationId,
      pondId: await resolvePondUuid(organizationId, pondId),
      providerType,
      endpoint: API_ENDPOINTS.ai.generateReport,
      success: true,
    })
  }

  return Promise.resolve({
    id: `ai-report-${Date.now()}`,
    organizationId,
    pondId,
    reportType,
    title: `${dateRange.startAt} 至 ${dateRange.endAt} 养殖分析报告`,
    content: '占位报告：真实报告将由后端 Edge Function 调用模型后生成。',
    createdAt: new Date().toISOString(),
  })
}

export async function sendAiChatMessage(
  organizationId: string,
  pondId: string,
  conversationId: string,
  message: string,
  options: AiRequestOptions = {},
): Promise<AiChatMessage[]> {
  // TODO: 后续调用 Supabase Edge Function：API_ENDPOINTS.ai.chat。
  const providerType = options.providerType ?? 'rule_engine'
  if (isSupabaseMode) {
    await writeAiRequestLog({
      organizationId,
      pondId: await resolvePondUuid(organizationId, pondId),
      providerType,
      endpoint: API_ENDPOINTS.ai.chat,
      success: true,
    })
  }

  return Promise.resolve([
    {
      id: `ai-chat-user-${Date.now()}`,
      organizationId,
      pondId,
      conversationId,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    },
    {
      id: `ai-chat-assistant-${Date.now()}`,
      organizationId,
      pondId,
      conversationId,
      role: 'assistant',
      content: '已收到问题。当前为占位回复，真实模型将由后端 Edge Function 调用。',
      createdAt: new Date().toISOString(),
    },
  ])
}

export async function detectAnomalies(
  organizationId: string,
  pondId: string,
  timeRange: TimeRange,
  options: AiRequestOptions = {},
): Promise<AiAnomalyResult> {
  // TODO: 后续调用 Supabase Edge Function：API_ENDPOINTS.ai.detectAnomalies。
  const providerType = options.providerType ?? 'rule_engine'
  if (isSupabaseMode) {
    await writeAiRequestLog({
      organizationId,
      pondId: await resolvePondUuid(organizationId, pondId),
      providerType,
      endpoint: API_ENDPOINTS.ai.detectAnomalies,
      success: true,
    })
  }

  return Promise.resolve({
    organizationId,
    pondId,
    timeRange,
    ...createStructuredResult({ ...options, providerType }),
    summary: '近周期内未发现高风险异常，但溶氧低位波动需要关注。',
  })
}

export async function planRobotTask(
  organizationId: string,
  pondId: string,
  options: AiRequestOptions & { robotId?: string } = {},
): Promise<AiRobotTaskPlanResult> {
  // TODO: 后续调用 Supabase Edge Function：API_ENDPOINTS.ai.planRobotTask，结果需人工确认后下发。
  const providerType = options.providerType ?? 'rule_engine'
  if (isSupabaseMode) {
    await writeAiRequestLog({
      organizationId,
      pondId: await resolvePondUuid(organizationId, pondId),
      providerType,
      endpoint: API_ENDPOINTS.ai.planRobotTask,
      success: true,
    })
  }

  return Promise.resolve({
    organizationId,
    pondId,
    robotId: options.robotId,
    ...createStructuredResult({ ...options, providerType }),
    tasks: [
      {
        name: '池面巡航复核',
        commandType: 'patrol',
        plannedAt: new Date(Date.now() + 20 * 60_000).toISOString(),
      },
      {
        name: '低量补投',
        commandType: 'feed',
        plannedAt: new Date(Date.now() + 40 * 60_000).toISOString(),
      },
    ],
  })
}

export async function submitAiFeedback(
  organizationId: string,
  payload: AiResultFeedback,
): Promise<ApiResponse<AiResultFeedback>> {
  // TODO: 后续调用 Supabase Edge Function：API_ENDPOINTS.ai.feedback，并写 ai_result_feedback。
  void API_ENDPOINTS.ai.feedback
  if (!isSupabaseMode) {
    return Promise.resolve({
      success: true,
      message: payload.accepted ? '已记录采纳反馈' : '已记录不采纳反馈',
      data: {
        ...payload,
        organizationId,
      },
    })
  }

  const pondUuid = payload.pondId ? await resolvePondUuid(organizationId, payload.pondId) : null
  const { data, error } = await supabase
    .from('ai_result_feedback')
    .insert({
      organization_id: organizationId,
      pond_id: pondUuid,
      result_id: payload.resultId,
      accepted: payload.accepted,
      remark: payload.remark ?? null,
    })
    .select('*')
    .single()

  if (error) {
    throwSupabaseError(error, '保存 AI 反馈失败')
  }

  return {
    success: true,
    message: payload.accepted ? '已记录采纳反馈' : '已记录不采纳反馈',
    data: mapAiResultFeedbackRow(data),
  }
}
