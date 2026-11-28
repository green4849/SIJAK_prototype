import { X } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { postponeSurvey, SurveyFlow } from '@/features/friend'
import { SijagiStill } from '@/features/guide'
import { IconAction } from '@/shared/ui/IconAction'
import { TopBar } from '@/shared/ui/TopBar'
import styles from './TabPage.module.css'

/**
 * 성향조사 (8문항) — 하단 '성향조사' 탭·추천 친구 위 카드·마이페이지에서 들어온다.
 * ?edit 이면 시작 화면 없이 1번 질문부터. 어느 단계에서든 오른쪽 위 'X'로 닫으면 추천 친구로
 * (이 기기에서는 다시 권하지 않는다).
 */
export function FriendSurveyPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const edit = params.has('edit')
  const onboarding = params.get('welcome') === '1'
  return (
    <section className={styles.page}>
      <TopBar
        title={edit ? '내 취향 수정하기' : '성향조사'}
        backTo="/friends"
        right={
          <IconAction
            icon={X}
            label="닫기"
            onClick={() => {
              postponeSurvey()
              navigate('/friends', { replace: true })
            }}
          />
        }
      />
      {/* '고치기'(?edit)에서 하단 탭으로 오면 같은 화면이라도 처음부터 다시 그린다 (지난 답을 새로 읽음) */}
      <SurveyFlow
        key={edit ? 'edit' : 'start'}
        startAt={edit ? 'questions' : 'intro'}
        friendsHref={onboarding ? '/friends?welcome=1' : '/friends'}
        onboarding={onboarding}
        art={<SijagiStill />}
      />
    </section>
  )
}
