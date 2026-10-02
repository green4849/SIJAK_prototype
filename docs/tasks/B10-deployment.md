# B10. 배포 구성

| 영역 | 크기 | 우선 | 상태 | 브랜치 |
|---|---|---|---|---|
| 실서비스 필수 | M | P0 | ✅ 완료 (구성) | `prod/B10-deployment` |

## 왜
로컬 실행만 가능.

## 손댈 곳
infra/ — Dockerfile(백·프론트), compose 또는 클라우드

## 완료 기준
- [x] HTTPS — Caddy 자동 발급·갱신, http→https, 보안 헤더
- [x] 운영 DB·마이그레이션 자동 적용 — api 시작 시 `alembic upgrade head`
- [x] 환경변수·비밀 관리 — `infra/.env.prod`(커밋 금지) + `gen-secrets.sh`, 기본값이면 기동 거부(B1)
- [x] CI에서 운영 구성을 그대로 띄워 확인 (`deploy-smoke`)
- [ ] **실제 서버에 올리기 — 서버·도메인 결정 후 `docs/deploy.md` 순서대로 (사람 작업)**

## 진행 기록

- 서버 1대 구성: `infra/docker-compose.prod.yml` — db(PostGIS, 포트 비공개) · api(FastAPI, 포트 비공개) · web(Caddy, 80/443)
- `backend/Dockerfile`: uv 잠금 파일 그대로 설치(멀티 스테이지), root 아닌 사용자, HEALTHCHECK(/api/v1/health), `docker-entrypoint.sh` 가 마이그레이션 후 uvicorn(`--proxy-headers` — B2가 실제 IP를 보도록)
- `frontend/Dockerfile`: 일반 빌드(데모 아님, `/api` 같은 출처) → Caddy 이미지. 설정은 `infra/Caddyfile` 을 마운트: `/api/*` 프록시, SPA 주소 → index.html, 캐시(index·sw·manifest no-cache / assets·icons 1년), 업로드 5MB, HSTS·Permissions-Policy(위치·마이크만)
- 같은 출처라 refresh 쿠키(path /api/v1/auth, Secure)·CORS가 그대로 동작. CORS_ORIGINS 는 compose가 `https://${DOMAIN}` 으로 넣음
- 이 작업 환경은 컨테이너 레지스트리 접근이 막혀 이미지를 직접 빌드하지 못함 → **CI `deploy-smoke` 로 검증**: 매번 비밀값 새로 생성, `up --build --wait`, health·화면·SPA 주소·401·sw.js 캐시·http→https, 기본 JWT 키로는 API가 뜨지 않는지까지
- 운영 순서·업데이트·백업 명령·확장 전 주의(B9: 메모리 저장 2곳 → 프로세스 1개 유지) — `docs/deploy.md`
