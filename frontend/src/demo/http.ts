/** 데모 서버의 아주 작은 라우터·응답 도우미 (백엔드 오류 형식과 같게) */

export interface DemoRequest {
  method: string
  path: string // /api/v1 뺀 경로
  query: URLSearchParams
  params: Record<string, string>
  body: unknown
  token: string | null
}

export type Handler = (req: DemoRequest) => Response | Promise<Response>
export type Route = [method: string, pattern: string, handler: Handler]

export class DemoError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export const fail = (status: number, code: string, message: string): never => {
  throw new DemoError(status, code, message)
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

export const noContent = () => new Response(null, { status: 204 })

export const errorResponse = (e: DemoError) =>
  json({ error: { code: e.code, message: e.message } }, e.status)

export function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/')
  const a = path.split('/')
  if (p.length !== a.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(a[i])
    else if (p[i] !== a[i]) return null
  }
  return params
}
