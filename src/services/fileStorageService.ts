import { API_ENDPOINTS } from '@/constants/apiEndpoints'
import type { ModelUploadResult } from '@/types/scene3d'

function mockUploadResult(organizationId: string, folder: string, file: File): ModelUploadResult {
  const safeName = file.name.replace(/\s+/g, '-')
  const path = `${organizationId}/${folder}/${Date.now()}-${safeName}`

  return {
    organizationId,
    path,
    url: `/mock-storage/${path}`,
    modelId: `file-${Date.now()}`,
  }
}

export async function uploadFarmModel(
  organizationId: string,
  file: File,
): Promise<ModelUploadResult> {
  // TODO: 后续调用 API_ENDPOINTS.files.uploadSceneModel，上传 glb/gltf 到 Supabase Storage。
  void API_ENDPOINTS.files.uploadSceneModel
  return Promise.resolve(mockUploadResult(organizationId, 'farm-models', file))
}

export async function uploadRobotModel(
  organizationId: string,
  file: File,
): Promise<ModelUploadResult> {
  // TODO: 后续调用 API_ENDPOINTS.files.uploadRobotModel。
  void API_ENDPOINTS.files.uploadRobotModel
  return Promise.resolve(mockUploadResult(organizationId, 'robot-models', file))
}

export async function uploadPondImage(
  organizationId: string,
  pondId: string,
  file: File,
): Promise<ModelUploadResult> {
  // TODO: 后续用于池塘底图、巡检图片或报告图片。
  return Promise.resolve(mockUploadResult(organizationId, `ponds/${pondId}`, file))
}

export async function uploadShrimpImage(
  organizationId: string,
  pondId: string,
  file: File,
): Promise<ModelUploadResult> {
  // TODO: 后续用于虾体识别图片，识别流程必须在后端处理。
  return Promise.resolve(mockUploadResult(organizationId, `shrimp-images/${pondId}`, file))
}

export async function getFileUrl(path: string): Promise<string> {
  // TODO: 后续改成后端签名 URL 或公开文件 URL。
  return Promise.resolve(path.startsWith('/mock-storage/') ? path : `/mock-storage/${path}`)
}

export async function deleteFile(path: string): Promise<boolean> {
  // TODO: 后续删除 Supabase Storage 文件并写 audit_logs。
  void path
  return Promise.resolve(true)
}
