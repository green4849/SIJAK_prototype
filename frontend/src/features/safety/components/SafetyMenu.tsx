import { CircleAlert, Ban, EllipsisVertical, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { errorMessage } from '@/shared/api/client'
import { Alert } from '@/shared/ui/Alert'
import { MenuItem, MenuList } from '@/shared/ui/MenuList'
import { Sheet } from '@/shared/ui/Sheet'
import { safetyApi } from '../api/safetyApi'
import { ReportSheet } from './ReportSheet'
import styles from './SafetyMenu.module.css'

interface Props {
  userId: string
  name: string
  blocked: boolean
  /** 차단·신고·해제 후 화면 갱신 */
  onChanged: () => void
}

/** ⑤ 대화방 오른쪽 위 '더보기' — 신고하기 / 차단하기 / 차단 풀기 */
export function SafetyMenu({ userId, name, blocked, onChanged }: Props) {
  const [menu, setMenu] = useState(false)
  const [report, setReport] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggleBlock() {
    setError(null)
    try {
      await (blocked ? safetyApi.unblock(userId) : safetyApi.block(userId))
      setMenu(false)
      onChanged()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <>
      <button type="button" className={styles.trigger} onClick={() => setMenu(true)}>
        <EllipsisVertical aria-hidden="true" />
        <span className={styles.label}>더보기</span>
      </button>

      <Sheet open={menu} title={`${name}님`} onClose={() => setMenu(false)}>
        <MenuList>
          <MenuItem
            icon={CircleAlert}
            label="신고하기"
            onClick={() => {
              setMenu(false)
              setReport(true)
            }}
          />
          <MenuItem
            icon={blocked ? ShieldCheck : Ban}
            label={blocked ? '차단 풀기' : '차단하기'}
            onClick={toggleBlock}
          />
        </MenuList>
        {error && <Alert>{error}</Alert>}
      </Sheet>

      <ReportSheet
        open={report}
        targetUserId={userId}
        targetName={name}
        onClose={() => setReport(false)}
        onDone={() => {
          setReport(false)
          onChanged()
        }}
      />
    </>
  )
}
