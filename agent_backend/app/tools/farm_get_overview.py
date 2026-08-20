"""获取当前用户可见养殖场概览的业务工具。"""

import asyncio
from collections import Counter, defaultdict
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from app.schemas.farm import (
    ActiveAlertSnapshot,
    DeviceSnapshot,
    FeedingDailySnapshot,
    FarmOverviewResponse,
    PondEquipmentSummary,
    PondOverview,
    RecentFeedingSummary,
    RecentWaterSummary,
    RobotStatusSnapshot,
    WaterDailyPoint,
    WaterDailySnapshot,
)
from app.services.risk_engine import assess_pond_risk
from app.services.supabase_gateway import SupabaseGateway

PondKey = tuple[UUID, UUID]
MONEY_QUANTUM = Decimal("0.01")
HOUR_QUANTUM = Decimal("0.01")


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _age_seconds(*, now: datetime, observed_at: datetime) -> int:
    """返回不小于零的整秒年龄，避免未来时间戳产生负值。"""

    elapsed = _as_utc(now) - _as_utc(observed_at)
    return max(0, int(elapsed.total_seconds()))


def _age_hours(*, now: datetime, observed_at: datetime) -> Decimal:
    return (
        Decimal(_age_seconds(now=now, observed_at=observed_at)) / Decimal(3600)
    ).quantize(
        HOUR_QUANTUM,
        rounding=ROUND_HALF_UP,
    )


def _change(first: Decimal | None, latest: Decimal | None) -> Decimal | None:
    if first is None or latest is None:
        return None
    return latest - first


def _summarize_recent_water(
    rows: list[WaterDailySnapshot],
    *,
    period_start: date,
    period_end: date,
) -> RecentWaterSummary | None:
    if not rows:
        return None

    ordered_rows = sorted(rows, key=lambda row: row.stat_date)
    first = ordered_rows[0]
    latest = ordered_rows[-1]
    daily = [
        WaterDailyPoint.model_validate(
            row.model_dump(exclude={"organization_id", "pond_id"})
        )
        for row in ordered_rows
    ]
    return RecentWaterSummary(
        period_start=period_start,
        period_end=period_end,
        days_with_records=len(ordered_rows),
        total_readings=sum(row.reading_count for row in ordered_rows),
        total_warnings=sum(row.warning_count for row in ordered_rows),
        latest_stat_date=latest.stat_date,
        latest_status=latest.status,
        temperature_change=_change(
            first.avg_temperature,
            latest.avg_temperature,
        ),
        dissolved_oxygen_change=_change(
            first.avg_dissolved_oxygen,
            latest.avg_dissolved_oxygen,
        ),
        ph_change=_change(first.avg_ph, latest.avg_ph),
        daily=daily,
    )


def _latest_datetime(values: list[datetime | None]) -> datetime | None:
    present_values = [value for value in values if value is not None]
    return max(present_values) if present_values else None


def _summarize_equipment(
    devices: list[DeviceSnapshot],
    robot_statuses: list[RobotStatusSnapshot],
    *,
    now: datetime,
    heartbeat_stale_after_minutes: int,
) -> PondEquipmentSummary | None:
    if not devices and not robot_statuses:
        return None

    device_type_counts = Counter(device.type for device in devices)
    device_status_counts = Counter(device.status for device in devices)
    robot_work_mode_counts = Counter(
        status.work_mode for status in robot_statuses
    )
    fault_robot_count = sum(
        not status.online
        or status.work_mode == "fault"
        or status.fault_code is not None
        for status in robot_statuses
    )
    batteries = [status.battery for status in robot_statuses]
    attention_device_count = sum(
        count
        for status, count in device_status_counts.items()
        if status != "online"
    )
    tracked_heartbeats = [
        device.last_heartbeat_at
        for device in devices
        if device.last_heartbeat_at is not None
    ]
    heartbeat_stale_after_seconds = heartbeat_stale_after_minutes * 60
    lost_connection_device_count = sum(
        _age_seconds(now=now, observed_at=heartbeat_at)
        > heartbeat_stale_after_seconds
        for heartbeat_at in tracked_heartbeats
    )
    return PondEquipmentSummary(
        device_count=len(devices),
        device_type_counts=dict(device_type_counts),
        device_status_counts=dict(device_status_counts),
        latest_device_heartbeat_at=_latest_datetime(
            [device.last_heartbeat_at for device in devices]
        ),
        heartbeat_tracked_device_count=len(tracked_heartbeats),
        lost_connection_device_count=lost_connection_device_count,
        unknown_heartbeat_device_count=len(devices) - len(tracked_heartbeats),
        heartbeat_stale_after_minutes=heartbeat_stale_after_minutes,
        robot_status_count=len(robot_statuses),
        online_robot_count=sum(status.online for status in robot_statuses),
        fault_robot_count=fault_robot_count,
        robot_work_mode_counts=dict(robot_work_mode_counts),
        minimum_robot_battery=min(batteries) if batteries else None,
        latest_robot_status_at=_latest_datetime(
            [status.updated_at for status in robot_statuses]
        ),
        requires_attention=(
            attention_device_count > 0
            or lost_connection_device_count > 0
            or fault_robot_count > 0
        ),
    )


