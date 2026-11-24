/**
 * 좋아하는 활동 일러스트 (A24) — 가입 '좋아하는 것'·성향조사 Q1 둥근 칸에 들어가는 장면 10개.
 * A19 그림체 그대로: 갈색 선 + 연한 면, 웃는 어르신(SeniorFigure)이 그 활동을 하고 있는 모습.
 * 100×100 좌표, 둥글게 잘려도 핵심이 가운데 지름 80 안에 오도록 그렸다.
 * 모두 장식이라 화면 낭독기에서는 건너뛴다 (이름은 버튼 글자로 읽힌다).
 */
import type { ReactNode } from 'react'
import type { Cloth, SeniorLook } from './look'
import { Heart, SeniorFigure } from './Senior'

const LINE = 'var(--illust-line)'
const SKIN = 'var(--illust-skin)'
const line = { stroke: LINE, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const thin = { ...line, strokeWidth: 1.3 }

const at = (x: number, y: number, s = 1) => `translate(${x} ${y}) scale(${s})`

// 인물 — 장면마다 다른 사람처럼 보이게 머리·안경·옷을 바꿔 쓴다
const P = (gender: 'M' | 'F', hair: number, glasses: boolean, cloth: Cloth): SeniorLook => ({ gender, hair, glasses, cloth })

/** 둥근 칸 하나 — 바탕색 + 장면 */
function Frame({ bg, children }: { bg: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true" focusable="false">
      <rect width="100" height="100" fill={bg} />
      {children}
    </svg>
  )
}

/** 상반신 인물 — 얼굴 가운데가 (cx, cy) 쯤, s 배 */
function Person({ look, x = 18, y = 36, s = 1 }: { look: SeniorLook; x?: number; y?: number; s?: number }) {
  return (
    <g transform={at(x, y, s)}>
      <SeniorFigure look={look} />
    </g>
  )
}

/** 팔 — 갈색 테두리가 있는 옷 색 띠. 손은 끝에 피부색 동그라미 */
function Arm({ d, cloth, hand }: { d: string; cloth: Cloth; hand?: [number, number] }) {
  return (
    <g>
      <path d={d} fill="none" stroke={LINE} strokeWidth="8.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={`var(--illust-cloth-${cloth})`} strokeWidth="5.6" strokeLinecap="round" strokeLinejoin="round" />
      {hand && <circle cx={hand[0]} cy={hand[1]} r="3.8" fill={SKIN} {...line} />}
    </g>
  )
}

function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={at(x, y, s)}>
      <rect x="-1.6" y="0" width="3.2" height="12" rx="1.6" fill={LINE} opacity="0.55" />
      <circle cx="0" cy="-5" r="8.5" fill="var(--illust-tree)" />
      <circle cx="-5" cy="0" r="5.5" fill="var(--illust-tree)" />
      <circle cx="5" cy="0" r="5.5" fill="var(--illust-tree)" />
    </g>
  )
}

function Note({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={at(x, y, s)} fill={LINE}>
      <ellipse cx="0" cy="8" rx="3.2" ry="2.4" transform="rotate(-20 0 8)" />
      <path d="M2.6 7.2 V-4 Q6 -3 8 0" fill="none" stroke={LINE} strokeWidth="1.6" strokeLinecap="round" />
    </g>
  )
}

/* ---------------- 10개 장면 (2026-11-24 성향조사 Q1 목록) ---------------- */

/** 산책·등산 — 산을 배경으로 지팡이 든 할아버지 */
function Walking() {
  const look = P('M', 0, false, 'green')
  return (
    <Frame bg="var(--illust-sky)">
      <circle cx="78" cy="22" r="8" fill="var(--illust-sun)" />
      <path d="M-4 66 L24 30 L40 50 L56 26 L104 70 V100 H-4Z" fill="var(--illust-hill-far)" {...thin} />
      <path d="M50 33 L56 26 L62 32 Q58 30 56 33 Q53 31 50 33Z" fill="#fff" />
      <path d="M-4 80 Q30 66 60 74 Q84 68 104 74 V100 H-4Z" fill="var(--illust-hill)" />
      <Tree x={14} y={74} s={0.9} />
      <Person look={look} x={26} y={44} s={0.9} />
      {/* 등산 스틱 */}
      <path d="M77 62 L85 100" {...line} strokeWidth="2.2" fill="none" />
      <Arm d="M68 98 Q74 92 79 86" cloth="green" hand={[80, 84]} />
    </Frame>
  )
}

