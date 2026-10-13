/**
 * 좋아하는 활동 일러스트 (A24) — 가입 '좋아하는 것' 둥근 칸에 들어가는 장면 12개.
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

/* ---------------- 12개 장면 ---------------- */

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

/** 노래·음악 — 마이크 들고 노래하는 할머니, 음표 */
function Music() {
  const look = P('F', 0, false, 'pink')
  return (
    <Frame bg="var(--color-card-pink)">
      <Note x={14} y={20} s={1.1} />
      <Note x={76} y={14} s={0.9} />
      <Note x={84} y={40} s={0.75} />
      <Person look={look} x={16} y={34} />
      {/* 마이크 — 입 앞 아래쪽, 얼굴을 가리지 않게 */}
      <g transform="rotate(-35 64 84)">
        <rect x="61.5" y="82" width="5" height="17" rx="2.5" fill={LINE} />
        <circle cx="64" cy="79" r="5.4" fill="var(--illust-hair-shade)" {...line} />
      </g>
      <Arm d="M80 100 Q78 94 72 90" cloth="pink" hand={[70, 89]} />
    </Frame>
  )
}

/** 요리 — 김 나는 뚝배기를 든 할머니 */
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

/** 텃밭·꽃 가꾸기 — 밀짚모자 할머니와 새싹·꽃 */
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

