import { describe, expect, it } from 'vitest'
import { smsErrorMessage } from './firebaseSms'

describe('smsErrorMessage — Firebase 오류를 어르신이 읽을 말로', () => {
  it.each([
    ['auth/invalid-verification-code', '인증번호가 맞지 않아요. 다시 확인해 주세요.'],
    ['auth/code-expired', '인증번호 시간이 지났어요. 다시 받아 주세요.'],
    ['auth/too-many-requests', '요청이 너무 많아요. 잠시 뒤 다시 해 주세요.'],
    ['auth/quota-exceeded', '오늘은 문자를 더 보낼 수 없어요. 내일 다시 해 주세요.'],
    ['auth/invalid-phone-number', '휴대폰 번호를 다시 확인해 주세요.'],
  ])('%s', (code, message) => {
    expect(smsErrorMessage({ code })).toBe(message)
  })

  it('모르는 오류·영어 문구는 화면에 내보내지 않는다', () => {
    expect(smsErrorMessage(new Error('Firebase: Error (auth/internal-error).'))).toBe(
      '인증 문자를 보내지 못했어요. 잠시 후 다시 해 주세요.',
    )
  })
})
