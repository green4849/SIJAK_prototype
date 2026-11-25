"""C10 보호자 연결·긴급 도움 기록"""

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.domains.emergency.models import Guardian, SosEvent
from tests.integration.helpers import signup_user

API = "/api/v1"


async def test_guardians_add_list_remove(client: AsyncClient) -> None:
    h, _ = await signup_user(client, "김영희")
    assert (await client.get(f"{API}/me/guardians", headers=h)).json() == []

    r = await client.post(
        f"{API}/me/guardians",
        headers=h,
        json={"name": " 김민수 ", "relation": "아들", "phone": "010-9876-5432"},
    )
    assert r.status_code == 201, r.text
    g = r.json()
    assert g["name"] == "김민수" and g["relation"] == "아들"
    assert g["phone"] == "01098765432" and g["phone_masked"] == "010-****-5432"

    # 지역번호(10자리)도 받는다
    r = await client.post(
        f"{API}/me/guardians",
        headers=h,
        json={"name": "박선희", "relation": "담당 복지사", "phone": "031-234-5678"},
    )
    assert r.status_code == 201
    assert r.json()["phone_masked"] == "031-****-5678"

    names = [x["name"] for x in (await client.get(f"{API}/me/guardians", headers=h)).json()]
    assert names == ["김민수", "박선희"]  # 등록한 순서

    assert (await client.delete(f"{API}/me/guardians/{g['id']}", headers=h)).status_code == 204
    # 두 번 지워도 같은 결과
    assert (await client.delete(f"{API}/me/guardians/{g['id']}", headers=h)).status_code == 204
    names = [x["name"] for x in (await client.get(f"{API}/me/guardians", headers=h)).json()]
    assert names == ["박선희"]


async def test_guardian_phone_is_encrypted(
    client: AsyncClient, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    h, _ = await signup_user(client, "김영희")
    await client.post(
        f"{API}/me/guardians",
        headers=h,
        json={"name": "김민수", "relation": "아들", "phone": "01098765432"},
    )
    async with db_sessionmaker() as s:
        row = (await s.scalars(select(Guardian))).one()
    assert b"01098765432" not in row.phone_enc


async def test_guardian_validation_and_limit(client: AsyncClient) -> None:
    h, _ = await signup_user(client, "김영희")

    async def add(**body: str) -> tuple[int, dict]:
        r = await client.post(f"{API}/me/guardians", headers=h, json=body)
        return r.status_code, r.json()

    code, body = await add(name="  ", relation="아들", phone="01011112222")
    assert code == 422 and body["error"]["message"] == "이름을 적어 주세요."
    code, body = await add(name="김민수", relation="", phone="01011112222")
    assert code == 422 and body["error"]["message"] == "어떤 사이인지 골라 주세요."
    code, body = await add(name="김민수", relation="아들", phone="1234")
    assert code == 422 and body["error"]["message"] == "전화번호를 다시 확인해 주세요."

    for i in range(3):
        code, _ = await add(name=f"보호자{i}", relation="이웃", phone=f"0101111222{i}")
        assert code == 201
    code, body = await add(name="넷째", relation="이웃", phone="01011112229")
    assert code == 422 and body["error"]["code"] == "too_many_guardians"


async def test_guardians_are_private(client: AsyncClient) -> None:
    ha, _ = await signup_user(client, "김영희")
    hb, _ = await signup_user(client, "이순자")
    g = (
        await client.post(
            f"{API}/me/guardians",
            headers=ha,
            json={"name": "김민수", "relation": "아들", "phone": "01098765432"},
        )
    ).json()

    assert (await client.get(f"{API}/me/guardians", headers=hb)).json() == []
    # 남의 보호자는 지울 수 없다
    assert (await client.delete(f"{API}/me/guardians/{g['id']}", headers=hb)).status_code == 204
    assert len((await client.get(f"{API}/me/guardians", headers=ha)).json()) == 1

    assert (await client.get(f"{API}/me/guardians")).status_code == 401
    assert (await client.post(f"{API}/emergency/sos")).status_code == 401


async def test_sos_records_who_to_notify(
    client: AsyncClient, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    h, me = await signup_user(client, "김영희")

    # 보호자가 없어도 기록은 남는다 (화면은 119·109 전화 안내)
    r = await client.post(f"{API}/emergency/sos", headers=h)
    assert r.status_code == 201
    assert r.json()["notified"] == []
    assert r.json()["delivery_status"] == "not_sent"

    for name, rel, phone in [
        ("김민수", "아들", "01098765432"),
        ("박선희", "담당 복지사", "0312345678"),
    ]:
        await client.post(
            f"{API}/me/guardians", headers=h, json={"name": name, "relation": rel, "phone": phone}
        )
    r = await client.post(f"{API}/emergency/sos", headers=h)
    assert r.status_code == 201
    out = r.json()
    assert out["notified"] == [
        {"name": "김민수", "relation": "아들"},
        {"name": "박선희", "relation": "담당 복지사"},
    ]
    assert out["delivery_status"] == "not_sent"
    assert out["id"] and out["created_at"]

    async with db_sessionmaker() as s:
        events = list(await s.scalars(select(SosEvent).order_by(SosEvent.created_at)))
    assert len(events) == 2
    assert all(str(e.user_id) == me["id"] for e in events)
    assert events[1].notified == out["notified"]
