import type { ReactNode } from 'react'

/**
 * 줄바꿈 다듬기 — ‘친구 신청’ 뒤의 조사('을', '이에요')가 다음 줄로 혼자 떨어지지 않게
 * 따옴표 안 마지막 낱말과 조사를 한 덩어리로 묶는다. 글자는 그대로다 (낭독·복사에 영향 없음).
 */
export function tidy(text: string): ReactNode[] {
  return text.split(/(\S*’[가-힣]+)/g).map((part, i) =>
    i % 2 ? (
      <span key={i} style={{ whiteSpace: 'nowrap' }}>
        {part}
      </span>
    ) : (
      part
    ),
  )
}
