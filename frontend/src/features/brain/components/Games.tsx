import { Apple, Fish, Flower2, Sun, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button, ButtonLink } from '@/shared/ui/Button'
import { ICON_STROKE } from '@/shared/ui/icon'
import { saveResult } from '../hooks/useBrain'
import styles from './Brain.module.css'

function shuffle<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface GameProps {
  /** 끝내기 → 돌아갈 곳 */
  doneHref: string
}

function Result({ title, detail, onAgain, doneHref }: { title: string; detail: string; onAgain: () => void; doneHref: string }) {
  return (
    <section className={styles.result} role="status" aria-labelledby="result-title">
      <h2 id="result-title" className={styles.resultTitle}>
        {title}
      </h2>
      <p className={styles.resultDetail}>{detail}</p>
      <div className={styles.resultActions}>
        <Button onClick={onAgain}>한 번 더</Button>
        <ButtonLink to={doneHref} variant="secondary">
          끝내기
        </ButtonLink>
      </div>
    </section>
  )
}

// ---------- 짝 맞추기 (기억력) ----------

const PICTURES: { name: string; icon: LucideIcon }[] = [
  { name: '사과', icon: Apple },
  { name: '꽃', icon: Flower2 },
  { name: '해', icon: Sun },
  { name: '물고기', icon: Fish },
]

interface Card {
  id: number
  pic: number
}

const newDeck = (): Card[] => shuffle([...PICTURES.keys(), ...PICTURES.keys()]).map((pic, id) => ({ id, pic }))
const FLIP_BACK_MS = 1100

/** 카드 8장(그림 4쌍) — 두 장씩 뒤집어 같은 그림 찾기. 그림 옆에 이름 글자도 */
export function MatchGame({ doneHref }: GameProps) {
  const [deck, setDeck] = useState(newDeck)
  const [open, setOpen] = useState<number[]>([]) // 지금 뒤집어 본 카드 (최대 2)
  const [found, setFound] = useState<Set<number>>(new Set()) // 맞춘 그림
  const [tries, setTries] = useState(0)
  const done = found.size === PICTURES.length

  // 틀린 두 장은 잠깐 보여 준 뒤 다시 덮는다
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  useEffect(() => {
    if (done) void saveResult('match', tries, PICTURES.length)
  }, [done, tries])

  function flip(i: number) {
    if (open.length === 2 || open.includes(i) || found.has(deck[i].pic)) return
    if (open.length === 0) return setOpen([i])
    setTries((t) => t + 1)
    if (deck[open[0]].pic === deck[i].pic) {
      setFound((f) => new Set(f).add(deck[i].pic))
      setOpen([])
      return
    }
    setOpen([open[0], i])
    timer.current = window.setTimeout(() => setOpen([]), FLIP_BACK_MS)
  }

  function again() {
    window.clearTimeout(timer.current)
    setDeck(newDeck())
    setOpen([])
    setFound(new Set())
    setTries(0)
  }

  if (done)
    return <Result title="다 맞췄어요!" detail={`${tries}번 뒤집어서 찾았어요`} onAgain={again} doneHref={doneHref} />

  return (
    <div className={styles.game}>
      <p className={styles.status} aria-live="polite">
        찾은 짝 {found.size} / {PICTURES.length} · {tries}번
      </p>
      <ul className={styles.grid}>
        {deck.map((c, i) => {
          const shown = open.includes(i) || found.has(c.pic)
          const P = PICTURES[c.pic]
          return (
            <li key={c.id}>
              <button
                type="button"
                className={styles.tile}
                data-shown={shown}
                data-found={found.has(c.pic)}
                aria-label={shown ? P.name : `${i + 1}번 카드`}
                onClick={() => flip(i)}
              >
                {shown ? (
                  <>
                    <P.icon aria-hidden="true" size={40} strokeWidth={ICON_STROKE} />
                    <span>{P.name}</span>
                  </>
                ) : (
                  <span aria-hidden="true" className={styles.back}>
                    ?
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ---------- 셈하기 (주의집중) ----------

interface Problem {
  text: string
  answer: number
  options: number[]
}

const rand = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1))

function makeProblem(): Problem {
  const plus = Math.random() < 0.6
  const a = rand(2, 9)
  const b = plus ? rand(1, 9) : rand(1, a - 1)
  const answer = plus ? a + b : a - b
  const opts = new Set([answer])
  while (opts.size < 4) opts.add(Math.max(0, answer + rand(-3, 3)))
  return { text: `${a} ${plus ? '+' : '−'} ${b}`, answer, options: [...opts].sort((x, y) => x - y) }
}

const ROUNDS = 5
const newProblems = () => Array.from({ length: ROUNDS }, makeProblem)

/** 쉬운 덧셈·뺄셈 다섯 문제 — 고르면 바로 맞았는지 알려 주고 '다음' */
export function CalcGame({ doneHref }: GameProps) {
  const [problems, setProblems] = useState(newProblems)
  const [round, setRound] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [right, setRight] = useState(0)
  const done = round >= ROUNDS

  useEffect(() => {
    if (done) void saveResult('calc', right, ROUNDS)
  }, [done, right])

  function again() {
    setProblems(newProblems())
    setRound(0)
    setPicked(null)
    setRight(0)
  }

  if (done)
    return (
      <Result
        title={right === ROUNDS ? '모두 맞혔어요!' : '잘하셨어요!'}
        detail={`${ROUNDS}문제 중 ${right}개 맞혔어요`}
        onAgain={again}
        doneHref={doneHref}
      />
    )

  const p = problems[round]
  const correct = picked === p.answer
  return (
    <div className={styles.game}>
      <p className={styles.status}>
        {round + 1} / {ROUNDS}
      </p>
      <p className={styles.problem}>
        {p.text} = ?
      </p>
      <div className={styles.answers} role="group" aria-label="답 고르기">
        {p.options.map((o) => (
          <button
            key={o}
            type="button"
            className={styles.answer}
            data-state={picked === null ? undefined : o === p.answer ? 'right' : o === picked ? 'wrong' : undefined}
            disabled={picked !== null}
            onClick={() => {
              setPicked(o)
              if (o === p.answer) setRight((r) => r + 1)
            }}
          >
            {o}
          </button>
        ))}
      </div>
      {picked !== null && (
        <>
          <p className={styles.feedback} data-correct={correct} role="status">
            {correct ? '맞았어요!' : `아쉬워요. 답은 ${p.answer}이에요`}
          </p>
          <Button
            block
            large
            onClick={() => {
              setPicked(null)
              setRound((r) => r + 1)
            }}
          >
            {round + 1 < ROUNDS ? '다음 문제' : '결과 보기'}
          </Button>
        </>
      )}
    </div>
  )
}
