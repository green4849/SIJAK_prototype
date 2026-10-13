import { Check, MapPin } from 'lucide-react'
import { useState } from 'react'
import { getCurrentPosition, GeoError } from '@/shared/lib/geolocation'
import { Alert } from '@/shared/ui/Alert'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'
import { locateRegion } from '../lib/locateRegion'
import styles from './LocationAgreement.module.css'

export interface AgreedLocation {
  regionCode: string
  pos: { lat: number; lng: number }
}

interface Props {
  regions: { code: string; label: string }[]
  /** 동의하고 위치를 찾으면 값, 동의를 끄면 null */
  onChange: (located: AgreedLocation | null) => void
}

/**
 * 위치 정보 수집 동의 — 동의하면 그 자리에서 위치를 읽어 사는 곳을 정한다.
 * 시·도를 직접 고르는 단계는 없다 (사는 곳은 위치로만 정해진다).
 */
export function LocationAgreement({ regions, onChange }: Props) {
  const [agreed, setAgreed] = useState(false)
  const [locating, setLocating] = useState(false)
  const [place, setPlace] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function toggle(next: boolean) {
    setError(null)
    if (!next) {
      setAgreed(false)
      setPlace(null)
      onChange(null)
      return
    }
    setAgreed(true)
    setLocating(true)
    try {
      const pos = await getCurrentPosition()
      const found = await locateRegion(pos.lat, pos.lng, regions)
      const label = regions.find((r) => r.code === found.code)?.label ?? ''
      setPlace([label, found.area].filter(Boolean).join(' '))
      onChange({ regionCode: found.code, pos })
    } catch (e) {
      // 위치를 못 읽으면 동의도 되돌린다 — 화면과 실제 상태가 어긋나지 않게
      setAgreed(false)
      onChange(null)
      setError(e instanceof GeoError ? e.message : '지금은 위치를 찾을 수 없어요. 잠시 후 다시 해 주세요.')
    } finally {
      setLocating(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <label className={styles.agree} data-on={agreed || undefined}>
        <input
          type="checkbox"
          className={styles.input}
          checked={agreed}
          disabled={locating}
          onChange={(e) => toggle(e.target.checked)}
        />
        <span className={styles.box} aria-hidden="true">
          {agreed && <Check size={ICON.sm} strokeWidth={3} />}
        </span>
        <span className={styles.text}>
          <strong>위치 정보 수집 동의</strong>
          <span className={styles.sub}>동네(약 1km)까지만 저장해요</span>
        </span>
      </label>

      <p className={styles.place} aria-live="polite">
        {locating && '동네를 찾는 중…'}
        {!locating && place && (
          <>
            <MapPin aria-hidden="true" size={ICON.inline} strokeWidth={ICON_STROKE} />
            {place}
          </>
        )}
      </p>

      {error && <Alert>{error}</Alert>}
    </div>
  )
}
