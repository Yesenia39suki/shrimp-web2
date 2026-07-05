import type { TimeRange } from '@/types/business'

export type AiProviderType = 'rule_engine' | 'openai' | 'deepseek' | 'local_model' | 'hybrid'
export type RiskLevel = '低风险' | '关注' | '预警' | '高风险'

export interface AiModelConfig {
  id: string
  organizationId: string
  providerType: AiProviderType
  modelName: string
  endpointUrl?: string
  jsonOutput: boolean
  dailyLimit: number
  monthlyUsage: number
  enabled: boolean
}

export interface LocalModelEndpointConfig {
  organizationId: string
  endpointUrl: string
  timeoutMs: number
  modelName: string
}

export interface RiskScore {
  organizationId: string
  pondId: string
  waterRiskScore: number
  feedingRiskScore: number
  growthRiskScore: number
  robotRiskScore: number
  totalRiskScore: number
  riskLevel: RiskLevel
  calculationDetail: string
  calculatedAt: string
}

export interface AiStructuredResult {
  riskLevel: RiskLevel
  riskScore: number
  summary: string
  problems: string[]
  recommendations: string[]
  confidence: number
  needManualConfirm: boolean
}

export interface AiEvaluation extends AiStructuredResult {
  id: string
  organizationId: string
  pondId: string
  providerType: AiProviderType
  createdAt: string
}

export interface AiFeedingAdvice extends AiStructuredResult {
  id: string
  organizationId: string
  pondId: string
  recommendedFeedKg: number
  recommendedTime: string
  feedingMethod: string
}

export interface AiAlertExplanation extends AiStructuredResult {
  id: string
  organizationId: string
  pondId: string
  alertId: string
}

export interface AiReport {
  id: string
  organizationId: string
  pondId: string
  reportType: string
  title: string
  content: string
  createdAt: string
}

export interface AiChatSession {
  id: string
  organizationId: string
  pondId?: string
  title: string
  createdAt: string
}

export interface AiChatMessage {
  id: string
  organizationId: string
  pondId?: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
}

export interface AiRequestLog {
  id: string
  organizationId: string
  pondId?: string
  providerType: AiProviderType
  endpoint: string
  success: boolean
  createdAt: string
}

export interface AiResultFeedback {
  organizationId: string
  pondId?: string
  resultId: string
  accepted: boolean
  remark?: string
}

export interface AiPondEvaluationInput {
  organizationId: string
  pondId: string
  providerType?: AiProviderType
}

export interface AiPondEvaluationResult extends AiStructuredResult {
  organizationId: string
  pondId: string
}

export interface AiFeedingAdviceInput {
  organizationId: string
  pondId: string
  providerType?: AiProviderType
}

export interface AiFeedingAdviceResult extends AiStructuredResult {
  organizationId: string
  pondId: string
  recommendedFeedKg: number
  recommendedTime: string
  feedingMethod: string
}

export interface AiAnomalyResult extends AiStructuredResult {
  organizationId: string
  pondId: string
  timeRange: TimeRange
}

export interface AiRobotTaskPlanResult extends AiStructuredResult {
  organizationId: string
  pondId: string
  robotId?: string
  tasks: Array<{ name: string; commandType: string; plannedAt: string }>
}
