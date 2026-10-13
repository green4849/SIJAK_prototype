/**
 * 말동무 답 만들기 — 데모용 규칙 (C8).
 * 실제 서비스는 보고서 4.5 파이프라인(정서 분석 → 컨텍스트 → LLM → 가드레일)이 하는 일을
 * 키워드 몇 개로 흉내 낸다. 가드레일 순서(위기 → 의료 → 나머지)만은 실제와 같게 둔다.
 */
import { INTERESTS } from './constants'
import { db, type DCompanionMsg, type DUser } from './store'

type Emotion = NonNullable<DCompanionMsg['emotion']>

export interface DraftReply {
  text: string
  suggestion: DCompanionMsg['suggestion']
  safety: DCompanionMsg['safety']
  emotion: Emotion
}

/** '말하기'를 눌렀을 때 받아쓴 것처럼 차례로 쓰는 문장 (STT 흉내) */
export const VOICE_SAMPLES = [
  '오늘은 비가 와서 마음이 좀 가라앉네요',
  '어제 손주가 전화를 했어요. 목소리 들으니 좋더라고요',
  '요즘 무릎이 좀 아파요',
  '젊었을 때 고향에서 농사짓던 생각이 나네요',
  '요즘 좀 심심해요. 뭐 재미있는 거 없을까요',
]

export const STARTERS = ['오늘 기분이 어떤지 말할래요', '옛날 이야기 하고 싶어요', '동네 모임 알려 줘요']

const has = (text: string, re: RegExp) => re.test(text.replace(/\s+/g, ' '))

/** 관심사 → 어울리는 활동 분류 */
const INTEREST_CATEGORY: Record<string, string> = {
  walking: 'health', health: 'health', music: 'culture', tv: 'culture', memories: 'culture',
  reading: 'learning', gardening: 'learning', cooking: 'learning', crafts: 'learning', travel: 'culture',
}

/** 사는 지역의 다가오는 활동 하나 — 관심사와 맞는 것 먼저 (보고서: RAG 지역 복지 정보) */
function pickActivity(me: DUser): DCompanionMsg['suggestion'] {
  const now = Date.now()
  const prefer = new Set(me.interests.map((i) => INTEREST_CATEGORY[i]).filter(Boolean))
  const list = db()
    .activities.filter((a) => a.region_code === me.region_code && new Date(a.starts_at).getTime() > now)
    .sort((a, b) => Number(prefer.has(b.category)) - Number(prefer.has(a.category)) || a.starts_at.localeCompare(b.starts_at))
  const a = list[0]
  return a ? { activity_id: a.id, title: a.title, schedule_text: a.schedule_text } : null
}

const pick = <T,>(list: T[], seed: number) => list[seed % list.length]

export function draftReply(me: DUser, text: string, turn: number): DraftReply {
  const base = { suggestion: null, safety: null } as const

  // ① 위기 — 가장 먼저. 공감 + 혼자 두지 않기 + 전화 안내(화면이 버튼으로)
  if (has(text, /죽고 ?싶|살기 ?싫|사라지고 ?싶|자살|목숨|끝내고 ?싶/))
    return {
      ...base,
      safety: 'crisis',
      emotion: 'sadness',
      text: `${me.name}님, 많이 힘드셨군요. 말씀해 주셔서 고마워요. 혼자 견디지 않으셔도 돼요. 지금 바로 이야기 들어 줄 분과 연결해 드릴게요.`,
    }

  // ② 의료 — 진단·약 이야기는 하지 않는다
  if (has(text, /아파|아프|통증|약을|약 |병원|혈압|당뇨|어지러/))
    return {
      ...base,
      safety: 'medical',
      emotion: 'anxiety',
      text: '많이 불편하시겠어요. 몸 상태나 약은 제가 판단해 드릴 수 없어요. 꼭 의사 선생님께 여쭤보세요. 오늘 병원에 다녀오실 수 있으세요?',
    }

  // ③ 외로움·우울 — 공감 + 동네 활동 하나
  if (has(text, /외로|쓸쓸|우울|슬프|가라앉|울적|혼자|적적/)) {
    const suggestion = pickActivity(me)
    return {
      ...base,
      suggestion,
      emotion: 'sadness',
      text: suggestion
        ? `그런 날이 있지요. 제가 곁에서 이야기 들을게요. 그리고 이번에 동네에서 '${suggestion.title}'이 있어요. 이웃들 얼굴 보면 기분이 좀 나아지실 거예요.`
        : '그런 날이 있지요. 제가 곁에서 이야기 들을게요. 오늘 가장 마음에 남은 일은 뭐였어요?',
    }
  }

  // ④ 심심·모임
  if (has(text, /심심|모임|활동|재미|할 ?거|놀러|나가/)) {
    const suggestion = pickActivity(me)
    return {
      ...base,
      suggestion,
      emotion: 'neutral',
      text: suggestion
        ? `이런 건 어떠세요? 우리 동네 '${suggestion.title}' — ${suggestion.schedule_text}이에요.`
        : '지역생활 탭에 동네 모임이 모여 있어요. 같이 한번 볼까요?',
    }
  }

  // ⑤ 옛날 이야기
  if (has(text, /옛날|젊었|추억|고향|어릴|그때/))
    return {
      ...base,
      emotion: 'joy',
      text: pick(
        [
          '그 시절 이야기 정말 듣고 싶어요. 그때 가장 즐거웠던 날은 언제였어요?',
          '고향 하면 어떤 냄새가 떠오르세요? 저는 그런 이야기가 참 좋아요.',
        ],
        turn,
      ),
    }

  // ⑥ 가족
  if (has(text, /손주|손자|손녀|아들|딸|며느리|사위|가족/))
    return {
      ...base,
      emotion: 'joy',
      text: '가족 목소리를 들으면 하루가 환해지지요. 손주에게 하고 싶은 말이 있으면 저한테 먼저 연습해 보셔도 돼요.',
    }

  // ⑦ 날씨
  if (has(text, /비가|비 와|날씨|추워|더워|눈이|바람/))
    return {
      ...base,
      emotion: 'neutral',
      text: '날씨에 따라 마음도 달라지지요. 따뜻한 차 한 잔 드시면서 쉬엄쉬엄 지내세요. 창밖은 어때요?',
    }

  // ⑧ 식사
  if (has(text, /밥|먹었|점심|저녁|아침|식사|반찬/))
    return { ...base, emotion: 'neutral', text: '잘 챙겨 드셨다니 다행이에요. 오늘은 어떤 반찬이 제일 맛있었어요?' }

  // ⑨ 좋은 일
  if (has(text, /좋아|기뻐|행복|재밌|즐거|고마/))
    return { ...base, emotion: 'joy', text: '듣는 저도 기분이 좋아지네요! 어떤 일이었는지 조금 더 들려주세요.' }

  // ⑩ 시작 버튼
  if (has(text, /기분/)) return { ...base, emotion: 'neutral', text: '네, 들을게요. 오늘 마음을 날씨로 말하면 맑음, 흐림, 비 중에 어떤 쪽이에요?' }

  // 그 밖 — 관심사로 말 이어 가기
  const interest = INTERESTS[pick(me.interests, turn) ?? ''] ?? '좋아하시는 것'
  return {
    ...base,
    emotion: 'neutral',
    text: pick(
      [
        `그렇군요. 말씀 들으니 더 궁금해져요. 요즘 ${interest}은(는) 자주 하세요?`,
        '그러셨군요. 그때 기분은 어떠셨어요?',
        `${me.name}님 이야기는 늘 재미있어요. 조금 더 들려주세요.`,
      ],
      turn,
    ),
  }
}
