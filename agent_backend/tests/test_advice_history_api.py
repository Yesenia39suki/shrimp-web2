"""Agent 建议历史的 JWT + RLS 查询边界测试。"""

import unittest
from urllib.parse import parse_qs

import httpx

from app.api.dependencies import get_supabase_gateway
from app.main import app
from app.services.supabase_gateway import SupabaseGateway

USER_ID = "a2aab2a1-44ea-4c3c-9f58-f101cb177ce7"
ORGANIZATION_ID = "1733849e-5607-449e-80b8-3d67733d9dbd"
POND_ID = "a2d89b5f-2f59-4573-9391-cfa6be64fa18"
AUDIT_ID_1 = "55de8d29-4f17-4988-af8c-381753a56b70"
AUDIT_ID_2 = "27ea228a-b6bd-468f-b4f3-32ac66b24482"


def _audit_row(audit_id: str, generated_at: str) -> dict[str, object]:
    return {
        "id": audit_id,
        "organization_id": ORGANIZATION_ID,
        "pond_id": POND_ID,
        "requested_by_user_id": USER_ID,
        "request_id": "b" * 32,
        "endpoint": "/api/v1/agent/farm-advice",
        "model_name": "deepseek-v4-flash",
        "generation_status": "model_generated",
        "safe_fallback": False,
        "prompt_tokens": 80,
        "completion_tokens": 30,
        "total_tokens": 110,
        "risk_level": "预警",
        "risk_score": 70,
        "fact_ids": ["P1.metric.dissolved_oxygen"],
        "result_payload": {"advice": []},
        "generation_note": None,
        "generated_at": generated_at,
        "overview_generated_at": "2026-08-20T01:59:00Z",
        "created_at": generated_at,
    }


class AdviceHistoryApiTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.audit_queries: list[dict[str, list[str]]] = []

        def handler(request: httpx.Request) -> httpx.Response:
            self.assertEqual(request.headers["apikey"], "publishable-key")
            self.assertEqual(request.headers["authorization"], "Bearer user-token")
            if request.url.path == "/auth/v1/user":
                return httpx.Response(200, json={"id": USER_ID})
            if request.url.path == "/rest/v1/ai_request_logs":
                query = parse_qs(request.url.query.decode())
                self.audit_queries.append(query)
                self.assertNotIn("organization_id", query)
                self.assertEqual(query["record_source"], ["eq.agent_backend"])
                if "id" in query:
                    if query["id"] == [f"eq.{AUDIT_ID_1}"]:
                        return httpx.Response(
                            200,
                            json=[_audit_row(AUDIT_ID_1, "2026-08-20T02:00:00Z")],
                        )
                    return httpx.Response(200, json=[])
                return httpx.Response(
                    200,
                    json=[
                        _audit_row(AUDIT_ID_1, "2026-08-20T02:00:00Z"),
                        _audit_row(AUDIT_ID_2, "2026-08-20T01:00:00Z"),
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

    async def test_history_uses_user_jwt_rls_and_cursor_pagination(self) -> None:
        response = await self.client.get(
            "/api/v1/agent/advice-history",
            params={"pond_id": POND_ID, "limit": 1},
            headers={"Authorization": "Bearer user-token"},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload["items"]), 1)
        self.assertIsNotNone(payload["next_cursor"])
        self.assertEqual(self.audit_queries[0]["pond_id"], [f"eq.{POND_ID}"])
        self.assertEqual(self.audit_queries[0]["limit"], ["2"])

        second = await self.client.get(
            "/api/v1/agent/advice-history",
            params={"limit": 1, "cursor": payload["next_cursor"]},
            headers={"Authorization": "Bearer user-token"},
        )
        self.assertEqual(second.status_code, 200)
        self.assertIn("or", self.audit_queries[1])

    async def test_history_rejects_untrusted_organization_filter(self) -> None:
        response = await self.client.get(
            "/api/v1/agent/advice-history?organization_id=forged",
            headers={"Authorization": "Bearer user-token"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(len(self.audit_queries), 0)

    async def test_detail_returns_visible_row_and_hides_missing_row(self) -> None:
        visible = await self.client.get(
            f"/api/v1/agent/advice-history/{AUDIT_ID_1}",
            headers={"Authorization": "Bearer user-token"},
        )
        hidden = await self.client.get(
            f"/api/v1/agent/advice-history/{AUDIT_ID_2}",
            headers={"Authorization": "Bearer user-token"},
        )

        self.assertEqual(visible.status_code, 200)
        self.assertEqual(hidden.status_code, 404)


if __name__ == "__main__":
    unittest.main()
