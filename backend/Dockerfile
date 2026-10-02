# 백엔드 운영 이미지 (B10) — uv 로 잠금 파일 그대로 설치, 실행은 root 아닌 사용자
#   docker build -t sijak-api backend
FROM python:3.11-slim AS build
COPY --from=ghcr.io/astral-sh/uv:0.8.17 /uv /usr/local/bin/uv
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never
# 의존성 먼저 (코드만 바뀌면 이 층은 캐시)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./
COPY scripts ./scripts
COPY docker-entrypoint.sh ./
RUN uv sync --frozen --no-dev

FROM python:3.11-slim
RUN useradd --system --uid 10001 --home /app app \
    && mkdir -p /data/media && chown app /data/media
WORKDIR /app
COPY --from=build --chown=app /app /app
ENV PATH=/app/.venv/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    ENV=prod \
    MEDIA_DIR=/data/media
USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health', timeout=4)"
ENTRYPOINT ["/app/docker-entrypoint.sh"]
