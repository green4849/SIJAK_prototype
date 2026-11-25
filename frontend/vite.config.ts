import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

/**
 * 공유 미리보기 그림·주소 (H35). 카카오톡 등은 og:image 가 절대 주소여야 그림을 띄우므로,
 * 사이트 주소(VITE_SITE_URL, 예: https://계정.github.io/저장소/)를 알 때만 절대 주소로 넣는다.
 */
function ogAbsolute(): Plugin {
  return {
    name: 'sijak-og-absolute',
    transformIndexHtml(html, ctx) {
      const site = process.env.VITE_SITE_URL?.replace(/\/?$/, '/')
      const base = ctx.server ? '/' : (process.env.VITE_BASE ?? '/')
      const image = `${site ?? base}icons/og-image.png`
      const tags = [`<meta property="og:image" content="${image}" />`, '<meta property="og:image:width" content="1200" />', '<meta property="og:image:height" content="630" />']
      if (site) tags.push(`<meta property="og:url" content="${site}" />`)
      return html.replace('<meta name="twitter:card"', `${tags.join('\n    ')}\n    <meta name="twitter:card"`)
    },
  }
}

/** 미리 저장하지 않는 큰 파일 — 3D 시작이는 쓸 때 받는다 (H33) */
const NOT_PRECACHED = /sijagi3d|\.glb$/

/**
 * 서비스 워커(public/sw.js)에 이번 빌드의 버전과 미리 저장할 JS·CSS 목록을 넣는다 (H34).
 *  - 버전 = 목록의 해시 → 코드가 바뀐 배포마다 sw.js 내용이 달라져 새 워커가 설치된다
 *  - 목록이 있어야 아직 열어 보지 않은 화면 조각도 오프라인에서 열린다
 */
function swBuildInfo(): Plugin {
  let outDir = 'dist'
  let files: string[] = []
  return {
    name: 'sijak-sw-build-info',
    apply: 'build',
    configResolved(c) {
      outDir = resolve(c.root, c.build.outDir)
    },
    generateBundle(_, bundle) {
      files = Object.keys(bundle)
        .filter((f) => /\.(js|css)$/.test(f) && !NOT_PRECACHED.test(f))
        .sort()
    },
    closeBundle() {
      const sw = resolve(outDir, 'sw.js')
      const version = createHash('sha256').update(files.join('\n')).digest('hex').slice(0, 12)
      const code = readFileSync(sw, 'utf8')
        .replace("'__SW_VERSION__'", JSON.stringify(version))
        .replace('/*__SW_PRECACHE__*/ []', JSON.stringify(files))
      if (code.includes('__SW_')) throw new Error('sw.js 자리표시를 채우지 못했어요')
      writeFileSync(sw, code)
    },
  }
}

/**
 * 쓰지 않는 코드는 첫 화면 묶음에서 빼기 (H33 이어서).
 * 화면은 각 기능의 index.ts 로만 불러오는데(레이어 규칙), 홈이 받은 신청 개수 하나만 쓰려 해도
 * 그 기능의 화면 조각(가입 양식·대화방·성향조사 …)이 통째로 첫 묶음에 들어왔다 — 조각마다 CSS를
 * 불러와 '불러오기만 해도 하는 일이 있다'고 여겨져서. 그래서 하는 일이 정말 있는 파일만 적고,
 * 나머지는 쓰는 것만 남기게 한다. 불러오기만 해도 일을 하는 파일을 새로 만들면 여기에 더한다.
 */
const SIDE_EFFECT_FILES = [
  /\.css($|\?)/, // 스타일은 불러오는 것 자체가 일
  /\/src\/main\.tsx$/,
  /\/src\/features\/auth\/api\/session\.ts$/, // configureAuth(...) — API 클라이언트에 토큰 갱신을 꽂는다
  /\/src\/shared\/lib\/pwa\.ts$/, // beforeinstallprompt·appinstalled 듣기
  /\/src\/demo\//, // 시연 서버 — 시연 빌드에서만, 들어갈 때 받는다
]

export default defineConfig({
  // GitHub Pages: https://<계정>.github.io/<저장소명>/ → VITE_BASE=/<저장소명>/ 로 빌드
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), swBuildInfo(), ogAbsolute()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    rollupOptions: {
      treeshake: {
        // 우리 소스만 판단하고, 라이브러리는 각 패키지가 밝힌 대로 둔다
        moduleSideEffects: (id, external) =>
          external || id.includes('/node_modules/') || !id.includes('/src/')
            ? true
            : SIDE_EFFECT_FILES.some((re) => re.test(id)),
      },
    },
  },
  server: {
    // 개발 중 /api 요청은 백엔드로 프록시 → 프론트 코드에 백엔드 주소 하드코딩 금지
    proxy: { '/api': 'http://localhost:8000' },
  },
})
