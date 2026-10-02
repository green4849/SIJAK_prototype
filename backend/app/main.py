"""앱 조립 지점. 도메인 router는 스테이지를 통과할 때마다 여기에 하나씩 등록한다."""

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.domains.auth.router import router as auth_router
from app.domains.friend.router import router as friend_router


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="시니어 6080 위피 '시작' API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_exception_handlers(app)

    api = APIRouter(prefix=settings.api_prefix)

    @api.get("/health", tags=["system"])
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    # --- 도메인 router 등록 (스테이지 순서대로) ---
    api.include_router(auth_router)  # Stage 1·2
    api.include_router(friend_router)  # Stage 3

    app.include_router(api)
    return app


app = create_app()
