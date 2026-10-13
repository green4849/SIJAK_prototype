import { InterestScene } from '@/shared/ui/illustrations/InterestScenes'
import type { PhotoChoice } from '@/shared/ui/PhotoChoiceGrid'

/**
 * 관심사(INTERESTS 코드) → 둥근 칸에 들어갈 그림 (A24).
 *
 * 처음엔 Unsplash 사진을 CDN으로 불러왔지만, 시연 환경에 따라 사진이 안 뜨고
 * 서양인 위주 사진이 섞여 있어 A19 그림체(갈색 선 + 연한 면, 웃는 어르신)로 직접 그린 장면으로 바꿨다.
 * 앱 안에 들어 있어 인터넷 상태와 상관없이 늘 보인다. 그림은 shared/ui/illustrations/InterestScenes.tsx
 */
export function toInterestChoices(list: { code: string; label: string }[]): PhotoChoice[] {
  return list.map(({ code, label }) => ({ value: code, label, art: <InterestScene code={code} /> }))
}
