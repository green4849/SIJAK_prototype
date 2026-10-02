/**
 * 데모 모드 — 서버 없이 링크만으로 둘러보기 (GitHub Pages).
 *
 * 설계: shared/api/client 의 전송 함수만 브라우저 안 가짜 서버로 바꾼다.
 *       feature·page 코드는 데모인지 모른다 → 실서버 모드와 같은 코드가 그대로 동작.
 * 켜는 법: VITE_DEMO=1 로 빌드 (npm run build:demo). 일반 빌드에는 이 폴더가 포함되지 않는다.
 */
import { setTransport } from '@/shared/api/client'
import { demoTransport } from './transport'

export function installDemo() {
  setTransport(demoTransport)
}

export { DemoBanner } from './DemoBanner'
