"""⑤ 대화: 친구만 대화 가능 → 텍스트·음성 → 폴링(after) → 안 읽은 개수"""

import pytest
from httpx import AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

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

    # 지난 대화 조회는 커서보다 오래된 메시지만 돌려주며 읽음 표시를 바꾸지 않는다.
    older = await client.get(f"/api/v1/chats/{rid}/messages?before={voice['id']}", headers=hb)
    assert older.status_code == 200
    assert [m["id"] for m in older.json()] == [m1.json()["id"]]
    assert (await client.get("/api/v1/chats", headers=hb)).json()[0]["unread"] == 2
    invalid_cursor = await client.get(
        f"/api/v1/chats/{rid}/messages?after=1&before={voice['id']}", headers=hb
    )
    assert invalid_cursor.status_code == 422

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


async def test_room_list_query_count_does_not_grow_with_rooms(
    client: AsyncClient, db_sessionmaker: async_sessionmaker[AsyncSession]
) -> None:
    ha, a, hb, b = await _friends(client)

    async def add_room(other_headers: dict, other: dict) -> None:
        room = (await client.post(f"/api/v1/chats/with/{other['id']}", headers=ha)).json()
        await client.post(
            f"/api/v1/chats/{room['id']}/messages",
            headers=other_headers,
            json={"text": "안녕하세요"},
        )

    await add_room(hb, b)
    engine = db_sessionmaker.kw["bind"].sync_engine

    async def list_selects() -> tuple[int, int]:
        statements: list[str] = []

        def record(_conn, _cursor, statement: str, _parameters, _context, _executemany) -> None:
            if statement.lstrip().upper().startswith("SELECT"):
                statements.append(statement)

        event.listen(engine, "before_cursor_execute", record)
        try:
            response = await client.get("/api/v1/chats", headers=ha)
        finally:
            event.remove(engine, "before_cursor_execute", record)
        assert response.status_code == 200
        return len(statements), len(response.json())

    one_queries, one_rooms = await list_selects()
    assert one_rooms == 1

    hc, c = await signup_user(client, "이순자")
    await client.post("/api/v1/friends/requests", headers=ha, json={"to_user_id": c["id"]})
    await client.post("/api/v1/friends/requests", headers=hc, json={"to_user_id": a["id"]})
    await add_room(hc, c)

    two_queries, two_rooms = await list_selects()
    assert two_rooms == 2
    assert two_queries == one_queries


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


@pytest.mark.parametrize("committed", [False, True])
async def test_voice_commit_failure_preserves_persisted_files(
    client: AsyncClient,
    db_sessionmaker: async_sessionmaker[AsyncSession],
    monkeypatch,
    tmp_path,
    committed: bool,
) -> None:
    from sqlalchemy import select

    from app.core.storage import LocalMediaStorage
    from app.domains.chat.models import ChatMessage, PendingMediaDeletion
    from app.domains.chat.repository import ChatRepository
    from app.jobs import expire_voice

    ha, a, hb, b = await _friends(client)
    room = (await client.post(f"/api/v1/chats/with/{b['id']}", headers=ha)).json()
    original = ChatRepository.commit
    first = True

    async def fail_once(repo: ChatRepository) -> None:
        nonlocal first
        if first:
            first = False
            if committed:
                await original(repo)
            raise OSError("simulated lost commit acknowledgement")
        await original(repo)

    monkeypatch.setattr(ChatRepository, "commit", fail_once)
    response = await client.post(
        f"/api/v1/chats/{room['id']}/voice",
        headers=ha,
        files={"audio": ("test.webm", b"fake-webm", "audio/webm")},
    )
    assert response.status_code == 500
    async with db_sessionmaker() as session:
        messages = list(await session.scalars(select(ChatMessage)))
        pending = list(await session.scalars(select(PendingMediaDeletion)))
    if committed:
        assert len(messages) == 1 and pending == []
        assert (
            await client.get(f"/api/v1/chats/voice/{messages[0].id}", headers=hb)
        ).status_code == 200
    else:
        assert messages == [] and len(pending) == 1
        await expire_voice(db_sessionmaker, LocalMediaStorage(str(tmp_path)))
        assert not (tmp_path / pending[0].key).exists()
