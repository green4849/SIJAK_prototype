import { useEffect, useState } from 'react'
import { errorMessage } from '@/shared/api/client'
import { speak, stopSpeaking } from '@/shared/a11y/speak'
import { useAsync } from '@/shared/lib/useAsync'
import { companionApi, type CompanionMessage } from '../api/companionApi'

/**
 * 말동무 대화 — 불러오기 + 보내기.
 * 말로 물어보면 답도 소리로 읽어 준다 (음성 우선, 보고서 4.4.2). 글로 물으면 '듣기' 버튼으로만.
 */
export function useCompanion() {
  const info = useAsync(() => companionApi.info(), [])
  const history = useAsync(() => companionApi.messages(), [])
  const [pending, setPending] = useState<'text' | 'voice' | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 화면을 떠나면 읽던 것 멈춤
  useEffect(() => stopSpeaking, [])

  async function run(kind: 'text' | 'voice', call: () => Promise<{ messages: CompanionMessage[] }>) {
    setPending(kind)
    setError(null)
    try {
      const { messages } = await call()
      history.setData((cur) => [...(cur ?? []), ...messages])
      const answer = messages.find((m) => m.role === 'assistant')
      if (kind === 'voice' && answer) speak(answer.text)
      return true
    } catch (e) {
      setError(errorMessage(e))
      return false
    } finally {
      setPending(null)
    }
  }

  return {
    info: info.data,
    messages: history.data,
    loading: history.loading,
    error: error ?? history.error,
    pending,
    sendText: (text: string) => run('text', () => companionApi.sendText(text)),
    sendVoice: () => run('voice', () => companionApi.sendVoice()),
  }
}
