export type OrganizationRole = 'owner' | 'admin' | 'operator' | 'viewer'

export interface UserProfile {
  id: string
  display_name: string
  email: string
}

export interface Organization {
  id: string
  name: string
  short_name: string
  region: string
  status: string
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: OrganizationRole
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
}

export interface ThresholdRange {
  min: number
  max: number
}

export interface WaterThreshold {
  id: string
  organization_id: string
  temperature: ThresholdRange
  oxygen: ThresholdRange
  ph: ThresholdRange
  orp: ThresholdRange
  turbidity: ThresholdRange
  ammonia: ThresholdRange
  nitrite: ThresholdRange
  hardness: ThresholdRange
}

export type WaterThresholdMetricKey = Exclude<keyof WaterThreshold, 'id' | 'organization_id'>

export interface Robot {
  id: string
  organization_id: string
  pond_id: string
  robot_code: string
  robot_name: string
  robot_type: string
}

export interface BusinessConfig {
  organization_id: string
  pond: Pond
  robot: Robot
  waterThreshold: WaterThreshold
}
