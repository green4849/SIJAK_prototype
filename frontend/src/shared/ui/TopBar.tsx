import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './TopBar.module.css'

interface Props {
  title?: string
  /** 뒤로 갈 경로. 없으면 브라우저 뒤로가기 */
  backTo?: string
  /** false면 뒤로가기 버튼 숨김 */
  back?: boolean
  right?: ReactNode
}

/** 화면 상단 — 뒤로가기(글자와 함께) + 제목 + 오른쪽 동작 */
export function TopBar({ title, backTo, back = true, right }: Props) {
  const navigate = useNavigate()
  if (!back && !title && !right) return null
  return (
    <header className={styles.bar}>
      <div className={styles.side}>
        {back && (
          <button
            type="button"
            className={styles.back}
            onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
          >
            <ChevronLeft aria-hidden="true" size="1.4em" />
            <span className={styles.backLabel}>뒤로</span>
          </button>
        )}
      </div>
      {title && <h1 className={styles.title}>{title}</h1>}
      <div className={`${styles.side} ${styles.right}`}>{right}</div>
    </header>
  )
}
