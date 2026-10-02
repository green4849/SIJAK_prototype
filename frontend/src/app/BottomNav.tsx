import { Heart, House, User, Users, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import styles from './BottomNav.module.css'

const TABS: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/', label: '홈', icon: House, end: true },
  { to: '/friends', label: '친구', icon: Users },
  { to: '/activities', label: '지역생활', icon: Heart },
  { to: '/me', label: '마이페이지', icon: User },
]

/** 하단 탭 4개 (시안 ③) — 아이콘 + 글자 항상 함께 */
export function BottomNav() {
  return (
    <nav className={styles.nav} aria-label="주요 메뉴">
      <ul className={styles.list}>
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink to={to} end={end} className={styles.tab}>
              <Icon aria-hidden="true" size="1.5em" strokeWidth={2.2} />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
