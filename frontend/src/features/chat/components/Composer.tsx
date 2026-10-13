import { Mic, Send } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { errorMessage } from '@/shared/api/client'
import { Alert } from '@/shared/ui/Alert'
import { Button } from '@/shared/ui/Button'
import { useVoiceRecorder, MAX_RECORD_SEC } from '../hooks/useVoiceRecorder'
import styles from './Composer.module.css'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'

interface Props {
  onSendText: (text: string) => Promise<void>
  onSendVoice: (audio: Blob, seconds: number) => Promise<void>
  disabled?: boolean
  /** 밖에서 입력칸을 채울 때 (대화 주제 추천) — seq 가 바뀔 때마다 text 로 바꾸고 입력칸에 초점 */
  prefill?: { text: string; seq: number }
}

/** ⑤ 아래 입력줄 — 글자 입력 + 보내기, 🎤 한 번 눌러 녹음 시작 / 다시 눌러 보내기 */
export function Composer({ onSendText, onSendVoice, disabled, prefill }: Props) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // 대화 주제를 고르면 입력칸을 그 문구로 (렌더 중에 비교 — effect 안 setState 대신)
  const [seenSeq, setSeenSeq] = useState(prefill?.seq)
  if (prefill && prefill.seq !== seenSeq) {
    setSeenSeq(prefill.seq)
    setText(prefill.text)
  }
  useEffect(() => {
    if (prefill) inputRef.current?.focus()
  }, [prefill])
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
          ref={inputRef}
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
            <Send aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />
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
            <Mic aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />
            <span className={styles.iconText}>말하기</span>
          </button>
        )}
      </div>
    </form>
  )
}
