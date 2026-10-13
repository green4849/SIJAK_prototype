import { Link } from 'react-router-dom'
import { formatRelative } from '@/shared/lib/datetime'
import { Alert } from '@/shared/ui/Alert'
import type { PointSummary } from '../api/pointsApi'
import { usePointHistory, usePointSummary } from '../hooks/usePoints'
import styles from './Points.module.css'

const won = (n: number) => `${n.toLocaleString()}P`

/** 체험 기간 마지막 날 → '11월 30일' */
function shortDate(isoDate: string) {
  const [, m, d] = isoDate.split('-').map(Number)
  return `${m}월 ${d}일`
}

/** 큰 잔액 카드 */
export function PointBalance() {
  const s = usePointSummary()
  if (!s) return <p role="status">불러오는 중…</p>
  return (
    <section className={styles.balanceCard} aria-label="지금 가진 포인트">
      <p className={styles.balanceLabel}>지금 가진 포인트</p>
      <p className={styles.balance}>{won(s.balance)}</p>
      {s.free_until && (
        <p className={styles.balanceNote}>
          체험 기간이에요 · {shortDate(s.free_until)}까지 친구 신청에 포인트를 쓰지 않아요
        </p>
      )}
    </section>
  )
}

interface GuideProps {
  /** 각 방법으로 가는 경로 (다른 feature 화면이라 페이지에서 받는다) */
  rateHref: string
  volunteerHref: string
}

/** 모으는 방법 · 쓰는 곳 — 금액은 서버 값 그대로 */
export function PointGuide({ rateHref, volunteerHref }: GuideProps) {
  const s = usePointSummary()
  if (!s) return null
  return (
    <>
      <section className={styles.card} aria-labelledby="earn-title">
        <h2 id="earn-title" className={styles.cardTitle}>
          포인트 모으기
        </h2>
        <ul className={styles.rows}>
          <GuideRow
            to={rateHref}
            title="추천 친구 평가하기"
            meta={`하루 5번까지 · 오늘 ${s.ratings_left_today}번 남았어요`}
            amount={`+${won(s.rating_reward)}`}
          />
          <GuideRow
            to={volunteerHref}
            title="봉사모임 참여하기"
            meta="복지관과 함께하는 지역생활 봉사"
            amount={`+${won(s.volunteer_reward)}`}
          />
          <GuideRow
            title="첫 친구 3명 사귀기"
            meta="서로 이야기를 나눈 친구 3명"
            amount={`+${won(s.first_friends_reward)}`}
          />
        </ul>
      </section>

      <section className={styles.card} aria-labelledby="spend-title">
        <h2 id="spend-title" className={styles.cardTitle}>
          포인트 쓰는 곳
        </h2>
        <ul className={styles.rows}>
          <GuideRow
            title="친구 신청"
            meta={spendNote(s)}
            amount={won(s.friend_request_cost)}
          />
          <GuideRow title="받은 친구 신청 수락" meta="언제나 무료예요" amount="0P" />
        </ul>
      </section>
    </>
  )
}

function spendNote(s: PointSummary) {
  if (s.free_until) return '체험 기간에는 무료예요'
  return s.next_request_free ? '첫 신청은 무료예요' : '같은 분께 다시 신청해도 한 번만'
}

function GuideRow({ to, title, meta, amount }: { to?: string; title: string; meta: string; amount: string }) {
  const body = (
    <>
      <span className={styles.rowMain}>
        <span>{title}</span>
        <span className={styles.rowMeta}>{meta}</span>
      </span>
      <span className={styles.amount} data-sign={amount.startsWith('+') ? 'plus' : 'minus'}>
        {amount}
      </span>
    </>
  )
  return (
    <li>
      {to ? (
        <Link to={to} className={`${styles.row} ${styles.rowLink}`}>
          {body}
        </Link>
      ) : (
        <div className={styles.row}>{body}</div>
      )}
    </li>
  )
}

/** 최근 내역 */
export function PointHistory() {
  const { data, error, loading } = usePointHistory()
  return (
    <section className={styles.card} aria-labelledby="history-title" aria-busy={loading}>
      <h2 id="history-title" className={styles.cardTitle}>
        최근 내역
      </h2>
      {error && <Alert>{error}</Alert>}
      {data && (
        <ul className={styles.rows}>
          {data.map((e) => (
            <li key={e.id} className={styles.row}>
              <span className={styles.rowMain}>
                <span>{e.label}</span>
                <span className={styles.rowMeta}>{formatRelative(e.created_at)}</span>
              </span>
              <span className={styles.amount} data-sign={e.amount > 0 ? 'plus' : 'minus'}>
                {e.amount > 0 ? `+${won(e.amount)}` : e.amount === 0 ? '무료' : `−${won(-e.amount)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
