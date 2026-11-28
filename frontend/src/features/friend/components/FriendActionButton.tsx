import { useState } from 'react'
import { Button, ButtonLink } from '@/shared/ui/Button'
import { ConfirmSheet } from '@/shared/ui/ConfirmSheet'
import type { FriendCardData } from '../api/friendApi'

interface Props {
  card: FriendCardData
  onRequest: (userId: string) => Promise<boolean>
  /** 이미 친구일 때 대화로 가는 경로 (chat feature를 모르게 페이지에서 주입) */
  chatHref: (userId: string) => string
  /** 새 친구 신청에 드는 포인트 표시 ('무료' / '30P') — 없으면 안 보임 */
  price?: string
}

/** 관계에 따라 버튼이 바뀐다: 친구 신청 → 신청했어요 / 친구예요 → 대화하기 */
export function FriendActionButton({ card, onRequest, chatHref, price }: Props) {
  const [pending, setPending] = useState(false)
  const [ask, setAsk] = useState(false)

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
  async function send() {
    setAsk(false)
    setPending(true)
    await onRequest(card.user_id)
    setPending(false)
  }
  // 포인트가 드는 신청만 한 번 묻는다 (무료 첫 신청·받은 신청 수락은 바로)
  const costs = card.relation !== 'received' && !!price && price !== '무료'
  return (
    <>
      <Button block disabled={pending} onClick={() => (costs ? setAsk(true) : void send())}>
        {card.relation === 'received' ? '친구 수락' : price ? `친구 신청 · ${price}` : '친구 신청'}
      </Button>
      {costs && (
        <ConfirmSheet
          open={ask}
          title={`${card.name}님께 친구 신청할까요?`}
          confirmLabel={`친구 신청 · ${price}`}
          pending={pending}
          onConfirm={() => void send()}
          onClose={() => setAsk(false)}
        >
          <p>신청하면 {price} 빠져요. 상대가 받지 않아도 돌려받지 못해요.</p>
        </ConfirmSheet>
      )}
    </>
  )
}
