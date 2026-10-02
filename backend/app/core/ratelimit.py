"""요청 횟수 제한 (B2) — 인증번호 무차별 요청, 메시지·신고 폭주 막기.

    from app.core.ratelimit import Rule, enforce
    PASS_START_PER_PHONE = Rule("pass_start_phone", limit=5, window_sec=600, action="인증번호 요청")
    await enforce(PASS_START_PER_PHONE, phone)        # 넘으면 RateLimitedError(429)

- 규칙은 각 도메인 router 가 소유한다(어디에 얼마나 거는지는 HTTP 계층의 결정).
- 저장소는 `RateLimitStore` 인터페이스 뒤에 숨긴다. 지금은 프로세스 메모리(서버 1대 기준) →
  서버를 여러 대로 늘릴 때 Redis 구현으로 바꾼다 (B9). 호출하는 쪽 코드는 그대로.
- 창(window) 안의 요청 시각을 기억하는 '미끄러지는 창' 방식: 경계 시점에 두 배로 몰리는 문제 없음.
"""

import math
import time
from collections import deque
from dataclasses import dataclass
from functools import lru_cache
from typing import Protocol

from app.core.config import get_settings
from app.core.errors import DomainError


@dataclass(frozen=True)
class Rule:
    name: str
    limit: int
    window_sec: int
    #: 안내 문구에 들어갈 동작 이름 — "인증번호 요청을 너무 여러 번 했어요"
    action: str


class RateLimitedError(DomainError):
    status_code = 429
    code = "rate_limited"

    def __init__(self, rule: Rule, retry_after: int) -> None:
        what = _with_object_particle(rule.action)
        wait = _wait_text(retry_after)
        super().__init__(f"{what} 너무 여러 번 했어요. {wait} 뒤에 다시 해 주세요.")
        self.retry_after = retry_after
        self.headers = {"Retry-After": str(retry_after)}


def _with_object_particle(word: str) -> str:
    """목적격 조사 — 받침 있으면 '을', 없으면 '를' (요청을 / 보내기를)"""
    last = word[-1]
    if "가" <= last <= "힣":
        return word + ("을" if (ord(last) - ord("가")) % 28 else "를")
    return word + "을(를)"


def _wait_text(seconds: int) -> str:
    if seconds < 60:
        return f"{max(seconds, 1)}초"
    return f"{math.ceil(seconds / 60)}분"


class RateLimitStore(Protocol):
    def hit(self, key: str, limit: int, window_sec: int, now: float) -> int | None:
        """요청 한 번을 기록. 허용이면 None, 초과면 다시 시도까지 남은 초."""
        ...

    def clear(self) -> None: ...


class MemoryRateLimitStore:
    """프로세스 메모리 저장 — 서버 1대·시연용. 여러 대면 Redis 구현으로 (B9)."""

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = {}

    def hit(self, key: str, limit: int, window_sec: int, now: float) -> int | None:
        q = self._hits.setdefault(key, deque())
        while q and q[0] <= now - window_sec:
            q.popleft()
        if len(q) >= limit:
            # 가장 오래된 기록이 창 밖으로 나가는 시점까지 기다려야 한다
            return max(1, math.ceil(q[0] + window_sec - now))
        q.append(now)
        return None

    def clear(self) -> None:
        self._hits.clear()


@lru_cache
def get_rate_limit_store() -> RateLimitStore:
    return MemoryRateLimitStore()


async def enforce(rule: Rule, *key_parts: object) -> None:
    """규칙 하나를 확인하고 기록. 초과면 RateLimitedError."""
    if not get_settings().rate_limit_enabled:
        return
    key = ":".join([rule.name, *map(str, key_parts)])
    retry_after = get_rate_limit_store().hit(key, rule.limit, rule.window_sec, time.monotonic())
    if retry_after is not None:
        raise RateLimitedError(rule, retry_after)
