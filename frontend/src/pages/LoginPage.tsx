import { useEffect, useState } from 'react'
import { Headset, Smartphone } from 'lucide-react'
import { authApi, type AuthMethod } from '@/features/auth'
import { IS_DEMO } from '@/shared/lib/demo'
import { Alert } from '@/shared/ui/Alert'
import { ActionCard } from '@/shared/ui/ActionCard'
import { LeafLogo } from '@/shared/ui/Brand'
import { TopBar } from '@/shared/ui/TopBar'
import styles from './LoginPage.module.css'

/**
 * ② 로그인 방법 선택.
 * 시작 화면의 새싹이 이 화면 위쪽 작은 로고 자리로 날아와 붙는다 (A25 — 화면이 '이어지는' 느낌).
 */
export function LoginPage() {
  const [method, setMethod] = useState<AuthMethod['mode'] | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    if (IS_DEMO) return
    let active = true
    void authApi.method().then(
      (result) => { if (active) setMethod(result.mode) },
      () => { if (active) setLoadError(true) },
    )
    return () => { active = false }
  }, [])

  return (
    <section className={styles.page}>
      <TopBar backTo="/welcome" />

      <div className={styles.head}>
        <p className={styles.brand}>
          <LeafLogo size="40px" />
          시작
        </p>
        <h1 className={styles.title}>시작에 로그인해요</h1>
        <p className={styles.lead}>
          {IS_DEMO ? '시연용 로그인입니다.' : method === 'kakao'
            ? '카카오 계정으로 간편하게 시작해요. 본인확인은 진행하지 않아요.'
            : method === 'phone' ? '휴대폰 번호로 로그인해요.' : '로그인 방법을 불러오는 중이에요.'}
        </p>
      </div>

      <div className={styles.options}>
        {/* 실서비스 버튼은 카카오디벨로퍼스 공식 리소스 사용 */}
        {IS_DEMO ? (
          <ActionCard variant="primary" icon={Smartphone} title="시연용 로그인" to="/login/phone" />
        ) : method === 'phone' ? (
          <ActionCard variant="primary" icon={Smartphone} title="휴대폰으로 로그인" to="/login/phone" />
        ) : method === 'kakao' ? (
          <button
            type="button"
            className={styles.kakaoButton}
            aria-label="카카오 로그인"
            onClick={() => window.location.assign('/api/v1/auth/kakao/start')}
          >
            <img src={`${import.meta.env.BASE_URL}kakao-login.svg`} alt="" />
          </button>
        ) : loadError ? <Alert>로그인 방법을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</Alert> : null}
        {IS_DEMO && <ActionCard
          variant="subtle"
          icon={Headset}
          title="함께 로그인하기"
          to="/login/help"
        />}
      </div>
    </section>
  )
}
