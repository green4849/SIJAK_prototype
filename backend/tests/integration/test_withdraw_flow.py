"""B3 회원 탈퇴: 바로 로그인·노출 중지, 30일 뒤 삭제 예정일 기록"""

from datetime import timedelta

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.domains.auth.models import User
from app.domains.point.service import kst_today
from tests.integration.helpers import ALL_CONSENTS, signup_user

API = "/api/v1"


async def test_withdraw_stops_login_and_records_delete_date(
    client: AsyncClient, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    h, me = await signup_user(client, "김영희")
    r = await client.post(f"{API}/me/withdraw", headers=h, json={"reason": "다른 앱을 써요"})
    assert r.status_code == 200, r.text
    delete_at = kst_today() + timedelta(days=30)
    assert r.json() == {"delete_at": delete_at.isoformat()}

    async with db_sessionmaker() as s:
        u = (await s.scalars(select(User).where(User.name == "김영희"))).one()
    assert u.status == "deleted" and u.withdrawn_at is not None
    assert u.delete_after == delete_at and u.withdraw_reason == "다른 앱을 써요"

    # 남은 access 토큰으로도 더 쓸 수 없다
    r = await client.get(f"{API}/me", headers=h)
    assert r.status_code == 403 and r.json()["error"]["code"] == "user_deleted"


async def test_withdraw_logs_out_everywhere(client: AsyncClient) -> None:
    person = {"name": "김영희", "birth_date": "1955-03-01", "phone": "01077778888", "gender": "F"}

    async def login() -> tuple[int, dict]:
        start = (await client.post(f"{API}/auth/pass/start", json=person)).json()
        r = await client.post(
            f"{API}/auth/pass/verify",
            json={"session_id": start["session_id"], "code": start["dev_code"]},
        )
        return r.status_code, r.json()

    _, v = await login()
    r = await client.post(
        f"{API}/auth/signup",
        json={
            "signup_token": v["signup_token"],
            "region_code": "41",
            "interests": ["walking"],
            "consents": ALL_CONSENTS,
        },
    )
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    refresh_cookie = dict(client.cookies)
    assert refresh_cookie

    r = await client.post(f"{API}/me/withdraw", headers=h, json={"reason": None})
    assert r.status_code == 200
    # refresh 쿠키를 지우라고 응답하고, 서버에서도 폐기 — 남은 쿠키로 다시 받아도 안 된다
    assert "wipi_refresh" in r.headers.get("set-cookie", "")
    client.cookies.clear()
    client.cookies.update(refresh_cookie)
    r = await client.post(f"{API}/auth/refresh")
    client.cookies.clear()
    assert r.status_code in (401, 403)

    # 같은 사람이 다시 인증하면: 탈퇴한 계정, 다시 가입할 수 있는 날 안내
    code, body = await login()
    d = kst_today() + timedelta(days=30)
    assert code == 403 and body["error"]["code"] == "user_deleted"
    assert body["error"]["message"] == (
        f"탈퇴한 계정이에요. {d.month}월 {d.day}일 뒤에 다시 가입할 수 있어요."
    )


async def test_withdrawn_user_disappears_from_friends_and_recommendations(
    client: AsyncClient,
) -> None:
    ha, a = await signup_user(client, "김영희")
    hb, b = await signup_user(client, "박정호")
    await client.post(f"{API}/friends/requests", headers=ha, json={"to_user_id": b["id"]})
    await client.post(f"{API}/friends/requests", headers=hb, json={"to_user_id": a["id"]})
    assert [f["user_id"] for f in (await client.get(f"{API}/friends", headers=ha)).json()] == [
        b["id"]
    ]

    assert (await client.post(f"{API}/me/withdraw", headers=hb, json={})).status_code == 200

    assert (await client.get(f"{API}/friends", headers=ha)).json() == []
    rec = (await client.get(f"{API}/friends/recommendations?tab=recommended", headers=ha)).json()
    assert b["id"] not in {c["user_id"] for c in rec}
    # 탈퇴한 사람에게는 새로 신청할 수 없다
    r = await client.post(f"{API}/friends/requests", headers=ha, json={"to_user_id": b["id"]})
    assert r.status_code >= 400


async def test_withdraw_reason_is_optional_and_short(client: AsyncClient) -> None:
    h, _ = await signup_user(client, "김영희")
    r = await client.post(f"{API}/me/withdraw", headers=h, json={"reason": "가" * 31})
    assert r.status_code == 422
    assert (await client.post(f"{API}/me/withdraw", headers=h, json={})).status_code == 200
    assert (await client.post(f"{API}/me/withdraw")).status_code == 401
