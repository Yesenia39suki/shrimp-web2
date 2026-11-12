"""Agent 建议审计记录的数据结构。"""

from datetime import datetime
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.advice import AdviceGenerationStatus, FactId
from app.schemas.farm import RiskLevel


class AdviceAuditAppendRow(BaseModel):
    """只允许专用服务端组件追加的可信审计行。"""

    organization_id: UUID
    pond_id: UUID
    provider_type: Literal["deepseek"] = "deepseek"
    endpoint: Literal[
        "/api/v1/agent/farm-advice",
        "/api/v1/agent/pond-advice",
    ]
    success: Literal[True] = True
    error_message: None = None
    record_source: Literal["agent_backend"] = "agent_backend"
    requested_by_user_id: UUID
    request_id: str = Field(pattern=r"^[0-9a-f]{32}$")
    model_name: str = Field(min_length=1, max_length=120)
    generation_status: AdviceGenerationStatus
    safe_fallback: bool
    prompt_tokens: int = Field(ge=0)
    completion_tokens: int = Field(ge=0)
    total_tokens: int = Field(ge=0)
    risk_level: RiskLevel
    risk_score: Decimal | None = Field(default=None, ge=0, le=100)
    fact_ids: list[FactId]
    result_payload: dict[str, Any]
    generation_note: str | None = Field(default=None, max_length=300)
    generated_at: datetime
    overview_generated_at: datetime


class AdviceHistoryItem(BaseModel):
    """用户通过 JWT + RLS 可见的一条可信建议历史。"""

    id: UUID
    organization_id: UUID
    pond_id: UUID
    requested_by_user_id: UUID
    request_id: str
    endpoint: str
    model_name: str
    generation_status: AdviceGenerationStatus
    safe_fallback: bool
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    risk_level: RiskLevel
    risk_score: Decimal | None
    fact_ids: list[FactId]
    result_payload: dict[str, Any]
    generation_note: str | None
    generated_at: datetime
    overview_generated_at: datetime
    created_at: datetime


class AdviceHistoryPage(BaseModel):
    """基于稳定游标的建议历史分页。"""

    items: list[AdviceHistoryItem]
    next_cursor: str | None = None


class AdviceHistoryCursor(BaseModel):
    """历史分页游标的受校验内容。"""

    generated_at: datetime
    id: UUID
