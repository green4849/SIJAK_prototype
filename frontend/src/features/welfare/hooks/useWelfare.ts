import { useAsync } from '@/shared/lib/useAsync'
import { welfareApi, type WelfareKind } from '../api/welfareApi'

export function useNearbyCenters(kind: WelfareKind | 'all') {
  return useAsync(() => welfareApi.nearby(kind), [kind])
}

export function useCenter(id: string) {
  return useAsync(() => welfareApi.center(id), [id])
}
