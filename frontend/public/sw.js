/*
 * 서비스 워커 — 오프라인에서도 첫 화면이 뜨게 하는 최소 구성.
 *  - 화면 이동(HTML): 네트워크 우선 → 끊기면 저장해 둔 앱 화면
 *  - 빌드 파일(assets/, 해시 이름이라 내용이 안 바뀜)·아이콘·폰트: 저장본 우선
 *  - /api/ 요청: 절대 저장하지 않음 (개인 대화·정보)
 * 저장 방식을 바꿀 때만 VERSION 을 올린다 (예전 저장소는 activate 에서 지움).
 */
const VERSION = 'v1'
const CACHE = `sijak-${VERSION}`
const SCOPE = new URL(self.registration.scope)
const SHELL = new URL('./', SCOPE).href

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll([SHELL, new URL('manifest.webmanifest', SCOPE).href]))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('sijak-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== SCOPE.origin || url.pathname.includes('/api/')) return

  if (req.mode === 'navigate') {
    // 어느 주소로 들어와도 같은 앱 화면(SPA) — 최신 화면을 받아 저장본도 갱신
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(SHELL, copy))
          }
          return res
        })
        .catch(() => caches.match(SHELL).then((r) => r ?? Response.error())),
    )
    return
  }

  if (/\/(assets|icons)\//.test(url.pathname) || url.pathname.endsWith('.webmanifest')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ??
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(CACHE).then((c) => c.put(req, copy))
            }
            return res
          }),
      ),
    )
  }
})
