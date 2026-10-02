"""도메인 예외와 HTTP 매핑.

service 계층은 HTTP를 모른다. 아래 예외만 던지고,
HTTP 상태코드 변환은 여기 등록된 핸들러가 한 곳에서 담당한다.
"""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class DomainError(Exception):
    status_code: int = 400
    code: str = "domain_error"
    headers: dict[str, str] | None = None

    def __init__(self, message: str = "", *, code: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        if code:
            self.code = code


class NotFoundError(DomainError):
    status_code = 404
    code = "not_found"


class ConflictError(DomainError):
    status_code = 409
    code = "conflict"


class UnauthorizedError(DomainError):
    status_code = 401
    code = "unauthorized"


class ForbiddenError(DomainError):
    status_code = 403
    code = "forbidden"


class ExternalServiceError(DomainError):
    """LLM·STT·PASS·공공데이터 등 외부 연동 실패."""

    status_code = 502
    code = "external_service_error"


def _error_body(code: str, message: str, **extra: object) -> dict:
    return {"error": {"code": code, "message": message, **extra}}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def _handle_domain_error(_: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body(exc.code, exc.message),
            headers=exc.headers,  # 예: 429의 Retry-After
        )

    @app.exception_handler(RequestValidationError)
    async def _handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        # 프론트가 같은 형식({error:{code,message}})으로 받도록 통일.
        # 첫 번째 오류 메시지를 사용자용 문구로, 전체는 fields로 전달.
        errors = exc.errors()
        first = errors[0] if errors else {}
        msg = str(first.get("msg", "입력값을 다시 확인해 주세요."))
        msg = msg.removeprefix("Value error, ")
        fields = [".".join(str(p) for p in e.get("loc", ())[1:]) for e in errors]
        return JSONResponse(
            status_code=422,
            content=_error_body("validation_error", msg, fields=fields),
        )
