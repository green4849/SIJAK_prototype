import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ChatMessageData } from '../api/chatApi'

/** 화면 아래에서 이만큼(화면 높이 비율) 안쪽이면 '맨 아래 근처'로 본다 */
const NEAR_BOTTOM_RATIO = 0.5

function isNearBottom() {
  const doc = document.documentElement
  return window.innerHeight + window.scrollY >= doc.scrollHeight - window.innerHeight * NEAR_BOTTOM_RATIO
}

function prefersReducedMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * A2 — 대화 스크롤 규칙
 *  - 처음 열 때 · 내가 보낼 때 → 맨 아래로
 *  - 새 메시지가 왔을 때 맨 아래 근처면 따라 내려가고,
 *    위에서 지난 대화를 읽는 중이면 그대로 두고 '새 메시지 N개'만 센다
 */
export function useStickToBottom(messages: ChatMessageData[]) {
  const nearBottom = useRef(true) // 마지막으로 확인한 위치 (DOM이 바뀌기 전 기준)
  const lastSeenId = useRef<number | null>(null)
  const [unseen, setUnseen] = useState(0)

  const scrollToBottom = useCallback((smooth = false) => {
    // 목록 끝이 아니라 문서 끝까지 — 아래 고정 입력줄에 마지막 말풍선이 가려지지 않게
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto',
    })
    nearBottom.current = true
    setUnseen(0)
  }, [])

  // 사용자가 스크롤할 때 위치 기억, 맨 아래까지 내려오면 '새 메시지' 수 초기화
  useEffect(() => {
    const onScroll = () => {
      nearBottom.current = isNearBottom()
      if (nearBottom.current) setUnseen(0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // 새 메시지가 그려진 직후(화면에 보이기 전) 판단 → 깜빡임 없음
  useLayoutEffect(() => {
    const last = messages.at(-1)
    if (!last || last.id === lastSeenId.current) return
    const prevId = lastSeenId.current
    lastSeenId.current = last.id

    const firstOpen = prevId === null
    const arrived = firstOpen ? [] : messages.filter((m) => m.id > prevId)
    const iSent = arrived.some((m) => m.mine)

    if (firstOpen || iSent || nearBottom.current) {
      scrollToBottom()
    } else {
      setUnseen((n) => n + arrived.filter((m) => !m.mine).length)
    }
  }, [messages, scrollToBottom])

  return { unseen, scrollToBottom }
}
