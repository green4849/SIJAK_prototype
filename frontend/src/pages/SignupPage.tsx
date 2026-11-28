import { Navigate, useLocation } from 'react-router-dom'
import { SignupProfileForm, useAuth } from '@/features/auth'

interface SignupState {
  signupToken: string
  name: string
  provider?: 'kakao'
}

/** /signup — 카카오 또는 시연용 로그인에서 가입이 필요한 신규 회원만 들어온다 */
export function SignupPage() {
  const { signIn } = useAuth()
  const state = useLocation().state as SignupState | null

  // 새로고침 등으로 인증 정보가 없으면 처음부터
  if (!state?.signupToken) return <Navigate to="/login" replace />

  return (
    <SignupProfileForm
      signupToken={state.signupToken}
      name={state.name}
      provider={state.provider}
      backTo="/login"
      onDone={(token, user) => {
        try { localStorage.removeItem('wipi.surveyLater') } catch { /* 이 기기 저장소가 막힌 경우 */ }
        signIn(token, user, { to: '/friends/survey?welcome=1' })
      }}
    />
  )
}
