import { Smartphone } from 'lucide-react'
import { useState } from 'react'
import { detectPlatform, promptInstall, useInstallState } from '@/shared/lib/pwa'
import { toast } from '@/shared/lib/toast'
import { Button, ButtonLink } from '@/shared/ui/Button'
import { TopBar } from '@/shared/ui/TopBar'
import styles from './InfoPage.module.css'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'

/** ⑨ → 홈 화면에 아이콘 놓기 — 주소를 치지 않고 아이콘으로 열 수 있게 */
export function InstallPage() {
  const { canPrompt, installed } = useInstallState()
  const [platform] = useState(detectPlatform)

  async function install() {
    if (await promptInstall()) toast('홈 화면에 시작 아이콘을 놓았어요')
  }

  return (
    <section className={styles.page}>
      <TopBar title="홈 화면에 아이콘 놓기" backTo="/me" />
      <Smartphone className={styles.icon} size={ICON.lg} strokeWidth={ICON_STROKE} aria-hidden="true" />

      {installed ? (
        <p className={styles.body}>
          이미 홈 화면에 시작 아이콘이 있어요. 다음부터는 새싹 아이콘을 눌러 바로 여세요.
        </p>
      ) : (
        <>
          <p className={styles.body}>
            휴대폰 첫 화면에 <strong>새싹 아이콘</strong>을 놓아 두면, 주소를 칠 필요 없이 눌러서
            바로 열 수 있어요.
          </p>

          {canPrompt ? null : platform === 'ios' ? (
            <ol className={styles.steps} aria-label="아이폰에서 놓는 방법">
              <li>화면 아래(또는 위)의 <strong>공유 버튼</strong>(네모에 위 화살표)을 눌러요</li>
              <li>목록을 올려 <strong>&lsquo;홈 화면에 추가&rsquo;</strong>를 눌러요</li>
              <li>오른쪽 위 <strong>&lsquo;추가&rsquo;</strong>를 누르면 끝이에요</li>
            </ol>
          ) : (
            <ol className={styles.steps} aria-label="안드로이드에서 놓는 방법">
              <li>
                화면 오른쪽 위 <strong>점 세 개(⋮)</strong> 또는 아래의 <strong>줄 세 개(≡)</strong>를
                눌러요
              </li>
              <li>
                <strong>&lsquo;홈 화면에 추가&rsquo;</strong> 또는 <strong>&lsquo;앱 설치&rsquo;</strong>를
                눌러요
              </li>
              <li><strong>&lsquo;추가&rsquo;</strong> 또는 <strong>&lsquo;설치&rsquo;</strong>를 누르면 끝이에요</li>
            </ol>
          )}
        </>
      )}

      <div className={styles.actions}>
        {canPrompt && !installed && (
          <Button block large onClick={install}>
            홈 화면에 놓기
          </Button>
        )}
        <ButtonLink to="/me/help" variant="secondary" block>
          잘 안 되면 도움말 보기
        </ButtonLink>
      </div>
    </section>
  )
}
