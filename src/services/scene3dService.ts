import { API_ENDPOINTS } from '@/constants/apiEndpoints'
import { getMockSystemData } from '@/services/mockDataService'
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
    camera: {
      x: 54,
      y: 56,
      z: 82,
      targetX: 46,
      targetY: 0,
      targetZ: 34,
    },
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
  // TODO: 后续调用 API_ENDPOINTS.files.getSceneConfig 或读取 scene_configs。
  void API_ENDPOINTS.files.getSceneConfig
  const configs = readSceneMap()
  return Promise.resolve(configs[organizationId] ?? createMockSceneConfig(organizationId))
}

export async function saveSceneConfig(
  organizationId: string,
  config: SceneConfig,
): Promise<SceneConfig> {
  // TODO: 后续保存 scene_configs、scene_pond_objects、scene_robot_objects。
  const configs = readSceneMap()
  configs[organizationId] = { ...config, organizationId }
  writeSceneMap(configs)
  return Promise.resolve(configs[organizationId]!)
}

export async function getFarmModelUrl(organizationId: string): Promise<string> {
  const config = await getSceneConfig(organizationId)
  return Promise.resolve(config.farmModel?.modelUrl ?? '/mock-models/farm.glb')
}

export async function getRobotModelUrl(organizationId: string): Promise<string> {
  const config = await getSceneConfig(organizationId)
  return Promise.resolve(config.robotModel?.modelUrl ?? '/mock-models/feeding-robot.glb')
}

export async function savePondScenePosition(
  organizationId: string,
  pondId: string,
  position: Partial<ScenePondObject>,
): Promise<ScenePondObject> {
  const config = await getSceneConfig(organizationId)
  const current = config.ponds.find((pond) => pond.pondId === pondId)
  const next: ScenePondObject = {
    organizationId,
    pondId,
    x: position.x ?? current?.x ?? 0,
    y: position.y ?? current?.y ?? 0,
    z: position.z ?? current?.z ?? 0,
    width: position.width ?? current?.width ?? 18,
    length: position.length ?? current?.length ?? 12,
    rotationY: position.rotationY ?? current?.rotationY ?? 0,
  }
  config.ponds = [next, ...config.ponds.filter((pond) => pond.pondId !== pondId)]
  await saveSceneConfig(organizationId, config)
  return Promise.resolve(next)
}

export async function saveRobotScenePosition(
  organizationId: string,
  robotId: string,
  position: Partial<SceneRobotObject>,
): Promise<SceneRobotObject> {
  const config = await getSceneConfig(organizationId)
  const current = config.robots.find((robot) => robot.robotId === robotId)
  const next: SceneRobotObject = {
    organizationId,
    pondId: position.pondId ?? current?.pondId,
    robotId,
    x: position.x ?? current?.x ?? 0,
    y: position.y ?? current?.y ?? 0,
    z: position.z ?? current?.z ?? 0,
    heading: position.heading ?? current?.heading ?? 0,
    modelUrl: position.modelUrl ?? current?.modelUrl,
  }
  config.robots = [next, ...config.robots.filter((robot) => robot.robotId !== robotId)]
  await saveSceneConfig(organizationId, config)
  return Promise.resolve(next)
}

export async function getRobotScenePosition(
  organizationId: string,
  robotId: string,
): Promise<SceneRobotObject> {
  const config = await getSceneConfig(organizationId)
  return Promise.resolve(
    config.robots.find((robot) => robot.robotId === robotId) ??
      (await saveRobotScenePosition(organizationId, robotId, {})),
  )
}

export async function loadSceneModels(organizationId: string): Promise<SceneModel[]> {
  // TODO: 后续读取 Supabase Storage 中的 glb/gltf 模型文件和 scene_models 表。
  return Promise.resolve([
    {
      id: `scene-model-farm-${organizationId}`,
      organizationId,
      name: '养殖场 mock 模型',
      type: 'farm',
      url: await getFarmModelUrl(organizationId),
      uploadedAt: new Date().toISOString(),
    },
    {
      id: `scene-model-robot-${organizationId}`,
      organizationId,
      name: '投喂机器人 mock 模型',
      type: 'robot',
      url: await getRobotModelUrl(organizationId),
      uploadedAt: new Date().toISOString(),
    },
  ])
}
