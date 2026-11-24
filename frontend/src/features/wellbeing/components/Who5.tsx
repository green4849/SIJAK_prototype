import {
  Footprints,
  HeartHandshake,
  MessageCircleHeart,
  Phone,
  Smile,
  TrendingDown,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { formatDate } from '@/shared/lib/datetime'
import { ieyo } from '@/shared/lib/josa'
import { ActionCard } from '@/shared/ui/ActionCard'
import { Alert } from '@/shared/ui/Alert'
import { Button, ButtonLink } from '@/shared/ui/Button'
import { CallLink } from '@/shared/ui/CallLink'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'
import type { AssessmentResult } from '../api/wellbeingApi'
import { useAssessmentHistory, useWho5, useWho5Status } from '../hooks/useWellbeing'
import styles from './Wellbeing.module.css'

/** 4주마다 다시 살펴본다 (백엔드 WHO5_INTERVAL) */
const INTERVAL_DAYS = 28

/** WHO-5 화면에서 이어 갈 곳 — feature는 다른 feature의 경로를 모르므로 페이지가 넘긴다 */
export interface Who5Links {
  chats: string
  walk: string
  move: string
  activities: string
  history: string
  home: string
}

/** 다음 살펴볼 날 — '12월 22일이에요' */
const nextDueText = (createdAt: string) => {
  const d = new Date(new Date(createdAt).getTime() + INTERVAL_DAYS * 86_400_000)
  return ieyo(`${d.getMonth() + 1}월 ${d.getDate()}일`)
}

/** 홈 — 살펴볼 때(처음이거나 4주가 지남)만 보인다 */
export function Who5DueCard({ to }: { to: string }) {
  const { data } = useWho5Status()
  if (!data?.due) return null
  return (
    <ActionCard
      accent="pink"
      icon={HeartHandshake}
      title="마음 건강 살펴볼 때예요"
      description={data.last ? `지난번 ${data.last.score}점 · 4주가 지났어요` : '질문 다섯 개로 요즘 기분을 살펴봐요'}
      to={to}
    />
  )
}

interface FlowProps {
  links: Who5Links
  /** 가입 직후처럼 미뤄도 될 때 — '나중에 할게요'가 갈 곳 */
  later?: string
  /** 시작 화면 그림 (시작이) */
  art?: ReactNode
}

/**
 * WHO-5 마음 건강 살펴보기 — 시작 → 한 화면에 한 문항(보기 6개, 이전·다음) → 지난번과 비교 → 해 볼 일.
 * 점검을 고르면 바로 넘어가는 PHQ-9·GAD-7과 달리, 고른 답을 확인하고 '다음'을 누른다 (디자인 2026-11-24).
 */
export function Who5Flow({ links, later, art }: FlowProps) {
  const [stage, setStage] = useState<'intro' | 'questions' | 'tips'>('intro')
  const status = useWho5Status()
  const a = useWho5()

  if (a.loadError) return <Alert>{a.loadError}</Alert>
  if (!a.form) return <p role="status">불러오는 중…</p>

  if (stage === 'intro') {
    return (
      <div className={styles.flow}>
        {art}
        <h2 className={styles.introTitle}>최근 2주 동안의 기분을 같이 살펴볼까요?</h2>
        <p className={styles.lead}>질문 다섯 개예요. 가장 가까운 답을 고르면 돼요.</p>
        <Button block large onClick={() => setStage('questions')}>
          시작하기
        </Button>
        {status.data?.last && (
          <ButtonLink variant="secondary" to={links.history} block>
            나의 이전 결과 보기
          </ButtonLink>
        )}
        {later && (
          <ButtonLink variant="secondary" to={later} replace block>
            나중에 할게요
          </ButtonLink>
        )}
        <p className={styles.note}>진단이 아니라 스스로 살펴보는 점검이에요. 결과는 이웃에게 보이지 않아요.</p>
      </div>
    )
  }

  if (a.result && stage === 'tips') return <Who5Tips result={a.result} links={links} />
  if (a.result) return <Who5Result result={a.result} onNext={() => setStage('tips')} />

  const q = a.form.questions[a.step]
  const last = a.step === a.total - 1
  return (
    <div className={styles.flow}>
      <div className={styles.progress}>
        <p className={styles.progressText}>
          {a.step + 1} / {a.total}
        </p>
        <div className={styles.steps} aria-hidden="true">
          {a.form.questions.map((x, i) => (
            <span key={x.id} className={styles.step} data-done={i <= a.step} />
          ))}
        </div>
      </div>
      <fieldset className={styles.question} disabled={a.pending}>
        <legend className={styles.questionText}>{q?.text}</legend>
        <p className={styles.lead}>{a.form.lead}</p>
        <div className={styles.options} role="radiogroup" aria-label={q?.text}>
          {a.form.options.map((o) => {
            const on = a.chosen === o.value
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={on}
                className={styles.scale}
                data-selected={on}
                onClick={() => a.choose(o.value)}
              >
                <span className={styles.scaleNum} aria-hidden="true">
                  {o.value}
                </span>
                <span className={styles.scaleLabel}>{o.label}</span>
                {on && (
                  <span className={styles.scaleCheck} aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </fieldset>
      {a.error && <Alert>{a.error}</Alert>}
      <div className={styles.nav}>
        <Button variant="secondary" onClick={() => (a.step === 0 ? setStage('intro') : a.back())}>
          이전
        </Button>
        <Button onClick={() => void a.next()} disabled={a.chosen === undefined || a.pending}>
          {last ? '결과 보기' : '다음'}
        </Button>
      </div>
    </div>
  )
}

function changeOf(r: AssessmentResult): { dir: 'up' | 'down' | 'same' | 'first'; text: string } {
  if (r.previous_score == null) return { dir: 'first', text: '100점 만점이에요. 높을수록 마음이 건강한 편이에요.' }
  const d = r.score - r.previous_score
  if (d > 0) return { dir: 'up', text: `이전보다 ${d}점 높아졌어요` }
  if (d < 0) return { dir: 'down', text: `이전보다 ${-d}점 낮아졌어요` }
  return { dir: 'same', text: '지난번과 같아요' }
}

/** 나의 마음 변화 — 이전·이번 점수, 말로 된 단계, 권하는 말 */
function Who5Result({ result: r, onNext }: { result: AssessmentResult; onNext: () => void }) {
  const change = changeOf(r)
  const Arrow = change.dir === 'down' ? TrendingDown : TrendingUp
  return (
    <div className={styles.flow}>
      <section className={styles.result} data-level={r.level} aria-labelledby="result-title">
        <p className={styles.weatherCaption}>나의 마음 변화</p>
        <h2 id="result-title" className={styles.resultLabel}>
          {r.level_label}
        </h2>
      </section>
      <dl className={styles.compare}>
        {r.previous_score != null && (
          <div className={styles.compareBox}>
            <dt>이전 결과</dt>
            <dd>{r.previous_score}점</dd>
          </div>
        )}
        <div className={styles.compareBox} data-current="true">
          <dt>이번 결과</dt>
          <dd>{r.score}점</dd>
        </div>
      </dl>
      <p className={styles.change} data-dir={change.dir}>
        {(change.dir === 'up' || change.dir === 'down') && (
          <Arrow aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />
        )}
        {change.text}
      </p>
      <p className={styles.advice}>{r.advice}</p>
      {r.crisis && (
        <CallLink number="109" className={styles.call}>
          <Phone aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />
          109 상담 전화하기
        </CallLink>
      )}
      <p className={styles.note}>다음 살펴보기는 4주 뒤 {nextDueText(r.created_at)}.</p>
      <Button block large onClick={onNext}>
        계속하기
      </Button>
    </div>
  )
}

/** 앞으로 해 볼 일 — 좋아졌으면 흐름을 잇고, 낮아졌으면 마음을 돌보는 쪽으로 */
function Who5Tips({ result: r, links }: { result: AssessmentResult; links: Who5Links }) {
  const down = changeOf(r).dir === 'down' || r.level === 'low'
  const tips: { icon: LucideIcon; title: string; to: string }[] = down
    ? [
        { icon: MessageCircleHeart, title: '고마운 분과 대화하기', to: links.chats },
        { icon: Footprints, title: '가볍게 몸 움직이기', to: links.move },
        { icon: Smile, title: '좋아하는 일 하며 쉬기', to: links.activities },
      ]
    : [
        { icon: MessageCircleHeart, title: '친구와 안부 나누기', to: links.chats },
        { icon: Footprints, title: '가볍게 산책하기', to: links.walk },
        { icon: Users, title: '관심 있는 모임 나가기', to: links.activities },
      ]
  return (
    <div className={styles.flow}>
      <h2 className={styles.introTitle}>{down ? '이렇게 해 보세요' : '앞으로 이렇게 해 봐요'}</h2>
      <p className={styles.lead}>
        {down ? '마음의 활력을 다시 찾는 데 도움이 되는 일이에요.' : '지금의 좋은 흐름을 이어 가는 데 도움이 되는 일이에요.'}
      </p>
      <div className={styles.section}>
        {tips.map((t) => (
          <ActionCard key={t.title} accent="mint" icon={t.icon} title={t.title} to={t.to} />
        ))}
      </div>
      {down && (
        <div className={styles.card} role="note" aria-label="도움받을 곳">
          <p className={styles.advice}>마음이 많이 힘들거나 이런 날이 이어지면 전문가와 이야기해 보세요.</p>
          {r.crisis && (
            <CallLink number="109" className={styles.call}>
              <Phone aria-hidden="true" size={ICON.md} strokeWidth={ICON_STROKE} />
              109 상담 전화하기
            </CallLink>
          )}
        </div>
      )}
      <ButtonLink to={links.home} block large>
        홈으로 가기
      </ButtonLink>
      <ButtonLink variant="secondary" to={links.history} block>
        나의 이전 결과 보기
      </ButtonLink>
    </div>
  )
}

/** 그래프 아래 날짜 — 글자가 커져도 칸을 넘지 않게 '10월'·'26일' 두 줄로 */
function ChartDate({ iso }: { iso: string }) {
  const d = new Date(iso)
  return (
    <>
      <span>{d.getMonth() + 1}월</span>
      <span>{d.getDate()}일</span>
    </>
  )
}

/** 나의 이전 결과 — 점수 선 그래프(최근 6번) + 날짜별 목록 */
export function Who5History({ startHref }: { startHref: string }) {
  const { data, error } = useAssessmentHistory()
  if (error) return <Alert>{error}</Alert>
  if (!data) return <p role="status">불러오는 중…</p>
  const rows = data.filter((r) => r.kind === 'who5')
  if (rows.length === 0) {
    return (
      <div className={styles.flow}>
        <p className={styles.lead}>아직 살펴본 기록이 없어요.</p>
        <ButtonLink to={startHref} block large>
          마음 건강 살펴보기
        </ButtonLink>
      </div>
    )
  }
  const points = rows.slice(0, 6).reverse() // 오래된 것부터
  const n = points.length
  const x = (i: number) => ((i + 0.5) / n) * 100
  const summary = points.map((p) => `${formatDate(p.created_at)} ${p.score}점`).join(', ')

  return (
    <div className={styles.flow}>
      <section className={styles.card} aria-labelledby="who5-trend-title">
        <h2 id="who5-trend-title" className={styles.cardTitle}>
          점수 변화
        </h2>
        <p className={styles.trendNote}>100점 만점, 높을수록 마음이 건강한 편이에요.</p>
        <div className={styles.chart} role="img" aria-label={`점수 변화: ${summary}`}>
          <svg className={styles.chartLine} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline
              points={points.map((p, i) => `${x(i)},${100 - p.score}`).join(' ')}
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {points.map((p, i) => (
            <span
              key={p.id}
              className={styles.dot}
              data-current={i === n - 1}
              style={{ left: `${x(i)}%`, bottom: `${p.score}%` }}
            >
              <span className={styles.dotValue}>{p.score}</span>
            </span>
          ))}
        </div>
        <ol className={styles.chartDates} aria-hidden="true">
          {points.map((p) => (
            <li key={p.id}>
              <ChartDate iso={p.created_at} />
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="who5-list-title">
        <h2 id="who5-list-title" className={styles.sectionTitle}>
          살펴본 날
        </h2>
        <ul className={styles.records}>
          {rows.map((r) => (
            <li key={r.id} className={styles.record}>
              <span className={styles.recordDate}>{formatDate(r.created_at)}</span>
              <span className={styles.recordScore}>{r.score}점</span>
              <span className={styles.recordLabel}>{r.level_label}</span>
            </li>
          ))}
        </ul>
      </section>
      <p className={styles.note}>다음 살펴보기는 {nextDueText(rows[0].created_at)}.</p>
    </div>
  )
}
