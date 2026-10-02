"""인증 전체 흐름: 본인인증 → 가입 → /me → refresh 회전 → 로그아웃 → 재로그인."""

from httpx import AsyncClient

PERSON = {"name": "김영희", "birth_date": "1955-03-01", "phone": "010-1234-5678", "gender": "F"}
COOKIE = "wipi_refresh"


async def _verify(client: AsyncClient, person: dict = PERSON) -> dict:
    start = (await client.post("/api/v1/auth/pass/start", json=person)).json()
    res = await client.post(
        "/api/v1/auth/pass/verify",
        json={"session_id": start["session_id"], "code": start["dev_code"]},
    )
    assert res.status_code == 200, res.text
    return res.json()


async def _signup(client: AsyncClient, person: dict = PERSON) -> dict:
    v = await _verify(client, person)
    assert v["status"] == "signup_required"
    res = await client.post(
        "/api/v1/auth/signup",
        json={
            "signup_token": v["signup_token"],
            "region_code": "41",
            "interests": ["walking", "music"],
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


async def test_signup_then_me(client: AsyncClient) -> None:
    body = await _signup(client)
    assert body["status"] == "logged_in"
    assert client.cookies.get(COOKIE)  # refresh 쿠키 설정됨

    me = await client.get("/api/v1/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.status_code == 200
    assert me.json()["name"] == "김영희"
    assert me.json()["region_name"] == "경기도"
    assert sorted(me.json()["interests"]) == ["music", "walking"]
    assert "phone" not in me.json()  # 개인정보 미노출


async def test_existing_member_logs_in_directly(client: AsyncClient) -> None:
    await _signup(client)
    client.cookies.clear()
    again = await _verify(client)
    assert again["status"] == "logged_in"
    assert again["user"]["name"] == "김영희"


async def test_refresh_rotation_and_reuse_detection(client: AsyncClient) -> None:
    await _signup(client)
    old = client.cookies.get(COOKIE)

    r1 = await client.post("/api/v1/auth/refresh")
    assert r1.status_code == 200 and r1.json()["access_token"]
    new = client.cookies.get(COOKIE)
    assert new and new != old

    # 회전 전 토큰 재사용 → 거부 + 모든 세션 폐기
    client.cookies.clear()
    r2 = await client.post("/api/v1/auth/refresh", json={"refresh_token": old})
    assert r2.status_code == 401 and r2.json()["error"]["code"] == "token_reused"
    r3 = await client.post("/api/v1/auth/refresh", json={"refresh_token": new})
    assert r3.status_code == 401


async def test_logout_revokes_refresh(client: AsyncClient) -> None:
    await _signup(client)
    token = client.cookies.get(COOKIE)
    assert (await client.post("/api/v1/auth/logout")).status_code == 204
    r = await client.post("/api/v1/auth/refresh", json={"refresh_token": token})
    assert r.status_code == 401


async def test_under_age_rejected(client: AsyncClient) -> None:
    young = {**PERSON, "birth_date": "1990-01-01", "phone": "01099998888"}
    start = (await client.post("/api/v1/auth/pass/start", json=young)).json()
    r = await client.post(
        "/api/v1/auth/pass/verify",
        json={"session_id": start["session_id"], "code": start["dev_code"]},
    )
    assert r.status_code == 403 and r.json()["error"]["code"] == "age_restricted"


async def test_phone_owned_by_other_person_rejected(client: AsyncClient) -> None:
    await _signup(client)
    other = {**PERSON, "name": "박철수"}  # 다른 사람(다른 CI), 같은 번호
    r = await _verify_raw(client, other)
    assert r.status_code == 409 and r.json()["error"]["code"] == "phone_in_use"


async def test_invalid_signup_input(client: AsyncClient) -> None:
    v = await _verify(client)
    r = await client.post(
        "/api/v1/auth/signup",
        json={"signup_token": v["signup_token"], "region_code": "99", "interests": ["walking"]},
    )
    assert r.status_code == 422 and r.json()["error"]["code"] == "invalid_profile_input"


async def test_validation_error_format(client: AsyncClient) -> None:
    r = await client.post("/api/v1/auth/pass/start", json={**PERSON, "phone": "1234"})
    assert r.status_code == 422
    assert r.json()["error"] == {
        "code": "validation_error",
        "message": "휴대전화 번호를 다시 확인해 주세요.",
        "fields": ["phone"],
    }


async def test_me_requires_auth(client: AsyncClient) -> None:
    r = await client.get("/api/v1/me")
    assert r.status_code == 401 and r.json()["error"]["code"] == "not_authenticated"


async def _verify_raw(client: AsyncClient, person: dict):  # noqa: ANN202
    start = (await client.post("/api/v1/auth/pass/start", json=person)).json()
    return await client.post(
        "/api/v1/auth/pass/verify",
        json={"session_id": start["session_id"], "code": start["dev_code"]},
    )


# ---------- 프로필 (⑨ 마이페이지) ----------


async def _auth_headers(client: AsyncClient) -> dict:
    body = await _signup(client)
    return {"Authorization": f"Bearer {body['access_token']}"}


async def test_me_includes_age_and_intro(client: AsyncClient) -> None:
    h = await _auth_headers(client)
    me = (await client.get("/api/v1/me", headers=h)).json()
    assert me["intro"] == ""
    assert 60 <= me["age"] <= 100  # 1955년생


async def test_update_profile_partial(client: AsyncClient) -> None:
    h = await _auth_headers(client)
    r = await client.patch("/api/v1/me", headers=h, json={"intro": "  산책과 \n 영화를 좋아해요 "})
    assert r.status_code == 200
    body = r.json()
    assert body["intro"] == "산책과 영화를 좋아해요"
    assert body["region_code"] == "41"  # 안 보낸 항목은 그대로
    assert sorted(body["interests"]) == ["music", "walking"]


async def test_update_interests_keeps_overlap(client: AsyncClient) -> None:
    h = await _auth_headers(client)
    r = await client.patch(
        "/api/v1/me", headers=h, json={"interests": ["music", "cooking"], "region_code": "11"}
    )
    assert r.status_code == 200, r.text
    assert sorted(r.json()["interests"]) == ["cooking", "music"]
    assert r.json()["region_name"] == "서울특별시"
    # 다시 조회해도 반영돼 있어야 함
    me = (await client.get("/api/v1/me", headers=h)).json()
    assert sorted(me["interests"]) == ["cooking", "music"]


async def test_update_profile_validation(client: AsyncClient) -> None:
    h = await _auth_headers(client)
    too_long = await client.patch("/api/v1/me", headers=h, json={"intro": "가" * 61})
    assert too_long.status_code == 422
    empty = await client.patch("/api/v1/me", headers=h, json={"interests": []})
    assert empty.status_code == 422 and empty.json()["error"]["code"] == "invalid_profile_input"
    unauth = await client.patch("/api/v1/me", json={"intro": "x"})
    assert unauth.status_code == 401
