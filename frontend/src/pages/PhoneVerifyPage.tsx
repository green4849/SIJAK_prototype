import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CodeForm, IdentityForm, useAuth, usePassVerification } from '@/features/auth'
import { TopBar } from '@/shared/ui/TopBar'

/** ② → 휴대폰 인증. 본인인증 하나로 로그인·가입을 모두 시작 */
export function PhoneVerifyPage() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const { step, pending, error, start, verify, resend, reset } = usePassVerification()

  useEffect(() => {
    if (step.name !== 'done') return
    const r = step.result
    if (r.status === 'logged_in') {
      signIn(r.access_token, r.user) // 홈 이동은 RequireGuest가 처리
    } else {
      navigate('/signup', { replace: true, state: { signupToken: r.signup_token, name: r.name } })
    }
  }, [step, signIn, navigate])

  return (
    <>
      <TopBar backTo="/login" />
      {step.name === 'code' ? (
        <CodeForm
          devCode={step.devCode}
          pending={pending}
          error={error}
          onSubmit={verify}
          onResend={resend}
          onBack={reset}
        />
      ) : (
        <IdentityForm pending={pending} error={error} onSubmit={start} />
      )}
    </>
  )
}
