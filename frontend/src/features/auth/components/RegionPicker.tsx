import { LocateFixed, MapPin } from 'lucide-react'
import { useState } from 'react'
import { getCurrentPosition, GeoError } from '@/shared/lib/geolocation'
import { Alert } from '@/shared/ui/Alert'
import { Button } from '@/shared/ui/Button'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'
import { OptionGrid } from '@/shared/ui/OptionGrid'
import { Sheet } from '@/shared/ui/Sheet'
import { locateRegion } from '../lib/locateRegion'
import styles from './RegionPicker.module.css'

interface Region {
  code: string
  label: string
}

interface Props {
  regions: Region[]
  value: string
  /** 위치로 찾았으면 pos 도 함께 — 가입 뒤 '같은 동네' 이웃 찾기에 그대로 쓴다 */
  onChange: (code: string, pos?: { lat: number; lng: number }) => void
}

/**
 * 사는 곳 — 17개 버튼을 늘어놓지 않고, 내 위치로 한 번에 찾는다 (당근 동네 인증처럼).
 * 위치를 못 쓰면 '직접 고르기' 창에서 시·도를 고른다.
 */
export function RegionPicker({ regions, value, onChange }: Props) {
  const [area, setArea] = useState('')
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const label = regions.find((r) => r.code === value)?.label

  async function locate() {
    setLocating(true)
    setError(null)
    try {
      const pos = await getCurrentPosition()
      const found = await locateRegion(pos.lat, pos.lng, regions)
      setArea(found.area)
      onChange(found.code, pos)
      setSheetOpen(false)
    } catch (e) {
      setError(e instanceof GeoError ? e.message : '지금은 위치를 찾을 수 없어요. 직접 골라 주세요.')
    } finally {
      setLocating(false)
    }
  }

  function pick(code: string) {
    setArea('')
    setError(null)
    onChange(code)
    setSheetOpen(false)
  }

  const locateButton = (
    <Button block onClick={locate} disabled={locating}>
      <LocateFixed aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />
      {locating ? '위치 찾는 중…' : '내 위치로 찾기'}
    </Button>
  )

  return (
    <section className={styles.wrap} aria-labelledby="region-picker-title">
      <h2 id="region-picker-title" className={styles.legend}>
        사는 곳
      </h2>

      {label ? (
        <div className={styles.card}>
          <span className={styles.pin} aria-hidden="true">
            <MapPin size={ICON.md} strokeWidth={ICON_STROKE} />
          </span>
          <p className={styles.place} aria-live="polite">
            <strong>{label}</strong>
            {area && <span className={styles.area}>{area}</span>}
          </p>
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>
            바꾸기
          </Button>
        </div>
      ) : (
        <div className={styles.empty}>
          {locateButton}
          <button type="button" className={styles.manual} onClick={() => setSheetOpen(true)}>
            직접 고를게요
          </button>
        </div>
      )}

      {error && <Alert>{error}</Alert>}

      <Sheet open={sheetOpen} title="사는 곳 고르기" onClose={() => setSheetOpen(false)}>
        {locateButton}
        <OptionGrid
          legend="시·도"
          options={regions.map((r) => ({ value: r.code, label: r.label }))}
          selected={value ? [value] : []}
          onToggle={pick}
        />
      </Sheet>
    </section>
  )
}
