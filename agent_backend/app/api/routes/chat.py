"""当前登录用户的只读 AI助手。"""

from fastapi import APIRouter, HTTPException, Request

from app.agents.pond_chat import answer_pond_chat, water_history_days
from app.api.dependencies import (
    CurrentUser,
    ModelProviderDependency,
    SettingsDependency,
    SupabaseGatewayDependency,
    WebSearchDependency,
    reject_untrusted_organization_context,
)
from app.schemas.chat import PondChatRequest, PondChatResponse
from app.services.model_provider import (
    ModelProviderAuthenticationError,
    ModelProviderError,
    ModelProviderRateLimitError,
)
from app.services.supabase_gateway import SupabaseUpstreamError
from app.tools.farm_get_overview import farm_get_overview
from app.tools.farm_select_pond import PondNotAccessibleError, scope_overview_to_pond

router = APIRouter(prefix="/agent", tags=["AI助手"])


@router.post("/chat", response_model=PondChatResponse, summary="向 AI助手提问")
async def chat_with_pond_assistant(
    payload: PondChatRequest,
    request: Request,
    current_user: CurrentUser,
    gateway: SupabaseGatewayDependency,
    provider: ModelProviderDependency,
    settings: SettingsDependency,
    web_search: WebSearchDependency,
) -> PondChatResponse:
    reject_untrusted_organization_context(request)
    access_token = current_user.access_token.get_secret_value()
    overview = None
    history = []

    try:
        if payload.pond_id is not None:
            overview = scope_overview_to_pond(await farm_get_overview(
                gateway=gateway,
                access_token=access_token,
                water_stale_after_hours=settings.water_stale_after_hours,
                device_heartbeat_stale_after_minutes=settings.device_heartbeat_stale_after_minutes,
                water_history_days=water_history_days(payload),
                pond_id=payload.pond_id,
            ), payload.pond_id)
            history = await gateway.list_agent_advice_history(
                access_token, pond_id=payload.pond_id, limit=3,
            )
        return await answer_pond_chat(
            request=payload, overview=overview, history=history,
            user_id=current_user.user_id, provider=provider, web_search=web_search,
        )
    except PondNotAccessibleError as exc:
        raise HTTPException(404, "池塘不存在或当前用户无权访问。") from exc
    except SupabaseUpstreamError as exc:
        raise HTTPException(502, "暂时无法读取池塘数据或建议历史。") from exc
    except ModelProviderAuthenticationError as exc:
        raise HTTPException(503, "AI助手的模型服务尚未配置好。") from exc
    except ModelProviderRateLimitError as exc:
        raise HTTPException(429, "AI助手请求繁忙，请稍后重试。") from exc
    except ModelProviderError as exc:
        raise HTTPException(502, "AI助手暂时未能回答，请稍后重试。") from exc
