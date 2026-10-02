# D3. API 타입 자동 생성

| 영역 | 크기 | 우선 | 상태 | 브랜치 |
|---|---|---|---|---|
| 개발 인프라 | M | P1 | ⬜ 대기 | `infra/D3-openapi-types` |

## 왜
프론트 타입·데모 핸들러가 백엔드와 어긋나도 빌드에서 안 잡힌다.

## 손댈 곳
백엔드 OpenAPI → frontend/src/shared/api/schema.d.ts (openapi-typescript)

## 완료 기준
- [ ] 생성 스크립트 + CI에서 최신 여부 확인
- [ ] feature api 타입을 생성 타입으로 교체

## 진행 기록

- 
