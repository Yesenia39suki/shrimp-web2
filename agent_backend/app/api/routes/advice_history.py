"""用户 JWT + RLS 约束下的 Agent 建议历史查询。"""

import base64
import json
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request, status
from pydantic import ValidationError

from app.api.dependencies import (
    CurrentUser,
    SupabaseGatewayDependency,
    reject_untrusted_organization_context,
)
from app.schemas.audit import (
    AdviceHistoryCursor,
    AdviceHistoryItem,
    AdviceHistoryPage,
)
from app.services.supabase_gateway import SupabaseUpstreamError

router = APIRouter(prefix="/agent/advice-history", tags=["智能分析历史"])


def _encode_cursor(item: AdviceHistoryItem) -> str:
    raw = json.dumps(
        {
            "generated_at": item.generated_at.isoformat(),
            "id": str(item.id),
        },
        separators=(",", ":"),
    ).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _decode_cursor(cursor: str) -> AdviceHistoryCursor:
    try:
        padding = "=" * (-len(cursor) % 4)
        raw = base64.b64decode(
            cursor + padding,
            altchars=b"-_",
            validate=True,
        )
        payload = json.loads(raw.decode("utf-8"))
        return AdviceHistoryCursor.model_validate(payload)
    except (ValueError, UnicodeDecodeError, json.JSONDecodeError, ValidationError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="历史分页游标无效。",
        ) from exc


@router.get(
    "",
    response_model=AdviceHistoryPage,
    summary="查询当前用户可访问的 Agent 建议历史",
)
async def list_advice_history(
    request: Request,
    current_user: CurrentUser,
    gateway: SupabaseGatewayDependency,
    pond_id: UUID | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = Query(default=None, max_length=500),
) -> AdviceHistoryPage:
    """不接受企业范围；数据库 RLS 决定用户可见的历史行。"""

    reject_untrusted_organization_context(request)
    decoded = _decode_cursor(cursor) if cursor is not None else None
    try:
        rows = await gateway.list_agent_advice_history(
            current_user.access_token.get_secret_value(),
            pond_id=pond_id,
            limit=limit + 1,
            before_generated_at=(
                decoded.generated_at.isoformat() if decoded is not None else None
            ),
            before_id=decoded.id if decoded is not None else None,
        )
    except SupabaseUpstreamError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="读取 Agent 建议历史失败。",
        ) from exc

    items = rows[:limit]
    next_cursor = _encode_cursor(items[-1]) if len(rows) > limit else None
    return AdviceHistoryPage(items=items, next_cursor=next_cursor)


@router.get(
    "/{audit_id}",
    response_model=AdviceHistoryItem,
    summary="查询一条当前用户可访问的 Agent 建议历史",
)
async def get_advice_history(
    audit_id: UUID,
    request: Request,
    current_user: CurrentUser,
    gateway: SupabaseGatewayDependency,
) -> AdviceHistoryItem:
    """不存在和因 RLS 不可见均返回 404，避免泄露跨企业记录。"""

    reject_untrusted_organization_context(request)
    try:
        item = await gateway.get_agent_advice_history(
            current_user.access_token.get_secret_value(),
            audit_id,
        )
    except SupabaseUpstreamError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="读取 Agent 建议历史失败。",
        ) from exc
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="建议历史不存在或当前用户无权访问。",
        )
    return item