def _summarize_recent_feeding(
    rows: list[FeedingDailySnapshot],
    *,
    period_start: date,
    period_end: date,
) -> RecentFeedingSummary | None:
    if not rows:
        return None

    total_feed = sum((row.total_feed_kg for row in rows), Decimal("0"))
    feeding_count = sum(row.feeding_count for row in rows)
    return RecentFeedingSummary(
        period_start=period_start,
        period_end=period_end,
        days_with_records=len(rows),
        total_feed_kg=total_feed,
        feeding_count=feeding_count,
        robot_feeding_count=sum(row.robot_feeding_count for row in rows),
        manual_feeding_count=sum(row.manual_feeding_count for row in rows),
        average_per_recorded_day_kg=(total_feed / len(rows)).quantize(
            MONEY_QUANTUM,
            rounding=ROUND_HALF_UP,
        ),
        average_per_feeding_kg=(
            (total_feed / feeding_count).quantize(
                MONEY_QUANTUM,
                rounding=ROUND_HALF_UP,
            )
            if feeding_count
            else None
        ),
        latest_feeding_date=max(row.stat_date for row in rows),
    )


async def farm_get_overview(
    *,
    gateway: SupabaseGateway,
    access_token: str,
    water_stale_after_hours: int = 24,
    device_heartbeat_stale_after_minutes: int = 30,
    now: datetime | None = None,
) -> FarmOverviewResponse:
    """组合 RLS 可见数据；不接收 organization_id，也不调用大模型。"""

    evaluation_time = _as_utc(now or datetime.now(UTC))
    ponds = await gateway.list_accessible_ponds(access_token)
    pond_ids = [pond.id for pond in ponds]
    period_end = evaluation_time.date()
    period_start = period_end - timedelta(days=6)

    (
        latest_rows,
        threshold_rows,
        alert_rows,
        shrimp_rows,
        feeding_rows,
        water_daily_rows,
        device_rows,
        robot_status_rows,
    ) = await asyncio.gather(
        gateway.list_accessible_water_latest(access_token),
        gateway.list_accessible_water_thresholds(access_token),
        gateway.list_accessible_active_alerts(access_token),
        gateway.list_latest_shrimp_daily_stats(access_token, pond_ids),
        gateway.list_accessible_feeding_daily_stats(
            access_token,
            period_start,
            period_end,
            pond_ids,
        ),
        gateway.list_accessible_water_daily_stats(
            access_token,
            period_start,
            period_end,
            pond_ids,
        ),
        gateway.list_accessible_devices(access_token, pond_ids),
        gateway.list_accessible_robot_statuses(access_token, pond_ids),
    )

    pond_keys = {(pond.organization_id, pond.id) for pond in ponds}
    latest_by_pond = {
        (row.organization_id, row.pond_id): row for row in latest_rows
    }
    thresholds_by_pond = {
        (row.organization_id, row.pond_id): row for row in threshold_rows
    }
    shrimp_by_pond = {
        (row.organization_id, row.pond_id): row for row in shrimp_rows
    }
    feeding_by_pond: dict[PondKey, list[FeedingDailySnapshot]] = defaultdict(list)
    for row in feeding_rows:
        key = (row.organization_id, row.pond_id)
        if key in pond_keys:
            feeding_by_pond[key].append(row)
    water_daily_by_pond: dict[PondKey, list[WaterDailySnapshot]] = defaultdict(list)
    for row in water_daily_rows:
        key = (row.organization_id, row.pond_id)
        if key in pond_keys:
            water_daily_by_pond[key].append(row)
    devices_by_pond: dict[PondKey, list[DeviceSnapshot]] = defaultdict(list)
    for row in device_rows:
        if row.pond_id is None:
            continue
        key = (row.organization_id, row.pond_id)
        if key in pond_keys:
            devices_by_pond[key].append(row)
    robot_statuses_by_pond: dict[PondKey, list[RobotStatusSnapshot]] = defaultdict(list)
    for row in robot_status_rows:
        key = (row.organization_id, row.pond_id)
        if key in pond_keys:
            robot_statuses_by_pond[key].append(row)
    alerts_by_pond: dict[PondKey, list[ActiveAlertSnapshot]] = defaultdict(list)
    global_alerts: list[ActiveAlertSnapshot] = []

    for alert in alert_rows:
        key = (alert.organization_id, alert.pond_id) if alert.pond_id else None
        if key is None or key not in pond_keys:
            global_alerts.append(alert)
        else:
            alerts_by_pond[key].append(alert)

    pond_overviews: list[PondOverview] = []
    for pond in ponds:
        key = (pond.organization_id, pond.id)
        latest_water = latest_by_pond.get(key)
        recent_water = _summarize_recent_water(
            water_daily_by_pond.get(key, []),
            period_start=period_start,
            period_end=period_end,
        )
        latest_shrimp = shrimp_by_pond.get(key)
        recent_feeding = _summarize_recent_feeding(
            feeding_by_pond.get(key, []),
            period_start=period_start,
            period_end=period_end,
        )
        equipment = _summarize_equipment(
            devices_by_pond.get(key, []),
            robot_statuses_by_pond.get(key, []),
            now=evaluation_time,
            heartbeat_stale_after_minutes=device_heartbeat_stale_after_minutes,
        )
        thresholds = thresholds_by_pond.get(key)
        pond_alerts = alerts_by_pond.get(key, [])
        metrics, risk, summary = assess_pond_risk(
            latest_water=latest_water,
            thresholds=thresholds,
            active_alerts=pond_alerts,
            water_data_stale=(
                latest_water is not None
                and _age_seconds(
                    now=evaluation_time,
                    observed_at=latest_water.recorded_at,
                )
                > water_stale_after_hours * 60 * 60
            ),
            water_age_hours=(
                _age_hours(
                    now=evaluation_time,
                    observed_at=latest_water.recorded_at,
                )
                if latest_water is not None
                else None
            ),
            water_stale_after_hours=water_stale_after_hours,
        )
        pond_overviews.append(
            PondOverview(
                pond=pond,
                latest_water=latest_water,
                recent_water=recent_water,
                latest_shrimp=latest_shrimp,
                recent_feeding=recent_feeding,
                equipment=equipment,
                metrics=metrics,
                active_alerts=pond_alerts,
                risk=risk,
                summary=summary,
            )
        )

    attention_ponds = sum(
        item.risk.requires_attention
        or (item.equipment is not None and item.equipment.requires_attention)
        for item in pond_overviews
    )
    data_insufficient_ponds = sum(
        not item.risk.data_complete for item in pond_overviews
    )

    return FarmOverviewResponse(
        generated_at=evaluation_time,
        organization_ids=sorted(
            {pond.organization_id for pond in ponds},
            key=str,
        ),
        total_ponds=len(pond_overviews),
        attention_ponds=attention_ponds,
        normal_ponds=len(pond_overviews) - attention_ponds,
        data_insufficient_ponds=data_insufficient_ponds,
        water_trend_data_ponds=sum(
            item.recent_water is not None for item in pond_overviews
        ),
        shrimp_data_ponds=sum(
            item.latest_shrimp is not None for item in pond_overviews
        ),
        feeding_data_ponds=sum(
            item.recent_feeding is not None for item in pond_overviews
        ),
        equipment_data_ponds=sum(
            item.equipment is not None for item in pond_overviews
        ),
        lost_connection_devices=sum(
            item.equipment.lost_connection_device_count
            for item in pond_overviews
            if item.equipment is not None
        ),
        unknown_heartbeat_devices=sum(
            item.equipment.unknown_heartbeat_device_count
            for item in pond_overviews
            if item.equipment is not None
        ),
        ponds=pond_overviews,
        global_alerts=global_alerts,
    )
