/**
 * 장면 일러스트 (A19) — 처음 시안의 인물·풍경 그림을 작게, 글자 없이.
 * 모두 장식이라 화면 낭독기에서는 건너뛴다 (aria-hidden). 조작 요소 안에는 넣지 않는다.
 */
import type { ReactNode } from 'react'
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

/**
 * 가로 띠 장면 틀 — 화면이 넓어져도 인물이 잘리지 않게 층을 나눈다.
 *  - 하늘·언덕(back, front)은 가로로 늘어나 띠를 가득 채우고
 *  - 인물·나무 등(children, over)은 비율을 지킨 채 아래 가운데에 놓인다.
 * (예전처럼 통째로 slice 하면 넓은 화면에서 확대되며 머리가 잘렸다)
 */
function BannerFrame({ back, front, children, over }: {
  back: ReactNode
  front: ReactNode
  children: ReactNode
  over?: ReactNode
}) {
  const box = '0 0 360 132'
  return (
    <svg className={styles.banner} aria-hidden="true">
      <svg viewBox={box} preserveAspectRatio="none" width="100%" height="100%">{back}</svg>
      <svg viewBox={box} preserveAspectRatio="xMidYMax meet" width="100%" height="100%">{children}</svg>
      <svg viewBox={box} preserveAspectRatio="none" width="100%" height="100%">{front}</svg>
      {over && <svg viewBox={box} preserveAspectRatio="xMidYMax meet" width="100%" height="100%">{over}</svg>}
    </svg>
  )
}