/** 바둑·장기 — 바둑판 앞에서 돌을 놓는 할아버지 */
function Baduk() {
  const look = P('M', 2, true, 'sky')
  const grid = [0, 1, 2, 3, 4]
  return (
    <Frame bg="var(--color-card-beige)">
      <Person look={look} x={18} y={14} s={0.95} />
      {/* 바둑판 (앞으로 기울어진 사다리꼴) */}
      <path d="M22 66 H78 L90 96 H10Z" fill="#e2b56f" {...line} />
      <path d="M10 96 H90 V100 H10Z" fill="#b98a4a" {...line} />
      <g stroke={LINE} strokeWidth="0.9" opacity="0.7">
        {grid.map((i) => {
          const t = (i + 0.5) / 5
          return <path key={`h${i}`} d={`M${22 - 12 * t} ${66 + 30 * t} H${78 + 12 * t}`} />
        })}
        {grid.map((i) => {
          const x = 27 + i * 11.5
          return <path key={`v${i}`} d={`M${x} 66 L${50 + (x - 50) * 1.42} 96`} />
        })}
      </g>
      <circle cx="38" cy="78" r="3.6" fill="#2b2b2b" />
      <circle cx="60" cy="72" r="3.2" fill="#fff" {...thin} />
      <circle cx="50" cy="86" r="4" fill="#fff" {...thin} />
      <circle cx="68" cy="88" r="4" fill="#2b2b2b" />
      {/* 돌을 집은 손 */}
      <Arm d="M70 64 Q66 66 62 76" cloth="sky" hand={[62, 78]} />
      <circle cx="62" cy="82" r="3" fill="#2b2b2b" />
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

/** 건강·운동 — 머리띠 하고 아령 드는 할아버지 */
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

/** TV·드라마 — 리모컨 든 할머니와 TV */
function Tv() {
  const look = P('F', 0, true, 'yellow')
  return (
    <Frame bg="var(--color-card-sky)">
      {/* TV */}
      <g>
        <path d="M58 70 l-5 8 M70 70 l5 8" {...line} />
        <rect x="46" y="38" width="38" height="32" rx="5" fill="#5a4632" {...line} />
        <rect x="50" y="42" width="30" height="24" rx="3" fill="var(--illust-sky)" />
        <path d="M50 60 Q60 54 66 58 Q72 52 80 56 V66 H50Z" fill="var(--illust-hill)" />
        <Heart x={65} y={50} s={1.1} />
      </g>
      <Person look={look} x={-4} y={40} />
      {/* 리모컨 */}
      <Arm d="M36 100 Q40 88 44 84" cloth="yellow" hand={[46, 82]} />
      <rect x="44" y="74" width="5" height="11" rx="2" fill="#3d3d3d" transform="rotate(20 46 80)" />
    </Frame>
  )
}

/** 책·신문 — 안경 쓰고 책 읽는 할아버지 */
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

/** 뜨개질·만들기 — 털실과 바늘을 든 할머니 */
function Crafts() {
  const look = P('F', 2, true, 'pink')
  return (
    <Frame bg="var(--color-card-pink)">
      <Person look={look} x={18} y={24} />
      {/* 뜨던 목도리 */}
      <path d="M30 74 H66 V88 H30Z" fill="var(--illust-cloth-green)" {...line} />
      <g fill="none" stroke={LINE} strokeWidth="0.9" opacity="0.55">
        <path d="M34 78 l3 3 l3 -3 l3 3 l3 -3 l3 3 l3 -3 l3 3 l3 -3 l3 3" />
        <path d="M34 84 l3 3 l3 -3 l3 3 l3 -3 l3 3 l3 -3 l3 3 l3 -3 l3 3" />
      </g>
      {/* 바늘 */}
      <path d="M26 66 L44 80 M70 66 L52 80" {...line} stroke="#8a5a3c" strokeWidth="2.2" />
      <circle cx="26" cy="66" r="2" fill="#8a5a3c" />
      <circle cx="70" cy="66" r="2" fill="#8a5a3c" />
      <circle cx="28" cy="72" r="3.8" fill={SKIN} {...line} />
      <circle cx="68" cy="72" r="3.8" fill={SKIN} {...line} />
      {/* 털실 뭉치 */}
      <circle cx="80" cy="88" r="11" fill="var(--illust-cloth-yellow)" {...line} />
      <g fill="none" stroke={LINE} strokeWidth="1" opacity="0.6">
        <path d="M71 84 Q80 80 89 86" />
        <path d="M70 90 Q80 86 90 92" />
        <path d="M76 78 Q72 88 78 98" />
      </g>
      <path d="M69 88 Q60 92 66 88" fill="none" stroke="var(--illust-cloth-yellow)" strokeWidth="1.6" />
    </Frame>
  )
}

/** 종교 활동 — 두 손 모은 할머니와 은은한 빛 (특정 종교 상징 없이) */
function Faith() {
  const look = P('F', 1, false, 'yellow')
  return (
    <Frame bg="var(--color-card-yellow)">
      <circle cx="50" cy="52" r="34" fill="#fff" opacity="0.55" />
      <circle cx="50" cy="52" r="24" fill="#fff" opacity="0.5" />
      <g stroke="var(--illust-sun)" strokeWidth="2.4" strokeLinecap="round">
        <path d="M50 8 v7 M20 20 l5 5 M80 20 l-5 5 M8 48 h7 M85 48 h7" />
      </g>
      <Person look={look} x={18} y={30} />
      {/* 모은 두 손 */}
      <Arm d="M28 100 Q30 88 44 84" cloth="yellow" />
      <Arm d="M72 100 Q70 88 56 84" cloth="yellow" />
      <path d="M50 72 Q44 76 45 86 Q48 90 50 89 Q52 90 55 86 Q56 76 50 72Z" fill={SKIN} {...line} />
      <path d="M50 74 V88" {...thin} />
    </Frame>
  )
}

/** 옛날 이야기 — 오래된 흑백 사진을 들고 이야기하는 할아버지 */
function Memories() {
  const look = P('M', 1, true, 'yellow')
  return (
    <Frame bg="var(--color-card-beige)">
      <Person look={look} x={-2} y={24} />
      {/* 사진 액자 */}
      <g transform="rotate(8 70 66)">
        <rect x="52" y="46" width="36" height="40" rx="2" fill="#fff" {...line} />
        <rect x="56" y="50" width="28" height="26" fill="#d8cdb8" />
        {/* 사진 속 두 사람 (세피아) */}
        <g fill="#a08a6c">
          <circle cx="64" cy="60" r="4" />
          <path d="M57 76 Q58 66 64 66 Q70 66 71 76Z" />
          <circle cx="76" cy="61" r="3.6" />
          <path d="M70 76 Q71 67 76 67 Q81 67 82 76Z" />
        </g>
      </g>
      <Arm d="M40 100 Q44 88 52 82" cloth="yellow" hand={[54, 80]} />
      <Heart x={84} y={30} s={1.1} />
      <Heart x={92} y={20} s={0.7} />
    </Frame>
  )
}

const SCENES: Record<string, () => ReactNode> = {
  walking: Walking,
  music: Music,
  cooking: Cooking,
  gardening: Gardening,
  baduk: Baduk,
  travel: Travel,
  health: Health,
  tv: Tv,
  reading: Reading,
  crafts: Crafts,
  faith: Faith,
  memories: Memories,
}

/** 관심사 코드에 맞는 장면 — 모르는 코드면 아무것도 그리지 않는다 (칸의 연한 바탕만 보임) */
export function InterestScene({ code }: { code: string }) {
  const Scene = SCENES[code]
  return Scene ? <Scene /> : null
}
