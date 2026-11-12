"""养殖场概览接口测试。"""

import unittest
from datetime import UTC, datetime

import httpx

from app.api.dependencies import get_supabase_gateway
from app.main import app
from app.services.supabase_gateway import SupabaseGateway

USER_ID = "a2aab2a1-44ea-4c3c-9f58-f101cb177ce7"
ORGANIZATION_ID = "1733849e-5607-449e-80b8-3d67733d9dbd"
POND_ID = "a2d89b5f-2f59-4573-9391-cfa6be64fa18"


class FarmApiTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        fresh_timestamp = datetime.now(UTC).isoformat()

        def handler(request: httpx.Request) -> httpx.Response:
            path = request.url.path
            if path == "/auth/v1/user":
                return httpx.Response(200, json={"id": USER_ID, "email": "user@example.com"})
            if path == "/rest/v1/ponds":
                return httpx.Response(
                    200,
                    json=[
                        {
                            "id": POND_ID,
                            "organization_id": ORGANIZATION_ID,
                            "pond_code": "P-01",
                            "pond_name": "一号池",
                            "shrimp_species": "南美白对虾",
                            "area_mu": 12.5,
                            "water_depth_m": 1.8,
                            "location": "东区",
                            "longitude": None,
                            "latitude": None,
                            "created_at": "2026-08-17T08:00:00Z",
                            "updated_at": "2026-08-17T08:00:00Z",
                        }
                    ],
                )
            if path == "/rest/v1/water_latest":
                return httpx.Response(
                    200,
                    json=[
                        {
                            "organization_id": ORGANIZATION_ID,
                            "pond_id": POND_ID,
                            "reading_id": None,
                            "temperature": 28,
                            "dissolved_oxygen": 6.8,
                            "ph": 7.8,
                            "orp": 318,
                            "turbidity": 18,
                            "ammonia": 0.16,
                            "nitrite": 0.05,
                            "hardness": 188,
                            "recorded_at": fresh_timestamp,
                            "updated_at": fresh_timestamp,
                        }
                    ],
                )
            if path == "/rest/v1/water_thresholds":
                return httpx.Response(
                    200,
                    json=[
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
                    ],
                )
            if path == "/rest/v1/alerts":
                return httpx.Response(200, json=[])
            if path == "/rest/v1/shrimp_daily_stats":
                return httpx.Response(
                    200,
                    json=[
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
                    ],
                )
            if path == "/rest/v1/feeding_daily_stats":
                return httpx.Response(
                    200,
                    json=[
                        {
                            "organization_id": ORGANIZATION_ID,
                            "pond_id": POND_ID,
                            "stat_date": "2026-08-17",
                            "total_feed_kg": 24,
                            "feeding_count": 3,
                            "robot_feeding_count": 2,
                            "manual_feeding_count": 1,
                        }
                    ],
                )
            if path == "/rest/v1/water_daily_stats":
                return httpx.Response(
                    200,
                    json=[
                        {
                            "organization_id": ORGANIZATION_ID,
                            "pond_id": POND_ID,
                            "stat_date": "2026-08-17",
                            "avg_temperature": 28,
                            "min_temperature": 27.5,
                            "max_temperature": 28.5,
                            "avg_dissolved_oxygen": 6.8,
                            "min_dissolved_oxygen": 6.5,
                            "max_dissolved_oxygen": 7.1,
                            "avg_ph": 7.8,
                            "min_ph": 7.7,
                            "max_ph": 7.9,
                            "max_ammonia": 0.16,
                            "max_nitrite": 0.05,
                            "warning_count": 0,
                            "reading_count": 2,
                            "status": "稳定",
                        }
                    ],
                )
            if path == "/rest/v1/devices":
                return httpx.Response(
                    200,
                    json=[
                        {
                            "organization_id": ORGANIZATION_ID,
                            "pond_id": POND_ID,
                            "type": "water_sensor",
                            "status": "online",
                            "last_heartbeat_at": fresh_timestamp,
                            "updated_at": fresh_timestamp,
                        }
                    ],
                )
            if path == "/rest/v1/robot_status":
                return httpx.Response(
                    200,
                    json=[
                        {
                            "organization_id": ORGANIZATION_ID,
                            "pond_id": POND_ID,
                            "online": True,
                            "work_mode": "standby",
                            "battery": 86,
                            "speed": 0,
                            "fault_code": None,
                            "updated_at": "2026-08-17T08:00:00Z",
                        }
                    ],
                )
            return httpx.Response(404)

        self.gateway = SupabaseGateway(
            base_url="https://project.supabase.co",
            publishable_key="publishable-key",
            transport=httpx.MockTransport(handler),
        )
        app.dependency_overrides[get_supabase_gateway] = lambda: self.gateway
        self.client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://testserver",
        )

    async def asyncTearDown(self) -> None:
        await self.client.aclose()
        await self.gateway.aclose()
        app.dependency_overrides.clear()

    async def test_overview_returns_structured_business_context(self) -> None:
        response = await self.client.get(
            "/api/v1/farm/overview",
            headers={"Authorization": "Bearer user-token"},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["total_ponds"], 1)
        self.assertEqual(payload["normal_ponds"], 1)
        self.assertEqual(payload["ponds"][0]["pond"]["pond_name"], "一号池")
        self.assertEqual(payload["ponds"][0]["risk"]["risk_level"], "低风险")
        self.assertEqual(payload["shrimp_data_ponds"], 1)
        self.assertEqual(payload["feeding_data_ponds"], 1)
        self.assertEqual(payload["water_trend_data_ponds"], 1)
        self.assertEqual(payload["equipment_data_ponds"], 1)
        self.assertEqual(payload["ponds"][0]["latest_shrimp"]["sample_count"], 30)
        self.assertEqual(payload["ponds"][0]["recent_feeding"]["total_feed_kg"], "24")
        self.assertEqual(payload["ponds"][0]["recent_water"]["total_readings"], 2)
        self.assertEqual(payload["ponds"][0]["equipment"]["device_count"], 1)
        self.assertEqual(payload["ponds"][0]["equipment"]["online_robot_count"], 1)
        self.assertFalse(payload["ponds"][0]["risk"]["water_data_stale"])
        self.assertEqual(
            payload["ponds"][0]["equipment"]["lost_connection_device_count"],
            0,
        )
        self.assertEqual(payload["lost_connection_devices"], 0)
        self.assertEqual(payload["unknown_heartbeat_devices"], 0)

    async def test_overview_rejects_organization_id(self) -> None:
        response = await self.client.get(
            "/api/v1/farm/overview?organization_id=untrusted",
            headers={"Authorization": "Bearer user-token"},
        )

        self.assertEqual(response.status_code, 400)

    async def test_single_pond_overview_returns_only_visible_target(self) -> None:
        response = await self.client.get(
            f"/api/v1/farm/ponds/{POND_ID}/overview",
            headers={"Authorization": "Bearer user-token"},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["pond"]["pond"]["id"], POND_ID)
        self.assertEqual(payload["pond"]["pond"]["pond_code"], "P-01")
        self.assertEqual(payload["pond"]["risk"]["risk_level"], "低风险")

    async def test_single_pond_overview_hides_inaccessible_target(self) -> None:
        response = await self.client.get(
            "/api/v1/farm/ponds/25f4249f-3cf5-4c28-8d4d-c94e575d87de/overview",
            headers={"Authorization": "Bearer user-token"},
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json()["detail"],
            "池塘不存在或当前用户无权访问。",
        )

    async def test_single_pond_overview_rejects_organization_id(self) -> None:
        response = await self.client.get(
            f"/api/v1/farm/ponds/{POND_ID}/overview?organization_id=untrusted",
            headers={"Authorization": "Bearer user-token"},
        )

        self.assertEqual(response.status_code, 400)

    def test_freshness_thresholds_are_not_request_parameters(self) -> None:
        operation = app.openapi()["paths"]["/api/v1/farm/overview"]["get"]
        parameter_names = {
            parameter["name"] for parameter in operation.get("parameters", [])
        }

        self.assertNotIn("water_stale_after_hours", parameter_names)
        self.assertNotIn("device_heartbeat_stale_after_minutes", parameter_names)

        single_operation = app.openapi()["paths"][
            "/api/v1/farm/ponds/{pond_id}/overview"
        ]["get"]
        single_parameter_names = {
            parameter["name"]
            for parameter in single_operation.get("parameters", [])
        }
        self.assertEqual(single_parameter_names, {"pond_id"})


if __name__ == "__main__":
    unittest.main()
