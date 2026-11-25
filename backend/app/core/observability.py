"""요청 본문·예외 문구·로컬 변수를 수집하지 않는 오류 기록."""

import logging
import re
import uuid
from time import monotonic

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.config import get_settings

log = logging.getLogger("uvicorn.error")


def safe_event(event: dict, hint: dict) -> dict:
    hint.pop("attachments", None)
    # 기본 수집기의 새 필드도 유출되지 않게 허용한 필드로 새 이벤트를 만든다.
    result = {
        k: event[k]
        for k in ("event_id", "timestamp", "platform", "level", "release", "environment")
        if k in event
    }
    values = []
    for exception in event.get("exception", {}).get("values", []):
        frames = [
            {k: f[k] for k in ("module", "function", "lineno", "in_app") if k in f}
            for f in exception.get("stacktrace", {}).get("frames", [])
        ]
        kind = exception.get("type", "Error")
        values.append(
            {
                "type": kind if re.fullmatch(r"[A-Za-z_][A-Za-z_0-9.]*", kind) else "Error",
                "value": "[redacted]",
                "stacktrace": {"frames": frames},
            }
        )
    result["exception"] = {"values": values}
    return result


def init_observability() -> None:
    settings = get_settings()
    if settings.sentry_dsn:
        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment=settings.env,
            release=settings.release,
            default_integrations=False,
            data_collection={
                "user_info": False,
                "cookies": {"mode": "off"},
                "http_headers": {"request": {"mode": "off"}},
                "http_bodies": [],
                "url_query_params": {"mode": "off"},
                "stack_frame_variables": False,
                "frame_context_lines": 0,
                "database_query_data": False,
                "queues": False,
                "graphql": {"document": False, "variables": False},
                "gen_ai": {"inputs": False, "outputs": False},
                "mcp": {"inputs": False, "outputs": False},
            },
            max_request_body_size="never",
            traces_sample_rate=0,
            before_send=safe_event,
        )


def report_exception(exc: Exception, operation: str) -> str:
    reference = uuid.uuid4().hex
    # 예외 str에는 DB 바인딩 값·외부 연결 문자열이 들어갈 수 있다.
    if get_settings().sentry_dsn:
        reference = sentry_sdk.capture_exception(exc) or reference
    log.error(
        "operation=%s reference=%s exception_type=%s", operation, reference, type(exc).__name__
    )
    return reference


def register_observability(app: FastAPI) -> None:
    init_observability()

    @app.middleware("http")
    async def record_request(request: Request, call_next):
        started = monotonic()
        try:
            response = await call_next(request)
        except Exception as exc:
            reference = report_exception(exc, "http")
            response = JSONResponse(
                status_code=500,
                content={
                    "error": {
                        "code": "internal_error",
                        "message": "잠시 문제가 생겼어요. 다시 시도해 주세요.",
                        "reference": reference,
                    }
                },
            )
        route = request.scope.get("route")
        # 실제 URL과 쿼리 문자열 대신 등록된 경로 템플릿만 기록한다.
        log.info(
            "method=%s route=%s status=%d duration_ms=%.0f",
            request.method,
            getattr(route, "path", "unmatched"),
            response.status_code,
            (monotonic() - started) * 1000,
        )
        return response
