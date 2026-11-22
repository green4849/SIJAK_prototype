import { Alert } from '@/shared/ui/Alert'
import { ButtonLink } from '@/shared/ui/Button'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'
import type { RelationFactor, RelationIndex } from '../api/wellbeingApi'
import { useRelationIndex } from '../hooks/useWellbeing'
import { WEATHER } from './weather'
import styles from './Wellbeing.module.css'

/** 수치에서 바로 이어 갈 곳 — 다른 feature 경로라 페이지가 넘긴다 */
export interface WellbeingLinks {
  companion: string
  activities: string
  chats: string
  brain: string
  notifications: string
  /** 기분 점검(PHQ-9) */
  moodCheck: string
  /** 긴급 도움 (109 상담 전화가 있는 화면) */
  sos: string
}

/** 마음 날씨 + 요즘 마음 + 요인 다섯 개(가장 낮은 것에 할 일) + 4주 변화 */
export function RelationSummary({ links }: { links: WellbeingLinks }) {
  const { data, error, loading } = useRelationIndex()
  if (error) return <Alert>{error}</Alert>
  if (loading || !data) return <p role="status">불러오는 중…</p>
  return (
    <>
      <Weather data={data} />
      <Mood data={data} links={links} />
      <Factors data={data} links={links} />
      <Weekly data={data} />
    </>
  )
}

/**
 * 요즘 마음 — 말동무 대화의 정서를 지수와 따로, 상태마다 할 일 하나.
 * 위기 신호가 있었으면 다른 무엇보다 109.
 */
function Mood({ data, links }: { data: RelationIndex; links: WellbeingLinks }) {
  const m = data.mood
  const view = m.crisis
    ? { label: '많이 힘드셨어요', note: '혼자 견디지 마세요. 109는 하루 종일 이야기를 들어 줘요.', action: '109 상담 전화 보기', to: links.sos, danger: true }
    : m.level === 'heavy'
      ? { label: '무거운 날이 많았어요', note: null, action: '기분 점검 해 보기', to: links.moodCheck, danger: false }
      : m.level === 'mixed'
        ? { label: '오르내렸어요', note: null, action: '동네 모임 나가 보기', to: links.activities, danger: false }
        : m.level === 'calm'
          ? { label: '편안한 편이에요', note: null, action: '말동무와 이야기 이어 가기', to: links.companion, danger: false }
          : { label: '아직 이야기가 없어요', note: '말동무와 이야기하면 요즘 마음을 여기서 볼 수 있어요.', action: '말동무와 이야기하기', to: links.companion, danger: false }
  return (
    <section className={styles.card} data-mood={m.crisis ? 'crisis' : m.level} aria-labelledby="mood-title">
      <p className={styles.weatherCaption} id="mood-title">
        요즘 마음 · 말동무와 나눈 이야기로
      </p>
      <h2 className={styles.moodLabel}>{view.label}</h2>
      {m.talked > 0 && (
        <p className={styles.trendNote}>
          최근 2주 {m.talked}번 중 {m.heavy}번은 마음이 무거웠어요.
        </p>
      )}
      {view.note && <p className={styles.trendNote}>{view.note}</p>}
      <ButtonLink to={view.to} variant={view.danger ? 'danger' : 'secondary'} block>
        {view.action}
      </ButtonLink>
    </section>
  )
}

/** 요인마다 올릴 수 있는 일 하나 — 가장 낮은 요인에만 보여 준다 */
const NEXT_STEP: Record<RelationFactor['code'], { action: string; link: keyof WellbeingLinks }> = {
  activity: { action: '두뇌 운동 한 판 하기', link: 'brain' },
  communication: { action: '이웃에게 먼저 말 걸기', link: 'chats' },
  emotion: { action: '말동무에게 털어놓기', link: 'companion' },
  social: { action: '동네 모임 나가 보기', link: 'activities' },
  responsiveness: { action: '새 소식 확인하기', link: 'notifications' },
}

function Weather({ data }: { data: RelationIndex }) {
  const w = WEATHER[data.level]
  const Icon = w.icon
  return (
    <section className={styles.weather} data-level={data.level} aria-labelledby="weather-title">
      <Icon aria-hidden="true" size={ICON.lg} strokeWidth={ICON_STROKE} className={styles.weatherIcon} />
      <div>
        <p className={styles.weatherCaption}>이번 주 마음 날씨</p>
        <h2 id="weather-title" className={styles.weatherLabel}>
          {w.label}
        </h2>
        <p className={styles.weatherScore}>사회적 관계 지수 {data.score}</p>
      </div>
    </section>
  )
}

/** 요인 다섯 개 — 높을수록 좋음. 막대는 장식, 숫자는 글자로. 가장 낮은 요인을 올릴 일 하나 */
function Factors({ data, links }: { data: RelationIndex; links: WellbeingLinks }) {
  const lowest = data.factors.reduce<RelationFactor | null>((lo, f) => (!lo || f.score < lo.score ? f : lo), null)
  const step = lowest && lowest.score < 70 ? NEXT_STEP[lowest.code] : null
  return (
    <section className={styles.card} aria-labelledby="factors-title">
      <h2 id="factors-title" className={styles.cardTitle}>
        요즘 나는
      </h2>
      <ul className={styles.factors}>
        {data.factors.map((f) => (
          <li key={f.code} className={styles.factor}>
            <span className={styles.factorLabel}>{f.label}</span>
            <span className={styles.track} aria-hidden="true">
              <span className={styles.fill} style={{ width: `${f.score}%` }} />
            </span>
            <span className={styles.factorValue}>{f.score}</span>
          </li>
        ))}
      </ul>
      {lowest && step && (
        <>
          <p className={styles.trendNote}>
            이번 주 해 볼 일 · ‘{lowest.label}’ 올리기
          </p>
          <ButtonLink to={links[step.link]} variant="secondary" block>
            {step.action}
          </ButtonLink>
        </>
      )}
    </section>
  )
}

/** 4주 변화 — 사회적 관계 지수(높을수록 좋음) 세로 막대, 이번 주만 진하게 */
function Weekly({ data }: { data: RelationIndex }) {
  const first = data.weekly[0]
  const last = data.weekly.at(-1)
  const better = first && last && last.score > first.score
  return (
    <section className={styles.card} aria-labelledby="weekly-title">
      <h2 id="weekly-title" className={styles.cardTitle}>
        {data.weekly.length}주 변화
      </h2>
      {first && last && (
        <p className={styles.trendNote}>
          {first.label} {first.score} → {last.label} {last.score}
          {better ? ' · 좋아지고 있어요' : ''}
        </p>
      )}
      <ol className={styles.bars} aria-hidden="true">
        {data.weekly.map((w, i) => (
          <li key={w.label} className={styles.barCol}>
            <span className={styles.barValue}>{w.score}</span>
            <span className={styles.barArea}>
              <span
                className={styles.bar}
                data-current={i === data.weekly.length - 1}
                style={{ height: `${Math.max(w.score, 4)}%` }}
              />
            </span>
            <span className={styles.barLabel}>{w.label}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
