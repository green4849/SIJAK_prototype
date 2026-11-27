import { describe, expect, it } from 'vitest'
import { notifiedLabel, sosSummary } from './sosMessage'

const g = (status: 'sent' | 'failed' | 'not_sent') => ({ name: '김민수', relation: '아들', status })

describe('sosSummary — 서버가 실제로 한 일만 말한다', () => {
  it('모두 보냄', () => {
    expect(sosSummary({ delivery_status: 'sent', notified: [g('sent')] }).title).toBe('보호자에게 문자를 보냈어요')
  })
  it('일부만 · 모두 실패는 직접 전화를 권한다', () => {
    expect(sosSummary({ delivery_status: 'partial', notified: [g('sent'), g('failed')] }).note).toContain('바로 전화')
    expect(sosSummary({ delivery_status: 'failed', notified: [g('failed')] }).title).toBe('문자를 보내지 못했어요')
  })
  it('발송이 꺼져 있으면 기록만 했다고, 보호자가 없으면 119·109', () => {
    expect(sosSummary({ delivery_status: 'not_sent', notified: [g('not_sent')] }).note).toContain('자동으로 알리지는 않았어요')
    expect(sosSummary({ delivery_status: 'not_sent', notified: [] }).note).toContain('119')
  })
  it('보호자별 표시', () => {
    expect([notifiedLabel(g('sent')), notifiedLabel(g('failed')), notifiedLabel(g('not_sent'))]).toEqual(['문자 보냄', '아직 못 보냄', ''])
  })
})
