/**
 * 시니어 인물 일러스트 (A19) — 처음 시안의 따뜻한 그림체(갈색 선 + 연한 면)를 자체 제작 벡터로.
 * 머리·어깨까지 64×64 좌표. 아바타와 장면 일러스트가 같은 인물을 쓴다 (디자인 리뷰 공통 15·16).
 * 색은 tokens.css 의 --illust-* 만 사용한다.
 */

import type { SeniorLook } from './look'

const LINE = 'var(--illust-line)'
const SKIN = 'var(--illust-skin)'
const HAIR = 'var(--illust-hair)'
const SW = 1.6 // 선 굵기 (64 좌표 기준)

const line = { stroke: LINE, strokeWidth: SW, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

/** 얼굴 뒤에 그리는 머리 (뒷머리·옆머리) */
function HairBack({ gender, hair }: SeniorLook) {
  if (gender === 'F' && hair === 0)
    return (
      <g fill={HAIR} {...line}>
        {[
          [20, 25, 6],
          [23, 17, 6.5],
          [31, 13, 7],
          [40, 16, 6.5],
          [44, 24, 6],
          [18.5, 32, 4.5],
          [45.5, 32, 4.5],
        ].map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
        ))}
      </g>
    )
  if (gender === 'F' && hair === 1)
    return (
      <g fill={HAIR} {...line}>
        <circle cx="32" cy="9.5" r="6.5" />
        <ellipse cx="32" cy="25" rx="15" ry="13" />
      </g>
    )
  if (gender === 'F')
    return <path d="M17 35 Q15 14 32 13 Q49 14 47 35 Q44 38 42 35 L22 35 Q20 38 17 35Z" fill={HAIR} {...line} />
  return null
}

/** 얼굴 위에 그리는 머리 (앞머리·윗머리) */
function HairFront({ gender, hair }: SeniorLook) {
  if (gender === 'F' && hair === 0)
    return (
      <g fill={HAIR} {...line}>
        <circle cx="25.5" cy="18" r="5" />
        <circle cx="32.5" cy="15.5" r="5.5" />
        <circle cx="39.5" cy="18.5" r="5" />
      </g>
    )
  if (gender === 'F')
    return <path d="M19.5 27 Q21 15 32 15 Q43 15 44.5 27 Q40 20 32 20 Q24 20 19.5 27Z" fill={HAIR} {...line} />
  // 남성 (또는 성별을 모를 때)
  if (hair === 1)
    return (
      <g fill={HAIR} {...line}>
        <path d="M19 31 Q17 21 24 18.5 Q21.5 24 22.5 31Z" />
        <path d="M45 31 Q47 21 40 18.5 Q42.5 24 41.5 31Z" />
      </g>
    )
  if (hair === 2)
    return <path d="M19 27 Q18.5 12.5 32 12.5 Q45.5 12.5 45 27 Q43 19.5 36.5 18.5 Q30 21.5 24 19.5 Q20.5 21.5 19 27Z" fill={HAIR} {...line} />
  return <path d="M19.5 25.5 Q20.5 13.5 32 13.5 Q43.5 13.5 44.5 25.5 Q41 18.5 32 19 Q23 18.5 19.5 25.5Z" fill={HAIR} {...line} />
}

interface FigureProps {
  look: SeniorLook
  /** 오른손을 들어 인사 (장면용) */
  wave?: boolean
}

/** 머리·어깨 인물 하나 — <svg viewBox="0 0 64 64"> 또는 장면 안 <g transform> 에 넣는다 */
export function SeniorFigure({ look, wave = false }: FigureProps) {
  const cloth = `var(--illust-cloth-${look.cloth})`
  return (
    <g>
      {wave && (
        <g {...line}>
          <path d="M47 52 Q55 47 56 37" fill="none" stroke={cloth} strokeWidth="6" />
          <path d="M47 52 Q55 47 56 37" fill="none" />
          <circle cx="56.5" cy="34" r="3.6" fill={SKIN} />
        </g>
      )}
      {/* 어깨·옷 */}
      <path d="M8 66 Q10 47.5 32 46.5 Q54 47.5 56 66Z" fill={cloth} {...line} />
      {look.gender === 'F' ? (
        <path d="M26 47 Q32 52.5 38 47" fill="none" {...line} />
      ) : (
        <path d="M28 47 L32 52.5 L36 47" fill="none" {...line} />
      )}
      {/* 목 */}
      <path d="M28 40 V47 Q32 49 36 47 V40" fill={SKIN} {...line} />
      <HairBack {...look} />
      {/* 귀 */}
      <ellipse cx="19.8" cy="31" rx="2.4" ry="3.4" fill={SKIN} {...line} />
      <ellipse cx="44.2" cy="31" rx="2.4" ry="3.4" fill={SKIN} {...line} />
      {/* 얼굴 */}
      <ellipse cx="32" cy="30" rx="12.5" ry="13.5" fill={SKIN} {...line} />
      <HairFront {...look} />
      {/* 웃는 눈 · 볼 · 입 */}
      <g fill="none" {...line}>
        <path d="M24.8 30.5 q2.4 -2.6 4.8 0" />
        <path d="M34.4 30.5 q2.4 -2.6 4.8 0" />
        <path d="M28.6 37 q3.4 2.8 6.8 0" />
      </g>
      <circle cx="24.2" cy="34.6" r="2.4" fill="var(--illust-blush)" opacity="0.75" />
      <circle cx="39.8" cy="34.6" r="2.4" fill="var(--illust-blush)" opacity="0.75" />
      {look.glasses && (
        <g fill="none" {...line} strokeWidth={1.3}>
          <circle cx="27.2" cy="30" r="4.3" />
          <circle cx="36.8" cy="30" r="4.3" />
          <path d="M31.5 30 h1" />
        </g>
      )}
    </g>
  )
}

/** 작은 하트 (장면 장식) — 중심 (x, y), 크기 s */
export function Heart({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 3 C-6 -2 -4 -7 0 -4 C4 -7 6 -2 0 3Z"
      fill="var(--illust-heart)"
    />
  )
}
