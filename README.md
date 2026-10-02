# 시니어 6080 위피 '시작' — 프로토타입

60~80대 시니어를 위한 음성 중심·실명 기반 소셜 서비스.
AI 말동무, 사기 대화 탐지, 음성 매칭 통화, 지역 복지시설 연계, 고립 지수를 제공한다.

### 🔗 바로 보기 (서버 없이): **https://green4849.github.io/SIJAK_prototype/**

휴대폰으로 열면 가장 실제에 가까워요. 첫 화면 위 노란 띠에서 **"김시작님으로 바로 둘러보기"** 를 누르면
친구·대화·위험 경고·지역 활동이 미리 채워진 상태로 시작합니다. 직접 가입해도 돼요 (인증번호는 화면에 표시).

> 데모는 실제 서버 대신 **브라우저 안 가짜 서버**(`frontend/src/demo`)로 동작합니다.
> 입력한 내용은 그 탭에만 남고 다른 사람과 공유되지 않아요. 이웃 답장·친구 수락은 시연용 자동 응답입니다.

> **개발 전 필독:** [`docs/dev-order.md`](docs/dev-order.md) 레이어 규칙·작업 흐름 · [`docs/roadmap.md`](docs/roadmap.md) 다음 할 일 · [`docs/deferred.md`](docs/deferred.md) 비워 둔 기능

## 구조

```
backend/    FastAPI (모놀리식, 도메인 모듈 분리)
  app/core/          설정·DB·에러·보안 공용
  app/domains/<d>/   models → repository → service → schemas → router
  app/integrations/  외부 연동 (LLM, STT, TTS, PASS, 공공데이터) — base.py 인터페이스 뒤에 구현
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

`main` 에 push하면 `.github/workflows/pages.yml` 이 데모를 빌드해 Pages에 올린다.

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
