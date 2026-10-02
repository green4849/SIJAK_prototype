# 작업 목록

로드맵(`docs/roadmap.md`) 항목별 작업 파일. **GitHub 이슈 대신 이 폴더로 관리**한다.

- 시작할 때: 파일의 상태를 🔨 진행 중으로, 표의 브랜치 이름으로 브랜치 생성
- 끝날 때: 완료 기준 체크, 진행 기록에 커밋·결정 사항 한 줄씩, 상태 ✅, 아래 표 갱신
- 새로 발견한 일은 같은 형식으로 파일 추가 (예: 사용성 점검 결과 → A18~)

상태: ⬜ 대기 · 🔨 진행 중 · ✅ 완료 · ⏸ 보류

| ID | 항목 | 크기 | 우선 | 상태 |
|---|---|---|---|---|
| [A1](A1-unread-badges.md) | 하단 탭·홈 카드에 안 읽은 메시지·받은 친구 신청 배지 | S | P1 | ✅ |
| [A2](A2-chat-scroll.md) | 대화 스크롤 — 위로 읽는 중이면 끌어내리지 않기 + '새 메시지 ↓' | S | P1 | ✅ |
| [A3](A3-chat-history.md) | 지난 대화 더 보기 (100개 초과 이력) | M | P2 | ⬜ |
| [A4](A4-action-feedback.md) | 동작 후 피드백 — 토스트·진동 | S | P1 | ✅ |
| [A5](A5-voice-input.md) | 입력칸 옆 음성 입력(받아쓰기) 버튼 | M | P1 | ⬜ |
| [A6](A6-screen-reader-tts.md) | 화면 읽어 주기(TTS) 버튼 | M | P2 | ⬜ |
| [A7](A7-skeleton-offline.md) | 불러오는 중 스켈레톤, 연결 끊김 안내 | S | P2 | ⬜ |
| [A8](A8-search.md) | 검색 (시안 ④⑥ 돋보기) | M | P2 | ⬜ |
| [A9](A9-profile-photo.md) | 프로필 사진 (선택) | M | P2 | ⬜ |
| [A10](A10-online-status.md) | '지금 접속 중' 표시 (시안 ⑤) | S | P2 | ⬜ |
| [A11](A11-usability-test.md) | 실사용자 접근성 점검 | M | P1 | ⬜ |
| [A12](A12-type-spacing.md) | 글자 체계·여백 정리 (디자인 리뷰 1) | M | P1 | ✅ |
| [A13](A13-color-cards.md) | 색 역할·카드 표현 통일 (디자인 리뷰 2) | M | P1 | ✅ |
| [A14](A14-icons-images.md) | 아이콘·이미지 크기 규칙 (디자인 리뷰 3) | S | P1 | ✅ |
| [A15](A15-screen-layout.md) | 화면별 세부 배치 (디자인 리뷰 4) | M | P1 | ✅ |
| [A16](A16-remove-demo-banner.md) | 데모 안내 띠 제거 → 링크로 둘러보기 | S | P1 | ✅ |
| [A17](A17-responsive.md) | 기기 크기에 맞는 화면 (휴대폰·태블릿·PC) | M | P1 | ✅ |
| [B1](B1-prod-secret-guard.md) | 운영 환경 기본값 차단 | S | P0 | ✅ |
| [B2](B2-rate-limit.md) | 요청 횟수 제한 | M | P0 | ⬜ |
| [B3](B3-account-deletion-retention.md) | 회원 탈퇴·30일 후 완전 삭제, 음성 90일 보관 | M | P0 | ⬜ |
| [B4](B4-real-identity.md) | 실제 본인인증 연동 | L | P0 | ⬜ |
| [B5](B5-location-legal.md) | 위치정보 법적 요건 | M | P0 | ⬜ |
| [B6](B6-terms-consent.md) | 약관·개인정보처리방침 + 가입 동의 | S | P0 | ⬜ |
| [B7](B7-moderation-console.md) | 신고 처리 운영 화면 | L | P0 | ⬜ |
| [B8](B8-query-performance.md) | N+1 쿼리 정리 | M | P1 | ⬜ |
| [B9](B9-external-session.md) | 인증 세션 외부 저장 (Redis) | S | P1 | ⬜ |
| [B10](B10-deployment.md) | 배포 구성 | M | P0 | ⬜ |
| [B11](B11-error-tracking.md) | 오류 수집·로그 | S | P1 | ⬜ |
| [B12](B12-backup-keys.md) | 백업·키 관리 | M | P1 | ⬜ |
| [C1](C1-realtime-chat.md) | 실시간 대화 (WebSocket) | M | P1 | ⬜ |
| [C2](C2-stt-tts.md) | STT/TTS 연동 | L | P1 | ⬜ |
| [C3](C3-nearby-radius.md) | 같은 동네 반경 검색 | S | P1 | ⬜ |
| [C4](C4-push-notifications.md) | 푸시 알림 | M | P1 | ⬜ |
| [C5](C5-pwa.md) | PWA — 홈 화면에 추가 | S | P1 | ✅ |
| [C6](C6-risk-ml.md) | 위험 탐지 2·3단계 | L | P2 | ⬜ |
| [C7](C7-public-data.md) | 공공데이터 복지시설·프로그램 연동 | M | P2 | ⬜ |
| [C8](C8-ai-companion.md) | AI 말동무 | L | P2 | ⬜ |
| [C9](C9-voice-call.md) | 음성 통화 (시안 ⑤ 📞) | L | P2 | ⬜ |
| [C10](C10-sos-guardian.md) | 긴급 도움(SOS)·보호자 연결 | M | P2 | ⬜ |
| [C11](C11-wellbeing.md) | 고립 지수·자가평가 | M | P2 | ⬜ |
| [D3](D3-openapi-types.md) | API 타입 자동 생성 | M | P1 | ✅ |
| [D4](D4-unit-tests.md) | 프론트 단위·컴포넌트 테스트 | M | P2 | ⬜ |
| [D5](D5-visual-regression.md) | 시각 회귀 테스트 | S | P2 | ⬜ |

D1(e2e 저장소·CI), D2(브랜치·PR 흐름)는 완료 — `docs/roadmap.md` D 참고.
