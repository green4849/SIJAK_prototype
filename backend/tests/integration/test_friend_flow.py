"""④ 친구 찾기: 추천 → 신청 → 받은 신청 → 수락 → 친구 목록 / 위치 저장"""

from httpx import AsyncClient

from tests.integration.helpers import signup_user


async def test_recommend_request_accept(client: AsyncClient) -> None:
    ha, a = await signup_user(client, "김영희", interests=["walking", "music"])
    hb, b = await signup_user(client, "박철수", interests=["music", "cooking"])
    hc, _ = await signup_user(client, "이순자", region="11", interests=["tv"])

    # 추천: 관심사 겹치는 박철수가 먼저, 나 자신은 없음
    rec = (await client.get("/api/v1/friends/recommendations", headers=ha)).json()
    assert [c["name"] for c in rec][0] == "박철수"
    assert a["id"] not in {c["user_id"] for c in rec}
    assert rec[0]["common_interests"] == ["노래·음악"]
    assert rec[0]["relation"] == "none"
    assert "phone" not in rec[0] and "birth_date" not in rec[0]

    # 같은 동네(현재: 같은 시·도, 거리 없음 — deferred)
    near = (await client.get("/api/v1/friends/recommendations?tab=nearby", headers=ha)).json()
    assert {c["name"] for c in near} == {"박철수"}
    assert near[0]["distance_km"] is None

    # 신청
    r = await client.post("/api/v1/friends/requests", headers=ha, json={"to_user_id": b["id"]})
    assert r.status_code == 201 and r.json()["relation"] == "sent"

    # 받은 쪽에서 확인 후 수락
    received = (await client.get("/api/v1/friends/requests", headers=hb)).json()
    assert [x["name"] for x in received] == ["김영희"]
    req_id = received[0]["request_id"]
    assert (
        await client.post(f"/api/v1/friends/requests/{req_id}/accept", headers=hb)
    ).status_code == 204

    # 둘 다 친구 목록에 있고, 추천에서는 빠짐
    assert [f["name"] for f in (await client.get("/api/v1/friends", headers=ha)).json()] == [
        "박철수"
    ]
    assert [f["name"] for f in (await client.get("/api/v1/friends", headers=hb)).json()] == [
        "김영희"
    ]
    rec2 = (await client.get("/api/v1/friends/recommendations", headers=ha)).json()
    assert "박철수" not in {c["name"] for c in rec2}

    # 이미 친구면 다시 신청 불가
    again = await client.post("/api/v1/friends/requests", headers=ha, json={"to_user_id": b["id"]})
    assert again.status_code == 409
    assert hc  # 다른 지역 사용자도 가입됨


async def test_mutual_request_becomes_friends(client: AsyncClient) -> None:
    ha, a = await signup_user(client, "김영희")
    hb, b = await signup_user(client, "박철수")
    await client.post("/api/v1/friends/requests", headers=ha, json={"to_user_id": b["id"]})
    r = await client.post("/api/v1/friends/requests", headers=hb, json={"to_user_id": a["id"]})
    assert r.json()["relation"] == "friends"


async def test_cannot_request_self(client: AsyncClient) -> None:
    ha, a = await signup_user(client, "김영희")
    r = await client.post("/api/v1/friends/requests", headers=ha, json={"to_user_id": a["id"]})
    assert r.status_code == 400


async def test_location_is_coarsened(client: AsyncClient) -> None:
    ha, _ = await signup_user(client, "김영희")
    r = await client.put(
        "/api/v1/me/location", headers=ha, json={"lat": 37.566535, "lng": 126.977969}
    )
    assert r.status_code == 200 and r.json()["has_location"] is True
    # 해외 좌표는 거부
    bad = await client.put("/api/v1/me/location", headers=ha, json={"lat": 48.85, "lng": 2.35})
    assert bad.status_code == 422
