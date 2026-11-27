import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi, useAuth } from '@/features/auth'
import { errorMessage } from '@/shared/api/client'
import { Alert } from '@/shared/ui/Alert'
import { ButtonLink } from '@/shared/ui/Button'
import { TopBar } from '@/shared/ui/TopBar'

/** OAuth code는 화면 주소로만 받고 백엔드에서 카카오 토큰으로 교환한다. */
export function KakaoCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const started = useRef(false)
  const [error, setError] = useState<string | null>(() =>
    !params.get('code') || !params.get('state') || params.get('error')
      ? '카카오 로그인이 취소되었어요. 다시 시도해 주세요.' : null)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const code = params.get('code')
    const state = params.get('state')
    // 일회용 인가 코드를 주소창과 브라우저 기록에 남기지 않는다.
    window.history.replaceState(window.history.state, '', window.location.pathname)
    if (!code || !state || params.get('error')) {
      return
    }
    authApi.completeKakao(code, state).then((result) => {
      if (result.status === 'logged_in') signIn(result.access_token, result.user)
      else navigate('/signup', { replace: true, state: { signupToken: result.signup_token, name: result.name, provider: 'kakao' } })
    }).catch((err) => setError(errorMessage(err)))
  }, [params, navigate, signIn])

  return <>
    <TopBar backTo="/login" />
    <h1>{error ? '로그인을 마치지 못했어요' : '카카오 계정을 확인하는 중이에요…'}</h1>
    {error && <><Alert>{error}</Alert><ButtonLink to="/login" block large>다시 로그인하기</ButtonLink></>}
  </>
}
