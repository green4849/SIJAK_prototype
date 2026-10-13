/**
 * 장면 일러스트 (A19) — 처음 시안의 인물·풍경 그림을 작게, 글자 없이.
 * 모두 장식이라 화면 낭독기에서는 건너뛴다 (aria-hidden). 조작 요소 안에는 넣지 않는다.
 */
import type { SeniorLook } from './look'
import { Heart, SeniorFigure } from './Senior'
import styles from './Scenes.module.css'

const GRANDMA: SeniorLook = { gender: 'F', hair: 0, glasses: false, cloth: 'pink' }
const GRANDPA: SeniorLook = { gender: 'M', hair: 0, glasses: true, cloth: 'green' }
const NEIGHBOR: SeniorLook = { gender: 'F', hair: 1, glasses: true, cloth: 'yellow' }

const at = (x: number, y: number, s: number) => `translate(${x} ${y}) scale(${s})`

function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={at(x, y, s)}>
      <rect x="-2" y="0" width="4" height="16" rx="2" fill="var(--illust-line)" opacity="0.55" />
      <circle cx="0" cy="-6" r="11" fill="var(--illust-tree)" />
      <circle cx="-6" cy="0" r="7" fill="var(--illust-tree)" />
      <circle cx="6" cy="0" r="7" fill="var(--illust-tree)" />
    </g>
  )
}

/** 홈 — 언덕 위에서 손 흔드는 이웃 셋 */
export function NeighborsScene() {
  return (
    <svg viewBox="0 0 360 132" preserveAspectRatio="xMidYMax slice" className={styles.banner} aria-hidden="true">
      <rect width="360" height="132" fill="var(--illust-sky)" />
      <circle cx="308" cy="34" r="15" fill="var(--illust-sun)" />
      <path d="M0 92 Q90 58 190 84 Q280 58 360 80 V132 H0Z" fill="var(--illust-hill-far)" />
      <Tree x={40} y={86} s={1.1} />
      <Tree x={324} y={84} s={0.9} />
      <g transform={at(92, 46, 1.25)}>
        <SeniorFigure look={NEIGHBOR} />
      </g>
      <g transform={at(140, 40, 1.35)}>
        <SeniorFigure look={GRANDMA} wave />
      </g>
      <g transform={at(196, 42, 1.3)}>
        <SeniorFigure look={GRANDPA} wave />
      </g>
      <Heart x={186} y={30} s={1.3} />
      <Heart x={250} y={22} s={0.9} />
      <path d="M0 116 Q120 98 220 112 Q300 102 360 110 V132 H0Z" fill="var(--illust-hill)" />
    </svg>
  )
}

/** 노부부 인사 — 안전 안내·포인트 부족·빈 화면 */
export function CoupleScene({ size = 'spot', hearts = true }: { size?: 'spot' | 'small'; hearts?: boolean }) {
  return (
    <svg viewBox="0 0 200 120" className={styles[size]} aria-hidden="true">
      <ellipse cx="100" cy="112" rx="92" ry="10" fill="var(--illust-hill)" />
      <g transform={at(30, 30, 1.25)}>
        <SeniorFigure look={GRANDMA} wave />
      </g>
      <g transform={at(92, 28, 1.3)}>
        <SeniorFigure look={GRANDPA} wave />
      </g>
      {hearts && (
        <>
          <Heart x={100} y={18} s={1.5} />
          <Heart x={40} y={22} s={0.9} />
          <Heart x={168} y={26} s={0.9} />
        </>
      )}
    </svg>
  )
}

/** 시작 화면 — 낮은 언덕 위 작은 노부부 (로고가 중심, 풍경은 받침) */
export function WelcomeHills() {
  return (
    <svg viewBox="0 0 360 150" preserveAspectRatio="xMidYMax slice" className={styles.hills} aria-hidden="true">
      <path d="M0 90 Q100 52 200 80 Q290 56 360 76 V150 H0Z" fill="var(--illust-hill-far)" />
      <Tree x={52} y={80} s={1} />
      <Tree x={312} y={74} s={1.15} />
      <g transform={at(134, 58, 0.95)}>
        <SeniorFigure look={GRANDMA} wave />
      </g>
      <g transform={at(178, 56, 1)}>
        <SeniorFigure look={GRANDPA} wave />
      </g>
      <Heart x={176} y={50} s={1} />
      <path d="M0 122 Q120 102 230 116 Q310 106 360 114 V150 H0Z" fill="var(--illust-hill)" />
    </svg>
  )
}
