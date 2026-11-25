import type { LegalDoc } from './documents'
import styles from './LegalText.module.css'

/** 약관 전문 — 조항 제목 + 문단. 동의 화면에서 펼쳐 보거나 약관 화면에서 그대로 보여 준다 */
export function LegalText({ doc, headingLevel = 2 }: { doc: LegalDoc; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <div className={styles.text}>
      {doc.sections.map((s) => (
        <section key={s.heading} className={styles.section}>
          <H className={styles.heading}>{s.heading}</H>
          {s.body.map((line) => (
            <p key={line} className={styles.line}>
              {line}
            </p>
          ))}
        </section>
      ))}
    </div>
  )
}

/** 큰 글씨 요약 — 먼저 보이는 세 줄 */
export function LegalSummary({ doc }: { doc: LegalDoc }) {
  return (
    <ul className={styles.summary}>
      {doc.summary.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  )
}
