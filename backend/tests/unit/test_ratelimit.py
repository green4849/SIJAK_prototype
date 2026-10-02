"""B2 — 요청 횟수 제한: 미끄러지는 창, 다시 시도까지 남은 시간, 안내 문구."""

from app.core.ratelimit import MemoryRateLimitStore, RateLimitedError, Rule


def test_allows_up_to_limit_then_blocks() -> None:
    store = MemoryRateLimitStore()
    for i in range(3):
        assert store.hit("k", limit=3, window_sec=60, now=100 + i) is None
    # 가장 오래된 요청(100초)이 창 밖으로 나가는 160초까지 기다려야 한다
    assert store.hit("k", limit=3, window_sec=60, now=110) == 50


def test_sliding_window_frees_slot() -> None:
    store = MemoryRateLimitStore()
    for t in (0, 10, 20):
        store.hit("k", limit=3, window_sec=60, now=t)
    assert store.hit("k", limit=3, window_sec=60, now=61) is None  # 0초 기록이 빠짐
    assert store.hit("k", limit=3, window_sec=60, now=62) == 8  # 10초 기록이 빠질 때까지


def test_keys_are_independent() -> None:
    store = MemoryRateLimitStore()
    assert store.hit("a", limit=1, window_sec=60, now=0) is None
    assert store.hit("b", limit=1, window_sec=60, now=0) is None
    assert store.hit("a", limit=1, window_sec=60, now=1) is not None


def test_blocked_attempts_do_not_extend_wait() -> None:
    store = MemoryRateLimitStore()
    store.hit("k", limit=1, window_sec=60, now=0)
    for t in range(1, 30):
        store.hit("k", limit=1, window_sec=60, now=t)  # 거절된 시도는 기록하지 않음
    assert store.hit("k", limit=1, window_sec=60, now=60) is None


def test_message_is_plain_korean() -> None:
    e1 = RateLimitedError(Rule("x", 1, 600, "인증번호 요청"), retry_after=540)
    assert e1.message == "인증번호 요청을 너무 여러 번 했어요. 9분 뒤에 다시 해 주세요."
    assert e1.headers == {"Retry-After": "540"}
    e2 = RateLimitedError(Rule("x", 1, 60, "메시지 보내기"), retry_after=12)
    assert e2.message == "메시지 보내기를 너무 여러 번 했어요. 12초 뒤에 다시 해 주세요."
