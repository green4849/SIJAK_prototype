import { useParams } from 'react-router-dom'
import { WelfareDetail } from '@/features/welfare'
import { TopBar } from '@/shared/ui/TopBar'

/** 복지시설 상세 (C7) — 프로그램·모임 공간, 전화로 신청 */
export function WelfareDetailPage() {
  const { centerId = '' } = useParams()
  return <WelfareDetail key={centerId} id={centerId} header={<TopBar backTo="/welfare" />} />
}
