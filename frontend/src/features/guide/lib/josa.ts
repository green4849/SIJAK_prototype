/**
 * 받침에 맞는 조사 붙이기 — "‘알림함’을(를)" 처럼 기계가 쓴 티가 나는 표기를 쓰지 않으려고.
 * 따옴표·띄어쓰기는 건너뛰고 마지막 한글 글자의 받침을 본다.
 */
const hasBatchim = (word: string) => {
  const last = word.replace(/[^가-힣]/g, '').at(-1)
  return Boolean(last) && (last!.charCodeAt(0) - 0xac00) % 28 !== 0
}

/** ‘내 친구 목록’을 · ‘아래 메뉴’를 */
export const eul = (word: string) => `${word}${hasBatchim(word) ? '을' : '를'}`
/** ‘친구 신청’ 버튼이 · ‘대화하기’ 카드가 */
export const iga = (word: string) => `${word}${hasBatchim(word) ? '이' : '가'}`
