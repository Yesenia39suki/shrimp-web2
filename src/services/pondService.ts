import { getBusinessConfig } from '@/services/mockDataService'
import type { Pond, PondMapPosition, PondScenePosition } from '@/types/business'

export async function getPonds(organizationId: string): Promise<Pond[]> {
  return Promise.resolve([getBusinessConfig(organizationId).pond])
}

export async function getPondById(organizationId: string, pondId: string): Promise<Pond | null> {
  const ponds = await getPonds(organizationId)
  return ponds.find((pond) => pond.id === pondId || pond.pond_code === pondId) ?? null
}

export async function createPond(organizationId: string, payload: Partial<Pond>): Promise<Pond> {
  // TODO: admin/owner 创建 ponds，并写 audit_logs。
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

export async function updatePond(
  organizationId: string,
  pondId: string,
  payload: Partial<Pond>,
): Promise<Pond> {
  // TODO: admin/owner 更新 ponds。
  return Promise.resolve({
    ...(await getPondById(organizationId, pondId)),
    ...payload,
    id: pondId,
    organization_id: organizationId,
  } as Pond)
}

export async function deletePond(organizationId: string, pondId: string): Promise<boolean> {
  // TODO: 删除前检查机器人、投喂计划、水质数据引用。
  void organizationId
  void pondId
  return Promise.resolve(true)
}

export async function setCurrentPond(organizationId: string, pondId: string): Promise<boolean> {
  // TODO: 保存用户当前池塘偏好。
  void organizationId
  void pondId
  return Promise.resolve(true)
}

export async function updatePondMapPosition(
  organizationId: string,
  pondId: string,
  position: PondMapPosition,
): Promise<PondMapPosition> {
  return Promise.resolve({ ...position, organization_id: organizationId, pond_id: pondId })
}

export async function updatePondScenePosition(
  organizationId: string,
  pondId: string,
  position: PondScenePosition,
): Promise<PondScenePosition> {
  return Promise.resolve({ ...position, organization_id: organizationId, pond_id: pondId })
}
