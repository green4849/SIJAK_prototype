/**
 * 조사 도우미는 앱 전체가 함께 쓴다 — shared/lib/josa.ts.
 * 상대 경로인 까닭: 이 폴더는 e2e/guide-engine.spec.ts 가 '@' 별칭 없이 바로 불러 시험한다.
 */
export { eul, iga } from '../../../shared/lib/josa'
