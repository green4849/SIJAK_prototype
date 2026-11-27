import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CodeForm, IdentityForm, useAuth, usePassVerification, VerifyNotice } from '@/features/auth'
import { TopBar } from '@/shared/ui/TopBar'
import styles from './PhoneVerifyPage.module.css'
import { legalDoc } from './routes'

/** 설정에 따라 모의 번호 또는 Firebase 문자를 사용하는 전화 로그인. */
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
      {/* 인증번호 단계의 '뒤로'는 한 단계만 — 적어 둔 이름·생년월일·번호를 지우지 않는다 */}
      <TopBar backTo="/login" onBack={step.name === 'code' ? reset : undefined} />
      {step.name === 'code' ? (
        <CodeForm
          devCode={step.devCode}
          sentTo={step.sentTo}
          pending={pending}
          error={error}
          onSubmit={verify}
          onResend={resend}
          onBack={reset}
        />
      ) : (
        <>
          <IdentityForm pending={pending} error={error} onSubmit={start} initial={step.name === 'identity' ? step.last : undefined} />
          {/* 인증 정보는 본인 확인에만 쓰고, 처음 오신 분은 다음 화면에서 약관에 동의해야 저장된다 (B6).
              실제 문자(Firebase)면 동의 전에 번호가 Google 로 가므로 그것도 먼저 알린다 (B4) */}
          <p className={styles.note}>
            <VerifyNotice policyLink={<Link to={legalDoc('policy')}>개인정보 처리방침</Link>} />
          </p>
        </>
      )}
    </>
  )
}
