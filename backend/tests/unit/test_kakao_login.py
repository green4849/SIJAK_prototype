"""카카오 로그인 요청은 고정 주소를 쓰고 회원번호로만 계정을 구분한다."""

import asyncio
from urllib.parse import parse_qs, urlsplit

from app.core.config import get_settings
from app.integrations import kakao_login


def test_authorization_and_exchange(monkeypatch) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "kakao_rest_api_key", "test-key")
    monkeypatch.setattr(settings, "kakao_client_secret", "test-secret")
    monkeypatch.setattr(settings, "kakao_redirect_uri", "https://example.com/login/kakao/callback")

    url = kakao_login.authorization_url("random-state")
    assert urlsplit(url).netloc == "kauth.kakao.com"
    assert parse_qs(urlsplit(url).query)["state"] == ["random-state"]

    requests = []

    def fake_request(request):
        requests.append(request)
        if request.full_url == kakao_login.TOKEN_URL:
            return {"access_token": "provider-token"}
        return {"id": 12345678, "properties": {"nickname": "별명"}}

    monkeypatch.setattr(kakao_login, "_request_json", fake_request)
    assert asyncio.run(kakao_login.exchange_user("one-time-code")) == ("12345678", "별명")
    assert parse_qs(requests[0].data.decode())["client_secret"] == ["test-secret"]
    assert requests[1].get_header("Authorization") == "Bearer provider-token"
