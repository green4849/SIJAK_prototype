import { useState } from 'react'
import { errorMessage } from '@/shared/api/client'
import { getCurrentPosition, GeoError } from '@/shared/lib/geolocation'
import { toast } from '@/shared/lib/toast'
import { authApi } from '../api/authApi'
import { locateRegion } from '../lib/locateRegion'
import { useAuth } from './useAuth'

/**
 * 마이페이지 '위치 다시 확인' — 위치 동의를 한 번 더 받고(버튼을 누르는 것이 동의),
 * 지금 위치로 사는 곳과 '같은 동네' 위치를 함께 새로 고친다. 이사한 경우를 위해.
 */
export function useLocationRecheck() {
  const { user, updateUser } = useAuth()
  const [pending, setPending] = useState(false)

  async function recheck() {
    if (!user || pending) return
    setPending(true)
    try {
      const pos = await getCurrentPosition()
      const { regions } = await authApi.options()
      const found = await locateRegion(pos.lat, pos.lng, regions)
      let next = await authApi.updateLocation(pos.lat, pos.lng)
      if (found.code !== user.region_code) next = await authApi.updateMe({ region_code: found.code })
      updateUser(next)
      const label = regions.find((r) => r.code === found.code)?.label ?? next.region_name
      // 시·도 이름은 모두 '시'·'도'로 끝나 받침이 없다 → '예요'·'로'
      toast(found.code === user.region_code ? `지금도 ${label}예요` : `사는 곳을 ${label}로 바꿨어요`)
    } catch (e) {
      toast(e instanceof GeoError ? e.message : errorMessage(e), 'error')
    } finally {
      setPending(false)
    }
  }

  return { recheck, pending }
}
