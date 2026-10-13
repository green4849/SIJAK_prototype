import { Bell, Building2, Coins, HeartPulse, MapPin, TriangleAlert, Users, type LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatRelative } from '@/shared/lib/datetime'
import { Button } from '@/shared/ui/Button'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'
import type { NotificationItem } from '../api/inboxApi'
import { markAllRead, markRead, useNotifications } from '../hooks/useInbox'
import styles from './Inbox.module.css'

const KIND: Record<NotificationItem['kind'], { icon: LucideIcon; accent: string }> = {
  safety: { icon: TriangleAlert, accent: 'danger' },
  friend: { icon: Users, accent: 'pink' },
  activity: { icon: MapPin, accent: 'yellow' },
  wellbeing: { icon: HeartPulse, accent: 'sky' },
  welfare: { icon: Building2, accent: 'mint' },
  points: { icon: Coins, accent: 'yellow' },
}

/** 알림함 — 안 읽은 소식은 굵게 + '새 소식' 표시, 누르면 그 화면으로 */
export function NotificationList() {
  const list = useNotifications()
  const navigate = useNavigate()
  if (!list) return <p role="status">불러오는 중…</p>
  if (list.length === 0)
    return (
      <p className={styles.empty}>
        <Bell aria-hidden="true" size={ICON.lg} strokeWidth={ICON_STROKE} />
        새 소식이 없어요.
      </p>
    )

  const unread = list.some((n) => !n.read)
  return (
    <>
      {unread && (
        <Button variant="secondary" className={styles.readAll} onClick={() => void markAllRead()}>
          모두 읽음
        </Button>
      )}
      <ul className={styles.list}>
        {list.map((n) => {
          const k = KIND[n.kind]
          const Icon = k.icon
          return (
            <li key={n.id}>
              <button
                type="button"
                className={styles.item}
                data-read={n.read}
                onClick={async () => {
                  await markRead(n) // 읽음 기록이 끝난 뒤 이동 (앱을 닫아도 읽음으로 남게)
                  if (n.link) navigate(n.link)
                }}
              >
                <span className={styles.icon} data-accent={k.accent} aria-hidden="true">
                  <Icon size={ICON.md} strokeWidth={ICON_STROKE} />
                </span>
                <span className={styles.text}>
                  <span className={styles.title}>
                    {!n.read && <span className={styles.new}>새 소식</span>}
                    {n.title}
                  </span>
                  <span className={styles.body}>{n.body}</span>
                  <span className={styles.time}>{formatRelative(n.created_at)}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}
