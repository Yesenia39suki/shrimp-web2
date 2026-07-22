import { createClient } from '@supabase/supabase-js'

import { assertSupabaseConfigured, getSupabaseConfig } from '@/config/dataSource'
import type { Database } from '@/types/database'

assertSupabaseConfigured()

const { url, key } = getSupabaseConfig()

export const supabase = createClient<Database>(url || 'http://localhost', key || 'mock-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
