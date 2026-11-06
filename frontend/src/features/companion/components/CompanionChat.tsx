import { MapPin, Mic, Phone, Send, Square, Volume2 } from 'lucide-react'
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { canListen, listen } from '@/shared/a11y/listen'
import { canSpeak, speak, stopSpeaking } from '@/shared/a11y/speak'
import { formatDate, formatTime, isSameDay } from '@/shared/lib/datetime'
import { Alert } from '@/shared/ui/Alert'
import { Button } from '@/shared/ui/Button'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'
import type { CompanionMessage } from '../api/companionApi'
import { useCompanion } from '../hooks/useCompanion'
import { CompanionAvatar } from './CompanionAvatar'
import styles from './Companion.module.css'

interface Props {
  /** 추천 활동 → 상세 화면 경로 (activity feature 경로라 페이지에서 받는다) */
  activityHref: (activityId: string) => string
  /** 위기 안내 카드에 덧붙일 동작 (예: 보호자에게 알리기 — 다른 feature) */
  crisisExtra?: ReactNode
}

/** AI 말동무 대화 — 말풍선 목록 + 아래 고정 입력줄(말하기가 기본) */
export function CompanionChat({ activityHref, crisisExtra }: Props) {
  const { info, messages, loading, error, pending, sendText, sendVoice } = useCompanion()
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  // 말로 하기 — 알아들은 글(실시간), 다시 듣기 횟수, 마이크 문제 안내
  const [heard, setHeard] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [hint, setHint] = useState<string | null>(null)
  const [micError, setMicError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!listening || !canListen()) return
    return listen({
      onText: (t) => {
        setHeard(t)
        setHint(null)
      },
      onError: (message) => {
        setListening(false)
        setMicError(message)
        inputRef.current?.focus()
      },
    })
  }, [listening, attempt])

  function startListening() {
    stopSpeaking()
    setHeard('')
    setHint(null)
    setMicError(null)
    setListening(true)
  }

  function finishListening() {
    // 음성 인식을 못 쓰는 기기(데모) — 서버가 받아쓰는 자리라 글 없이 보낸다
    if (!canListen()) {
      setListening(false)
      void sendVoice()
      return
    }
    const said = heard.trim()
    if (!said) {
      setHint('잘 못 들었어요. 한 번 더 말씀해 주세요.')
      setAttempt((n) => n + 1) // 다시 듣기
      return
    }
    setListening(false)
    void sendVoice(said)
  }
  const [speakingId, setSpeakingId] = useState<number | null>(null)

  // 입력줄은 화면 아래 고정 — 실제 높이만큼 목록 아래를 비운다 (chat 과 같은 방식)
  const barRef = useRef<HTMLDivElement>(null)
  const [barHeight, setBarHeight] = useState<number>()
  useEffect(() => {
    const el = barRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setBarHeight(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 새 말이 생기면 맨 아래로 (말동무와는 1:1이라 '위에서 읽는 중' 처리는 생략)
  const count = (messages?.length ?? 0) + (pending ? 1 : 0)
  useLayoutEffect(() => {
    if (count) window.scrollTo({ top: document.documentElement.scrollHeight })
  }, [count, barHeight])

  function submit(e: FormEvent) {
    e.preventDefault()
    const t = text.trim()
    if (!t || pending) return
    void sendText(t).then((ok) => ok && setText(''))
  }

  function toggleListen(m: CompanionMessage) {
    if (speakingId === m.id) {
      stopSpeaking()
      setSpeakingId(null)
      return
    }
    setSpeakingId(m.id)
    speak(m.text, () => setSpeakingId((cur) => (cur === m.id ? null : cur)))
  }

  const last = messages?.at(-1)
  const showStarters = !pending && info && info.starters.length > 0 && last?.role === 'assistant' && last.safety !== 'crisis'

  return (
    <div className={styles.view} style={barHeight ? ({ '--bar-h': `${barHeight}px` } as CSSProperties) : undefined}>
      <div className={styles.scroll}>
        {loading && <p role="status">불러오는 중…</p>}
        {messages && (
          <ol className={styles.list} aria-label="말동무와 나눈 이야기" aria-live="polite">
            {messages.map((m, i) => {
              const prev = messages[i - 1]
              const newDay = !prev || !isSameDay(prev.created_at, m.created_at)
              const mine = m.role === 'user'
              return (
                <Fragment key={m.id}>
                  {newDay && (
                    <li className={styles.day}>
                      <span>{formatDate(m.created_at)}</span>
                    </li>
                  )}
                  <li className={styles.row} data-mine={mine}>
                    {!mine && <CompanionAvatar />}
                    <div className={styles.stack}>
                      <span className="sr-only">{mine ? '내가 한 말' : '말동무'}: </span>
                      <div className={styles.bubble}>
                        {mine && m.input_type === 'voice' && (
                          <Mic className={styles.voiceMark} role="img" aria-label="말로 함" size={ICON.inline} strokeWidth={ICON_STROKE} />
                        )}
                        {m.text}
                      </div>
                      <div className={styles.meta}>
                        <time dateTime={m.created_at}>{formatTime(m.created_at)}</time>
                        {!mine && canSpeak() && (
                          <button
                            type="button"
                            className={styles.listen}
                            aria-pressed={speakingId === m.id}
                            onClick={() => toggleListen(m)}
                          >
                            {speakingId === m.id ? (
                              <Square aria-hidden="true" size={ICON.inline} strokeWidth={ICON_STROKE} />
                            ) : (
                              <Volume2 aria-hidden="true" size={ICON.inline} strokeWidth={ICON_STROKE} />
                            )}
                            {speakingId === m.id ? '멈춤' : '듣기'}
                          </button>
                        )}
                      </div>
                      {m.suggestion && (
                        <Link to={activityHref(m.suggestion.activity_id)} className={styles.suggestion}>
                          <MapPin aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />
                          <span className={styles.suggestionText}>
                            <span className={styles.suggestionTitle}>{m.suggestion.title}</span>
                            <span className={styles.suggestionMeta}>{m.suggestion.schedule_text}</span>
                          </span>
                        </Link>
                      )}
                      {m.safety === 'crisis' && <CrisisHelp extra={crisisExtra} />}
                    </div>
                  </li>
                </Fragment>
              )
            })}
            {pending && (
              <li className={styles.row} data-mine="false">
                <CompanionAvatar />
                <div className={styles.stack}>
                  <div className={styles.bubble} role="status">
                    <span className="sr-only">{pending === 'voice' ? '알아듣고 답하는 중' : '답하는 중'}</span>
                    <span className={styles.typing} aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                  </div>
                </div>
              </li>
            )}
          </ol>
        )}
        {showStarters && (
          <div className={styles.starters} role="group" aria-label="이렇게 말해 보세요">
            {info.starters.map((s) => (
              <button key={s} type="button" className={styles.starter} onClick={() => void sendText(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={barRef} className={styles.bar} data-bottom-bar>
        {(micError ?? error) && <Alert>{micError ?? error}</Alert>}
        {listening ? (
          <div className={styles.listening} role="status">
            <p className={styles.listeningLabel}>
              <span className={styles.pulse} aria-hidden="true">
                <Mic size={ICON.md} strokeWidth={ICON_STROKE} />
              </span>
              듣고 있어요
            </p>
            {heard && (
              <p className={styles.heard} aria-live="polite">
                {heard}
              </p>
            )}
            {hint && <p className={styles.listeningHint}>{hint}</p>}
            <div className={styles.listeningActions}>
              <Button
                onClick={finishListening}
              >
                다 말했어요
              </Button>
              <Button variant="secondary" onClick={() => setListening(false)}>
                취소
              </Button>
            </div>
          </div>
        ) : (
          <form className={styles.composer} onSubmit={submit}>
            <label className="sr-only" htmlFor="companion-input">
              말동무에게 할 말
            </label>
            <input
              id="companion-input"
              ref={inputRef}
              className={styles.input}
              placeholder="글로 써도 돼요"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={loading || Boolean(pending)}
              maxLength={500}
              autoComplete="off"
            />
            {text.trim() ? (
              <button type="submit" className={styles.iconBtn} disabled={Boolean(pending)} aria-label="보내기">
                <Send aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />
                <span className={styles.iconText}>보내기</span>
              </button>
            ) : (
              <button
                type="button"
                className={styles.iconBtn}
                onClick={startListening}
                disabled={loading || Boolean(pending)}
                aria-label="말로 하기"
              >
                <Mic aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />
                <span className={styles.iconText}>말하기</span>
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

/** 위기 신호가 있을 때 — 상담 전화로 바로 (자살예방 상담전화 109, 24시간) */
function CrisisHelp({ extra }: { extra?: ReactNode }) {
  return (
    <div className={styles.crisis} role="note" aria-label="도움받을 곳">
      <a href="tel:109" className={styles.call}>
        <Phone aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />
        109 상담 전화하기
      </a>
      {extra}
    </div>
  )
}