/** 홈 — 언덕 위에서 손 흔드는 이웃 셋 */
export function NeighborsScene() {
  return (
    <BannerFrame
      back={<>
        <rect width="360" height="132" fill="var(--illust-sky)" />
        <path d="M0 92 Q90 58 190 84 Q280 58 360 80 V132 H0Z" fill="var(--illust-hill-far)" />
      </>}
      front={<path d="M0 116 Q120 98 220 112 Q300 102 360 110 V132 H0Z" fill="var(--illust-hill)" />}
    >
      <circle cx="308" cy="34" r="15" fill="var(--illust-sun)" />
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
    </BannerFrame>
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

// ---------- 봉사·포인트·알림 (A19 2차) ----------

const LINE = 'var(--illust-line)'
const stroke = { stroke: LINE, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

const VOLUNTEER: SeniorLook = { gender: 'M', hair: 1, glasses: false, cloth: 'sky' }
const SAVER: SeniorLook = { gender: 'F', hair: 2, glasses: true, cloth: 'yellow' }

/** 손 (피부색 동그라미) */
function Hand({ x, y, r = 3.6 }: { x: number; y: number; r?: number }) {
  return <circle cx={x} cy={y} r={r} fill="var(--illust-skin)" {...stroke} />
}

/** 소매 + 손 — 어깨 (x1,y1) 에서 손 (x2,y2) 까지 (옷 색 굵은 선에 갈색 테두리) */
function Arm({ x1, y1, x2, y2, cloth }: { x1: number; y1: number; x2: number; y2: number; cloth: string }) {
  const d = `M${x1} ${y1} L${x2} ${y2}`
  return (
    <g strokeLinecap="round" fill="none">
      <path d={d} stroke={LINE} strokeWidth={8.4} />
      <path d={d} stroke={`var(--illust-cloth-${cloth})`} strokeWidth={5.6} />
      <Hand x={x2} y={y2} />
    </g>
  )
}

/** 보자기로 싼 도시락 — 가운데 (x, y) */
function Bundle({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={at(x, y, s)} {...stroke}>
      <rect x="-15" y="-10" width="30" height="21" rx="5" fill="var(--illust-cloth-pink)" />
      <path d="M-4 -10 Q-9 -19 -2 -17 Q0 -13 0 -10 Q0 -13 2 -17 Q9 -19 4 -10Z" fill="var(--illust-cloth-pink)" />
      <path d="M-15 0 H15" fill="none" opacity="0.5" />
    </g>
  )
}

/** 쓰레기 줍는 집게 — 손 (x1,y1) → 끝 (x2,y2) */
function Grabber({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <g {...stroke}>
      <path d={`M${x1} ${y1} L${x2} ${y2}`} fill="none" strokeWidth={2.4} />
      <path d={`M${x2} ${y2} l4 3 M${x2} ${y2} l-1 5`} fill="none" />
    </g>
  )
}

function Litter({ x, y }: { x: number; y: number }) {
  return <rect x={x - 3} y={y - 5} width="6" height="9" rx="1.5" fill="var(--illust-cloth-sky)" {...stroke} />
}

function TrashBag({ x, y }: { x: number; y: number }) {
  return (
    <g transform={at(x, y, 1)} {...stroke}>
      <path d="M-11 12 Q-14 -4 -5 -8 L-3 -12 L3 -12 L5 -8 Q14 -4 11 12Z" fill="var(--illust-cloth-green)" />
    </g>
  )
}

function Coin({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={at(x, y, r / 10)} {...stroke}>
      <circle r="10" fill="var(--illust-sun)" />
      <circle r="7" fill="none" opacity="0.6" />
      <path d="M-2 4 V-4 H1.5 A2.3 2.3 0 0 1 1.5 0.6 H-2" fill="none" />
    </g>
  )
}

function Sparkle({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <path transform={at(x, y, s)} d="M0 -5 L1.2 -1.2 L5 0 L1.2 1.2 L0 5 L-1.2 1.2 L-5 0 L-1.2 -1.2Z" fill="var(--illust-sun)" />
  )
}

/** 봉사 탭 위 — 공원에서 쓰레기 줍기와 도시락 나눔 */
export function VolunteerBanner() {
  return (
    <BannerFrame
      back={<>
        <rect width="360" height="132" fill="var(--illust-sky)" />
        <path d="M0 90 Q100 60 190 82 Q280 58 360 78 V132 H0Z" fill="var(--illust-hill-far)" />
      </>}
      front={<path d="M0 114 Q120 100 220 110 Q300 102 360 108 V132 H0Z" fill="var(--illust-hill)" />}
      over={<>
        <TrashBag x={52} y={110} />
        <Grabber x1={126} y1={98} x2={142} y2={121} />
        <Arm x1={108} y1={108} x2={126} y2={98} cloth="sky" />
        <Litter x={148} y={121} />
        <Bundle x={236} y={106} s={1.15} />
        <Hand x={218} y={102} />
        <Hand x={254} y={102} />
      </>}
    >
      <Tree x={26} y={84} s={1} />
      <Tree x={336} y={82} s={1.05} />
      <g transform={at(56, 44, 1.25)}>
        <SeniorFigure look={VOLUNTEER} />
      </g>
      <g transform={at(170, 42, 1.25)}>
        <SeniorFigure look={GRANDMA} />
      </g>
      <g transform={at(226, 42, 1.25)}>
        <SeniorFigure look={GRANDPA} />
      </g>
      <Heart x={236} y={30} s={1.2} />
    </BannerFrame>
  )
}

/** 봉사 상세 — 도시락 나눔 (보자기 도시락을 함께 든 노부부) */
export function MealScene() {
  return (
    <svg viewBox="0 0 200 120" className={styles.fill} aria-hidden="true">
      <ellipse cx="100" cy="114" rx="88" ry="8" fill="var(--illust-hill)" />
      <g transform={at(28, 30, 1.25)}>
        <SeniorFigure look={GRANDMA} />
      </g>
      <g transform={at(92, 28, 1.3)}>
        <SeniorFigure look={GRANDPA} />
      </g>
      <Bundle x={101} y={98} s={1.2} />
      <Hand x={82} y={96} />
      <Hand x={120} y={96} />
      <Heart x={101} y={16} s={1.4} />
      <Heart x={50} y={22} s={0.9} />
    </svg>
  )
}

/** 봉사 상세 — 걷기 + 쓰레기 줍기 */
export function CleanupScene() {
  return (
    <svg viewBox="0 0 200 120" className={styles.fill} aria-hidden="true">
      <ellipse cx="100" cy="114" rx="88" ry="8" fill="var(--illust-hill)" />
      <Tree x={182} y={78} s={1.05} />
      <TrashBag x={40} y={100} />
      <g transform={at(54, 28, 1.3)}>
        <SeniorFigure look={VOLUNTEER} />
      </g>
      <Grabber x1={138} y1={90} x2={156} y2={113} />
      <Arm x1={114} y1={100} x2={138} y2={90} cloth="sky" />
      <Litter x={162} y={113} />
      <Sparkle x={140} y={30} />
      <Sparkle x={34} y={40} s={0.8} />
    </svg>
  )
}

/** 내 포인트 — 동전을 든 할머니 (잔액 카드 옆) */
export function PointsScene() {
  return (
    <svg viewBox="0 0 120 100" className={styles.side} aria-hidden="true">
      <g transform={at(4, 18, 1.25)}>
        <SeniorFigure look={SAVER} />
      </g>
      <Coin x={94} y={64} r={17} />
      <Arm x1={62} y1={86} x2={80} y2={74} cloth="yellow" />
      <Sparkle x={104} y={30} />
      <Sparkle x={84} y={20} s={0.7} />
    </svg>
  )
}

/** 알림 설정 — 휴대폰을 보는 할아버지, 종, 밤에는 쉬는 달 */
export function NotifyScene() {
  return (
    <svg viewBox="0 0 200 120" className={styles.spot} aria-hidden="true">
      <ellipse cx="100" cy="114" rx="88" ry="8" fill="var(--illust-hill)" />
      <g transform={at(30, 30, 1.3)}>
        <SeniorFigure look={GRANDPA} />
      </g>
      {/* 휴대폰 */}
      <g {...stroke}>
        <rect x="100" y="70" width="20" height="32" rx="4" fill="var(--illust-cloth-sky)" />
        <rect x="103.5" y="74" width="13" height="21" rx="2" fill="var(--illust-sky)" />
      </g>
      <Arm x1={88} y1={108} x2={104} y2={98} cloth="green" />
      {/* 종 */}
      <g transform={at(128, 46, 1)} {...stroke}>
        <path d="M-9 6 Q-9 -10 0 -10 Q9 -10 9 6 L11 9 H-11Z" fill="var(--illust-sun)" />
        <circle cx="0" cy="11.5" r="2.4" fill="var(--illust-sun)" />
        <path d="M-15 -8 q-3 5 0 10 M15 -8 q3 5 0 10" fill="none" />
      </g>
      {/* 달 · 별 */}
      <path d="M176 18 A12 12 0 1 0 186 36 A9 9 0 1 1 176 18Z" fill="var(--illust-sun)" {...stroke} />
      <Sparkle x={160} y={52} s={0.8} />
      <Sparkle x={190} y={58} s={0.6} />
    </svg>
  )
}
