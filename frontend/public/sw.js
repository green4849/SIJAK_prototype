/*
 * 서비스 워커 — 오프라인에서도 앱이 뜨게 하는 최소 구성.
 *  - 화면 이동(HTML): 네트워크 우선 → 끊기면 저장해 둔 앱 화면
 *  - 빌드 파일(assets/, 해시 이름이라 내용이 안 바뀜)·아이콘·폰트: 저장본 우선
 *  - /api/ 요청: 절대 저장하지 않음 (개인 대화·정보)
 *
 * 버전과 미리 저장할 파일 목록은 빌드가 채운다 (vite.config.ts 의 swBuildInfo, H34).
 *  - 배포마다 이 파일 내용이 바뀌어 브라우저가 새 워커를 받는다
 *  - 새 워커는 설치만 하고 기다린다 → 화면이 "새 버전이 있어요 [새로 고침]"을 보이고,
 *    누르면 SKIP_WAITING 으로 교체 (쓰던 글이 사라지지 않게 스스로 바꾸지 않는다)
 *  - 교체되면 옛 저장소를 지운다 → 옛 빌드 파일이 쌓이지 않는다
 * 개발 서버에서는 등록하지 않으므로 아래 자리표시는 그대로 남는다.
 */
const VERSION = '__SW_VERSION__'
const PRECACHE = /*__SW_PRECACHE__*/ []
const CACHE = `sijak-${VERSION}`
const SCOPE = new URL(self.registration.scope)
const SHELL = new URL('./', SCOPE).href
// 해시 이름 파일은 내용이 바뀌지 않으므로 Vary(예: Origin)를 보지 않고 주소로만 찾는다.
// 미리 저장할 때(요청에 Origin 없음)와 화면이 모듈로 부를 때(Origin 있음)가 달라 못 찾는 일을 막는다
const BY_URL = { ignoreVary: true }

/** 예전 저장소에 같은 파일(해시 이름)이 있으면 다시 받지 않고 옮겨 담는다 */
async function precache() {
  const cache = await caches.open(CACHE)
  await cache.addAll([SHELL, new URL('manifest.webmanifest', SCOPE).href])
  await Promise.all(
    PRECACHE.map(async (path) => {
      const url = new URL(path, SCOPE).href
      const old = await caches.match(url, BY_URL)
      await (old ? cache.put(url, old) : cache.add(url))
    }),
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache())
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
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
      caches.match(req, BY_URL).then(
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
