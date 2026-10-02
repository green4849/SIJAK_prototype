import { useEffect, useRef, useState } from 'react'

export const MAX_RECORD_SEC = 60

type State = 'idle' | 'recording'

function pickMimeType(): string | undefined {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  return candidates.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t))
}

/**
 * 음성 메시지 녹음 — 누르고 있기(hold)가 아니라 '한 번 눌러 시작, 다시 눌러 끝'.
 * 손떨림이 있는 어르신도 쓰기 쉽게.
 */
export function useVoiceRecorder() {
  const [state, setState] = useState<State>('idle')
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const startedAt = useRef(0)
  const timer = useRef<number | null>(null)
  const finish = useRef<((r: { blob: Blob; seconds: number } | null) => void) | null>(null)

  function cleanup() {
    if (timer.current) window.clearInterval(timer.current)
    timer.current = null
    recorder.current?.stream.getTracks().forEach((t) => t.stop())
    recorder.current = null
    setState('idle')
    setSeconds(0)
  }

  useEffect(() => cleanup, [])

  async function start() {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('이 휴대폰에서는 음성 녹음을 할 수 없어요.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = pickMimeType()
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunks.current = []
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' })
        const secs = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000))
        finish.current?.(blob.size ? { blob, seconds: secs } : null)
        finish.current = null
        cleanup()
      }
      recorder.current = rec
      startedAt.current = Date.now()
      rec.start()
      setState('recording')
      timer.current = window.setInterval(() => {
        const s = Math.round((Date.now() - startedAt.current) / 1000)
        setSeconds(s)
        if (s >= MAX_RECORD_SEC) rec.stop() // 너무 길면 자동으로 끝
      }, 250)
    } catch {
      setError('마이크 사용을 허락해 주셔야 음성을 보낼 수 있어요.')
      cleanup()
    }
  }

  /** 녹음을 끝내고 결과를 돌려준다 */
  function stop(): Promise<{ blob: Blob; seconds: number } | null> {
    return new Promise((resolve) => {
      if (!recorder.current || recorder.current.state === 'inactive') return resolve(null)
      finish.current = resolve
      recorder.current.stop()
    })
  }

  function cancel() {
    finish.current = null
    if (recorder.current && recorder.current.state !== 'inactive') {
      recorder.current.onstop = null
      recorder.current.stop()
    }
    cleanup()
  }

  return { state, seconds, error, start, stop, cancel }
}