/** 요리·맛집 탐방 — 김 나는 뚝배기를 든 할머니 */
function Cooking() {
  const look = P('F', 1, true, 'yellow')
  return (
    <Frame bg="var(--color-card-yellow)">
      <Person look={look} x={18} y={18} />
      {/* 김 — 턱 아래에서 짧게 */}
      <g fill="none" {...line} stroke="#fff" strokeWidth="2.2">
        <path d="M38 70 q-2 -3 0 -6" />
        <path d="M62 70 q-2 -3 0 -6" />
      </g>
      {/* 뚝배기 */}
      <path d="M28 70 H72 Q71 92 50 93 Q29 92 28 70Z" fill="#8a5a3c" {...line} />
      <ellipse cx="50" cy="70" rx="22" ry="5" fill="#e8743b" {...line} />
      <circle cx="44" cy="69.5" r="2" fill="var(--illust-tree)" />
      <circle cx="54" cy="70.5" r="2.2" fill="#fff" />
      <path d="M24 74 h4 M72 74 h4" {...line} strokeWidth="3" />
      <circle cx="23" cy="76" r="3.8" fill={SKIN} {...line} />
      <circle cx="77" cy="76" r="3.8" fill={SKIN} {...line} />
    </Frame>
  )
}

/** 원예·식물 가꾸기 — 밀짚모자 할머니와 새싹·꽃 */
function Gardening() {
  const look = P('F', 2, false, 'green')
  return (
    <Frame bg="var(--color-card-mint)">
      <Person look={look} x={14} y={26} />
      {/* 밀짚모자 */}
      <ellipse cx="46" cy="44" rx="23" ry="5.5" fill="var(--illust-cloth-yellow)" {...line} />
      <path d="M33 44 Q33 30 46 30 Q59 30 59 44Z" fill="var(--illust-cloth-yellow)" {...line} />
      <path d="M33.5 41 Q46 44 58.5 41" fill="none" stroke="var(--illust-heart)" strokeWidth="2.6" />
      {/* 흙두둑과 새싹·꽃 */}
      <path d="M-4 86 Q50 74 104 86 V100 H-4Z" fill="#b98a5e" {...line} />
      <g {...line} fill="none" stroke="var(--illust-tree)" strokeWidth="2.2">
        <path d="M66 84 V72" />
        <path d="M80 86 V70" />
      </g>
      <path d="M66 76 q-6 -1 -7 -6 q6 0 7 6Z M66 74 q6 -1 7 -6 q-6 0 -7 6Z" fill="var(--illust-tree)" {...thin} />
      <g transform="translate(80 66)">
        {[0, 72, 144, 216, 288].map((r) => (
          <ellipse key={r} cx="0" cy="-4.4" rx="2.8" ry="4" fill="var(--illust-cloth-pink)" transform={`rotate(${r})`} {...thin} />
        ))}
        <circle r="2.6" fill="var(--illust-sun)" {...thin} />
      </g>
    </Frame>
  )
}

/** 여행 — 챙 넓은 모자를 쓰고 호수·산을 바라보는 할머니 */
function Travel() {
  const look = P('F', 1, false, 'sky')
  return (
    <Frame bg="var(--illust-sky)">
      <path d="M-4 62 L20 40 L34 52 L52 34 L76 54 L90 44 L104 54 V70 H-4Z" fill="var(--illust-hill-far)" {...thin} />
      <rect x="-4" y="62" width="108" height="40" fill="var(--color-card-sky)" />
      <path d="M8 72 h12 M60 78 h16 M30 84 h10" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <Person look={look} x={18} y={38} />
      {/* 모자 */}
      <ellipse cx="50" cy="55" rx="24" ry="5" fill="var(--illust-cloth-yellow)" {...line} />
      <path d="M37 55 Q37 41 50 41 Q63 41 63 55Z" fill="var(--illust-cloth-yellow)" {...line} />
      <path d="M37.5 52 Q50 55 62.5 52" fill="none" stroke="var(--illust-cloth-sky)" strokeWidth="2.6" />
      {/* 가방끈 */}
      <path d="M36 84 L42 100 M64 84 L58 100" {...line} stroke="#8a5a3c" strokeWidth="3" />
    </Frame>
  )
}

