/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_RELEASE?: string
  /** '1'이면 데모 모드 (서버 없이 src/demo 가짜 서버) */
  readonly VITE_DEMO?: string
}
