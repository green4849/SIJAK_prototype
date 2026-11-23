"""운영자·복지기관 화면 (B7).

운영자 역할(users.role='operator')만 부른다 — router 의 CurrentOperator.

- 신고·위험 대화: risk 의 자동 감지 기록과 이웃 신고를 사건으로 보여 주고, 처리하면
  처리 기록을 남기고 정지·제한은 실제 계정 상태(auth)에 반영한다.
- 돌봄이 필요한 이웃: wellbeing 의 이번·지난 주 사회적 관계 지수가 낮은 순.
다른 도메인은 각 서비스의 공개 메서드로만 읽는다.
"""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta, timezone

from app.core.errors import ConflictError, NotFoundError
from app.domains.admin.models import ACTIONS, SUSPEND_DAYS
from app.domains.admin.repository import AdminRepository
from app.domains.auth.constants import REGIONS
from app.domains.auth.service import AuthService, age_on
from app.domains.chat.service import ChatService
from app.domains.emergency.service import EmergencyService
from app.domains.risk.models import REPORT_REASONS, Report, RiskEvent
from app.domains.risk.service import RiskService
from app.domains.wellbeing.service import WellbeingService

KST = timezone(timedelta(hours=9))
CASE_LIMIT = 100
WATCH_LIMIT = 30
EXCERPT_MAX = 80
# 신고 이유별 위험도 (데모와 같게): 돈·개인정보는 3 위험, 나머지는 2 경고
_SERIOUS_REPORTS = {"money", "personal_info"}
_LEVEL_LABEL = {"caution": "주의", "risk": "위험", "urgent": "긴급"}


@dataclass(frozen=True)
class Case:
    id: str
    source: str  # report / auto
    target_id: uuid.UUID
    target_name: str
    reasons: list[str]
    excerpt: str | None
    level: int
    reports_count: int
    created_at: datetime
    status: str


@dataclass(frozen=True)
class WatchItem:
    user_id: uuid.UUID
    name: str
    age: int
    region_name: str
    relation_score: int
    last_seen_text: str
    signal: str
    guardian_notified: bool


@dataclass(frozen=True)
class _RawCase:
    id: str
    source: str
    target_id: uuid.UUID
    reasons: list[str]
    message_id: int | None
    level: int
    created_at: datetime


def _excerpt(text: str | None) -> str | None:
    if not text:
        return None
    return text if len(text) <= EXCERPT_MAX else text[: EXCERPT_MAX - 1] + "…"


def _days_since(at: datetime | None, now: datetime) -> int | None:
    if at is None:
        return None
    return (now.astimezone(KST).date() - at.astimezone(KST).date()).days


def _last_seen_text(days: int | None) -> str:
    if days is None:
        return "접속 기록 없음"
    if days <= 0:
        return "오늘"
    if days == 1:
        return "어제"
    return f"{days}일 전"


