"""DB 없이 카카오 OAuth state 검증과 가입 분기를 확인한다."""

from urllib.parse import parse_qs, urlsplit

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.domains.auth.deps import get_auth_service
from app.domains.auth.router import router as auth_router
from app.domains.auth.service import SignupRequired


@pytest.mark.asyncio
async def test_kakao_state_and_signup_result(monkeypatch) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "auth_mode", "kakao")
    monkeypatch.setattr(settings, "kakao_rest_api_key", "test-key")
    monkeypatch.setattr(settings, "kakao_client_secret", "test-secret")
    monkeypatch.setattr(settings, "kakao_redirect_uri", "http://test/login/kakao/callback")

    async def fake_exchange(_: str) -> tuple[str, str]:
        return "12345678", "별명"

    monkeypatch.setattr("app.domains.auth.router.exchange_user", fake_exchange)

    class FakeService:
        async def login_with_kakao(self, kakao_id: str, nickname: str) -> SignupRequired:
            assert (kakao_id, nickname) == ("12345678", "별명")
            return SignupRequired("signup-token", nickname)

    app = FastAPI()
    register_exception_handlers(app)
    app.include_router(auth_router, prefix=settings.api_prefix)
    app.dependency_overrides[get_auth_service] = lambda: FakeService()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        method = await client.get("/api/v1/auth/method")
        assert method.json() == {"mode": "kakao"}
        start = await client.get("/api/v1/auth/kakao/start", follow_redirects=False)
        assert start.status_code == 302
        state = parse_qs(urlsplit(start.headers["location"]).query)["state"][0]
        assert client.cookies.get("wipi_kakao_state") == state
        invalid = await client.post(
            "/api/v1/auth/kakao/complete", json={"code": "code", "state": "x" * 40}
        )
        assert invalid.status_code == 401
        valid = await client.post(
            "/api/v1/auth/kakao/complete", json={"code": "code", "state": state}
        )
        assert valid.status_code == 200
        assert valid.json() == {
            "status": "signup_required",
            "signup_token": "signup-token",
            "name": "별명",
        }
