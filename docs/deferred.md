# 남아 있는 기능과 운영 조건

아래 항목은 코드·시연 화면·운영 설정 중 아직 끝나지 않은 부분을 기록한다.
현재 상태는 각 작업 파일(`docs/tasks/`)과 함께 확인한다.

---

## 1. GPS 반경 검색 (같은 동네 친구, 반경 2km)

| 항목 | 상태 |
|---|---|
| 프론트: 위치 동의 → `navigator.geolocation` → `PUT /api/v1/me/location` | ✅ 구현 |
| 백엔드: 좌표 저장 (소수점 2자리 ≈ 1.1km 단위로 뭉개서 저장, 원본 좌표 미저장) | ✅ 구현 |
| 백엔드: **반경 내 사용자 검색 + 거리(km) 계산** | ✅ 구현 (C3) |

- `backend/app/domains/friend/nearby.py` `find_nearby()` — Python haversine(`core/geo.py`, 복지시설 검색과 같은 함수), 반경 2km, 거리는 0.5km 단위로 반올림해 응답
- 사용자가 늘면 PostGIS `ST_DWithin` 으로 교체 (docker 이미지에 PostGIS 포함) — 이 함수 안만 바뀐다

## 2. 실시간 대화

- 현재: 대화방에서 **3초 폴링** (`GET /chats/{id}/messages?after=`)
- 꽂는 곳: `frontend/src/features/chat/hooks/useMessages.ts` 의 폴링 부분을 WebSocket 구독으로 교체

## 3. 위험 대화 탐지 (보고서: 룰 → KoBERT → LSTM 3단계)

- 현재: **1단계 룰(키워드)만** — `backend/app/domains/risk/rules.py`
- 꽂는 곳: `backend/app/domains/risk/service.py` 의 `assess_message()` — 룰 통과 메시지를 ML 분류기로 넘기는 자리
- **음성 메시지는 탐지 대상 아님** (STT 없음). STT를 붙이면 `chat/service.py` `send_voice()`에서 변환 텍스트로 `assess_message()` 호출

## 4. 지역 활동 데이터

- 현재: **시연용 시드 데이터** (`backend/scripts/seed.py`)
- 꽂는 곳: `backend/app/integrations/public_data/` — 공공데이터포털 노인복지시설·프로그램 API

## 5. 기타 (시안에 화면 없음)

AI 말동무, 음성 통화(⑤ 📞), 사회적 관계 지수·자가평가, 긴급 SOS, 신분증 인증 — `docs/dev-order.md` 백로그 참고

## 6. 포인트·참여 장치 (C12)

| 항목 | 지금 | 꽂는 곳 |
|---|---|---|
| 봉사 참여 포인트 | **신청하면 바로** +100P, 취소하면 회수 | 복지관 참석 확인(운영 화면 B7 또는 기관 연동) 후 `PointService.earn_volunteer()` 를 부르도록 `activity/service.py` `apply()` 에서 옮긴다 |
| 포인트 충전·구독 | 화면 안내만 (결제 없음) | 결제사 연동 시 `point` 도메인에 충전 사유(`REASONS`) 추가 + 영수증 테이블. 구독 = 매달 포인트 적립 작업 |
| 대화 주제 추천 | 관심사별 문구 규칙 (`chat/topics.py`) | `suggest()` 안을 `integrations/llm` 호출로 — 최근 대화 몇 개 + 두 사람 관심사를 넣고 질문형 문구 3~4개 |
| 추천 알림 발송 | 예약 작업 코드가 고른 시각에 알림을 생성하고 Web Push 키가 있으면 발송. 운영 예약 작업은 비활성화 | 운영 DB 연결·비밀값·VAPID 키를 설정하고 실기기에서 확인 (`docs/deploy-render.md`) |
| 체험단 무료 기간 | `.env` `POINT_FREE_UNTIL=2026-11-30` 처럼 날짜 하나 | 기간을 여러 개·사용자별로 두려면 point 도메인에 프로모션 테이블 |

## 7. 화면·시연 데이터만 있는 기능 (백엔드 없음)

