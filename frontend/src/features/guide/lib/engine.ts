/**
 * 기기 안에서 답을 고르는 엔진 — 서버도 AI도 쓰지 않는다 (GitHub Pages 시연에서 그대로 돈다).
 *
 * 차례: ① 위기·위급·금전 요구 → ② 앱 사용법 주제 → ③ "이 화면에서 뭘 해?" →
 *       ④ 되물음("어디 있어?", "다시") → ⑤ 인사 → ⑥ 몸 상태 → ⑦ 모른다고 말하기
 * 답은 모두 사람이 미리 써 둔 것이고, 새 문장을 지어내지 않는다. 그래서 자유로운 표현을
 * 다 알아듣지는 못한다 — 한계와 실제 AI로 바꿀 때의 자리는 docs/tasks/C14-sijagi-guide.md.
 */
import { medicalReply, urgentReply } from './safety'
import { SCREENS } from './screens'
import { TOPICS, topicById, type Topic, type TopicBody } from './topics'
import type { GuideAction, GuideContext, GuideEngine, GuideReply } from './types'

/** 소문자로, 띄어쓰기·문장부호 없이 — "친구 신청은 어떻게 해?" → "친구신청은어떻게해" */
export const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^0-9a-z가-힣]/g, '')

const ACCEPT = 3

/** 지금 화면 자체를 묻는 말 */
const HERE =
  /(이|요|현재)(화면|페이지|창)|여기(서|선|는|가|에서)?(뭐|무엇|뭘|어떻게|어디|무슨)|지금(뭐|뭘|무엇|어떻게)|이게(뭐|무슨)|이건(뭐|무슨)|다음(에|은|엔)?(뭐|뭘|어떻게|무엇)|(뭐|뭘|무엇을|어디를|어딜|어느걸)(눌러|누르|해야|하면|하지)|어떻게(해야|하면|하지|해요|해$|하나요|하는거)|모르겠|막혔|막혀|헷갈|어려워|못하겠|도와(줘|주|줄)|도움(이)?필요|알려(줘|주세요)$/

const FOLLOW_UP = /어디|어딨|보여|짚어|가르쳐|데려|같이가|가보|가줘|어떻게가/
const REPEAT = /^(다시|한번더|한번만더|뭐라고|못들었|천천히|다시말|다시알려)/
const HELLO = /^(안녕|반가|하이|헬로|여보세요|시작이야|시작아|저기)/
const THANKS = /고마|고맙|감사|땡큐|수고|잘됐|됐어|됐다|알겠|알았/

interface Scored {
  topic: Topic
  score: number
}

