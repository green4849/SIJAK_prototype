"""C4 휴대폰 알림 — 받는 주소 검사(SSRF), 밤 시간 조용히, 보내는 내용"""

import json
from datetime import UTC, datetime

import pytest

from app.domains.notification.push import PushMessage, allowed_endpoint, is_quiet


@pytest.mark.parametrize(
    "endpoint",
    [
        "https://fcm.googleapis.com/fcm/send/abc",
        "https://updates.push.services.mozilla.com/wpush/v2/abc",
        "https://web.push.apple.com/QK1",
        "https://wns2-sg2p.notify.windows.com/w/?token=abc",
        "https://FCM.googleapis.com:443/fcm/send/abc",
    ],
)
def test_known_push_services(endpoint: str) -> None:
    assert allowed_endpoint(endpoint)


@pytest.mark.parametrize(
    "endpoint",
    [
        "http://fcm.googleapis.com/fcm/send/abc",
        "https://localhost/x",
        "https://10.0.0.1/x",
        "https://googleapis.com/x",
        "https://xfcm.googleapis.com/x",
        "https://fcm.googleapis.com.attacker.example/x",
        "https://fcm.googleapis.com:8443/x",
        "https://a:b@fcm.googleapis.com/x",
        "https://fcm.googleapis.com:notaport/x",
        "fcm.googleapis.com/x",
        "",
    ],
)
def test_other_addresses_rejected(endpoint: str) -> None:
    assert not allowed_endpoint(endpoint)


@pytest.mark.parametrize(
    ("utc_hour", "quiet"),
    # 한국 = UTC+9: 11시 UTC = 20시, 12시 = 21시(조용히), 22시 = 7시(조용히), 23시 = 8시
    [(11, False), (12, True), (22, True), (23, False)],
)
def test_quiet_hours_kst(utc_hour: int, quiet: bool) -> None:
    assert is_quiet(datetime(2026, 11, 27, utc_hour, tzinfo=UTC)) is quiet


def test_payload_is_korean_json() -> None:
    msg = PushMessage("새 친구 신청", "김영희님이 친구 신청을 보냈어요", "/friends", "f:1")
    data = json.loads(msg.payload(datetime(2026, 11, 27, 3, tzinfo=UTC)))  # 한국 12시
    assert data == {
        "title": "새 친구 신청",
        "body": "김영희님이 친구 신청을 보냈어요",
        "link": "/friends",
        "tag": "f:1",
        "quiet": False,
    }
