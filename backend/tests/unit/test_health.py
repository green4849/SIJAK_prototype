from httpx import ASGITransport, AsyncClient

from app.main import app


async def test_health() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


async def test_domain_error_is_mapped_to_json() -> None:
    from app.core.errors import NotFoundError

    @app.get("/_raise_not_found")
    async def _raise() -> None:
        raise NotFoundError("없음")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/_raise_not_found")
    assert res.status_code == 404
    assert res.json() == {"error": {"code": "not_found", "message": "없음"}}


async def test_library_validation_message_is_not_shown_to_users() -> None:
    """pydantic의 영어 문구('Field required')는 화면에 내보내지 않는다 — 우리가 쓴 한국어 문구만"""
    from pydantic import BaseModel

    class _Body(BaseModel):
        name: str

    @app.post("/_validate")
    async def _validate(body: _Body) -> None:
        return None

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post("/_validate", json={})
    assert res.status_code == 422
    assert res.json()["error"]["message"] == "입력한 내용을 다시 확인해 주세요."
