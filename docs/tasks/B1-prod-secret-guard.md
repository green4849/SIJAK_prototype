# B1. 운영 환경 기본값 차단

| 영역 | 크기 | 우선 | 상태 | 브랜치 |
|---|---|---|---|---|
| 실서비스 필수 | S | P0 | ✅ 완료 | `prod/B1-prod-secret-guard` |

## 왜
ENV=prod 인데 기본 JWT 키·암호화 키·pepper여도 서버가 뜬다.

## 손댈 곳
backend/app/core/config.py

## 완료 기준
- [x] ENV=prod 이고 기본값이면 기동 실패 + 이유 출력
- [x] cookie_secure 자동 True
- [x] 단위 테스트

## 진행 기록

- `core/config.py` `Settings._guard_prod` (model_validator) — ENV=prod 일 때 문제를 **모두 모아 한 번에** 보여 주고 기동 거부:
  JWT_SECRET 기본값/32자 미만, DATA_ENCRYPTION_KEY 기본값/32바이트 base64 아님, PHONE_HASH_PEPPER 기본값/16자 미만, CORS_ORIGINS 에 https 아닌 주소, IDENTITY_PROVIDER=mock
- Mock 인증은 운영에서 기본 금지(누구나 가입 가능) — 실제 인증(B4) 전 시범 운영은 `ALLOW_MOCK_IDENTITY_IN_PROD=true` 로 명시적으로만
- prod 에서 `cookie_secure` 자동 True
- 단위 테스트 `tests/unit/test_config_guard.py` (10개): 로컬 기본값 허용, 안전한 prod 통과, 항목별 거부, 전체 목록 한 번에
- `.env.example` 에 prod 요구사항·새 설정 설명
