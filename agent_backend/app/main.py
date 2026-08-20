"""FastAPI 应用入口。"""

from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import get_settings
from app.core.http_middleware import add_request_context

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="虾群养殖投喂决策系统的智能体后端基础服务。",
)

app.middleware("http")(add_request_context)
app.include_router(api_router, prefix=settings.api_prefix)
