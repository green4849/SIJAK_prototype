"""B6·B5 가입 동의 — 필수·선택 구분, 동의 시각·버전 저장, 다시 동의,
마음 건강(민감정보) 동의·철회"""

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.domains.auth.constants import CONSENT_DOCS, CONSENT_VERSIONS
from app.domains.auth.models import ConsentRecord, User
from app.domains.wellbeing.models import SelfAssessment
from tests.integration.helpers import ALL_CONSENTS

API = "/api/v1"
REQUIRED = [k for k, required in CONSENT_DOCS.items() if required]
_seq = 0


def consents(*, health: bool) -> list[dict]:
    return [
        {"kind": k, "version": v, "agreed": k != "health" or health}
        for k, v in CONSENT_VERSIONS.items()
    ]


async def _signup_token(client: AsyncClient) -> str:
    global _seq
    _seq += 1
    person = {"name": "동의시험", "birth_date": "1955-03-01", "phone": f"0108800{_seq:04d}"}
    start = (await client.post(f"{API}/auth/pass/start", json={**person, "gender": "M"})).json()
    v = await client.post(
        f"{API}/auth/pass/verify",
        json={"session_id": start["session_id"], "code": start["dev_code"]},
    )
    return v.json()["signup_token"]


async def _signup(client: AsyncClient, items: list[dict]):
    r = await client.post(
        f"{API}/auth/signup",
        json={
            "signup_token": await _signup_token(client),
            "region_code": "41",
            "interests": ["walking"],
            "consents": items,
        },
    )
    client.cookies.clear()
    return r


async def test_options_list_documents_with_versions(client: AsyncClient) -> None:
    body = (await client.get(f"{API}/auth/options")).json()
    assert {(c["kind"], c["required"]) for c in body["consents"]} == {
        ("terms", True),
        ("privacy", True),
        ("location", True),
        ("health", False),
    }
    assert all(c["version"] == CONSENT_VERSIONS[c["kind"]] for c in body["consents"])


async def test_signup_needs_every_required_consent(client: AsyncClient) -> None:
    # 아무 동의도 없이
    r = await _signup(client, [])
    assert r.status_code == 422 and r.json()["error"]["code"] == "consent_required"
    # 필수 하나(위치)를 거부
    items = [{**c, "agreed": c["kind"] != "location"} for c in ALL_CONSENTS]
    r = await _signup(client, items)
    assert r.status_code == 422 and r.json()["error"]["code"] == "consent_required"
    # 지난 버전 문서
    items = [{**c, "version": "2020-01-01"} for c in ALL_CONSENTS]
    r = await _signup(client, items)
    assert r.status_code == 422 and r.json()["error"]["code"] == "consent_outdated"
    # 모르는 항목
    unknown = {"kind": "marketing", "version": "x", "agreed": True}
    r = await _signup(client, [*ALL_CONSENTS, unknown])
    assert r.status_code == 422


async def test_records_time_and_version_and_optional_refusal(
    client: AsyncClient, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    r = await _signup(client, consents(health=False))
    assert r.status_code == 201, r.text
    user = r.json()["user"]
    assert user["consent_needed"] is False and user["health_consent"] is False

    async with db_sessionmaker() as s:
        rows = list(
            await s.scalars(select(ConsentRecord).where(ConsentRecord.user_id == user["id"]))
        )
    # 네 문서 모두 기록 — 선택(마음 건강)은 '동의 안 함'으로
    assert {(x.kind, x.agreed) for x in rows} == {
        ("terms", True),
        ("privacy", True),
        ("location", True),
        ("health", False),
    }
    assert all(x.version == CONSENT_VERSIONS[x.kind] and x.created_at for x in rows)

    h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    status = {c["kind"]: c for c in (await client.get(f"{API}/me/consents", headers=h)).json()}
    assert status["terms"]["agreed"] and status["terms"]["decided_at"]
    assert status["health"]["agreed"] is False and status["health"]["required"] is False


async def test_health_consent_gates_assessments_and_withdrawal_deletes_them(
    client: AsyncClient, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    r = await _signup(client, consents(health=False))
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    who5 = {"kind": "who5", "answers": [3, 3, 3, 3, 3]}

    # 동의 전에는 저장하지 않는다
    r = await client.post(f"{API}/me/self-assessment", headers=h, json=who5)
    assert r.status_code == 403 and r.json()["error"]["code"] == "health_consent_required"

    r = await client.put(f"{API}/me/self-assessment/consent", headers=h, json={"agreed": True})
    assert r.status_code == 200 and r.json() == {"health_consent": True}
    assert (await client.post(f"{API}/me/self-assessment", headers=h, json=who5)).status_code == 201
    assert len((await client.get(f"{API}/me/self-assessment", headers=h)).json()) == 1

    # 철회 → 기록을 지우고, 다시 저장하지 않는다
    r = await client.put(f"{API}/me/self-assessment/consent", headers=h, json={"agreed": False})
    assert r.json() == {"health_consent": False}
    assert (await client.get(f"{API}/me/self-assessment", headers=h)).json() == []
    assert (await client.post(f"{API}/me/self-assessment", headers=h, json=who5)).status_code == 403
    me = (await client.get(f"{API}/me", headers=h)).json()
    async with db_sessionmaker() as s:
        left = await s.scalar(select(SelfAssessment).where(SelfAssessment.user_id == me["id"]))
        kinds = [
            (x.kind, x.agreed)
            for x in await s.scalars(
                select(ConsentRecord)
                .where(ConsentRecord.user_id == me["id"], ConsentRecord.kind == "health")
                .order_by(ConsentRecord.id)
            )
        ]
    assert left is None
    # 쌓기만 한다 — 가입 때 거부 → 동의 → 철회
    assert kinds == [("health", False), ("health", True), ("health", False)]


async def test_required_consent_cannot_be_withdrawn(client: AsyncClient) -> None:
    r = await _signup(client, ALL_CONSENTS)
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    terms = {"kind": "terms", "version": CONSENT_VERSIONS["terms"], "agreed": False}
    r = await client.post(f"{API}/me/consents", headers=h, json={"items": [terms]})
    assert r.status_code == 422


async def test_member_without_records_is_asked_again(
    client: AsyncClient, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    """동의 단계가 생기기 전 가입한 분(기록 없음)·약관이 바뀐 경우 → consent_needed"""
    r = await _signup(client, ALL_CONSENTS)
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    uid = r.json()["user"]["id"]
    async with db_sessionmaker() as s:
        user = await s.get(User, uid)
        assert user is not None
        for rec in list(user.consents):
            await s.delete(rec)
        await s.commit()

    me = (await client.get(f"{API}/me", headers=h)).json()
    assert me["consent_needed"] is True and me["health_consent"] is False

    items = [{"kind": k, "version": CONSENT_VERSIONS[k], "agreed": True} for k in REQUIRED]
    r = await client.post(f"{API}/me/consents", headers=h, json={"items": items})
    assert r.status_code == 200, r.text
    assert r.json()["consent_needed"] is False
