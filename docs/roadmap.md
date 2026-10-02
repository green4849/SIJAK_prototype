# 로드맵 — 프로토타입 이후

시안 9개 화면은 완성(Stage 0~6). 여기부터는 **폴리싱**과 **실서비스로 가기 위한 일**을 항목 단위로 쌓는다.
**항목별 작업 파일: [`docs/tasks/`](tasks/README.md)** — 목표·완료 기준·진행 기록·상태는 거기서 관리한다.

- **크기**: S(반나절) · M(1~3일) · L(1주 이상)
- **우선순위**: P0 실서비스 전 반드시 · P1 다음 시연 전 · P2 있으면 좋음
- **위치**: 손댈 곳. `docs/deferred.md` 의 "꽂는 곳"과 연결되는 항목은 ↪ 표시

진행 방법은 `docs/dev-order.md` §6 (브랜치·PR 흐름)을 따른다.

---

## A. 폴리싱 — 시니어가 실제로 쓰기 편하게

| ID | 항목 | 왜 | 위치 | 크기 | 우선 |
|---|---|---|---|---|---|
| A1 | **하단 탭·홈 카드에 안 읽은 메시지·받은 친구 신청 배지** | 지금은 대화 목록에 들어가야만 새 메시지를 안다 | `app/BottomNav`, `pages/HomePage` (+ chat·friend 개수 훅) | S | P1 |
| A2 | **대화 스크롤: 위로 읽는 중이면 자동으로 끌어내리지 않기** + "새 메시지 ↓" 버튼 | 지난 대화 읽다가 3초마다 맨 아래로 튕김 | `features/chat/components/MessageList` | S | P1 |
| A3 | **지난 대화 더 보기** (100개 넘는 이력) | 현재 최근 100개만 | chat repository `before=` 파라미터 + MessageList | M | P2 |
| A4 | **동작 후 피드백** — 토스트/진동(`navigator.vibrate`) | 보고서 UI 원칙 "직접적 피드백" | `shared/ui/Toast` 신설 | S | P1 |
| A5 | **입력칸 옆 음성 입력(받아쓰기) 버튼** | 보고서 "모든 텍스트 입력에 음성 입력 동등 배치" | `shared/ui/TextField`·Composer + STT (C2) | M | P1 |
| A6 | **화면 읽어 주기(TTS) 버튼** — 화면 제목·핵심 문장 | 보고서 NFR "전체 메뉴 음성 안내" | `shared/a11y/speak.ts` (Web Speech API 우선) | M | P2 |
| A7 | **불러오는 중 스켈레톤**, 연결 끊김 안내 배너 | "불러오는 중…" 글자만 있음, 오프라인 시 무반응 | `shared/ui/Skeleton`, `shared/lib/useOnline` | S | P2 |
| A8 | **검색** (시안 ④⑥ 오른쪽 위 돋보기) | 시안에 있으나 미구현 | friend·activity 목록 필터 (백엔드 `q=`) | M | P2 |
| A9 | **프로필 사진** (선택) — 없으면 지금처럼 이름 아바타 | 시안은 얼굴 그림 | auth 업로드 + `core/storage` | M | P2 |
| A10 | **"지금 접속 중" 표시** (시안 ⑤ 헤더) | 시안에 있음 | last_seen 갱신 + ChatRoomPage | S | P2 |
| A11 | **실사용자 접근성 점검** — TalkBack/VoiceOver로 전 화면, 어르신 3~5명 사용성 테스트 | 자동 검사는 넘침·터치 크기까지만 확인 | 결과를 이슈로 | M | P1 |
| A12 | **글자 체계·여백** — 글꼴 통일(로고 외 Noto), 굵기 3단계, 역할별 크기·여백 토큰 | [디자인 리뷰 v1](design/review-v1.md) 공통 1~7 | tokens·base·shared/ui·화면 CSS | M | P1 |
| A13 | **색 역할·카드** — 큰 파스텔 면 축소, 카드 경계·모서리·상태 규칙 | 리뷰 공통 8~13·19·20 | tokens·ActionCard·Home/Safety/Login·BottomNav | M | P1 |
| A14 | **아이콘·이미지 크기 규칙** — 아이콘·아바타·썸네일, 상단 바, 시작 화면 | 리뷰 공통 14~18·21, ① | tokens·Avatar·TopBar·Welcome | S | P1 |
| A15 | **화면별 세부 배치** — 친구 카드, 말풍선·입력줄, 활동 목록·상세, 마이페이지 | 리뷰 ②~⑨ | 각 화면 | M | P1 |

## B. 실서비스 필수 — 보안·법·운영

