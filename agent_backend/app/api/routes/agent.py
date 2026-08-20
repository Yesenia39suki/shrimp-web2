"""首个受控智能分析接口。"""

import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request, status

from app.agents.farm_advisor import generate_farm_advice
from app.api.dependencies import (
    CurrentUser,
    ModelProviderDependency,
    SettingsDependency,
    SupabaseGatewayDependency,
    reject_untrusted_organization_context,
)
from app.schemas.advice import FarmAdviceResponse
from app.services.model_provider import (
    ModelProviderAuthenticationError,
    ModelProviderError,
    ModelProviderRateLimitError,
)
from app.services.supabase_gateway import SupabaseUpstreamError
from app.tools.farm_get_overview import farm_get_overview
from app.tools.farm_select_pond import PondNotAccessibleError, scope_overview_to_pond

router = APIRouter(prefix="/agent", tags=["智能分析"])
logger = logging.getLogger("agent_backend.agent_api")


@router.post(
    "/farm-advice",
    response_model=FarmAdviceResponse,
    summary="基于当前用户可见数据生成养殖建议",
    responses={
        401: {"description": "Supabase access token 无效或已过期"},
        429: {"description": "DeepSeek 请求限流"},
        502: {"description": "Supabase 或 DeepSeek 上游调用失败"},
        503: {"description": "DeepSeek 服务端配置无效"},
    },
)
async def create_farm_advice(
    request: Request,
    current_user: CurrentUser,
    gateway: SupabaseGatewayDependency,
    provider: ModelProviderDependency,
    settings: SettingsDependency,
) -> FarmAdviceResponse:
    """后端先取 RLS 数据，再调用模型；请求方不能指定企业或池塘范围。"""

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
        return await generate_farm_advice(
            overview=overview,
            user_id=current_user.user_id,
            provider=provider,
        )
    except SupabaseUpstreamError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="读取当前用户的养殖场数据失败。",
        ) from exc
    except ModelProviderAuthenticationError as exc:
        logger.warning(
            "deepseek_authentication_error request_id=%s",
            getattr(request.state, "request_id", "unknown"),
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="DeepSeek 服务端配置无效。",
        ) from exc
    except ModelProviderRateLimitError as exc:
        logger.warning(
            "deepseek_rate_limit request_id=%s",
            getattr(request.state, "request_id", "unknown"),
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="DeepSeek 请求繁忙，请稍后重试。",
        ) from exc
    except ModelProviderError as exc:
        logger.warning(
            "deepseek_provider_error request_id=%s error_type=%s error=%s",
            getattr(request.state, "request_id", "unknown"),
            type(exc).__name__,
            str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="DeepSeek 暂时未能生成有效建议。",
        ) from exc


@router.post(
    "/ponds/{pond_id}/advice",
    response_model=FarmAdviceResponse,
    summary="基于当前用户可见的单池数据生成建议",
    responses={
        404: {"description": "池塘不存在或当前用户无权访问"},
        429: {"description": "DeepSeek 请求限流"},
        502: {"description": "Supabase 或 DeepSeek 上游调用失败"},
        503: {"description": "DeepSeek 服务端配置无效"},
    },
)
async def create_single_pond_advice(
    pond_id: UUID,
    request: Request,
    current_user: CurrentUser,
    gateway: SupabaseGatewayDependency,
    provider: ModelProviderDependency,
    settings: SettingsDependency,
) -> FarmAdviceResponse:
    """仅把当前 JWT 经 RLS 可见的目标池塘事实发送给模型。"""

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
        scoped_overview = scope_overview_to_pond(overview, pond_id)
        return await generate_farm_advice(
            overview=scoped_overview,
            user_id=current_user.user_id,
            provider=provider,
        )
    except PondNotAccessibleError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="池塘不存在或当前用户无权访问。",
        ) from exc
    except SupabaseUpstreamError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="读取当前用户的单池数据失败。",
        ) from exc
    except ModelProviderAuthenticationError as exc:
        logger.warning(
            "deepseek_authentication_error request_id=%s",
            getattr(request.state, "request_id", "unknown"),
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="DeepSeek 服务端配置无效。",
        ) from exc
    except ModelProviderRateLimitError as exc:
        logger.warning(
            "deepseek_rate_limit request_id=%s",
            getattr(request.state, "request_id", "unknown"),
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="DeepSeek 请求繁忙，请稍后重试。",
        ) from exc
    except ModelProviderError as exc:
        logger.warning(
            "deepseek_provider_error request_id=%s error_type=%s error=%s",
            getattr(request.state, "request_id", "unknown"),
            type(exc).__name__,
            str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="DeepSeek 暂时未能生成有效建议。",
        ) from exc
