"""智能建议 API 测试。"""

import unittest

import httpx

from app.api.dependencies import get_model_provider, get_supabase_gateway
from app.main import app
from app.services.model_provider import JsonCompletion, ModelUsage
from app.services.supabase_gateway import SupabaseGateway

USER_ID = "a2aab2a1-44ea-4c3c-9f58-f101cb177ce7"
ORGANIZATION_ID = "1733849e-5607-449e-80b8-3d67733d9dbd"
POND_ID = "a2d89b5f-2f59-4573-9391-cfa6be64fa18"
POND_ID_2 = "a9acf6dc-e64c-4d20-8a0f-e26ca1b7f199"


class FakeModelProvider:
    def __init__(self, content: dict[str, object] | None = None) -> None:
        self.content = content or {
            "advice": [
                {
                    "pond_code": "P-01",
                    "priority": "高",
                    "category": "数据补全",
                    "title": "补采水质",
                    "evidence_fact_ids": ["P1.water_availability"],
                    "actions": ["采集八项水质参数"],
                }
            ]
        }
        self.calls = 0
        self.user_prompt = ""

    async def complete_json(self, **kwargs: object) -> JsonCompletion:
        self.calls += 1
        self.user_prompt = str(kwargs["user_prompt"])
        return JsonCompletion(
            model="deepseek-v4-flash",
            content=self.content,
            usage=ModelUsage(80, 30, 110),
        )


class InvalidModelProvider:
    async def complete_json(self, **_: object) -> JsonCompletion:
        return JsonCompletion(
            model="deepseek-v4-flash",
            content={
                "advice": [
                    {
                        "pond_code": "P-01",
                        "priority": "高",
                        "category": "数据补全",
                        "title": "无依据建议",
                        "evidence_fact_ids": ["P1.not_exists"],
                        "actions": ["执行无依据动作"],
                    }
                ]
            },
            usage=ModelUsage(80, 30, 110),
        )


class AgentApiTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            path = request.url.path
            if path == "/auth/v1/user":
                return httpx.Response(200, json={"id": USER_ID})
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
                            "area_mu": 20,
                            "water_depth_m": 1.5,
                            "location": "未设置",
                            "longitude": None,
                            "latitude": None,
                            "created_at": "2026-08-14T08:54:28Z",
                            "updated_at": "2026-08-14T08:54:28Z",
                        },
                        {
                            "id": POND_ID_2,
                            "organization_id": ORGANIZATION_ID,
                            "pond_code": "P-02",
                            "pond_name": "二号池",
                            "shrimp_species": "南美白对虾",
                            "area_mu": 18,
                            "water_depth_m": 1.4,
                            "location": "未设置",
                            "longitude": None,
                            "latitude": None,
                            "created_at": "2026-08-14T08:54:28Z",
                            "updated_at": "2026-08-14T08:54:28Z",
                        },
                    ],
                )
            if path == "/rest/v1/water_latest":
                return httpx.Response(200, json=[])
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
            if path in {
                "/rest/v1/shrimp_daily_stats",
                "/rest/v1/feeding_daily_stats",
                "/rest/v1/water_daily_stats",
                "/rest/v1/devices",
                "/rest/v1/robot_status",
            }:
                return httpx.Response(200, json=[])
            return httpx.Response(404)

        self.gateway = SupabaseGateway(
            base_url="https://project.supabase.co",
            publishable_key="publishable-key",
            transport=httpx.MockTransport(handler),
        )
        app.dependency_overrides[get_supabase_gateway] = lambda: self.gateway
        self.provider = FakeModelProvider()
        app.dependency_overrides[get_model_provider] = lambda: self.provider
        self.client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://testserver",
        )

    async def asyncTearDown(self) -> None:
        await self.client.aclose()
        await self.gateway.aclose()
        app.dependency_overrides.clear()

    async def test_generates_advice_from_current_user_context(self) -> None:
        response = await self.client.post(
            "/api/v1/agent/farm-advice",
            headers={"Authorization": "Bearer user-token"},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["model"], "deepseek-v4-flash")
        self.assertEqual(payload["result"]["advice"][0]["pond_code"], "P-01")
        self.assertEqual(
            payload["result"]["advice"][0]["evidence"][0]["fact_id"],
            "P1.water_availability",
        )
        self.assertIn("暂无最新水质读数", payload["result"]["advice"][0]["basis"])
        self.assertEqual(payload["usage"]["total_tokens"], 110)

    async def test_rejects_untrusted_organization_id(self) -> None:
        response = await self.client.post(
            "/api/v1/agent/farm-advice?organization_id=untrusted",
            headers={"Authorization": "Bearer user-token"},
        )

        self.assertEqual(response.status_code, 400)

    async def test_invalid_model_draft_returns_safe_fallback(self) -> None:
        app.dependency_overrides[get_model_provider] = lambda: InvalidModelProvider()

        response = await self.client.post(
            "/api/v1/agent/farm-advice",
            headers={"Authorization": "Bearer user-token"},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["generation_status"], "safe_fallback")
        self.assertEqual(len(payload["result"]["advice"]), 2)
        self.assertTrue(
            all(item["evidence"] for item in payload["result"]["advice"])
        )
        self.assertIn("确定性规则建议", payload["generation_note"])
        self.assertEqual(payload["usage"]["total_tokens"], 220)

    async def test_single_pond_advice_only_sends_selected_pond(self) -> None:
        provider = FakeModelProvider(
            {
                "advice": [
                    {
                        "pond_code": "P-02",
                        "priority": "高",
                        "category": "数据补全",
                        "title": "补采 P-02 水质",
                        "evidence_fact_ids": ["P1.water_availability"],
                        "actions": ["人工采集水质数据"],
                    }
                ]
            }
        )
        app.dependency_overrides[get_model_provider] = lambda: provider

        response = await self.client.post(
            f"/api/v1/agent/ponds/{POND_ID_2}/advice",
            headers={"Authorization": "Bearer user-token"},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["result"]["advice"][0]["pond_code"], "P-02")
        self.assertEqual(
            payload["result"]["advice"][0]["evidence"][0]["fact_id"],
            "P1.water_availability",
        )
        self.assertIn("P-02", provider.user_prompt)
        self.assertNotIn("P-01", provider.user_prompt)

    async def test_single_pond_advice_hides_inaccessible_target(self) -> None:
        response = await self.client.post(
            "/api/v1/agent/ponds/25f4249f-3cf5-4c28-8d4d-c94e575d87de/advice",
            headers={"Authorization": "Bearer user-token"},
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(self.provider.calls, 0)

    async def test_single_pond_advice_rejects_organization_id(self) -> None:
        response = await self.client.post(
            f"/api/v1/agent/ponds/{POND_ID}/advice?organization_id=untrusted",
            headers={"Authorization": "Bearer user-token"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.provider.calls, 0)


if __name__ == "__main__":
    unittest.main()
