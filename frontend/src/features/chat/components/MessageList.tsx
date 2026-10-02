import { Fragment, useEffect, useRef, type ReactNode } from 'react'
import { formatDate, formatTime, isSameDay } from '@/shared/lib/datetime'
import { Avatar } from '@/shared/ui/Avatar'
import type { ChatMessageData, ChatPeer } from '../api/chatApi'
import { VoiceMessage } from './VoiceMessage'
import styles from './MessageList.module.css'

interface Props {
  peer: ChatPeer
  messages: ChatMessageData[]
  /** 메시지 아래에 끼워 넣을 것 (Stage 5: 위험 경고) */
  renderAfter?: (m: ChatMessageData) => ReactNode
}

/** ⑤ 대화 내용 — 날짜 구분선, 왼쪽(상대)·오른쪽(나) 말풍선, 시간 */
export function MessageList({ peer, messages, renderAfter }: Props) {
  const bottom = useRef<HTMLDivElement>(null)
  const lastId = messages.at(-1)?.id

  // 새 메시지가 오면 맨 아래로
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [lastId])

  if (messages.length === 0)
    return (
      <p className={styles.empty}>
        {peer.name}님께 먼저 인사를 건네 보세요.
        <br />
        글로 써도 되고, 🎤 버튼으로 말해도 돼요.
      </p>
    )

  return (
    <ol className={styles.list} aria-label={`${peer.name}님과의 대화`} aria-live="polite">
      {messages.map((m, i) => {
        const prev = messages[i - 1]
        const newDay = !prev || !isSameDay(prev.created_at, m.created_at)
        return (
          <Fragment key={m.id}>
            {newDay && (
              <li className={styles.day} aria-hidden="false">
                <span>{formatDate(m.created_at)}</span>
              </li>
            )}
            <li className={styles.row} data-mine={m.mine}>
              {!m.mine && <Avatar name={peer.name} seed={peer.user_id} />}
              <div className={styles.stack}>
                <span className="sr-only">{m.mine ? '내가 보냄' : `${peer.name}님`}: </span>
                <div className={styles.bubble}>
                  {m.kind === 'voice' && m.audio_url ? (
                    <VoiceMessage audioUrl={m.audio_url} durationSec={m.duration_sec ?? 0} />
                  ) : (
                    m.body
                  )}
                </div>
                <time className={styles.time} dateTime={m.created_at}>
                  {formatTime(m.created_at)}
                </time>
                {renderAfter?.(m)}
              </div>
            </li>
          </Fragment>
        )
      })}
      <div ref={bottom} />
    </ol>
  )
}
