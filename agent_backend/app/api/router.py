"""集中注册应用的 API 路由。"""

from fastapi import APIRouter

from app.api.routes.agent import router as agent_router
from app.api.routes.farm import router as farm_router
from app.api.routes.health import router as health_router
from app.api.routes.ponds import router as ponds_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(ponds_router)
api_router.include_router(farm_router)
api_router.include_router(agent_router)
