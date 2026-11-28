import { ChevronLeft, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useA11yPrefs } from '@/shared/a11y/useA11yPrefs'
import { speakKorean, stopSpeaking } from '@/shared/a11y/speak'
import styles from './TopBar.module.css'
import { ICON, ICON_STROKE } from './icon'

interface Props {
  title?: string
  /** 제목 바로 아래 한 줄 설명 (제목과 가깝게 붙는다) */
  description?: ReactNode
  /** 앱 안에서 들어온 곳이 없을 때(주소로 바로 열었을 때) 갈 경로. 들어온 곳이 있으면 그리로 돌아간다 */
  backTo?: string
  /** 뒤로를 눌렀을 때 페이지 이동 대신 할 일 (여러 단계 화면에서 이전 단계로) */
  onBack?: () => void
  /** false면 뒤로가기 버튼 숨김 */
  back?: boolean
  right?: ReactNode
}

/**
 * 화면 상단 — 모든 화면 공통 (디자인 리뷰 v1 공통 6·17).
 *  - 제목은 왼쪽 정렬, 본문과 같은 왼쪽 선에서 시작
 *  - 뒤로가기가 있으면: [뒤로 ……… 오른쪽 동작] 한 줄 + 그 아래 제목
 *  - 뒤로가기가 없으면(탭 화면): [제목 ……… 오른쪽 동작] 한 줄
 *  → 오른쪽 동작이 있든 없든 제목 위치가 바뀌지 않는다
 */
export function TopBar({ title, description, backTo, onBack, back = true, right }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const { prefs } = useA11yPrefs()
  const descriptionRef = useRef<HTMLParagraphElement>(null)
  const [speaking, setSpeaking] = useState(false)
  const [speechNotice, setSpeechNotice] = useState('')
  useEffect(() => () => stopSpeaking(), [location.pathname])
  if (!back && !title && !right) return null

  // 들어온 곳으로 돌아간다 — 포인트를 보러 갔다가 친구 신청으로, 알림함에서 연 활동은 알림함으로.
  // 주소로 바로 열어 앱 안의 앞 화면이 없을 때만 정해 둔 곳으로 가고, 그때는 기록을 쌓지 않는다
  // (쌓으면 휴대폰의 '뒤로'가 방금 나온 화면으로 되돌아간다)
  const hasPrevious = location.key !== 'default'
  const goBack = () => {
    if (onBack) return onBack()
    if (!backTo || hasPrevious) return navigate(-1)
    navigate(backTo, { replace: true })
  }

  const heading = title ? <h1 className={styles.title}>{title}</h1> : null
  const readScreen = () => {
    if (speaking) {
      stopSpeaking()
      setSpeaking(false)
      return
    }
    const detail = descriptionRef.current?.textContent?.trim()
      || document.querySelector('main p')?.textContent?.trim()
    const sentence = [title, detail?.slice(0, 180)].filter(Boolean).join('. ')
    const result = speakKorean(sentence, prefs.speechRate, () => setSpeaking(false))
    setSpeechNotice(result === 'no-korean-voice' ? '이 기기에는 한국어 음성이 없어요. 기기 음성 설정에서 한국어를 추가해 주세요.'
      : result === 'unavailable' ? '이 브라우저는 화면 읽어 주기를 지원하지 않아요.' : '')
    setSpeaking(result === 'speaking')
  }
  const readButton = title && prefs.readAloud ? (
    <button type="button" className={styles.read} onClick={readScreen} aria-pressed={speaking}>
      <Volume2 aria-hidden="true" size={ICON.inline} strokeWidth={ICON_STROKE} />
      {speaking ? '읽기 멈추기' : '읽어 주기'}
    </button>
  ) : null
  const actions = right || readButton ? <div className={styles.right}>{readButton}{right}</div> : null
  return (
    <header className={styles.bar}>
      {back ? (
        <>
          <div className={styles.toolbar}>
            <button
              type="button"
              className={styles.back}
              onClick={goBack}
            >
              <ChevronLeft aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />
              <span className={styles.backLabel}>뒤로</span>
            </button>
            {actions}
          </div>
          {heading}
        </>
      ) : (
        <div className={styles.toolbar}>
          {heading}
          {actions}
        </div>
      )}
      {description && <p ref={descriptionRef} className={styles.description}>{description}</p>}
      {speechNotice && <p className={styles.speechNotice} role="status">{speechNotice}</p>}
    </header>
  )
}
