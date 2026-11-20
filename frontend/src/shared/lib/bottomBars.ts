/**
 * 화면 아래에 고정된 막대(`data-bottom-bar`: 하단 탭, 대화 입력줄, 활동 신청 버튼 등)가
 * 차지하는 높이. 그 위에 떠야 하는 것(토스트, 시작이 버튼)이 막대를 가리지 않게 쓴다.
 */
export function bottomBarsHeight(): number {
  let top = window.innerHeight
  for (const el of document.querySelectorAll('[data-bottom-bar]')) {
    const r = el.getBoundingClientRect()
    if (r.height > 0) top = Math.min(top, r.top)
  }
  return Math.max(0, window.innerHeight - top)
}

/**
 * 막대가 생기거나(화면 이동·불러오기 끝) 높이가 바뀔 때마다 알려 준다. 돌려받은 함수로 그만 본다.
 */
export function watchBottomBars(onChange: (height: number) => void): () => void {
  let frame = 0
  const sizes = new ResizeObserver(() => schedule())
  const measure = () => {
    frame = 0
    sizes.disconnect()
    document.querySelectorAll('[data-bottom-bar]').forEach((el) => sizes.observe(el))
    onChange(bottomBarsHeight())
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(measure)
  }
  const tree = new MutationObserver(schedule)
  tree.observe(document.body, { childList: true, subtree: true })
  window.addEventListener('resize', schedule)
  measure()
  return () => {
    if (frame) cancelAnimationFrame(frame)
    sizes.disconnect()
    tree.disconnect()
    window.removeEventListener('resize', schedule)
  }
}
