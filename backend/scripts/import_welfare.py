"""공공데이터포털 '노인복지시설' 가져오기 (C7) — 인증키가 있어야만 돈다.

    cd backend && PUBLIC_DATA_API_KEY=... uv run python -m scripts.import_welfare 41 11

인자는 시·도 코드(users.region_code 와 같은 2자리). 키는 환경 변수(.env)로만 넣는다.
키가 없으면 아무 데도 연결하지 않고 끝난다. 같은 시설은 다시 가져오면 덮어 쓴다.
"""

import asyncio
import sys

from app.core.database import SessionLocal
from app.domains.auth.constants import REGIONS
from app.domains.welfare.repository import WelfareRepository
from app.domains.welfare.service import WelfareService
from app.integrations.public_data import get_welfare_source
from app.integrations.public_data.base import PublicDataKeyMissing


async def run(region_codes: list[str]) -> int:
    try:
        source = get_welfare_source()
    except PublicDataKeyMissing as e:
        print(e, file=sys.stderr)
        return 2
    async with SessionLocal() as s:
        service = WelfareService(WelfareRepository(s))
        for code in region_codes:
            records = await source.fetch_facilities(code)
            added, updated = await service.upsert_public(records)
            print(f"{REGIONS[code]}: 새로 {added}곳, 고침 {updated}곳")
    return 0


def main() -> int:
    codes = sys.argv[1:]
    if not codes or any(c not in REGIONS for c in codes):
        print("사용법: python -m scripts.import_welfare <시·도 코드…> (예: 41)", file=sys.stderr)
        return 2
    return asyncio.run(run(codes))


if __name__ == "__main__":
    sys.exit(main())
