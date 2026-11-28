"""운영자 역할 지정은 카카오 회원을 정확한 식별자로 찾아야 한다."""

import asyncio
import sys
import uuid
from types import SimpleNamespace

from scripts import set_role


class _Session:
    def __init__(self, user) -> None:
        self.user = user
        self.query = None
        self.committed = False

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        return False

    async def scalar(self, query):
        self.query = query
        return self.user

    async def commit(self):
        self.committed = True


def test_assign_operator_by_user_id(monkeypatch) -> None:
    user_id = uuid.uuid4()
    user = SimpleNamespace(id=user_id, name="회원", status="active", role="member")
    session = _Session(user)
    monkeypatch.setattr(set_role, "SessionLocal", lambda: session)

    assert asyncio.run(set_role.set_role(str(user_id), "operator", by="user-id")) == 0
    assert session.query.compile().params == {"id_1": user_id}
    assert user.role == "operator"
    assert session.committed


def test_assign_operator_by_kakao_id(monkeypatch) -> None:
    user = SimpleNamespace(id=uuid.uuid4(), name="회원", status="active", role="member")
    session = _Session(user)
    monkeypatch.setattr(set_role, "SessionLocal", lambda: session)

    assert asyncio.run(set_role.set_role("123456789", "operator", by="kakao-id")) == 0
    assert session.query.compile().params == {"kakao_id_1": "123456789"}
    assert session.committed


def test_reject_invalid_or_inactive_member(monkeypatch) -> None:
    user = SimpleNamespace(id=uuid.uuid4(), name="회원", status="deleted", role="member")
    session = _Session(user)
    monkeypatch.setattr(set_role, "SessionLocal", lambda: session)

    assert asyncio.run(set_role.set_role("not-a-uuid", "operator", by="user-id")) == 2
    assert session.query is None
    assert asyncio.run(set_role.set_role("123456789", "operator", by="kakao-id")) == 1
    assert not session.committed


def test_cli_accepts_kakao_user_id(monkeypatch) -> None:
    user_id = str(uuid.uuid4())
    calls = []

    async def fake_set_role(identifier, role, *, by):
        calls.append((identifier, role, by))
        return 0

    monkeypatch.setattr(set_role, "set_role", fake_set_role)
    monkeypatch.setattr(sys, "argv", ["set_role", "--user-id", user_id, "operator"])

    assert set_role.main() == 0
    assert calls == [(user_id, "operator", "user-id")]
