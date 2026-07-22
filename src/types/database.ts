export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type DbUserRole = 'owner' | 'admin' | 'operator' | 'viewer'
export type DbAlertLevel = 'info' | 'warning' | 'critical'
export type DbAlertStatus = 'unread' | 'read' | 'resolved'
export type DbAlertType = 'water_quality' | 'robot_fault' | 'feeding' | 'growth' | 'device' | 'ai'
export type DbDeviceType = 'water_sensor' | 'gateway' | 'robot' | 'camera' | 'aerator' | 'feeder'
export type DbDeviceStatus = 'online' | 'offline' | 'warning' | 'fault' | 'maintenance'
export type DbFeedingMode = 'manual' | 'scheduled' | 'ai_advice' | 'emergency'
export type DbAiProvider = 'rule_engine' | 'openai' | 'deepseek' | 'local_model' | 'hybrid'
export type DbRobotWorkMode = 'standby' | 'feeding' | 'patrol' | 'manual' | 'charging' | 'fault'
export type DbRobotCommandType =
  | 'feed'
  | 'stop'
  | 'return_home'
  | 'patrol'
  | 'pause'
  | 'resume'
  | 'manual_move'
  | 'calibrate'
  | 'charge'
export type DbRobotCommandStatus = 'pending' | 'sent' | 'running' | 'success' | 'failed' | 'cancelled'
export type DbRiskLevel = '低风险' | '关注' | '预警' | '高风险'

type GeneratedColumns = 'id' | 'created_at' | 'updated_at'
type InsertFromRow<TRow, TGenerated extends keyof TRow = never> = Omit<TRow, TGenerated> &
  Partial<Pick<TRow, TGenerated>>
type UpdateFromRow<TRow> = Partial<TRow>
type TableDef<TRow, TInsert = TRow, TUpdate = Partial<TRow>> = {
  Row: TRow & Record<string, unknown>
  Insert: TInsert & Record<string, unknown>
  Update: TUpdate & Record<string, unknown>
  Relationships: []
}

