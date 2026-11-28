import { useEffect, useState } from 'react'
import { errorMessage } from '@/shared/api/client'
import {
  currentSubscription,
  isSubscribed,
  pushSupport,
  subscribeDevice,
  unsubscribeDevice,
} from '@/shared/lib/push'
import { toast } from '@/shared/lib/toast'
import { notificationApi, type PushConfig } from '../api/notificationApi'

/**
 * 이 기기의 휴대폰 알림 상태 (C4)
 * - unsupported: 이 브라우저는 못 받음 · ios-install: 아이폰은 홈 화면에 추가해야
 * - server-off: 서버가 아직 보낼 수 없음(키 없음·시연) · denied: 브라우저 허용을 거절함
 */
export type PushState = 'loading' | 'unsupported' | 'ios-install' | 'server-off' | 'denied' | 'off' | 'on'

function toBody(json: PushSubscriptionJSON) {
  return { endpoint: json.endpoint ?? '', keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' } }
}

/** 서버 설정과 이 기기 구독을 보고 지금 상태를 정한다 */
async function loadPushState(): Promise<{ config: PushConfig; state: PushState }> {
  const config = await notificationApi.pushConfig()
  if (!config.enabled || !config.public_key) return { config, state: 'server-off' }
  if (Notification.permission === 'denied') return { config, state: 'denied' }
  if (!(await isSubscribed(config.public_key))) return { config, state: 'off' }
  // 서버가 이 기기를 잊었을 수 있어(만료 정리·다른 계정으로 로그인) 다시 알려 둔다 — 같은 기기면 그대로
  const sub = await currentSubscription()
  if (sub) await notificationApi.pushSubscribe(toBody(sub.toJSON()))
  return { config, state: 'on' }
}

export function usePush() {
  // 브라우저가 못 받으면 처음부터 그 안내 — 서버에 묻지 않는다
  const [state, setState] = useState<PushState>(() => {
    const support = pushSupport()
    return support === 'ok' ? 'loading' : support
  })
  const [config, setConfig] = useState<PushConfig | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (pushSupport() !== 'ok') return
    let alive = true
    loadPushState().then(
      (r) => {
        if (!alive) return
        setConfig(r.config)
        setState(r.state)
      },
      (e) => {
        if (!alive) return
        setError(errorMessage(e))
        setState('off')
      },
    )
    return () => {
      alive = false
    }
  }, [])

  async function run(job: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await job()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const enable = () =>
    run(async () => {
      if (!config?.public_key) return
      const r = await subscribeDevice(config.public_key)
      if (!r.ok) {
        if (r.reason === 'denied') setState('denied')
        else setError('앱을 새로 고친 뒤 다시 눌러 주세요.')
        return
      }
      await notificationApi.pushSubscribe(toBody(r.subscription))
      setState('on')
      toast('이 기기로 새 소식을 알려 드릴게요')
    })

  const disable = () =>
    run(async () => {
      await unsubscribeDevice()
      setState('off')
      toast('이 기기 알림을 껐어요')
    })

  const test = () =>
    run(async () => {
      const r = await notificationApi.pushTest()
      toast(r.sent > 0 ? '시험 알림을 보냈어요. 잠시 뒤 확인해 보세요' : '알림을 보내지 못했어요. 알림을 껐다가 다시 켜 주세요')
    })

  return { state, quietHours: config?.quiet_hours ?? null, busy, error, enable, disable, test }
}
