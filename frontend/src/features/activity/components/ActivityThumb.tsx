import type { ComponentType } from 'react'
import {
  BookOpen,
  Clapperboard,
  Coffee,
  Dumbbell,
  Footprints,
  Music,
  Palette,
  Recycle,
  Smartphone,
  Soup,
  Sprout,
  type LucideIcon,
} from 'lucide-react'
import { CleanupScene, MealScene } from '@/shared/ui/illustrations/Scenes'
import styles from './ActivityThumb.module.css'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'

/** 시안의 활동 사진 자리 — 사진 대신 활동 종류별 아이콘 + 색 */
const KINDS: Record<string, { icon: LucideIcon; tone: string }> = {
  walk: { icon: Footprints, tone: 'mint' },
  phone: { icon: Smartphone, tone: 'sky' },
  movie: { icon: Clapperboard, tone: 'beige' },
  tea: { icon: Coffee, tone: 'yellow' },
  music: { icon: Music, tone: 'pink' },
  craft: { icon: Palette, tone: 'pink' },
  exercise: { icon: Dumbbell, tone: 'mint' },
  book: { icon: BookOpen, tone: 'sky' },
  garden: { icon: Sprout, tone: 'mint' },
  // 봉사 (C12)
  meal: { icon: Soup, tone: 'yellow' },
  cleanup: { icon: Recycle, tone: 'mint' },
}

/** 상세 상단에서 아이콘 대신 인물 장면을 쓰는 종류 (봉사 — A19). 목록 썸네일은 아이콘으로 통일 유지 */
const HERO_SCENES: Record<string, ComponentType> = { meal: MealScene, cleanup: CleanupScene }

export function ActivityThumb({ kind, size = 'md' }: { kind: string; size?: 'md' | 'hero' }) {
  const { icon: Icon, tone } = KINDS[kind] ?? KINDS.walk
  const Scene = size === 'hero' ? HERO_SCENES[kind] : undefined
  if (Scene)
    return (
      <span className={styles.thumb} data-tone={tone} data-size={size} aria-hidden="true">
        <Scene />
      </span>
    )
  return (
    <span className={styles.thumb} data-tone={tone} data-size={size} aria-hidden="true">
      <Icon size={size === 'hero' ? ICON.lg : ICON.md + 4} strokeWidth={ICON_STROKE} />
    </span>
  )
}
