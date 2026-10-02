import { useEffect, useState } from 'react'
import { errorMessage } from '@/shared/api/client'
import { authApi, type SignupOptions } from '../api/authApi'

export function useSignupOptions() {
  const [options, setOptions] = useState<SignupOptions | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    authApi
      .options()
      .then((o) => alive && setOptions(o))
      .catch((e) => alive && setError(errorMessage(e)))
    return () => {
      alive = false
    }
  }, [])

  return { options, error }
}
