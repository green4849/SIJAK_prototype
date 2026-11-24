# 배포 (B10) — 서버 1대 운영 구성

```
인터넷 ──443──► web (Caddy)  ── 정적 화면(frontend 빌드) + HTTPS 자동 발급
                  │ /api/*
                  ▼
                api (FastAPI) ── 시작할 때 DB 마이그레이션 자동 적용
                  │
                  ▼
                db (PostgreSQL + PostGIS)      ※ db·api 포트는 외부에 열지 않음
```

파일: `infra/docker-compose.prod.yml`, `infra/Caddyfile`, `infra/.env.prod.example`, `infra/gen-secrets.sh`,
`backend/Dockerfile`(+`docker-entrypoint.sh`), `frontend/Dockerfile`.
CI의 `deploy-smoke` 작업이 push마다 이 구성을 그대로 띄워 HTTPS·API·화면 주소·안전장치를 확인한다.

## 처음 한 번

1. **서버 준비** — Docker가 설치된 리눅스 VM 1대 (2 vCPU·4GB면 시범 운영에 충분). 80·443 포트 열기.
2. **도메인** — DNS A 레코드를 서버 IP로. (인증서는 Caddy가 Let's Encrypt로 자동 발급·갱신)
3. **코드 받기** — `git clone https://github.com/green4849/SIJAK_prototype.git && cd SIJAK_prototype`
4. **환경값**
   ```sh
   cp infra/.env.prod.example infra/.env.prod
   sh infra/gen-secrets.sh >> infra/.env.prod     # 비밀값 4개 생성
   vi infra/.env.prod                              # DOMAIN 등 수정
   ```
   - `.env.prod`는 커밋 금지(.gitignore). **비밀값은 서버 밖에도 안전하게 따로 보관** — 특히 `DATA_ENCRYPTION_KEY`를 잃으면 저장된 전화번호를 복호화할 수 없다 (B12).
   - 실제 본인인증(B4) 계약 전 시범 운영이면 `ALLOW_MOCK_IDENTITY_IN_PROD=true` — 이 경우 누구나 화면에 뜬 번호로 가입할 수 있다는 점을 알고 켤 것.
5. **띄우기**
   ```sh
   docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod up -d --build
   ```
6. **확인** — `https://<도메인>/api/v1/health` → `{"status":"ok"}`, `https://<도메인>/` 시작 화면.

설정이 안전하지 않으면(기본 비밀값, https 아닌 주소, 허락 없는 Mock 인증) API가 **이유를 모두 출력하고 뜨지 않는다** (B1):
`docker compose -f infra/docker-compose.prod.yml logs api`

## 업데이트

```sh
git pull
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod up -d --build
```
- 새 마이그레이션은 api 컨테이너가 시작할 때 자동 적용(`alembic upgrade head`). 끄려면 `RUN_MIGRATIONS=0`.
- 되돌리기: 이전 커밋으로 `git checkout <커밋>` 후 같은 명령. (DB 스키마를 되돌려야 하면 `alembic downgrade` — 데이터 손실 가능성 확인 후)

## 운영 메모

| 항목 | 내용 |
|---|---|
| 로그 | `docker compose -f infra/docker-compose.prod.yml logs -f api` |
| DB 백업 | `docker compose … exec db pg_dump -U wipi wipi \| gzip > backup-$(date +%F).sql.gz` — 정기 실행·서버 밖 보관은 B12 |
| 음성 파일 | `media` 볼륨 (`/data/media`). 90일 지나면 `jobs` 서비스가 파일을 지우고 메시지는 「보관 기간이 지나 지운 음성 메시지예요」로 |
| 예약 작업 | `jobs` 서비스(api 와 같은 이미지)가 매일 새벽 4시(한국, `JOBS_DAILY_HOUR_KST`)에: ① 탈퇴 30일 지난 계정 완전 삭제(이유만 달별 집계 `withdrawal_reason_counts`) ② 음성 파일 정리(`VOICE_RETENTION_DAYS`, 기본 90) ③ 사회적 관계 지수 일괄 계산. 지금 한 번 돌리기: `docker compose … exec jobs python -m scripts.jobs daily` · 로그: `… logs -f jobs` |
| 캐시 | `index.html`·`sw.js`·manifest는 매번 확인(no-cache), `assets/`·`icons/`는 1년 — 배포 즉시 새 화면. `sw.js`는 빌드마다 버전이 바뀌어, 이미 열어 둔 앱에는 「새 버전이 있어요 [새로 고침]」이 뜬다 (H34) |
| 보안 헤더 | HSTS, nosniff, Referrer-Policy, Permissions-Policy(위치·마이크만 허용), Content-Security-Policy(이 사이트 것만 + 동네 이름 찾기 OpenStreetMap·활동 사진 Unsplash, 인라인 스크립트·스타일 없음, 다른 사이트에 넣기 금지) — `infra/Caddyfile`. 정책을 고치면 `frontend/e2e/csp.spec.ts` 가 그 줄을 읽어 여러 화면에서 위반이 없는지 본다 (H42) |
| 실제 IP | Caddy가 넘긴 사용자 IP를 uvicorn `--proxy-headers`로 받음 → 요청 횟수 제한(B2)이 IP 기준으로 동작 |

## 시연 사이트 (GitHub Pages, 서버 없음)

- `.github/workflows/pages.yml` — main 에 push 하면 `build:demo` 를 `https://<계정>.github.io/<저장소>/` 로 배포
- 직접 연 화면 주소(`/welcome`, `/me/points` 등)도 HTTP 200 — `frontend/scripts/pages-spa.mjs` 가 `src/app/App.tsx` 의 화면 주소마다 `index.html` 사본(`welcome.html`, 하위 화면이 있으면 `me/index.html`)을 둔다. 값이 들어가는 주소(`/chats/:id` 등)는 `404.html`(같은 앱)로 열려 화면은 뜨지만 상태는 404 (H35)
- 공유 미리보기: `index.html` 의 `og:` 태그 + `public/icons/og-image.png`(1200×630, `npm run icons` 로 다시 만듦). 카카오톡은 그림 주소가 절대 주소여야 해서 빌드 때 `VITE_SITE_URL` 로 채운다 — 운영 서버에 올릴 때도 `VITE_SITE_URL=https://도메인/` 을 주면 같은 미리보기가 나온다

## ⚠️ 서버를 늘리기 전에 (B9)

지금은 **API 프로세스 1개**(`WEB_CONCURRENCY=1`) 기준이다. 아래가 프로세스 메모리에 있어서,
프로세스·서버를 2개 이상으로 늘리면 서로 공유되지 않는다:

- Mock 본인인증 대기 세션 (`integrations/identity/mock_pass.py`)
- 요청 횟수 제한 기록 (`core/ratelimit.py` `MemoryRateLimitStore`)

→ B9에서 Redis 구현으로 바꾼 뒤에 `WEB_CONCURRENCY`를 올리거나 서버를 늘린다. 그 전에 운영(`ENV=prod`)에서 `WEB_CONCURRENCY`를 2 이상으로 주면 API가 뜨지 않는다 — 요청 제한이 워커마다 따로 세어져 느슨해지는 것을 막으려고 (H42). 메모리 기록은 1,000번 기록마다 창이 지난 키를 지워 계속 쌓이지 않는다
