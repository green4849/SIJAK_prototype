import { useState } from 'react'
import { errorMessage } from '@/shared/api/client'
import { useAsync } from '@/shared/lib/useAsync'
import { toast } from '@/shared/lib/toast'
import { notificationApi, type TimeSlot } from '../api/notificationApi'

/** 바꾸는 즉시 저장 (저장 버튼을 따로 찾지 않아도 되게) */
export function useNotificationPrefs() {
  const state = useAsync(() => notificationApi.get(), [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(enabled: boolean, times: TimeSlot[], message: string) {
    setSaving(true)
    setError(null)
    try {
      state.setData(await notificationApi.update({ recommend_enabled: enabled, recommend_times: times }))
      toast(message)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return { ...state, saving, saveError: error, save }
}
