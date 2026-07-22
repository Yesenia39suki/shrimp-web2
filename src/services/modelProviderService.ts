import { isSupabaseMode } from '@/config/dataSource'
import { API_ENDPOINTS } from '@/constants/apiEndpoints'
import { supabase } from '@/lib/supabase'
import {
  mapAiModelConfigRow,
  mapAiRequestLogRow,
} from '@/services/mappers/aiMapper'
import { throwSupabaseError } from '@/services/supabaseHelpers'
import type { AiModelConfig, AiProviderType, AiRequestLog } from '@/types/ai'
import type { Inserts } from '@/types/database'
import type { ApiResponse } from '@/types/system'

const MODEL_CONFIG_STORAGE_KEY = 'shrimp_ai_model_config'

function canUseLocalStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function readConfigMap() {
  if (!canUseLocalStorage()) {
    return {} as Record<string, AiModelConfig>
  }

  try {
    return JSON.parse(window.localStorage.getItem(MODEL_CONFIG_STORAGE_KEY) ?? '{}') as Record<
      string,
      AiModelConfig
    >
  } catch {
    return {}
  }
}

function writeConfigMap(configs: Record<string, AiModelConfig>) {
  if (!canUseLocalStorage()) {
    return
  }

  window.localStorage.setItem(MODEL_CONFIG_STORAGE_KEY, JSON.stringify(configs))
}

function createDefaultConfig(organizationId: string): AiModelConfig {
  return {
    id: `ai-model-config-${organizationId}`,
    organizationId,
    providerType: 'rule_engine',
    modelName: '规则评分模型',
    jsonOutput: true,
    dailyLimit: 200,
    monthlyUsage: 0,
    enabled: true,
  }
}

function sanitizeConfig(organizationId: string, config: AiModelConfig): AiModelConfig {
  return {
    ...config,
    organizationId,
    endpointUrl:
      config.providerType === 'local_model' || config.providerType === 'hybrid'
        ? config.endpointUrl
        : undefined,
  }
}

function modelNameMap(providerType: AiProviderType) {
  const map: Record<AiProviderType, string> = {
    rule_engine: '规则评分模型',
    openai: 'OpenAI GPT',
    deepseek: 'DeepSeek',
    local_model: '自研模型',
    hybrid: '混合决策模型',
  }

  return map[providerType]
}

export async function loadModelConfig(organizationId: string): Promise<AiModelConfig> {
  if (!isSupabaseMode) {
    const configs = readConfigMap()
    return Promise.resolve(configs[organizationId] ?? createDefaultConfig(organizationId))
  }

  const { data, error } = await supabase
    .from('ai_model_configs')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    throwSupabaseError(error, '读取 AI 模型配置失败')
  }

  return data ? mapAiModelConfigRow(data) : createDefaultConfig(organizationId)
}

export async function saveModelConfig(
  organizationId: string,
  config: AiModelConfig,
): Promise<AiModelConfig> {
  const sanitized = sanitizeConfig(organizationId, config)

  if (!isSupabaseMode) {
    const configs = readConfigMap()
    configs[organizationId] = sanitized
    writeConfigMap(configs)
    return Promise.resolve(sanitized)
  }

  void API_ENDPOINTS.ai.modelConfig
  const row: Inserts<'ai_model_configs'> = {
    id: config.id && config.id.startsWith('ai-model-config-') ? undefined : config.id,
    organization_id: organizationId,
    provider_type: sanitized.providerType,
    model_name: sanitized.modelName || modelNameMap(sanitized.providerType),
    endpoint_url: sanitized.endpointUrl ?? null,
    json_output: sanitized.jsonOutput,
    daily_limit: sanitized.dailyLimit,
    monthly_usage: sanitized.monthlyUsage,
    enabled: sanitized.enabled,
  }
  const { data, error } = await supabase
    .from('ai_model_configs')
    .upsert(row, { onConflict: 'organization_id' })
    .select('*')
    .single()

  if (error) {
    throwSupabaseError(error, '保存 AI 模型配置失败')
  }

  return mapAiModelConfigRow(data)
}

export async function switchProvider(
  organizationId: string,
  providerType: AiProviderType,
): Promise<AiModelConfig> {
  const current = await loadModelConfig(organizationId)

  return saveModelConfig(organizationId, {
    ...current,
    providerType,
    modelName: current.modelName || modelNameMap(providerType),
  })
}

export async function testModelConnection(
  organizationId: string,
  config: AiModelConfig,
): Promise<ApiResponse<{ providerType: AiProviderType }>> {
  void organizationId
  // TODO: 真实连接测试必须调用 Supabase Edge Function：API_ENDPOINTS.ai.modelConfig。
  // 前端不能直连 OpenAI、DeepSeek 或自研模型服务，也不能保存 API Key。
  if (
    (config.providerType === 'openai' || config.providerType === 'deepseek') &&
    !config.modelName
  ) {
    return Promise.resolve({
      success: false,
      message: '请填写模型名称。密钥由后端环境变量管理，前端不保存密钥。',
      data: { providerType: config.providerType },
    })
  }

  if (config.providerType === 'local_model' && !config.endpointUrl) {
    return Promise.resolve({
      success: false,
      message: '自研模型需要填写 endpointUrl，后续由后端统一调用。',
      data: { providerType: config.providerType },
    })
  }

  return Promise.resolve({
    success: true,
    message:
      config.providerType === 'openai' || config.providerType === 'deepseek'
        ? '连接测试占位通过，密钥由后端环境变量管理。'
        : '连接测试占位通过。',
    data: { providerType: config.providerType },
  })
}

export async function loadAiRequestLogs(organizationId: string): Promise<AiRequestLog[]> {
  if (!isSupabaseMode) {
    return Promise.resolve([
      {
        id: `ai-request-log-${organizationId}`,
        organizationId,
        providerType: (await loadModelConfig(organizationId)).providerType,
        endpoint: '/functions/v1/ai-evaluate-pond',
        success: true,
        createdAt: new Date().toISOString(),
      },
    ])
  }

  void API_ENDPOINTS.ai.requestLogs
  const { data, error } = await supabase
    .from('ai_request_logs')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    throwSupabaseError(error, '读取 AI 请求日志失败')
  }

  return (data ?? []).map(mapAiRequestLogRow)
}
