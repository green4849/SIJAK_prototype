/**
 * 백엔드 API 계약 타입 — 직접 쓰지 않고 백엔드 OpenAPI에서 생성한다 (D3).
 *
 *   백엔드 스키마 변경 → `uv run python -m scripts.export_openapi` (backend)
 *                      → `npm run gen:api` (frontend) → schema.d.ts 갱신
 *   CI가 두 파일이 최신인지 확인하므로, 갱신을 잊으면 병합 전에 실패한다.
 *
 * feature 의 api 파일은 여기서 이름을 붙여 다시 내보낸다:
 *   export type FriendCardData = Schema<'FriendCard'>
 */
import type { components } from './schema'

export type Schemas = components['schemas']
export type Schema<K extends keyof Schemas> = Schemas[K]
