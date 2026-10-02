"""B2 — 요청 횟수 제한이 실제 API에 걸려 있는지 (429 + Retry-After + 안내 문구)."""

from httpx import AsyncClient

from app.domains.auth.router import PASS_START_PER_PHONE
from app.domains.chat.router import SEND_TEXT_PER_USER
from tests.integration.helpers import signup_user


async def test_pass_start_limited_per_phone(client: AsyncClient) -> None:
    person = {"name": "김영희", "birth_date": "1955-03-01", "phone": "01077778888", "gender": "F"}
    for _ in range(PASS_START_PER_PHONE.limit):
        assert (await client.post("/api/v1/auth/pass/start", json=person)).status_code == 200

    r = await client.post("/api/v1/auth/pass/start", json=person)
    assert r.status_code == 429
    assert r.json()["error"]["code"] == "rate_limited"
    assert "인증번호 요청을 너무 여러 번 했어요" in r.json()["error"]["message"]
    assert int(r.headers["Retry-After"]) > 0

    # 다른 번호는 영향 없음
    other = {**person, "phone": "01077779999"}
    assert (await client.post("/api/v1/auth/pass/start", json=other)).status_code == 200


async def test_messages_limited_per_user(client: AsyncClient) -> None:
    ha, a = await signup_user(client, "김영희")
    hb, b = await signup_user(client, "박철수")
    await client.post("/api/v1/friends/requests", headers=ha, json={"to_user_id": b["id"]})
    await client.post("/api/v1/friends/requests", headers=hb, json={"to_user_id": a["id"]})
    room = (await client.post(f"/api/v1/chats/with/{b['id']}", headers=ha)).json()

    url = f"/api/v1/chats/{room['id']}/messages"
    for i in range(SEND_TEXT_PER_USER.limit):
        r = await client.post(url, headers=ha, json={"text": f"안녕하세요 {i}"})
        assert r.status_code == 201
    r = await client.post(url, headers=ha, json={"text": "한 번 더"})
    assert r.status_code == 429
    assert "메시지 보내기를 너무 여러 번 했어요" in r.json()["error"]["message"]

    # 상대방은 따로 센다
    assert (await client.post(url, headers=hb, json={"text": "네~"})).status_code == 201
