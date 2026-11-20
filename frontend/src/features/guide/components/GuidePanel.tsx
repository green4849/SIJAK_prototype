import { Mic, Phone, Square, Volume2, X } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react'
import { canListen, listen } from '@/shared/a11y/listen'
import type { Contrast, FontScale } from '@/shared/a11y/preferences'
import { canSpeak, speak, stopSpeaking } from '@/shared/a11y/speak'
import { useA11yPrefs } from '@/shared/a11y/useA11yPrefs'
import { Button } from '@/shared/ui/Button'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'
import { OptionGrid } from '@/shared/ui/OptionGrid'
import type { GuideAction, GuideReply } from '../lib/types'
import { Sijagi } from './Sijagi'
import { tidy } from './tidy'
import styles from './Guide.module.css'

export type Turn = { id: number; role: 'user'; text: string } | { id: number; role: 'guide'; reply: GuideReply }

interface Props {
  turns: Turn[]
  /** 지금 화면에서 먼저 권하는 질문 */
  suggestions: string[]
  onAsk: (question: string) => void
  onAction: (action: GuideAction) => void
  onClose: () => void
  /** 아래 고정 막대 높이 — 창이 그 위에 앉는다 */
  bottomOffset: number
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

function GuideMessage({ reply, last, speaking, onSpeak, onAsk, onAction }: {
  reply: GuideReply
  /** 방금 붙은 말 — 창이 이 줄부터 보이게 맞춘다 */
  last: boolean
  speaking: boolean
  onSpeak: () => void
  onAsk: (q: string) => void
  onAction: (a: GuideAction) => void
}) {
  const actions = reply.actions ?? []
  const settings = actions.filter((a) => a.kind === 'setting')
  const calls = actions.filter((a) => a.kind === 'call')
  const moves = actions.filter((a) => a.kind === 'show' || a.kind === 'walk' || a.kind === 'go')
  const asks = actions.filter((a) => a.kind === 'ask')

  return (
    <li className={styles.row} data-role="guide" data-kind={reply.kind} data-last={last}>
      <Sijagi mood={reply.mood} size="2.5rem" />
      <div className={styles.bubble}>
        <span className="sr-only">시작이: </span>
        <p className={styles.text}>{tidy(reply.text)}</p>
        {reply.steps && (
          <ol className={styles.steps}>
            {reply.steps.map((s) => (
              <li key={s}>{tidy(s)}</li>
            ))}
          </ol>
        )}

        {/* 전화가 있으면 다른 무엇보다 먼저 */}
        {calls.map((a) => a.kind === 'call' && (
          <a key={a.number} href={`tel:${a.number}`} className={styles.call}>
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

        {asks.length > 0 && (
          <div className={styles.chips}>
            {asks.map((a) => a.kind === 'ask' && (
              <button key={a.label} type="button" className={styles.chip} onClick={() => onAsk(a.question)}>
                {a.label}
              </button>
            ))}
          </div>
        )}

        {reply.note && <p className={styles.note}>{tidy(reply.note)}</p>}

        {canSpeak() && (
          <button type="button" className={styles.listen} aria-pressed={speaking} onClick={onSpeak}>
            {speaking ? (
              <Square aria-hidden="true" size={ICON.inline} strokeWidth={ICON_STROKE} />
            ) : (
              <Volume2 aria-hidden="true" size={ICON.inline} strokeWidth={ICON_STROKE} />
            )}
            {speaking ? '멈춤' : '소리로 듣기'}
          </button>
        )}
      </div>
    </li>
  )
}

/**
 * 시작이 안내 창 — 화면을 덮는 창이 아니라 아래에 붙는 창이라, 묻고 있는 화면이 위에 그대로 보인다.
 * '닫기'·Esc 로 언제든 닫고, 답은 미리 준비한 것이라는 점을 머리에 늘 적어 둔다.
 */
export function GuidePanel({ turns, suggestions, onAsk, onAction, onClose, bottomOffset }: Props) {
  const titleId = useId()
  const title = useRef<HTMLHeadingElement>(null)
  const log = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [speakingId, setSpeakingId] = useState<number | null>(null)

  // 말로 묻기 — 브라우저 음성 인식 (말동무와 같은 shared/a11y/listen)
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [micNote, setMicNote] = useState<string | null>(null)

  useEffect(() => {
    title.current?.focus()
    return stopSpeaking
  }, [])

  useEffect(() => {
    if (!listening) return
    return listen({
      onText: (t) => {
        setHeard(t)
        setMicNote(null)
      },
      onError: (message) => {
        setListening(false)
        setMicNote(message)
      },
    })
  }, [listening, attempt])

  // 새 말이 붙으면 그 말의 첫 줄이 보이게 (긴 답의 끝이 아니라 처음부터 읽도록)
  const last = turns.at(-1)
  useLayoutEffect(() => {
    const box = log.current
    const item = box?.querySelector<HTMLElement>('[data-last="true"]')
    if (box && item) box.scrollTop = Math.max(0, item.offsetTop - box.offsetTop - 8)
  }, [last?.id])

  function ask(question: string) {
    const q = question.trim()
    if (!q) return
    stopSpeaking()
    setSpeakingId(null)
    setText('')
    onAsk(q)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    ask(text)
  }

  function startListening() {
    stopSpeaking()
    setSpeakingId(null)
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

  function toggleSpeak(turn: Turn) {
    if (turn.role !== 'guide') return
    if (speakingId === turn.id) {
      stopSpeaking()
      setSpeakingId(null)
      return
    }
    setSpeakingId(turn.id)
    speak(spoken(turn.reply), () => setSpeakingId((cur) => (cur === turn.id ? null : cur)))
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
    }
  }

  const lastGuide = [...turns].reverse().find((t) => t.role === 'guide')
  const mood = lastGuide?.role === 'guide' ? lastGuide.reply.mood : 'hello'
  // 방금 묻고 답을 받았으면 그 묶음의 처음(내 질문)부터 보이게
  const lastStart = last?.role === 'guide' && turns.at(-2)?.role === 'user' ? turns.at(-2)!.id : last?.id

  return (
    <section
      className={styles.panel}
      style={{ '--guide-bottom': `max(${bottomOffset}px, env(safe-area-inset-bottom))` } as CSSProperties}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      data-guide-ui
      onKeyDown={onKeyDown}
    >
      <header className={styles.head}>
        <Sijagi mood={mood} size="2.75rem" />
        <h2 id={titleId} ref={title} tabIndex={-1} className={styles.title}>
          시작이에게 물어보기
        </h2>
        <button type="button" className={styles.close} onClick={onClose}>
          <X aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />
          <span>닫기</span>
        </button>
        {/* 무엇이 답하는지 늘 밝혀 둔다 — AI나 상담원이 아니다 */}
        <p className={styles.caption}>앱 사용법을 알려 드려요 · 미리 준비한 답이에요</p>
      </header>

      <div ref={log} className={styles.log}>
        <ol className={styles.turns} role="log" aria-live="polite" aria-label="시작이와 나눈 안내">
          {turns.map((turn) =>
            turn.role === 'user' ? (
              <li key={turn.id} className={styles.row} data-role="user" data-last={turn.id === lastStart}>
                <p className={styles.bubble}>
                  <span className="sr-only">내 질문: </span>
                  {turn.text}
                </p>
              </li>
            ) : (
              <GuideMessage
                key={turn.id}
                reply={turn.reply}
                last={turn.id === lastStart}
                speaking={speakingId === turn.id}
                onSpeak={() => toggleSpeak(turn)}
                onAsk={ask}
                onAction={onAction}
              />
            ),
          )}
        </ol>

        {suggestions.length > 0 && (
          <div className={styles.suggest} role="group" aria-labelledby={`${titleId}-suggest`}>
            <p id={`${titleId}-suggest`} className={styles.suggestLabel}>
              이런 것을 물어볼 수 있어요
            </p>
            <div className={styles.chips}>
              {suggestions.map((s) => (
                <button key={s} type="button" className={styles.chip} onClick={() => ask(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
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
            <div className={styles.listeningActions}>
              <Button onClick={finishListening}>다 말했어요</Button>
              <Button variant="secondary" onClick={() => setListening(false)}>
                취소
              </Button>
            </div>
          </div>
        ) : (
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
            {!text.trim() && canListen() ? (
              <button type="button" className={styles.send} onClick={startListening} aria-label="말로 물어보기">
                <Mic aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />
                <span>말하기</span>
              </button>
            ) : (
              <button type="submit" className={styles.send} disabled={!text.trim()}>
                물어보기
              </button>
            )}
          </form>
        )}
        <a href="tel:119" className={styles.urgent}>
          <Phone aria-hidden="true" size={ICON.inline} strokeWidth={ICON_STROKE} />
          급할 땐 119 전화
        </a>
      </div>
    </section>
  )
}
