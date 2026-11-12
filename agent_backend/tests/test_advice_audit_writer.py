"""专用可信审计追加组件测试。"""

import unittest
from datetime import UTC, datetime
from uuid import UUID

import httpx

from app.schemas.audit import AdviceAuditAppendRow
from app.services.advice_audit_writer import (
    AdviceAuditAppendError,
    AdviceAuditWriter,
)


def _row() -> AdviceAuditAppendRow:
    return AdviceAuditAppendRow(
        organization_id=UUID("1733849e-5607-449e-80b8-3d67733d9dbd"),
        pond_id=UUID("a2d89b5f-2f59-4573-9391-cfa6be64fa18"),
        endpoint="/api/v1/agent/farm-advice",
        requested_by_user_id=UUID("a2aab2a1-44ea-4c3c-9f58-f101cb177ce7"),
        request_id="a" * 32,
        model_name="deepseek-v4-flash",
        generation_status="model_generated",
        safe_fallback=False,
        prompt_tokens=80,
        completion_tokens=30,
        total_tokens=110,
        risk_level="预警",
        risk_score=70,
        fact_ids=["P1.metric.dissolved_oxygen"],
        result_payload={"advice": []},
        generated_at=datetime(2026, 8, 20, tzinfo=UTC),
        overview_generated_at=datetime(2026, 8, 20, tzinfo=UTC),
    )


class AdviceAuditWriterTests(unittest.IsolatedAsyncioTestCase):
    async def test_secret_can_only_append_to_fixed_audit_table(self) -> None:
        captured: list[httpx.Request] = []

        def handler(request: httpx.Request) -> httpx.Response:
            captured.append(request)
            return httpx.Response(201)

        writer = AdviceAuditWriter(
            base_url="https://project.supabase.co",
            secret_key="sb_secret_private",
            transport=httpx.MockTransport(handler),
        )
        self.addAsyncCleanup(writer.aclose)

        await writer.append([_row()])

        self.assertEqual(len(captured), 1)
        request = captured[0]
        self.assertEqual(request.method, "POST")
        self.assertEqual(request.url.path, "/rest/v1/ai_request_logs")
        self.assertEqual(request.headers["apikey"], "sb_secret_private")
        self.assertNotIn("authorization", request.headers)
        self.assertEqual(request.headers["prefer"], "return=minimal")
        self.assertNotIn(b"sb_secret_private", request.content)
        self.assertNotIn("sb_secret_private", repr(writer))

    async def test_failed_batch_insert_raises_safe_error(self) -> None:
        writer = AdviceAuditWriter(
            base_url="https://project.supabase.co",
            secret_key="sb_secret_private",
            transport=httpx.MockTransport(lambda _: httpx.Response(403)),
        )
        self.addAsyncCleanup(writer.aclose)

        with self.assertRaises(AdviceAuditAppendError) as context:
            await writer.append([_row()])

        self.assertNotIn("sb_secret_private", str(context.exception))


if __name__ == "__main__":
    unittest.main()
