import { MapPin } from 'lucide-react'
import { useState } from 'react'
import { getCurrentPosition, GeoError } from '@/shared/lib/geolocation'
import { Alert } from '@/shared/ui/Alert'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'
import { foundAreaName, neighborhoodName } from '../lib/neighborhood'
import { locateRegion } from '../lib/locateRegion'
import styles from './LocationAgreement.module.css'

export interface AgreedLocation {
  regionCode: string
  areaName: string | null
  pos?: { lat: number; lng: number }
}

interface Props {
  regions: { code: string; label: string }[]
  onChange: (located: AgreedLocation | null) => void
}

/** 가입 지역은 휴대폰 위치 또는 직접 고른 읍·면·동으로 정한다. */
export function LocationAgreement({ regions, onChange }: Props) {
  const [mode, setMode] = useState<'gps' | 'manual' | null>(null)
  const [locating, setLocating] = useState(false)
  const [place, setPlace] = useState<string | null>(null)
  const [regionCode, setRegionCode] = useState('')
  const [areaInput, setAreaInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function findWithPhone() {
    setMode('gps')
    setError(null)
    setPlace(null)
    onChange(null)
    setLocating(true)
    try {
      const pos = await getCurrentPosition()
      const found = await locateRegion(pos.lat, pos.lng, regions)
      const areaName = foundAreaName(found.area)
      const label = regions.find((r) => r.code === found.code)?.label ?? ''
      setPlace([label, areaName].filter(Boolean).join(' '))
      onChange({ regionCode: found.code, areaName, pos })
    } catch (e) {
      setMode('manual')
      const previousName = neighborhoodName(areaInput, regionCode)
      if (regionCode && previousName) onChange({ regionCode, areaName: previousName })
      setError(`${e instanceof GeoError ? e.message : '지금은 위치를 찾을 수 없어요.'} 아래에서 동네를 직접 적어 주세요.`)
    } finally {
      setLocating(false)
    }
  }

  function chooseManual() {
    setMode('manual')
    setPlace(null)
    setError(null)
    onChange(null)
  }

  function updateManual(code: string, input: string) {
    setRegionCode(code)
    setAreaInput(input)
    const name = neighborhoodName(input, code)
    onChange(code && name ? { regionCode: code, areaName: name } : null)
    setError(null)
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.lead}>정확한 주소는 받지 않아요. 동네까지만 알려 주세요.</p>
      <div className={styles.methods} role="group" aria-label="동네 정하는 방법">
        <button type="button" className={styles.method} data-on={mode === 'gps' || undefined} onClick={findWithPhone} disabled={locating}>
          휴대폰 위치로 찾기
        </button>
        <button type="button" className={styles.method} data-on={mode === 'manual' || undefined} onClick={chooseManual} disabled={locating}>
          동네 직접 입력
        </button>
      </div>

      {mode === 'manual' && (
        <div className={styles.manual}>
          <label htmlFor="manual-region">시·도</label>
          <select id="manual-region" value={regionCode} onChange={(e) => updateManual(e.target.value, areaInput)}>
            <option value="">시·도를 골라 주세요</option>
            {regions.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
          </select>
          <label htmlFor="manual-area">시·군·구와 읍·면·동</label>
          <input
            id="manual-area"
            value={areaInput}
            onChange={(e) => updateManual(regionCode, e.target.value)}
            placeholder={regionCode === '36' ? '예: 한솔동' : '예: 수원시 영통구 매탄동'}
            maxLength={50}
            autoComplete="off"
          />
          <p className={styles.hint}>도로명·번지·아파트 이름은 적지 마세요. 직접 입력하면 정확한 거리는 표시하지 않아요.</p>
          {areaInput && !neighborhoodName(areaInput, regionCode) && (
            <p className={styles.hint} role="status">읍·면·동 이름까지 적어 주세요.</p>
          )}
        </div>
      )}

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
