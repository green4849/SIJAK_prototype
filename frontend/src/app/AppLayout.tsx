import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import styles from './AppLayout.module.css'

/** 하단 탭이 없는 화면 (시작·로그인·상세 화면) */
export function PlainLayout() {
  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}

/** 하단 탭이 있는 화면 (홈·친구·지역생활·마이페이지) — 목록 화면이라 넓은 화면에서 카드 여러 열 */
export function TabLayout() {
  return (
    <div className={`${styles.shell} ${styles.wide}`}>
      <main className={`${styles.main} ${styles.withNav}`}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
