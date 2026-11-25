# B4. 실제 본인인증 연동

| 영역 | 크기 | 우선 | 상태 | 브랜치 |
|---|---|---|---|---|
| 실서비스 필수 | L | P0 | 🔨 1단계 Firebase 문자 인증 ✅ / PASS 대기 | `feat/B4-firebase-phone` |

## 왜
현재 Mock.

## 손댈 곳
integrations/identity/ 새 provider (인터페이스 유지)

## 완료 기준
- [ ] 계약·키 발급
- [ ] start/verify 구현
- [ ] CI(연계정보) 저장 형식 동일

## 참고
deferred: 없음 — 인터페이스만 교체

## 진행 기록

- 2026-11-25 1단계 — **Firebase 전화 인증**(시범 운영용 실제 문자). PASS 계약 전까지 번호 소유만 확인한다.
  - `integrations/identity/firebase.py`: start 는 문자 보낼 번호(+82…)를 돌려주고, 문자는 브라우저 Firebase SDK 가 보낸다(reCAPTCHA 보이지 않게). verify 는 Firebase ID 토큰을 Google 공개키로 검증(RS256·aud·iss·exp·auth_time 10분 안) + 토큰의 번호 = 처음 적은 번호. 서비스 계정 키 없음, 새 백엔드 의존성 없음(PyJWT·cryptography·urllib)
  - CI 는 Firebase uid 로 만든다(88자 형식 유지). 문자로 번호를 확인했으면 같은 번호의 기존 계정(Mock 가입)으로 로그인하고 CI 를 이어 둔다
  - API: `PassStartResponse.sms`(Firebase 웹 설정 + 번호, Mock 이면 null), `PassVerifyRequest` 는 `code` 또는 `id_token` 중 하나
  - 프런트: firebase 패키지는 인증 화면에서만 불러온다. CSP 에 Firebase 인증 API·reCAPTCHA 주소 추가(Caddyfile·render.yaml 같게, e2e 가 확인)
  - 무료(Spark) 요금제는 인증 문자 불가(Firebase 문서 "Blaze plan only") → Blaze + 예산 알림 + SMS 지역 정책(대한민국만). 켜는 순서: `docs/deploy-render.md`
  - 남은 것: 실제 Firebase 프로젝트로 문자 받아 보기(사용자 작업 후), PASS 본인확인(이름·생년월일 확인)
