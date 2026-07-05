export interface SceneModel {
  id: string
  organizationId: string
  name: string
  type: 'farm' | 'robot' | 'pond' | 'device'
  url: string
  uploadedAt: string
}

export interface SceneCameraConfig {
  x: number
  y: number
  z: number
  targetX: number
  targetY: number
  targetZ: number
}

export interface ScenePondObject {
  organizationId: string
  pondId: string
  x: number
  y: number
  z: number
  width: number
  length: number
  rotationY: number
}

export interface SceneRobotObject {
  organizationId: string
  pondId?: string
  robotId: string
  x: number
  y: number
  z: number
  heading: number
  modelUrl?: string
}

export interface SceneRouteConfig {
  organizationId: string
  robotId: string
  visible: boolean
  color: string
  width: number
}

export interface FarmModelConfig {
  organizationId: string
  modelUrl: string
  scale: number
}

export interface RobotModelConfig {
  organizationId: string
  robotId?: string
  modelUrl: string
  scale: number
}

export interface SceneConfig {
  organizationId: string
  camera: SceneCameraConfig
  farmModel?: FarmModelConfig
  robotModel?: RobotModelConfig
  ponds: ScenePondObject[]
  robots: SceneRobotObject[]
  routes: SceneRouteConfig[]
}

export interface ModelUploadResult {
  organizationId: string
  path: string
  url: string
  modelId?: string
}
