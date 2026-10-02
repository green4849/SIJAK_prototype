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
