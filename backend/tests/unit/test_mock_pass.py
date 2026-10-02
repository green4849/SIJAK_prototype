from datetime import date

import pytest

from app.integrations.identity.base import IdentityRequest, IdentityVerificationFailed
from app.integrations.identity.mock_pass import MAX_ATTEMPTS, MockPassProvider

REQ = IdentityRequest(name="김영희", birth_date=date(1955, 3, 1), phone="01012345678", gender="F")


async def test_same_person_gets_same_ci() -> None:
    p = MockPassProvider()
    s1 = await p.start(REQ)
    s2 = await p.start(REQ)
    a = await p.verify(s1.session_id, s1.dev_code or "")
    b = await p.verify(s2.session_id, s2.dev_code or "")
    assert a.ci == b.ci and len(a.ci) == 88


async def test_wrong_code_then_lockout() -> None:
    p = MockPassProvider()
    s = await p.start(REQ)
    for _ in range(MAX_ATTEMPTS - 1):
        with pytest.raises(IdentityVerificationFailed):
            await p.verify(s.session_id, "000000" if s.dev_code != "000000" else "111111")
    with pytest.raises(IdentityVerificationFailed):
        await p.verify(s.session_id, "999999" if s.dev_code != "999999" else "888888")
    # 잠긴 뒤에는 올바른 코드도 실패
    with pytest.raises(IdentityVerificationFailed):
        await p.verify(s.session_id, s.dev_code or "")


async def test_session_is_single_use() -> None:
    p = MockPassProvider()
    s = await p.start(REQ)
    await p.verify(s.session_id, s.dev_code or "")
    with pytest.raises(IdentityVerificationFailed):
        await p.verify(s.session_id, s.dev_code or "")
