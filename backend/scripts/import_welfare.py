"""공공데이터 경로당 일회성 가져오기.

    python -m scripts.import_welfare --all --dry-run
    python -m scripts.import_welfare --all
    python -m scripts.import_welfare --status

DATABASE_URL·PUBLIC_DATA_API_KEY만 사용한다. 운영 API의 로그인·암호화 키는 필요 없다.
원본을 모두 받은 뒤 한 트랜잭션에서 반영하므로 중간 실패 시 DB는 바뀌지 않는다.
"""

import argparse
import asyncio
import sys
import uuid
from collections import Counter
from dataclasses import dataclass

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import MetaData, Table, func, or_, select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import NoSuchTableError
from sqlalchemy.ext.asyncio import AsyncConnection, create_async_engine

from app.core.config import to_asyncpg_url
from app.domains.auth.constants import REGIONS
from app.integrations.public_data.base import FacilityRecord, PublicDataKeyMissing
from app.integrations.public_data.data_go_kr import DataGoKrWelfareSource

IMPORT_LOCK = 608020261127
BATCH_SIZE = 500
MIN_NATIONAL_RECORDS = 30_000
UPDATE_COLUMNS = ("name", "kind", "address", "phone", "region_code", "lat", "lng", "open_hours")
# 현재 표준데이터에는 세종 자료가 없다. 나머지 지역 중 하나라도 비면 전체 반영을 중단한다.
EXPECTED_SOURCE_REGIONS = set(REGIONS) - {"36"}


class ImportSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        hide_input_in_errors=True,
    )

    database_url: str | None = None
    public_data_api_key: str | None = None


@dataclass(frozen=True)
class ImportResult:
    processed: int
    added: int
    updated: int
    database_total: int


def validate_records(records: list[FacilityRecord], codes: list[str], national: bool) -> None:
    if not records:
        raise ValueError("가져올 경로당이 0곳이라 DB를 바꾸지 않았어요")
    if national:
        if len(records) < MIN_NATIONAL_RECORDS:
            raise ValueError(
                f"전국 경로당이 {len(records)}곳뿐이라 DB를 바꾸지 않았어요 "
                f"(최소 {MIN_NATIONAL_RECORDS}곳)"
            )
        missing = EXPECTED_SOURCE_REGIONS - {r.region_code for r in records}
        if missing:
            raise ValueError(f"시·도 {', '.join(sorted(missing))} 자료가 없어 DB를 바꾸지 않았어요")
    else:
        empty = set(codes) - {r.region_code for r in records}
        if empty:
            raise ValueError(f"시·도 {', '.join(sorted(empty))} 자료가 없어 DB를 바꾸지 않았어요")


def _print_region_counts(records: list[FacilityRecord], codes: list[str]) -> None:
    counts = Counter(record.region_code for record in records)
    for code in codes:
        print(f"{REGIONS[code]}: {counts[code]}곳")


async def _center_table(connection: AsyncConnection) -> Table:
    try:
        return await connection.run_sync(
            lambda sync_connection: Table(
                "welfare_centers", MetaData(), autoload_with=sync_connection
            )
        )
    except NoSuchTableError:
        raise RuntimeError(
            "welfare_centers 테이블이 없어요. 먼저 DB 마이그레이션을 적용하세요"
        ) from None


async def _public_count(connection: AsyncConnection, table: Table) -> int:
    value = await connection.scalar(
        select(func.count()).select_from(table).where(table.c.source == "public_data")
    )
    return int(value or 0)


