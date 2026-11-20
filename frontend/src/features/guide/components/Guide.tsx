import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useA11yPrefs } from '@/shared/a11y/useA11yPrefs'
import { watchBottomBars } from '@/shared/lib/bottomBars'
import { hasGreeted, onOpenRequest, rememberGreeted } from '../hooks/guideStore'
import { probe, settled, waitForTarget } from '../lib/dom'
import { localEngine } from '../lib/engine'
import { iga } from '../lib/josa'
import { SCREENS, TAB_SCREENS, screenOf } from '../lib/screens'
import type { Face, Pose } from '../lib/sijagi3d'
import { targetName, type TargetId } from '../lib/targets'
import { topicById } from '../lib/topics'
import type { GuideAction, GuideContext, GuideEngine, GuideReply, Mood, WalkStep } from '../lib/types'
import { GuidePanel, type Entry } from './GuidePanel'
import { ACTOR_TALL, ACTOR_WIDE, SijagiActor } from './SijagiActor'
import { Spotlight, type SpotPlace } from './Spotlight'
import styles from './Guide.module.css'

/** 서버 없는 시연 빌드 — 시연이라 실제와 다른 점을 답에 밝힌다 */
const DEMO = import.meta.env.VITE_DEMO === '1'
const SCREEN_QUESTION = '이 화면에서 뭘 해야 해요?'
/** 실제 AI를 붙일 때 바꿔 끼우는 자리 (docs/tasks/C14-sijagi-guide.md) */
const engine: GuideEngine = localEngine

/** 시작이 크기 — 구석에 서 있을 때 / 말할 때 / 짚어 줄 때 (ACTOR_TALL 120px 에 곱한다) */
const SCALE = { corner: 0.7, card: 0.86, spot: 0.8 }
/** 본문 칸 폭 (tokens.css --page-max / --page-max-wide) — 넓은 화면에서는 그 바깥 빈 곳에 선다 */
const PAGE = { narrow: 640, wide: 960 }
/** 구석에 설 때 화면 끝·아래 고정 막대와 띄우는 거리(px) */
const EDGE = { right: 12, bottom: 14, onBar: 6 }
const FACE: Record<Mood, Face> = { hello: 'smile', happy: 'happy', think: 'think', sorry: 'think', care: 'worry' }

interface Spot {
  el: Element
  say: string
}

interface Walk {
  steps: WalkStep[]
  /** 지금까지 짚어 준 걸음 */
  index: number
  /** 화면이 바뀌지 않는 걸음을 누른 뒤에는 잠깐만 다음 걸음을 기다린다 */
  expires?: number
}

/**
 * 시작이 앱 가이드 (C14) — 시작이가 직접 나와서 안내한다.
 *  · 평소: 구석에 시작이만 서 있다 (아래 고정 막대 위, 자판이 올라오면 비킨다)
 *  · 처음 온 화면: 먼저 한마디 건넨다
 *  · 누르면: 앞으로 나와 말한다 — 말풍선이 곧 창. 지금 화면을 기준으로 답한다
 *  · 짚어 주기: 그 버튼 옆으로 가서 가리킨다. 누르는 것은 사용자가 한다
 * 앱 사용법만 맡는다 — 일상 이야기는 말동무(C8), 자주 묻는 질문 목록은 도움말.
 */
