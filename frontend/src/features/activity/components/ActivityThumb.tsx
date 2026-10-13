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
import { useState } from 'react'
import styles from './ActivityThumb.module.css'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'
import { activityPhotoUrl } from './activityPhotos'

/** 사진을 못 불러올 때 쓰는 활동 종류별 아이콘 + 색 */
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

/**
 * 활동 사진 — 실사 사진을 보여 주고, 불러오는 동안·실패하면 종류별 아이콘 + 색으로 대신한다.
 * 사진은 꾸밈용이라 화면 읽기 프로그램에는 읽히지 않게 둔다 (제목이 바로 옆에 있음).
 */
export function ActivityThumb({ kind, size = 'md' }: { kind: string; size?: 'md' | 'hero' }) {
  const { icon: Icon, tone } = KINDS[kind] ?? KINDS.walk
  const src = activityPhotoUrl(kind, size)
  const [failed, setFailed] = useState(false)
  return (
    <span className={styles.thumb} data-tone={tone} data-size={size} aria-hidden="true">
      <Icon size={size === 'hero' ? ICON.lg : ICON.md + 4} strokeWidth={ICON_STROKE} />
      {src && !failed && (
        <img
          className={styles.photo}
          src={src}
          alt=""
          loading={size === 'hero' ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  )
}
