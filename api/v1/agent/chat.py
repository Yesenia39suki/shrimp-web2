"""Serve the read-only pond chat on the same origin as the website."""

import os
import sys
from pathlib import Path

from fastapi import FastAPI

backend_dir = Path(__file__).resolve().parents[3] / "agent_backend"
sys.path.insert(0, str(backend_dir))

from app.api.routes.chat import router
from app.core.http_middleware import add_request_context

if public_url := os.getenv("VITE_SUPABASE_URL"):
    os.environ.setdefault("AGENT_BACKEND_SUPABASE_URL", public_url)
if public_key := os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY"):
    os.environ.setdefault("AGENT_BACKEND_SUPABASE_PUBLISHABLE_KEY", public_key)

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
app.middleware("http")(add_request_context)
app.include_router(router, prefix="/api/v1")
