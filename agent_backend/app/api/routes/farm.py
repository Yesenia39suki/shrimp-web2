"""养殖场与单池确定性业务概览接口。"""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Request, status

from app.api.dependencies import (
    CurrentUser,
    SettingsDependency,
    SupabaseGatewayDependency,
    reject_untrusted_organization_context,
)
from app.schemas.farm import FarmOverviewResponse, SinglePondOverviewResponse
from app.services.supabase_gateway import SupabaseUpstreamError
from app.tools.farm_get_overview import farm_get_overview
from app.tools.farm_select_pond import PondNotAccessibleError, single_pond_response

router = APIRouter(prefix="/farm", tags=["养殖场概览"])


@router.get(
    "/overview",
    response_model=FarmOverviewResponse,
    summary="获取当前用户可访问的养殖场概览",
)
async def get_farm_overview(
    request: Request,
    current_user: CurrentUser,
    gateway: SupabaseGatewayDependency,
    settings: SettingsDependency,
) -> FarmOverviewResponse:
    """返回可供后续 Agent 使用的确定性结构化业务上下文。"""

    reject_untrusted_organization_context(request)

    try:
        return await farm_get_overview(
            gateway=gateway,
            access_token=current_user.access_token.get_secret_value(),
            water_stale_after_hours=settings.water_stale_after_hours,
            device_heartbeat_stale_after_minutes=(
                settings.device_heartbeat_stale_after_minutes
            ),
        )
    except SupabaseUpstreamError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="读取当前用户的养殖场概览失败。",
        ) from exc


@router.get(
    "/ponds/{pond_id}/overview",
    response_model=SinglePondOverviewResponse,
    summary="获取当前用户可访问的单池概览",
    responses={
        404: {"description": "池塘不存在或当前用户无权访问"},
        502: {"description": "Supabase 上游调用失败"},
    },
)
async def get_single_pond_overview(
    pond_id: UUID,
    request: Request,
    current_user: CurrentUser,
    gateway: SupabaseGatewayDependency,
    settings: SettingsDependency,
) -> SinglePondOverviewResponse:
    """从当前 JWT 经 RLS 可见的概览中选择单池，不信任外部企业上下文。"""

    reject_untrusted_organization_context(request)

    try:
        overview = await farm_get_overview(
            gateway=gateway,
            access_token=current_user.access_token.get_secret_value(),
            water_stale_after_hours=settings.water_stale_after_hours,
            device_heartbeat_stale_after_minutes=(
                settings.device_heartbeat_stale_after_minutes
            ),
        )
        return single_pond_response(overview, pond_id)
    except PondNotAccessibleError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="池塘不存在或当前用户无权访问。",
        ) from exc
    except SupabaseUpstreamError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="读取当前用户的单池概览失败。",
        ) from exc
