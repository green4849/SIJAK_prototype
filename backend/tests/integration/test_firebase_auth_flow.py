"""B4 Firebase 전화 인증으로 가입·로그인 (토큰은 테스트 키로 서명 — tests/firebase_fake.py)"""

import pytest
from httpx import AsyncClient

from app.core.config import get_settings
from app.domains.auth import deps as auth_deps
from app.integrations.identity.firebase import FirebasePhoneProvider
from tests.firebase_fake import PROJECT, FakeFirebase
from tests.integration.helpers import ALL_CONSENTS

API = "/api/v1"
PERSON = {"name": "김영희", "birth_date": "1955-03-01", "phone": "010-1234-5678", "gender": "F"}


def use_firebase(monkeypatch: pytest.MonkeyPatch, fake: FakeFirebase) -> None:
    """인증을 Firebase(가짜 키)로 바꾼다 — 설정은 테스트가 끝나면 monkeypatch 가 되돌린다"""
    provider = FirebasePhoneProvider(PROJECT, fetch_certs=fake.certs)
    monkeypatch.setattr(auth_deps, "get_identity_provider", lambda: provider)
    s = get_settings()
    monkeypatch.setattr(s, "firebase_project_id", PROJECT)
    monkeypatch.setattr(s, "firebase_web_api_key", "AIza-x")
    monkeypatch.setattr(s, "firebase_app_id", "1:2:web:3")


@pytest.fixture
def fb(monkeypatch: pytest.MonkeyPatch) -> FakeFirebase:
    fake = FakeFirebase()
    use_firebase(monkeypatch, fake)
    return fake


async def _start(client: AsyncClient, person: dict = PERSON) -> dict:
    r = await client.post(f"{API}/auth/pass/start", json=person)
    assert r.status_code == 200, r.text
    return r.json()


async def test_signup_with_firebase_sms(client: AsyncClient, fb: FakeFirebase) -> None:
    start = await _start(client)
    assert start["dev_code"] is None  # 화면에 번호를 보여 주지 않는다
    assert start["sms"] == {
        "provider": "firebase",
        "phone_e164": "+821012345678",
        "firebase": {
            "api_key": "AIza-x",
            "auth_domain": f"{PROJECT}.firebaseapp.com",
            "project_id": PROJECT,
            "app_id": "1:2:web:3",
        },
    }

    r = await client.post(
        f"{API}/auth/pass/verify",
        json={"session_id": start["session_id"], "id_token": fb.token()},
    )
    assert r.status_code == 200, r.text
    v = r.json()
    assert v["status"] == "signup_required" and v["name"] == "김영희"
    r = await client.post(
        f"{API}/auth/signup",
        json={
            "signup_token": v["signup_token"],
            "region_code": "41",
            "interests": ["walking"],
            "consents": ALL_CONSENTS,
        },
    )
    assert r.status_code == 201, r.text
    client.cookies.clear()

    # 다음 로그인 — 같은 번호(같은 uid)면 바로 로그인
    start = await _start(client)
    r = await client.post(
        f"{API}/auth/pass/verify",
        json={"session_id": start["session_id"], "id_token": fb.token()},
    )
    assert r.json()["status"] == "logged_in"


async def test_options_say_sms_goes_via_firebase(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """인증 전 안내(번호가 Google 로 간다)를 화면이 고를 수 있게"""
    assert (await client.get(f"{API}/auth/options")).json()["sms_provider"] is None  # Mock
    monkeypatch.setattr(get_settings(), "identity_provider", "firebase")
    assert (await client.get(f"{API}/auth/options")).json()["sms_provider"] == "firebase"


async def test_wrong_number_token_rejected(client: AsyncClient, fb: FakeFirebase) -> None:
    start = await _start(client)
    r = await client.post(
        f"{API}/auth/pass/verify",
        json={"session_id": start["session_id"], "id_token": fb.token(phone="+821099999999")},
    )
    assert r.status_code == 400
    assert r.json()["error"]["message"] == "인증한 번호가 처음에 적은 번호와 달라요."


async def test_code_or_token_exactly_one(client: AsyncClient, fb: FakeFirebase) -> None:
    start = await _start(client)
    for body in ({}, {"code": "123456", "id_token": fb.token()}):
        r = await client.post(
            f"{API}/auth/pass/verify", json={"session_id": start["session_id"], **body}
        )
        assert r.status_code == 422


async def test_existing_account_linked_by_verified_phone(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Mock 으로 가입했던 분이 Firebase 로 바뀐 뒤 같은 번호로 인증하면 그 계정으로 로그인"""
    person = {"name": "박정호", "birth_date": "1955-03-01", "phone": "01055556666", "gender": "M"}
    start = await _start(client, person)  # 아직 Mock — 화면의 인증번호로 가입
    v = (
        await client.post(
            f"{API}/auth/pass/verify",
            json={"session_id": start["session_id"], "code": start["dev_code"]},
        )
    ).json()
    user = (
        await client.post(
            f"{API}/auth/signup",
            json={
                "signup_token": v["signup_token"],
                "region_code": "41",
                "interests": ["walking"],
                "consents": ALL_CONSENTS,
            },
        )
    ).json()["user"]
    client.cookies.clear()

    fake = FakeFirebase()
    use_firebase(monkeypatch, fake)
    start = await _start(client, person)
    r = await client.post(
        f"{API}/auth/pass/verify",
        json={"session_id": start["session_id"], "id_token": fake.token(phone="+821055556666")},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "logged_in" and body["user"]["id"] == user["id"]
