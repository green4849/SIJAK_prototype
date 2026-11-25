import { useNavigate } from 'react-router-dom'
import { ConsentRenewal } from '@/features/auth'
import styles from './TabPage.module.css'

/** /consent — 약관이 바뀌었거나 동의 기록이 없는 회원은 앱을 쓰기 전에 여기로 온다 (B6, guards.RequireAuth) */
export function ConsentPage() {
  const navigate = useNavigate()
  return (
    <section className={styles.page}>
      <ConsentRenewal onDone={() => navigate('/', { replace: true })} />
    </section>
  )
}
