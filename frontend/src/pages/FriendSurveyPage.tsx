import { useSearchParams } from 'react-router-dom'
import { SurveyFlow } from '@/features/friend'
import { SijagiStill } from '@/features/guide'
import { TopBar } from '@/shared/ui/TopBar'
import styles from './TabPage.module.css'

/** ④ 추천 친구 → 성향조사 (8문항). ?edit 이면 시작 화면 없이 1번 질문부터 */
export function FriendSurveyPage() {
  const [params] = useSearchParams()
  const edit = params.has('edit')
  return (
    <section className={styles.page}>
      <TopBar title={edit ? '내 취향 수정하기' : '성향조사'} backTo="/friends" />
      <SurveyFlow startAt={edit ? 'questions' : 'intro'} friendsHref="/friends" art={<SijagiStill />} />
    </section>
  )
}
