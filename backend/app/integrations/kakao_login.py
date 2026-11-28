"""카카오 로그인 OAuth 교환. 카카오 회원번호만 사용하며 본인확인을 뜻하지 않는다."""

import asyncio
import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.core.config import get_settings
from app.core.errors import ExternalServiceError

AUTHORIZE_URL = "https://kauth.kakao.com/oauth/authorize"
TOKEN_URL = "https://kauth.kakao.com/oauth/token"
USER_URL = "https://kapi.kakao.com/v2/user/me"


def authorization_url(state: str) -> str:
    s = get_settings()
    return (
        AUTHORIZE_URL
        + "?"
        + urlencode(
            {
                "response_type": "code",
                "client_id": s.kakao_rest_api_key,
                "redirect_uri": s.kakao_redirect_uri,
                "state": state,
            }
        )
    )


def _request_json(request: Request) -> dict:
    try:
        with urlopen(request, timeout=8) as response:
            data = response.read(64_001)
        if len(data) > 64_000:
            raise ValueError("oversized response")
        result = json.loads(data)
        if not isinstance(result, dict):
            raise ValueError("invalid response")
        return result
    except (HTTPError, URLError, TimeoutError, ValueError, json.JSONDecodeError) as exc:
        raise ExternalServiceError(
            "카카오 로그인 연결에 실패했어요. 다시 시도해 주세요.", code="kakao_unavailable"
        ) from exc


async def exchange_user(code: str) -> tuple[str, str]:
    s = get_settings()
    body = urlencode(
        {
            "grant_type": "authorization_code",
            "client_id": s.kakao_rest_api_key,
            "redirect_uri": s.kakao_redirect_uri,
            "code": code,
            "client_secret": s.kakao_client_secret,
        }
    ).encode()
    token = await asyncio.to_thread(
        _request_json,
        Request(
            TOKEN_URL,
            data=body,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            method="POST",
        ),
    )
    access_token = token.get("access_token")
    if not isinstance(access_token, str) or not access_token:
        raise ExternalServiceError(
            "카카오 로그인 응답을 확인할 수 없어요.", code="kakao_invalid_response"
        )
    profile = await asyncio.to_thread(
        _request_json,
        Request(
            USER_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            method="GET",
        ),
    )
    kakao_id = profile.get("id")
    if not isinstance(kakao_id, int) or isinstance(kakao_id, bool) or kakao_id < 1:
        raise ExternalServiceError("카카오 계정을 확인할 수 없어요.", code="kakao_invalid_response")
    props = profile.get("properties")
    nickname = props.get("nickname", "") if isinstance(props, dict) else ""
    return str(kakao_id), nickname if isinstance(nickname, str) else ""
