# 앱 아이콘 원본

`npm run icons` 로 `public/icons/*.png` 를 다시 만든다 (Playwright Chromium으로 SVG를 그려 저장).

| 파일 | 용도 |
|---|---|
| `leaf.svg` | 새싹 모양(공통). 아래 두 종류가 이 모양을 크기만 달리해 쓴다 |
| 생성: `icon-192.png`, `icon-512.png` | 일반 아이콘 (둥근 모서리, purpose `any`) |
| 생성: `maskable-512.png` | 안드로이드가 원·물방울 등으로 잘라 쓰는 아이콘 — 가운데 60%에만 그림 |
| 생성: `apple-touch-icon.png` (180) | iOS 홈 화면 — 투명 없이 꽉 찬 사각, 모서리는 iOS가 둥글게 |
