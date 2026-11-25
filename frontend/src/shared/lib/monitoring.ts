import type { ErrorEvent } from '@sentry/react'

export function safeErrorEvent(event: ErrorEvent): ErrorEvent {
  return {
    type: undefined,
    event_id: event.event_id,
    timestamp: event.timestamp,
    platform: event.platform,
    level: event.level,
    release: event.release,
    environment: event.environment,
    exception: {
      values: event.exception?.values?.map((exception) => ({
        type: /^[A-Za-z_][A-Za-z_0-9.]*$/.test(exception.type ?? '') ? exception.type : 'Error',
        value: '[redacted]',
        stacktrace: {
          frames: exception.stacktrace?.frames?.map((frame) => ({
            // URL 경로의 사용자 ID가 수집되지 않게 배포된 정적 파일 이름만 남긴다.
            filename: frame.filename?.match(/\/assets\/[A-Za-z0-9_.-]+\.js(?:$|\?)/)?.[0].replace(/\?$/, ''),
            lineno: frame.lineno,
            colno: frame.colno,
            in_app: frame.in_app,
          })),
        },
      })),
    },
  }
}

export async function initMonitoring() {
  if (!import.meta.env.VITE_SENTRY_DSN || import.meta.env.VITE_DEMO === '1') return
  const { init } = await import('@sentry/react')
  init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    release: import.meta.env.VITE_RELEASE,
    environment: import.meta.env.MODE,
    dataCollection: {
      userInfo: false, cookies: false, httpHeaders: false, httpBodies: [],
      urlQueryParams: false, stackFrameVariables: false, frameContextLines: 0,
      databaseQueryData: false, queues: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false }, mcp: { inputs: false, outputs: false },
    },
    defaultIntegrations: false,
    integrations: [],
    beforeSend: safeErrorEvent,
    tracesSampleRate: 0,
  })
  const { captureException } = await import('@sentry/react')
  window.addEventListener('error', (event) => captureException(event.error ?? new Error('WindowError')))
  window.addEventListener('unhandledrejection', (event) => captureException(event.reason))
}
