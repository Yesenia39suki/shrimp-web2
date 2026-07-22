import { isSupabaseMode } from '@/config/dataSource'
import { API_ENDPOINTS } from '@/constants/apiEndpoints'
import { supabase } from '@/lib/supabase'
import { getMockSystemData } from '@/services/mockDataService'
import { mapSceneConfigRow } from '@/services/mappers/scene3dMapper'
import { resolvePondUuid, resolveRobotUuid, throwSupabaseError } from '@/services/supabaseHelpers'
import type { Inserts, Json } from '@/types/database'
import type { SceneConfig, SceneModel, ScenePondObject, SceneRobotObject } from '@/types/scene3d'

const SCENE_CONFIG_STORAGE_KEY = 'shrimp_scene3d_config'

function canUseLocalStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function readSceneMap() {
  if (!canUseLocalStorage()) {
    return {} as Record<string, SceneConfig>
  }

  try {
    return JSON.parse(window.localStorage.getItem(SCENE_CONFIG_STORAGE_KEY) ?? '{}') as Record<
      string,
      SceneConfig
    >
  } catch {
    return {}
  }
}

function writeSceneMap(configs: Record<string, SceneConfig>) {
  if (!canUseLocalStorage()) {
    return
  }

  window.localStorage.setItem(SCENE_CONFIG_STORAGE_KEY, JSON.stringify(configs))
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json
}

function createEmptySceneConfig(organizationId: string): SceneConfig {
  return {
    organizationId,
    camera: {
      x: 54,
      y: 56,
      z: 82,
      targetX: 46,
      targetY: 0,
      targetZ: 34,
    },
    ponds: [],
    robots: [],
    routes: [],
  }
}

function createMockSceneConfig(organizationId: string): SceneConfig {
  const data = getMockSystemData(organizationId)
  const ponds: ScenePondObject[] = data.pondProfiles.map((pond, index) => ({
    organizationId,
    pondId: pond.pondId,
    x: 18 + (index % 3) * 26,
    y: 0,
    z: 18 + Math.floor(index / 3) * 24,
    width: 18,
    length: 12,
    rotationY: 0,
  }))
  const robots: SceneRobotObject[] = data.robots.map((robot, index) => ({
    organizationId,
    pondId: robot.pondId,
    robotId: robot.id,
    x: 20 + (index % 3) * 24,
    y: 0,
    z: 22 + Math.floor(index / 3) * 20,
    heading: 90,
  }))

  return {
    organizationId,
    camera: createEmptySceneConfig(organizationId).camera,
    farmModel: {
      organizationId,
      modelUrl: '/mock-models/farm.glb',
      scale: 1,
    },
    robotModel: {
      organizationId,
      modelUrl: '/mock-models/feeding-robot.glb',
      scale: 1,
    },
    ponds,
    robots,
    routes: robots.map((robot) => ({
      organizationId,
      robotId: robot.robotId,
      visible: true,
      color: '#5bd6ff',
      width: 2,
    })),
  }
}

export async function getSceneConfig(organizationId: string): Promise<SceneConfig> {
  if (!isSupabaseMode) {
    const configs = readSceneMap()
    return Promise.resolve(configs[organizationId] ?? createMockSceneConfig(organizationId))
  }

  void API_ENDPOINTS.files.getSceneConfig
  const { data, error } = await supabase
    .from('scene_configs')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    throwSupabaseError(error, '读取 3D 场景配置失败')
  }

  return data ? mapSceneConfigRow(data) : createEmptySceneConfig(organizationId)
}

export async function saveSceneConfig(
  organizationId: string,
  config: SceneConfig,
): Promise<SceneConfig> {
  if (!isSupabaseMode) {
    const configs = readSceneMap()
    configs[organizationId] = { ...config, organizationId }
    writeSceneMap(configs)
    return Promise.resolve(configs[organizationId]!)
  }

  const row: Inserts<'scene_configs'> = {
    organization_id: organizationId,
    camera: toJson(config.camera),
    farm_model: toJson(config.farmModel ?? null),
    robot_model: toJson(config.robotModel ?? null),
    ponds: toJson(config.ponds),
    robots: toJson(config.robots),
    routes: toJson(config.routes),
  }
  const { data, error } = await supabase
    .from('scene_configs')
    .upsert(row, { onConflict: 'organization_id' })
    .select('*')
    .single()

  if (error) {
    throwSupabaseError(error, '保存 3D 场景配置失败')
  }

  return mapSceneConfigRow(data)
}

