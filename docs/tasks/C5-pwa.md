# C5. PWA — 홈 화면에 추가

| 영역 | 크기 | 우선 | 상태 | 브랜치 |
|---|---|---|---|---|
| 기능 확장 | S | P1 | ✅ 완료 | `feat/C5-pwa` |

## 왜
어르신은 주소 입력보다 아이콘이 쉽다. 이후 Capacitor로 스토어 배포.

## 손댈 곳
public/manifest.webmanifest, service worker

## 완료 기준
- [x] 홈 화면 아이콘·이름·스플래시
- [x] 오프라인 첫 화면
- [x] ~~Lighthouse PWA 통과~~ → Chrome 설치 가능 판정(`Page.getInstallabilityErrors`) 오류 없음 (Lighthouse 12부터 PWA 항목이 없어짐)

## 진행 기록

- `public/manifest.webmanifest`: 이름 '시작', standalone, 크림 배경(스플래시)·테마색, 아이콘 192/512 + maskable 512. 경로는 모두 상대(`./`)라 GitHub Pages 하위 경로에서도 동작
- 아이콘: 원본 `frontend/icons/leaf.svg` → `npm run icons`(scripts/gen-icons.mjs, Chromium으로 렌더)로 `public/icons/*.png` 생성. iOS용 apple-touch-icon 180 포함
- `public/sw.js` (직접 작성, 플러그인 없음): 화면 이동은 네트워크 우선 → 끊기면 저장해 둔 앱 화면, `assets/`·`icons/`는 저장본 우선, **`/api/`는 절대 저장 안 함**. 저장 방식 바꿀 때만 VERSION 올림
- 등록: `shared/lib/pwa.ts` `registerServiceWorker()` — 운영·데모 빌드에서만 (개발 서버 제외). 데모는 가짜 서버가 브라우저 안에 있어 오프라인에서도 전부 동작
- 설치 제안: `beforeinstallprompt`를 붙잡아 두었다가 안내 화면 버튼으로만 띄움 (`useInstallState`, `promptInstall`)
- 화면: 마이페이지 › '홈 화면에 아이콘 놓기'(`/me/install`, 설치되면 메뉴 숨김) — 버튼 한 번 설치가 되면 버튼, 아니면 아이폰/안드로이드별 3단계 안내. 도움말에 '매번 주소를 치기 어려워요' 추가
- 인터넷 끊김 안내: `app/OfflineBanner` (`shared/lib/useOnline`), 화면 맨 위 고정, 다시 연결되면 사라짐
- e2e: 다른 테스트는 서비스 워커 차단(저장본 섞임 방지), `pwa.spec.ts`만 허용 — manifest·아이콘 응답, 설치 가능 판정(시크릿 창 오류 'in-incognito'만 제외), 오프라인 새로고침 후 화면·끊김 안내, 아이폰 안내. a11y 순회에 `/me/install` 추가
- 확인: GitHub Pages 하위 경로(`/SIJAK_prototype/`)로 빌드해 서비스 워커 scope·오프라인 첫 화면 수동 확인
- 남은 것(별도 작업): Capacitor 스토어 배포, 푸시 알림(C-영역)은 이 작업 범위 밖
