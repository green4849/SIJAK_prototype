# C6. 위험 탐지 2·3단계

| 영역 | 크기 | 우선 | 상태 | 브랜치 |
|---|---|---|---|---|
| 기능 확장 | L | P2 | ⬜ 대기 | `feat/C6-risk-ml` |

## 왜
키워드 룰만 있음.

## 손댈 곳
backend/app/domains/risk/service.py `assess_message()`

## 완료 기준
- [ ] 분류 모델 연동
- [ ] 대화 흐름 분석
- [ ] 오탐률 측정

## 참고
docs/deferred.md §3

## 진행 기록

- 2026-11-24 (H36, 1단계 키워드 룰 보강): 백엔드가 "OTP번호"·"otp를"을 못 잡던 빈틈(파이썬 `\b`는 한글도 낱말 글자로 봄)을 영문 경계 `(?:^|[^A-Za-z0-9])…(?![A-Za-z0-9])`로 고침, '오티피' 추가, 붙여 쓴 bit.ly도. 시연 사본은 백엔드와 같은 패턴 글자 + 대소문자 무시(예전엔 'HTTPS://' 못 잡음). 같은 입력·기대값 `backend/tests/fixtures/risk_cases.json`(16개)을 백엔드 단위 테스트와 `frontend/e2e/risk-rules.spec.ts`가 함께 씀. 고치기 전: 백엔드 4개, 시연 3개 실패 
