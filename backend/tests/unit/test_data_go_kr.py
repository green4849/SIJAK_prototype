"""전국마을회관및경로당표준데이터의 실제 JSON 필드 변환."""

import io
import json
from urllib.error import HTTPError

import pytest

from app.integrations.public_data import data_go_kr
from app.integrations.public_data.data_go_kr import DataGoKrWelfareSource, _record
from scripts.import_welfare import validate_records


def _row(**overrides: object) -> dict[str, object]:
    row: dict[str, object] = {
        "flctNm": "신평리경로당",
        "flctTyp": "경로당",
        "lctnRoadNmAddr": "제주특별자치도 서귀포시 대정읍 중산간서로 2610",
        "lat": "33.26530291",
        "lot": "126.2591082",
        "busiCodNm": "영업",
        "telno": "064-792-0222",
        "insttCode": "6520000",
    }
    row.update(overrides)
    return row


def test_parse_actual_api_fields() -> None:
    result = _record(_row())
    assert result is not None
    assert result.name == "신평리경로당"
    assert result.kind == "kyungrodang"
    assert result.region_code == "50"
    assert result.phone == "0647920222"
    assert result.lat == 33.26530291
    assert len(result.source_id) == 64
    assert _record(_row(telno="010-1111-2222")) == result.__class__(
        **{**result.__dict__, "phone": "01011112222"}
    )


def test_exclude_village_halls_closed_and_unmapped_rows() -> None:
    assert _record(_row(flctTyp="마을회관")) is None
    assert _record(_row(busiCodNm="폐업")) is None
    assert _record(_row(lat="")) is None
    assert _record(_row(lctnRoadNmAddr="주소 미상")) is None


async def test_fetch_once_and_split_by_region() -> None:
    source = DataGoKrWelfareSource("test-key")
    calls: list[int] = []

    def fake_page(page: int) -> tuple[list[dict[str, object]], int]:
        calls.append(page)
        if page == 1:
            return [_row(), _row(flctNm="서울경로당", lctnRoadNmAddr="서울특별시 종로구 1")], 3
        return [_row(flctNm="마을회관", flctTyp="마을회관")], 3

    source._fetch_page = fake_page  # type: ignore[method-assign]
    assert len(await source.fetch_facilities("50")) == 1
    assert len(await source.fetch_facilities("11")) == 1
    assert calls == [1, 2]


def test_transient_http_error_retries_without_exposing_key(monkeypatch: pytest.MonkeyPatch) -> None:
    source = DataGoKrWelfareSource("secret-key")
    calls = 0

    def fake_urlopen(_request: object, *, timeout: int) -> io.BytesIO:
        nonlocal calls
        calls += 1
        if calls == 1:
            raise HTTPError("https://example.test/?serviceKey=secret-key", 503, "busy", None, None)
        payload = {
            "header": {"resultCode": "00"},
            "body": {"items": {"item": [_row()]}, "totalCount": 1},
        }
        return io.BytesIO(json.dumps(payload).encode())

    monkeypatch.setattr(data_go_kr, "urlopen", fake_urlopen)
    monkeypatch.setattr(data_go_kr.time, "sleep", lambda _: None)
    rows, total = source._fetch_page(1)
    assert (len(rows), total, calls) == (1, 1, 2)

    def forbidden_urlopen(_request: object, *, timeout: int) -> io.BytesIO:
        raise HTTPError("https://example.test/?serviceKey=secret-key", 403, "denied", None, None)

    monkeypatch.setattr(data_go_kr, "urlopen", forbidden_urlopen)
    with pytest.raises(RuntimeError, match="HTTP 403") as error:
        source._fetch_page(1)
    assert "secret-key" not in str(error.value)


def test_import_rejects_empty_or_short_snapshot() -> None:
    record = _record(_row())
    assert record is not None
    validate_records([record], ["50"], national=False)
    with pytest.raises(ValueError, match="0곳"):
        validate_records([], ["36"], national=False)
    with pytest.raises(ValueError, match="최소"):
        validate_records([record], ["50"], national=True)
