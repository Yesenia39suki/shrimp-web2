"""池塘测试接口的认证与响应测试。"""

import unittest

import httpx

from app.api.dependencies import get_supabase_gateway
from app.main import app
from app.services.supabase_gateway import SupabaseGateway

USER_ID = "a2aab2a1-44ea-4c3c-9f58-f101cb177ce7"
ORGANIZATION_ID = "1733849e-5607-449e-80b8-3d67733d9dbd"
POND_ID = "a2d89b5f-2f59-4573-9391-cfa6be64fa18"


class PondsApiTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        def supabase_handler(request: httpx.Request) -> httpx.Response:
            if request.url.path == "/auth/v1/user":
                return httpx.Response(200, json={"id": USER_ID, "email": "user@example.com"})
            if request.url.path == "/rest/v1/ponds":
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
            return httpx.Response(404)

        self.gateway = SupabaseGateway(
            base_url="https://project.supabase.co",
            publishable_key="publishable-key",
            transport=httpx.MockTransport(supabase_handler),
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

    async def test_missing_bearer_token_returns_401(self) -> None:
        response = await self.client.get("/api/v1/ponds")

        self.assertEqual(response.status_code, 401)

    async def test_valid_token_returns_rls_visible_ponds(self) -> None:
        response = await self.client.get(
            "/api/v1/ponds",
            headers={"Authorization": "Bearer user-token"},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["id"], POND_ID)
        self.assertEqual(payload[0]["organization_id"], ORGANIZATION_ID)

    async def test_untrusted_organization_id_is_rejected(self) -> None:
        response = await self.client.get(
            "/api/v1/ponds?organization_id=untrusted-value",
            headers={"Authorization": "Bearer user-token"},
        )

        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
