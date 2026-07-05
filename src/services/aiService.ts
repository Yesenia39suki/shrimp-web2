import { API_ENDPOINTS } from '@/constants/apiEndpoints'
import type { TimeRange } from '@/types/business'
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

export async function requestPondEvaluation(
  organizationId: string,
  pondId: string,
  options: AiRequestOptions = {},
): Promise<AiPondEvaluationResult> {
  // TODO: 后续调用 Supabase Edge Function：API_ENDPOINTS.ai.evaluatePond。
  // 前端禁止直接请求 OpenAI、DeepSeek 或自研模型服务。
  void API_ENDPOINTS.ai.evaluatePond
  const input: AiPondEvaluationInput = {
    organizationId,
    pondId,
    providerType: options.providerType,
  }
  void input
  return Promise.resolve({
    organizationId,
    pondId,
    ...createStructuredResult(options),
  })
}

export async function requestFeedingAdvice(
  organizationId: string,
  pondId: string,
  options: AiRequestOptions = {},
): Promise<AiFeedingAdviceResult> {
  // TODO: 后续调用 Supabase Edge Function：API_ENDPOINTS.ai.feedingAdvice。
  void API_ENDPOINTS.ai.feedingAdvice
  const input: AiFeedingAdviceInput = { organizationId, pondId, providerType: options.providerType }
  void input
  return Promise.resolve({
    organizationId,
    pondId,
    ...createStructuredResult(options),
    recommendedFeedKg: 18,
    recommendedTime: '17:30',
    feedingMethod: '分区少量多次投喂',
  })
}

export async function explainAlert(
  organizationId: string,
  pondId: string,
  alertId: string,
  options: AiRequestOptions = {},
): Promise<AiAlertExplanation> {
  // TODO: 后续调用 Supabase Edge Function：API_ENDPOINTS.ai.explainAlert。
  void API_ENDPOINTS.ai.explainAlert
  return Promise.resolve({
    id: `ai-alert-explanation-${alertId}`,
    organizationId,
    pondId,
    alertId,
    ...createStructuredResult(options),
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
  void API_ENDPOINTS.ai.generateReport
  void options
  return Promise.resolve({
    id: `ai-report-${Date.now()}`,
    organizationId,
    pondId,
    reportType,
    title: `${dateRange.startAt} 至 ${dateRange.endAt} 养殖分析报告`,
    content: 'mock 报告：水质稳定，建议维持当前投喂节奏并关注夜间溶氧。',
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
  void API_ENDPOINTS.ai.chat
  void options
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
      content: '已收到问题。当前为 mock 回复，真实模型将由后端 Edge Function 调用。',
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
  void API_ENDPOINTS.ai.detectAnomalies
  return Promise.resolve({
    organizationId,
    pondId,
    timeRange,
    ...createStructuredResult(options),
    summary: '近周期内未发现高风险异常，但溶氧低位波动需要关注。',
  })
}

export async function planRobotTask(
  organizationId: string,
  pondId: string,
  options: AiRequestOptions & { robotId?: string } = {},
): Promise<AiRobotTaskPlanResult> {
  // TODO: 后续调用 Supabase Edge Function：API_ENDPOINTS.ai.planRobotTask，结果需人工确认后下发。
  void API_ENDPOINTS.ai.planRobotTask
  return Promise.resolve({
    organizationId,
    pondId,
    robotId: options.robotId,
    ...createStructuredResult(options),
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
  return Promise.resolve({
    success: true,
    message: payload.accepted ? '已记录采纳反馈' : '已记录不采纳反馈',
    data: {
      ...payload,
      organizationId,
    },
  })
}