export interface ProfileRow {
  id: string
  display_name: string
  email: string
  phone: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface OrganizationRow {
  id: string
  name: string
  short_name: string
  region: string
  status: string
  owner_user_id: string | null
  created_at: string
  updated_at: string
}

export interface OrganizationMemberRow {
  id: string
  organization_id: string
  user_id: string
  role: DbUserRole
  joined_at: string
  created_at: string
  updated_at: string
}

export interface PondRow {
  id: string
  organization_id: string
  pond_code: string
  pond_name: string
  shrimp_species: string
  area_mu: number
  water_depth_m: number
  location: string
  longitude: number | null
  latitude: number | null
  created_at: string
  updated_at: string
}

export interface RobotRow {
  id: string
  organization_id: string
  pond_id: string
  robot_code: string
  robot_name: string
  robot_type: string
  status: string
  created_at: string
  updated_at: string
}

export interface WaterThresholdRow {
  id: string
  organization_id: string
  pond_id: string
  temperature_min: number
  temperature_max: number
  dissolved_oxygen_min: number
  dissolved_oxygen_max: number
  ph_min: number
  ph_max: number
  orp_min: number
  orp_max: number
  turbidity_min: number
  turbidity_max: number
  ammonia_min: number
  ammonia_max: number
  nitrite_min: number
  nitrite_max: number
  hardness_min: number
  hardness_max: number
  created_at: string
  updated_at: string
}

export interface DeviceRow {
  id: string
  organization_id: string
  pond_id: string | null
  robot_id: string | null
  name: string
  type: DbDeviceType
  status: DbDeviceStatus
  firmware_version: string | null
  last_heartbeat_at: string | null
  created_at: string
  updated_at: string
}

export interface WaterReadingRow {
  id: string
  organization_id: string
  pond_id: string
  device_id: string | null
  temperature: number | null
  dissolved_oxygen: number | null
  ph: number | null
  orp: number | null
  turbidity: number | null
  ammonia: number | null
  nitrite: number | null
  hardness: number | null
  recorded_at: string
  created_at: string
}

export interface WaterLatestRow {
  organization_id: string
  pond_id: string
  reading_id: string | null
  temperature: number | null
  dissolved_oxygen: number | null
  ph: number | null
  orp: number | null
  turbidity: number | null
  ammonia: number | null
  nitrite: number | null
  hardness: number | null
  recorded_at: string
  updated_at: string
}

export interface WaterDailyStatsRow {
  id: string
  organization_id: string
  pond_id: string
  stat_date: string
  avg_temperature: number | null
  min_temperature: number | null
  max_temperature: number | null
  avg_dissolved_oxygen: number | null
  min_dissolved_oxygen: number | null
  max_dissolved_oxygen: number | null
  avg_ph: number | null
  min_ph: number | null
  max_ph: number | null
  max_ammonia: number | null
  max_nitrite: number | null
  warning_count: number
  reading_count: number
  status: '稳定' | '关注' | '预警'
  created_at: string
  updated_at: string
}

export interface FeedingRecordRow {
  id: string
  organization_id: string
  pond_id: string
  robot_id: string | null
  feed_amount_kg: number
  mode: DbFeedingMode
  advice_source: DbAiProvider | 'manual' | null
  executed_at: string
  remark: string | null
  created_at: string
}

export interface FeedingDailyStatsRow {
  id: string
  organization_id: string
  pond_id: string
  stat_date: string
  total_feed_kg: number
  feeding_count: number
  robot_feeding_count: number
  manual_feeding_count: number
  created_at: string
  updated_at: string
}

export interface ShrimpMeasurementRow {
  id: string
  organization_id: string
  pond_id: string
  average_length_cm: number
  average_weight_g: number
  sample_count: number
  measured_at: string
  source: 'manual' | 'app' | 'image_ai'
  created_at: string
}

export interface ShrimpDailyStatsRow {
  id: string
  organization_id: string
  pond_id: string
  stat_date: string
  avg_length_cm: number | null
  avg_weight_g: number | null
  sample_count: number
  estimated_count: number | null
  estimated_yield_kg: number | null
  maturity_percent: number | null
  created_at: string
  updated_at: string
}

export interface AlertRuleRow {
  id: string
  organization_id: string
  pond_id: string | null
  type: DbAlertType
  metric_key: string | null
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'contains'
  threshold_value: string
  level: DbAlertLevel
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface AlertRow {
  id: string
  organization_id: string
  pond_id: string | null
  robot_id: string | null
  type: DbAlertType
  level: DbAlertLevel
  title: string
  content: string
  metric_key: string | null
  current_value: string | null
  normal_range: string | null
  suggestion: string | null
  source: string | null
  read_status: DbAlertStatus
  created_at: string
  updated_at: string
  resolved_at: string | null
}

export interface PondDailySnapshotRow {
  id: string
  organization_id: string
  pond_id: string
  stat_date: string
  water_score: number | null
  total_feed_kg: number | null
  avg_shrimp_length_cm: number | null
  avg_shrimp_weight_g: number | null
  estimated_yield_kg: number | null
  alert_count: number
  robot_running_minutes: number
  ai_risk_level: DbRiskLevel | null
  summary: string | null
  created_at: string
  updated_at: string
}

export interface FeedingPlanRow {
  id: string
  organization_id: string
  pond_id: string
  name: string
  mode: DbFeedingMode
  feed_amount_kg: number
  times: Json
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface FeedingTaskRow {
  id: string
  organization_id: string
  pond_id: string
  plan_id: string | null
  robot_id: string | null
  scheduled_at: string
  feed_amount_kg: number
  status: 'pending' | 'running' | 'done' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface RobotStatusRow {
  id: string
  organization_id: string
  pond_id: string
  robot_id: string
  online: boolean
  work_mode: DbRobotWorkMode
  battery: number
  speed: number
  fault_code: string | null
  updated_at: string
}

export interface RobotPositionRow {
  id: string
  organization_id: string
  pond_id: string | null
  robot_id: string
  x: number
  y: number
  z: number
  heading: number
  speed: number
  battery: number
  status: DbRobotWorkMode
  recorded_at: string
  created_at: string
}

export type RobotPositionLatestRow = Omit<RobotPositionRow, 'id' | 'created_at'> & {
  updated_at: string
}

export interface RobotCommandRow {
  id: string
  organization_id: string
  pond_id: string | null
  robot_id: string
  type: DbRobotCommandType
  status: DbRobotCommandStatus
  payload: Json
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface RobotCommandAckRow {
  id: string
  organization_id: string
  robot_id: string
  command_id: string
  status: DbRobotCommandStatus
  message: string
  acknowledged_at: string
  created_at: string
}

export interface AiModelConfigRow {
  id: string
  organization_id: string
  provider_type: DbAiProvider
  model_name: string
  endpoint_url: string | null
  json_output: boolean
  daily_limit: number
  monthly_usage: number
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface RiskScoreRow {
  id: string
  organization_id: string
  pond_id: string
  water_risk_score: number
  feeding_risk_score: number
  growth_risk_score: number
  robot_risk_score: number
  total_risk_score: number
  risk_level: DbRiskLevel
  calculation_detail: string
  calculated_at: string
  created_at: string
}

export interface AiEvaluationRow {
  id: string
  organization_id: string
  pond_id: string
  provider_type: DbAiProvider
  risk_level: DbRiskLevel
  risk_score: number
  summary: string
  problems: Json
  recommendations: Json
  confidence: number
  need_manual_confirm: boolean
  created_at: string
}

export interface AiFeedingAdviceRow extends AiEvaluationRow {
  recommended_feed_kg: number
  recommended_time: string
  feeding_method: string
}

export interface AiResultFeedbackRow {
  id: string
  organization_id: string
  pond_id: string | null
  result_id: string
  accepted: boolean
  remark: string | null
  created_at: string
}

export interface AiRequestLogRow {
  id: string
  organization_id: string
  pond_id: string | null
  provider_type: DbAiProvider
  endpoint: string
  success: boolean
  error_message: string | null
  duration_ms: number | null
  created_at: string
}

export interface SceneConfigRow {
  id: string
  organization_id: string
  camera: Json
  farm_model: Json | null
  robot_model: Json | null
  ponds: Json
  robots: Json
  routes: Json
  created_at: string
  updated_at: string
}

export interface OperationLogRow {
  id: string
  organization_id: string
  user_id: string | null
  action: string
  target_type: string
  target_id: string | null
  detail: string | null
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<ProfileRow, InsertFromRow<ProfileRow, 'created_at' | 'updated_at'>>
      organizations: TableDef<OrganizationRow, InsertFromRow<OrganizationRow, GeneratedColumns>>
      organization_members: TableDef<
        OrganizationMemberRow,
        InsertFromRow<OrganizationMemberRow, GeneratedColumns>
      >
      ponds: TableDef<PondRow, InsertFromRow<PondRow, GeneratedColumns>>
      robots: TableDef<RobotRow, InsertFromRow<RobotRow, GeneratedColumns>>
      water_thresholds: TableDef<WaterThresholdRow, InsertFromRow<WaterThresholdRow, GeneratedColumns>>
      devices: TableDef<DeviceRow, InsertFromRow<DeviceRow, GeneratedColumns>>
      water_readings: TableDef<WaterReadingRow, InsertFromRow<WaterReadingRow, 'id' | 'created_at'>>
      water_latest: TableDef<WaterLatestRow>
      water_daily_stats: TableDef<WaterDailyStatsRow, InsertFromRow<WaterDailyStatsRow, GeneratedColumns>>
      feeding_records: TableDef<FeedingRecordRow, InsertFromRow<FeedingRecordRow, 'id' | 'created_at'>>
      feeding_daily_stats: TableDef<FeedingDailyStatsRow, InsertFromRow<FeedingDailyStatsRow, GeneratedColumns>>
      shrimp_measurements: TableDef<
        ShrimpMeasurementRow,
        InsertFromRow<ShrimpMeasurementRow, 'id' | 'created_at'>
      >
      shrimp_daily_stats: TableDef<ShrimpDailyStatsRow, InsertFromRow<ShrimpDailyStatsRow, GeneratedColumns>>
      alert_rules: TableDef<AlertRuleRow, InsertFromRow<AlertRuleRow, GeneratedColumns>>
      alerts: TableDef<AlertRow, InsertFromRow<AlertRow, GeneratedColumns>>
      pond_daily_snapshots: TableDef<
        PondDailySnapshotRow,
        InsertFromRow<PondDailySnapshotRow, GeneratedColumns>
      >
      feeding_plans: TableDef<FeedingPlanRow, InsertFromRow<FeedingPlanRow, GeneratedColumns>>
      feeding_tasks: TableDef<FeedingTaskRow, InsertFromRow<FeedingTaskRow, GeneratedColumns>>
      robot_status: TableDef<RobotStatusRow, InsertFromRow<RobotStatusRow, 'id' | 'updated_at'>>
      robot_position_latest: TableDef<RobotPositionLatestRow>
      robot_position_history: TableDef<
        RobotPositionRow,
        InsertFromRow<RobotPositionRow, 'id' | 'created_at'>
      >
      robot_commands: TableDef<RobotCommandRow, InsertFromRow<RobotCommandRow, GeneratedColumns>>
      robot_command_acks: TableDef<
        RobotCommandAckRow,
        InsertFromRow<RobotCommandAckRow, 'id' | 'created_at'>
      >
      ai_model_configs: TableDef<AiModelConfigRow, InsertFromRow<AiModelConfigRow, GeneratedColumns>>
      risk_scores: TableDef<RiskScoreRow, InsertFromRow<RiskScoreRow, 'id' | 'created_at'>>
      ai_evaluations: TableDef<AiEvaluationRow, InsertFromRow<AiEvaluationRow, 'id' | 'created_at'>>
      ai_feeding_advices: TableDef<
        AiFeedingAdviceRow,
        InsertFromRow<AiFeedingAdviceRow, 'id' | 'created_at'>
      >
      ai_result_feedback: TableDef<
        AiResultFeedbackRow,
        InsertFromRow<AiResultFeedbackRow, 'id' | 'created_at'>
      >
      ai_request_logs: TableDef<AiRequestLogRow, InsertFromRow<AiRequestLogRow, 'id' | 'created_at'>>
      scene_configs: TableDef<SceneConfigRow, InsertFromRow<SceneConfigRow, GeneratedColumns>>
      operation_logs: TableDef<OperationLogRow, InsertFromRow<OperationLogRow, 'id' | 'created_at'>>
    }
    Views: Record<string, never>
    Functions: {
      ingest_water_reading: {
        Args: {
          p_organization_id: string
          p_pond_id: string
          p_device_id?: string | null
          p_recorded_at?: string | null
          p_temperature?: number | null
          p_dissolved_oxygen?: number | null
          p_ph?: number | null
          p_orp?: number | null
          p_turbidity?: number | null
          p_ammonia?: number | null
          p_nitrite?: number | null
          p_hardness?: number | null
        }
        Returns: Json
      }
      record_feeding: {
        Args: {
          p_organization_id: string
          p_pond_id: string
          p_robot_id?: string | null
          p_feed_amount_kg: number
          p_mode: DbFeedingMode
          p_advice_source?: string | null
          p_executed_at?: string | null
          p_remark?: string | null
        }
        Returns: Json
      }
      record_shrimp_measurement: {
        Args: {
          p_organization_id: string
          p_pond_id: string
          p_average_length_cm: number
          p_average_weight_g: number
          p_sample_count?: number
          p_measured_at?: string | null
          p_source?: string
          p_estimated_count?: number | null
          p_estimated_yield_kg?: number | null
          p_maturity_percent?: number | null
        }
        Returns: Json
      }
      refresh_pond_daily_snapshot: {
        Args: {
          p_organization_id: string
          p_pond_id: string
          p_stat_date?: string | null
        }
        Returns: Json
      }
    }
    Enums: {
      app_user_role: DbUserRole
    }
    CompositeTypes: Record<string, never>
  }
}

export type Tables<TName extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][TName]['Row']

export type Inserts<TName extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][TName]['Insert']

export type Updates<TName extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][TName]['Update']
