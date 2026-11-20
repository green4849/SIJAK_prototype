import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Button } from '@/shared/ui/Button'
import { Sijagi } from './Sijagi'
import { tidy } from './tidy'
import styles from './Guide.module.css'

interface Props {
  /** 짚을 화면 속 요소 */
  el: Element
  say: string
  /** 아래 고정 막대 높이 — 말풍선이 막대를 가리지 않게 */
  bottomOffset: number
  /** 사용자가 짚은 곳을 직접 눌렀다 */
  onActed: () => void
  onDone: () => void
  onAskAgain: () => void
}

const PAD = 6
const GAP = 8

/** 화면에 붙어 있어(하단 메뉴 등) 스크롤로 옮길 수 없는 요소인지 */
function isPinned(el: Element): boolean {
  for (let node: Element | null = el; node && node !== document.body; node = node.parentElement)
    if (getComputedStyle(node).position === 'fixed') return true
  return false
}

/**
 * 짚어 주기 — 화면을 어둡게 덮지 않고 테두리만 두른다. 테두리는 누름을 막지 않으므로
 * 사용자가 그 버튼을 직접 누른다 (시작이가 대신 누르지 않는다).
 * 말풍선이 그 버튼을 가리지 않게: 말풍선은 위에 두고 짚은 곳을 그 아래 빈 자리 가운데로 옮기며,
 * 옮길 수 없으면(화면 맨 위의 버튼, 하단 메뉴) 말풍선이 반대쪽으로 비킨다.
 */
export function Spotlight({ el, say, bottomOffset, onActed, onDone, onAskAgain }: Props) {
  const ring = useRef<HTMLDivElement>(null)
  const callout = useRef<HTMLDivElement>(null)
  const [side, setSide] = useState<'top' | 'bottom'>('top')
  const floor = useRef(bottomOffset)
  useEffect(() => {
    floor.current = bottomOffset
  })
  // 테두리 위치를 화면에 맞춰 계속 따라가게 하면서도, 부모가 새 함수를 넘겨도 다시 시작하지 않도록
  const handlers = useRef({ onActed, onDone })
  useEffect(() => {
    handlers.current = { onActed, onDone }
  })

  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const zones = () => {
      const h = callout.current?.offsetHeight ?? 0
      const bottom = window.innerHeight - floor.current - GAP
      return { top: GAP + h, bottom: bottom - h, floor: bottom }
    }
    // 말풍선(위) 아래에 남는 자리의 가운데로 짚은 곳을 옮긴다
    if (!isPinned(el)) {
      const r = el.getBoundingClientRect()
      const z = zones()
      const middle = (z.top + z.floor) / 2
      window.scrollBy({ top: r.top + r.height / 2 - middle, behavior: reduce ? 'auto' : 'smooth' })
    }
    // 화면 낭독기·키보드 사용자는 바로 그 버튼에서 시작하도록. 입력칸은 자판이 올라와 화면을 가리므로 초점을 옮기지 않는다
    if (el instanceof HTMLElement && !el.matches('input, textarea')) el.focus({ preventScroll: true })

    let frame = 0
    const follow = () => {
      if (!el.isConnected) return handlers.current.onDone()
      const r = el.getBoundingClientRect()
      const box = ring.current
      if (box) {
        box.style.transform = `translate(${r.left - PAD}px, ${r.top - PAD}px)`
        box.style.width = `${r.width + PAD * 2}px`
        box.style.height = `${r.height + PAD * 2}px`
      }
      // 말풍선 자리와 겹치면 반대쪽으로 (둘 다 겹치면 그대로 둔다)
      const z = zones()
      const underTop = r.top < z.top + GAP
      const underBottom = r.bottom > z.bottom - GAP
      setSide((cur) => (cur === 'top' ? (underTop && !underBottom ? 'bottom' : 'top') : underBottom && !underTop ? 'top' : 'bottom'))
      frame = requestAnimationFrame(follow)
    }
    follow()

    const acted = () => handlers.current.onActed()
    el.addEventListener('click', acted)
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('click', acted)
    }
  }, [el])

  return (
    <div data-guide-ui>
      <div ref={ring} className={styles.ring} aria-hidden="true" />
      <div
        ref={callout}
        className={styles.callout}
        data-side={side}
        style={{ '--guide-bottom': `${bottomOffset}px` } as CSSProperties}
        role="group"
        aria-label="시작이 안내"
      >
        <div className={styles.calloutSay}>
          <Sijagi mood="happy" size="2.6rem" />
          <p role="status">{tidy(say)}</p>
        </div>
        <div className={styles.calloutActions}>
          <Button variant="secondary" onClick={onDone}>
            알겠어요
          </Button>
          <Button variant="secondary" onClick={onAskAgain}>
            다시 묻기
          </Button>
        </div>
      </div>
    </div>
  )
}
