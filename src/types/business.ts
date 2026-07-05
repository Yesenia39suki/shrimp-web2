export type UserRole = 'owner' | 'admin' | 'operator' | 'viewer'
export type OrganizationRole = UserRole

export interface TimeRange {
  startAt: string
  endAt: string
}

export interface UserProfile {
  id: string
  display_name: string
  email: string
  phone?: string
  avatar_url?: string
  created_at?: string
  updated_at?: string
}

export interface Organization {
  id: string
  name: string
  short_name: string
  region: string
  status: string
  owner_user_id?: string
  created_at?: string
  updated_at?: string
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: OrganizationRole
  display_name?: string
  email?: string
  joined_at?: string
}

export interface Pond {
  id: string
  organization_id: string
  pond_code: string
  pond_name: string
  shrimp_species: string
  area: number
  water_depth: number
  location: string
  map_position?: PondMapPosition
  scene_position?: PondScenePosition
  created_at?: string
  updated_at?: string
}

export interface PondMapPosition {
  organization_id: string
  pond_id: string
  longitude: number
  latitude: number
  label?: string
}

export interface PondScenePosition {
  organization_id: string
  pond_id: string
  x: number
  y: number
  z: number
  width?: number
  length?: number
  rotationY?: number
}

export interface ThresholdRange {
  min: number
  max: number
}

export interface WaterThreshold {
  id: string
  organization_id: string
  pond_id?: string
  temperature: ThresholdRange
  oxygen: ThresholdRange
  ph: ThresholdRange
  orp: ThresholdRange
  turbidity: ThresholdRange
  ammonia: ThresholdRange
  nitrite: ThresholdRange
  hardness: ThresholdRange
}

export type WaterThresholdMetricKey = Exclude<
  keyof WaterThreshold,
  'id' | 'organization_id' | 'pond_id'
>

export interface Robot {
  id: string
  organization_id: string
  pond_id: string
  robot_code: string
  robot_name: string
  robot_type: string
  status?: string
  created_at?: string
  updated_at?: string
}

export interface RobotBinding {
  id: string
  organization_id: string
  pond_id: string
  robot_id: string
  bound_at: string
  unbound_at?: string
  active: boolean
}

export interface BusinessConfig {
  organization_id: string
  pond: Pond
  robot: Robot
  waterThreshold: WaterThreshold
}
