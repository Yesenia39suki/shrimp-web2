import type {
  AiEvaluation,
  AiFeedingAdvice,
  AiModelConfig,
  AiRequestLog,
  AiResultFeedback,
  RiskScore,
} from '@/types/ai'
import type {
  AiEvaluationRow,
  AiFeedingAdviceRow,
  AiModelConfigRow,
  AiRequestLogRow,
  AiResultFeedbackRow,
  RiskScoreRow,
} from '@/types/database'

function jsonStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export function mapAiModelConfigRow(row: AiModelConfigRow): AiModelConfig {
  return {
    id: row.id,
    organizationId: row.organization_id,
    providerType: row.provider_type,
    modelName: row.model_name,
    endpointUrl: row.endpoint_url ?? undefined,
    jsonOutput: row.json_output,
    dailyLimit: row.daily_limit,
    monthlyUsage: row.monthly_usage,
    enabled: row.enabled,
  }
}

export function mapRiskScoreRow(row: RiskScoreRow): RiskScore {
  return {
    organizationId: row.organization_id,
    pondId: row.pond_id,
    waterRiskScore: Number(row.water_risk_score),
    feedingRiskScore: Number(row.feeding_risk_score),
    growthRiskScore: Number(row.growth_risk_score),
    robotRiskScore: Number(row.robot_risk_score),
    totalRiskScore: Number(row.total_risk_score),
    riskLevel: row.risk_level,
    calculationDetail: row.calculation_detail,
    calculatedAt: row.calculated_at,
  }
}

export function mapAiEvaluationRow(row: AiEvaluationRow): AiEvaluation {
  return {
    id: row.id,
    organizationId: row.organization_id,
    pondId: row.pond_id,
    providerType: row.provider_type,
    riskLevel: row.risk_level,
    riskScore: Number(row.risk_score),
    summary: row.summary,
    problems: jsonStringList(row.problems),
    recommendations: jsonStringList(row.recommendations),
    confidence: Number(row.confidence),
    needManualConfirm: row.need_manual_confirm,
    createdAt: row.created_at,
  }
}

export function mapAiFeedingAdviceRow(row: AiFeedingAdviceRow): AiFeedingAdvice {
  return {
    ...mapAiEvaluationRow(row),
    recommendedFeedKg: Number(row.recommended_feed_kg),
    recommendedTime: row.recommended_time,
    feedingMethod: row.feeding_method,
  }
}

export function mapAiRequestLogRow(row: AiRequestLogRow): AiRequestLog {
  return {
    id: row.id,
    organizationId: row.organization_id,
    pondId: row.pond_id ?? undefined,
    providerType: row.provider_type,
    endpoint: row.endpoint,
    success: row.success,
    createdAt: row.created_at,
  }
}

export function mapAiResultFeedbackRow(row: AiResultFeedbackRow): AiResultFeedback {
  return {
    organizationId: row.organization_id,
    pondId: row.pond_id ?? undefined,
    resultId: row.result_id,
    accepted: row.accepted,
    remark: row.remark ?? undefined,
  }
}
