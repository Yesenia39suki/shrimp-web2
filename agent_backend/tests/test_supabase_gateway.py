"""Supabase 网关安全边界测试。"""

import unittest
import asyncio
from datetime import date
from urllib.parse import parse_qs
from uuid import UUID

import httpx

from app.services.supabase_gateway import (
    SupabaseAuthenticationError,
    SupabaseGateway,
)

USER_ID = "a2aab2a1-44ea-4c3c-9f58-f101cb177ce7"
ORGANIZATION_ID = "1733849e-5607-449e-80b8-3d67733d9dbd"
POND_ID = "a2d89b5f-2f59-4573-9391-cfa6be64fa18"


class SupabaseGatewayTests(unittest.IsolatedAsyncioTestCase):
    async def test_valid_user_token_is_reused_for_rls_query(self) -> None:
        requested_paths: list[str] = []

        def handler(request: httpx.Request) -> httpx.Response:
            requested_paths.append(request.url.path)
            self.assertEqual(request.headers["apikey"], "publishable-key")
            self.assertEqual(request.headers["authorization"], "Bearer user-token")

            if request.url.path == "/auth/v1/user":
                return httpx.Response(200, json={"id": USER_ID, "email": "user@example.com"})

            self.assertEqual(request.url.path, "/rest/v1/ponds")
            query = parse_qs(request.url.query.decode())
            self.assertNotIn("organization_id", query)
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
                        "longitude": 120.1,
                        "latitude": 36.1,
                        "created_at": "2026-08-17T08:00:00Z",
                        "updated_at": "2026-08-17T08:00:00Z",
                    }
                ],
            )

        gateway = SupabaseGateway(
            base_url="https://project.supabase.co",
            publishable_key="publishable-key",
            transport=httpx.MockTransport(handler),
        )
        self.addAsyncCleanup(gateway.aclose)

        user = await gateway.verify_user("user-token")
        ponds = await gateway.list_accessible_ponds(
            user.access_token.get_secret_value()
        )

        self.assertEqual(user.user_id, UUID(USER_ID))
        self.assertEqual(len(ponds), 1)
        self.assertEqual(ponds[0].id, UUID(POND_ID))
        self.assertEqual(requested_paths, ["/auth/v1/user", "/rest/v1/ponds"])

    async def test_invalid_token_stops_before_pond_query(self) -> None:
        requested_paths: list[str] = []

        def handler(request: httpx.Request) -> httpx.Response:
            requested_paths.append(request.url.path)
            return httpx.Response(401, json={"message": "invalid token"})

        gateway = SupabaseGateway(
            base_url="https://project.supabase.co",
            publishable_key="publishable-key",
            transport=httpx.MockTransport(handler),
        )
        self.addAsyncCleanup(gateway.aclose)

        with self.assertRaises(SupabaseAuthenticationError):
            await gateway.verify_user("invalid-token")

        self.assertEqual(requested_paths, ["/auth/v1/user"])

    async def test_overview_queries_do_not_send_organization_filter(self) -> None:
        requested_tables: set[str] = set()

        def handler(request: httpx.Request) -> httpx.Response:
            query = parse_qs(request.url.query.decode())
            self.assertNotIn("organization_id", query)
            if request.url.path == "/rest/v1/shrimp_daily_stats":
                self.assertEqual(query["pond_id"], [f"eq.{POND_ID}"])
                self.assertEqual(query["limit"], ["1"])
            if request.url.path in {
                "/rest/v1/feeding_daily_stats",
                "/rest/v1/water_daily_stats",
            }:
                self.assertEqual(query["stat_date"], ["gte.2026-08-12"])
                self.assertEqual(
                    query["and"],
                    ["(stat_date.lte.2026-08-18)"],
                )
                self.assertEqual(query["pond_id"], [f"in.({POND_ID})"])
            if request.url.path in {
                "/rest/v1/devices",
                "/rest/v1/robot_status",
            }:
                self.assertEqual(query["pond_id"], [f"in.({POND_ID})"])
            requested_tables.add(request.url.path)
            return httpx.Response(200, json=[])

        gateway = SupabaseGateway(
            base_url="https://project.supabase.co",
            publishable_key="publishable-key",
            transport=httpx.MockTransport(handler),
        )
        self.addAsyncCleanup(gateway.aclose)

        await asyncio.gather(
            gateway.list_accessible_ponds("user-token"),
            gateway.list_accessible_water_latest("user-token"),
            gateway.list_accessible_water_thresholds("user-token"),
            gateway.list_accessible_active_alerts("user-token"),
            gateway.list_latest_shrimp_daily_stats(
                "user-token",
                [UUID(POND_ID)],
            ),
            gateway.list_accessible_feeding_daily_stats(
                "user-token",
                date(2026, 8, 12),
                date(2026, 8, 18),
                [UUID(POND_ID)],
            ),
            gateway.list_accessible_water_daily_stats(
                "user-token",
                date(2026, 8, 12),
                date(2026, 8, 18),
                [UUID(POND_ID)],
            ),
            gateway.list_accessible_devices(
                "user-token",
                [UUID(POND_ID)],
            ),
            gateway.list_accessible_robot_statuses(
                "user-token",
                [UUID(POND_ID)],
            ),
        )

        self.assertEqual(
            requested_tables,
            {
                "/rest/v1/ponds",
                "/rest/v1/water_latest",
                "/rest/v1/water_thresholds",
                "/rest/v1/alerts",
                "/rest/v1/shrimp_daily_stats",
                "/rest/v1/feeding_daily_stats",
                "/rest/v1/water_daily_stats",
                "/rest/v1/devices",
                "/rest/v1/robot_status",
            },
        )


if __name__ == "__main__":
    unittest.main()
