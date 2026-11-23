import { useLayoutEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/**
 * 새 화면으로 가면 맨 위부터 보이게 — 목록을 내려 보다 상세로 들어가면 중간부터 보이던 것.
 * 뒤로 가기(POP)는 브라우저가 기억한 자리로 돌아가게 그대로 둔다.
 * 같은 화면에서 탭만 바꾸는 것(?category=)은 경로가 같아 움직이지 않는다.
 */
export function ScrollToTop() {
  const { pathname } = useLocation()
  const type = useNavigationType()
  useLayoutEffect(() => {
    if (type !== 'POP') window.scrollTo(0, 0)
  }, [pathname, type])
  return null
}
