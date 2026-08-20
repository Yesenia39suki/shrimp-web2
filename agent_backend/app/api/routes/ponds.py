"""当前登录用户可访问的池塘接口。"""

from fastapi import APIRouter, HTTPException, Request, status

from app.api.dependencies import (
    CurrentUser,
    SupabaseGatewayDependency,
    reject_untrusted_organization_context,
)
from app.schemas.pond import PondResponse
from app.services.supabase_gateway import SupabaseUpstreamError

router = APIRouter(prefix="/ponds", tags=["池塘"])


@router.get(
    "",
    response_model=list[PondResponse],
    summary="获取当前用户可访问的池塘列表",
)
async def list_accessible_ponds(
    request: Request,
    current_user: CurrentUser,
    gateway: SupabaseGatewayDependency,
) -> list[PondResponse]:
    """不接收 organization_id，池塘可见范围完全由 Supabase RLS 决定。"""

    reject_untrusted_organization_context(request)

    try:
        return await gateway.list_accessible_ponds(
            current_user.access_token.get_secret_value()
        )
    except SupabaseUpstreamError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="读取当前用户可访问的池塘失败。",
        ) from exc
