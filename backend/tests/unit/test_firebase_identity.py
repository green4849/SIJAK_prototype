"""Firebase 전화 인증 provider — ID 토큰 검증 규칙과 번호 묶기"""

from datetime import date

import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from app.integrations.identity.base import IdentityRequest, IdentityVerificationFailed
from app.integrations.identity.firebase import FirebasePhoneProvider, to_e164_kr
from tests.firebase_fake import PROJECT, FakeFirebase

REQ = IdentityRequest(name="김영희", birth_date=date(1955, 3, 1), phone="01012345678", gender="F")


@pytest.fixture
def fb() -> FakeFirebase:
    return FakeFirebase()


@pytest.fixture
def provider(fb: FakeFirebase) -> FirebasePhoneProvider:
    return FirebasePhoneProvider(PROJECT, fetch_certs=fb.certs)


def test_e164() -> None:
    assert to_e164_kr("01012345678") == "+821012345678"
    assert to_e164_kr("0101234567") == "+82101234567"


async def test_start_returns_number_to_text(provider: FirebasePhoneProvider) -> None:
    s = await provider.start(REQ)
    assert s.client_sms_to == "+821012345678" and s.dev_code is None


async def test_valid_token(provider: FirebasePhoneProvider, fb: FakeFirebase) -> None:
    s = await provider.start(REQ)
    ident = await provider.verify(s.session_id, fb.token())
    assert ident.phone_verified is True and ident.phone == "01012345678"
    assert ident.name == "김영희" and len(ident.ci) == 88
    # 같은 uid 면 같은 CI
    s2 = await provider.start(REQ)
    assert (await provider.verify(s2.session_id, fb.token())).ci == ident.ci
    # 세션은 한 번만
    with pytest.raises(IdentityVerificationFailed):
        await provider.verify(s.session_id, fb.token())


@pytest.mark.parametrize(
    "kwargs",
    [
        {"phone": "+821099999999"},  # 다른 번호로 받은 토큰
        {"project": "other-project"},  # 다른 프로젝트
        {"kid": "unknown"},  # 모르는 키
        {"exp_in": -120},  # 만료
        {"auth_age": 3600},  # 문자 확인한 지 오래됨
    ],
)
async def test_rejected_tokens(
    provider: FirebasePhoneProvider, fb: FakeFirebase, kwargs: dict
) -> None:
    s = await provider.start(REQ)
    with pytest.raises(IdentityVerificationFailed):
        await provider.verify(s.session_id, fb.token(**kwargs))


async def test_forged_signature(provider: FirebasePhoneProvider, fb: FakeFirebase) -> None:
    other = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    s = await provider.start(REQ)
    with pytest.raises(IdentityVerificationFailed):
        await provider.verify(s.session_id, fb.token(key=other))
    with pytest.raises(IdentityVerificationFailed):
        await provider.verify(s.session_id, "not-a-jwt")


async def test_cert_fetch_failure_message(fb: FakeFirebase) -> None:
    async def down() -> dict[str, str]:
        raise OSError("network")

    p = FirebasePhoneProvider(PROJECT, fetch_certs=down)
    s = await p.start(REQ)
    with pytest.raises(IdentityVerificationFailed, match="연결하지 못했어요"):
        await p.verify(s.session_id, fb.token())


def test_project_required() -> None:
    with pytest.raises(ValueError):
        FirebasePhoneProvider("")
