"""应用配置。"""

from functools import lru_cache
from pathlib import Path

from pydantic import AnyHttpUrl, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """从环境变量或 agent_backend/.env 读取应用配置。"""

    app_name: str = "虾群养殖智能体服务"
    app_version: str = "0.1.0"
    app_env: str = "development"
    api_prefix: str = "/api/v1"
    supabase_url: AnyHttpUrl | None = None
    supabase_publishable_key: SecretStr | None = None
    supabase_timeout_seconds: float = 10.0
    deepseek_api_key: SecretStr | None = None
    deepseek_base_url: AnyHttpUrl = AnyHttpUrl("https://api.deepseek.com")
    deepseek_model: str = "deepseek-v4-flash"
    deepseek_timeout_seconds: float = Field(default=60.0, gt=0, le=300)
    deepseek_max_tokens: int = Field(default=1200, ge=256, le=8192)
    deepseek_max_retries: int = Field(default=1, ge=0, le=3)
    water_stale_after_hours: int = Field(default=24, ge=1, le=168)
    device_heartbeat_stale_after_minutes: int = Field(default=30, ge=1, le=1440)

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        env_prefix="AGENT_BACKEND_",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """返回缓存后的应用配置实例。"""

    return Settings()
