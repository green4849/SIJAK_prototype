/**
 * 화면에서 실제로 찾기 — targets.ts(짚을 대상)와 screens.ts(화면 상태)가 쓰는 도구의 구현.
 * 보이는 것만 찾고, 시작이 자신의 창·버튼([data-guide-ui])은 건너뛴다.
 */
import type { Probe } from './screens'
import { TARGETS, type Finder, type TargetId } from './targets'

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

const isShown = (el: Element) =>
  el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden' && !el.closest('[data-guide-ui]')

const labelOf = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim()

const matches = (el: Element, text: string | RegExp) => {
  const label = labelOf(el)
  if (typeof text === 'string') return label === text || el.getAttribute('aria-label') === text
  return text.test(label)
}

/** 링크가 가리키는 앱 안 경로 (GitHub Pages 의 /저장소명/ 은 뗀다) */
function appPath(a: Element): string | null {
  if (!(a instanceof HTMLAnchorElement) || a.origin !== location.origin) return null
  const path = a.pathname.startsWith(BASE) ? a.pathname.slice(BASE.length) : a.pathname
  return path.replace(/\/+$/, '') || '/'
}

const all = (selector: string, within?: string) => {
  const root = within ? document.querySelector(within) : document
  return root ? [...root.querySelectorAll(selector)].filter(isShown) : []
}

const finder: Finder = {
  link: (path, within) => all('a[href]', within).find((a) => appPath(a) === path) ?? null,
  linkUnder: (prefix, within) => all('a[href]', within).find((a) => appPath(a)?.startsWith(prefix)) ?? null,
  text: (selector, text) => all(selector).find((el) => matches(el, text)) ?? null,
  css: (selector) => all(selector)[0] ?? null,
}

export const findTarget = (id: TargetId): Element | null => TARGETS[id].find(finder)

/** 화면이 바뀌거나 불러오는 중일 수 있으니 잠깐 기다리며 찾는다. 끝내 없으면 null */
export function waitForTarget(id: TargetId, timeoutMs = 4000): Promise<Element | null> {
  return new Promise((resolve) => {
    const started = Date.now()
    const look = () => {
      const el = findTarget(id)
      if (el || Date.now() - started > timeoutMs) resolve(el)
      else setTimeout(look, 150)
    }
    look()
  })
}

/**
 * 화면이 목록을 불러오는 중이면 잠깐 기다린다 — 덜 그려진 화면을 보고 "없어요"라고 답하지 않으려고.
 * 오래 걸리면 기다리지 않고 지금 보이는 대로 답한다.
 */
export function settled(timeoutMs = 2000): Promise<void> {
  const loading = () =>
    all('[aria-busy="true"]').length > 0 || all('main [role="status"]').some((el) => /중…|있어요…/.test(labelOf(el)))
  return new Promise((resolve) => {
    const started = Date.now()
    const look = () => (!loading() || Date.now() - started > timeoutMs ? resolve() : void setTimeout(look, 100))
    look()
  })
}

export const probe: Probe = {
  has: (selector, text) => all(selector).some((el) => text === undefined || matches(el, text)),
}
