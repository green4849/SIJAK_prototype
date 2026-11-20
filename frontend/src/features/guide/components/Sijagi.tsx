import type { Mood } from '../lib/types'

interface Props {
  mood?: Mood
  /** CSS 길이. 글자 크기와 함께 커지게 하려면 em/rem */
  size?: string
  className?: string
}

/*
 * 원화(대표 캐릭터 제안)의 색 — 고대비 화면에서도 캐릭터는 그대로 둔다
 * (tokens.css 일러스트 규칙: 밝은 면이라 검은 바탕에서도 형태가 보인다).
 */
const LINE = '#3a2a12'
const BODY = '#fff8ea'
const LEAF = '#8cc63f'
const LEAF_DEEP = '#6fae3c'
const BLUSH = '#f8b6ae'
const MOUTH = '#e4553f'

/**
 * 시작이 — 원화의 'UI용 미니 버전'(머리와 새싹, 손·가방 없음)을 선으로 옮긴 것.
 * 작은 버튼에서도 얼굴이 읽히도록 전신 대신 얼굴만 쓰고, 표정으로 답의 성격을 알린다.
 * 장식이라 화면 낭독기에는 읽히지 않는다 (뜻은 항상 옆의 글자가 전한다).
 */
export function Sijagi({ mood = 'hello', size = '48px', className }: Props) {
  const worried = mood === 'sorry' || mood === 'care'
  const lookUp = mood === 'think'
  return (
    <svg
      className={className}
      viewBox="0 0 96 96"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      style={{ flex: 'none', display: 'block' }}
    >
      <g stroke={LINE} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        {/* 새싹 */}
        <path d="M48 36 C48 29 47 25 46 21" fill="none" stroke={LEAF_DEEP} strokeWidth="5" />
        <path d="M46 22 C36 24 27 18 26 9 C37 6 46 12 46 22 Z" fill={LEAF} />
        <path d="M47 21 C47 9 57 2 71 4 C72 17 61 26 47 21 Z" fill={LEAF_DEEP} />
        {/* 몸 */}
        <ellipse cx="48" cy="63" rx="34" ry="30.5" fill={BODY} />
      </g>

      <ellipse cx="27" cy="70" rx="6.5" ry="4.5" fill={BLUSH} />
      <ellipse cx="69" cy="70" rx="6.5" ry="4.5" fill={BLUSH} />

      {/* 눈 */}
      {mood === 'happy' ? (
        <g fill="none" stroke={LINE} strokeWidth="3.2" strokeLinecap="round">
          <path d="M32 63 Q37 56 42 63" />
          <path d="M54 63 Q59 56 64 63" />
        </g>
      ) : (
        <g fill={LINE} transform={lookUp ? 'translate(2 -2)' : undefined}>
          <ellipse cx="37" cy="61" rx="3" ry="4" />
          <ellipse cx="59" cy="61" rx="3" ry="4" />
        </g>
      )}

      {/* 눈썹 — 걱정할 때 */}
      {worried && (
        <g fill="none" stroke={LINE} strokeWidth="2.6" strokeLinecap="round">
          <path d="M31 53 L41 50" />
          <path d="M65 53 L55 50" />
        </g>
      )}

      {/* 입 */}
      {mood === 'hello' || mood === 'happy' ? (
        <path d="M42 68 Q48 80 54 68 Z" fill={MOUTH} stroke={LINE} strokeWidth="2.6" strokeLinejoin="round" />
      ) : (
        <path
          d={mood === 'sorry' ? 'M43 73 Q48 68 53 73' : mood === 'care' ? 'M43 71 Q48 73 53 71' : 'M44 71 Q48 69 52 71'}
          fill="none"
          stroke={LINE}
          strokeWidth="2.8"
          strokeLinecap="round"
        />
      )}

      {mood === 'think' && (
        <text x="76" y="34" fontSize="26" fontWeight="700" fill={LEAF_DEEP} stroke="none" fontFamily="sans-serif">
          ?
        </text>
      )}
      {mood === 'sorry' && <path d="M80 40 C84 46 85 50 81 52 C77 53 76 48 80 40 Z" fill="#9ccbea" stroke={LINE} strokeWidth="2" />}
    </svg>
  )
}
