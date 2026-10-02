/**
 * 데모 모드 — 서버 없이 링크만으로 둘러보기 (GitHub Pages).
 *
 * 설계: shared/api/client 의 전송 함수만 브라우저 안 가짜 서버로 바꾼다.
 *       feature·page 코드는 데모인지 모른다 → 실서버 모드와 같은 코드가 그대로 동작.
 * 켜는 법: VITE_DEMO=1 로 빌드 (npm run build:demo). 일반 빌드에는 이 폴더가 포함되지 않는다.
 *
 * 화면에는 데모 표시를 두지 않는다 (실제 앱과 같은 모습). 대신 링크 파라미터:
 *   ?tour   시드 계정(김시작)으로 로그인한 상태로 시작 — 친구·대화·위험 경고·활동이 채워져 있음
 *   ?reset  이 탭의 데모 데이터를 처음 상태로
 *   (파라미터 없이) 실제 사용자처럼 시작 화면부터. 새 탭은 늘 새 상태(sessionStorage)
 */
import { api, setTransport } from '@/shared/api/client'
import { demoTransport } from './transport'

export async function installDemo() {
  setTransport(demoTransport)

  const url = new URL(window.location.href)
  const tour = url.searchParams.has('tour')
  const reset = url.searchParams.has('reset')
  if (!tour && !reset) return

  // 앱이 그려지기 전에 처리 → 앱은 평소처럼 세션 복원만 한다.
  // 둘러보기도 처음 상태에서 시작 → 링크를 받은 사람마다 같은 화면
  await api.post('/demo/reset', undefined, { skipAuthRetry: true }).catch(() => undefined)
  if (tour) await api.post('/demo/login', undefined, { skipAuthRetry: true }).catch(() => undefined)

  url.searchParams.delete('tour')
  url.searchParams.delete('reset')
  window.history.replaceState(null, '', url.pathname + url.search + url.hash)
}
