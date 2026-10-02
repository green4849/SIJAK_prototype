import {
  BookOpen,
  Clapperboard,
  Coffee,
  Dumbbell,
  Footprints,
  Music,
  Palette,
  Smartphone,
  Sprout,
  type LucideIcon,
} from 'lucide-react'
import styles from './ActivityThumb.module.css'

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
}

export function ActivityThumb({ kind, size = 'md' }: { kind: string; size?: 'md' | 'hero' }) {
  const { icon: Icon, tone } = KINDS[kind] ?? KINDS.walk
  return (
    <span className={styles.thumb} data-tone={tone} data-size={size} aria-hidden="true">
      <Icon size={size === 'hero' ? '3.5em' : '1.8em'} strokeWidth={1.8} />
    </span>
  )
}
