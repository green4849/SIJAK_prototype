/**
 * 받침에 맞는 조사 붙이기 — "‘알림함’을(를)", "10시이에요" 처럼 기계가 쓴 티가 나는 표기를 쓰지 않으려고.
 * 따옴표·띄어쓰기는 건너뛰고 마지막 글자를 본다. 숫자로 끝나면 읽는 소리로 본다 (2 '이', 7 '칠', 10 '십').
 */
const NO_BATCHIM_DIGITS = new Set(['2', '4', '5', '9']) // 이·사·오·구

function hasBatchim(word: string): boolean {
  const last = word.replace(/[\s'"‘’“”.,!?·)\]]+$/u, '').at(-1)
  if (!last) return false
  if (/[0-9]/.test(last)) return !NO_BATCHIM_DIGITS.has(last) // 0(영·십·백…)·1·3·6·7·8 은 받침
  if (!/[가-힣]/.test(last)) return false
  return (last.charCodeAt(0) - 0xac00) % 28 !== 0
}

/** ‘내 친구 목록’을 · ‘아래 메뉴’를 */
export const eul = (word: string) => `${word}${hasBatchim(word) ? '을' : '를'}`
/** ‘친구 신청’ 버튼이 · ‘대화하기’ 카드가 */
export const iga = (word: string) => `${word}${hasBatchim(word) ? '이' : '가'}`
/** 산책·등산은 · 요리는 */
export const eunneun = (word: string) => `${word}${hasBatchim(word) ? '은' : '는'}`
/** 오전 10시예요 · 답은 7이에요 · 답은 2예요 */
export const ieyo = (word: string) => `${word}${hasBatchim(word) ? '이에요' : '예요'}`
