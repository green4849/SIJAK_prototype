import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './TopBar.module.css'

interface Props {
  title?: string
  /** 제목 바로 아래 한 줄 설명 (제목과 가깝게 붙는다) */
  description?: ReactNode
  /** 뒤로 갈 경로. 없으면 브라우저 뒤로가기 */
  backTo?: string
  /** false면 뒤로가기 버튼 숨김 */
  back?: boolean
  right?: ReactNode
}

/**
 * 화면 상단 — 모든 화면 공통 (디자인 리뷰 v1 공통 6·17).
 *  - 제목은 왼쪽 정렬, 본문과 같은 왼쪽 선에서 시작
 *  - 뒤로가기가 있으면: [뒤로 ……… 오른쪽 동작] 한 줄 + 그 아래 제목
 *  - 뒤로가기가 없으면(탭 화면): [제목 ……… 오른쪽 동작] 한 줄
 *  → 오른쪽 동작이 있든 없든 제목 위치가 바뀌지 않는다
 */
export function TopBar({ title, description, backTo, back = true, right }: Props) {
  const navigate = useNavigate()
  if (!back && !title && !right) return null

  const heading = title ? <h1 className={styles.title}>{title}</h1> : null
  return (
    <header className={styles.bar}>
      {back ? (
        <>
          <div className={styles.toolbar}>
            <button
              type="button"
              className={styles.back}
              onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
            >
              <ChevronLeft aria-hidden="true" size="1.4em" />
              <span className={styles.backLabel}>뒤로</span>
            </button>
            {right && <div className={styles.right}>{right}</div>}
          </div>
          {heading}
        </>
      ) : (
        <div className={styles.toolbar}>
          {heading}
          {right && <div className={styles.right}>{right}</div>}
        </div>
      )}
      {description && <p className={styles.description}>{description}</p>}
    </header>
  )
}
