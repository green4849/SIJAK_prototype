/** 조사 도우미 — 브라우저 없이. 받침·숫자 읽는 소리에 맞춰 붙는지 */
import { expect, test } from '@playwright/test'
import { eul, eunneun, ieyo, iga } from '../src/shared/lib/josa'

test('받침에 맞는 조사 — 따옴표·숫자도', () => {
  expect(eul('‘알림함’')).toBe('‘알림함’을')
  expect(eul('‘내 포인트’')).toBe('‘내 포인트’를')
  expect(iga('돈·송금 이야기, 급하게 서두르게 하는 말')).toBe('돈·송금 이야기, 급하게 서두르게 하는 말이')
  expect(iga('‘의자 요가’')).toBe('‘의자 요가’가')
  expect(eunneun('산책·등산')).toBe('산책·등산은')
  expect(eunneun('요리')).toBe('요리는')
  expect(ieyo('오전 10시')).toBe('오전 10시예요')
  expect(ieyo('2')).toBe('2예요')
  expect(ieyo('7')).toBe('7이에요')
  expect(ieyo('10')).toBe('10이에요')
  expect(ieyo('13')).toBe('13이에요')
  expect(ieyo('15')).toBe('15예요')
})
