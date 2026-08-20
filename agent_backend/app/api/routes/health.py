"""服务健康检查接口。"""

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.config import get_settings

router = APIRouter(tags=["系统状态"])


class HealthResponse(BaseModel):
    """健康检查响应。"""

    status: Literal["ok"] = Field(description="服务状态")
    service: str = Field(description="服务名称")
    version: str = Field(description="服务版本")
    environment: str = Field(description="运行环境")


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="健康检查",
)
async def health_check() -> HealthResponse:
    """返回当前服务的基础运行状态。"""

    settings = get_settings()
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        version=settings.app_version,
        environment=settings.app_env,
    )

