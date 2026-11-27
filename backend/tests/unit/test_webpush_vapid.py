"""C4 VapidPushSender — 실제 암호화·VAPID 서명까지 하고, 푸시 서비스 응답만 가짜로"""

import base64

import pytest
import requests
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

from app.integrations.webpush.base import PushTarget
from app.integrations.webpush.vapid import VapidPushSender
from scripts.vapid_keys import generate


def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _browser_target() -> PushTarget:
    """브라우저가 만드는 것과 같은 구독 키 (P-256 공개 키 + 16바이트 auth)"""
    key = ec.generate_private_key(ec.SECP256R1())
    p256dh = key.public_key().public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
    return PushTarget("https://fcm.googleapis.com/fcm/send/abc", _b64(p256dh), _b64(b"0" * 16))


class _Resp:
    def __init__(self, status: int) -> None:
        self.status_code = status
        self.text = ""
        self.reason = ""
        self.headers: dict[str, str] = {}


@pytest.fixture
def sender() -> VapidPushSender:
    _, private = generate()
    return VapidPushSender(private, "mailto:ops@example.com")


async def test_sends_encrypted_with_vapid(
    sender: VapidPushSender, monkeypatch: pytest.MonkeyPatch
) -> None:
    calls: list[dict] = []

    def fake_post(url: str, **kw: object) -> _Resp:
        calls.append({"url": url, **kw})
        return _Resp(201)

    monkeypatch.setattr(requests, "post", fake_post)
    r = await sender.send(_browser_target(), '{"title":"안녕"}', ttl=60, urgency="high")
    assert r.ok and not r.gone
    [c] = calls
    headers = c["headers"]
    assert c["url"] == "https://fcm.googleapis.com/fcm/send/abc"
    assert headers["ttl"] == "60" and headers["Urgency"] == "high"
    assert headers["content-encoding"] == "aes128gcm"
    assert headers["Authorization"].startswith("vapid t=")
    assert "안녕".encode() not in c["data"]  # 내용은 암호화되어 나간다


@pytest.mark.parametrize(("status", "gone"), [(410, True), (404, True), (500, False), (429, False)])
async def test_error_status(
    sender: VapidPushSender, monkeypatch: pytest.MonkeyPatch, status: int, gone: bool
) -> None:
    monkeypatch.setattr(requests, "post", lambda url, **kw: _Resp(status))
    r = await sender.send(_browser_target(), "{}", ttl=60, urgency="normal")
    assert not r.ok and r.gone is gone and str(status) in (r.error or "")


async def test_network_error_is_a_result(
    sender: VapidPushSender, monkeypatch: pytest.MonkeyPatch
) -> None:
    def boom(url: str, **kw: object) -> _Resp:
        raise requests.ConnectionError("down")

    monkeypatch.setattr(requests, "post", boom)
    r = await sender.send(_browser_target(), "{}", ttl=60, urgency="normal")
    assert not r.ok and not r.gone and r.error == "ConnectionError"
