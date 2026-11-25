import type { ConsentKind } from '@/shared/legal/documents'
import type { ConsentDoc } from '../api/authApi'

/** 동의 화면의 체크 상태 — 종류별 켬/끔 */
export type ConsentValue = Partial<Record<ConsentKind, boolean>>

/** 필수 문서에 모두 동의했는지 */
export function requiredAgreed(docs: ConsentDoc[], value: ConsentValue) {
  return docs.every((d) => !d.required || value[d.kind])
}
