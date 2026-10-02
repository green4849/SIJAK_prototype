"""통합 테스트 공용: Mock PASS로 가입시키고 인증 헤더를 돌려준다."""

from httpx import AsyncClient

_seq = 0


async def signup_user(
    client: AsyncClient,
    name: str,
    *,
    region: str = "41",
    interests: list[str] | None = None,
    birth: str = "1955-03-01",
) -> tuple[dict, dict]:
    """(headers, user) 반환. 전화번호는 호출마다 다르게."""
    global _seq
    _seq += 1
    person = {"name": name, "birth_date": birth, "phone": f"0109000{_seq:04d}", "gender": "F"}
    start = (await client.post("/api/v1/auth/pass/start", json=person)).json()
    v = (
        await client.post(
            "/api/v1/auth/pass/verify",
            json={"session_id": start["session_id"], "code": start["dev_code"]},
        )
    ).json()
    r = await client.post(
        "/api/v1/auth/signup",
        json={
            "signup_token": v["signup_token"],
            "region_code": region,
            "interests": interests or ["walking"],
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    client.cookies.clear()  # 여러 사용자 섞이지 않게
    return {"Authorization": f"Bearer {body['access_token']}"}, body["user"]
