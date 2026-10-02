/** backend/app/domains/risk/rules.py 의 사본 — 위험 대화 1단계 키워드 룰 */

const RULES: [code: string, label: string, level: number, patterns: RegExp[]][] = [
  [
    'money',
    '돈·송금 이야기',
    2,
    [/송금/, /계좌/, /이체/, /입금/, /돈\s*(좀|을|이)?\s*(빌려|보내|부쳐)/, /빌려\s*줘/, /대출/,
     /투자/, /수익/, /코인/, /상품권/, /기프트\s*카드/, /선물\s*카드/],
  ],
  [
    'personal_info',
    '비밀번호·인증번호 같은 개인정보',
    3,
    [/비밀\s*번호/, /\bOTP\b/i, /인증\s*번호/, /주민\s*(등록)?\s*번호/, /카드\s*번호/, /보안\s*카드/,
     /공인\s*인증서/, /신분증\s*(사진|찍어)/],
  ],
  ['urgency', '급하게 서두르게 하는 말', 1, [/급해/, /긴급/, /지금\s*당장/, /병원비/, /사고\s*(났|가)/, /아무한테도\s*말하지/]],
  ['off_platform', '다른 앱이나 링크로 옮기자는 말', 1, [/카톡\s*(아이디|ID)/i, /텔레그램/, /라인\s*아이디/, /https?:\/\//, /\bbit\.ly\b/]],
]

export function assessText(text: string): { level: number; labels: string[] } {
  const codes: string[] = []
  const labels: string[] = []
  let level = 0
  for (const [code, label, lvl, patterns] of RULES) {
    if (patterns.some((p) => p.test(text))) {
      codes.push(code)
      labels.push(label)
      level = Math.max(level, lvl)
    }
  }
  if (codes.includes('money') && codes.includes('urgency')) level = Math.min(3, level + 1)
  return { level, labels }
}
