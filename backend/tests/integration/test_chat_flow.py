"""⑤ 대화: 친구만 대화 가능 → 텍스트·음성 → 폴링(after) → 안 읽은 개수"""

import pytest
from httpx import AsyncClient

from tests.integration.helpers import signup_user


async def _friends(client: AsyncClient) -> tuple[dict, dict, dict, dict]:
    ha, a = await signup_user(client, "김영희")
    hb, b = await signup_user(client, "박철수")
    await client.post("/api/v1/friends/requests", headers=ha, json={"to_user_id": b["id"]})
    await client.post("/api/v1/friends/requests", headers=hb, json={"to_user_id": a["id"]})
    return ha, a, hb, b


@pytest.fixture(autouse=True)
def _media_tmp(tmp_path):  # noqa: ANN001
    """업로드 파일은 테스트 임시 폴더로"""
    from app.core.storage import LocalMediaStorage, get_media_storage
    from app.main import app as fastapi_app

    fastapi_app.dependency_overrides[get_media_storage] = lambda: LocalMediaStorage(str(tmp_path))
    yield
    fastapi_app.dependency_overrides.pop(get_media_storage, None)


async def test_only_friends_can_chat(client: AsyncClient) -> None:
    ha, _ = await signup_user(client, "김영희")
    _, b = await signup_user(client, "박철수")
    r = await client.post(f"/api/v1/chats/with/{b['id']}", headers=ha)
    assert r.status_code == 403 and r.json()["error"]["code"] == "not_friends"


async def test_text_voice_polling_unread(client: AsyncClient) -> None:
    ha, a, hb, b = await _friends(client)

    room = (await client.post(f"/api/v1/chats/with/{b['id']}", headers=ha)).json()
    assert room["peer"]["name"] == "박철수"
    # 상대가 열어도 같은 방
    same = (await client.post(f"/api/v1/chats/with/{a['id']}", headers=hb)).json()
    assert same["id"] == room["id"]
    rid = room["id"]

    m1 = await client.post(
        f"/api/v1/chats/{rid}/messages", headers=ha, json={"text": " 안녕하세요! "}
    )
    assert m1.status_code == 201 and m1.json()["body"] == "안녕하세요!" and m1.json()["mine"]

    v = await client.post(
        f"/api/v1/chats/{rid}/voice",
        headers=ha,
        files={"audio": ("v.webm", b"\x1aE\xdf\xa3fake-webm", "audio/webm;codecs=opus")},
        data={"duration_sec": "4"},
    )
    assert v.status_code == 201, v.text
    voice = v.json()
    assert voice["kind"] == "voice" and voice["duration_sec"] == 4 and voice["audio_url"]

    # 상대 목록: 안 읽은 2개, 미리보기는 음성
    rooms_b = (await client.get("/api/v1/chats", headers=hb)).json()
    assert rooms_b[0]["unread"] == 2 and rooms_b[0]["last_message"] == "🎤 음성 메시지"

    # 상대가 열면 읽음 처리
    msgs = (await client.get(f"/api/v1/chats/{rid}/messages", headers=hb)).json()
    assert [m["kind"] for m in msgs] == ["text", "voice"] and not msgs[0]["mine"]
    assert (await client.get("/api/v1/chats", headers=hb)).json()[0]["unread"] == 0

    # 폴링: after 이후만
    await client.post(f"/api/v1/chats/{rid}/messages", headers=hb, json={"text": "반가워요"})
    new = (await client.get(f"/api/v1/chats/{rid}/messages?after={voice['id']}", headers=ha)).json()
    assert [m["body"] for m in new] == ["반가워요"]

    # 음성 파일은 방 참여자만
    assert (await client.get(f"/api/v1/chats/voice/{voice['id']}", headers=hb)).status_code == 200
    hc, _ = await signup_user(client, "이순자")
    assert (await client.get(f"/api/v1/chats/voice/{voice['id']}", headers=hc)).status_code == 404
    assert (await client.get(f"/api/v1/chats/{rid}/messages", headers=hc)).status_code == 404


async def test_invalid_messages(client: AsyncClient) -> None:
    ha, _, _, b = await _friends(client)
    rid = (await client.post(f"/api/v1/chats/with/{b['id']}", headers=ha)).json()["id"]
    blank = await client.post(f"/api/v1/chats/{rid}/messages", headers=ha, json={"text": "   "})
    assert blank.status_code == 422
    bad_type = await client.post(
        f"/api/v1/chats/{rid}/voice",
        headers=ha,
        files={"audio": ("x.exe", b"MZ", "application/octet-stream")},
    )
    assert bad_type.status_code == 422
