# 개발 순서 & 구조 규칙

이 문서는 "바이브코딩 덩어리"를 막기 위한 **강제 규칙**이다. 코드 리뷰·AI 작업 모두 이 문서를 기준으로 한다.

---

## 1. 스테이지 순서

한 스테이지가 **완료 기준(DoD)** 을 통과하기 전에는 다음 스테이지 코드를 쓰지 않는다.

**화면 기준: [`docs/design/screens-v1.png`](design/screens-v1.png)** (①~⑨). 스테이지는 이 화면 단위로 나눈다.

| # | 스테이지 | 화면 | 백엔드 도메인 | 프론트 feature | 의존 |
|---|---|---|---|---|---|
| 0 | 기반 | — | `core`, `main` | `app`, `shared` | — |
| 1 | 인증 + 온보딩 | ① 시작 ② 로그인/본인인증 ⑧ 보안 안내 | `auth` + `integrations/identity` | `auth` | 0 |
| 2 | 앱 셸 + 홈 + 마이페이지 | ③ 홈 ⑨ 마이페이지 (+설정·도움말) | `auth` (프로필 수정) | `auth`(프로필), `shared/a11y`(글자·대비 설정) | 1 |
| 3 | 동네 친구 찾기 | ④ 추천 친구 / 같은 동네, 친구 신청 | `friend` | `friend` | 2 |
| 4 | 대화 | ⑤ 1:1 대화 (텍스트 + 음성 메시지) | `chat` | `chat` | 3 |
| 5 | 안전 | ⑧의 실체: 위험 대화 탐지·경고, 신고·차단 | `risk` | `safety` (chat 화면에서 페이지가 조합) | 4 |
| 6 | 지역생활 | ⑥ 활동 목록 ⑦ 활동 상세·신청 | `activity` (+ `integrations/public_data`) | `activity` | 2 |

> 6(지역생활)은 3~5와 독립적이라 순서를 당길 수 있다.

### 프로토타입 원칙 (Stage 3~)

- **프론트 완성 우선, 백엔드는 단순 CRUD.** 실시간은 폴링, 탐지는 키워드 룰, 활동은 시드 데이터.
- 복잡한 로직은 **자리만 만들고 [`docs/deferred.md`](deferred.md) 에 기록**한다 (예: GPS 반경 검색).
- 테스트는 도메인별 주요 흐름 통합 테스트 1개 이상.
- 레이어·경계 규칙(§2, §3)은 그대로 지킨다 — 단순하게 만들되 섞지 않는다.

### 백로그 (시안에 화면 없음 — 핵심 흐름 완성 후 결정)

| 기능 | 도메인 | 비고 |
|---|---|---|
| AI 말동무 (텍스트·음성) | `companion` + `integrations/llm`, `stt`, `tts` | 보고서 핵심 기능이나 시안 홈에 진입점 없음 |
| 음성 통화 | `call` | ⑤ 상단 📞 아이콘 |
| 고립 지수 + 자가평가 | `wellbeing` | 3~6의 활동 데이터 필요 |
| 긴급 도움 (SOS) | `emergency` | |

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
   - 예외: 로그인 사용자는 `app.domains.auth.deps.CurrentUser` 로 얻는다 (auth의 공개 API).
6. 설정값·키는 `core.config.Settings` 로만 읽는다. 코드에 하드코딩 금지.

## 3. 프론트 레이어 규칙 (`frontend/src`)

> `src/demo/` 는 데모 빌드 전용 가짜 서버. shared만 import 가능, 화면 코드(app·pages·features)를 몰라야 한다.


```
pages  ──►  features/*  ──►  shared
app (라우터·프로바이더·가드) ──► pages, features/*
```

1. `shared` 는 `features` 를 import하지 않는다.
2. `features/A` 는 `features/B` 를 import하지 않는다. 조합은 `pages` 에서.
3. 백엔드 호출은 각 feature의 `api/` 에서만, 반드시 `shared/api/client` 를 통해.
4. feature 밖(pages·app)에서는 **`features/<f>/index.ts` 공개 API로만** 접근한다. (lint로 강제)
5. 시니어 접근성 기준(글자 18px↑, 터치 56px↑, 대비 7:1↑)은 `shared/styles` 토큰으로만 적용. 컴포넌트에 매직 넘버 금지.
6. **API 타입은 손으로 쓰지 않는다.** 백엔드 OpenAPI에서 생성한 `shared/api/schema.d.ts` 를 `Schema<'이름'>` 으로 꺼내 쓴다 (`shared/api/types.ts`). 데모 가짜 서버의 응답도 같은 타입으로 검사된다.

### API 계약을 바꿀 때 (D3)

```
backend 스키마 수정 → (backend) uv run python -m scripts.export_openapi
                    → (frontend) npm run gen:api   → tsc 오류가 나는 곳 = 고쳐야 할 화면·데모
```
`openapi.json`·`schema.d.ts` 둘 다 커밋한다. 갱신을 잊으면 CI(backend `--check`, frontend `git diff`)가 실패한다.

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
**Stage 1 — 인증 + 온보딩 (①②⑧)** ✅  
**Stage 2 — 앱 셸 + 홈 + 마이페이지 (③⑨)** ✅  
**Stage 3 — 동네 친구 찾기 (④)** ✅ (반경 검색은 deferred)  
**Stage 4 — 대화 (⑤)** ✅ (실시간은 폴링)  
**Stage 5 — 안전** ✅ (탐지는 키워드 룰만)  
**Stage 6 — 지역생활 (⑥⑦)** ✅ (시드 데이터)  

→ 시안 9개 화면 완료. 이후 작업은 **[`docs/roadmap.md`](roadmap.md)** + §6 흐름으로

---

## 6. 프로토타입 이후 작업 흐름 (브랜치·PR)

시안 화면이 다 나온 뒤부터는 **로드맵 항목 1개 = 작업 파일 1개(`docs/tasks/`) = 브랜치 1개**로 간다.

```
docs/tasks/<ID>.md 상태 🔨 → 브랜치 → 작은 커밋들 → 브랜치 push(CI 자동) → PR(템플릿 체크)·리뷰 → main 병합(--no-ff) → 작업 파일 ✅ → 데모 링크 자동 갱신
```

- 브랜치 이름: `<영역>/<ID>-<짧은설명>` — 예: `polish/A1-unread-badge`, `prod/B1-secret-guard`, `feat/C2-stt`
- 커밋 메시지: `<ID>: 무엇을` — 예: `A1: 하단 탭에 안 읽은 메시지 배지`
- 스테이지 내부 순서(§1)는 그대로: 백엔드(model→…→router→test) → 프론트(api→hooks→components→page)
- **main은 항상 데모가 동작하는 상태** — 깨지면 그 PR을 되돌린다
- CI(`.github/workflows/ci.yml`): 백엔드 테스트 · 프론트 lint/build · **e2e(데모 대상, 접근성 스윕 포함)**
- 권장 설정(저장소 관리자): Settings → Branches → `main` 보호 — PR 필수, CI 통과 필수