| ID | 항목 | 왜 | 위치 | 크기 | 우선 |
|---|---|---|---|---|---|
| B1 | **운영 환경 기본값 차단** — `ENV=prod`인데 기본 JWT 키·암호화 키·pepper면 서버가 뜨지 않게 | 지금은 기본값으로도 뜬다 | `core/config.py` validator | S | P0 |
| B2 | **요청 횟수 제한** — 인증번호 요청, 메시지·신고 폭주 | 무차별 대입·스팸 | 미들웨어 또는 slowapi, Redis | M | P0 |
| B3 | **회원 탈퇴 + 30일 후 완전 삭제**, 90일 지난 음성 자동 삭제 | 보고서 4.6.3 개인정보 정책 | auth `DELETE /me`, 정리 작업(cron) | M | P0 |
| B4 | **실제 본인인증** (PASS/NICE 등 계약) | Mock 상태 | ↪ `integrations/identity/` 새 provider | L | P0 |
| B5 | **위치정보 법적 요건** — 위치기반서비스사업 신고, 위치정보 이용 동의·약관 | 대략 위치라도 저장·이용하면 해당 가능 — 확인 필요 | 동의 기록 테이블 + 약관 화면 | M | P0 |
| B6 | **약관·개인정보처리방침 화면 + 가입 시 동의** | 현재 없음 | auth 가입 흐름에 단계 추가 | S | P0 |
| B7 | **신고 처리 운영 화면** (운영자·복지기관용) | 신고가 쌓이기만 함 | 별도 admin 앱 또는 `/admin` 보호 라우트 | L | P0 |
| B8 | **N+1 쿼리 정리** — 대화 목록(방마다 마지막 메시지·안 읽은 수), 친구 추천(전체 사용자 로드) | 사용자 늘면 느려짐 | chat·friend repository 집계 쿼리, 추천은 후보 제한 | M | P1 |
| B9 | **세션 저장 외부화** — Mock 인증 세션이 프로세스 메모리 | 서버 2대 이상이면 깨짐 | Redis | S | P1 |
| B10 | **배포 구성** — 백엔드·프론트 Dockerfile, HTTPS, 운영 DB, 마이그레이션 자동 적용 | 현재 로컬 실행만 | `infra/` | M | P0 |
| B11 | **오류 수집·로그** (Sentry 등), 개인정보 마스킹 | 장애를 모름 | 백·프론트 초기화 코드 | S | P1 |
| B12 | **백업·키 관리** — DB 백업, 암호화 키 보관·교체 | 키 잃으면 전화번호 복호화 불가 | 운영 문서 + 키 버전 컬럼 | M | P1 |

## C. 기능 확장 — 보고서·백로그

| ID | 항목 | 위치 | 크기 | 우선 |
|---|---|---|---|---|
| C1 | **실시간 대화** (WebSocket) — 폴링 대체 ↪ deferred §2 | `features/chat/hooks/useMessages` + 백엔드 WS | M | P1 |
| C2 | **STT/TTS 연동** — 음성 메시지 자막, 받아쓰기(A5), 음성 메시지 위험 탐지 ↪ deferred §3 | `integrations/stt`, `tts` | L | P1 |
| C3 | **같은 동네 반경 검색** ↪ deferred §1 | `domains/friend/nearby.py` `find_nearby()` | S~M | P1 |
| C4 | **푸시 알림** — 새 메시지·친구 신청·활동 하루 전 | Web Push(PWA) 또는 FCM(앱) | M | P1 |
| C5 | **PWA** — 홈 화면에 추가, 아이콘·스플래시 / 이후 Capacitor로 앱 스토어 | `public/manifest.webmanifest`, service worker | S | P1 |
| C6 | **위험 탐지 2·3단계** (분류 모델, 대화 흐름) ↪ deferred §3 | `domains/risk/service.py` `assess_message()` | L | P2 |
| C7 | **공공데이터 복지시설·프로그램 연동** ↪ deferred §4 | `integrations/public_data` | M | P2 |
| C8 | **AI 말동무** (보고서 핵심, 시안에 진입점 없음 — 위치 결정 필요) | `domains/companion` + `integrations/llm` | L | P2 |
| C9 | **음성 통화** (시안 ⑤ 📞) | `domains/call` + WebRTC | L | P2 |
| C10 | **긴급 도움(SOS)·보호자 연결** | `domains/emergency` | M | P2 |
| C11 | **고립 지수·자가평가** | `domains/wellbeing` (3~6 활동 데이터 사용) | M | P2 |

## D. 개발 인프라 — 계속 다듬기 위한 바탕

| ID | 항목 | 상태 |
|---|---|---|
| D1 | E2E 테스트를 저장소에 (`frontend/e2e`, 데모 빌드 대상 → 백엔드 없이 CI에서 실행) | ✅ |
| D2 | 브랜치·PR 흐름, PR·이슈 템플릿 | ✅ |
| D3 | **API 타입 자동 생성** — 백엔드 OpenAPI → `frontend/src/shared/api/schema.d.ts`. 프론트 타입·데모 핸들러가 백엔드와 어긋나면 빌드에서 잡힘 | ⬜ M · P1 |
| D4 | 프론트 단위·컴포넌트 테스트 (Vitest + Testing Library) — 훅·폼 검증 | ⬜ M · P2 |
| D5 | 시각 회귀 (스크린샷 비교) — 폴리싱 중 의도치 않은 화면 변화 감지 | ⬜ S · P2 |

---

## 추천 순서

1. **다음 시연 전 (P1 폴리싱 묶음):** A1 배지 → A2 스크롤 → A4 피드백 → C5 PWA → **디자인 리뷰 반영 A12 → A13 → A14 → A15** → A11 사용성 점검(정리된 화면으로)
2. **기술 기반:** D3 API 타입 생성 (이후 모든 작업에서 데모·백엔드 어긋남 방지)
3. **음성:** C2 STT/TTS — 음성 중심 서비스의 핵심. 어르신 발화 인식률(WER)은 보고서에서도 핵심 지표
4. **실서비스 준비 (P0 묶음):** B1·B6 먼저(작음) → B2·B3 → B10 배포 → B4·B5·B7은 기관·계약과 함께
