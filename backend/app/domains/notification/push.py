"""휴대폰 알림(Web Push) 보내기 (C4) — 저장(커밋)된 소식만, 요청 응답을 붙잡지 않고.

    NotificationService.on_*()  → 알림함 줄 추가 + queue(): 보낼 것을 세션에 담아 둠 (커밋 전)
    부른 쪽이 commit             → after_commit: 백그라운드 작업으로 deliver()
                     rollback    → 담아 둔 것을 버림 (저장 안 된 소식은 알리지 않는다)

발송 결과: 404·410(구독 끝남)은 그 구독을 지우고, 성공은 last_sent_at 을 남긴다.
재시도는 하지 않는다 — 소식은 알림함에 그대로 있다.
"""

import asyncio
import json
import logging
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta, timezone
from urllib.parse import urlsplit

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import Session

from app.integrations.webpush import get_push_sender
from app.integrations.webpush.base import PushSender, PushTarget

log = logging.getLogger("push")

KST = timezone(timedelta(hours=9))
#: 이 시간(한국 시각)에는 소리·진동 없이 — 알림 설정의 '밤 9시~아침 8시'와 같게
QUIET_FROM_HOUR, QUIET_UNTIL_HOUR = 21, 8

#: 서버가 이 주소로 요청을 보내므로 알려진 푸시 서비스만 받는다 (SSRF 방지)
#: 정확히 같은 이름 또는 '.'+접미사
PUSH_HOSTS = (
    "fcm.googleapis.com",  # 크롬·삼성 인터넷·안드로이드 브라우저
    "push.services.mozilla.com",  # 파이어폭스
    "push.apple.com",  # 사파리 (아이폰은 홈 화면에 추가한 앱)
    "notify.windows.com",  # 엣지(옛 방식)
)


def allowed_endpoint(endpoint: str) -> bool:
    try:
        url = urlsplit(endpoint)
        port = url.port
    except ValueError:
        return False
    host = (url.hostname or "").lower()
    if url.scheme != "https" or url.username or url.password or port not in (None, 443):
        return False
    return any(host == h or host.endswith("." + h) for h in PUSH_HOSTS)


def is_quiet(now: datetime) -> bool:
    hour = now.astimezone(KST).hour
    return hour >= QUIET_FROM_HOUR or hour < QUIET_UNTIL_HOUR


@dataclass(frozen=True)
class PushMessage:
    title: str
    body: str
    #: 누르면 열 앱 안 경로 (/friends, /chats/<id>)
    link: str
    #: 같은 tag 는 기기에서 하나로 합쳐진다 (예: 같은 대화방의 새 메시지)
    tag: str
    #: 기기가 꺼져 있으면 푸시 서비스가 이만큼 들고 있다가 전한다
    ttl: int = 24 * 3600
    urgency: str = "normal"

    def payload(self, now: datetime) -> str:
        """서비스 워커(sw.js)가 받는 내용"""
        return json.dumps(
            {
                "title": self.title,
                "body": self.body,
                "link": self.link,
                "tag": self.tag,
                "quiet": is_quiet(now),
            },
            ensure_ascii=False,
        )


@dataclass(frozen=True)
class Delivery:
    sent: int
    failed: int
    ok: list[str]
    gone: list[str]


# ---------- 발송기·DB 세션 (시험에서 바꿔 끼운다) ----------

_sender_override: PushSender | None = None
_sessions: async_sessionmaker[AsyncSession] | None = None


def sender() -> PushSender | None:
    return _sender_override or get_push_sender()


def use_sender(s: PushSender | None) -> None:
    """시험용 — 가짜 발송기로 바꾸기 (None 이면 설정대로)"""
    global _sender_override
    _sender_override = s


def use_sessions(factory: async_sessionmaker[AsyncSession] | None) -> None:
    """시험용 — 발송 뒤 구독 정리에 쓸 DB (None 이면 앱 DB)"""
    global _sessions
    _sessions = factory


def _session_factory() -> async_sessionmaker[AsyncSession]:
    if _sessions is not None:
        return _sessions
    from app.core.database import SessionLocal

    return SessionLocal


# ---------- 보내기 ----------


async def send_now(targets: list[PushTarget], msg: PushMessage) -> Delivery:
    """지금 바로 보내고 결과를 모은다. 발송기가 없으면 아무것도 안 보냄"""
    s = sender()
    if s is None or not targets:
        return Delivery(0, 0, [], [])
    payload = msg.payload(datetime.now(UTC))
    results = await asyncio.gather(*(s.send(t, payload, msg.ttl, msg.urgency) for t in targets))
    ok = [t.endpoint for t, r in zip(targets, results, strict=True) if r.ok]
    gone = [t.endpoint for t, r in zip(targets, results, strict=True) if r.gone]
    failed = len(targets) - len(ok)
    if failed:
        reasons = sorted({r.error or "?" for r in results if not r.ok})
        log.info("휴대폰 알림 %d/%d 실패: %s", failed, len(targets), ", ".join(reasons))
    return Delivery(len(ok), failed, ok, gone)


async def record(delivery: Delivery) -> None:
    """끝난 구독 지우기·보낸 시각 남기기 — 발송과 따로 짧은 트랜잭션"""
    if not (delivery.ok or delivery.gone):
        return
    from app.domains.notification.repository import NotificationRepository

    async with _session_factory()() as session:
        await NotificationRepository(session).push_delivered(delivery.ok, delivery.gone)


async def deliver(items: list[tuple[list[PushTarget], PushMessage]]) -> None:
    try:
        for targets, msg in items:
            await record(await send_now(targets, msg))
    except Exception:  # 백그라운드 — 요청·알림함에는 영향 없게, 기록만
        log.exception("휴대폰 알림 보내기 실패")


# ---------- 커밋 뒤에 보내기 ----------

_OUTBOX = "push_outbox"
_running: set[asyncio.Task[None]] = set()


def queue(session: AsyncSession, targets: list[PushTarget], msg: PushMessage) -> None:
    """커밋되면 보낼 것으로 담아 둔다 (같은 트랜잭션의 알림함 줄과 함께 저장·취소)"""
    if targets:
        session.sync_session.info.setdefault(_OUTBOX, []).append((targets, msg))


@event.listens_for(Session, "after_commit")
def _after_commit(session: Session) -> None:
    items = session.info.pop(_OUTBOX, None)
    if not items:
        return
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:  # 이벤트 루프 밖(동기 스크립트) — 보내지 않는다
        return
    task = loop.create_task(deliver(items))
    _running.add(task)
    task.add_done_callback(_running.discard)


@event.listens_for(Session, "after_rollback")
@event.listens_for(Session, "after_soft_rollback")
def _after_rollback(session: Session, *_: object) -> None:
    session.info.pop(_OUTBOX, None)


async def drain() -> None:
    """시험·종료용 — 백그라운드 발송이 끝날 때까지 기다린다"""
    while _running:
        await asyncio.gather(*list(_running), return_exceptions=True)
