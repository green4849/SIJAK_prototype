import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react'
import { useState } from 'react'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'
import type { TopicData } from '../api/chatApi'
import styles from './TopicSuggestions.module.css'

const PER_PAGE = 2

interface Props {
  topics: TopicData[]
  /** 고른 문구 → 입력칸에 넣는다 (보내기는 사람이 직접) */
  onPick: (text: string) => void
  /** 처음에 펼쳐 둘지 (아직 내가 한마디도 안 했을 때) */
  defaultOpen: boolean
}

/**
 * 대화 주제 추천 (C12) — 입력줄 위 접었다 펴는 칸.
 * 한 번에 두 개만 보여 주고 '다른 말 보기'로 넘긴다 (입력줄이 화면을 덮지 않게).
 */
export function TopicSuggestions({ topics, onPick, defaultOpen }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [page, setPage] = useState(0)
  if (topics.length === 0) return null

  const pages = Math.ceil(topics.length / PER_PAGE)
  const shown = topics.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)
  const common = shown.find((t) => t.common)

  return (
    <div className={styles.box}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls="topic-list"
        onClick={() => setOpen((v) => !v)}
      >
        <Lightbulb aria-hidden="true" size={ICON.inline} strokeWidth={ICON_STROKE} />
        <span className={styles.toggleText}>무슨 말을 할지 고민되세요?</span>
        {open ? (
          <ChevronUp aria-hidden="true" size={ICON.sm} strokeWidth={ICON_STROKE} />
        ) : (
          <ChevronDown aria-hidden="true" size={ICON.sm} strokeWidth={ICON_STROKE} />
        )}
      </button>
      {open && (
        <div id="topic-list" className={styles.list}>
          <p className={styles.hint}>
            {common ? `두 분이 함께 좋아하는 '${common.label}' 이야기예요. ` : ''}누르면 입력칸에 들어가요.
          </p>
          {shown.map((t) => (
            <button
              key={t.text}
              type="button"
              className={styles.topic}
              onClick={() => {
                onPick(t.text)
                setOpen(false)
              }}
            >
              {t.text}
            </button>
          ))}
          {pages > 1 && (
            <button type="button" className={styles.more} onClick={() => setPage((p) => (p + 1) % pages)}>
              다른 말 보기
            </button>
          )}
        </div>
      )}
    </div>
  )
}
