"""养殖建议事实绑定、数据最小化与安全边界测试。"""

import unittest
from datetime import UTC, datetime
from uuid import UUID

from app.agents.farm_advisor import (
    EvidenceFact,
    _without_terminal_punctuation,
    generate_farm_advice,
)
from app.schemas.farm import FarmOverviewResponse
from app.services.model_provider import JsonCompletion, ModelUsage

USER_ID = UUID("a2aab2a1-44ea-4c3c-9f58-f101cb177ce7")
ORGANIZATION_ID = "1733849e-5607-449e-80b8-3d67733d9dbd"
POND_ID = "a2d89b5f-2f59-4573-9391-cfa6be64fa18"

VALID_DRAFT = {
    "advice": [
        {
            "pond_code": "P-01",
            "priority": "高",
            "category": "数据补全",
            "title": "补采水质数据",
            "evidence_fact_ids": [
                "P1.water_availability",
                "P1.risk",
            ],
            "actions": ["安排人工采样并核对现有监测链路"],
        }
    ]
}


class CapturingProvider:
    def __init__(self, content: dict[str, object] | None = None) -> None:
        self.content = content or VALID_DRAFT
        self.system_prompt = ""
        self.user_prompt = ""
        self.user_id = ""

    async def complete_json(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        user_id: str,
    ) -> JsonCompletion:
        self.system_prompt = system_prompt
        self.user_prompt = user_prompt
        self.user_id = user_id
        return JsonCompletion(
            model="deepseek-v4-flash",
            content=self.content,
            usage=ModelUsage(100, 50, 150),
        )


class SequenceProvider:
    def __init__(self, contents: list[dict[str, object]]) -> None:
        self.contents = contents
        self.prompts: list[str] = []

    async def complete_json(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        user_id: str,
    ) -> JsonCompletion:
        _ = (system_prompt, user_id)
        self.prompts.append(user_prompt)
        content = self.contents[len(self.prompts) - 1]
        return JsonCompletion(
            model="deepseek-v4-flash",
            content=content,
            usage=ModelUsage(100, 50, 150),
        )


