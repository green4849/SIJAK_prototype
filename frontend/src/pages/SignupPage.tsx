import { Navigate, useLocation } from 'react-router-dom'
import { SignupProfileForm, useAuth } from '@/features/auth'
import { TopBar } from '@/shared/ui/TopBar'

interface SignupState {
  signupToken: string
  name: string
}

/** /signup — 본인인증을 마친 신규 회원만 들어온다 */
export function SignupPage() {
  const { signIn } = useAuth()
  const state = useLocation().state as SignupState | null

  // 새로고침 등으로 인증 정보가 없으면 처음부터
  if (!state?.signupToken) return <Navigate to="/login" replace />

  return (
    <>
      <TopBar backTo="/login" />
      <SignupProfileForm
        signupToken={state.signupToken}
        name={state.name}
        // 가입 직후 한 번: ⑧ 보안 안내 (이동은 RequireGuest가 처리)
        onDone={(token, user) => signIn(token, user, { to: '/safety', state: { afterSignup: true } })}
      />
    </>
  )
}