export function Guide() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { prefs } = useA11yPrefs()
  const screen = screenOf(pathname)
  const def = SCREENS[screen]
  const signedIn = !def.guest

  const [open, setOpen] = useState(false)
  const [log, setLog] = useState<{ path: string; entries: Entry[]; at: number }>({ path: '', entries: [], at: 0 })
  const [spot, setSpot] = useState<Spot | null>(null)
  const [place, setPlace] = useState<SpotPlace | null>(null)
  const [tracking, setTracking] = useState(false)
  const [praise, setPraise] = useState(false)
  const [cardAt, setCardAt] = useState<{ left: number; top: number } | null>(null)
  const [gesture, setGesture] = useState<Pose | null>(null)
  const [hop, setHop] = useState(0)
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [yielding, setYielding] = useState(false)
  const [bottom, setBottom] = useState(0)
  const [view, setView] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  const walk = useRef<Walk | null>(null)
  const lastReply = useRef<GuideReply | undefined>(undefined)
  const nextId = useRef(1)
  const launcher = useRef<HTMLButtonElement>(null)
  const refocus = useRef(false)
  const gestureTimer = useRef(0)
  const praiseTimer = useRef(0)

  // 화면이 바뀌면 말풍선과 짚어 주기는 접는다 (렌더 중 비교 — effect 안 setState 대신)
  const [seenPath, setSeenPath] = useState(pathname)
  if (seenPath !== pathname) {
    setSeenPath(pathname)
    setOpen(false)
    setSpot(null)
    setPlace(null)
    setHint(null)
  }

  /** 답의 성격에 맞춰 잠깐 몸짓을 한다 */
  const react = useCallback((reply: GuideReply) => {
    const pose: Pose | null = reply.mood === 'hello' ? 'wave' : reply.mood === 'happy' ? 'cheer' : null
    window.clearTimeout(gestureTimer.current)
    setGesture(pose)
    if (reply.mood === 'happy') setHop((n) => n + 1)
    if (pose) gestureTimer.current = window.setTimeout(() => setGesture(null), 1800)
  }, [])

  /** 시작이를 부른다. 다른 화면에서 나눈 말은 지우고 지금 화면 인사부터 */
  const openPanel = useCallback(
    (extra?: GuideReply) => {
      walk.current = null
      setSpot(null)
      setPlace(null)
      setHint(null)
      const greeting: Entry = {
        id: 0,
        reply: {
          id: 'greeting',
          kind: 'chat',
          mood: 'hello',
          text: '네, 뭐가 궁금하세요?',
        },
      }
      const added: Entry[] = extra ? [{ id: nextId.current++, reply: extra }] : []
      setLog((cur) => {
        const kept = cur.path === pathname ? cur.entries : []
        const entries = kept.length || extra ? [...kept, ...added] : [greeting]
        return { path: pathname, entries, at: extra || !kept.length ? entries.length - 1 : cur.at }
      })
      react(extra ?? greeting.reply)
      setHop((n) => n + 1)
      setOpen(true)
    },
    [pathname, react],
  )

  const closePanel = useCallback(() => {
    refocus.current = true
    setOpen(false)
  }, [])

  // 닫으면 초점을 시작이에게 돌려 준다 (화면 낭독기·키보드)
  useEffect(() => {
    if (open || !refocus.current) return
    refocus.current = false
    launcher.current?.focus()
  }, [open])

  // 도움말 등 다른 화면에서 부를 때
  useEffect(() => onOpenRequest(() => openPanel()), [openPanel])

  // 아래 고정 막대(탭·입력줄·신청 버튼) 높이와 화면 크기 — 그 위, 그 안에 선다
  useEffect(() => watchBottomBars(setBottom), [])
  useEffect(() => {
    const measure = () => setView({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  /** 짚을 것이 지금 화면에 없을 때 — 없는 버튼을 가리키지 않고 그대로 말한다 */
  const sayMissing = useCallback(
    (target: TargetId) =>
      openPanel({
        id: 'missing',
        kind: 'unknown',
        mood: 'sorry',
        text: `${iga(targetName(target))} 지금은 안 보여요. 잠시 뒤에 다시 물어봐 주세요.`,
        actions: [{ kind: 'ask', label: SCREEN_QUESTION, question: SCREEN_QUESTION }],
      }),
    [openPanel],
  )

  const pointAt = useCallback((el: Element, say: string) => {
    window.clearTimeout(praiseTimer.current) // 앞 걸음의 '잘하셨어요' 마무리가 새로 짚은 자리를 지우지 않게
    setPlace(null)
    setTracking(false)
    setPraise(false)
    setSpot({ el, say })
    setHop((n) => n + 1)
  }, [])

  /** 같이 가 보기 — 지금 화면에 해당하는 걸음을 찾아 짚는다. 걸음마다 누르는 것은 사용자 */
  const stepOn = useCallback(
    (timeoutMs: number) => {
      const w = walk.current
      if (!w) return undefined
      if (w.expires && Date.now() > w.expires) {
        walk.current = null
        return undefined
      }
      const here = screenOf(pathname)
      const next = w.steps.findLastIndex((s, i) => i > w.index && s.on.includes(here))
      if (next < 0) {
        walk.current = null
        return undefined
      }
      let cancelled = false
      void waitForTarget(w.steps[next].target, timeoutMs).then((el) => {
        if (cancelled || walk.current !== w) return
        if (!el) {
          walk.current = null
          sayMissing(w.steps[next].target)
          return
        }
        w.index = next
        w.expires = undefined
        pointAt(el, w.steps[next].say)
      })
      return () => {
        cancelled = true
      }
    },
    [pathname, sayMissing, pointAt],
  )

  // 사용자가 짚은 곳을 눌러 화면이 바뀌면 다음 걸음으로
  useEffect(() => stepOn(4000), [stepOn])

  function runAction(action: GuideAction) {
    if (action.kind === 'ask') return void ask(action.question)
    if (action.kind === 'go') {
      setOpen(false)
      navigate(action.to)
      return
    }
    if (action.kind === 'show') {
      setOpen(false)
      void waitForTarget(action.target, 1500).then((el) => (el ? pointAt(el, action.say) : sayMissing(action.target)))
      return
    }
    if (action.kind === 'walk') {
      setOpen(false)
      walk.current = { steps: action.steps, index: -1 }
      if (action.steps.some((s) => s.on.includes(screen))) stepOn(1500)
      else navigate(action.via) // 길의 첫 화면이 아니면 그 화면으로 옮기고, 바뀐 화면에서 이어 짚는다
    }
  }

  async function ask(question: string) {
    if (busy) return
    setBusy(true) // 누른 것이 받아들여졌다는 것을 바로 보여 준다 (화면을 기다리는 동안 또 누르지 않게)
    await settled() // 화면이 아직 불러오는 중이면 다 그려진 뒤의 상태를 보고 답한다
    const context: GuideContext = {
      pathname,
      screen,
      variant: def.variant?.(probe) ?? '',
      signedIn,
      demo: DEMO,
      last: lastReply.current,
    }
    const reply = await engine.ask(question, context)
    if (!reply.run) lastReply.current = reply
    const entry: Entry = { id: nextId.current++, question, reply }
    setLog((cur) => ({ ...cur, entries: [...cur.entries, entry], at: cur.entries.length }))
    setBusy(false)
    react(reply)
    if (reply.run) runAction(reply.run)
  }

  /** 사용자가 짚은 곳을 직접 눌렀다 — 잠깐 기뻐하고 물러난다 */
  function onActed() {
    setPraise(true)
    setHop((n) => n + 1)
    praiseTimer.current = window.setTimeout(() => {
      setSpot((cur) => (cur === spot ? null : cur))
      setPlace(null)
      setPraise(false)
    }, 700)
    const w = walk.current
    if (!w) return
    if (w.index >= w.steps.length - 1) walk.current = null
    else w.expires = Date.now() + 8000
  }

  function endSpot() {
    walk.current = null
    setSpot(null)
    setPlace(null)
  }

  // 짚은 곳 옆에 자리를 잡은 뒤에는 스크롤을 바로 따라간다 (미끄러지며 뒤처지지 않게)
  const placed = Boolean(place)
  useEffect(() => {
    if (!placed) return
    const timer = window.setTimeout(() => setTracking(true), 650)
    return () => window.clearTimeout(timer)
  }, [placed])

  const enabled = !def.hidden
  const resting = !open && !spot
  const showResting = enabled && prefs.guide && resting && !yielding

  // 처음 온 화면에서는 시작이가 먼저 한마디 건넨다 — 잠깐만, 화면을 만지면 바로 접는다
  useEffect(() => {
    if (!enabled || !prefs.guide) return
    const text = SCREENS[screen].hint
    if (!text || hasGreeted(screen)) return
    const hide = () => setHint(null)
    const show = window.setTimeout(() => {
      setHint(text)
      rememberGreeted(screen)
      window.addEventListener('scroll', hide, { passive: true, once: true })
      window.addEventListener('pointerdown', hide, { once: true })
    }, 1200)
    const done = window.setTimeout(hide, 1200 + 6500)
    return () => {
      window.clearTimeout(show)
      window.clearTimeout(done)
      window.removeEventListener('scroll', hide)
      window.removeEventListener('pointerdown', hide)
    }
  }, [screen, enabled, prefs.guide])

  // 자판이 올라왔거나 지금 쓰는 칸과 겹치면 비켜 준다 — 입력칸을 가리지 않는다
  useEffect(() => {
    const keyboardUp = () => {
      const vv = window.visualViewport
      return Boolean(vv && window.innerHeight - vv.height > 150)
    }
    const overlapsField = () => {
      const field = document.activeElement
      const me = launcher.current
      if (!me || !(field instanceof HTMLElement) || !field.matches('input, textarea, [contenteditable="true"]')) return false
      if (field.closest('[data-guide-ui]')) return false
      const a = me.getBoundingClientRect()
      const b = field.getBoundingClientRect()
      return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
    }
    const check = () => setYielding((was) => keyboardUp() || (was ? document.activeElement?.matches('input, textarea') === true : overlapsField()))
    document.addEventListener('focusin', check)
    document.addEventListener('focusout', check)
    window.visualViewport?.addEventListener('resize', check)
    return () => {
      document.removeEventListener('focusin', check)
      document.removeEventListener('focusout', check)
      window.visualViewport?.removeEventListener('resize', check)
    }
  }, [])

  // ── 구석에 설 자리: 본문 기둥 옆에 빈 자리가 있으면(태블릿·PC) 그 옆, 없으면(휴대폰) 기둥 안 오른쪽 아래.
  // 화면 끝에 바짝 붙이지 않는다 — 그림자가 잘리고, 휴대폰 브라우저의 아래 막대에 닿아 보인다
  const wide = ACTOR_WIDE * SCALE.corner
  const beside = (view.w - (TAB_SCREENS.includes(screen) ? PAGE.wide : PAGE.narrow)) / 2
  const cornerRight = Math.max(EDGE.right, beside - (wide + 28))
  const overContent = cornerRight + wide > beside

  // 본문 위에 설 때만 화면 맨 끝을 시작이 키만큼 더 비운다 — 끝까지 내리면 마지막 버튼이 시작이 밑에 깔리지 않는다.
  // 본문 기둥 옆에 설 때는 비우지 않는다. 아래 끝까지 그림이 닿는 화면(시작 화면)도 비우지 않고 그림 위에 선다
  const laneOn = enabled && prefs.guide && overContent && !def.bleed
  useLayoutEffect(() => {
    const root = document.documentElement
    if (laneOn) root.style.setProperty('--guide-lane', `${Math.round(ACTOR_TALL * SCALE.corner) + 6}px`)
    else root.style.removeProperty('--guide-lane')
  }, [laneOn])

  if (!enabled) return null

  // ── 시작이가 설 자리
  const floor = view.h - bottom
  const corner = { x: view.w - cornerRight - wide / 2, y: floor - (bottom > 0 ? EDGE.onBar : EDGE.bottom) }
  const current = log.entries[log.at]
  const actor =
    spot && place
      ? { ...place, scale: SCALE.spot, pose: praise ? ('cheer' as Pose) : place.pose, face: 'happy' as Face, yaw: praise ? 0 : place.yaw }
      : open && cardAt && current
        ? { x: cardAt.left + 16 + (ACTOR_WIDE * SCALE.card) / 2, y: cardAt.top + 10, scale: SCALE.card, pose: gesture ?? 'rest', face: busy ? ('think' as Face) : FACE[current.reply.mood], yaw: 10 }
        : { ...corner, scale: SCALE.corner, pose: (hint ? 'wave' : 'rest') as Pose, face: 'smile' as Face, yaw: hint ? 4 : -14 }
  // 시작이는 한 번 그리면 계속 둔다 (3D를 다시 불러오지 않게) — 비켜 줄 때는 숨기기만 한다
  const showActor = showResting || open || Boolean(spot)

  const suggestions = [
    SCREEN_QUESTION,
    ...def.suggest
      .map(topicById)
      .filter((t) => t && (signedIn || t.audience === 'any'))
      .map((t) => t!.ask),
  ]

  return (
    <>
      <SijagiActor
        {...actor}
        hidden={!showActor}
        hop={hop}
        lively={!resting || Boolean(hint)}
        tracking={tracking && Boolean(spot && place)}
        button={showResting ? { label: '시작이에게 앱 사용법 물어보기', onClick: () => openPanel() } : undefined}
        buttonRef={launcher}
      />

      {showResting && hint && (
        <p
          className={styles.hint}
          data-guide-ui
          aria-live="polite"
          style={{ right: view.w - corner.x + wide / 2 + 6, bottom: view.h - corner.y + ACTOR_TALL * SCALE.corner * 0.36 } as CSSProperties}
        >
          <span className="sr-only">시작이: </span>
          {hint}
        </p>
      )}

      {open && current && (
        <GuidePanel
          entry={current}
          busy={busy}
          suggestions={suggestions}
          onAsk={(q) => void ask(q)}
          onAction={runAction}
          onClose={closePanel}
          onPrev={log.at > 0 ? () => setLog((cur) => ({ ...cur, at: cur.at - 1 })) : undefined}
          onNext={log.at < log.entries.length - 1 ? () => setLog((cur) => ({ ...cur, at: cur.at + 1 })) : undefined}
          bottomOffset={bottom}
          onRect={setCardAt}
        />
      )}

      {spot && !open && (
        <Spotlight
          key={spot.say}
          el={spot.el}
          say={spot.say}
          bottomOffset={bottom}
          scale={SCALE.spot}
          onPlace={setPlace}
          onActed={onActed}
          onDone={endSpot}
          onAskAgain={() => openPanel()}
        />
      )}
    </>
  )
}
