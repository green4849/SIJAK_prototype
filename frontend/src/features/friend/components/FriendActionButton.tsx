import { useState } from 'react'
import { Button, ButtonLink } from '@/shared/ui/Button'
import type { FriendCardData } from '../api/friendApi'

interface Props {
  card: FriendCardData
  onRequest: (userId: string) => Promise<void>
  /** 이미 친구일 때 대화로 가는 경로 (chat feature를 모르게 페이지에서 주입) */
  chatHref: (userId: string) => string
}

/** 관계에 따라 버튼이 바뀐다: 친구 신청 → 신청했어요 / 친구예요 → 대화하기 */
export function FriendActionButton({ card, onRequest, chatHref }: Props) {
  const [pending, setPending] = useState(false)

  if (card.relation === 'friends')
    return (
      <ButtonLink to={chatHref(card.user_id)} block>
        대화하기
      </ButtonLink>
    )
  if (card.relation === 'sent')
    return (
      <Button variant="secondary" block disabled>
        신청했어요 ✓
      </Button>
    )
  return (
    <Button
      block
      disabled={pending}
      onClick={async () => {
        setPending(true)
        await onRequest(card.user_id)
        setPending(false)
      }}
    >
      {card.relation === 'received' ? '친구 수락' : '친구 신청'}
    </Button>
  )
}
