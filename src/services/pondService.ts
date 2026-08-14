import { isMockMode } from '@/config/dataSource'
import { supabase } from '@/lib/supabase'
import { getBusinessConfig } from '@/services/mockDataService'
import { mapPondInsert, mapPondRow, mapPondUpdate } from '@/services/mappers/pondMapper'
import { resolvePondUuid, throwSupabaseError } from '@/services/supabaseHelpers'
import type { Pond, PondMapPosition, PondScenePosition } from '@/types/business'

export async function getPonds(organizationId: string): Promise<Pond[]> {
  if (isMockMode) {
    return Promise.resolve([getBusinessConfig(organizationId).pond])
  }

  const { data, error } = await supabase
    .from('ponds')
    .select('*')
    .eq('organization_id', organizationId)
    .order('pond_code', { ascending: true })

  if (error) {
    throwSupabaseError(error, '读取池塘失败')
  }

  return (data ?? []).map(mapPondRow)
}

export async function getPondById(organizationId: string, pondId: string): Promise<Pond | null> {
  if (isMockMode) {
    const ponds = await getPonds(organizationId)
    return ponds.find((pond) => pond.id === pondId || pond.pond_code === pondId) ?? null
  }

  const query = supabase.from('ponds').select('*').eq('organization_id', organizationId).limit(1)
  const { data, error } = /^[0-9a-f-]{36}$/i.test(pondId)
    ? await query.eq('id', pondId).maybeSingle()
    : await query.eq('pond_code', pondId).maybeSingle()

  if (error) {
    throwSupabaseError(error, '读取池塘失败')
  }

  return data ? mapPondRow(data) : null
}

export async function createPond(organizationId: string, payload: Partial<Pond>): Promise<Pond> {
  if (isMockMode) {
    return Promise.resolve({
      id: `pond-${Date.now()}`,
      organization_id: organizationId,
      pond_code: payload.pond_code ?? 'P-01',
      pond_name: payload.pond_name ?? '新建养殖池',
      shrimp_species: payload.shrimp_species ?? '南美白对虾',
      area: payload.area ?? 0,
      water_depth: payload.water_depth ?? 0,
      location: payload.location ?? '未设置',
    })
  }

  const { data, error } = await supabase
    .from('ponds')
    .insert(mapPondInsert(organizationId, payload))
    .select('*')
    .single()

  if (error) {
    throwSupabaseError(error, '新增池塘失败')
  }

  return mapPondRow(data)
}

export async function updatePond(
  organizationId: string,
  pondId: string,
  payload: Partial<Pond>,
): Promise<Pond> {
  if (isMockMode) {
    return Promise.resolve({
      ...(await getPondById(organizationId, pondId)),
      ...payload,
      id: pondId,
      organization_id: organizationId,
    } as Pond)
  }

  const pondUuid = await resolvePondUuid(organizationId, pondId)
  const { data, error } = await supabase
    .from('ponds')
    .update(mapPondUpdate(payload))
    .eq('organization_id', organizationId)
    .eq('id', pondUuid)
    .select('*')
    .single()

  if (error) {
    throwSupabaseError(error, '保存池塘失败')
  }

  return mapPondRow(data)
}

export async function deletePond(organizationId: string, pondId: string): Promise<boolean> {
  if (isMockMode) {
    void organizationId
    void pondId
    return Promise.resolve(true)
  }

  const pondUuid = await resolvePondUuid(organizationId, pondId)
  const { error } = await supabase
    .from('ponds')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', pondUuid)

  if (error) {
    throwSupabaseError(error, '删除池塘失败')
  }

  return true
}

export async function setCurrentPond(organizationId: string, pondId: string): Promise<boolean> {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(`shrimp_current_pond_${organizationId}`, pondId)
  }
  return Promise.resolve(true)
}

export async function updatePondMapPosition(
  organizationId: string,
  pondId: string,
  position: PondMapPosition,
): Promise<PondMapPosition> {
  if (isMockMode) {
    return Promise.resolve({ ...position, organization_id: organizationId, pond_id: pondId })
  }

  const pondUuid = await resolvePondUuid(organizationId, pondId)
  const { error } = await supabase
    .from('ponds')
    .update({
      longitude: position.longitude,
      latitude: position.latitude,
    })
    .eq('organization_id', organizationId)
    .eq('id', pondUuid)

  if (error) {
    throwSupabaseError(error, '保存池塘地图位置失败')
  }

  return { ...position, organization_id: organizationId, pond_id: pondUuid }
}

export async function updatePondScenePosition(
  organizationId: string,
  pondId: string,
  position: PondScenePosition,
): Promise<PondScenePosition> {
  // 3D 位置落到 scene_configs，由 scene3dService 统一保存。
  return Promise.resolve({ ...position, organization_id: organizationId, pond_id: pondId })
}
