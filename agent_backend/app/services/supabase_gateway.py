"""使用当前用户身份访问 Supabase Auth 与 Data API。"""

import asyncio
from datetime import date
from typing import Any, TypeVar
from uuid import UUID

import httpx
from pydantic import BaseModel, SecretStr, ValidationError

from app.schemas.auth import AuthenticatedRequest
from app.schemas.farm import (
    ActiveAlertSnapshot,
    DeviceSnapshot,
    FeedingDailySnapshot,
    RobotStatusSnapshot,
    ShrimpLatestSnapshot,
    WaterDailySnapshot,
    WaterLatestSnapshot,
    WaterThresholdSnapshot,
)
from app.schemas.pond import PondResponse

RowModel = TypeVar("RowModel", bound=BaseModel)


class SupabaseAuthenticationError(RuntimeError):
    """Supabase 拒绝了当前用户的 access token。"""


class SupabaseUpstreamError(RuntimeError):
    """Supabase 服务不可用或返回了无法处理的响应。"""


class SupabaseGateway:
    """不保存用户会话的 Supabase 请求网关。"""

    _POND_SELECT = ",".join(
        (
            "id",
            "organization_id",
            "pond_code",
            "pond_name",
            "shrimp_species",
            "area_mu",
            "water_depth_m",
            "location",
            "longitude",
            "latitude",
            "created_at",
            "updated_at",
        )
    )
    _WATER_LATEST_SELECT = ",".join(
        (
            "organization_id",
            "pond_id",
            "reading_id",
            "temperature",
            "dissolved_oxygen",
            "ph",
            "orp",
            "turbidity",
            "ammonia",
            "nitrite",
            "hardness",
            "recorded_at",
            "updated_at",
        )
    )
    _WATER_THRESHOLD_SELECT = ",".join(
        (
            "organization_id",
            "pond_id",
            "temperature_min",
            "temperature_max",
            "dissolved_oxygen_min",
            "dissolved_oxygen_max",
            "ph_min",
            "ph_max",
            "orp_min",
            "orp_max",
            "turbidity_min",
            "turbidity_max",
            "ammonia_min",
            "ammonia_max",
            "nitrite_min",
            "nitrite_max",
            "hardness_min",
            "hardness_max",
        )
    )
    _ALERT_SELECT = ",".join(
        (
            "id",
            "organization_id",
            "pond_id",
            "type",
            "level",
            "title",
            "content",
            "metric_key",
            "current_value",
            "normal_range",
            "suggestion",
            "source",
            "read_status",
            "created_at",
        )
    )
    _SHRIMP_DAILY_SELECT = ",".join(
        (
            "organization_id",
            "pond_id",
            "stat_date",
            "avg_length_cm",
            "avg_weight_g",
            "sample_count",
            "estimated_count",
            "estimated_yield_kg",
            "maturity_percent",
            "updated_at",
        )
    )
    _FEEDING_DAILY_SELECT = ",".join(
        (
            "organization_id",
            "pond_id",
            "stat_date",
            "total_feed_kg",
            "feeding_count",
            "robot_feeding_count",
            "manual_feeding_count",
        )
    )
    _WATER_DAILY_SELECT = ",".join(
        (
            "organization_id",
            "pond_id",
            "stat_date",
            "avg_temperature",
            "min_temperature",
            "max_temperature",
            "avg_dissolved_oxygen",
            "min_dissolved_oxygen",
            "max_dissolved_oxygen",
            "avg_ph",
            "min_ph",
            "max_ph",
            "max_ammonia",
            "max_nitrite",
            "warning_count",
            "reading_count",
            "status",
        )
    )
    _DEVICE_SELECT = ",".join(
        (
            "organization_id",
            "pond_id",
            "type",
            "status",
            "last_heartbeat_at",
            "updated_at",
        )
    )
    _ROBOT_STATUS_SELECT = ",".join(
        (
            "organization_id",
            "pond_id",
            "online",
            "work_mode",
            "battery",
            "speed",
            "fault_code",
            "updated_at",
        )
    )

    def __init__(
        self,
        *,
        base_url: str,
        publishable_key: str,
        timeout_seconds: float = 10.0,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._publishable_key = publishable_key
        self._timeout = httpx.Timeout(timeout_seconds)
        self._transport = transport
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            timeout=self._timeout,
            transport=self._transport,
        )

    async def aclose(self) -> None:
        """释放当前请求内复用的 HTTP 连接。"""

        await self._client.aclose()

    def _headers(self, access_token: str) -> dict[str, str]:
        """分别传递项目 publishable key 与用户 JWT。"""

        return {
            "apikey": self._publishable_key,
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }

    async def _get_rows(
        self,
        *,
        table: str,
        access_token: str,
        params: dict[str, str],
        model: type[RowModel],
    ) -> list[RowModel]:
        """使用用户 JWT 读取一张受 RLS 保护的表。"""

        try:
            response = await self._client.get(
                f"/rest/v1/{table}",
                headers=self._headers(access_token),
                params=params,
            )
        except httpx.RequestError as exc:
            raise SupabaseUpstreamError("Supabase Data API 暂时不可用。") from exc

        if response.status_code in {401, 403}:
            raise SupabaseUpstreamError(
                f"Supabase 拒绝读取 {table}，请检查 GRANT 与 RLS。"
            )
        if not response.is_success:
            raise SupabaseUpstreamError("Supabase Data API 返回了异常状态。")

        try:
            payload = response.json()
            if not isinstance(payload, list):
                raise TypeError(f"{table} 响应不是列表")
            return [model.model_validate(item) for item in payload]
        except (TypeError, ValueError, ValidationError) as exc:
            raise SupabaseUpstreamError(
                f"Supabase 返回了无效的 {table} 数据。"
            ) from exc

    async def verify_user(self, access_token: str) -> AuthenticatedRequest:
        """由 Supabase Auth 服务验证 access token 并返回当前用户。"""

        try:
            response = await self._client.get(
                "/auth/v1/user",
                headers=self._headers(access_token),
            )
        except httpx.RequestError as exc:
            raise SupabaseUpstreamError("Supabase Auth 服务暂时不可用。") from exc

        if response.status_code in {401, 403}:
            raise SupabaseAuthenticationError("access token 无效或已过期。")
        if not response.is_success:
            raise SupabaseUpstreamError("Supabase Auth 返回了异常状态。")

        try:
            payload: dict[str, Any] = response.json()
            user_id = UUID(str(payload["id"]))
        except (KeyError, TypeError, ValueError) as exc:
            raise SupabaseUpstreamError("Supabase Auth 返回了无效的用户数据。") from exc

        email = payload.get("email")
        return AuthenticatedRequest(
            user_id=user_id,
            email=email if isinstance(email, str) else None,
            access_token=SecretStr(access_token),
        )

    async def list_accessible_ponds(self, access_token: str) -> list[PondResponse]:
        """使用用户 JWT 查询 ponds，由数据库 RLS 决定可见行。"""

        return await self._get_rows(
            table="ponds",
            access_token=access_token,
            params={"select": self._POND_SELECT, "order": "pond_code.asc"},
            model=PondResponse,
        )

    async def list_accessible_water_latest(
        self,
        access_token: str,
    ) -> list[WaterLatestSnapshot]:
        """读取当前用户通过 RLS 可见的最新水质。"""

        return await self._get_rows(
            table="water_latest",
            access_token=access_token,
            params={"select": self._WATER_LATEST_SELECT},
            model=WaterLatestSnapshot,
        )

    async def list_accessible_water_thresholds(
        self,
        access_token: str,
    ) -> list[WaterThresholdSnapshot]:
        """读取当前用户通过 RLS 可见的水质阈值。"""

        return await self._get_rows(
            table="water_thresholds",
            access_token=access_token,
            params={"select": self._WATER_THRESHOLD_SELECT},
            model=WaterThresholdSnapshot,
        )

    async def list_accessible_active_alerts(
        self,
        access_token: str,
    ) -> list[ActiveAlertSnapshot]:
        """读取当前用户通过 RLS 可见且尚未解决的报警。"""

        return await self._get_rows(
            table="alerts",
            access_token=access_token,
            params={
                "select": self._ALERT_SELECT,
                "read_status": "neq.resolved",
                "order": "created_at.desc",
            },
            model=ActiveAlertSnapshot,
        )

    async def list_latest_shrimp_daily_stats(
        self,
        access_token: str,
        pond_ids: list[UUID],
    ) -> list[ShrimpLatestSnapshot]:
        """按服务端已确认可见的池塘 ID，各取一条最新虾群日统计。"""

        if not pond_ids:
            return []

        rows_by_pond = await asyncio.gather(
            *(
                self._get_rows(
                    table="shrimp_daily_stats",
                    access_token=access_token,
                    params={
                        "select": self._SHRIMP_DAILY_SELECT,
                        "pond_id": f"eq.{pond_id}",
                        "order": "stat_date.desc",
                        "limit": "1",
                    },
                    model=ShrimpLatestSnapshot,
                )
                for pond_id in pond_ids
            )
        )
        return [row for rows in rows_by_pond for row in rows]

    async def list_accessible_feeding_daily_stats(
        self,
        access_token: str,
        start_date: date,
        end_date: date,
        pond_ids: list[UUID],
    ) -> list[FeedingDailySnapshot]:
        """读取当前用户经 RLS 可见、且位于固定时间窗口内的投喂日统计。"""

        if not pond_ids:
            return []

        return await self._get_rows(
            table="feeding_daily_stats",
            access_token=access_token,
            params={
                "select": self._FEEDING_DAILY_SELECT,
                "pond_id": f"in.({','.join(str(pond_id) for pond_id in pond_ids)})",
                "stat_date": f"gte.{start_date.isoformat()}",
                "and": f"(stat_date.lte.{end_date.isoformat()})",
                "order": "stat_date.asc",
            },
            model=FeedingDailySnapshot,
        )

    async def list_accessible_water_daily_stats(
        self,
        access_token: str,
        start_date: date,
        end_date: date,
        pond_ids: list[UUID],
    ) -> list[WaterDailySnapshot]:
        """读取服务端确认池塘在固定 7 日窗口内的水质日统计。"""

        if not pond_ids:
            return []

        return await self._get_rows(
            table="water_daily_stats",
            access_token=access_token,
            params={
                "select": self._WATER_DAILY_SELECT,
                "pond_id": f"in.({','.join(str(pond_id) for pond_id in pond_ids)})",
                "stat_date": f"gte.{start_date.isoformat()}",
                "and": f"(stat_date.lte.{end_date.isoformat()})",
                "order": "stat_date.asc",
            },
            model=WaterDailySnapshot,
        )

    async def list_accessible_devices(
        self,
        access_token: str,
        pond_ids: list[UUID],
    ) -> list[DeviceSnapshot]:
        """读取服务端确认池塘绑定设备的受控状态字段。"""

        if not pond_ids:
            return []

        return await self._get_rows(
            table="devices",
            access_token=access_token,
            params={
                "select": self._DEVICE_SELECT,
                "pond_id": f"in.({','.join(str(pond_id) for pond_id in pond_ids)})",
                "order": "updated_at.desc",
            },
            model=DeviceSnapshot,
        )

    async def list_accessible_robot_statuses(
        self,
        access_token: str,
        pond_ids: list[UUID],
    ) -> list[RobotStatusSnapshot]:
        """读取服务端确认池塘的机器人当前状态。"""

        if not pond_ids:
            return []

        return await self._get_rows(
            table="robot_status",
            access_token=access_token,
            params={
                "select": self._ROBOT_STATUS_SELECT,
                "pond_id": f"in.({','.join(str(pond_id) for pond_id in pond_ids)})",
                "order": "updated_at.desc",
            },
            model=RobotStatusSnapshot,
        )
