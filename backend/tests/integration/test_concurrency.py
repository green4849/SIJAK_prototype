"""더블 탭·StrictMode 이중 실행처럼 같은 요청이 동시에 와도 500이 나지 않아야 한다 (E2E에서 발견)"""

import asyncio

from httpx import AsyncClient

from tests.integration.helpers import signup_user


async def test_double_requests_are_idempotent(client: AsyncClient) -> None:
    ha, a = await signup_user(client, "김영희")
    hb, b = await signup_user(client, "박철수")

    # 친구 신청 동시 2번 → 1건
    r = await asyncio.gather(
        *[client.post("/api/v1/friends/requests", headers=ha, json={"to_user_id": b["id"]})] * 2
    )
    assert {x.status_code for x in r} == {201}
    assert len((await client.get("/api/v1/friends/requests", headers=hb)).json()) == 1
    await client.post("/api/v1/friends/requests", headers=hb, json={"to_user_id": a["id"]})

    # 대화방 동시에 열기 → 같은 방 하나
    rooms = await asyncio.gather(
        client.post(f"/api/v1/chats/with/{b['id']}", headers=ha),
        client.post(f"/api/v1/chats/with/{b['id']}", headers=ha),
        client.post(f"/api/v1/chats/with/{a['id']}", headers=hb),
    )
    assert [x.status_code for x in rooms] == [200, 200, 200]
    assert len({x.json()["id"] for x in rooms}) == 1

    # 차단 동시 2번 → 오류 없이 1건
    blocks = await asyncio.gather(
        *[client.post("/api/v1/safety/blocks", headers=ha, json={"user_id": b["id"]})] * 2
    )
    assert {x.status_code for x in blocks} == {204}
    assert len((await client.get("/api/v1/safety/blocks", headers=ha)).json()) == 1
