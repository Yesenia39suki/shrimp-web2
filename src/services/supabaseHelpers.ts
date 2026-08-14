import { supabase } from '@/lib/supabase'

interface SupabaseErrorLike {
  message?: string
  code?: string
  details?: string
}

export function toChineseSupabaseError(
  error: SupabaseErrorLike | null | undefined,
  fallback = '数据库操作失败',
) {
  if (!error) {
    return fallback
  }

  const detail = [error.message, error.details].filter(Boolean).join(' ')

  if (error.code === '42501' || detail.includes('row-level security')) {
    return '当前账号无操作权限'
  }

  if (detail.includes('JWT') || detail.includes('invalid claim') || detail.includes('expired')) {
    return '登录状态已失效，请重新登录'
  }

  if (detail.includes('Failed to fetch') || detail.includes('NetworkError')) {
    return '网络异常，请稍后重试'
  }

  if (detail.includes('relation') && detail.includes('does not exist')) {
    return '数据库表尚未创建，请先执行 Supabase SQL 迁移'
  }

  return detail ? `${fallback}：${detail}` : fallback
}

export function throwSupabaseError(
  error: SupabaseErrorLike | null | undefined,
  fallback?: string,
): never {
  throw new Error(toChineseSupabaseError(error, fallback))
}

export async function getCurrentSupabaseUserId() {
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    throwSupabaseError(error, '登录状态已失效，请重新登录')
  }

  if (!data.user) {
    throw new Error('登录状态已失效，请重新登录')
  }

  return data.user.id
}

export function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

export async function resolvePondUuid(organizationId: string, pondIdOrCode: string) {
  const query = supabase
    .from('ponds')
    .select('id')
    .eq('organization_id', organizationId)
    .limit(1)

  const { data, error } = isUuidLike(pondIdOrCode)
    ? await query.eq('id', pondIdOrCode).maybeSingle()
    : await query.eq('pond_code', pondIdOrCode).maybeSingle()

  if (error) {
    throwSupabaseError(error, '读取池塘失败')
  }

  if (!data) {
    throw new Error('未找到池塘')
  }

  return data.id
}

export async function resolveRobotUuid(organizationId: string, robotIdOrCode: string) {
  const query = supabase
    .from('robots')
    .select('id')
    .eq('organization_id', organizationId)
    .limit(1)

  const { data, error } = isUuidLike(robotIdOrCode)
    ? await query.eq('id', robotIdOrCode).maybeSingle()
    : await query.eq('robot_code', robotIdOrCode).maybeSingle()

  if (error) {
    throwSupabaseError(error, '读取机器人失败')
  }

  if (!data) {
    throw new Error('未找到机器人')
  }

  return data.id
}

export function toDateOnly(value: string) {
  return value.slice(0, 10)
}
