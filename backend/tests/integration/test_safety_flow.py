"""안전: 위험 메시지 경고(받는 사람만) / 신고+차단 → 대화·추천 차단 / 차단 해제"""

from httpx import AsyncClient

from tests.integration.helpers import signup_user


async def _chat(client: AsyncClient):  # noqa: ANN202
    ha, a = await signup_user(client, "김영희")
    hb, b = await signup_user(client, "박철수")
    await client.post("/api/v1/friends/requests", headers=ha, json={"to_user_id": b["id"]})
    await client.post("/api/v1/friends/requests", headers=hb, json={"to_user_id": a["id"]})
    rid = (await client.post(f"/api/v1/chats/with/{b['id']}", headers=ha)).json()["id"]
    return ha, a, hb, b, rid


async def test_warning_only_for_receiver(client: AsyncClient) -> None:
    ha, a, hb, b, rid = await _chat(client)
    sent = await client.post(
        f"/api/v1/chats/{rid}/messages",
        headers=hb,
        json={"text": "급해요 계좌로 송금 좀 해 주세요"},
    )
    assert sent.json()["warning"] is None  # 보낸 사람에게는 안 보임

    got = (await client.get(f"/api/v1/chats/{rid}/messages", headers=ha)).json()
    assert got[-1]["warning"]["level"] == 3
    assert "돈·송금 이야기" in got[-1]["warning"]["reasons"]

    safe = await client.post(
        f"/api/v1/chats/{rid}/messages", headers=hb, json={"text": "안녕하세요"}
    )
    assert safe.status_code == 201
    got = (await client.get(f"/api/v1/chats/{rid}/messages", headers=ha)).json()
    assert got[-1]["warning"] is None


async def test_report_blocks_everything(client: AsyncClient) -> None:
    ha, a, hb, b, rid = await _chat(client)
    r = await client.post(
        "/api/v1/safety/reports",
        headers=ha,
        json={"target_user_id": b["id"], "reason": "money"},
    )
    assert r.status_code == 201 and r.json() == {"blocked": True}

    # 양쪽 모두 보낼 수 없음
    for h in (ha, hb):
        s = await client.post(f"/api/v1/chats/{rid}/messages", headers=h, json={"text": "hi"})
        assert s.status_code == 403 and s.json()["error"]["code"] == "blocked"
    assert (await client.get(f"/api/v1/chats/{rid}", headers=ha)).json()["blocked"] is True

    # 추천·친구 목록에서 사라짐 (양방향)
    assert b["id"] not in {
        c["user_id"]
        for c in (await client.get("/api/v1/friends/recommendations", headers=ha)).json()
    }
    assert (await client.get("/api/v1/friends", headers=hb)).json() == []

    blocked = (await client.get("/api/v1/safety/blocks", headers=ha)).json()
    assert [x["name"] for x in blocked] == ["박철수"]

    # 차단 해제 → 다시 대화 가능
    assert (await client.delete(f"/api/v1/safety/blocks/{b['id']}", headers=ha)).status_code == 204
    ok = await client.post(f"/api/v1/chats/{rid}/messages", headers=ha, json={"text": "다시 안녕"})
    assert ok.status_code == 201


async def test_invalid_report(client: AsyncClient) -> None:
    ha, a = await signup_user(client, "김영희")
    _, b = await signup_user(client, "박철수")
    bad = await client.post(
        "/api/v1/safety/reports", headers=ha, json={"target_user_id": b["id"], "reason": "??"}
    )
    assert bad.status_code == 422
    me = await client.post(
        "/api/v1/safety/reports", headers=ha, json={"target_user_id": a["id"], "reason": "spam"}
    )
    assert me.status_code == 422
