/** H36 — 시연의 위험 대화 규칙 사본이 백엔드와 같은 입력에 같은 답을 내는지 (브라우저 없이 규칙만) */
import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { assessText } from '../src/demo/rules'

const { cases } = JSON.parse(
  readFileSync(new URL('../../backend/tests/fixtures/risk_cases.json', import.meta.url), 'utf8'),
) as { cases: { text: string; level: number; codes: string[] }[] }

for (const c of cases) {
  test(`H36: ${c.text}`, () => {
    const r = assessText(c.text)
    expect({ level: r.level, codes: r.codes }).toEqual({ level: c.level, codes: c.codes })
  })
}
