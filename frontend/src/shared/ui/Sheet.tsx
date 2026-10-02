import { useEffect, useId, useRef, type ReactNode } from 'react'
import styles from './Sheet.module.css'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

/**
 * 아래에서 올라오는 창 — 네이티브 <dialog>로 포커스 가두기·ESC 닫기를 브라우저에 맡긴다.
 * 닫기 버튼은 글자로 항상 보이게 (바깥 터치로만 닫히면 어르신이 못 찾는다).
 */
export function Sheet({ open, title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId() // 한 화면에 Sheet가 여러 개일 수 있음 → id 고유하게

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={styles.sheet}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      <div className={styles.body}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {children}
        <button type="button" className={styles.close} onClick={onClose}>
          닫기
        </button>
      </div>
    </dialog>
  )
}
