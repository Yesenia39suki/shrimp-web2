"""FastAPI 通用依赖。"""

from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import Settings, get_settings
from app.schemas.auth import AuthenticatedRequest
from app.services.deepseek_provider import DeepSeekProvider
from app.services.model_provider import ModelProvider
from app.services.supabase_gateway import (
    SupabaseAuthenticationError,
    SupabaseGateway,
    SupabaseUpstreamError,
)

bearer_scheme = HTTPBearer(
    auto_error=False,
    description="前端 Supabase 登录会话中的 access token",
)

UNTRUSTED_ORGANIZATION_KEYS = {"organization_id", "organizationId", "org_id"}


def reject_untrusted_organization_context(request: Request) -> None:
    """企业范围必须来自已认证用户和数据库 RLS，不能来自请求参数。"""

    if UNTRUSTED_ORGANIZATION_KEYS.intersection(request.query_params):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该接口不接受 organization_id，企业范围由当前用户身份和 RLS 决定。",
        )


async def get_supabase_gateway(
    settings: Annotated[Settings, Depends(get_settings)],
) -> AsyncIterator[SupabaseGateway]:
    """在单次请求内复用并最终关闭 Supabase HTTP 连接。"""

    if settings.supabase_url is None or settings.supabase_publishable_key is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="后端尚未配置 Supabase。",
        )

    gateway = SupabaseGateway(
        base_url=str(settings.supabase_url),
        publishable_key=settings.supabase_publishable_key.get_secret_value(),
        timeout_seconds=settings.supabase_timeout_seconds,
    )
    try:
        yield gateway
    finally:
        await gateway.aclose()


def get_model_provider(
    settings: Annotated[Settings, Depends(get_settings)],
) -> ModelProvider:
    """创建只在服务端持有 API Key 的 DeepSeek Provider。"""

    if settings.deepseek_api_key is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="后端尚未配置 DeepSeek API Key。",
        )

    return DeepSeekProvider(
        api_key=settings.deepseek_api_key.get_secret_value(),
        base_url=str(settings.deepseek_base_url),
        model=settings.deepseek_model,
        timeout_seconds=settings.deepseek_timeout_seconds,
        max_tokens=settings.deepseek_max_tokens,
        max_retries=settings.deepseek_max_retries,
    )


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
) -> AuthenticatedRequest:
    """提取 Bearer token，并交给 Supabase Auth 服务验证。"""

    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="缺少 Supabase Bearer access token。",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        return await gateway.verify_user(credentials.credentials)
    except SupabaseAuthenticationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Supabase access token 无效或已过期。",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except SupabaseUpstreamError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="暂时无法验证 Supabase 用户身份。",
        ) from exc


CurrentUser = Annotated[AuthenticatedRequest, Depends(get_current_user)]
SettingsDependency = Annotated[Settings, Depends(get_settings)]
SupabaseGatewayDependency = Annotated[SupabaseGateway, Depends(get_supabase_gateway)]
ModelProviderDependency = Annotated[ModelProvider, Depends(get_model_provider)]
