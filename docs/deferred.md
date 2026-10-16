# 비워둔 기능 (프로토타입 범위 밖)

프로토타입은 **프론트 완성 우선, 백엔드는 단순 구현**으로 간다.
아래 항목은 자리(인터페이스·컬럼·TODO)만 만들어 두고 실제 로직은 비워 둔다.
각 항목의 "꽂는 곳"만 채우면 나머지 코드는 바꿀 필요가 없도록 경계를 잡아 두었다.

---

## 1. GPS 반경 검색 (같은 동네 친구, 반경 2km)

| 항목 | 상태 |
|---|---|
| 프론트: 위치 동의 → `navigator.geolocation` → `PUT /api/v1/me/location` | ✅ 구현 |
| 백엔드: 좌표 저장 (소수점 2자리 ≈ 1.1km 단위로 뭉개서 저장, 원본 좌표 미저장) | ✅ 구현 |
| 백엔드: **반경 내 사용자 검색 + 거리(km) 계산** | ✅ 구현 (C3) |

- `backend/app/domains/friend/nearby.py` `find_nearby()` — Python haversine, 반경 2km, 거리는 0.5km 단위로 반올림해 응답
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
| 추천 알림 발송 | 설정 저장만 (`notification` 도메인) | C4 푸시 알림 발송기가 `NotificationService.get()` 을 읽어 고른 시각에만, 밤 9시~아침 8시 제외 |
| 체험단 무료 기간 | `.env` `POINT_FREE_UNTIL=2026-11-30` 처럼 날짜 하나 | 기간을 여러 개·사용자별로 두려면 point 도메인에 프로모션 테이블 |

## 7. 화면·시연 데이터만 있는 기능 (백엔드 없음)

보고서 기능 중 아직 백엔드가 없는 것은 **화면 + 데모 가짜 서버의 시연 데이터**를 먼저 만들었다.
- API 계약: `frontend/src/shared/api/draft.ts` (손으로 적은 임시 타입 — 원래 규칙은 OpenAPI 생성, dev-order §3-6)
- 응답: `frontend/src/demo/handlers/*` 만. 실제 서버로 띄우면 해당 화면은 「아직 준비 중인 기능이에요」로 표시된다
- 백엔드를 붙일 때: draft.ts 의 모양대로 backend 스키마 → `gen:api` → feature api 파일의 import 를 `Schema<'…'>` 로 → draft.ts 에서 삭제

| 기능 | 화면 | 데모 API | 꽂는 곳 (백엔드) |
|---|---|---|---|
| C8 AI 말동무 | `/companion` (홈 카드) | `GET /companion` · `GET·POST /companion/messages` | `domains/companion` + `integrations/llm`·`stt`·`tts`. 답은 지금 `demo/companion.ts` 키워드 규칙(위기 → 의료 → 나머지 순서는 실제 가드레일과 같게). 말하기는 녹음 없이 시연 문장으로 받아쓴 척 → C2에서 녹음 파일 업로드로. 듣기는 브라우저 음성 합성(`shared/a11y/speak.ts`) |
| C11 사회적 관계 지수·자가평가 | `/me/wellbeing` (마이페이지), `/me/wellbeing/check/:kind` | `GET /me/relation-index` · `GET /me/self-assessment(/:kind)` · `POST /me/self-assessment` | `domains/wellbeing`. 지수는 지금 `demo/wellbeing.ts` 가 보고서 4.5.3 고립 지수 공식을 뒤집어(100 − II, 높을수록 좋음) 데모 활동으로 계산(답장 요인은 고정 70, 지난 3주는 시드). 정서 요인은 말동무 대화 정서 라벨. 긴급 단계 → 보호자·복지사 알림은 C4 푸시와 함께 |
| C10 긴급 도움·보호자 | `/sos` (홈 오른쪽 위 '긴급'), `/me/guardians` | `POST /emergency/sos` · `GET·POST /me/guardians` · `DELETE /me/guardians/:id` | `domains/emergency`. 알림 발송(문자·푸시)·복지사 연계는 비어 있음 — 데모는 기록만. 보호자 전화번호는 실서비스에서 users 처럼 암호화 저장 |
| C7 가까운 복지시설 | `/welfare` (지역생활 맨 위 카드), `/welfare/:id` | `GET /welfare/nearby?kind=` · `GET /welfare/:id` | `integrations/public_data` (공공데이터포털 노인복지시설) + PostGIS `ST_DWithin` 반경 검색(§1과 같은 자리). 시설·프로그램·공간은 `demo/handlers/welfare.ts` 가상 데이터, 거리는 고정값. 신청은 전화로만 |
| 두뇌 운동 (인지 훈련) | `/brain` (홈 아래 카드), `/brain/match` `/brain/calc` | `GET /brain/stats` · `POST /brain/results` | 새 도메인 필요(예: `domains/brain`). 게임은 화면에서만 돌고 서버는 기록(연속 일수·이번 주·최고 기록)만 |
| 알림함 (C4 일부) | `/notifications` (마이페이지 '알림함') | `GET /notifications` · `POST /notifications/:id/read` · `POST /notifications/read-all` | `domains/notification` 에 알림 목록 테이블. 소식은 지금 시드 6개뿐 — 실제로는 신청·위험 감지·활동 하루 전 등에서 생성 |
| B3 회원 탈퇴 | `/me/leave` (마이페이지 맨 아래) | `POST /me/withdraw` | auth 서비스 + 30일 뒤 삭제·음성 90일 정리 작업 |
| B7 운영자 화면 | `/admin` (주소로 직접) | `GET /admin/cases` · `POST /admin/cases/:id/action` · `GET /admin/watch` | 운영자 역할·권한 필수(데모는 로그인만 확인). 사건 = risk 이벤트 + 신고, 돌봄 목록 = wellbeing 사회적 관계 지수 낮은 순 |
