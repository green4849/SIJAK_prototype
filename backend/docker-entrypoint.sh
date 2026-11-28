#!/bin/sh
# 컨테이너 시작: (1) DB 마이그레이션 자동 적용 → (2) API 서버
# 운영 설정이 안전하지 않으면 (1)에서 설정 검사(B1)로 바로 멈춘다.
set -e

# Render Cron의 dockerCommand도 같은 이미지로 실행한다.
if [ "$#" -gt 0 ]; then
  exec "$@"
fi

if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  echo "[entrypoint] alembic upgrade head"
  # DB 가 이 코드보다 새 버전이면(다른 배포가 먼저 마이그레이션을 적용) 실패하지 않고 그대로 띄운다.
  # 마이그레이션은 '추가만' 하는 규칙이라(docs/dev-order.md) 옛 코드도 새 DB 에서 돈다 —
  # 새 배포가 멈췄을 때 옛 서버까지 꺼져 전체가 멈추는 일을 막는다 (2026-11-28 장애)
  if ! out=$(alembic upgrade head 2>&1); then
    echo "$out"
    case "$out" in
      *"Can't locate revision"*)
        echo "[entrypoint] DB 가 이 코드보다 새 버전 — 마이그레이션 없이 서버를 띄웁니다" ;;
      *) exit 1 ;;
    esac
  else
    echo "$out"
  fi
fi

# 앞단 프록시(Caddy)가 넘겨 준 실제 사용자 IP를 믿는다 — 요청 횟수 제한(B2)이 IP를 보므로.
# api 포트는 외부에 열지 않고 같은 네트워크의 프록시만 접근한다 (docker-compose.prod.yml).
exec uvicorn app.main:app \
  --no-access-log \
  --host 0.0.0.0 --port 8000 \
  --proxy-headers --forwarded-allow-ips="${FORWARDED_ALLOW_IPS:-*}" \
  --workers "${WEB_CONCURRENCY:-1}"
