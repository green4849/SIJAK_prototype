"""예약 작업 (B3·C11): 탈퇴 30일 삭제 · 음성 90일 정리 · 관계 지수 일괄 계산.

여러 번 돌려도 같은 결과인지도 본다.
"""

import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

from httpx import AsyncClient
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.storage import LocalMediaStorage
from app.domains.auth.models import User, WithdrawalReasonCount
from app.domains.chat.models import ChatMessage, ChatRoom
from app.domains.chat.service import VOICE_EXPIRED_TEXT
from app.domains.point.service import kst_today
from app.domains.wellbeing.models import RelationIndexWeek
from app.jobs import expire_voice, purge_withdrawn, refresh_relation_index
from tests.integration.helpers import signup_user

API = "/api/v1"


async def _room(client: AsyncClient) -> tuple[dict, dict, dict, dict, str]:
    ha, a = await signup_user(client, "김영희")
    hb, b = await signup_user(client, "박정호")
    await client.post(f"{API}/friends/requests", headers=ha, json={"to_user_id": b["id"]})
    await client.post(f"{API}/friends/requests", headers=hb, json={"to_user_id": a["id"]})
    rid = (await client.post(f"{API}/chats/with/{b['id']}", headers=ha)).json()["id"]
    return ha, a, hb, b, rid


async def _voice(
    sm: async_sessionmaker[AsyncSession],
    storage: LocalMediaStorage,
    room_id: str,
    sender_id: str,
    days_ago: int,
) -> tuple[int, str]:
    key = storage.save(b"fake-webm", "webm")
    async with sm() as s:
        m = ChatMessage(
            room_id=uuid.UUID(room_id),
            sender_id=uuid.UUID(sender_id),
            kind="voice",
            audio_key=key,
            duration_sec=3,
            created_at=datetime.now(UTC) - timedelta(days=days_ago),
        )
        s.add(m)
        await s.commit()
        return m.id, key


async def test_purge_withdrawn_after_30_days(
    client: AsyncClient, db_sessionmaker: async_sessionmaker[AsyncSession], tmp_path: Path
) -> None:
    storage = LocalMediaStorage(str(tmp_path))
    ha, a, hb, b, rid = await _room(client)
    _, key = await _voice(db_sessionmaker, storage, rid, b["id"], days_ago=1)
    hc, c = await signup_user(client, "이순자")

    await client.post(f"{API}/me/withdraw", headers=ha, json={"reason": "다른 앱을 써요"})
    await client.post(f"{API}/me/withdraw", headers=hc, json={})

    # 아직 30일이 안 됐으면 아무것도 지우지 않는다
    assert await purge_withdrawn(db_sessionmaker, storage) == 0

    # a 만 삭제일이 됨 (c 는 아직)
    async with db_sessionmaker() as s:
        await s.execute(
            update(User).where(User.id == uuid.UUID(a["id"])).values(delete_after=kst_today())
        )
        await s.commit()
    assert await purge_withdrawn(db_sessionmaker, storage) == 1
    assert await purge_withdrawn(db_sessionmaker, storage) == 0  # 다시 돌려도 그대로

    async with db_sessionmaker() as s:
        names = set(await s.scalars(select(User.name)))
        rooms = await s.scalar(select(func.count()).select_from(ChatRoom))
        counts = list(await s.scalars(select(WithdrawalReasonCount)))
    assert names == {"박정호", "이순자"}  # 이순자는 탈퇴했지만 아직 30일 전
    assert rooms == 0  # 김영희가 있던 대화방·메시지도 함께
    assert not (tmp_path / key).exists()  # 그 방의 음성 파일도
    # 누가 탈퇴했는지는 남기지 않고 이유만 달별로
    assert [(x.reason, x.count, x.month.day) for x in counts] == [("다른 앱을 써요", 1, 1)]

    # 남은 분의 화면은 그대로 동작
    assert (await client.get(f"{API}/friends", headers=hb)).json() == []
    assert (await client.get(f"{API}/chats", headers=hb)).status_code == 200


async def test_expire_voice_after_retention(
    client: AsyncClient, db_sessionmaker: async_sessionmaker[AsyncSession], tmp_path: Path
) -> None:
    storage = LocalMediaStorage(str(tmp_path))
    ha, a, hb, b, rid = await _room(client)
    old_id, old_key = await _voice(db_sessionmaker, storage, rid, a["id"], days_ago=91)
    new_id, new_key = await _voice(db_sessionmaker, storage, rid, a["id"], days_ago=10)

    assert await expire_voice(db_sessionmaker, storage) == 1
    assert await expire_voice(db_sessionmaker, storage) == 0
    assert not (tmp_path / old_key).exists()
    assert (tmp_path / new_key).exists()

    msgs = {
        m["id"]: m for m in (await client.get(f"{API}/chats/{rid}/messages", headers=hb)).json()
    }
    assert msgs[old_id]["kind"] == "voice" and msgs[old_id]["audio_url"] is None
    assert msgs[old_id]["body"] == VOICE_EXPIRED_TEXT
    assert msgs[new_id]["audio_url"].endswith(f"/chats/voice/{new_id}")
    # 지운 음성 파일은 더 받을 수 없다
    r = await client.get(f"{API}/chats/voice/{old_id}", headers=hb)
    assert r.status_code == 404


async def test_relation_index_for_everyone(
    client: AsyncClient, db_sessionmaker: async_sessionmaker[AsyncSession], tmp_path: Path
) -> None:
    """화면을 한 번도 안 본 분도 지수가 남아 운영자 돌봄 목록에 들어온다"""
    storage = LocalMediaStorage(str(tmp_path))
    hop, op = await signup_user(client, "박선희")
    _, a = await signup_user(client, "최말순")
    hd, _ = await signup_user(client, "탈퇴할분")
    await client.post(f"{API}/me/withdraw", headers=hd, json={})
    async with db_sessionmaker() as s:
        await s.execute(update(User).where(User.id == uuid.UUID(op["id"])).values(role="operator"))
        # 최말순: 열흘째 접속 없음 → '앱 활동' 요인이 0
        await s.execute(
            update(User)
            .where(User.id == uuid.UUID(a["id"]))
            .values(last_login_at=datetime.now(UTC) - timedelta(days=10))
        )
        await s.commit()
    assert (await client.get(f"{API}/admin/watch", headers=hop)).json() == []

    assert await refresh_relation_index(db_sessionmaker, storage) == 2  # 탈퇴한 분 빼고
    assert await refresh_relation_index(db_sessionmaker, storage) == 2
    async with db_sessionmaker() as s:
        rows = list(await s.scalars(select(RelationIndexWeek)))
    assert len(rows) == 2  # 같은 주에는 한 줄 (덮어 씀)

    watch = (await client.get(f"{API}/admin/watch", headers=hop)).json()
    w = next(x for x in watch if x["name"] == "최말순")
    # 0.25·0 + 0.30·0 + 0.20·70 + 0.15·0 + 0.10·70 = 21 → '위험'
    assert w["relation_score"] == 21
    assert w["signal"] == "10일째 접속이 없어요"
