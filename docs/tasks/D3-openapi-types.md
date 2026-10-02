# D3. API 타입 자동 생성

| 영역 | 크기 | 우선 | 상태 | 브랜치 |
|---|---|---|---|---|
| 개발 인프라 | M | P1 | ✅ 완료 | `infra/D3-openapi-types` |

## 왜
프론트 타입·데모 핸들러가 백엔드와 어긋나도 빌드에서 안 잡힌다.

## 손댈 곳
백엔드 OpenAPI → frontend/src/shared/api/schema.d.ts (openapi-typescript)

## 완료 기준
- [x] 생성 스크립트 + CI에서 최신 여부 확인
- [x] feature api 타입을 생성 타입으로 교체

## 진행 기록

- 백엔드 `scripts/export_openapi.py` → `frontend/src/shared/api/openapi.json` (정렬·고정 형식, `--check` 로 CI 확인)
- 프론트 `npm run gen:api` (openapi-typescript 7) → `src/shared/api/schema.d.ts`. openapi-typescript 가 TS 5만 peer로 선언해 `package.json` `overrides` 로 프로젝트 TS 6을 쓰게 함 (생성 결과 정상)
- `shared/api/types.ts` `Schema<'FriendCard'>` 도우미. 6개 feature api 의 손으로 쓴 인터페이스 → 생성 타입 별칭, 요청 본문은 `satisfies Schema<'…Request'>`
- 데모 가짜 서버 응답 빌더(userOut·card·roomOut·messageOut·out 등)에 반환 타입 지정 → 데모가 백엔드와 어긋나도 빌드에서 잡힘
- 백엔드 계약을 정확히: `AuthResult` 를 status 로 구분되는 `LoggedInResult | SignupRequiredResult` 로(가입 응답은 `LoggedInResult`), 활동 `category` Literal, 신고 응답 `ReportResult` 모델 추가
- 생성 타입이 실제 어긋남 1건을 잡음: `dev_code` 가 백엔드에서는 생략 가능, 프론트는 늘 온다고 가정 → 백엔드에서 필수(null 가능)로
- CI: backend `export_openapi --check`, frontend `gen:api` 후 `git diff --exit-code`
- `docs/dev-order.md` §3에 규칙 6과 계약 변경 순서 추가
