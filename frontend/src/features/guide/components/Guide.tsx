import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useA11yPrefs } from '@/shared/a11y/useA11yPrefs'
import { watchBottomBars } from '@/shared/lib/bottomBars'
import { hasMetGuide, onOpenRequest, rememberGuide } from '../hooks/guideStore'
import { probe, settled, waitForTarget } from '../lib/dom'
import { localEngine } from '../lib/engine'
import { SCREENS, TAB_SCREENS, screenOf } from '../lib/screens'
import { targetName, type TargetId } from '../lib/targets'
import { topicById } from '../lib/topics'
import type { GuideAction, GuideContext, GuideEngine, GuideReply, WalkStep } from '../lib/types'
import { GuidePanel, type Turn } from './GuidePanel'
import { Sijagi } from './Sijagi'
import { Spotlight } from './Spotlight'
import styles from './Guide.module.css'

/** 서버 없는 시연 빌드 — 시연이라 실제와 다른 점을 답에 밝힌다 */
const DEMO = import.meta.env.VITE_DEMO === '1'
const SCREEN_QUESTION = '이 화면에서 뭘 해야 해요?'
/** 실제 AI를 붙일 때 바꿔 끼우는 자리 (docs/tasks/C14-sijagi-guide.md) */
const engine: GuideEngine = localEngine

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
 * 시작이 앱 가이드 (C14) — 곁에 있는 길잡이.
 *  · 구석의 '물어보기' 버튼: 아래 고정 막대 위에 앉고, 자판이 올라오면 비켜 준다
 *  · 안내 창: 지금 화면을 기준으로 답한다. 화면을 덮지 않는다
 *  · 짚어 주기: 버튼이 어디 있는지 테두리로 알려 주고, 누르는 것은 사용자가 한다
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
  const [log, setLog] = useState<{ path: string; turns: Turn[] }>({ path: '', turns: [] })
  const [spot, setSpot] = useState<Spot | null>(null)
  const [yielding, setYielding] = useState(false)
  const [bottom, setBottom] = useState(0)
  const [met, setMet] = useState(hasMetGuide)
  const walk = useRef<Walk | null>(null)
  const lastReply = useRef<GuideReply | undefined>(undefined)
  const nextId = useRef(1)
  const launcher = useRef<HTMLButtonElement>(null)
  const refocus = useRef(false)

  // 화면이 바뀌면 창과 짚어 주기는 접는다 (렌더 중 비교 — effect 안 setState 대신)
  const [seenPath, setSeenPath] = useState(pathname)
  if (seenPath !== pathname) {
    setSeenPath(pathname)
    setOpen(false)
    setSpot(null)
  }

  const guideTurn = (reply: GuideReply): Turn => ({ id: nextId.current++, role: 'guide', reply })

  /** 창을 연다. 다른 화면에서 나눈 말은 지우고 지금 화면 인사부터 */
  const openPanel = useCallback(
    (extra?: GuideReply) => {
      walk.current = null
      setSpot(null)
      const greeting: Turn = {
        id: 0,
        role: 'guide',
        reply: {
          id: 'greeting',
          kind: 'chat',
          mood: 'hello',
          text: `안녕하세요! 지금은 ‘${SCREENS[screenOf(pathname)].name}’ 화면이에요. 무엇이 궁금하세요?`,
        },
      }
      const added = extra ? [guideTurn(extra)] : []
      setLog((cur) => {
        const kept = cur.path === pathname ? cur.turns : []
        return { path: pathname, turns: kept.length || extra ? [...kept, ...added] : [greeting] }
      })
      setOpen(true)
      setMet(true)
      rememberGuide()
    },
    [pathname],
  )

  const closePanel = useCallback(() => {
    refocus.current = true
    setOpen(false)
  }, [])

  // 처음 보는 사람에게 띄운 말풍선은 잠깐만 — 화면을 만지기 시작하면 바로 비킨다
  const [hint, setHint] = useState(true)
  useEffect(() => {
    if (met || !hint) return
    const hide = () => setHint(false)
    const timer = setTimeout(hide, 8000)
    window.addEventListener('scroll', hide, { passive: true, once: true })
    window.addEventListener('pointerdown', hide, { once: true })
    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', hide)
      window.removeEventListener('pointerdown', hide)
    }
  }, [met, hint])

  // 닫으면 초점을 '물어보기' 버튼으로 돌려 준다 (화면 낭독기·키보드)
  useEffect(() => {
    if (open || !refocus.current) return
    refocus.current = false
    launcher.current?.focus()
  }, [open])

  // 도움말 등 다른 화면에서 부를 때
  useEffect(() => onOpenRequest(() => openPanel()), [openPanel])

  // 아래 고정 막대(탭·입력줄·신청 버튼) 높이 — 그 위에 앉는다
  useEffect(() => watchBottomBars(setBottom), [])

  /** 짚을 것이 지금 화면에 없을 때 — 없는 버튼을 가리키지 않고 그대로 말한다 */
  const sayMissing = useCallback(
    (target: TargetId) =>
      openPanel({
        id: 'missing',
        kind: 'unknown',
        mood: 'sorry',
        text: `${targetName(target)} — 지금 화면에서는 보이지 않아요. 화면이 아직 바뀌는 중이거나, 지금은 쓸 수 없는 상태일 수 있어요.`,
        actions: [{ kind: 'ask', label: SCREEN_QUESTION, question: SCREEN_QUESTION }],
      }),
    [openPanel],
  )

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
        setSpot({ el, say: w.steps[next].say })
      })
      return () => {
        cancelled = true
      }
    },
    [pathname, sayMissing],
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
      void waitForTarget(action.target, 1500).then((el) => (el ? setSpot({ el, say: action.say }) : sayMissing(action.target)))
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
    const mine: Turn = { id: nextId.current++, role: 'user', text: question }
    setLog((cur) => ({ ...cur, turns: [...cur.turns, mine] }))
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
    const theirs = guideTurn(reply)
    setLog((cur) => ({ ...cur, turns: [...cur.turns, theirs] }))
    if (reply.run) runAction(reply.run)
  }

  function onActed() {
    setSpot(null)
    const w = walk.current
    if (!w) return
    if (w.index >= w.steps.length - 1) walk.current = null
    else w.expires = Date.now() + 8000
  }

  function endSpot() {
    walk.current = null
    setSpot(null)
  }

  const enabled = !def.hidden
  const showLauncher = enabled && prefs.guide && !open && !spot && !yielding

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

  // 화면 맨 끝에 버튼 높이만큼 빈 줄을 둔다 — 끝까지 내리면 마지막 버튼·말풍선이 시작이 밑에 깔리지 않는다
  const laneOn = enabled && prefs.guide
  useLayoutEffect(() => {
    const root = document.documentElement
    if (!laneOn) return void root.style.removeProperty('--guide-lane')
    const el = launcher.current
    if (!el) return // 창이 열려 버튼이 없는 동안은 앞의 값을 그대로 (화면이 들썩이지 않게)
    const set = () => root.style.setProperty('--guide-lane', `${el.offsetHeight + 16}px`)
    set()
    const sizes = new ResizeObserver(set)
    sizes.observe(el)
    return () => sizes.disconnect()
  }, [laneOn, showLauncher])

  if (!enabled) return null

  const suggestions = [
    SCREEN_QUESTION,
    ...def.suggest
      .map(topicById)
      .filter((t) => t && (signedIn || t.audience === 'any'))
      .map((t) => t!.ask),
  ]

  return (
    <>
      {showLauncher && (
        <div
          className={styles.dock}
          data-guide-ui
          data-wide={TAB_SCREENS.includes(screen)}
          style={{ '--guide-bottom': `${bottom}px` } as CSSProperties}
        >
          {!met && hint && (screen === 'welcome' || screen === 'home') && (
            <p className={styles.hint} aria-hidden="true">
              막히면 저를 눌러 주세요
            </p>
          )}
          <button
            ref={launcher}
            type="button"
            className={styles.launcher}
            aria-label="시작이에게 앱 사용법 물어보기"
            aria-haspopup="dialog"
            onClick={() => openPanel()}
          >
            <Sijagi mood="hello" size="2.75rem" />
            <span>물어보기</span>
          </button>
        </div>
      )}

      {open && (
        <GuidePanel
          turns={log.turns}
          suggestions={suggestions}
          onAsk={(q) => void ask(q)}
          onAction={runAction}
          onClose={closePanel}
          bottomOffset={bottom}
        />
      )}

      {spot && !open && (
        <Spotlight
          key={spot.say}
          el={spot.el}
          say={spot.say}
          bottomOffset={bottom}
          onActed={onActed}
          onDone={endSpot}
          onAskAgain={() => openPanel()}
        />
      )}
    </>
  )
}