/** 주제별 점수 — 단서 점수의 합, 물어본 화면이 그 주제의 자리면 +1 */
export function scoreTopics(q: string, ctx: GuideContext): Scored[] {
  return TOPICS.map((topic) => {
    let score = 0
    for (const [cue, weight] of topic.cues) if (cue.test(q)) score += weight
    if (score > 0 && topic.screens?.includes(ctx.screen)) score += 1
    return { topic, score }
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
}

function fromBody(id: string, kind: GuideReply['kind'], body: TopicBody, ctx: GuideContext): GuideReply {
  return {
    id,
    kind,
    mood: body.mood ?? 'hello',
    text: body.text,
    steps: body.steps,
    actions: body.actions,
    note: ctx.demo ? body.demoNote : undefined,
  }
}

const askAction = (topic: Topic): GuideAction => ({ kind: 'ask', label: topic.ask, question: topic.ask })

/** "이 화면에서 뭘 해야 해요?" */
export function screenReply(ctx: GuideContext): GuideReply {
  const help = SCREENS[ctx.screen].help(ctx.variant, ctx)
  return {
    id: 'screen',
    kind: 'screen',
    mood: 'hello',
    text: help.text,
    steps: help.steps,
    actions: help.actions,
    note: ctx.demo ? help.demoNote : undefined,
  }
}

function topicReply(topic: Topic, ctx: GuideContext, q: string): GuideReply {
  // 가입 전에는 들어가야 쓸 수 있는 기능의 길을 안내하지 않는다 (그 화면에 갈 수 없다)
  if (!ctx.signedIn && topic.audience !== 'any')
    return {
      id: topic.id,
      kind: 'boundary',
      mood: 'hello',
      text: '그건 가입하고 나면 쓸 수 있어요. 지금은 이 화면부터 해 볼까요?',
      actions: [{ kind: 'ask', label: '이 화면에서 뭘 해야 해요?', question: '이 화면에서 뭘 해야 해요?' }],
    }
  const kind = topic.id === 'companion' ? 'boundary' : 'answer'
  return fromBody(topic.id, kind, topic.reply(ctx, q), ctx)
}

function unknownReply(ctx: GuideContext): GuideReply {
  const suggestions = SCREENS[ctx.screen].suggest
    .map(topicById)
    .filter((t): t is Topic => Boolean(t) && (ctx.signedIn || t!.audience === 'any'))
    .slice(0, 2)
  return {
    id: 'unknown',
    kind: 'unknown',
    mood: 'sorry',
    text: '죄송해요, 그건 제가 몰라요. 앱 쓰는 법이라면 이런 것을 알려 드릴 수 있어요.',
    actions: [
      { kind: 'ask', label: '이 화면에서 뭘 해야 해요?', question: '이 화면에서 뭘 해야 해요?' },
      ...suggestions.map(askAction),
      ctx.signedIn ? { kind: 'go', label: '도움말 보기', to: '/me/help' } : { kind: 'go', label: '함께 하는 방법 보기', to: '/login/help' },
    ],
    note: '가족이나 복지관 직원에게 이 화면을 보여 주셔도 좋아요.',
  }
}

export function answer(question: string, ctx: GuideContext): GuideReply {
  const q = normalize(question)
  if (!q) return screenReply(ctx)

  // ① 안전이 먼저
  const urgent = urgentReply(q, ctx)
  if (urgent) return urgent

  // ② 앱 사용법
  const scored = scoreTopics(q, ctx)
  const best = scored[0]
  const tied = best ? scored.filter((s) => s.score === best.score) : []
  // 단서가 약해도, 그 주제의 화면에서 물었고 겨루는 주제가 없으면 그 화면의 일로 본다
  const atHome = best && best.score === ACCEPT - 1 && tied.length === 1 && best.topic.screens?.includes(ctx.screen)
  if (best && (best.score >= ACCEPT || atHome)) {
    if (tied.length === 1) return topicReply(best.topic, ctx, q)
    return {
      id: 'clarify',
      kind: 'clarify',
      mood: 'think',
      text: '어떤 걸 물으셨어요?',
      actions: tied.slice(0, 3).map((s) => askAction(s.topic)),
    }
  }

  // ③ 지금 화면
  if (HERE.test(q) && !best) return screenReply(ctx)

  // 단서가 약할 때는 넘겨짚지 않고 되묻는다
  if (best)
    return {
      id: 'clarify',
      kind: 'clarify',
      mood: 'think',
      text: '잘 못 알아들었어요. 혹시 이 중에 있어요?',
      actions: [
        ...scored.slice(0, 2).map((s) => askAction(s.topic)),
        { kind: 'ask', label: '이 화면에서 뭘 해야 해요?', question: '이 화면에서 뭘 해야 해요?' },
      ],
    }

  // ④ 앞의 답을 두고 되묻는 말
  const last = ctx.last
  if (last) {
    const runnable = last.actions?.find((a) => a.kind === 'show' || a.kind === 'walk' || a.kind === 'go')
    if (FOLLOW_UP.test(q) && runnable)
      return { id: 'follow-up', kind: 'chat', mood: 'happy', text: '네, 보여 드릴게요.', run: runnable }
    if (REPEAT.test(q)) return { ...last, run: undefined }
  }

  // ⑤ 인사
  if (HELLO.test(q))
    return {
      id: 'hello',
      kind: 'chat',
      mood: 'hello',
      text: '안녕하세요! 뭐가 궁금하세요?',
    }
  if (THANKS.test(q)) return { id: 'thanks', kind: 'chat', mood: 'happy', text: '네, 또 막히면 불러 주세요.' }

  // ⑥ 몸 상태 → ⑦ 모르는 것은 모른다고
  return medicalReply(q) ?? unknownReply(ctx)
}

/** 지금 쓰는 엔진. 실제 AI를 붙일 때는 같은 계약의 서버 엔진으로 바꾼다 */
export const localEngine: GuideEngine = {
  ask: (question, context) => Promise.resolve(answer(question, context)),
}
