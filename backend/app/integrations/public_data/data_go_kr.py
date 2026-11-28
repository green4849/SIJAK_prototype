"""공공데이터포털 전국마을회관및경로당표준데이터 연동.

원본: https://www.data.go.kr/data/15114136/standard.do
마을회관은 복지시설 화면의 경로당과 다르므로 제외한다.
"""

import asyncio
import hashlib
import json
import re
import time
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlencode
from urllib.request import Request, urlopen

from app.integrations.public_data.base import FacilityRecord, PublicDataKeyMissing

API_URL = "https://api.data.go.kr/openapi/tn_pubr_public_vill_hall_sen_cent_api"
PAGE_SIZE = 1000
MAX_PAGES = 1000
RETRYABLE_HTTP_CODES = {429, 500, 502, 503, 504}
REGION_PREFIXES = {
    "서울특별시": "11",
    "부산광역시": "26",
    "대구광역시": "27",
    "인천광역시": "28",
    "광주광역시": "29",
    "대전광역시": "30",
    "울산광역시": "31",
    "세종특별자치시": "36",
    "경기도": "41",
    "충청북도": "43",
    "충청남도": "44",
    "전라남도": "46",
    "경상북도": "47",
    "경상남도": "48",
    "제주특별자치도": "50",
    "제주도": "50",
    "강원특별자치도": "51",
    "강원도": "51",
    "전북특별자치도": "52",
    "전라북도": "52",
}


def _record(row: dict[str, object]) -> FacilityRecord | None:
    if str(row.get("flctTyp") or "").strip() != "경로당":
        return None
    status = str(row.get("busiCodNm") or "").strip()
    if status and status != "영업":
        return None
    name = str(row.get("flctNm") or "").strip()
    address = str(row.get("lctnRoadNmAddr") or row.get("lctnLotnoAddr") or "").strip()
    if not name or not address or len(name) > 100 or len(address) > 200:
        return None
    region = next(
        (code for prefix, code in REGION_PREFIXES.items() if address.startswith(prefix)), None
    )
    if region is None:
        return None
    try:
        lat = float(str(row.get("lat") or ""))
        lng = float(str(row.get("lot") or ""))
    except ValueError:
        return None
    if not (33 <= lat <= 39 and 124 <= lng <= 132):
        return None
    # 원본에는 시설 ID가 없다. 관리기관 코드·시설명·주소로 재수집에 안정적인 ID를 만든다.
    identity = "|".join((str(row.get("insttCode") or ""), name, address))
    source_id = hashlib.sha256(identity.encode()).hexdigest()
    phone = re.sub(r"\D", "", str(row.get("telno") or ""))[:20]
    return FacilityRecord(source_id, name, "kyungrodang", address, phone, region, lat, lng)


class DataGoKrWelfareSource:
    def __init__(self, api_key: str | None) -> None:
        if not api_key:
            raise PublicDataKeyMissing(
                "PUBLIC_DATA_API_KEY 가 없어요. 공공데이터포털에서 활용 신청 후 "
                "발급받은 키를 환경 변수로 넣어 주세요."
            )
        self._api_key = unquote(api_key)
        self._records: list[FacilityRecord] | None = None

    def _fetch_page(self, page: int) -> tuple[list[dict[str, object]], int]:
        params = urlencode(
            {"serviceKey": self._api_key, "pageNo": page, "numOfRows": PAGE_SIZE, "type": "json"}
        )
        for attempt in range(3):
            try:
                with urlopen(Request(f"{API_URL}?{params}"), timeout=30) as response:
                    payload = json.load(response)
                break
            except HTTPError as exc:
                if exc.code not in RETRYABLE_HTTP_CODES or attempt == 2:
                    raise RuntimeError(
                        f"공공데이터포털 {page}쪽 HTTP {exc.code} 오류"
                    ) from None
            except (URLError, TimeoutError, ConnectionError) as exc:
                if attempt == 2:
                    raise RuntimeError(
                        f"공공데이터포털 {page}쪽 요청에 실패했어요: {type(exc).__name__}"
                    ) from None
            except ValueError:
                raise RuntimeError(f"공공데이터포털 {page}쪽 JSON 응답이 아니에요") from None
            time.sleep(0.5 * 2**attempt)
        if not isinstance(payload, dict):
            raise RuntimeError(f"공공데이터포털 {page}쪽 응답 형식이 달라졌어요")
        header = payload.get("header", {})
        if not isinstance(header, dict):
            raise RuntimeError(f"공공데이터포털 {page}쪽 응답 형식이 달라졌어요")
        if header.get("resultCode") != "00":
            raise RuntimeError(f"공공데이터포털 {page}쪽 오류 코드: {header.get('resultCode')}")
        body = payload.get("body", {})
        if not isinstance(body, dict):
            raise RuntimeError(f"공공데이터포털 {page}쪽 응답 형식이 달라졌어요")
        items = body.get("items") or {}
        if not isinstance(items, dict):
            raise RuntimeError(f"공공데이터포털 {page}쪽 시설 목록 형식이 달라졌어요")
        rows = items.get("item", [])
        if isinstance(rows, dict):
            rows = [rows]
        if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
            raise RuntimeError(f"공공데이터포털 {page}쪽 시설 목록 형식이 달라졌어요")
        try:
            total = int(body.get("totalCount", 0))
        except (TypeError, ValueError):
            raise RuntimeError(f"공공데이터포털 {page}쪽 전체 건수가 잘못됐어요") from None
        if total <= 0 or len(rows) > PAGE_SIZE:
            raise RuntimeError(f"공공데이터포털 {page}쪽 건수가 비정상이에요")
        return rows, total

    def _fetch_all(self) -> list[FacilityRecord]:
        page = 1
        seen = 0
        expected_total: int | None = None
        records: dict[str, FacilityRecord] = {}
        while True:
            if page > MAX_PAGES:
                raise RuntimeError("공공데이터포털 쪽수가 한도를 넘었어요")
            rows, total = self._fetch_page(page)
            if expected_total is None:
                expected_total = total
            elif total != expected_total:
                raise RuntimeError("공공데이터포털 전체 건수가 수집 중 바뀌었어요")
            if not rows:
                if seen < total:
                    raise RuntimeError(f"공공데이터포털 {page}쪽이 비어 있어 수집을 중단했어요")
                break
            seen += len(rows)
            for row in rows:
                parsed = _record(row)
                if parsed is not None:
                    records[parsed.source_id] = parsed
            if seen >= total:
                break
            page += 1
        print(f"공공데이터포털: 원본 {seen}행 중 유효한 경로당 {len(records)}곳")
        return list(records.values())

    async def fetch_facilities(self, region_code: str) -> list[FacilityRecord]:
        if self._records is None:
            self._records = await asyncio.to_thread(self._fetch_all)
        return [record for record in self._records if record.region_code == region_code]
