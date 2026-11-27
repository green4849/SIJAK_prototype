import { Heart, House, Sparkles, User, Users, type LucideIcon } from 'lucide-react'
import { Fragment } from 'react'
import { NavLink } from 'react-router-dom'
import { useUnreadTotal } from '@/features/chat'
import { useReceivedCount } from '@/features/friend'
import { Badge } from '@/shared/ui/Badge'
import styles from './BottomNav.module.css'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'

/**
 * 하단 탭 5개 (시안 ③ + 성향조사) — 아이콘 + 글자 항상 함께, 새 소식은 배지로 (A1).
 * 칸이 좁아 긴 이름은 정해 둔 자리에서만 두 줄로 나뉜다 (마이/페이지 — 낱말 중간에서 아무렇게나 끊지 않게)
 */
export function BottomNav() {
  const unread = useUnreadTotal()
  const received = useReceivedCount()

  const tabs: {
    to: string
    /** 좁을 때 두 줄로 나눌 수 있는 자리마다 끊어 둔 이름 */
    label: string[]
    icon: LucideIcon
    end?: boolean
    badge?: { count: number | null; label: (n: number) => string }
  }[] = [
    {
      to: '/',
      label: ['홈'],
      icon: House,
      end: true,
      // 대화는 탭이 없어 홈(→ 대화하기 카드)에 표시
      badge: { count: unread, label: (n) => `안 읽은 메시지 ${n}개` },
    },
    {
      to: '/friends',
      label: ['친구'],
      icon: Users,
      // 성향조사(/friends/survey)는 따로 탭이 있으니 '친구'는 정확히 /friends 일 때만
      end: true,
      badge: { count: received, label: (n) => `새 친구 신청 ${n}개` },
    },
    { to: '/activities', label: ['지역', '생활'], icon: Heart },
    { to: '/friends/survey', label: ['성향', '조사'], icon: Sparkles },
    { to: '/me', label: ['마이', '페이지'], icon: User },
  ]

  return (
    <nav className={styles.nav} aria-label="주요 메뉴" data-bottom-bar>
      <ul className={styles.list}>
        {tabs.map(({ to, label, icon: Icon, end, badge }) => (
          <li key={to}>
            <NavLink to={to} end={end} className={styles.tab}>
              <span className={styles.iconWrap}>
                <Icon aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />
                {badge && (
                  <span className={styles.badge}>
                    <Badge {...badge} part="dot" />
                  </span>
                )}
              </span>
              <span className={styles.label}>
                {label.map((part, i) => (
                  <Fragment key={part}>
                    {i > 0 && <wbr />}
                    {part}
                  </Fragment>
                ))}
                {badge && <Badge {...badge} part="text" />}
              </span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
