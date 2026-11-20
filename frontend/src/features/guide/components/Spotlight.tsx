import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Button } from '@/shared/ui/Button'
import type { Pose } from '../lib/sijagi3d'
import { ACTOR_TALL, ACTOR_WIDE } from './SijagiActor'
import { tidy } from './tidy'
import styles from './Guide.module.css'

/** 짚어 줄 때 시작이가 설 자리(발끝)와 몸짓 */
export interface SpotPlace {
  x: number
  y: number
  pose: Pose
  yaw: number
}

interface Props {
  /** 짚을 화면 속 요소 */
  el: Element
  say: string
  /** 아래 고정 막대 높이 — 말풍선이 막대를 가리지 않게 */
  bottomOffset: number
  /** 짚을 때 시작이의 크기 배율 */
  scale: number
  onPlace: (place: SpotPlace) => void
  /** 사용자가 짚은 곳을 직접 눌렀다 */
  onActed: () => void
  onDone: () => void
  onAskAgain: () => void
}

const PAD = 6
const GAP = 10

/** 화면에 붙어 있어(하단 메뉴 등) 스크롤로 옮길 수 없는 요소인지 */
function isPinned(el: Element): boolean {
  for (let node: Element | null = el; node && node !== document.body; node = node.parentElement)
    if (getComputedStyle(node).position === 'fixed') return true
  return false
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/**
 * 짚어 주기 — 그 버튼에 테두리를 두르고, 시작이가 그 옆으로 가서 가리킨다.
 * 화면을 어둡게 덮지 않고 테두리는 누름을 막지 않는다 — 누르는 것은 사용자다.
 * 시작이는 버튼 옆(자리가 없으면 위), 말풍선은 그 아래(자리가 없으면 위) — 둘 다 그 버튼을 가리지 않는다.
 */
export function Spotlight({ el, say, bottomOffset, scale, onPlace, onActed, onDone, onAskAgain }: Props) {
  const ring = useRef<HTMLDivElement>(null)
  const bubble = useRef<HTMLDivElement>(null)
  const [tail, setTail] = useState<'top' | 'bottom'>('top')
  const live = useRef({ onActed, onDone, onPlace, bottomOffset })
  useEffect(() => {
    live.current = { onActed, onDone, onPlace, bottomOffset }
  })

  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const pinned = isPinned(el)
    const tall = ACTOR_TALL * scale
    const wide = ACTOR_WIDE * scale
    // 짚은 곳을 화면 위쪽으로 옮긴다 — 옆(또는 위)에 시작이가 서고, 아래로 말풍선이 들어갈 만큼.
    // 말풍선이 길면(큰 글씨) 그만큼 더 위로 올린다
    if (!pinned) {
      const r = el.getBoundingClientRect()
      const lowest = window.innerHeight - live.current.bottomOffset - 8 - (bubble.current?.offsetHeight ?? 0) - 20
      const beside = r.right + GAP + wide <= window.innerWidth - 4 || r.left - GAP - wide >= 4
      const half = beside ? Math.max(r.height, tall) / 2 : r.height / 2
      const highest = beside ? half + 6 : tall + 10 + r.height / 2
      const centre = Math.max(highest, Math.min(window.innerHeight * 0.36, lowest - half))
      window.scrollBy({ top: r.top + r.height / 2 - centre, behavior: reduce ? 'auto' : 'smooth' })
    }
    // 화면 낭독기·키보드 사용자는 바로 그 버튼에서 시작하도록. 입력칸은 자판이 올라와 화면을 가리므로 초점을 옮기지 않는다
    if (el instanceof HTMLElement && !el.matches('input, textarea')) el.focus({ preventScroll: true })

    let frame = 0
    let sent = ''
    const follow = () => {
      if (!el.isConnected) return live.current.onDone()
      const r = el.getBoundingClientRect()
      const vw = window.innerWidth
      const floor = window.innerHeight - live.current.bottomOffset - 8
      if (ring.current)
        Object.assign(ring.current.style, {
          transform: `translate(${r.left - PAD}px, ${r.top - PAD}px)`,
          width: `${r.width + PAD * 2}px`,
          height: `${r.height + PAD * 2}px`,
        })

      // 시작이 자리: 옆 → (자리가 없거나 아래 고정 막대의 버튼이면) 위 → 아래
      const low = r.bottom > floor - 40
      const right = r.right + GAP + wide <= vw - 4
      const left = r.left - GAP - wide >= 4
      const above = r.top - tall - 6 >= 4
      const side = low ? 'above' : right ? 'right' : left ? 'left' : above ? 'above' : 'below'
      const beside = clamp(r.top + r.height / 2 + tall / 2, tall + 6, floor)
      const along = clamp(r.left + r.width * 0.74, wide / 2 + 4, vw - wide / 2 - 4)
      const place: SpotPlace =
        side === 'right'
          ? { x: r.right + GAP + wide / 2, y: beside, pose: 'pointL', yaw: 20 }
          : side === 'left'
            ? { x: r.left - GAP - wide / 2, y: beside, pose: 'pointR', yaw: -20 }
            : side === 'above'
              ? { x: along, y: r.top - 4, pose: 'wave', yaw: 0 }
              : { x: along, y: r.bottom + 8 + tall, pose: 'cheer', yaw: 0 }
      const key = `${Math.round(place.x)},${Math.round(place.y)},${place.pose}`
      if (key !== sent) {
        sent = key
        live.current.onPlace(place)
      }

      // 말풍선 자리: 짚은 곳과 시작이의 아래 → 들어갈 자리가 없으면 그 위
      const box = bubble.current
      if (box) {
        const h = box.offsetHeight
        const under = Math.max(r.bottom, side === 'above' ? r.bottom : place.y) + 16
        const over = Math.min(r.top, place.y - tall) - 14 - h
        // 그 아래에 들어가면 아래, 아니면 위. 둘 다 안 되면 짚은 곳을 가리지 않는 쪽(아래)으로 화면 끝까지 쓴다
        const fits = under + h <= floor
        const top = side !== 'above' && fits ? under : over >= 6 ? over : fits || under + h <= window.innerHeight - 4 ? under : 6
        box.style.top = `${Math.round(top)}px`
        const b = box.getBoundingClientRect()
        box.style.setProperty('--tail-x', `${clamp(place.x - b.left - 9, 22, b.width - 40)}px`)
        setTail(top > place.y - tall ? 'top' : 'bottom')
      }
      frame = requestAnimationFrame(follow)
    }
    follow()

    const acted = () => live.current.onActed()
    el.addEventListener('click', acted)
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('click', acted)
    }
  }, [el, scale])

  return (
    <div data-guide-ui>
      <div ref={ring} className={styles.ring} aria-hidden="true" />
      <div ref={bubble} className={styles.pointer} data-tail={tail} style={{ top: 6 } as CSSProperties} role="group" aria-label="시작이 길 안내">
        <p role="status" className={styles.pointerSay}>
          {tidy(say)}
        </p>
        <div className={styles.pair}>
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
