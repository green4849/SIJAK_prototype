"""문자 발송 — 솔라피 서명, 문자 본문, 결과 합치기, 운영 설정 검사"""

import hashlib
import hmac
from datetime import UTC, datetime

import pytest

from app.domains.emergency.service import format_phone, overall_status, sos_text
from app.integrations.sms.solapi import auth_header


def test_solapi_auth_header_signs_date_and_salt() -> None:
    now = datetime(2026, 11, 27, 1, 2, 3, tzinfo=UTC)
    h = auth_header("KEY", "SECRET", now=now, salt="abc")
    expected = hmac.new(b"SECRET", b"2026-11-27T01:02:03Zabc", hashlib.sha256).hexdigest()
    assert h == f"HMAC-SHA256 apiKey=KEY, date=2026-11-27T01:02:03Z, salt=abc, signature={expected}"
    assert "SECRET" not in h


@pytest.mark.parametrize(
    ("digits", "pretty"),
    [
        ("01012345678", "010-1234-5678"),
        ("0212345678", "02-1234-5678"),
        ("0311234567", "031-123-4567"),
    ],
)
def test_format_phone(digits: str, pretty: str) -> None:
    assert format_phone(digits) == pretty


def test_sos_text_is_short() -> None:
    t = sos_text("김시작", "01012345678")
    assert t == "[시작] 김시작님이 긴급 도움을 요청했어요. 바로 연락해 주세요. 010-1234-5678"
    assert len(t) <= 60


@pytest.mark.parametrize(
    ("statuses", "overall"),
    [
        ([], "not_sent"),
        (["not_sent", "not_sent"], "not_sent"),
        (["sent", "sent"], "sent"),
        (["sent", "failed"], "partial"),
        (["failed", "failed"], "failed"),
    ],
)
def test_overall_status(statuses: list[str], overall: str) -> None:
    assert overall_status(statuses) == overall
