import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CodeForm, IdentityForm, useAuth, usePassVerification } from '@/features/auth'

/** /start — 본인인증 하나로 로그인·가입을 모두 시작 */
export function StartPage() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const { step, pending, error, start, verify, resend, reset } = usePassVerification()

  useEffect(() => {
    if (step.name !== 'done') return
    const r = step.result
    if (r.status === 'logged_in') {
      signIn(r.access_token, r.user)
      navigate('/', { replace: true })
    } else {
      navigate('/signup', { replace: true, state: { signupToken: r.signup_token, name: r.name } })
    }
  }, [step, signIn, navigate])

  if (step.name === 'code') {
    return (
      <CodeForm
        devCode={step.devCode}
        pending={pending}
        error={error}
        onSubmit={verify}
        onResend={resend}
        onBack={reset}
      />
    )
  }
  return <IdentityForm pending={pending} error={error} onSubmit={start} />
}
