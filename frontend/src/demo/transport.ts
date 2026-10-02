/** fetch 대신 쓰이는 브라우저 안 가짜 서버 — shared/api/client 의 Transport 형식 */
import type { Transport } from '@/shared/api/client'
import { activityRoutes } from './handlers/activity'
import { authRoutes } from './handlers/auth'
import { chatRoutes } from './handlers/chat'
import { friendRoutes } from './handlers/friend'
import { safetyRoutes } from './handlers/safety'
import { DemoError, errorResponse, json, match, noContent, type Route } from './http'
import { reset } from './store'

const PREFIX = '/api/v1'
const LATENCY_MS = 120 // 실제 서버처럼 살짝 늦게

const routes: Route[] = [
  ['GET', '/health', () => json({ status: 'ok' })],
  ['POST', '/demo/reset', () => {
    reset()
    return noContent()
  }],
  ...authRoutes,
  ...friendRoutes,
  ...chatRoutes,
  ...safetyRoutes,
  ...activityRoutes,
]

function parseBody(init: RequestInit): unknown {
  if (init.body instanceof FormData) return init.body
  if (typeof init.body === 'string') {
    try {
      return JSON.parse(init.body)
    } catch {
      return init.body
    }
  }
  return undefined
}

export const demoTransport: Transport = async (url, init) => {
  await new Promise((r) => setTimeout(r, LATENCY_MS))
  const u = new URL(url, 'http://demo.local')
  const path = u.pathname.startsWith(PREFIX) ? u.pathname.slice(PREFIX.length) : u.pathname
  const method = (init.method ?? 'GET').toUpperCase()
  const auth = new Headers(init.headers).get('Authorization')

  for (const [m, pattern, handler] of routes) {
    if (m !== method) continue
    const params = match(pattern, path)
    if (!params) continue
    try {
      return await handler({
        method,
        path,
        query: u.searchParams,
        params,
        body: parseBody(init),
        token: auth?.replace(/^Bearer\s+/, '') ?? null,
      })
    } catch (e) {
      if (e instanceof DemoError) return errorResponse(e)
      console.error('[demo]', e)
      return json({ error: { code: 'demo_error', message: '데모에서 처리하지 못했어요.' } }, 500)
    }
  }
  return json({ error: { code: 'not_found', message: `데모에 없는 API예요: ${method} ${path}` } }, 404)
}
