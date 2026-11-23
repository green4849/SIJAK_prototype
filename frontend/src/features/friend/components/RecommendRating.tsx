import type { FriendCardData, Rating } from '../api/friendApi'
import styles from './RecommendRating.module.css'

const OPTIONS: { value: Rating; label: string }[] = [{ value: 'like', label: '만나보고 싶어요' }]

interface Props {
  card: FriendCardData
  onRate: (card: FriendCardData, rating: Rating) => Promise<void>
  disabled?: boolean
}

/**
 * 추천 친구 평가 (C12). 별 5개 대신 말로 된 큰 버튼 — 지금은 '만나보고 싶어요' 하나.
 * ('그저 그래요'·'잘 안 맞아요'는 화면에서 뺐고, 서버·데모는 세 값을 그대로 받는다)
 * 고른 것은 색 + ✓ + aria-pressed.
 */
export function RecommendRating({ card, onRate, disabled }: Props) {
  return (
    <fieldset className={styles.box}>
      <legend className={styles.legend}>이 이웃, 어떠세요?</legend>
      <div className={styles.options}>
        {OPTIONS.map((o) => {
          const on = card.my_rating === o.value
          return (
            <button
              key={o.value}
              type="button"
              className={styles.option}
              data-value={o.value}
              data-selected={on}
              aria-pressed={on}
              disabled={disabled}
              onClick={() => void onRate(card, o.value)}
            >
              {on && <span aria-hidden="true">✓ </span>}
              {o.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
