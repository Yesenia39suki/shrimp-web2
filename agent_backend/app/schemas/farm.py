"""养殖场概览工具使用的数据结构。"""

from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.pond import PondResponse

RiskLevel = Literal["低风险", "关注", "预警", "高风险", "数据不足"]
MetricStatus = Literal["正常", "偏低", "偏高", "缺失", "未配置"]
AlertLevel = Literal["info", "warning", "critical"]
AlertReadStatus = Literal["unread", "read", "resolved"]
WaterDailyStatus = Literal["稳定", "关注", "预警"]
DeviceType = Literal["water_sensor", "gateway", "robot", "camera", "aerator", "feeder"]
DeviceStatus = Literal["online", "offline", "warning", "fault", "maintenance"]
RobotWorkMode = Literal["standby", "feeding", "patrol", "manual", "charging", "fault"]


class WaterLatestSnapshot(BaseModel):
    """Supabase water_latest 的只读快照。"""

    organization_id: UUID
    pond_id: UUID
    reading_id: UUID | None = None
    temperature: Decimal | None = None
    dissolved_oxygen: Decimal | None = None
    ph: Decimal | None = None
    orp: Decimal | None = None
    turbidity: Decimal | None = None
    ammonia: Decimal | None = None
    nitrite: Decimal | None = None
    hardness: Decimal | None = None
    recorded_at: datetime
    updated_at: datetime


class WaterThresholdSnapshot(BaseModel):
    """Supabase water_thresholds 的只读快照。"""

    organization_id: UUID
    pond_id: UUID
    temperature_min: Decimal
    temperature_max: Decimal
    dissolved_oxygen_min: Decimal
    dissolved_oxygen_max: Decimal
    ph_min: Decimal
    ph_max: Decimal
    orp_min: Decimal
    orp_max: Decimal
    turbidity_min: Decimal
    turbidity_max: Decimal
    ammonia_min: Decimal
    ammonia_max: Decimal
    nitrite_min: Decimal
    nitrite_max: Decimal
    hardness_min: Decimal
    hardness_max: Decimal


class WaterDailySnapshot(BaseModel):
    """当前用户经 RLS 可读取的单日水质统计。"""

    organization_id: UUID
    pond_id: UUID
    stat_date: date
    avg_temperature: Decimal | None = None
    min_temperature: Decimal | None = None
    max_temperature: Decimal | None = None
    avg_dissolved_oxygen: Decimal | None = None
    min_dissolved_oxygen: Decimal | None = None
    max_dissolved_oxygen: Decimal | None = None
    avg_ph: Decimal | None = None
    min_ph: Decimal | None = None
    max_ph: Decimal | None = None
    max_ammonia: Decimal | None = None
    max_nitrite: Decimal | None = None
    warning_count: int = Field(ge=0)
    reading_count: int = Field(ge=0)
    status: WaterDailyStatus


class WaterDailyPoint(BaseModel):
    """移除组织与池塘标识后，对外返回的单日水质点。"""

    stat_date: date
    avg_temperature: Decimal | None = None
    min_temperature: Decimal | None = None
    max_temperature: Decimal | None = None
    avg_dissolved_oxygen: Decimal | None = None
    min_dissolved_oxygen: Decimal | None = None
    max_dissolved_oxygen: Decimal | None = None
    avg_ph: Decimal | None = None
    min_ph: Decimal | None = None
    max_ph: Decimal | None = None
    max_ammonia: Decimal | None = None
    max_nitrite: Decimal | None = None
    warning_count: int = Field(ge=0)
    reading_count: int = Field(ge=0)
    status: WaterDailyStatus


class RecentWaterSummary(BaseModel):
    """后端按固定 7 日窗口整理的水质趋势上下文。"""

    period_start: date
    period_end: date
    days_with_records: int = Field(ge=0)
    total_readings: int = Field(ge=0)
    total_warnings: int = Field(ge=0)
    latest_stat_date: date
    latest_status: WaterDailyStatus
    temperature_change: Decimal | None = None
    dissolved_oxygen_change: Decimal | None = None
    ph_change: Decimal | None = None
    daily: list[WaterDailyPoint]


class ActiveAlertSnapshot(BaseModel):
    """尚未解决、且当前用户通过 RLS 可以读取的报警。"""

    id: UUID
    organization_id: UUID
    pond_id: UUID | None = None
    type: str
    level: AlertLevel
    title: str
    content: str
    metric_key: str | None = None
    current_value: str | None = None
    normal_range: str | None = None
    suggestion: str | None = None
    source: str | None = None
    read_status: AlertReadStatus
    created_at: datetime


class ShrimpLatestSnapshot(BaseModel):
    """当前用户经 RLS 可读取的池塘最新虾群日统计。"""

    organization_id: UUID
    pond_id: UUID
    stat_date: date
    avg_length_cm: Decimal | None = None
    avg_weight_g: Decimal | None = None
    sample_count: int = Field(ge=0)
    estimated_count: int | None = Field(default=None, ge=0)
    estimated_yield_kg: Decimal | None = Field(default=None, ge=0)
    maturity_percent: Decimal | None = Field(default=None, ge=0, le=100)
    updated_at: datetime


