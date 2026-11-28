# B6. 약관·개인정보처리방침 + 가입 동의

| 영역 | 크기 | 우선 | 상태 | 브랜치 |
|---|---|---|---|---|
| 실서비스 필수 | M | P0 | ✅ 동의 단계(#66) · 카카오 기준 문구(#81) / 운영자 정보·법률 검토 대기 | `feat/signup-consent` |

## 왜
현재 없음.

## 손댈 곳
auth 가입 흐름에 동의 단계, 마이페이지 링크

## 완료 기준
- [x] 필수/선택 동의 구분 — 필수: 이용약관·개인정보 수집·이용·위치(B5). 선택: 마음 건강 기록(민감정보)
- [x] 동의 시각·버전 저장 — `consent_records`(쌓기만), 버전이 바뀌면 다시 동의
- [x] 큰 글씨로 요약 먼저, 전문은 펼치기
- [ ] 운영자·개인정보 보호책임자 이름·연락처 채우기 (`frontend/src/shared/legal/documents.ts` `OPERATOR`) — 사용자 확인 필요
- [ ] 법률 검토 (지도교수·법무) — 문서는 지금 코드가 하는 일 그대로 적었지만 전문가 확인 전

## 구조
- 문서 본문: `frontend/src/shared/legal/documents.ts` (terms·privacy·location·health + 처리방침 policy). 버전 `LEGAL_VERSION`
- 종류·필수 여부·버전: `backend/app/domains/auth/constants.py` `CONSENT_DOCS`·`CONSENT_VERSIONS` — 프런트 버전과 같아야 한다 (`e2e/demo-constants.spec.ts`)
- 문서를 바꾸면: 본문 수정 → 양쪽 버전 올림 → `uv run python -m scripts.export_demo_constants` → 시연 `src/demo/constants.ts`
- API
  - `GET /auth/options` → `consents`(종류·버전·필수)
  - `POST /auth/signup` → `consents`(필수 모두 agreed 여야 201, 아니면 422 `consent_required`/`consent_outdated`)
  - `GET /me/consents` 상태·결정 시각, `POST /me/consents` 동의(철회 안 받음)
  - `PUT /me/self-assessment/consent` 마음 건강 동의·철회 — 철회하면 점검 기록 삭제
  - `POST /me/self-assessment` — 마음 건강 동의 없으면 403 `health_consent_required`
  - `UserOut.consent_needed`(필수 미동의 → 앱이 `/consent`로), `UserOut.health_consent`
- 화면: 가입 1/3 `ConsentForm`, 다시 동의 `/consent`(`RequireAuth`가 보냄), 마이페이지 `/me/consents`, 문서 `/legal/:doc`(로그인 없이), 점검 앞 `HealthConsentCard`

## 진행 기록

- 2026-11-25: 동의 단계·기록·다시 동의·마음 건강 동의 구현 (`feat/signup-consent`). 백엔드 통합 시험 `test_consent_flow.py`, e2e `consent.spec.ts`
- 인증 정보(이름·생년월일·번호)는 동의 전에 입력받지만 저장하지 않는다 — 신규 회원은 서명된 가입 토큰에만 담기고, 동의 후 가입할 때 저장된다. 인증 화면 아래에 이 점과 처리방침 링크를 둔다

