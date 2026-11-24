import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

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

export default defineConfig({
  // GitHub Pages: https://<계정>.github.io/<저장소명>/ → VITE_BASE=/<저장소명>/ 로 빌드
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), swBuildInfo()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // 개발 중 /api 요청은 백엔드로 프록시 → 프론트 코드에 백엔드 주소 하드코딩 금지
    proxy: { '/api': 'http://localhost:8000' },
  },
})
