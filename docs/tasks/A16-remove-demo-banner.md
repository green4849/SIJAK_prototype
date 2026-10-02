# A16. 데모 안내 띠 제거 → 링크로 둘러보기

| 영역 | 크기 | 우선 | 상태 | 브랜치 |
|---|---|---|---|---|
| 폴리싱 | S | P1 | ✅ 완료 | `polish/A16-remove-demo-banner` |

## 왜
모든 화면 맨 위의 '데모 화면이에요 · 안내 펼치기' 띠가 실제 앱 화면을 가리고, 사용성 점검(A11) 때 어르신에게 불필요한 요소다.

## 손댈 곳
`frontend/src/demo` (띠 삭제, 링크 파라미터), `main.tsx`, e2e helpers, README

## 완료 기준
- [x] 데모 화면에 안내 띠가 전혀 없음
- [x] `?tour` 링크로 김시작 계정 둘러보기, `?reset` 링크로 처음 상태 — 주소창에서 파라미터는 지움
- [x] 그냥 링크는 실제 사용자처럼 시작 화면부터 (새 탭 = 새 상태)
- [x] README에 두 링크 안내

## 진행 기록

- `DemoBanner` 삭제 — 펼친 안내·접힌 띠 모두. 데모에서도 실제 앱과 같은 화면
- `demo/index.ts` `installDemo()` 가 앱을 그리기 전에 링크 파라미터 처리: `?tour` = 처음 상태 + 김시작 로그인(링크를 받은 사람마다 같은 화면), `?reset` = 처음 상태. 처리 후 `history.replaceState` 로 주소창에서 지움 → 새로고침해도 다시 초기화되지 않음
- 가짜 서버의 `/demo/login`·`/demo/reset` 은 그대로 사용 (UI만 없어짐)
- e2e `startTour` 를 `/?tour` 로, `demo-links.spec.ts` 추가(띠 없음·파라미터 지움·reset 후 처음 상태)
- README 바로 보기에 세 링크 표
