"""业务阈值配置测试。"""

import unittest

from pydantic import ValidationError

from app.core.config import Settings


class SettingsTests(unittest.TestCase):
    def test_freshness_threshold_defaults_match_business_rules(self) -> None:
        settings = Settings(_env_file=None)

        self.assertEqual(settings.water_stale_after_hours, 24)
        self.assertEqual(settings.device_heartbeat_stale_after_minutes, 30)

    def test_freshness_thresholds_must_be_positive(self) -> None:
        with self.assertRaises(ValidationError):
            Settings(_env_file=None, water_stale_after_hours=0)
        with self.assertRaises(ValidationError):
            Settings(_env_file=None, device_heartbeat_stale_after_minutes=0)


if __name__ == "__main__":
    unittest.main()
