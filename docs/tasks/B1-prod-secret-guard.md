# B1. 운영 환경 기본값 차단

| 영역 | 크기 | 우선 | 상태 | 브랜치 |
|---|---|---|---|---|
| 실서비스 필수 | S | P0 | ⬜ 대기 | `prod/B1-prod-secret-guard` |

## 왜
ENV=prod 인데 기본 JWT 키·암호화 키·pepper여도 서버가 뜬다.

## 손댈 곳
backend/app/core/config.py

## 완료 기준
- [ ] ENV=prod 이고 기본값이면 기동 실패 + 이유 출력
- [ ] cookie_secure 자동 True
- [ ] 단위 테스트

## 진행 기록

- 
