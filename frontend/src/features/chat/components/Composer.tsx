import { Mic, Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { errorMessage } from '@/shared/api/client'
import { Alert } from '@/shared/ui/Alert'
import { Button } from '@/shared/ui/Button'
import { useVoiceRecorder, MAX_RECORD_SEC } from '../hooks/useVoiceRecorder'
import styles from './Composer.module.css'

interface Props {
  onSendText: (text: string) => Promise<void>
  onSendVoice: (audio: Blob, seconds: number) => Promise<void>
  disabled?: boolean
}

/** ⑤ 아래 입력줄 — 글자 입력 + 보내기, 🎤 한 번 눌러 녹음 시작 / 다시 눌러 보내기 */
export function Composer({ onSendText, onSendVoice, disabled }: Props) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rec = useVoiceRecorder()

  async function run(fn: () => Promise<void>) {
    setSending(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSending(false)
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const t = text.trim()
    if (!t) return
    void run(async () => {
      await onSendText(t)
      setText('')
    })
  }

  async function finishRecording() {
    const result = await rec.stop()
    if (result) await run(() => onSendVoice(result.blob, result.seconds))
  }

  if (rec.state === 'recording')
    return (
      <div className={styles.recording} role="status">
        <p className={styles.recLabel}>
          <span className={styles.dot} aria-hidden="true" /> 녹음 중 {rec.seconds}초
          <span className={styles.recHint}> (최대 {MAX_RECORD_SEC}초)</span>
        </p>
        <div className={styles.recActions}>
          <Button onClick={finishRecording}>다 했어요, 보내기</Button>
          <Button variant="secondary" onClick={rec.cancel}>
            취소
          </Button>
        </div>
      </div>
    )

  return (
    <form className={styles.composer} onSubmit={submit}>
      {(error || rec.error) && <Alert>{error ?? rec.error}</Alert>}
      <div className={styles.row}>
        <label className="sr-only" htmlFor="composer-input">
          보낼 메시지
        </label>
        <input
          id="composer-input"
          className={styles.input}
          placeholder="메시지를 입력하세요"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled || sending}
          maxLength={500}
          autoComplete="off"
        />
        {text.trim() ? (
          <button type="submit" className={styles.iconBtn} disabled={sending} aria-label="보내기">
            <Send aria-hidden="true" />
            <span className={styles.iconText}>보내기</span>
          </button>
        ) : (
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.mic}`}
            onClick={rec.start}
            disabled={disabled || sending}
            aria-label="음성으로 말하기"
          >
            <Mic aria-hidden="true" />
            <span className={styles.iconText}>말하기</span>
          </button>
        )}
      </div>
    </form>
  )
}
