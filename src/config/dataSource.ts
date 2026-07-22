export type DataSourceMode = 'mock' | 'supabase'

const configuredMode = (import.meta.env.VITE_DATA_SOURCE ?? 'mock').toLowerCase()

export const dataSourceMode: DataSourceMode =
  configuredMode === 'supabase' ? 'supabase' : 'mock'

export const isSupabaseMode = dataSourceMode === 'supabase'
export const isMockMode = dataSourceMode === 'mock'

export function getSupabaseConfig() {
  return {
    url: import.meta.env.VITE_SUPABASE_URL?.trim() ?? '',
    key:
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
      import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ||
      '',
  }
}

export function assertSupabaseConfigured() {
  if (!isSupabaseMode) {
    return
  }

  const config = getSupabaseConfig()

  if (!config.url || !config.key) {
    throw new Error(
      'Supabase 模式缺少环境变量，请配置 VITE_SUPABASE_URL 和 VITE_SUPABASE_PUBLISHABLE_KEY。',
    )
  }
}
