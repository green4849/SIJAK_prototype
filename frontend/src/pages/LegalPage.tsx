import { useParams } from 'react-router-dom'
import { isLegalKind, LEGAL_DOCS, LEGAL_VERSION } from '@/shared/legal/documents'
import { LegalSummary, LegalText } from '@/shared/legal/LegalText'
import { TopBar } from '@/shared/ui/TopBar'
import { NotFoundPage } from './NotFoundPage'
import styles from './TabPage.module.css'

/** /legal/:doc — 약관·개인정보 문서 (B6). 로그인 없이도 열린다 (가입 전에 읽을 수 있게) */
export function LegalPage() {
  const { doc } = useParams()
  if (!isLegalKind(doc)) return <NotFoundPage />
  const legal = LEGAL_DOCS[doc]
  return (
    <section className={styles.page}>
      <TopBar title={legal.title} backTo="/" />
      <LegalSummary doc={legal} />
      <LegalText doc={legal} />
      <p>문서 버전 {LEGAL_VERSION}</p>
    </section>
  )
}
