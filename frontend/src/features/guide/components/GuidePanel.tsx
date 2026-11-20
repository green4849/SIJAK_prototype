import { ChevronLeft, ChevronRight, Mic, Phone, Square, Volume2, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react'
import { canListen, listen } from '@/shared/a11y/listen'
import type { Contrast, FontScale } from '@/shared/a11y/preferences'
import { canSpeak, speak, stopSpeaking } from '@/shared/a11y/speak'
import { useA11yPrefs } from '@/shared/a11y/useA11yPrefs'
import { Button } from '@/shared/ui/Button'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'
import { OptionGrid } from '@/shared/ui/OptionGrid'
import type { GuideAction, GuideReply } from '../lib/types'
import { tidy } from './tidy'
import styles from './Guide.module.css'

/** 시작이의 말 한 번 — 사용자가 물은 말(있으면)과 그 답 */
export interface Entry {
  id: number
  question?: string
  reply: GuideReply
}

interface Props {
  entry: Entry
  /** 답을 고르는 중 (화면이 다 그려지기를 기다린다) — 그동안은 다시 묻지 못한다 */
  busy: boolean
  /** 처음 인사 때 권하는 질문 (지금 화면 기준) */
  suggestions: string[]
  onAsk: (question: string) => void
  onAction: (action: GuideAction) => void
  onClose: () => void
  /** 앞·뒤의 말 다시 보기 (없으면 버튼을 숨긴다) */
  onPrev?: () => void
  onNext?: () => void
  /** 아래 고정 막대 높이 — 말풍선이 그 위에 앉는다 */
  bottomOffset: number
  /** 말풍선의 왼쪽 위 모서리 — 시작이가 그 위에 올라선다 */
  onRect: (rect: { left: number; top: number }) => void
}

// 화면 설정(SettingsPage)과 같은 이름
const SCALES = [
  { value: '1', label: '보통' },
  { value: '2', label: '크게' },
  { value: '3', label: '더 크게' },
  { value: '4', label: '아주 크게' },
]
const CONTRASTS = [
  { value: 'normal', label: '기본 화면' },
  { value: 'high', label: '선명한 화면' },
]

/** 답 안에서 바로 고르는 화면 설정 — 자기 화면에만 영향을 주고 언제든 되돌릴 수 있는 것만 */
function SettingControl({ which }: { which: 'font' | 'contrast' }) {
  const { prefs, update } = useA11yPrefs()
  return which === 'font' ? (
    <OptionGrid legend="글자 크기" options={SCALES} selected={[String(prefs.fontScale)]} onToggle={(v) => update({ fontScale: Number(v) as FontScale })} />
  ) : (
    <OptionGrid legend="화면 대비" options={CONTRASTS} selected={[prefs.contrast]} onToggle={(v) => update({ contrast: v as Contrast })} />
  )
}

const spoken = (r: GuideReply) => [r.text, ...(r.steps ?? []), r.note ?? ''].join(' ')

/**
 * 시작이의 말풍선 — 제목 달린 창이 아니라, 앞으로 나온 시작이가 하는 말이다.
 * 한 번에 한 말만 보여 주고(스크롤할 대화 기록이 없다) 앞의 말은 '앞의 말'로 다시 본다.
 * 화면을 덮지 않고 아래 고정 막대 위에 앉으며, '닫기'·Esc 로 언제든 닫는다.
 */
export function GuidePanel({ entry, busy, suggestions, onAsk, onAction, onClose, onPrev, onNext, bottomOffset, onRect }: Props) {
  const card = useRef<HTMLElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  // 말로 하기가 되는 기기에서는 큰 버튼 두 개가 먼저, '글로 쓰기'를 누르면 입력칸이 나온다
  const [writing, setWriting] = useState(() => !canListen())
  const [speaking, setSpeaking] = useState(false)
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [micNote, setMicNote] = useState<string | null>(null)
  const { reply } = entry

  useEffect(() => {
    card.current?.focus()
    return stopSpeaking
  }, [])

  // 말풍선 자리를 알려 준다 — 답 길이에 따라 높이가 달라지면 시작이도 따라 옮긴다
  const report = useRef(onRect)
  useEffect(() => {
    report.current = onRect
  })
  useLayoutEffect(() => {
    const el = card.current
    if (!el) return
    const tell = () => {
      const r = el.getBoundingClientRect()
      report.current({ left: r.left, top: r.top })
    }
    tell()
    const sizes = new ResizeObserver(tell)
    sizes.observe(el)
    window.addEventListener('resize', tell)
    return () => {
      sizes.disconnect()
      window.removeEventListener('resize', tell)
    }
  }, [bottomOffset])

  // 새 말은 처음부터 읽도록 맨 위로
  useLayoutEffect(() => {
    if (body.current) body.current.scrollTop = 0
  }, [entry.id])

  useEffect(() => {
    if (!listening) return
    return listen({
      onText: (t) => {
        setHeard(t)
        setMicNote(null)
      },
      onError: (message) => {
        setListening(false)
        setWriting(true)
        setMicNote(message)
      },
    })
  }, [listening, attempt])

  function quiet() {
    stopSpeaking()
    setSpeaking(false)
  }

  function ask(question: string) {
    const q = question.trim()
    if (!q || busy) return
    quiet()
    setText('')
    onAsk(q)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    ask(text)
  }

  function startListening() {
    quiet()
    setHeard('')
    setMicNote(null)
    setListening(true)
  }

  function finishListening() {
    const said = heard.trim()
    if (!said) {
      setMicNote('잘 못 들었어요. 한 번 더 말씀해 주세요.')
      setAttempt((n) => n + 1)
      return
    }
    setListening(false)
    ask(said)
  }

  function toggleSpeak() {
    if (speaking) return quiet()
    setSpeaking(true)
    speak(spoken(reply), () => setSpeaking(false))
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
    }
  }

  const actions = reply.actions ?? []
  const calls = actions.filter((a) => a.kind === 'call')
  const settings = actions.filter((a) => a.kind === 'setting')
  const moves = actions.filter((a) => a.kind === 'show' || a.kind === 'walk' || a.kind === 'go')
  const asks = actions.filter((a) => a.kind === 'ask')
  const choices = reply.id === 'greeting' ? suggestions : []

  return (
    <section
      ref={card}
      tabIndex={-1}
      className={styles.card}
      style={{ '--guide-bottom': `max(${bottomOffset}px, env(safe-area-inset-bottom))` } as CSSProperties}
      role="dialog"
      aria-modal="false"
      aria-label="시작이 안내"
      data-guide-ui
      data-kind={reply.kind}
      aria-busy={busy}
      onKeyDown={onKeyDown}
    >
      <button type="button" className={styles.close} onClick={onClose}>
        닫기
        <X aria-hidden="true" size={ICON.sm} strokeWidth={ICON_STROKE} />
      </button>

      <div ref={body} className={styles.body}>
        <div key={entry.id} className={styles.speech} role="log" aria-live="polite" aria-label="시작이가 하는 말">
          {entry.question && (
            <p className={styles.asked}>
              <span className="sr-only">내가 물은 말: </span>
              {entry.question}
            </p>
          )}
          <p className={styles.say}>
            <span className="sr-only">시작이: </span>
            {tidy(reply.text)}
          </p>
          {reply.steps && (
            <ol className={styles.steps}>
              {reply.steps.map((s) => (
                <li key={s}>{tidy(s)}</li>
              ))}
            </ol>
          )}

          {/* 전화가 있으면 다른 무엇보다 먼저 */}
          {calls.map((a, i) => a.kind === 'call' && (
            <a key={a.number} href={`tel:${a.number}`} className={styles.call} data-first={i === 0}>
              <Phone aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />
              {a.label}
            </a>
          ))}

          {settings.map((a) => a.kind === 'setting' && <SettingControl key={a.which} which={a.which} />)}

          {moves.map((a, i) => 'label' in a && (
            <Button key={a.label} variant={i === 0 && calls.length === 0 ? 'primary' : 'secondary'} block onClick={() => onAction(a)}>
              {a.label}
            </Button>
          ))}

          {asks.map((a) => a.kind === 'ask' && (
            <button key={a.label} type="button" className={styles.choice} onClick={() => ask(a.question)}>
              {a.label}
            </button>
          ))}
          {choices.map((s) => (
            <button key={s} type="button" className={styles.choice} onClick={() => ask(s)}>
              {s}
            </button>
          ))}

          {reply.note && <p className={styles.note}>{tidy(reply.note)}</p>}
        </div>

        {busy && (
          <p className={styles.waiting} role="status">
            화면을 살펴보고 있어요…
          </p>
        )}

        <div className={styles.tools}>
          {onPrev && (
            <button type="button" className={styles.tool} onClick={onPrev}>
              <ChevronLeft aria-hidden="true" size={ICON.sm} strokeWidth={ICON_STROKE} />
              앞의 말
            </button>
          )}
          {onNext && (
            <button type="button" className={styles.tool} onClick={onNext}>
              다음 말
              <ChevronRight aria-hidden="true" size={ICON.sm} strokeWidth={ICON_STROKE} />
            </button>
          )}
          {canSpeak() && (
            <button type="button" className={styles.tool} aria-pressed={speaking} onClick={toggleSpeak}>
              {speaking ? (
                <Square aria-hidden="true" size={ICON.inline} strokeWidth={ICON_STROKE} />
              ) : (
                <Volume2 aria-hidden="true" size={ICON.inline} strokeWidth={ICON_STROKE} />
              )}
              {speaking ? '멈춤' : '소리로 듣기'}
            </button>
          )}
        </div>
      </div>

      <div className={styles.foot}>
        {micNote && !listening && (
          <p className={styles.micNote} role="status">
            {micNote}
          </p>
        )}
        {listening ? (
          <div className={styles.listening} role="status">
            <p className={styles.listeningLabel}>
              <Mic aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} /> 듣고 있어요. 편하게 말씀하세요.
            </p>
            {heard && <p className={styles.heard}>{heard}</p>}
            {micNote && <p className={styles.micNote}>{micNote}</p>}
            <div className={styles.pair}>
              <Button onClick={finishListening}>다 말했어요</Button>
              <Button variant="secondary" onClick={() => setListening(false)}>
                취소
              </Button>
            </div>
          </div>
        ) : writing ? (
          <form className={styles.form} onSubmit={submit}>
            <label className="sr-only" htmlFor="guide-input">
              시작이에게 물어볼 말
            </label>
            <input
              id="guide-input"
              ref={input}
              className={styles.input}
              placeholder="평소 말하듯 물어보세요"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={100}
              autoComplete="off"
              enterKeyHint="send"
            />
            <button type="submit" className={styles.send} disabled={!text.trim()}>
              물어보기
            </button>
          </form>
        ) : (
          <div className={styles.pair}>
            <Button onClick={startListening}>
              <Mic aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />
              말로 하기
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setWriting(true)
                requestAnimationFrame(() => input.current?.focus())
              }}
            >
              글로 쓰기
            </Button>
          </div>
        )}
        {/* 무엇이 답하는지, 그리고 급할 때 갈 곳은 늘 보이게 */}
        <p className={styles.fine}>
          준비해 둔 안내예요 ·{' '}
          <a href="tel:119" className={styles.urgent}>
            급할 땐 119 전화
          </a>
        </p>
      </div>
    </section>
  )
}