class AdminService:
    def __init__(
        self,
        repo: AdminRepository,
        auth: AuthService,
        risk: RiskService,
        chat: ChatService,
        wellbeing: WellbeingService,
        emergency: EmergencyService,
    ) -> None:
        self.repo = repo
        self.auth = auth
        self.risk = risk
        self.chat = chat
        self.wellbeing = wellbeing
        self.emergency = emergency

    # ---------- 신고·위험 대화 ----------

    async def cases(self) -> list[Case]:
        raw = await self._raw_cases()
        out = await self._decorate(raw)
        # 처리 전이 위로, 위험도 높은 순, 최근 순
        out.sort(key=lambda c: (c.status != "open", -c.level, -c.created_at.timestamp()))
        return out

    async def act(self, operator_id: uuid.UUID, case_id: str, action: str) -> Case:
        raw = await self._find(case_id)
        await self.repo.lock_case(case_id)
        if (await self.repo.last_actions([case_id])).get(case_id):
            raise ConflictError("이미 처리한 신고예요.", code="case_closed")
        await self.repo.add_action(case_id, action, raw.target_id, operator_id)
        if action == "suspend":
            until = datetime.now(UTC) + timedelta(days=SUSPEND_DAYS)
            await self.auth.sanction(raw.target_id, "suspended", until)
        elif action == "ban":
            await self.auth.sanction(raw.target_id, "banned", None)
        if raw.source == "report":
            await self.risk.mark_report_reviewed(uuid.UUID(case_id.removeprefix("report-")))
        await self.repo.commit()
        return (await self._decorate([raw]))[0]

    async def _raw_cases(self) -> list[_RawCase]:
        events = await self.risk.recent_events(CASE_LIMIT)
        reports = await self.risk.recent_reports(CASE_LIMIT)
        return [self._from_event(e) for e in events] + [self._from_report(r) for r in reports]

    async def _find(self, case_id: str) -> _RawCase:
        kind, _, key = case_id.partition("-")
        if kind == "auto" and key.isdigit():
            event = await self.risk.get_event(int(key))
            if event:
                return self._from_event(event)
        if kind == "report":
            try:
                report = await self.risk.get_report(uuid.UUID(key))
            except ValueError:
                report = None
            if report:
                return self._from_report(report)
        raise NotFoundError("없는 신고예요.")

    def _from_event(self, e: RiskEvent) -> _RawCase:
        return _RawCase(
            id=f"auto-{e.id}",
            source="auto",
            target_id=e.sender_id,
            reasons=self.risk.labels_for([c for c in e.codes.split(",") if c]),
            message_id=e.message_id,
            level=e.level,
            created_at=e.created_at,
        )

    @staticmethod
    def _from_report(r: Report) -> _RawCase:
        return _RawCase(
            id=f"report-{r.id}",
            source="report",
            target_id=r.target_id,
            reasons=[REPORT_REASONS.get(r.reason, r.reason)],
            message_id=r.message_id,
            level=3 if r.reason in _SERIOUS_REPORTS else 2,
            created_at=r.created_at,
        )

    async def _decorate(self, raw: list[_RawCase]) -> list[Case]:
        targets = {r.target_id for r in raw}
        users = await self.auth.get_users(targets)
        texts = await self.chat.message_texts({r.message_id for r in raw if r.message_id})
        counts = await self.risk.report_counts(targets)
        actions = await self.repo.last_actions([r.id for r in raw])
        return [
            Case(
                id=r.id,
                source=r.source,
                target_id=r.target_id,
                target_name=users[r.target_id].name if r.target_id in users else "알 수 없음",
                reasons=r.reasons,
                excerpt=_excerpt(texts.get(r.message_id)) if r.message_id else None,
                level=r.level,
                reports_count=counts.get(r.target_id, 0),
                created_at=r.created_at,
                status=ACTIONS[actions[r.id]] if r.id in actions else "open",
            )
            for r in raw
        ]

    # ---------- 돌봄이 필요한 이웃 ----------

    async def watch(self) -> list[WatchItem]:
        now = datetime.now(UTC)
        rows = await self.wellbeing.lowest_recent(WATCH_LIMIT)
        users = await self.auth.get_users({r.user_id for r in rows})
        sos = await self.emergency.recent_sos_user_ids(now - timedelta(days=7))
        today = now.astimezone(KST).date()
        out: list[WatchItem] = []
        for r in rows:
            u = users.get(r.user_id)
            if u is None or u.status == "deleted":
                continue
            days = _days_since(u.last_login_at, now)
            if days is not None and days >= 7:
                signal = f"{days}일째 접속이 없어요"
            elif r.previous is not None and r.score < r.previous:
                signal = f"지난주보다 {r.previous - r.score}점 내려갔어요"
            else:
                signal = f"사회적 관계 지수가 '{_LEVEL_LABEL.get(r.level, r.level)}' 단계예요"
            out.append(
                WatchItem(
                    user_id=u.id,
                    name=u.name,
                    age=age_on(u.birth_date, today),
                    region_name=REGIONS.get(u.region_code, u.region_code),
                    relation_score=r.score,
                    last_seen_text=_last_seen_text(days),
                    signal=signal,
                    guardian_notified=u.id in sos,
                )
            )
        return out
