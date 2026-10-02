# B9. 인증 세션 외부 저장 (Redis)

| 영역 | 크기 | 우선 | 상태 | 브랜치 |
|---|---|---|---|---|
| 실서비스 필수 | S | P1 | ⬜ 대기 | `prod/B9-external-session` |

## 왜
Mock 인증 세션이 프로세스 메모리.

## 손댈 곳
integrations/identity, docker-compose에 redis

## 완료 기준
- [ ] 서버 여러 대에서도 인증 흐름 유지

## 진행 기록

- 