async def upsert_records(database_url: str, records: list[FacilityRecord]) -> ImportResult:
    engine = create_async_engine(to_asyncpg_url(database_url), pool_pre_ping=True)
    try:
        async with engine.begin() as connection:
            locked = await connection.scalar(
                text("SELECT pg_try_advisory_xact_lock(:lock_id)"), {"lock_id": IMPORT_LOCK}
            )
            if not locked:
                raise RuntimeError("경로당 가져오기가 이미 실행 중이에요")
            table = await _center_table(connection)
            before = await _public_count(connection, table)
            for start in range(0, len(records), BATCH_SIZE):
                values = [
                    {
                        "id": uuid.uuid4(),
                        "source": "public_data",
                        "source_id": r.source_id,
                        "name": r.name,
                        "kind": r.kind,
                        "address": r.address,
                        "phone": r.phone,
                        "region_code": r.region_code,
                        "lat": r.lat,
                        "lng": r.lng,
                        "open_hours": r.open_hours,
                    }
                    for r in records[start : start + BATCH_SIZE]
                ]
                statement = insert(table).values(values)
                changes = {column: getattr(statement.excluded, column) for column in UPDATE_COLUMNS}
                changes["updated_at"] = func.now()
                changed = or_(
                    *(
                        getattr(table.c, column).is_distinct_from(
                            getattr(statement.excluded, column)
                        )
                        for column in UPDATE_COLUMNS
                    )
                )
                await connection.execute(
                    statement.on_conflict_do_update(
                        index_elements=[table.c.source, table.c.source_id],
                        set_=changes,
                        where=changed,
                    )
                )
            after = await _public_count(connection, table)
            added = after - before
            return ImportResult(len(records), added, len(records) - added, after)
    finally:
        await engine.dispose()


async def database_status(database_url: str) -> None:
    engine = create_async_engine(to_asyncpg_url(database_url), pool_pre_ping=True)
    try:
        async with engine.connect() as connection:
            table = await _center_table(connection)
            counts = dict(
                (
                    await connection.execute(
                        select(table.c.region_code, func.count())
                        .where(table.c.source == "public_data")
                        .group_by(table.c.region_code)
                    )
                ).all()
            )
            print(f"DB 공공데이터 시설: {sum(counts.values())}곳")
            for code in REGIONS:
                print(f"{REGIONS[code]}: {counts.get(code, 0)}곳")
    finally:
        await engine.dispose()


async def run(codes: list[str], *, national: bool, dry_run: bool) -> int:
    settings = ImportSettings()
    try:
        source = DataGoKrWelfareSource(settings.public_data_api_key)
    except PublicDataKeyMissing as exc:
        print(exc, file=sys.stderr)
        return 2
    records = [r for code in codes for r in await source.fetch_facilities(code)]
    validate_records(records, codes, national)
    _print_region_counts(records, codes)
    if dry_run:
        print(f"미리보기 완료: {len(records)}곳, DB 변경 없음")
        return 0
    if not settings.database_url:
        print("DATABASE_URL이 필요해요", file=sys.stderr)
        return 2
    result = await upsert_records(settings.database_url, records)
    print(
        f"적재 완료: 처리 {result.processed}곳, 새로 {result.added}곳, "
        f"기존 {result.updated}곳, DB 공공데이터 총 {result.database_total}곳"
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="공공데이터 경로당을 로컬 또는 운영 DB에 적재")
    parser.add_argument("region_codes", nargs="*", metavar="시도코드")
    parser.add_argument("--all", action="store_true", help="전국 17개 시·도 (원본은 세종 0곳)")
    parser.add_argument("--dry-run", action="store_true", help="API 검증과 건수 출력만")
    parser.add_argument("--status", action="store_true", help="DB에 적재된 지역별 건수 조회")
    args = parser.parse_args()
    if args.status:
        if args.all or args.region_codes or args.dry_run:
            parser.error("--status는 다른 인자와 함께 쓸 수 없어요")
        database_url = ImportSettings().database_url
        if not database_url:
            parser.error("DATABASE_URL이 필요해요")
        asyncio.run(database_status(database_url))
        return 0
    if args.all == bool(args.region_codes):
        parser.error("--all 또는 시·도 코드 중 하나를 지정하세요")
    codes = list(REGIONS) if args.all else list(dict.fromkeys(args.region_codes))
    if any(code not in REGIONS for code in codes):
        parser.error("알 수 없는 시·도 코드가 있어요")
    try:
        return asyncio.run(run(codes, national=args.all, dry_run=args.dry_run))
    except (RuntimeError, ValueError) as exc:
        print(f"가져오기 실패: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
