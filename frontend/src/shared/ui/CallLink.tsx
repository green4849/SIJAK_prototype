import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { IS_DEMO } from '@/shared/lib/demo'
import { toast } from '@/shared/lib/toast'

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  /** 걸 번호 — 숫자 외 글자는 지운다 */
  number: string
}

/**
 * 전화 걸기 링크. 실제 빌드에서는 tel: 그대로.
 * 시연 빌드에서는 걸지 않고 알려 준다 — 시연 중 119·지어낸 번호로 진짜 전화가 가지 않게.
 */
export function CallLink({ number, onClick, ...rest }: Props) {
  const digits = number.replace(/\D/g, '')
  function click(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e)
    if (!IS_DEMO) return
    e.preventDefault()
    toast('시연 화면이라 전화는 걸리지 않아요', 'info')
  }
  return <a href={`tel:${digits}`} onClick={click} {...rest} />
}