def make_overview(
    *,
    with_stats: bool = False,
    with_operational_data: bool = False,
) -> FarmOverviewResponse:
    return FarmOverviewResponse.model_validate(
        {
            "generated_at": datetime(2026, 8, 18, tzinfo=UTC),
            "organization_ids": [ORGANIZATION_ID],
            "total_ponds": 1,
            "attention_ponds": 1,
            "normal_ponds": 0,
            "data_insufficient_ponds": 1,
            "water_trend_data_ponds": 1 if with_operational_data else 0,
            "shrimp_data_ponds": 1 if with_stats else 0,
            "feeding_data_ponds": 1 if with_stats else 0,
            "equipment_data_ponds": 1 if with_operational_data else 0,
            "ponds": [
                {
                    "pond": {
                        "id": POND_ID,
                        "organization_id": ORGANIZATION_ID,
                        "pond_code": "P-01",
                        "pond_name": "新增养殖池 1",
                        "shrimp_species": "南美白对虾",
                        "area_mu": 20,
                        "water_depth_m": 1.5,
                        "location": "未设置",
                        "longitude": None,
                        "latitude": None,
                        "created_at": "2026-08-14T08:54:28Z",
                        "updated_at": "2026-08-14T08:54:28Z",
                    },
                    "latest_water": None,
                    "recent_water": (
                        {
                            "period_start": "2026-08-12",
                            "period_end": "2026-08-18",
                            "days_with_records": 2,
                            "total_readings": 4,
                            "total_warnings": 1,
                            "latest_stat_date": "2026-08-18",
                            "latest_status": "预警",
                            "temperature_change": 0.5,
                            "dissolved_oxygen_change": -0.2,
                            "ph_change": 0.1,
                            "daily": [
                                {
                                    "stat_date": "2026-08-17",
                                    "avg_temperature": 27.5,
                                    "avg_dissolved_oxygen": 7,
                                    "avg_ph": 7.7,
                                    "warning_count": 0,
                                    "reading_count": 2,
                                    "status": "稳定",
                                },
                                {
                                    "stat_date": "2026-08-18",
                                    "avg_temperature": 28,
                                    "avg_dissolved_oxygen": 6.8,
                                    "avg_ph": 7.8,
                                    "warning_count": 1,
                                    "reading_count": 2,
                                    "status": "预警",
                                },
                            ],
                        }
                        if with_operational_data
                        else None
                    ),
                    "latest_shrimp": (
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
                        if with_stats
                        else None
                    ),
                    "recent_feeding": (
                        {
                            "period_start": "2026-08-12",
                            "period_end": "2026-08-18",
                            "days_with_records": 2,
                            "total_feed_kg": 54,
                            "feeding_count": 6,
                            "robot_feeding_count": 5,
                            "manual_feeding_count": 1,
                            "average_per_recorded_day_kg": 27,
                            "average_per_feeding_kg": 9,
                            "latest_feeding_date": "2026-08-18",
                        }
                        if with_stats
                        else None
                    ),
                    "equipment": (
                        {
                            "device_count": 2,
                            "device_type_counts": {
                                "water_sensor": 1,
                                "aerator": 1,
                            },
                            "device_status_counts": {
                                "online": 1,
                                "fault": 1,
                            },
                            "latest_device_heartbeat_at": "2026-08-18T08:00:00Z",
                            "heartbeat_tracked_device_count": 2,
                            "lost_connection_device_count": 1,
                            "unknown_heartbeat_device_count": 0,
                            "heartbeat_stale_after_minutes": 30,
                            "robot_status_count": 1,
                            "online_robot_count": 0,
                            "fault_robot_count": 1,
                            "robot_work_mode_counts": {"fault": 1},
                            "minimum_robot_battery": 18,
                            "latest_robot_status_at": "2026-08-18T08:02:00Z",
                            "requires_attention": True,
                        }
                        if with_operational_data
                        else None
                    ),
                    "metrics": [],
                    "active_alerts": [],
                    "risk": {
                        "risk_score": None,
                        "risk_level": "数据不足",
                        "water_risk_score": None,
                        "alert_risk_score": 0,
                        "requires_attention": True,
                        "data_complete": False,
                        "abnormal_metrics": [],
                        "missing_metrics": ["温度"],
                        "active_alert_count": 0,
                        "highest_alert_level": None,
                        "reasons": ["暂无最新水质数据"],
                    },
                    "summary": "暂无最新水质数据",
                }
            ],
            "global_alerts": [],
        }
    )


def make_abnormal_water_overview() -> FarmOverviewResponse:
    payload = make_overview().model_dump(mode="json")
    payload.update(
        {
            "normal_ponds": 0,
            "data_insufficient_ponds": 0,
        }
    )
    pond = payload["ponds"][0]
    pond["latest_water"] = {
        "organization_id": ORGANIZATION_ID,
        "pond_id": POND_ID,
        "reading_id": None,
        "temperature": 18,
        "dissolved_oxygen": 3.5,
        "ph": 6.5,
        "orp": 200,
        "turbidity": 5,
        "ammonia": 0.02,
        "nitrite": 0.01,
        "hardness": 90,
        "recorded_at": "2026-08-18T07:30:00Z",
        "updated_at": "2026-08-18T07:30:00Z",
    }
    pond["metrics"] = [
        {
            "key": "dissolved_oxygen",
            "label": "溶解氧",
            "unit": "mg/L",
            "value": 3.5,
            "minimum": 5,
            "maximum": 9,
            "status": "偏低",
        },
        {
            "key": "ph",
            "label": "pH",
            "unit": "",
            "value": 6.5,
            "minimum": 7,
            "maximum": 8.6,
            "status": "偏低",
        },
    ]
    pond["risk"] = {
        "risk_score": 56,
        "risk_level": "预警",
        "water_risk_score": 28,
        "alert_risk_score": 56,
        "requires_attention": True,
        "data_complete": True,
        "water_data_stale": False,
        "water_age_hours": 0.5,
        "water_stale_after_hours": 24,
        "abnormal_metrics": ["溶解氧", "pH"],
        "missing_metrics": [],
        "active_alert_count": 2,
        "highest_alert_level": "warning",
        "reasons": ["水质异常项：溶解氧、pH", "当前未解决报警 2 条"],
    }
    pond["summary"] = "水质异常项：溶解氧、pH；当前未解决报警 2 条"
    return FarmOverviewResponse.model_validate(payload)


