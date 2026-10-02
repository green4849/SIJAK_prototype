import { Navigate, useParams } from 'react-router-dom'
import { useOpenChatWith } from '@/features/chat'
import { Alert } from '@/shared/ui/Alert'
import { ButtonLink } from '@/shared/ui/Button'
import { TopBar } from '@/shared/ui/TopBar'
import { chatRoom } from './routes'

/** 친구 카드 '대화하기' → 방을 열고(없으면 생성) 대화방으로 */
export function ChatOpenPage() {
  const { userId = '' } = useParams()
  const { data, error } = useOpenChatWith(userId)

  if (data) return <Navigate to={chatRoom(data.id)} replace />
  return (
    <>
      <TopBar title="대화하기" />
      {error ? (
        <>
          <Alert>{error}</Alert>
          <ButtonLink to="/friends" variant="secondary" block>
            친구 찾기로
          </ButtonLink>
        </>
      ) : (
        <p role="status">대화방을 여는 중…</p>
      )}
    </>
  )
}
