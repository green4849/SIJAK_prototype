// GitHub Pages 용: 화면 주소마다 index.html 사본을 둔다 — 직접 연 링크·새로 고침이 HTTP 200 으로 열리게 (H35)
// GitHub Pages 는 /welcome 을 welcome.html 로 돌려준다. 하위 화면이 있는 주소(me → me/points)는
// 디렉터리가 함께 생기므로 me/index.html 도 둔다. 주소에 값이 들어가는 화면(/chats/:id 등)은 미리 알 수 없어
// 404.html(같은 앱)로 열린다 — 화면은 뜨지만 상태 코드는 404.
// 실행: node scripts/pages-spa.mjs dist   (화면 목록은 src/app/App.tsx 의 path="..." 에서 읽는다)
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const dist = process.argv[2] ?? 'dist'
const index = join(dist, 'index.html')
if (!existsSync(index)) throw new Error(`${index} 가 없어요 — 먼저 빌드하세요`)

const app = readFileSync(new URL('../src/app/App.tsx', import.meta.url), 'utf8')
const paths = [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]).filter((p) => !p.includes(':') && p !== '*')
if (paths.length < 10) throw new Error(`화면 주소를 ${paths.length}개만 찾았어요 — App.tsx 형식이 바뀌었나요?`)

const copy = (to) => {
  mkdirSync(dirname(to), { recursive: true })
  copyFileSync(index, to)
}
const prefixes = new Set(paths.flatMap((p) => p.split('/').slice(0, -1).map((_, i, a) => a.slice(0, i + 1).join('/'))))
for (const p of paths) {
  copy(join(dist, `${p}.html`))
  if (prefixes.has(p)) copy(join(dist, p, 'index.html'))
}
copy(join(dist, '404.html'))
console.log(`✓ 화면 주소 ${paths.length}개 + 404.html`)
