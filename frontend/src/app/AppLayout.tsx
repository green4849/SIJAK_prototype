import { Outlet } from 'react-router-dom'
import styles from './AppLayout.module.css'

/** 전체 화면 틀. 하단 탭·긴급 버튼은 해당 스테이지에서 여기에 붙인다. */
export function AppLayout() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.brand}>위피 시작</span>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
