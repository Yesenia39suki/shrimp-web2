import { supabase } from '@/lib/supabase'

export interface AgentChatTurn {
  question: string
  answer: string
}

interface AgentWarningItem {
  id: string
  title: string
  status: string
  recorded_at: string | null
  trigger: string
  impact: string
  actions: string[]
  verify: string
}

export interface AgentChatReply {
  answer: string
  evidence: Array<{ fact_id: string; statement: string }>
  sources: Array<{ source_id: string; title: string; url: string }>
  search_note: string | null
  issues: AgentWarningItem[]
}

export async function askAgent(
  question: string,
  pondId: string | null,
  recentTurns: AgentChatTurn[],
  signal: AbortSignal,
): Promise<AgentChatReply> {
  const { data, error } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (error || !token) throw new Error('登录已过期，请重新登录。')

  const response = await fetch('/api/v1/agent/chat', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question, pond_id: pondId, recent_turns: recentTurns }),
    signal,
  })
  if (response.status === 401) throw new Error('登录已过期，请重新登录。')
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(typeof body?.detail === 'string' ? body.detail : 'AI助手暂时不可用。')
  }
  if (typeof body?.answer !== 'string' || !Array.isArray(body.evidence)) {
    throw new Error('AI助手暂时不可用。')
  }
  return {
    answer: body.answer,
    evidence: body.evidence,
    sources: Array.isArray(body.sources) ? body.sources : [],
    search_note: typeof body.search_note === 'string' ? body.search_note : null,
    issues: Array.isArray(body.issues) ? body.issues : [],
  }
}
