import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { SignupProfileForm, useAuth } from '@/features/auth'

interface SignupState {
  signupToken: string
  name: string
}

/** /signup — 본인인증을 마친 신규 회원만 들어온다 */
export function SignupPage() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const state = useLocation().state as SignupState | null

  // 새로고침 등으로 인증 정보가 없으면 처음부터
  if (!state?.signupToken) return <Navigate to="/start" replace />

  return (
    <SignupProfileForm
      signupToken={state.signupToken}
      name={state.name}
      onDone={(token, user) => {
        signIn(token, user)
        navigate('/', { replace: true })
      }}
    />
  )
}
