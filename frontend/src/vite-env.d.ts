/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** '1'이면 데모 모드 (서버 없이 src/demo 가짜 서버) */
  readonly VITE_DEMO?: string
}
