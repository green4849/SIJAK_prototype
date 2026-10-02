# 개발 순서 & 구조 규칙

이 문서는 "바이브코딩 덩어리"를 막기 위한 **강제 규칙**이다. 코드 리뷰·AI 작업 모두 이 문서를 기준으로 한다.

---

## 1. 스테이지 순서

한 스테이지가 **완료 기준(DoD)** 을 통과하기 전에는 다음 스테이지 코드를 쓰지 않는다.

| # | 스테이지 | 백엔드 도메인 | 프론트 feature | 의존 |
|---|---|---|---|---|
| 0 | 기반 | `core`, `main` | `app`, `shared` | — |
| 1 | 인증 | `auth` + `integrations/identity` | `auth` | 0 |
| 2 | AI 말동무 (텍스트) | `companion` + `integrations/llm` | `companion` | 1 |
| 3 | AI 말동무 (음성) | `companion` + `integrations/stt`, `tts` | `companion` | 2 |
| 4 | 위험 탐지 | `risk` | (경고 UI는 `companion`/`call`에 노출) | 2 |
| 5 | 매칭 + 음성 통화 | `match`, `call` | `match`, `call` | 1, 4 |
| 6 | 복지 연계 | `welfare` + `integrations/public_data` | `welfare` | 1 |
| 7 | 고립 지수 + 자가평가 | `wellbeing` | `wellbeing` | 2, 5, 6 |
| 8 | 긴급 도움 | `emergency` | `emergency` | 1 |

> 6(복지)은 독립적이라 2~5 사이 어디든 끼울 수 있다. 7(고립 지수)은 다른 도메인의 활동 데이터를 읽어야 하므로 반드시 뒤.

### 스테이지 내부 순서 (항상 동일)

```
백엔드  model → migration → repository → service → schemas → router → test
프론트  api → hooks → components → page(라우트 연결)
통합    실제 백엔드에 붙여서 수동 확인 → 스테이지 커밋
```

### 스테이지 완료 기준 (DoD)

- [ ] 백엔드: `pytest` 통과, `ruff check` 통과
- [ ] 프론트: `npm run build` (타입체크 포함) 통과, `npm run lint` 통과
- [ ] 해당 도메인 API가 `/docs`(OpenAPI)에 노출되고 수동 호출 확인
- [ ] 이 문서의 "현재 스테이지" 갱신
- [ ] 스테이지 단위 커밋 (`stage-N: ...`)

---

## 2. 백엔드 레이어 규칙 (`backend/app`)

```
router  ──►  service  ──►  repository  ──►  DB
                 │
                 └──►  integrations/*  (외부 API: LLM, STT, TTS, PASS, 공공데이터)
```

1. **router** 는 HTTP만 안다. 요청 파싱 → service 호출 → 응답 스키마 반환. 비즈니스 로직 금지.
2. **service** 는 FastAPI를 import하지 않는다 (`Request`, `HTTPException` 금지). 에러는 `core.errors`의 도메인 예외로 던진다.
3. **repository** 만 SQLAlchemy 세션을 직접 다룬다.
4. **integrations** 는 전부 `base.py`의 인터페이스 뒤에 숨긴다. 서비스는 구현체가 아니라 인터페이스에 의존한다. (예: `MockPassProvider` ↔ 나중에 실제 PASS)
5. **도메인 간 참조는 service → service 만 허용.** 다른 도메인의 repository/model을 직접 import 금지.
6. 설정값·키는 `core.config.Settings` 로만 읽는다. 코드에 하드코딩 금지.

## 3. 프론트 레이어 규칙 (`frontend/src`)

```
pages  ──►  features/*  ──►  shared
app (라우터·프로바이더) ──► pages
```

1. `shared` 는 `features` 를 import하지 않는다.
2. `features/A` 는 `features/B` 를 import하지 않는다. 조합은 `pages` 에서.
3. 백엔드 호출은 각 feature의 `api/` 에서만, 반드시 `shared/api/client` 를 통해.
4. 시니어 접근성 기준(글자 18px↑, 터치 56px↑, 대비 7:1↑)은 `shared/styles` 토큰으로만 적용. 컴포넌트에 매직 넘버 금지.

---

## 4. 프로토타입 범위 결정 (보고서 대비)

| 보고서 | 프로토타입 |
|---|---|
| PASS 본인인증 | `integrations/identity/mock_pass.py` (인터페이스 유지) |
| Whisper 파인튜닝 / Clova | STT·TTS API 호출, provider 교체 가능 |
| KoBERT 정서·사기 분류기 | 룰 + LLM 분류 (분류기 인터페이스 유지) |
| LSTM 시퀀스 분석 | 최근 N개 메시지를 LLM에 넣어 판단 |
| 마이크로서비스 8개 + K8s | 모놀리식 FastAPI + 도메인 모듈, docker-compose |
| PG + Mongo + Redis + S3 + VectorDB | PostgreSQL(PostGIS) 하나로 시작 |
| React Native | React(Vite) 웹, 모바일 반응형 |

---

## 5. 현재 스테이지

**Stage 0 — 기반** ✅
