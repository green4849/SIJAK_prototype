# 시니어 6080 위피 '시작' — 프로토타입

60~80대 시니어를 위한 음성 중심·실명 기반 소셜 서비스.
AI 말동무, 사기 대화 탐지, 음성 매칭 통화, 지역 복지시설 연계, 고립 지수를 제공한다.

> **개발 전 필독: [`docs/dev-order.md`](docs/dev-order.md)** — 스테이지 순서와 레이어 규칙.

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

## 검사 (스테이지 완료 기준)

```bash
cd backend  && uv run pytest && uv run ruff check .
cd frontend && npm run build && npm run lint   # lint에 레이어 경계 검사 포함
```
