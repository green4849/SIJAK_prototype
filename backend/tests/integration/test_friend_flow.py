"""④ 친구 찾기: 추천 → 신청 → 받은 신청 → 수락 → 친구 목록 / 위치 저장"""

from httpx import AsyncClient

from tests.integration.helpers import signup_user


async def test_recommend_request_accept(client: AsyncClient) -> None:
    ha, a = await signup_user(client, "김영희", interests=["walking", "movies"])
    hb, b = await signup_user(client, "박철수", interests=["movies", "cooking"])
    hc, _ = await signup_user(client, "이순자", region="11", interests=["fishing"])

    # 추천: 관심사 겹치는 박철수가 먼저, 나 자신은 없음
    rec = (await client.get("/api/v1/friends/recommendations", headers=ha)).json()
    assert [c["name"] for c in rec][0] == "박철수"
    assert a["id"] not in {c["user_id"] for c in rec}
    assert rec[0]["common_interests"] == ["영화·공연"]
    assert rec[0]["relation"] == "none"
    assert "phone" not in rec[0] and "birth_date" not in rec[0]

    # 같은 동네 — 위치를 아직 안 알렸으면 같은 시·도, 거리 없음 (반경 검색은 test_nearby_radius)
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


async def test_nearby_radius(client: AsyncClient) -> None:
    """C3: 위치를 알리면 반경 2km 안의 이웃을 가까운 순으로, 거리(0.5km 단위)와 함께"""
    ha, _ = await signup_user(client, "김영희")
    hb, _ = await signup_user(client, "박철수")  # 약 1.1km
    hc, _ = await signup_user(client, "이순자")  # 약 3.3km — 반경 밖
    await signup_user(client, "최말순")  # 위치 안 알림 — 같은 시·도라 뒤에 거리 없이

    await client.put("/api/v1/me/location", headers=ha, json={"lat": 37.2701, "lng": 127.0099})
    await client.put("/api/v1/me/location", headers=hb, json={"lat": 37.28, "lng": 127.01})
    await client.put("/api/v1/me/location", headers=hc, json={"lat": 37.30, "lng": 127.01})

    near = (await client.get("/api/v1/friends/recommendations?tab=nearby", headers=ha)).json()
    assert [(c["name"], c["distance_km"]) for c in near] == [("박철수", 1.0), ("최말순", None)]


SURVEY = {
    "interests": ["walking", "cooking"],
    "purpose": "hobby",
    "places": ["park"],
    "times": ["weekday_am"],
    "frequency": "weekly",
    "talk_style": "balanced",
    "want": "listener",
    "traits": ["caring"],
}


async def test_survey_save_and_prefill(client: AsyncClient) -> None:
    h, _ = await signup_user(client, "김영희", interests=["fishing"])
    out = (await client.get("/api/v1/friends/survey", headers=h)).json()
    assert out["answers"] is None and out["my_interests"] == ["fishing"]
    assert [q["key"] for q in out["questions"]] == [
        "interests", "purpose", "places", "times", "frequency", "talk_style", "want", "traits"
    ]  # fmt: skip
    q1 = out["questions"][0]
    assert (q1["min"], q1["max"]) == (1, 5) and len(q1["options"]) == 10
    assert q1["options"][1] == {"code": "movies", "label": "영화·공연"}
    assert out["questions"][2]["max"] == 2 and out["questions"][7]["max"] == 3

    r = await client.put("/api/v1/friends/survey", headers=h, json=SURVEY)
    assert r.status_code == 200, r.text
    assert r.json()["answers"] == SURVEY
    # Q1은 내 '좋아하는 것'도 바꾼다
    me = (await client.get("/api/v1/me", headers=h)).json()
    assert sorted(me["interests"]) == ["cooking", "walking"]
    again = (await client.get("/api/v1/friends/survey", headers=h)).json()
    assert again["answers"] == SURVEY

    bad = await client.put(
        "/api/v1/friends/survey", headers=h, json={**SURVEY, "places": ["park", "cafe", "center"]}
    )
    assert bad.status_code == 422
    assert bad.json()["error"]["message"] == "3번 질문은 2개까지 고를 수 있어요."
    assert (await client.get("/api/v1/friends/survey")).status_code == 401


async def test_recommend_by_survey_match(client: AsyncClient) -> None:
    """성향이 잘 맞는 분이 관심사만 겹치는 분보다 먼저, 이유는 말로 — 점수 숫자는 내보내지 않는다"""
    ha, _ = await signup_user(client, "김영희", interests=["walking"])
    hb, _ = await signup_user(client, "박철수", interests=["walking"])  # 성향조사 안 함
    hc, _ = await signup_user(client, "이순자", interests=["cooking"])  # 성향이 잘 맞음
    hd, _ = await signup_user(client, "최말순", region="11", interests=["walking"])  # 다른 시·도

    await client.put("/api/v1/friends/survey", headers=ha, json=SURVEY)
    await client.put(
        "/api/v1/friends/survey",
        headers=hc,
        json={**SURVEY, "interests": ["cooking", "walking"], "talk_style": "listener"},
    )
    rec = (await client.get("/api/v1/friends/recommendations", headers=ha)).json()
    # 위치가 없으면 같은 시·도만
    assert [c["name"] for c in rec] == ["이순자", "박철수"]
    lee, park = rec
    assert lee["match_label"] == "잘 맞아요"
    assert lee["reasons"][0] == "둘 다 평일 오전이 편해요"
    assert "score" not in lee
    # 성향조사를 안 한 분 — 관심사(H)로만, 말·이유 없음
    assert park["match_label"] is None and park["reasons"] == []
    assert hb and hd


async def test_recommend_within_5km(client: AsyncClient) -> None:
    ha, _ = await signup_user(client, "김영희")
    hb, _ = await signup_user(client, "박철수")  # 약 3.3km — 추천 반경(5km) 안
    hc, _ = await signup_user(client, "이순자")  # 약 7.8km — 밖
    await signup_user(client, "최말순")  # 위치 없음 — 같은 시·도라 후보
    hd, _ = await signup_user(client, "한옥자", region="11")  # 다른 시·도지만 약 1.1km
    await client.put("/api/v1/me/location", headers=ha, json={"lat": 37.27, "lng": 127.01})
    await client.put("/api/v1/me/location", headers=hb, json={"lat": 37.30, "lng": 127.01})
    await client.put("/api/v1/me/location", headers=hc, json={"lat": 37.34, "lng": 127.01})
    await client.put("/api/v1/me/location", headers=hd, json={"lat": 37.28, "lng": 127.01})

    rec = (await client.get("/api/v1/friends/recommendations", headers=ha)).json()
    # 같은 점수면 가까운 순, 거리 모르는 분은 뒤에
    assert [(c["name"], c["distance_km"]) for c in rec] == [
        ("한옥자", 1.0),
        ("박철수", 3.5),
        ("최말순", None),
    ]