/** 운동·건강관리 — 머리띠 하고 아령 드는 할아버지 */
function Health() {
  const look = P('M', 1, false, 'green')
  return (
    <Frame bg="var(--color-card-mint)">
      <Person look={look} x={18} y={34} />
      {/* 머리띠 */}
      <path d="M38.5 55 Q50 51 61.5 55" fill="none" stroke="var(--illust-heart)" strokeWidth="3.2" strokeLinecap="round" />
      {/* 들어 올린 팔 + 아령 */}
      <Arm d="M24 86 Q14 74 18 58" cloth="green" hand={[18, 55]} />
      <Arm d="M76 86 Q86 74 82 58" cloth="green" hand={[82, 55]} />
      {[18, 82].map((x) => (
        <g key={x}>
          <rect x={x - 9} y="49.5" width="18" height="3" rx="1.5" fill={LINE} />
          <rect x={x - 12} y="45" width="5" height="12" rx="1.6" fill="var(--illust-cloth-sky)" {...thin} />
          <rect x={x + 7} y="45" width="5" height="12" rx="1.6" fill="var(--illust-cloth-sky)" {...thin} />
        </g>
      ))}
      <path d="M44 22 l3 -6 M50 20 v-7 M56 22 l-3 -6" {...line} fill="none" stroke="var(--illust-sun)" strokeWidth="2.2" />
    </Frame>
  )
}

/** 독서·문화생활 — 안경 쓰고 책 읽는 할아버지 */
function Reading() {
  const look = P('M', 0, true, 'sky')
  return (
    <Frame bg="var(--color-card-sky)">
      <Person look={look} x={18} y={22} />
      {/* 펼친 책 */}
      <path d="M50 74 Q38 68 22 70 V94 Q38 92 50 98Z" fill="#fff" {...line} />
      <path d="M50 74 Q62 68 78 70 V94 Q62 92 50 98Z" fill="#fff" {...line} />
      <path d="M50 74 V98" {...line} />
      <g stroke="var(--illust-hair-shade)" strokeWidth="1.4" strokeLinecap="round">
        <path d="M27 77 h17 M27 82 h17 M27 87 h13" />
        <path d="M56 77 h17 M56 82 h17 M56 87 h13" />
      </g>
      <path d="M71 70 V84 l3 -3 l3 3 V70.4" fill="var(--illust-heart)" {...thin} />
      <circle cx="20" cy="84" r="3.8" fill={SKIN} {...line} />
      <circle cx="80" cy="84" r="3.8" fill={SKIN} {...line} />
    </Frame>
  )
}

/** 영화·공연 — 큰 화면 앞에서 팝콘을 든 할머니, 음표 */
function Movies() {
  const look = P('F', 0, true, 'pink')
  return (
    <Frame bg="var(--color-card-pink)">
      {/* 막 걷힌 무대 화면 */}
      <rect x="40" y="10" width="56" height="40" rx="3" fill="var(--illust-sky)" {...line} />
      <path d="M40 10 Q48 22 44 50 H40Z M96 10 Q88 22 92 50 H96Z" fill="var(--illust-heart)" {...thin} />
      <path d="M50 44 Q60 34 68 40 Q76 30 86 38 V48 H50Z" fill="var(--illust-hill)" />
      <Note x={60} y={18} s={0.8} />
      <Note x={76} y={22} s={0.65} />
      <Person look={look} x={-6} y={38} />
      {/* 팝콘 */}
      <path d="M44 80 L48 100 H62 L66 80Z" fill="#fff" {...line} />
      <path d="M48.5 80 L51 100 M55 80 V100 M61.5 80 L59 100" stroke="var(--illust-heart)" strokeWidth="2" />
      <g fill="var(--illust-cloth-yellow)" {...thin}>
        <circle cx="48" cy="78" r="3.6" />
        <circle cx="55" cy="76" r="4" />
        <circle cx="62" cy="78" r="3.6" />
      </g>
      <Arm d="M34 100 Q38 92 44 88" cloth="pink" hand={[45, 87]} />
    </Frame>
  )
}

