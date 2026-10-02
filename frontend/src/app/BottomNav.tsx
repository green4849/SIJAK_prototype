import { Heart, House, User, Users, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useUnreadTotal } from '@/features/chat'
import { useReceivedCount } from '@/features/friend'
import { Badge } from '@/shared/ui/Badge'
import styles from './BottomNav.module.css'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'

/** 하단 탭 4개 (시안 ③) — 아이콘 + 글자 항상 함께, 새 소식은 배지로 (A1) */
export function BottomNav() {
  const unread = useUnreadTotal()
  const received = useReceivedCount()

  const tabs: {
    to: string
    label: string
    icon: LucideIcon
    end?: boolean
    badge?: { count: number | null; label: (n: number) => string }
  }[] = [
    {
      to: '/',
      label: '홈',
      icon: House,
      end: true,
      // 대화는 탭이 없어 홈(→ 대화하기 카드)에 표시
      badge: { count: unread, label: (n) => `안 읽은 메시지 ${n}개` },
    },
    {
      to: '/friends',
      label: '친구',
      icon: Users,
      badge: { count: received, label: (n) => `새 친구 신청 ${n}개` },
    },
    { to: '/activities', label: '지역생활', icon: Heart },
    { to: '/me', label: '마이페이지', icon: User },
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
              <span>
                {label}
                {badge && <Badge {...badge} part="text" />}
              </span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
