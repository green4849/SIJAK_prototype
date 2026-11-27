import type { SosResult } from '../api/emergencyApi'

export type SosNotified = SosResult['notified'][number]

/**
 * 긴급 도움 결과를 어르신이 읽을 말로 — 서버가 실제로 한 일만 말한다.
 * (문자를 보냈는지는 서버 결과 delivery_status·보호자별 status 그대로)
 */
export function sosSummary(r: Pick<SosResult, 'delivery_status' | 'notified'>): {
  title: string
  note: string
  tone: 'ok' | 'warn'
} {
  switch (r.delivery_status) {
    case 'sent':
      return { title: '보호자에게 문자를 보냈어요', note: '곧 연락이 올 거예요. 급하면 아래에서 바로 전화하세요.', tone: 'ok' }
    case 'partial':
      return {
        title: '일부 보호자에게만 문자를 보냈어요',
        note: '못 보낸 분께는 잠시 뒤 다시 보내요. 급하면 아래에서 바로 전화하세요.',
        tone: 'warn',
      }
    case 'failed':
      return {
        title: '문자를 보내지 못했어요',
        note: '잠시 뒤 다시 보내요. 지금 아래에서 바로 전화해 주세요.',
        tone: 'warn',
      }
    default:
      return r.notified.length > 0
        ? {
            title: '도움 요청을 기록했어요',
            note: '보호자에게 자동으로 알리지는 않았어요. 급하면 아래에서 직접 전화해 주세요.',
            tone: 'warn',
          }
        : {
            title: '도움 요청을 기록했어요',
            note: '등록된 보호자가 없어요. 급하면 아래 119나 109로 바로 전화해 주세요.',
            tone: 'warn',
          }
  }
}

/** 보호자 한 분 옆에 붙일 말 */
export const notifiedLabel = (n: SosNotified) =>
  n.status === 'sent' ? '문자 보냄' : n.status === 'failed' ? '아직 못 보냄' : ''
