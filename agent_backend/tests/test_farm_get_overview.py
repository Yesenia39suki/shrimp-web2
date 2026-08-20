"""farm_get_overview 业务工具测试。"""

import unittest
from datetime import UTC, datetime
from decimal import Decimal

from app.schemas.farm import (
    DeviceSnapshot,
    FeedingDailySnapshot,
    RobotStatusSnapshot,
    ShrimpLatestSnapshot,
    WaterDailySnapshot,
    WaterLatestSnapshot,
    WaterThresholdSnapshot,
)
from app.schemas.pond import PondResponse
from app.tools.farm_get_overview import _summarize_equipment, farm_get_overview

ORGANIZATION_ID = "1733849e-5607-449e-80b8-3d67733d9dbd"
POND_ID = "a2d89b5f-2f59-4573-9391-cfa6be64fa18"


class FakeGateway:
    def __init__(self) -> None:
        self.tokens: list[str] = []

    async def list_accessible_ponds(self, token: str) -> list[PondResponse]:
        self.tokens.append(token)
        return [
            PondResponse.model_validate(
                {
                    "id": POND_ID,
                    "organization_id": ORGANIZATION_ID,
                    "pond_code": "P-01",
                    "pond_name": "一号池",
                    "shrimp_species": "南美白对虾",
                    "area_mu": 12.5,
                    "water_depth_m": 1.8,
                    "location": "东区",
                    "created_at": "2026-08-17T08:00:00Z",
                    "updated_at": "2026-08-17T08:00:00Z",
                }
            )
        ]

    async def list_accessible_water_latest(self, token: str) -> list[WaterLatestSnapshot]:
        self.tokens.append(token)
        return [
            WaterLatestSnapshot.model_validate(
                {
                    "organization_id": ORGANIZATION_ID,
                    "pond_id": POND_ID,
                    "temperature": 28,
                    "dissolved_oxygen": 6.8,
                    "ph": 7.8,
                    "orp": 318,
                    "turbidity": 18,
                    "ammonia": 0.16,
                    "nitrite": 0.05,
                    "hardness": 188,
                    "recorded_at": "2026-08-17T08:00:00Z",
                    "updated_at": "2026-08-17T08:00:00Z",
                }
            )
        ]

    async def list_accessible_water_thresholds(self, token: str) -> list[WaterThresholdSnapshot]:
        self.tokens.append(token)
        return [
            WaterThresholdSnapshot.model_validate(
                {
                    "organization_id": ORGANIZATION_ID,
                    "pond_id": POND_ID,
                    "temperature_min": 20,
                    "temperature_max": 35,
                    "dissolved_oxygen_min": 5,
                    "dissolved_oxygen_max": 9,
                    "ph_min": 7,
                    "ph_max": 8.6,
                    "orp_min": 250,
                    "orp_max": 420,
                    "turbidity_min": 0,
                    "turbidity_max": 30,
                    "ammonia_min": 0,
                    "ammonia_max": 0.3,
                    "nitrite_min": 0,
                    "nitrite_max": 0.12,
                    "hardness_min": 120,
                    "hardness_max": 260,
                }
            )
        ]

    async def list_accessible_active_alerts(self, token: str) -> list[object]:
        self.tokens.append(token)
        return []

    async def list_latest_shrimp_daily_stats(
        self,
        token: str,
        pond_ids: list[object],
    ) -> list[ShrimpLatestSnapshot]:
        self.tokens.append(token)
        self.pond_ids = pond_ids
        return [
            ShrimpLatestSnapshot.model_validate(
                {
                    "organization_id": ORGANIZATION_ID,
                    "pond_id": POND_ID,
                    "stat_date": "2026-08-17",
                    "avg_length_cm": 8.4,
                    "avg_weight_g": 11.2,
                    "sample_count": 30,
                    "estimated_count": 18000,
                    "estimated_yield_kg": 201.6,
                    "maturity_percent": 58,
                    "updated_at": "2026-08-17T08:00:00Z",
                }
            )
        ]

    async def list_accessible_feeding_daily_stats(
        self,
        token: str,
        start_date: object,
        end_date: object,
        pond_ids: list[object],
    ) -> list[FeedingDailySnapshot]:
        self.tokens.append(token)
        self.feeding_start_date = start_date
        self.feeding_end_date = end_date
        self.feeding_pond_ids = pond_ids
        return [
            FeedingDailySnapshot.model_validate(
                {
                    "organization_id": ORGANIZATION_ID,
                    "pond_id": POND_ID,
                    "stat_date": "2026-08-17",
                    "total_feed_kg": 24,
                    "feeding_count": 3,
                    "robot_feeding_count": 2,
                    "manual_feeding_count": 1,
                }
            ),
            FeedingDailySnapshot.model_validate(
                {
                    "organization_id": ORGANIZATION_ID,
                    "pond_id": POND_ID,
                    "stat_date": "2026-08-18",
                    "total_feed_kg": 30,
                    "feeding_count": 3,
                    "robot_feeding_count": 3,
                    "manual_feeding_count": 0,
                }
            ),
        ]

    async def list_accessible_water_daily_stats(
        self,
        token: str,
        start_date: object,
        end_date: object,
        pond_ids: list[object],
    ) -> list[WaterDailySnapshot]:
        self.tokens.append(token)
        self.water_pond_ids = pond_ids
        return [
            WaterDailySnapshot.model_validate(
                {
                    "organization_id": ORGANIZATION_ID,
                    "pond_id": POND_ID,
                    "stat_date": "2026-08-17",
                    "avg_temperature": 27.5,
                    "min_temperature": 27,
                    "max_temperature": 28,
                    "avg_dissolved_oxygen": 7,
                    "min_dissolved_oxygen": 6.8,
                    "max_dissolved_oxygen": 7.2,
                    "avg_ph": 7.7,
                    "min_ph": 7.6,
                    "max_ph": 7.8,
                    "max_ammonia": 0.1,
                    "max_nitrite": 0.04,
                    "warning_count": 0,
                    "reading_count": 2,
                    "status": "稳定",
                }
            ),
            WaterDailySnapshot.model_validate(
                {
                    "organization_id": ORGANIZATION_ID,
                    "pond_id": POND_ID,
                    "stat_date": "2026-08-18",
                    "avg_temperature": 28,
                    "min_temperature": 27.8,
                    "max_temperature": 28.2,
                    "avg_dissolved_oxygen": 6.8,
                    "min_dissolved_oxygen": 6.6,
                    "max_dissolved_oxygen": 7,
                    "avg_ph": 7.8,
                    "min_ph": 7.7,
                    "max_ph": 7.9,
                    "max_ammonia": 0.16,
                    "max_nitrite": 0.05,
                    "warning_count": 1,
                    "reading_count": 2,
                    "status": "预警",
                }
            ),
        ]

    async def list_accessible_devices(
        self,
        token: str,
        pond_ids: list[object],
    ) -> list[DeviceSnapshot]:
        self.tokens.append(token)
        self.device_pond_ids = pond_ids
        return [
            DeviceSnapshot.model_validate(
                {
                    "organization_id": ORGANIZATION_ID,
                    "pond_id": POND_ID,
                    "type": "water_sensor",
                    "status": "online",
                    "last_heartbeat_at": "2026-08-18T08:00:00Z",
                    "updated_at": "2026-08-18T08:00:00Z",
                }
            ),
            DeviceSnapshot.model_validate(
                {
                    "organization_id": ORGANIZATION_ID,
                    "pond_id": POND_ID,
                    "type": "aerator",
                    "status": "fault",
                    "last_heartbeat_at": "2026-08-18T07:58:00Z",
                    "updated_at": "2026-08-18T08:01:00Z",
                }
            ),
        ]

    async def list_accessible_robot_statuses(
        self,
        token: str,
        pond_ids: list[object],
    ) -> list[RobotStatusSnapshot]:
        self.tokens.append(token)
        self.robot_pond_ids = pond_ids
        return [
            RobotStatusSnapshot.model_validate(
                {
                    "organization_id": ORGANIZATION_ID,
                    "pond_id": POND_ID,
                    "online": False,
                    "work_mode": "fault",
                    "battery": 18,
                    "speed": 0,
                    "fault_code": "E-STOP",
                    "updated_at": "2026-08-18T08:02:00Z",
                }
            )
        ]