보고서 기능 중 아직 백엔드가 없는 것은 **화면 + 데모 가짜 서버의 시연 데이터**를 먼저 만들었다.
- API 계약: `frontend/src/shared/api/draft.ts` (손으로 적은 임시 타입 — 원래 규칙은 OpenAPI 생성, dev-order §3-6)
- 응답: `frontend/src/demo/handlers/*` 만. 실제 서버로 띄우면 해당 화면은 「아직 준비 중인 기능이에요」로 표시된다
- 백엔드를 붙일 때: draft.ts 의 모양대로 backend 스키마 → `gen:api` → feature api 파일의 import 를 `Schema<'…'>` 로 → draft.ts 에서 삭제
- **✅ 백엔드 있음** 표시한 줄은 실제 서버(FastAPI + DB)로도 동작한다. 데모 핸들러는 시연용으로 그대로 두되 응답 타입은 `Schema<'…'>` 로 검사된다

| 기능 | 화면 | 데모 API | 꽂는 곳 (백엔드) |
|---|---|---|---|
| C8 AI 말동무 | `/companion` (홈 카드) | `GET /companion` · `GET·POST /companion/messages` | `domains/companion` + `integrations/llm`·`stt`·`tts`. 답은 지금 `demo/companion.ts` 키워드 규칙(위기 → 의료 → 나머지 순서는 실제 가드레일과 같게). 말하기는 녹음 없이 시연 문장으로 받아쓴 척 → C2에서 녹음 파일 업로드로. 듣기는 브라우저 음성 합성(`shared/a11y/speak.ts`) |
| C11 사회적 관계 지수·자가평가 ✅ 백엔드 있음 | `/me/wellbeing` (마이페이지), `/me/wellbeing/check/:kind` | `GET /me/relation-index` · `GET /me/self-assessment(/:kind)` · `POST /me/self-assessment` | `domains/wellbeing` (relation_index_weeks·self_assessments). 지수는 `demo/wellbeing.ts` 공식을 그대로 옮김: 앱 활동=마지막 접속, 대화=최근 14일 이웃에게 보낸 메시지(chat), 이웃 만남=친구(friend)+신청한 활동(activity). 볼 때마다 계산해 그 주(월요일, 한국 날짜) 값을 덮어 써서 '4주 변화'가 쌓인다. 예약 작업이 매일 이용 중인 모든 분의 지수를 계산해 그 주 값을 덮어 쓴다(화면을 안 여는 분도 기록됨). 남은 것: 마음 요인·요즘 마음은 말동무(C8) 정서가 없어 기본값 70·'none', 답장 요인 고정 70, 긴급 단계 → 보호자·복지사 알림(C4·C10) |
| C10 긴급 도움·보호자 ✅ 백엔드 있음 | `/sos` (홈 오른쪽 위 '긴급'), `/me/guardians` | `POST /emergency/sos` · `GET·POST /me/guardians` · `DELETE /me/guardians/:id` | `domains/emergency` (guardians·sos_events). 보호자 전화번호는 users 처럼 AES-256-GCM 암호화, 3명까지. 긴급 도움은 기록하고, **문자 발송이 켜져 있으면(`SMS_PROVIDER=solapi`) 보호자마다 문자**를 바로 보낸다(실패하면 한 번 더, 남은 실패는 `scripts.jobs sos-retry`·`loop` 가 1시간 안에서 3번까지). 보호자별 결과는 `sos_deliveries`, 화면은 실제 결과대로(보냄·일부·못 보냄·기록만). 기본값 `off` 는 기록만. `GET /emergency` 로 확인 창 문구를 고른다. 연달아 누르기 10분 3번. 남은 것: 푸시(C4)·복지사 연계·위치 첨부, 문자 수신 확인(솔라피 전달 결과 조회) |
| C7 가까운 복지시설 ✅ 백엔드·공공데이터 경로당 연동 (운영 적재 대기) | `/welfare` (지역생활 맨 위 카드), `/welfare/:id` | `GET /welfare/nearby?kind=` · `GET /welfare/:id` | `domains/welfare` (welfare_centers·programs·rooms). `GET /welfare/search`: 반경 5km → 없으면 10km → 20km 로 넓히고, 그래도 없으면 거리와 상관없이 가장 가까운 5곳(어떻게 찾았는지 `mode` 로 — 화면이 「5km 안에는 없어서 10km 안을 보여 드려요」처럼 사실대로 안내). 예전 `/welfare/nearby` 는 같은 결과의 목록만. 반경 검색은 위도·경도 사각형으로 거른 뒤 대원거리로 계산(`core/geo.py`, 친구 같은 동네와 같은 함수), 0.5km 단위. 내 위치가 없으면 같은 시·도 시설을 거리 없이. **PostGIS `ST_DWithin` 은 쓰지 않음** — CI DB(`postgres:16`)에 확장이 없고, PostGIS 이미지로 바꾸면 tiger 테이블 때문에 `alembic check` 가 실패한다. 커지면 `WelfareRepository.in_box` 만 바꾼다. 데이터: 키가 없으면 `scripts.seed` 의 **가명 예시 4곳**(`source='sample'`, 전화번호 없음 → 화면에서 전화 버튼 숨김, 응답 `sample_note` 로 '예시' 안내). 공공데이터포털 경로당은 `PUBLIC_DATA_API_KEY` + `scripts.import_welfare --all`로 가져온다. 운영 일회성 실행은 `docs/welfare-import.md`를 따른다. 노인복지관·시니어센터는 별도 출처가 필요하다 |
| 두뇌 운동 (인지 훈련) ✅ 백엔드 있음 | `/brain` (홈 아래 카드), `/brain/match` `/brain/calc` | `GET /brain/stats` · `POST /brain/results` | `domains/brain` (brain_results). 게임은 화면에서만 돌고 서버는 기록만 — 연속 일수·이번 주(월~일)·최고 기록을 **한국 날짜**로 센다. 남은 것: 게임 종류·난이도, 사회적 관계 지수 '앱 활동' 요인에 반영 |
| 알림함 (C4 일부) ✅ 백엔드 있음 | `/notifications` (마이페이지 '알림함') | `GET /notifications` · `POST /notifications/:id/read` · `POST /notifications/read-all` | `domains/notification` 의 `notifications` 테이블(최근 50개). 친구 신청·수락·위험 대화·활동 신청을 저장한다. 활동 하루 전·추천 친구는 예약 작업 코드가 생성하지만 운영 실행은 비활성화 상태다. Web Push 코드는 있으나 운영 키와 실기기 수신 확인이 남았다. 마음 날씨·복지관·포인트 소식은 별도 구현 필요 |
| B3 회원 탈퇴 ✅ 백엔드 있음 | `/me/leave` (마이페이지 맨 아래) | `POST /me/withdraw` | auth 서비스 `withdraw`: 바로 `status=deleted`(로그인·추천·친구 목록에서 빠짐), 모든 refresh 토큰 폐기, `users.delete_after`(한국 날짜 +30일)·`withdraw_reason` 기록. 다시 인증하면 「○월 ○일 뒤에 다시 가입할 수 있어요」. 예약 작업 코드는 삭제일이 된 계정과 90일 지난 음성 파일을 정리한다. 대화방의 탈퇴 회원 익명 표시와 새 메시지 차단도 구현됨(#82). 운영 예약 실행은 비활성화 상태라 삭제 일정은 아직 자동 보장되지 않음 |
| B7 운영자 화면 ✅ 백엔드 있음 | `/admin` (주소로 직접) | `GET /admin/cases` · `POST /admin/cases/:id/action` · `GET /admin/watch` | `domains/admin` (moderation_actions). **운영자 역할 필수** — `users.role='operator'`, 아니면 403(데모는 로그인만 확인). 역할은 API로 못 바꾸고 `uv run python -m scripts.set_role --user-id <회원 UUID> operator` 또는 `--kakao-id <카카오 회원번호>`로 지정한다. 기존 전화 회원은 전화번호도 가능하다. 사건 = risk 자동 감지(`auto-<id>`) + 이웃 신고(`report-<id>`), 처리는 기록으로 남고 한 번만. 7일 정지·영구 제한은 계정 상태에 바로 반영(모든 기기 로그아웃, 정지는 기한 지나면 다음 접속 때 풀림). 돌봄 목록 = 이번·지난주 사회적 관계 지수가 '정상' 아래인 사람 낮은 순, 보호자 알림 = 최근 7일 긴급 도움. 지수 일괄 계산은 예약 작업 활성화 후 실행된다. 신고 메시지 앞뒤 각 5개 대화 맥락은 운영자만 조회 가능. 남은 것: 경고 문구 발송, 지역(복지관)별 담당 범위 |
| C14 시작이 앱 가이드 | 모든 화면 구석의 3D 시작이 (긴급·운영자 제외) | 없음 — 답은 기기 안에서 고른다(`features/guide/lib`). 서버를 부르지 않으므로 실제 서버로 띄워도 그대로 동작 | `domains/guide` + `integrations/llm`, 서버 STT/TTS(C2). `GuideEngine`(lib/types.ts) 하나만 서버 구현으로 바꾼다. 위기·위급 판단은 계속 기기에서 먼저. 되는 것/안 되는 것 표: `docs/tasks/C14-sijagi-guide.md` |