/** 경제·재테크 — 돼지 저금통에 동전을 넣는 할아버지 */
function Finance() {
  const look = P('M', 0, true, 'sky')
  return (
    <Frame bg="var(--color-card-yellow)">
      <Person look={look} x={-6} y={22} />
      {/* 돼지 저금통 */}
      <g transform={at(70, 80)}>
        <ellipse cx="0" cy="0" rx="20" ry="14" fill="var(--illust-cloth-pink)" {...line} />
        <path d="M-8 -12 l-3 -7 l8 4" fill="var(--illust-cloth-pink)" {...thin} />
        <ellipse cx="19" cy="-1" rx="4" ry="5" fill="var(--illust-blush)" {...thin} />
        <circle cx="10" cy="-5" r="1.3" fill={LINE} />
        <path d="M-4 -13 h8" stroke={LINE} strokeWidth="2" strokeLinecap="round" />
        <path d="M-12 12 v5 M10 12 v5" stroke={LINE} strokeWidth="3" strokeLinecap="round" />
      </g>
      {/* 동전 */}
      <g fill="var(--illust-sun)" {...thin}>
        <ellipse cx="70" cy="56" rx="5" ry="5" />
        <ellipse cx="84" cy="40" rx="4" ry="4" />
      </g>
      <path d="M68.5 56 h3 M82.8 40 h2.4" stroke={LINE} strokeWidth="1.2" strokeLinecap="round" />
      <Arm d="M38 100 Q44 80 60 64" cloth="sky" hand={[62, 62]} />
    </Frame>
  )
}

/** 봉사활동 — 조끼를 입고 하트 상자를 든 할머니 */
function Volunteer() {
  const look = P('F', 1, false, 'green')
  return (
    <Frame bg="var(--color-card-mint)">
      <Person look={look} x={18} y={18} />
      {/* 봉사 조끼 줄 */}
      <path d="M36 96 L40 78 M64 96 L60 78" stroke="var(--illust-cloth-yellow)" strokeWidth="4" strokeLinecap="round" />
      {/* 나눔 상자 */}
      <rect x="30" y="74" width="40" height="24" rx="2" fill="#d9b38c" {...line} />
      <path d="M30 80 H70" {...thin} />
      <Heart x={50} y={88} s={1.4} />
      <circle cx="28" cy="80" r="3.8" fill={SKIN} {...line} />
      <circle cx="72" cy="80" r="3.8" fill={SKIN} {...line} />
      <Heart x={84} y={26} s={1} />
      <Heart x={14} y={34} s={0.8} />
    </Frame>
  )
}

/** 낚시 — 물가에서 낚싯대를 드리운 할아버지, 찌와 물고기 */
function Fishing() {
  const look = P('M', 1, false, 'green')
  return (
    <Frame bg="var(--color-card-sky)">
      <Person look={look} x={-4} y={18} />
      {/* 낚싯대와 줄 */}
      <path d="M50 78 L88 22" stroke={LINE} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M88 22 V72" fill="none" {...thin} />
      <Arm d="M38 86 Q44 82 50 78" cloth="green" hand={[51, 77]} />
      {/* 물 */}
      <path d="M0 80 Q12 75 25 80 T50 80 T75 80 T100 80 V100 H0Z" fill="var(--illust-cloth-sky)" {...line} />
      <path d="M10 90 q5 -3 10 0 M44 93 q5 -3 10 0" fill="none" {...thin} opacity="0.55" />
      {/* 찌 */}
      <ellipse cx="88" cy="75" rx="3" ry="4.6" fill="var(--illust-heart)" {...thin} />
      {/* 물고기 */}
      <g transform={at(56, 91)}>
        <path d="M-9 0 Q-2 -6.5 7 0 Q-2 6.5 -9 0Z" fill="var(--illust-cloth-yellow)" {...thin} />
        <path d="M6.5 0 l6 -4.5 v9Z" fill="var(--illust-cloth-yellow)" {...thin} />
        <circle cx="-4.6" cy="-1" r="0.9" fill={LINE} />
      </g>
    </Frame>
  )
}

const SCENES: Record<string, () => ReactNode> = {
  walking: Walking,
  movies: Movies,
  cooking: Cooking,
  fishing: Fishing,
  reading: Reading,
  finance: Finance,
  travel: Travel,
  health: Health,
  gardening: Gardening,
  volunteer: Volunteer,
}

/** 관심사 코드에 맞는 장면 — 모르는 코드면 아무것도 그리지 않는다 (칸의 연한 바탕만 보임) */
export function InterestScene({ code }: { code: string }) {
  const Scene = SCENES[code]
  return Scene ? <Scene /> : null
}
