import type { ReactNode } from 'react'
import { Button } from './Button'
import { Sheet } from './Sheet'
import styles from './ConfirmSheet.module.css'

interface Props {
  open: boolean
  /** 묻는 말 — "로그아웃할까요?" */
  title: string
  /** 누르면 무엇이 달라지는지 한두 문장 */
  children?: ReactNode
  /** 확인 버튼 글자 — 동작 이름 그대로 ('로그아웃', '빼기') */
  confirmLabel: string
  /** 되돌리기 어려운 일이면 빨간 버튼 */
  danger?: boolean
  pending?: boolean
  onConfirm: () => void
  onClose: () => void
}

/**
 * 되돌리기 어렵거나 포인트가 드는 동작 앞에 한 번 묻는 창.
 * 그만두기는 Sheet 아래 '닫기'·바깥 누르기·뒤로 가기로.
 */
export function ConfirmSheet({ open, title, children, confirmLabel, danger, pending, onConfirm, onClose }: Props) {
  // 닫혀 있을 땐 그리지 않는다 — 같은 이름의 버튼이 숨은 창 안에 있으면 시작이·화면 낭독기가 헷갈린다
  if (!open) return null
  return (
    <Sheet open={open} title={title} onClose={onClose}>
      {children && <div className={styles.body}>{children}</div>}
      <Button variant={danger ? 'danger' : 'primary'} block large disabled={pending} onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </Sheet>
  )
}
