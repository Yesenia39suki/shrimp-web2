import type { SceneConfig } from '@/types/scene3d'
import type { SceneConfigRow } from '@/types/database'

const defaultCamera = {
  x: 54,
  y: 56,
  z: 82,
  targetX: 46,
  targetY: 0,
  targetZ: 34,
}

export function mapSceneConfigRow(row: SceneConfigRow): SceneConfig {
  return {
    organizationId: row.organization_id,
    camera:
      typeof row.camera === 'object' && row.camera !== null && !Array.isArray(row.camera)
        ? { ...defaultCamera, ...row.camera }
        : defaultCamera,
    farmModel:
      typeof row.farm_model === 'object' && row.farm_model !== null && !Array.isArray(row.farm_model)
        ? ({ organizationId: row.organization_id, ...row.farm_model } as SceneConfig['farmModel'])
        : undefined,
    robotModel:
      typeof row.robot_model === 'object' &&
      row.robot_model !== null &&
      !Array.isArray(row.robot_model)
        ? ({ organizationId: row.organization_id, ...row.robot_model } as SceneConfig['robotModel'])
        : undefined,
    ponds: Array.isArray(row.ponds) ? (row.ponds as unknown as SceneConfig['ponds']) : [],
    robots: Array.isArray(row.robots) ? (row.robots as unknown as SceneConfig['robots']) : [],
    routes: Array.isArray(row.routes) ? (row.routes as unknown as SceneConfig['routes']) : [],
  }
}