class FarmGetOverviewTests(unittest.IsolatedAsyncioTestCase):
    async def test_builds_overview_from_rls_visible_rows(self) -> None:
        gateway = FakeGateway()

        overview = await farm_get_overview(
            gateway=gateway,  # type: ignore[arg-type]
            access_token="user-token",
            now=datetime(2026, 8, 18, 8, tzinfo=UTC),
        )

        self.assertEqual(overview.total_ponds, 1)
        self.assertEqual(overview.normal_ponds, 0)
        self.assertEqual(overview.attention_ponds, 1)
        self.assertEqual(overview.ponds[0].risk.risk_level, "低风险")
        self.assertFalse(overview.ponds[0].risk.water_data_stale)
        self.assertEqual(
            overview.ponds[0].risk.water_age_hours,
            Decimal("24.00"),
        )
        self.assertEqual(overview.shrimp_data_ponds, 1)
        self.assertEqual(overview.feeding_data_ponds, 1)
        self.assertEqual(overview.water_trend_data_ponds, 1)
        self.assertEqual(overview.equipment_data_ponds, 1)
        self.assertEqual(
            overview.ponds[0].latest_shrimp.avg_weight_g,
            Decimal("11.2"),
        )
        self.assertEqual(
            overview.ponds[0].recent_feeding.total_feed_kg,
            Decimal("54"),
        )
        self.assertEqual(
            overview.ponds[0].recent_feeding.average_per_recorded_day_kg,
            Decimal("27.00"),
        )
        self.assertEqual(gateway.pond_ids, [overview.ponds[0].pond.id])
        self.assertEqual(gateway.feeding_pond_ids, [overview.ponds[0].pond.id])
        self.assertEqual(overview.ponds[0].recent_water.total_readings, 4)
        self.assertEqual(
            overview.ponds[0].recent_water.temperature_change,
            Decimal("0.5"),
        )
        self.assertEqual(overview.ponds[0].equipment.device_count, 2)
        self.assertEqual(
            overview.ponds[0].equipment.lost_connection_device_count,
            0,
        )
        self.assertEqual(overview.lost_connection_devices, 0)
        self.assertEqual(overview.unknown_heartbeat_devices, 0)
        self.assertEqual(overview.ponds[0].equipment.fault_robot_count, 1)
        self.assertTrue(overview.ponds[0].equipment.requires_attention)
        self.assertEqual(gateway.tokens, ["user-token"] * 9)

    async def test_water_becomes_stale_only_after_24_hours(self) -> None:
        overview = await farm_get_overview(
            gateway=FakeGateway(),  # type: ignore[arg-type]
            access_token="user-token",
            now=datetime(2026, 8, 18, 8, 0, 1, tzinfo=UTC),
        )

        risk = overview.ponds[0].risk
        self.assertTrue(risk.water_data_stale)
        self.assertFalse(risk.data_complete)
        self.assertEqual(risk.risk_level, "数据不足")
        self.assertIn("最新水质数据已超过 24 小时", risk.reasons)

    async def test_heartbeat_becomes_lost_only_after_30_minutes(self) -> None:
        at_boundary = await farm_get_overview(
            gateway=FakeGateway(),  # type: ignore[arg-type]
            access_token="user-token",
            now=datetime(2026, 8, 18, 8, 28, tzinfo=UTC),
        )
        after_boundary = await farm_get_overview(
            gateway=FakeGateway(),  # type: ignore[arg-type]
            access_token="user-token",
            now=datetime(2026, 8, 18, 8, 28, 1, tzinfo=UTC),
        )

        self.assertEqual(
            at_boundary.ponds[0].equipment.lost_connection_device_count,
            0,
        )
        self.assertEqual(
            after_boundary.ponds[0].equipment.lost_connection_device_count,
            1,
        )
        self.assertEqual(after_boundary.lost_connection_devices, 1)

    def test_missing_heartbeat_is_unknown_instead_of_lost(self) -> None:
        device = DeviceSnapshot.model_validate(
            {
                "organization_id": ORGANIZATION_ID,
                "pond_id": POND_ID,
                "type": "water_sensor",
                "status": "online",
                "last_heartbeat_at": None,
                "updated_at": "2026-08-18T08:00:00Z",
            }
        )

        summary = _summarize_equipment(
            [device],
            [],
            now=datetime(2026, 8, 18, 9, tzinfo=UTC),
            heartbeat_stale_after_minutes=30,
        )

        self.assertIsNotNone(summary)
        assert summary is not None
        self.assertEqual(summary.heartbeat_tracked_device_count, 0)
        self.assertEqual(summary.lost_connection_device_count, 0)
        self.assertEqual(summary.unknown_heartbeat_device_count, 1)
        self.assertFalse(summary.requires_attention)


if __name__ == "__main__":
    unittest.main()
