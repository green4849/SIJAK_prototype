import { Alert } from '@/shared/ui/Alert'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'
import type { IsolationIndex } from '../api/wellbeingApi'
import { useIsolationIndex } from '../hooks/useWellbeing'
import { WEATHER } from './weather'
import styles from './Wellbeing.module.css'

/** 마음 날씨 + 요인 다섯 개 + 4주 변화 */
export function IsolationSummary() {
  const { data, error, loading } = useIsolationIndex()
  if (error) return <Alert>{error}</Alert>
  if (loading || !data) return <p role="status">불러오는 중…</p>
  return (
    <>
      <Weather data={data} />
      <Factors data={data} />
      <Weekly data={data} />
    </>
  )
}

function Weather({ data }: { data: IsolationIndex }) {
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
        <p className={styles.weatherScore}>고립 지수 {data.score}</p>
      </div>
    </section>
  )
}

/** 요인 다섯 개 — 높을수록 좋음. 막대는 장식, 숫자는 글자로 */
function Factors({ data }: { data: IsolationIndex }) {
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
    </section>
  )
}

/** 4주 변화 — 고립 지수(낮을수록 좋음) 세로 막대, 이번 주만 진하게 */
function Weekly({ data }: { data: IsolationIndex }) {
  const first = data.weekly[0]
  const last = data.weekly.at(-1)
  const better = first && last && last.score < first.score
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
