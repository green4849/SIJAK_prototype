## 무엇을

<!-- 로드맵 ID가 있으면 적기 (예: A1 하단 탭 배지). 관련 이슈: #번호 -->

## 왜

## 화면 (UI 변경 시)

<!-- 휴대폰 크기 전/후 스크린샷. 큰 글씨·선명한 화면에서도 확인했다면 함께 -->

## 확인 (docs/dev-order.md DoD)

- [ ] 레이어 규칙을 지켰다 (router→service→repository / feature끼리 직접 import 없음)
- [ ] 백엔드: `uv run pytest` · `uv run ruff check .` · (모델 변경 시) 마이그레이션 추가 + `alembic check`
- [ ] 프론트: `npm run lint` · `npm run build` · `npm run e2e`
- [ ] API 계약을 바꿨다면 `frontend/src/demo/handlers` 도 같이 맞췄다
- [ ] 비워 둔 기능을 건드렸다면 `docs/deferred.md` 갱신