class FeedingDailySnapshot(BaseModel):
    """当前用户经 RLS 可读取的单日投喂统计。"""

    organization_id: UUID
    pond_id: UUID
    stat_date: date
    total_feed_kg: Decimal = Field(ge=0)
    feeding_count: int = Field(ge=0)
    robot_feeding_count: int = Field(ge=0)
    manual_feeding_count: int = Field(ge=0)


class RecentFeedingSummary(BaseModel):
    """后端按固定窗口汇总的最近投喂情况。"""

    period_start: date
    period_end: date
    days_with_records: int = Field(ge=0)
    total_feed_kg: Decimal = Field(ge=0)
    feeding_count: int = Field(ge=0)
    robot_feeding_count: int = Field(ge=0)
    manual_feeding_count: int = Field(ge=0)
    average_per_recorded_day_kg: Decimal = Field(ge=0)
    average_per_feeding_kg: Decimal | None = Field(default=None, ge=0)
    latest_feeding_date: date


class DeviceSnapshot(BaseModel):
    """池塘绑定设备的受控只读状态。"""

    organization_id: UUID
    pond_id: UUID | None = None
    type: DeviceType
    status: DeviceStatus
    last_heartbeat_at: datetime | None = None
    updated_at: datetime


class RobotStatusSnapshot(BaseModel):
    """池塘机器人当前运行状态的受控只读快照。"""

    organization_id: UUID
    pond_id: UUID
    online: bool
    work_mode: RobotWorkMode
    battery: Decimal = Field(ge=0, le=100)
    speed: Decimal = Field(ge=0)
    fault_code: str | None = None
    updated_at: datetime


class PondEquipmentSummary(BaseModel):
    """不包含设备主键和名称的池塘设备汇总。"""

    device_count: int = Field(ge=0)
    device_type_counts: dict[DeviceType, int]
    device_status_counts: dict[DeviceStatus, int]
    latest_device_heartbeat_at: datetime | None = None
    heartbeat_tracked_device_count: int = Field(default=0, ge=0)
    lost_connection_device_count: int = Field(default=0, ge=0)
    unknown_heartbeat_device_count: int = Field(default=0, ge=0)
    heartbeat_stale_after_minutes: int = Field(default=30, ge=1)
    robot_status_count: int = Field(ge=0)
    online_robot_count: int = Field(ge=0)
    fault_robot_count: int = Field(ge=0)
    robot_work_mode_counts: dict[RobotWorkMode, int]
    minimum_robot_battery: Decimal | None = Field(default=None, ge=0, le=100)
    latest_robot_status_at: datetime | None = None
    requires_attention: bool


class WaterMetricAssessment(BaseModel):
    """单项水质指标及其阈值判断结果。"""

    key: str
    label: str
    unit: str
    value: Decimal | None
    minimum: Decimal | None
    maximum: Decimal | None
    status: MetricStatus


class PondRiskAssessment(BaseModel):
    """规则引擎生成的单池基础风险。"""

    risk_score: int | None = Field(ge=0, le=100)
    risk_level: RiskLevel
    water_risk_score: int | None = Field(ge=0, le=100)
    alert_risk_score: int = Field(ge=0, le=100)
    requires_attention: bool
    data_complete: bool
    water_data_stale: bool = False
    water_age_hours: Decimal | None = Field(default=None, ge=0)
    water_stale_after_hours: int = Field(default=24, ge=1)
    abnormal_metrics: list[str]
    missing_metrics: list[str]
    active_alert_count: int = Field(ge=0)
    highest_alert_level: AlertLevel | None = None
    reasons: list[str]


class PondOverview(BaseModel):
    """一个池塘的统一业务上下文。"""

    pond: PondResponse
    latest_water: WaterLatestSnapshot | None
    recent_water: RecentWaterSummary | None = None
    latest_shrimp: ShrimpLatestSnapshot | None = None
    recent_feeding: RecentFeedingSummary | None = None
    equipment: PondEquipmentSummary | None = None
    metrics: list[WaterMetricAssessment]
    active_alerts: list[ActiveAlertSnapshot]
    risk: PondRiskAssessment
    summary: str


class FarmOverviewResponse(BaseModel):
    """farm_get_overview 的结构化返回值。"""

    generated_at: datetime
    organization_ids: list[UUID]
    total_ponds: int = Field(ge=0)
    attention_ponds: int = Field(ge=0)
    normal_ponds: int = Field(ge=0)
    data_insufficient_ponds: int = Field(ge=0)
    water_trend_data_ponds: int = Field(default=0, ge=0)
    shrimp_data_ponds: int = Field(default=0, ge=0)
    feeding_data_ponds: int = Field(default=0, ge=0)
    equipment_data_ponds: int = Field(default=0, ge=0)
    lost_connection_devices: int = Field(default=0, ge=0)
    unknown_heartbeat_devices: int = Field(default=0, ge=0)
    ponds: list[PondOverview]
    global_alerts: list[ActiveAlertSnapshot]


class SinglePondOverviewResponse(BaseModel):
    """从当前用户 RLS 可见范围中选出的单池概览。"""

    generated_at: datetime
    pond: PondOverview
