"""HTTP 请求追踪与缓存安全头测试。"""

import re
import unittest

import httpx

from app.main import app


class HttpMiddlewareTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://testserver",
        )

    async def asyncTearDown(self) -> None:
        await self.client.aclose()

    async def test_response_has_server_request_id_and_no_store(self) -> None:
        response = await self.client.get("/api/v1/health")

        self.assertEqual(response.status_code, 200)
        self.assertRegex(response.headers["x-request-id"], re.compile(r"^[0-9a-f]{32}$"))
        self.assertEqual(response.headers["cache-control"], "no-store")
        self.assertEqual(response.headers["x-content-type-options"], "nosniff")


if __name__ == "__main__":
    unittest.main()
