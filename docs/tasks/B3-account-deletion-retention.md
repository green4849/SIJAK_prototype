# B3. 회원 탈퇴·30일 후 완전 삭제, 음성 90일 보관

| 영역 | 크기 | 우선 | 상태 | 브랜치 |
|---|---|---|---|---|
| 실서비스 필수 | M | P0 | 🔨 탈퇴 ✅ / 정리 작업 대기 | `feat/B3-B7-notifications-leave-admin` → `feat/B3-withdraw` |

## 왜
보고서 4.6.3 개인정보 정책.

## 손댈 곳
auth `DELETE /me`, 정리 작업(cron), 마이페이지 '탈퇴'

## 완료 기준
- [x] 탈퇴 즉시 로그인·노출 중지(status=deleted) — `POST /me/withdraw`
- [ ] 30일 후 개인정보 완전 삭제
- [ ] 90일 지난 음성 파일 삭제
- [x] 통합 테스트 `tests/integration/test_withdraw_flow.py`

## 진행 기록

- 2026-11-23 백엔드: 본문 있는 DELETE 대신 데모와 같은 `POST /me/withdraw`. 탈퇴 = status deleted + 모든 refresh 토큰 폐기 + 응답에서 refresh 쿠키 삭제. 완전 삭제일은 `users.delete_after`(한국 날짜 +30일)에 기록만 — 지우는 예약 작업은 아직. 30일 안에 다시 인증하면 다시 가입할 수 있는 날을 안내(같은 CI·전화번호가 남아 있어 새로 가입할 수 없음). 탈퇴한 분은 친구·받은 신청 목록에서도 바로 빠짐

## 이번에 한 것 — 화면·시연 데이터 (백엔드 없음, docs/deferred.md §7)
- 마이페이지 맨 아래 '회원 탈퇴' → `/me/leave`: 지워지는 것 세 줄 → 이유(선택) → '탈퇴하기' → 확인 창 → 로그아웃, 「○월 ○일에 모두 지워져요」
- 데모 API `POST /me/withdraw` (본문 있는 DELETE 대신 POST — 백엔드에서 정할 것)
- [ ] 백엔드: 상태 deleted + 30일 뒤 삭제 작업, 90일 지난 음성 삭제 작업
