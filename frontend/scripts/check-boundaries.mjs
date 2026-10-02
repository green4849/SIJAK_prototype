// 프론트 레이어 규칙 검사 (docs/dev-order.md §3)
//  1. shared  → features / pages / app import 금지
//  2. features/A → features/B import 금지
//  3. features → pages / app import 금지
//  4. features 밖에서는 각 feature의 index.ts로만 접근
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const SRC = new URL('../src', import.meta.url).pathname
// from 절 / side-effect import('x') / dynamic import('x') 모두 포착
const IMPORT_RE =
  /(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(?\s*['"]([^'"]+)['"]/g

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return walk(p)
    return /\.(ts|tsx)$/.test(name) ? [p] : []
  })
}

// '@/features/auth/...' 또는 상대경로 → src 기준 세그먼트
function targetSegments(fromFile, spec) {
  if (spec.startsWith('@/')) return spec.slice(2).split('/')
  if (spec.startsWith('.')) {
    const abs = join(fromFile, '..', spec)
    return relative(SRC, abs).split(sep)
  }
  return null // 외부 패키지
}

const violations = []
for (const file of walk(SRC)) {
  const [layer, feature] = relative(SRC, file).split(sep)
  const code = readFileSync(file, 'utf8')
  for (const m of code.matchAll(IMPORT_RE)) {
    const spec = m[1] ?? m[2]
    const seg = targetSegments(file, spec)
    if (!seg) continue
    const [tLayer, tFeature] = seg
    const where = `${relative(SRC, file)} → ${spec}`
    if (layer === 'shared' && ['features', 'pages', 'app'].includes(tLayer))
      violations.push(`[shared→${tLayer}] ${where}`)
    if (layer === 'features' && tLayer === 'features' && tFeature !== feature)
      violations.push(`[feature 간 참조] ${where}`)
    if (layer === 'features' && ['pages', 'app'].includes(tLayer))
      violations.push(`[feature→${tLayer}] ${where}`)
    // feature 밖에서는 공개 API(index.ts)로만 접근: '@/features/auth' 는 OK, '@/features/auth/api/x' 는 위반
    if (layer !== 'features' && tLayer === 'features' && seg.length > 2)
      violations.push(`[feature 내부 직접 접근 — index.ts 사용] ${where}`)
  }
}

if (violations.length) {
  console.error('레이어 규칙 위반 (docs/dev-order.md §3):\n  ' + violations.join('\n  '))
  process.exit(1)
}
console.log('boundaries ok')
