import type { AiModelConfig, AiProviderType, AiRequestLog } from '@/types/ai'
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

export async function loadModelConfig(organizationId: string): Promise<AiModelConfig> {
  const configs = readConfigMap()
  return Promise.resolve(configs[organizationId] ?? createDefaultConfig(organizationId))
}

export async function saveModelConfig(
  organizationId: string,
  config: AiModelConfig,
): Promise<AiModelConfig> {
  // TODO: 后续调用 /functions/v1/ai-model-config，由后端保存 provider 配置。
  // 不允许前端保存 API Key；OpenAI/DeepSeek 密钥由后端环境变量管理。
  const configs = readConfigMap()
  const sanitized: AiModelConfig = {
    ...config,
    organizationId,
    endpointUrl:
      config.providerType === 'local_model' || config.providerType === 'hybrid'
        ? config.endpointUrl
        : undefined,
  }
  configs[organizationId] = sanitized
  writeConfigMap(configs)
  return Promise.resolve(sanitized)
}

export async function switchProvider(
  organizationId: string,
  providerType: AiProviderType,
): Promise<AiModelConfig> {
  const current = await loadModelConfig(organizationId)
  const modelNameMap: Record<AiProviderType, string> = {
    rule_engine: '规则评分模型',
    openai: 'OpenAI GPT',
    deepseek: 'DeepSeek',
    local_model: '自研模型',
    hybrid: '混合决策模型',
  }

  return saveModelConfig(organizationId, {
    ...current,
    providerType,
    modelName: current.modelName || modelNameMap[providerType],
  })
}

export async function testModelConnection(
  organizationId: string,
  config: AiModelConfig,
): Promise<ApiResponse<{ providerType: AiProviderType }>> {
  // TODO: 真实连接测试必须走后端 Edge Function，不在前端直连模型服务。
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

  void organizationId
  return Promise.resolve({
    success: true,
    message:
      config.providerType === 'openai' || config.providerType === 'deepseek'
        ? '连接测试 mock 通过，密钥由后端环境变量管理。'
        : '连接测试 mock 通过。',
    data: { providerType: config.providerType },
  })
}

export async function loadAiRequestLogs(organizationId: string): Promise<AiRequestLog[]> {
  // TODO: 后续读取 ai_request_logs，统计模型调用量、耗时和错误率。
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
