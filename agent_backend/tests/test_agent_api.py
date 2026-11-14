"""智能建议 API 测试。"""

import json
import unittest
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock

import httpx

from app.api.dependencies import (
    get_advice_audit_writer,
    get_model_provider,
    get_supabase_gateway,
    get_web_search,
)
from app.main import app
from app.schemas.audit import AdviceAuditAppendRow
from app.schemas.chat import ChatWebSource
from app.services.advice_audit_writer import AdviceAuditAppendError
from app.services.deepseek_search import SearchHit, WebSearchError
from app.services.model_provider import JsonCompletion, ModelUsage
from app.services.supabase_gateway import SupabaseGateway

USER_ID = "a2aab2a1-44ea-4c3c-9f58-f101cb177ce7"
ORGANIZATION_ID = "1733849e-5607-449e-80b8-3d67733d9dbd"
ORGANIZATION_ID_2 = "77dd90ed-0797-4a95-9fc5-7c254ea928bb"
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


class FakeAuditWriter:
    def __init__(self) -> None:
        self.rows: list[AdviceAuditAppendRow] = []

    async def append(self, rows: list[AdviceAuditAppendRow]) -> None:
        self.rows.extend(rows)


class FailingAuditWriter:
    async def append(self, _: list[AdviceAuditAppendRow]) -> None:
        raise AdviceAuditAppendError("test failure")


class AgentApiTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.organization_id_2 = ORGANIZATION_ID
        self.chat_history_pond = None
        self.water_readings: list[dict[str, object]] = []
        self.water_daily: list[dict[str, object]] = []
        self.active_alerts: list[dict[str, object]] = []
        self.thresholds_pond = POND_ID

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
                            "organization_id": self.organization_id_2,
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
                return httpx.Response(200, json=self.water_readings)
            if path == "/rest/v1/water_daily_stats":
                return httpx.Response(200, json=self.water_daily)
            if path == "/rest/v1/water_thresholds":
                return httpx.Response(
                    200,
                    json=[
                        {
                            "organization_id": ORGANIZATION_ID,
                            "pond_id": self.thresholds_pond,
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
                return httpx.Response(200, json=self.active_alerts)
            if path == "/rest/v1/ai_request_logs":
                self.assertEqual(request.headers["Authorization"], "Bearer user-token")
                self.chat_history_pond = request.url.params.get("pond_id")
                return httpx.Response(200, json=[])
            if path in {
                "/rest/v1/shrimp_daily_stats",
                "/rest/v1/feeding_daily_stats",
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
        app.dependency_overrides[get_web_search] = lambda: None
        self.audit_writer = FakeAuditWriter()
        app.dependency_overrides[get_advice_audit_writer] = lambda: self.audit_writer
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
        self.assertEqual(len(self.audit_writer.rows), 2)
        audit = self.audit_writer.rows[0]
        self.assertEqual(str(audit.organization_id), ORGANIZATION_ID)
        self.assertEqual(str(audit.requested_by_user_id), USER_ID)
        self.assertEqual(audit.record_source, "agent_backend")
        self.assertEqual(audit.fact_ids, ["P1.water_availability"])
        self.assertEqual(audit.generation_status, "model_generated")
        self.assertFalse(audit.safe_fallback)

    async def test_rejects_untrusted_organization_id(self) -> None:
        response = await self.client.post(
            "/api/v1/agent/farm-advice?organization_id=untrusted",
            headers={"Authorization": "Bearer user-token"},
        )

        self.assertEqual(response.status_code, 400)

    async def test_chat_answers_with_selected_pond_facts_and_follow_up(self) -> None:
        provider = FakeModelProvider({
            "kind": "pond", "answer": "模型编造的数值 99", "fact_ids": ["P1.water_availability"],
        })
        app.dependency_overrides[get_model_provider] = lambda: provider

        response = await self.client.post(
            "/api/v1/agent/chat",
            headers={"Authorization": "Bearer user-token"},
            json={"pond_id": POND_ID_2, "question": "那水质呢？", "recent_turns": [
                {"question": "风险怎么样？", "answer": "可以核对水质。"},
            ]},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("P-02 暂无最新水质读数", payload["answer"])
        self.assertEqual(payload["answer"], payload["evidence"][0]["statement"])
        self.assertIn("风险怎么样？", provider.user_prompt)
        self.assertNotIn("P-01", provider.user_prompt)
        self.assertEqual(self.chat_history_pond, f"eq.{POND_ID_2}")
        self.assertFalse(self.audit_writer.rows)

    async def test_chat_does_not_send_unavailable_pond_to_model(self) -> None:
        response = await self.client.post(
            "/api/v1/agent/chat",
            headers={"Authorization": "Bearer user-token"},
            json={"pond_id": "25f4249f-3cf5-4c28-8d4d-c94e575d87de", "question": "有什么异常？"},
        )

        self.assertEqual(response.status_code, 404)
        self.assertIsNone(self.chat_history_pond)
        self.assertEqual(self.provider.calls, 0)

    async def test_chat_discards_answer_with_unknown_fact(self) -> None:
        app.dependency_overrides[get_model_provider] = lambda: FakeModelProvider({
            "kind": "pond", "answer": "伪造的结果", "fact_ids": ["H999"],
        })
        response = await self.client.post(
            "/api/v1/agent/chat",
            headers={"Authorization": "Bearer user-token"},
            json={"pond_id": POND_ID, "question": "上一条建议是什么？"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["evidence"], [])
        self.assertNotIn("伪造的结果", response.json()["answer"])

    async def test_chat_lists_each_alert_and_stale_metric_with_distinct_actions(self) -> None:
        timestamp = "2026-08-19T03:48:07Z"
        self.thresholds_pond = POND_ID_2
        self.water_readings = [{
            "organization_id": ORGANIZATION_ID, "pond_id": POND_ID_2,
            "temperature": 38, "dissolved_oxygen": 10.5, "ph": 9.2, "orp": 480,
            "turbidity": 40, "ammonia": 0.8, "nitrite": 0.3, "hardness": 290,
            "recorded_at": timestamp, "updated_at": timestamp,
        }]
        self.active_alerts = [
            {
                "id": f"01900000-0000-4000-8000-00000000000{index}",
                "organization_id": ORGANIZATION_ID, "pond_id": POND_ID_2,
                "type": "water_quality", "level": "warning", "title": title,
                "content": "该指标超过配置上限。", "metric_key": metric_key,
                "current_value": value, "normal_range": normal_range,
                "read_status": "unread", "created_at": timestamp,
            }
            for index, (metric_key, title, value, normal_range) in enumerate([
                ("ph", "pH 异常", "9.2", "7 - 8.6"),
                ("oxygen", "溶解氧异常", "10.5 mg/L", "5 - 9 mg/L"),
            ], start=1)
        ]

        response = await self.client.post(
            "/api/v1/agent/chat",
            headers={"Authorization": "Bearer user-token"},
            json={"pond_id": POND_ID_2, "question": "根据当前池子，有什么推荐的意见建议"},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("2 条未处理报警，历史记录有 8 项越界", payload["answer"])
        self.assertIn("过期读数未用于当前水质评分", payload["answer"])
        items = payload["issues"]
        self.assertEqual(len(items), 11)
        self.assertEqual(items[0]["title"], "水质数据已过期")
        self.assertEqual([item["title"] for item in items[1:3]], ["pH 异常（偏高）", "溶解氧异常（偏高）"])
        self.assertEqual(items[1]["recorded_at"], timestamp)
        self.assertIn("总碱度", items[1]["actions"][1])
        self.assertIn("饱和度", items[2]["actions"][1])
        oxygen = next(item for item in items if item["id"] == "metric-dissolved_oxygen")
        ph = next(item for item in items if item["id"] == "metric-ph")
        self.assertIn("10.5mg/L", oxygen["trigger"])
        self.assertIn("差值 1.5mg/L", oxygen["trigger"])
        self.assertIn("现场复测", oxygen["actions"][0])
        self.assertIn("饱和度", oxygen["actions"][1])
        self.assertIn("总碱度", ph["actions"][1])
        self.assertTrue(all(item["impact"] and len(item["actions"]) >= 2 and item["verify"] for item in items))
        self.assertEqual(self.provider.calls, 1)

    async def test_chat_explains_confirmed_low_oxygen_with_follow_up_checks(self) -> None:
        timestamp = datetime.now(UTC).isoformat()
        self.water_readings = [{
            "organization_id": ORGANIZATION_ID, "pond_id": POND_ID,
            "temperature": 27, "dissolved_oxygen": 3.5, "ph": 8, "orp": 300,
            "turbidity": 20, "ammonia": 0.1, "nitrite": 0.05, "hardness": 180,
            "recorded_at": timestamp, "updated_at": timestamp,
        }]

        response = await self.client.post(
            "/api/v1/agent/chat",
            headers={"Authorization": "Bearer user-token"},
            json={"pond_id": POND_ID, "question": "当前池塘有哪些异常？逐条给出处理办法"},
        )

        self.assertEqual(response.status_code, 200)
        issues = response.json()["issues"]
        self.assertEqual(len(issues), 1)
        self.assertEqual(issues[0]["title"], "溶解氧偏低")
        self.assertEqual(issues[0]["status"], "有效读数越界")
        self.assertIn("备用增氧机", issues[0]["actions"][1])
        self.assertIn("复测", issues[0]["verify"])

    async def test_chat_combines_private_facts_with_public_reference(self) -> None:
        lookup = AsyncMock()
        lookup.search.return_value = [SearchHit(
            ChatWebSource(source_id="W1", title="公开水质指南", url="https://example.edu/water"),
            "养殖参考范围为 pH 7.5 至 8.5。",
        )]
        provider = AsyncMock()
        drafts = [
            {
                "kind": "pond", "answer": "养殖的是南美白对虾，目前缺少最新水质读数。",
                "fact_ids": ["P1.identity", "P1.water_availability"],
                "reference": "公开养殖参考范围为 pH 7.5 至 8.5。", "source_ids": ["W1"],
                "next_step": "先测量池水 pH 并记录，再判断是否需要调整。",
            },
        ]
        provider.complete_json.side_effect = [
            JsonCompletion("deepseek-v4-pro", draft, ModelUsage(20, 10, 30)) for draft in drafts
        ]
        app.dependency_overrides[get_model_provider] = lambda: provider
        app.dependency_overrides[get_web_search] = lambda: lookup

        response = await self.client.post(
            "/api/v1/agent/chat", headers={"Authorization": "Bearer user-token"},
            json={"pond_id": POND_ID, "question": "P-01 是什么虾，一般推荐酸碱度是多少？"},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("公开参考", payload["answer"])
        self.assertIn("pH 7.5 至 8.5", payload["answer"])
        self.assertIn("先测量池水", payload["answer"])
        self.assertEqual(payload["sources"][0]["url"], "https://example.edu/water")
        self.assertEqual(len(payload["evidence"]), 2)
        lookup.search.assert_awaited_once()
        self.assertNotIn("P-01", lookup.search.call_args.args[0])

    async def test_chat_reads_daily_maximum_and_resolves_temperature_follow_up(self) -> None:
        day = (datetime.now(UTC) - timedelta(days=12)).date().isoformat()
        self.water_daily = [{
            "organization_id": ORGANIZATION_ID, "pond_id": POND_ID, "stat_date": day,
            "avg_temperature": 31.2, "max_temperature": 36.8, "min_temperature": 25,
            "warning_count": 0, "reading_count": 7, "status": "稳定",
        }]
        headers = {"Authorization": "Bearer user-token"}
        first = await self.client.post("/api/v1/agent/chat", headers=headers, json={
            "pond_id": POND_ID, "question": "最高温是多少",
        })
        self.assertEqual(first.status_code, 200)
        self.assertIn("36.8℃", first.json()["answer"])
        self.assertIn(day, first.json()["answer"])
        self.assertNotIn("31.2", first.json()["answer"])
        self.assertEqual(self.provider.calls, 0)
        search = AsyncMock()
        search.search.return_value = [SearchHit(
            ChatWebSource(source_id="W1", title="高温期养殖指引", url="https://example.edu/heat"),
            "高温期要关注底层缺氧。有遮阴设施可减少午后直晒。",
        )]
        provider = FakeModelProvider({
            "kind": "pond", "answer": "最高水温记录是 36.8℃。",
            "fact_ids": ["P1.water.temperature.max"], "source_ids": ["W1"],
            "reference": "高温时要留意底层缺氧。", "next_step": "若复测仍高，先检查底层溶氧，恢复水体循环，再用现有遮阴设施减轻午后温升。",
        })
        app.dependency_overrides[get_web_search] = lambda: search
        app.dependency_overrides[get_model_provider] = lambda: provider
        follow_up = await self.client.post("/api/v1/agent/chat", headers=headers, json={
            "pond_id": POND_ID, "question": "针对这种情况，有什么解决方案吗",
            "recent_turns": [{"question": "最高温是多少", "answer": first.json()["answer"]}],
        })
        self.assertEqual(follow_up.status_code, 200)
        self.assertIn("遮阴", follow_up.json()["answer"])
        self.assertIn("水温", search.search.call_args.args[0])
        self.assertNotIn("36.8", search.search.call_args.args[0])
        self.assertEqual(provider.calls, 1)
        context = json.loads(provider.user_prompt)
        self.assertEqual(context["primary_topics"], ["temperature"])
        self.assertEqual(context["follow_up_topic"], "最高温是多少")

    async def test_ph_action_keeps_both_branches_when_model_only_suggests_monitoring(self) -> None:
        search = AsyncMock()
        search.search.return_value = [SearchHit(
            ChatWebSource(source_id="W1", title="水质指引", url="https://example.edu/pond"),
            "对虾池 pH 在白天受藻类光合作用影响，也应测总碱度。",
        )]
        app.dependency_overrides[get_web_search] = lambda: search
        app.dependency_overrides[get_model_provider] = lambda: FakeModelProvider({
            "kind": "pond", "answer": "没有最新读数。", "fact_ids": ["P1.water_availability"],
            "reference": "藻类光合作用可能推高午后 pH。", "source_ids": ["W1"],
            "next_step": "建议监测水质。",
        })
        reply = await self.client.post("/api/v1/agent/chat", headers={"Authorization": "Bearer user-token"}, json={
            "pond_id": POND_ID, "question": "pH偏高偏低怎么办？结合 P-01 的数据",
        })
        self.assertEqual(reply.status_code, 200)
        answer = reply.json()["answer"]
        for point in ("pH偏高", "pH偏低", "暂停施肥", "小样试验", "总碱度"):
            self.assertIn(point, answer)
        self.assertEqual(reply.json()["sources"][0]["source_id"], "W1")
        self.assertNotIn("P-01", search.search.call_args.args[0])

    async def test_chat_replaces_unsupported_feeding_dosage_with_observed_actions(self) -> None:
        app.dependency_overrides[get_model_provider] = lambda: FakeModelProvider({
            "kind": "pond", "answer": "今晚建议投喂正常量的五到七成。只投平时一半。", "fact_ids": ["P1.water_availability"],
            "next_step": "下一餐减量 15%。",
        })
        reply = await self.client.post("/api/v1/agent/chat", headers={"Authorization": "Bearer user-token"}, json={
            "pond_id": POND_ID, "question": "虾吃料突然变少，今晚怎么投喂？",
        })
        self.assertEqual(reply.status_code, 200)
        answer = reply.json()["answer"]
        self.assertNotIn("五到七成", answer)
        self.assertNotIn("一半", answer)
        self.assertNotIn("15%", answer)
        self.assertIn("料台", answer)
        self.assertIn("缺氧", answer)

    async def test_chat_rejects_private_search_query(self) -> None:
        lookup = AsyncMock()
        app.dependency_overrides[get_web_search] = lambda: lookup
        app.dependency_overrides[get_model_provider] = lambda: FakeModelProvider({
            "kind": "pond", "fact_ids": ["P1.identity"], "search_query": "P-01 pH",
        })
        response = await self.client.post(
            "/api/v1/agent/chat", headers={"Authorization": "Bearer user-token"},
            json={"pond_id": POND_ID, "question": "联网查 P-01"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["sources"], [])
        self.assertIsNotNone(response.json()["search_note"])
        lookup.search.assert_not_awaited()

    async def test_chat_preserves_pond_answer_when_search_fails(self) -> None:
        lookup = AsyncMock()
        lookup.search.side_effect = WebSearchError("test failure")
        app.dependency_overrides[get_web_search] = lambda: lookup
        app.dependency_overrides[get_model_provider] = lambda: FakeModelProvider({
            "kind": "pond", "answer": "池塘暂无最新水质读数。", "fact_ids": ["P1.water_availability"],
            "search_query": "南美白对虾 pH 参考范围",
        })
        response = await self.client.post(
            "/api/v1/agent/chat", headers={"Authorization": "Bearer user-token"},
            json={"pond_id": POND_ID, "question": "当前水质和行业参考范围是什么？"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["answer"], "池塘暂无最新水质读数。")
        self.assertEqual(response.json()["sources"], [])
        self.assertIn("暂时无法获取", response.json()["search_note"])

    async def test_public_ph_question_and_search_retry_use_the_same_public_topic(self) -> None:
        lookup = AsyncMock()
        lookup.search.return_value = [SearchHit(
            ChatWebSource(source_id="W1", title="对虾养殖技术", url="https://example.edu/water"),
            "南美白对虾在 pH７．５～８．５ 的弱碱性水中生长较好。",
        )]
        provider = AsyncMock()
        app.dependency_overrides[get_model_provider] = lambda: provider
        app.dependency_overrides[get_web_search] = lambda: lookup
        question = "南美白对虾一般生长在酸碱度多少的水里面最好"
        headers = {"Authorization": "Bearer user-token"}
        first = await self.client.post(
            "/api/v1/agent/chat", headers=headers, json={"pond_id": POND_ID, "question": question},
        )
        self.assertEqual(first.status_code, 200)
        second = await self.client.post(
            "/api/v1/agent/chat", headers=headers, json={
                "pond_id": POND_ID, "question": "你不是能联网搜索？",
                "recent_turns": [{"question": question, "answer": first.json()["answer"]}],
            },
        )
        self.assertEqual(second.status_code, 200)
        for response in (first, second):
            self.assertIn("pH 参考范围为 7.5～8.5", response.json()["answer"])
            self.assertNotIn("9.9", response.json()["answer"])
            self.assertEqual(response.json()["sources"][0]["source_id"], "W1")
            self.assertEqual(response.json()["evidence"], [])
            self.assertIsNone(response.json()["search_note"])
        self.assertEqual(lookup.search.await_count, 2)
        self.assertEqual(lookup.search.await_args_list[0], lookup.search.await_args_list[1])
        self.assertIn("南美白对虾", lookup.search.call_args.args[0])
        self.assertNotIn("P-01", lookup.search.call_args.args[0])
        provider.complete_json.assert_not_awaited()

    async def test_chat_accepts_all_retrieved_source_ids(self) -> None:
        lookup = AsyncMock()
        lookup.search.return_value = [
            SearchHit(
                ChatWebSource(source_id=f"W{index}", title="养殖记录指南", url=f"https://example.edu/guide/{index}"),
                "示例要求观察 15 分钟并记录水温。",
            )
            for index in range(1, 7)
        ]
        provider = AsyncMock()
        provider.complete_json.side_effect = [
            JsonCompletion("deepseek-v4-pro", draft, ModelUsage(20, 10, 30))
            for draft in [
                {"kind": "knowledge", "search_query": "养殖记录 指南"},
                {
                    "kind": "knowledge", "reference": "W6 的记录示例要求观察 15 分钟并记录水温。",
                    "source_ids": [f"W{index}" for index in range(1, 7)],
                },
            ]
        ]
        app.dependency_overrides[get_model_provider] = lambda: provider
        app.dependency_overrides[get_web_search] = lambda: lookup
        response = await self.client.post(
            "/api/v1/agent/chat", headers={"Authorization": "Bearer user-token"},
            json={"pond_id": POND_ID, "question": "请联网搜索养殖记录的写法"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("观察 15 分钟", response.json()["answer"])
        self.assertEqual(len(response.json()["sources"]), 6)
        self.assertIsNone(response.json()["search_note"])

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
        self.assertEqual(len(self.audit_writer.rows), 2)
        self.assertTrue(self.audit_writer.rows[0].safe_fallback)
        self.assertEqual(
            self.audit_writer.rows[0].generation_status,
            "safe_fallback",
        )

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
        self.assertEqual(len(self.audit_writer.rows), 1)
        self.assertEqual(str(self.audit_writer.rows[0].pond_id), POND_ID_2)
        self.assertEqual(
            self.audit_writer.rows[0].endpoint,
            "/api/v1/agent/pond-advice",
        )

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

    async def test_audit_failure_does_not_return_unrecorded_advice(self) -> None:
        app.dependency_overrides[get_advice_audit_writer] = lambda: FailingAuditWriter()

        response = await self.client.post(
            "/api/v1/agent/farm-advice",
            headers={"Authorization": "Bearer user-token"},
        )

        self.assertEqual(response.status_code, 502)
        self.assertEqual(
            response.json()["detail"],
            "建议已生成，但可信审计记录保存失败。",
        )

    async def test_multi_organization_audit_does_not_copy_global_content(self) -> None:
        self.organization_id_2 = ORGANIZATION_ID_2
        app.dependency_overrides[get_model_provider] = lambda: FakeModelProvider(
            {
                "advice": [
                    {
                        "pond_code": None,
                        "priority": "中",
                        "category": "常规巡检",
                        "title": "记录场级池塘数量",
                        "evidence_fact_ids": ["G.pond_count"],
                        "actions": ["记录当前可见池塘数量"],
                    }
                ]
            }
        )

        response = await self.client.post(
            "/api/v1/agent/farm-advice",
            headers={"Authorization": "Bearer user-token"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(self.audit_writer.rows), 2)
        for row in self.audit_writer.rows:
            self.assertEqual(row.fact_ids, [])
            self.assertEqual(row.result_payload["advice"], [])


if __name__ == "__main__":
    unittest.main()
