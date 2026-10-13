/**
 * 복지시설 종류 그림 (C7 다듬기) — 목록 카드 왼쪽 64px 칸. A19 그림체(갈색 선 + 연한 면).
 *  - 경로당: 기와지붕 작은 집과 마당 나무
 *  - 노인복지관: 하트 간판을 단 3층 건물
 *  - 시니어센터(시니어클럽): 깃발을 단 2층 건물과 창가 화분
 * 장식이라 화면 낭독기에서는 건너뛴다 (종류는 옆 글자로 읽힌다).
 */
import { Heart } from './Senior'

const LINE = 'var(--illust-line)'
const line = { stroke: LINE, strokeWidth: 1.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

function Window({ x, y, w = 7, h = 7 }: { x: number; y: number; w?: number; h?: number }) {
  return <rect x={x} y={y} width={w} height={h} rx="1.2" fill="var(--illust-sky)" {...line} />
}

function Kyungrodang() {
  return (
    <>
      <ellipse cx="32" cy="56" rx="28" ry="4" fill="var(--illust-hill)" />
      {/* 마당 나무 */}
      <rect x="49" y="40" width="2.6" height="14" rx="1.3" fill={LINE} opacity="0.55" />
      <circle cx="50.3" cy="36" r="7.5" fill="var(--illust-tree)" />
      {/* 집 */}
      <rect x="12" y="32" width="32" height="22" fill="#fdf6e3" {...line} />
      <rect x="24" y="40" width="8" height="14" rx="1" fill="#c9a27a" {...line} />
      <Window x={15} y={37} w={6} h={6} />
      <Window x={35} y={37} w={6} h={6} />
      {/* 기와지붕 — 처마 끝이 살짝 들린 곡선 */}
      <path d="M5 33 Q10 31 14 24 H42 Q46 31 51 33 Q46 34.5 28 34.5 Q10 34.5 5 33Z" fill="#7a6a5a" {...line} />
      <path d="M14 24 Q28 20 42 24" fill="none" {...line} />
    </>
  )
}

function WelfareCenter() {
  return (
    <>
      <ellipse cx="32" cy="57" rx="28" ry="4" fill="var(--illust-hill)" />
      <rect x="14" y="14" width="36" height="42" rx="2" fill="#fdf6e3" {...line} />
      {/* 하트 간판 */}
      <rect x="22" y="8" width="20" height="9" rx="4.5" fill="#fff" {...line} />
      <Heart x={32} y={12.6} s={0.9} />
      {[22, 33, 44].map((y) => (
        <g key={y}>
          <Window x={18} y={y - 2} />
          <Window x={28.5} y={y - 2} />
          <Window x={39} y={y - 2} />
        </g>
      ))}
      <rect x="27" y="47" width="10" height="9" rx="1" fill="var(--illust-cloth-green)" {...line} />
    </>
  )
}

function SeniorCenter() {
  return (
    <>
      <ellipse cx="32" cy="57" rx="28" ry="4" fill="var(--illust-hill)" />
      {/* 깃발 */}
      <path d="M44 12 V26" {...line} />
      <path d="M44 12.5 L54 15.5 L44 18.5Z" fill="var(--illust-heart)" {...line} />
      <rect x="10" y="26" width="44" height="30" rx="2" fill="#fdf6e3" {...line} />
      <path d="M8 27 H56" {...line} strokeWidth="2.4" />
      <Window x={15} y={32} w={9} h={8} />
      <Window x={40} y={32} w={9} h={8} />
      {/* 창가 화분 */}
      <rect x="16" y="40.5" width="7" height="3" rx="1" fill="#b98a5e" {...line} />
      <circle cx="18" cy="39" r="2" fill="var(--illust-tree)" />
      <circle cx="21.5" cy="39" r="2" fill="var(--illust-cloth-pink)" />
      <rect x="27" y="40" width="10" height="16" rx="1" fill="var(--illust-cloth-sky)" {...line} />
      <path d="M32 40 V56" {...line} />
    </>
  )
}

/** 시설 종류에 맞는 그림 — 모르는 종류면 복지관 그림 */
export function FacilityArt({ kind }: { kind: string }) {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true" focusable="false">
      {kind === 'kyungrodang' ? <Kyungrodang /> : kind === 'senior_center' ? <SeniorCenter /> : <WelfareCenter />}
    </svg>
  )
}
