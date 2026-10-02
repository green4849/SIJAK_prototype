#!/bin/sh
# 컨테이너 시작: (1) DB 마이그레이션 자동 적용 → (2) API 서버
# 운영 설정이 안전하지 않으면 (1)에서 설정 검사(B1)로 바로 멈춘다.
set -e

if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  echo "[entrypoint] alembic upgrade head"
  alembic upgrade head
fi

# 앞단 프록시(Caddy)가 넘겨 준 실제 사용자 IP를 믿는다 — 요청 횟수 제한(B2)이 IP를 보므로.
# api 포트는 외부에 열지 않고 같은 네트워크의 프록시만 접근한다 (docker-compose.prod.yml).
exec uvicorn app.main:app \
  --host 0.0.0.0 --port 8000 \
  --proxy-headers --forwarded-allow-ips="${FORWARDED_ALLOW_IPS:-*}" \
  --workers "${WEB_CONCURRENCY:-1}"
