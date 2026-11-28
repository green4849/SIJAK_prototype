# 시니어 6080 위피 '시작' — 프로토타입

> **상태: 시범 운영 준비 중 (2026-11).** 저장소는 공개되어 있습니다. 아래 시연 사이트와 별도로 실제 서비스가 Render에 배포되어 있습니다.


60~80대 시니어를 위한 동네 친구 서비스 프로토타입입니다.
운영 로그인은 카카오 계정을 사용하며, 실명·나이 본인확인은 하지 않습니다. 일부 기능은 시연 화면에만 있습니다.

### 실제 서비스: **https://sijak-6080.onrender.com/**

카카오 계정으로 로그인합니다. 처음 가입할 때 이름·생년월일·성별과 동네를 직접 입력합니다.
서버가 잠들어 있으면 첫 화면이 열리는 데 약 1분 걸릴 수 있습니다. 배포·환경 설정은 [`docs/deploy-render.md`](docs/deploy-render.md)를 따릅니다.

### 🔗 바로 보기 (서버 없이): **https://green4849.github.io/SIJAK_prototype/**

휴대폰으로 열면 가장 실제에 가까워요. 화면에는 데모 표시가 없고 실제 앱과 같은 모습이에요.

| 링크 | 이렇게 시작해요 |
|---|---|
| https://green4849.github.io/SIJAK_prototype/ | 실제 사용자처럼 시작 화면부터 — 직접 가입 (인증번호는 화면에 표시) |
| https://green4849.github.io/SIJAK_prototype/?tour | **둘러보기** — 김시작님으로 로그인된 상태, 친구·대화·위험 경고·지역 활동이 채워져 있음 |
| https://green4849.github.io/SIJAK_prototype/admin?tour | **운영자 화면** — 신고·위험 대화 처리, 돌봄이 필요한 이웃 (어르신 화면에는 들어가는 길이 없음) |
| https://green4849.github.io/SIJAK_prototype/?reset | 이 탭의 데모 데이터를 처음 상태로 (새 탭으로 열어도 늘 처음 상태) |

> 데모는 실제 서버 대신 **브라우저 안 가짜 서버**(`frontend/src/demo`)로 동작합니다.
> 시연 사이트는 서버 대신 시연 데이터로 동작합니다. 실제 서비스에서 제공하는 기능과 차이가 있습니다.
> 입력한 내용은 그 탭에만 남고 다른 사람과 공유되지 않아요. 이웃 답장·친구 수락은 시연용 자동 응답입니다.
> 화면 구석에 서 있는 **시작이**는 앱 사용법 안내예요. 서버나 AI 없이 미리 써 둔 답을 기기 안에서 골라 보여 줍니다 ([`docs/tasks/C14-sijagi-guide.md`](docs/tasks/C14-sijagi-guide.md)).

> **배포:** [`docs/deploy-render.md`](docs/deploy-render.md) — 현재 Render + Neon 구성. [`docs/deploy.md`](docs/deploy.md)는 서버 1대에 직접 설치할 때의 구성입니다.
>
> **개발 전 필독:** [`docs/dev-order.md`](docs/dev-order.md) 레이어 규칙·작업 흐름 · [`docs/roadmap.md`](docs/roadmap.md) 다음 할 일 · [`docs/deferred.md`](docs/deferred.md) 비워 둔 기능

## 구조

```
backend/    FastAPI (모놀리식, 도메인 모듈 분리)
  app/core/          설정·DB·에러·보안 공용
  app/domains/<d>/   models → repository → service → schemas → router
  app/integrations/  외부 연동 (카카오 로그인, 시연용 Mock 인증, 공공데이터 등)
  alembic/           마이그레이션
  tests/             unit / integration
frontend/   React + Vite + TypeScript
  src/app/           라우터·레이아웃
  src/pages/         라우트 단위 화면 (feature 조합)
  src/features/<f>/  api → hooks → components
  src/shared/        api client, ui, styles(접근성 토큰), a11y, lib
infra/      docker-compose (PostgreSQL + PostGIS)
docs/       개발 규칙
```

## 로컬 실행

```bash
cp .env.example .env

# 1) DB
docker compose -f infra/docker-compose.yml up -d

# 2) 백엔드  (http://localhost:8000/docs)
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload

# 3) 프론트  (http://localhost:5173, /api 는 8000으로 프록시)
cd frontend
npm install
npm run dev
```

## 시연용 데이터

```bash
cd backend && uv run python -m scripts.seed   # 여러 번 실행해도 안전
```

데모 이웃으로 로그인하려면 휴대폰 인증에서 아래 정보를 그대로 입력 (인증번호는 화면에 표시됨):

| 이름 | 생년월일 | 휴대전화 | 성별 | 지역 |
|---|---|---|---|---|
| 이순자 | 1958-05-02 | 010-2000-0001 | 여 | 경기 |
| 박정호 | 1954-11-20 | 010-2000-0002 | 남 | 경기 |
| 김영희 | 1956-02-14 | 010-2000-0003 | 여 | 경기 |

(전체 목록: `backend/scripts/seed.py`. 지역 활동 8개도 함께 들어가며, 날짜는 실행일 기준 며칠 뒤로 잡힌다)

## 테스트용 DB

통합 테스트는 `wipi_test` DB를 쓴다 (테스트마다 스키마 재생성).

```bash
docker exec -it wipi-db psql -U wipi -c "create database wipi_test"
```

## 데모 빌드 (GitHub Pages)

`main` 의 CI 가 성공하면 `.github/workflows/pages.yml` 이 그 커밋으로 데모를 빌드해 Pages에 올린다.

```bash
cd frontend
npm run dev:demo      # 서버 없이 데모 모드로 개발 서버
npm run build:demo    # 데모 빌드 (일반 빌드에는 src/demo 가 포함되지 않음)
```

- 구조: `shared/api/client` 의 전송 함수(fetch)만 `src/demo/transport.ts` 로 교체 → feature·page 코드는 데모인지 모름
- 백엔드 API를 바꾸면 `src/demo/handlers/*` 도 같은 계약으로 맞춘다

## 검사 (스테이지 완료 기준)

```bash
cd backend  && uv run pytest && uv run ruff check .
cd frontend && npm run build && npm run lint   # lint에 레이어 경계 검사 포함
```

```bash
cd frontend && npm run e2e   # 데모 빌드로 전체 흐름 + 접근성 스윕 (백엔드 불필요)
```

push·PR마다 `.github/workflows/ci.yml` 이 같은 검사(백엔드·프론트·e2e)를 자동으로 돌린다.
