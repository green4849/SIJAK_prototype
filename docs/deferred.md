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

AI 말동무, 음성 통화(⑤ 📞), 고립 지수·자가평가, 긴급 SOS, 신분증 인증 — `docs/dev-order.md` 백로그 참고