export async function getFarmModelUrl(organizationId: string): Promise<string> {
  const config = await getSceneConfig(organizationId)
  return Promise.resolve(config.farmModel?.modelUrl ?? '')
}

export async function getRobotModelUrl(organizationId: string): Promise<string> {
  const config = await getSceneConfig(organizationId)
  return Promise.resolve(config.robotModel?.modelUrl ?? '')
}

export async function savePondScenePosition(
  organizationId: string,
  pondId: string,
  position: Partial<ScenePondObject>,
): Promise<ScenePondObject> {
  const resolvedPondId = isSupabaseMode ? await resolvePondUuid(organizationId, pondId) : pondId
  const config = await getSceneConfig(organizationId)
  const current = config.ponds.find((pond) => pond.pondId === resolvedPondId)
  const next: ScenePondObject = {
    organizationId,
    pondId: resolvedPondId,
    x: position.x ?? current?.x ?? 0,
    y: position.y ?? current?.y ?? 0,
    z: position.z ?? current?.z ?? 0,
    width: position.width ?? current?.width ?? 18,
    length: position.length ?? current?.length ?? 12,
    rotationY: position.rotationY ?? current?.rotationY ?? 0,
  }
  config.ponds = [next, ...config.ponds.filter((pond) => pond.pondId !== resolvedPondId)]
  await saveSceneConfig(organizationId, config)
  return Promise.resolve(next)
}

export async function saveRobotScenePosition(
  organizationId: string,
  robotId: string,
  position: Partial<SceneRobotObject>,
): Promise<SceneRobotObject> {
  const resolvedRobotId = isSupabaseMode ? await resolveRobotUuid(organizationId, robotId) : robotId
  const resolvedPondId =
    isSupabaseMode && position.pondId
      ? await resolvePondUuid(organizationId, position.pondId)
      : position.pondId
  const config = await getSceneConfig(organizationId)
  const current = config.robots.find((robot) => robot.robotId === resolvedRobotId)
  const next: SceneRobotObject = {
    organizationId,
    pondId: resolvedPondId ?? current?.pondId,
    robotId: resolvedRobotId,
    x: position.x ?? current?.x ?? 0,
    y: position.y ?? current?.y ?? 0,
    z: position.z ?? current?.z ?? 0,
    heading: position.heading ?? current?.heading ?? 0,
    modelUrl: position.modelUrl ?? current?.modelUrl,
  }
  config.robots = [next, ...config.robots.filter((robot) => robot.robotId !== resolvedRobotId)]
  await saveSceneConfig(organizationId, config)
  return Promise.resolve(next)
}

export async function getRobotScenePosition(
  organizationId: string,
  robotId: string,
): Promise<SceneRobotObject> {
  const resolvedRobotId = isSupabaseMode ? await resolveRobotUuid(organizationId, robotId) : robotId
  const config = await getSceneConfig(organizationId)
  return Promise.resolve(
    config.robots.find((robot) => robot.robotId === resolvedRobotId) ??
      (await saveRobotScenePosition(organizationId, resolvedRobotId, {})),
  )
}

export async function loadSceneModels(organizationId: string): Promise<SceneModel[]> {
  // TODO: 后续读取 Supabase Storage 中的 glb/gltf 模型文件和 scene_models 表。
  const config = await getSceneConfig(organizationId)
  const models: SceneModel[] = []

  if (config.farmModel?.modelUrl) {
    models.push({
      id: `scene-model-farm-${organizationId}`,
      organizationId,
      name: '养殖场模型',
      type: 'farm',
      url: config.farmModel.modelUrl,
      uploadedAt: new Date().toISOString(),
    })
  }

  if (config.robotModel?.modelUrl) {
    models.push({
      id: `scene-model-robot-${organizationId}`,
      organizationId,
      name: '投喂机器人模型',
      type: 'robot',
      url: config.robotModel.modelUrl,
      uploadedAt: new Date().toISOString(),
    })
  }

  return Promise.resolve(models)
}
