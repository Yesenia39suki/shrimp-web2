"""确定性风险引擎测试。"""

import unittest
from decimal import Decimal

from app.schemas.farm import (
    ActiveAlertSnapshot,
    WaterLatestSnapshot,
    WaterThresholdSnapshot,
)
from app.services.risk_engine import assess_pond_risk

ORGANIZATION_ID = "1733849e-5607-449e-80b8-3d67733d9dbd"
POND_ID = "a2d89b5f-2f59-4573-9391-cfa6be64fa18"


def make_water(**overrides: object) -> WaterLatestSnapshot:
    payload = {
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
        "recorded_at": "2026-08-17T08:00:00Z",
        "updated_at": "2026-08-17T08:00:00Z",
    }
    payload.update(overrides)
    return WaterLatestSnapshot.model_validate(payload)


def make_thresholds() -> WaterThresholdSnapshot:
    return WaterThresholdSnapshot.model_validate(
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


class RiskEngineTests(unittest.TestCase):
    def test_normal_water_has_low_risk(self) -> None:
        metrics, risk, summary = assess_pond_risk(
            latest_water=make_water(),
            thresholds=make_thresholds(),
            active_alerts=[],
        )

        self.assertEqual(len(metrics), 8)
        self.assertEqual(risk.risk_score, 0)
        self.assertEqual(risk.risk_level, "低风险")
        self.assertFalse(risk.requires_attention)
        self.assertIn("均处阈值范围内", summary)

    def test_critical_alert_sets_high_risk_floor(self) -> None:
        alert = ActiveAlertSnapshot.model_validate(
            {
                "id": "66bde922-e9c3-4e61-94be-dbd9fed48670",
                "organization_id": ORGANIZATION_ID,
                "pond_id": POND_ID,
                "type": "water_quality",
                "level": "critical",
                "title": "严重缺氧",
                "content": "溶解氧过低",
                "read_status": "unread",
                "created_at": "2026-08-17T08:00:00Z",
            }
        )
        _, risk, _ = assess_pond_risk(
            latest_water=make_water(dissolved_oxygen=3.5),
            thresholds=make_thresholds(),
            active_alerts=[alert],
        )

        self.assertEqual(risk.water_risk_score, 14)
        self.assertEqual(risk.risk_score, 76)
        self.assertEqual(risk.risk_level, "高风险")
        self.assertTrue(risk.requires_attention)

    def test_missing_water_and_thresholds_are_data_insufficient(self) -> None:
        _, risk, summary = assess_pond_risk(
            latest_water=None,
            thresholds=None,
            active_alerts=[],
        )

        self.assertIsNone(risk.risk_score)
        self.assertEqual(risk.risk_level, "数据不足")
        self.assertTrue(risk.requires_attention)
        self.assertIn("暂无最新水质数据", summary)
        self.assertIn("缺少水质阈值配置", summary)

    def test_stale_water_is_retained_but_not_scored_as_current_data(self) -> None:
        metrics, risk, summary = assess_pond_risk(
            latest_water=make_water(),
            thresholds=make_thresholds(),
            active_alerts=[],
            water_data_stale=True,
            water_age_hours=Decimal("24.01"),
            water_stale_after_hours=24,
        )

        self.assertTrue(all(metric.value is not None for metric in metrics))
        self.assertFalse(risk.data_complete)
        self.assertTrue(risk.water_data_stale)
        self.assertEqual(risk.water_age_hours, Decimal("24.01"))
        self.assertIsNone(risk.water_risk_score)
        self.assertIsNone(risk.risk_score)
        self.assertEqual(risk.risk_level, "数据不足")
        self.assertIn("最新水质数据已超过 24 小时", summary)


if __name__ == "__main__":
    unittest.main()