class FarmAdvisorTests(unittest.IsolatedAsyncioTestCase):
    def test_removes_terminal_punctuation_before_fact_composition(self) -> None:
        self.assertEqual(
            _without_terminal_punctuation("溶解氧超出阈值。。； "),
            "溶解氧超出阈值",
        )

    def test_bounds_untrusted_fact_text(self) -> None:
        fact = EvidenceFact("P1.alert.1", "恶意或异常长文本\n" + "指令" * 300)

        self.assertLessEqual(len(fact.statement), 480)
        self.assertNotIn("\n", fact.statement)

    async def test_minimizes_context_and_expands_server_evidence(self) -> None:
        provider = CapturingProvider()

        response = await generate_farm_advice(
            overview=make_overview(),
            user_id=USER_ID,
            provider=provider,
        )

        self.assertNotIn(ORGANIZATION_ID, provider.user_prompt)
        self.assertNotIn(POND_ID, provider.user_prompt)
        self.assertNotIn(str(USER_ID), provider.user_prompt)
        self.assertNotIn("新增养殖池 1", provider.user_prompt)
        self.assertNotIn("未设置", provider.user_prompt)
        self.assertNotIn("G.context.shrimp", provider.user_prompt)
        self.assertNotIn("G.context.feeding", provider.user_prompt)
        self.assertNotIn("G.context.equipment", provider.user_prompt)
        self.assertIn("pond_domain_constraints", provider.user_prompt)
        self.assertIn("prohibited_topics_in_title_and_actions", provider.user_prompt)
        self.assertNotEqual(provider.user_id, str(USER_ID))
        self.assertTrue(provider.user_id.startswith("shrimp_"))

        advice = response.result.advice[0]
        self.assertEqual(advice.pond_code, "P-01")
        self.assertEqual(advice.evidence[0].fact_id, "P1.water_availability")
        self.assertIn("暂无最新水质读数", advice.basis)
        self.assertEqual(
            response.result.overall_assessment,
            "当前用户可见 1 个池塘，其中 1 个需要关注，1 个存在数据不足。",
        )
        self.assertTrue(
            any("绑定设备或机器人状态" in item for item in response.result.limitations)
        )
        self.assertEqual(response.usage.total_tokens, 150)

    async def test_exposes_available_shrimp_and_feeding_facts(self) -> None:
        provider = CapturingProvider(
            {
                "advice": [
                    {
                        "pond_code": "P-01",
                        "priority": "中",
                        "category": "常规巡检",
                        "title": "复核虾群与投喂趋势",
                        "evidence_fact_ids": [
                            "P1.shrimp.latest",
                            "P1.feeding.recent",
                        ],
                        "actions": ["结合现场观察复核虾群采样与近期投喂趋势"],
                    }
                ]
            }
        )

        response = await generate_farm_advice(
            overview=make_overview(with_stats=True),
            user_id=USER_ID,
            provider=provider,
        )

        self.assertIn("P1.shrimp.latest", provider.user_prompt)
        self.assertIn("P1.feeding.recent", provider.user_prompt)
        self.assertNotIn("P-01 的虾群最新统计", provider.user_prompt)
        self.assertNotIn("P-01 的最近 7 天投喂统计", provider.user_prompt)
        self.assertFalse(
            any("尚无可用于本次分析的虾群" in item for item in response.result.limitations)
        )
        self.assertFalse(
            any(
                "最近 7 天无可用于本次分析的投喂统计" in item
                for item in response.result.limitations
            )
        )
        self.assertTrue(
            any("不能生成精确投喂量" in item for item in response.result.limitations)
        )

    async def test_exposes_water_trend_and_device_facts(self) -> None:
        provider = CapturingProvider(
            {
                "advice": [
                    {
                        "pond_code": "P-01",
                        "priority": "高",
                        "category": "常规巡检",
                        "title": "复核设备运行状态",
                        "evidence_fact_ids": [
                            "P1.water.recent",
                            "P1.equipment",
                        ],
                        "actions": ["按既有流程人工复核故障设备连接与机器人状态"],
                    }
                ]
            }
        )

        response = await generate_farm_advice(
            overview=make_overview(with_operational_data=True),
            user_id=USER_ID,
            provider=provider,
        )

        self.assertIn("P1.water.recent", provider.user_prompt)
        self.assertIn("P1.equipment", provider.user_prompt)
        self.assertNotIn(ORGANIZATION_ID, provider.user_prompt)
        self.assertNotIn(POND_ID, provider.user_prompt)
        self.assertFalse(
            any("水质日统计" in item for item in response.result.limitations)
        )
        self.assertFalse(
            any("绑定设备或机器人状态" in item for item in response.result.limitations)
        )
        self.assertIn("故障 1", response.result.advice[0].basis)
        self.assertIn("判定失联的设备 1 个", response.result.advice[0].basis)

    async def test_unknown_evidence_falls_back_to_safe_result(self) -> None:
        provider = CapturingProvider(
            {
                "advice": [
                    {
                        **VALID_DRAFT["advice"][0],
                        "evidence_fact_ids": ["P1.fact.not_exists"],
                    }
                ]
            }
        )

        response = await generate_farm_advice(
            overview=make_overview(),
            user_id=USER_ID,
            provider=provider,
        )

        self.assertEqual(response.generation_status, "safe_fallback")
        self.assertTrue(response.result.advice)
        self.assertEqual(
            response.result.advice[0].evidence[0].fact_id,
            "P1.risk",
        )
        self.assertIn("不存在的事实编号", response.generation_note or "")
        self.assertIn("确定性规则建议", response.generation_note or "")

    async def test_safe_fallback_returns_grounded_water_advice(self) -> None:
        provider = CapturingProvider(
            {
                "advice": [
                    {
                        **VALID_DRAFT["advice"][0],
                        "evidence_fact_ids": ["P1.not_exists"],
                    }
                ]
            }
        )

        response = await generate_farm_advice(
            overview=make_abnormal_water_overview(),
            user_id=USER_ID,
            provider=provider,
        )

        self.assertEqual(response.generation_status, "safe_fallback")
        self.assertEqual(len(response.result.advice), 1)
        advice = response.result.advice[0]
        self.assertEqual(advice.category, "水质")
        self.assertEqual(
            [evidence.fact_id for evidence in advice.evidence],
            ["P1.risk", "P1.metric.dissolved_oxygen", "P1.metric.ph"],
        )
        action_text = "；".join(advice.actions)
        self.assertNotRegex(action_text, r"设备|传感器|增氧机|虾群|投喂|饲料")

    async def test_empty_model_advice_for_attention_uses_rule_fallback(self) -> None:
        provider = CapturingProvider({"advice": []})

        response = await generate_farm_advice(
            overview=make_abnormal_water_overview(),
            user_id=USER_ID,
            provider=provider,
        )

        self.assertEqual(response.generation_status, "safe_fallback")
        self.assertTrue(response.result.advice)
        self.assertIn("不能返回空建议", response.generation_note or "")

    async def test_deduplicates_repeated_model_advice(self) -> None:
        provider = CapturingProvider(
            {
                "advice": [
                    VALID_DRAFT["advice"][0],
                    VALID_DRAFT["advice"][0],
                ]
            }
        )

        response = await generate_farm_advice(
            overview=make_overview(),
            user_id=USER_ID,
            provider=provider,
        )

        self.assertEqual(len(response.result.advice), 1)

    async def test_repairs_one_failed_grounding_attempt(self) -> None:
        provider = SequenceProvider(
            [
                {
                    "advice": [
                        {
                            **VALID_DRAFT["advice"][0],
                            "evidence_fact_ids": ["P1.unknown"],
                        }
                    ]
                },
                VALID_DRAFT,
            ]
        )

        response = await generate_farm_advice(
            overview=make_overview(),
            user_id=USER_ID,
            provider=provider,
        )

        self.assertEqual(len(provider.prompts), 2)
        self.assertIn("上一版输出未通过后端校验", provider.prompts[1])
        self.assertEqual(response.usage.total_tokens, 300)

    async def test_device_claim_retry_has_targeted_repair_instruction(self) -> None:
        provider = SequenceProvider(
            [
                {
                    "advice": [
                        {
                            **VALID_DRAFT["advice"][0],
                            "actions": ["检查增氧机运行状态"],
                        }
                    ]
                },
                VALID_DRAFT,
            ]
        )

        response = await generate_farm_advice(
            overview=make_overview(),
            user_id=USER_ID,
            provider=provider,
        )

        self.assertEqual(len(provider.prompts), 2)
        self.assertIn("删除设备、传感器、检测仪、探头、电极", provider.prompts[1])
        self.assertEqual(response.generation_status, "model_generated")
        self.assertEqual(len(response.result.advice), 1)

    async def test_shrimp_claim_retry_has_targeted_repair_instruction(self) -> None:
        provider = SequenceProvider(
            [
                {
                    "advice": [
                        {
                            **VALID_DRAFT["advice"][0],
                            "actions": ["观察虾群活动状态"],
                        }
                    ]
                },
                VALID_DRAFT,
            ]
        )

        response = await generate_farm_advice(
            overview=make_overview(),
            user_id=USER_ID,
            provider=provider,
        )

        self.assertEqual(len(provider.prompts), 2)
        self.assertIn("删除虾群、虾体、生物量", provider.prompts[1])
        self.assertEqual(response.generation_status, "model_generated")

    async def test_unsupported_operational_claims_are_not_returned(self) -> None:
        unsafe_actions = (
            "立即安装新的水质传感器",
            "确认 pH 探头和 ORP 电极状态",
            "检查检测试剂是否有效",
            "该池为新建设施，应加强巡检",
            "每日投喂饲料 10 公斤",
            "数据库中缺少设备记录",
            "确认 P-01 的投喂记录是否完整",
        )

        for unsafe_action in unsafe_actions:
            with self.subTest(action=unsafe_action):
                provider = CapturingProvider(
                    {
                        "advice": [
                            {
                                **VALID_DRAFT["advice"][0],
                                "actions": [unsafe_action],
                            }
                        ]
                    }
                )
                response = await generate_farm_advice(
                    overview=make_overview(),
                    user_id=USER_ID,
                    provider=provider,
                )
                self.assertEqual(response.generation_status, "safe_fallback")
                self.assertTrue(response.result.advice)
                returned_text = "；".join(
                    action
                    for advice in response.result.advice
                    for action in advice.actions
                )
                self.assertNotIn(unsafe_action, returned_text)
                self.assertTrue(
                    all(
                        evidence.fact_id in {"P1.risk", "P1.water_availability"}
                        for advice in response.result.advice
                        for evidence in advice.evidence
                    )
                )

    async def test_mismatched_pond_target_falls_back_to_safe_result(self) -> None:
        provider = CapturingProvider(
            {
                "advice": [
                    {
                        **VALID_DRAFT["advice"][0],
                        "pond_code": None,
                        "evidence_fact_ids": ["G.attention_count"],
                        "title": "复核 P-01 状态",
                    }
                ]
            }
        )

        response = await generate_farm_advice(
            overview=make_overview(),
            user_id=USER_ID,
            provider=provider,
        )

        self.assertEqual(response.generation_status, "safe_fallback")
        self.assertTrue(response.result.advice)
        self.assertEqual(response.result.advice[0].pond_code, "P-01")


if __name__ == "__main__":
    unittest.main()
