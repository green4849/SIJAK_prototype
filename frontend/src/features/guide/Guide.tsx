import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Sheet } from '@/shared/ui/Sheet'
import { findGuideAnswer, suggestedAnswers, type GuideAnswer } from './answers'
import styles from './Guide.module.css'

/** 시작이의 앱 길 안내. 검수한 안내만 답하고, 모르는 질문에는 도움말로 연결한다. */
export function Guide() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<GuideAnswer | null>(null)
  const [unknown, setUnknown] = useState(false)
  const guest = pathname.startsWith('/login') || pathname === '/signup' || pathname === '/welcome'
  const mascot = `${import.meta.env.BASE_URL}mascot/sijagi-guide.png`
  const bottom = ['/', '/friends', '/activities', '/me'].includes(pathname) ? 'nav'
    : pathname.startsWith('/chats/') || pathname === '/companion' ? 'composer'
      : pathname.startsWith('/activities/') ? 'action' : 'default'

  useEffect(() => {
    setOpen(false)
    setAnswer(null)
    setUnknown(false)
    setQuestion('')
  }, [pathname])

  if (pathname.startsWith('/admin') || pathname.startsWith('/sos')) return null

  const ask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!question.trim()) return
    const found = findGuideAnswer(question, pathname)
    setAnswer(found)
    setUnknown(!found)
  }

  return (
    <>
      <button type="button" className={styles.launcher} data-bottom={bottom} aria-label="시작이에게 앱 사용법 물어보기" onClick={() => setOpen(true)}>
        <img src={mascot} alt="" />
        <span>시작이에게 물어보기</span>
      </button>
      <Sheet open={open} title="시작이에게 물어보기" onClose={() => setOpen(false)}>
        <div className={styles.content}>
          <div className={styles.intro}>
            <img src={mascot} alt="" />
            <p>안녕하세요! 앱에서 어디로 가야 할지 알려드릴게요.</p>
          </div>
          <p className={styles.label}>이렇게 물어보세요</p>
          <div className={styles.suggestions}>
            {suggestedAnswers(pathname).map((item) => (
              <button key={item.id} type="button" onClick={() => { setQuestion(item.question); setAnswer(item); setUnknown(false) }}>
                {item.question}
              </button>
            ))}
          </div>
          <form className={styles.form} onSubmit={ask}>
            <label htmlFor="sijagi-question">궁금한 점을 직접 적어 주세요</label>
            <div className={styles.inputRow}>
              <input id="sijagi-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={100} placeholder="예: 친구는 어떻게 찾나요?" />
              <button type="submit" disabled={!question.trim()}>묻기</button>
            </div>
          </form>
          <div className={styles.result} role="status" aria-live="polite">
            {answer && <>
              <p>{answer.answer}</p>
              {answer.path && !guest && <Link to={answer.path} onClick={() => setOpen(false)}>{answer.action} →</Link>}
              {answer.path === '/login/help' && guest && <Link to={answer.path} onClick={() => setOpen(false)}>{answer.action} →</Link>}
            </>}
            {unknown && <>
              <p>그 질문은 아직 제가 정확히 안내하기 어려워요. 도움말을 확인해 주세요.</p>
              <Link to={guest ? '/login/help' : '/me/help'} onClick={() => setOpen(false)}>도움말 보기 →</Link>
            </>}
          </div>
          <p className={styles.note}>시작이는 앱 사용법만 안내해요. 다른 사람과의 실제 대화나 긴급 연락을 대신하지 않아요.</p>
        </div>
      </Sheet>
    </>
  )
}
