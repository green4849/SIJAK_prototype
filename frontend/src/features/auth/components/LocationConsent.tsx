import { MapPin } from 'lucide-react'
import { useState } from 'react'
import { errorMessage } from '@/shared/api/client'
import { getCurrentPosition, GeoError } from '@/shared/lib/geolocation'
import { Alert } from '@/shared/ui/Alert'
import { Button } from '@/shared/ui/Button'
import { authApi } from '../api/authApi'
import { useAuth } from '../hooks/useAuth'
import styles from './LocationConsent.module.css'

interface Props {
  onDone?: () => void
}

/**
 * 위치 동의 카드 — 무엇을, 얼마나 정확히 저장하는지 먼저 말하고 묻는다.
 * 원본 GPS가 아니라 ≈1km 단위로 뭉갠 값만 서버에 저장된다.
 */
export function LocationConsent({ onDone }: Props) {
  const { updateUser } = useAuth()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function allow() {
    setPending(true)
    setError(null)
    try {
      const pos = await getCurrentPosition()
      updateUser(await authApi.updateLocation(pos.lat, pos.lng))
      onDone?.()
    } catch (e) {
      setError(e instanceof GeoError ? e.message : errorMessage(e))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={styles.card}>
      <p className={styles.title}>
        <MapPin aria-hidden="true" /> 가까운 이웃을 찾아 드릴까요?
      </p>
      <p className={styles.body}>
        내 위치를 <strong>동네 정도(약 1km)</strong>로만 저장해요. 정확한 주소는 저장하지 않고, 다른
        분께도 보이지 않아요.
      </p>
      {error && <Alert>{error}</Alert>}
      <Button block onClick={allow} disabled={pending}>
        {pending ? '위치 찾는 중…' : '내 위치 사용하기'}
      </Button>
    </div>
  )
}
