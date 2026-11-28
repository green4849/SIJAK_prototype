"""운영용 경로당 가져오기의 트랜잭션·재실행 검증."""

import os
from dataclasses import replace

import pytest
from sqlalchemy import select
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.domains.welfare.models import WelfareCenter
from app.integrations.public_data.base import FacilityRecord
from scripts.import_welfare import upsert_records


def _facility(source_id: str, name: str) -> FacilityRecord:
    return FacilityRecord(
        source_id=source_id,
        name=name,
        kind="kyungrodang",
        address="경기도 오산시 시험로 1",
        phone="0311234567",
        region_code="41",
        lat=37.19,
        lng=127.05,
    )


async def test_bulk_import_can_be_rerun(
    db_sessionmaker: async_sessionmaker[AsyncSession],
) -> None:
    url = os.environ["TEST_DATABASE_URL"]
    first = await upsert_records(url, [_facility("source-1", "첫 경로당")])
    assert (first.processed, first.added, first.database_total) == (1, 1, 1)
    async with db_sessionmaker() as session:
        original = (await session.scalars(select(WelfareCenter))).one()
        original_id = original.id
    second = await upsert_records(url, [_facility("source-1", "이름 변경")])
    assert (second.processed, second.added, second.updated, second.database_total) == (1, 0, 1, 1)
    async with db_sessionmaker() as session:
        updated = (await session.scalars(select(WelfareCenter))).one()
        assert updated.id == original_id
        assert updated.name == "이름 변경"


async def test_bulk_import_failure_rolls_back_every_batch(
    db_sessionmaker: async_sessionmaker[AsyncSession],
) -> None:
    url = os.environ["TEST_DATABASE_URL"]
    valid = _facility("source-1", "정상 경로당")
    invalid = replace(_facility("source-2", "정상 경로당"), name="가" * 101)
    with pytest.raises(DBAPIError):
        await upsert_records(url, [valid, invalid])
    async with db_sessionmaker() as session:
        assert (await session.scalars(select(WelfareCenter))).all() == []
