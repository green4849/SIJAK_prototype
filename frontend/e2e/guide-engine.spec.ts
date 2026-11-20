/**
 * 시작이 답 고르기 (C14) — 브라우저 없이 엔진만 본다.
 * 어르신이 실제로 쓸 법한 여러 말투가 맞는 안내로 가는지, 그리고 위기·위급이 늘 먼저인지.
 * 새 화면·새 안내를 넣으면 여기에 질문을 더한다.
 */
import { expect, test } from '@playwright/test'
import { answer, normalize } from '../src/features/guide/lib/engine'
import { SCREENS, type ScreenId } from '../src/features/guide/lib/screens'
import { TARGETS } from '../src/features/guide/lib/targets'
import { TOPICS } from '../src/features/guide/lib/topics'
import type { GuideContext } from '../src/features/guide/lib/types'

const ctx = (screen: ScreenId, extra: Partial<GuideContext> = {}): GuideContext => ({
  pathname: '/',
  screen,
  variant: '',
  signedIn: !SCREENS[screen].guest,
  demo: true,
  ...extra,
})

const idOf = (q: string, c = ctx('home')) => answer(q, c).id

/** [질문, 기대하는 안내] — 홈 화면에서 물었을 때 */
const CASES: [string, string][] = [
  // 지금 화면
  ['이 화면에서 뭘 해야 해?', 'screen'], ['여기서 뭐 해요', 'screen'], ['어떻게 해야 해', 'screen'],
  ['모르겠어', 'screen'], ['도와줘', 'screen'], ['다음에 뭐 눌러', 'screen'],
  // 친구
  ['친구 신청은 어떻게 해?', 'friend-request'], ['친구 사귀고 싶어', 'friend-request'],
  ['친구는 어떻게 찾나요', 'friend-request'], ['이웃을 만나고 싶어요', 'friend-request'],
  ['친구 신청이 왔는데 어떻게 받아', 'friend-accept'], ['받은 신청 수락하려면', 'friend-accept'],
  ['가까운 이웃만 보고 싶어', 'friend-nearby'], ['내 친구 목록 어디', 'friend-list'],
  // 대화
  ['친구랑 대화하고 싶어', 'chat-start'], ['메시지 어떻게 보내', 'chat-start'],
  ['친구랑 이야기하고 싶어', 'chat-start'], ['답장은 어떻게 해요', 'chat-start'],
  ['목소리로 보낼 수 있어?', 'chat-voice'], ['글씨 쓰기가 어려워', 'chat-voice'],
  ['무슨 말을 해야 할지 모르겠어', 'chat-topics'],
  ['이상한 사람 신고하고 싶어', 'report-block'], ['차단하려면', 'report-block'], ['차단 풀고 싶어', 'unblock'],
  // 지역생활
  ['동네 모임 알려줘', 'activities'], ['모임 신청 어떻게 해', 'activity-apply'],
  ['신청 취소하고 싶어', 'activity-cancel'], ['그날 못 가요', 'activity-cancel'],
  ['내가 신청한 활동 어디서 봐', 'activity-mine'], ['복지관 어디 있어', 'welfare'], ['경로당 찾아줘', 'welfare'],
  // 말동무와의 역할 구분
  ['말동무가 뭐야', 'companion'], ['심심해', 'companion'], ['외로워요', 'companion'], ['이야기하고 싶어', 'companion'],
  // 화면·설정
  ['글씨를 키우고 싶어', 'font'], ['글자가 너무 작아', 'font'], ['잘 안 보여', 'font'],
  ['글씨가 작아서 눈이 아파', 'font'], ['화면이 흐릿해', 'contrast'], ['진동 꺼줘', 'vibration'],
  ['내 소개 바꾸고 싶어', 'profile'], ['이사했어', 'location'], ['포인트는 뭐야', 'points'], ['돈 내야 해?', 'points'],
  ['알림 끄고 싶어', 'notify-settings'], ['새 소식 어디서 봐', 'inbox'], ['보호자 등록하려면', 'guardians'],
  ['긴급 버튼은 뭐야', 'sos-how'], ['마음 날씨가 뭐야', 'wellbeing'], ['게임 하고 싶어', 'brain'],
  ['주소 치기 어려워', 'install'], ['아이콘 만들고 싶어', 'install'],
  ['인증번호가 안 와', 'login-code'], ['로그아웃 어떻게 해', 'logout'], ['탈퇴하고 싶어', 'withdraw'],
  ['도움말 어디 있어', 'help-page'], ['내 전화번호 남한테 보여?', 'privacy'],
  // 앱·시작이
  ['시작이는 누구야', 'who-are-you'], ['너 사람이야?', 'who-are-you'], ['진짜 상담원이에요?', 'who-are-you'],
  ['이 앱은 뭐 하는 거야', 'what-is-app'], ['뒤로 가고 싶어', 'back'], ['읽어 줘', 'listen'],
  // 안전 — 앱 안내보다 먼저
  ['살려줘', 'emergency'], ['가슴이 너무 아파', 'emergency'], ['넘어졌어 못 일어나겠어', 'emergency'],
  ['불이 났어', 'emergency'], ['누가 협박해', 'emergency'],
  ['죽고 싶어', 'crisis'], ['살기 싫다', 'crisis'],
  ['누가 돈 보내 달래', 'scam'], ['계좌번호 알려 달래요', 'scam'], ['인증번호 알려 달라는데', 'scam'], ['보이스피싱 같아', 'scam'],
  ['무릎이 아파', 'medical'], ['혈압약 먹어도 돼?', 'medical'],
  // 모르는 것은 모른다고
  ['오늘 날씨 어때', 'unknown'], ['김치찌개 끓이는 법', 'unknown'], ['대통령이 누구야', 'unknown'],
  ['안녕', 'hello'], ['고마워', 'thanks'],
]

test('여러 말투의 질문이 맞는 안내로 간다', () => {
  const wrong = CASES.map(([q, want]) => [q, want, idOf(q)]).filter(([, want, got]) => want !== got)
  expect(wrong.map(([q, want, got]) => `「${q}」 → ${got} (기대: ${want})`)).toEqual([])
})

test('띄어쓰기·문장부호가 달라도 같은 답', () => {
  expect(normalize('친구 신청은, 어떻게 해?')).toBe('친구신청은어떻게해')
  expect(idOf('친구신청어떻게해')).toBe('friend-request')
  expect(idOf('글 씨 를  키 우 고 싶 어 !!')).toBe('font')
})

test('같은 말도 보고 있는 화면에 따라 답이 달라진다', () => {
  // 무엇을 신청하는지 말하지 않았을 때 — 홈에서는 되묻고, 그 화면에서는 그 화면의 신청으로
  expect(answer('신청 어떻게 해', ctx('home')).kind).toBe('clarify')
  expect(idOf('신청 어떻게 해', ctx('friends'))).toBe('friend-request')
  expect(idOf('신청 어떻게 해', ctx('activity', { variant: 'open' }))).toBe('activity-apply')
  // 화면 상태도 본다
  expect(answer('이 화면에서 뭘 해야 해?', ctx('phone', { variant: 'code' })).text).toContain('여섯 자리')
  expect(answer('이 화면에서 뭘 해야 해?', ctx('phone', { variant: 'identity' })).text).toContain('인증번호 받기')
  expect(answer('신청하고 싶어', ctx('activity', { variant: 'full' })).text).toContain('자리가 다 찼어요')
})

test('위기·위급은 앱 사용법보다 먼저, 전화가 맨 앞', () => {
  for (const q of ['친구 신청하다가 쓰러졌어 살려줘', '글씨 키우는 법 알려줘 근데 죽고 싶어', '대화하다가 돈 보내 달래']) {
    const r = answer(q, ctx('home'))
    expect(r.kind, q).toBe('safety')
    expect(r.actions?.[0].kind, q).toBe('call')
  }
  const crisis = answer('죽고 싶어', ctx('home'))
  expect(crisis.actions?.[0]).toMatchObject({ kind: 'call', number: '109' })
  const emergency = answer('숨이 안 쉬어져', ctx('welcome'))
  expect(emergency.actions?.[0]).toMatchObject({ kind: 'call', number: '119' })
  // 가입 전에는 들어갈 수 없는 긴급 화면을 권하지 않는다
  expect(emergency.actions?.some((a) => a.kind === 'go')).toBe(false)
  expect(answer('강도가 들었어', ctx('home')).actions?.[0]).toMatchObject({ number: '112' })
})

test('대신 해 주는 동작은 없다 — 짚어 주기·이동·전화·화면 설정·되묻기뿐', () => {
  const allowed = ['show', 'walk', 'go', 'call', 'setting', 'ask']
  for (const screen of Object.keys(SCREENS) as ScreenId[]) {
    for (const [q] of CASES) {
      for (const a of answer(q, ctx(screen)).actions ?? []) expect(allowed).toContain(a.kind)
    }
  }
})

test('모르는 질문은 지어내지 않고, 확인할 수 있는 것을 알려 준다', () => {
  const r = answer('내일 비 와?', ctx('friends'))
  expect(r.kind).toBe('unknown')
  expect(r.text).toContain('제가 몰라요')
  expect(r.actions?.map((a) => a.kind)).toEqual(expect.arrayContaining(['ask', 'go']))
})

test('가입 전에는 들어가야 쓸 수 있는 기능의 길을 안내하지 않는다', () => {
  const r = answer('친구 신청은 어떻게 해?', ctx('welcome'))
  expect(r.kind).toBe('boundary')
  expect(r.actions?.every((a) => a.kind === 'ask')).toBe(true)
  expect(idOf('글씨 키우고 싶어', ctx('welcome'))).toBe('font')
  expect(idOf('인증번호가 안 와요', ctx('phone', { variant: 'code' }))).toBe('login-code')
})

test('시연에서만 하는 말은 시연 빌드에서만 붙는다', () => {
  expect(answer('친구 신청은 어떻게 해?', ctx('home')).note).toContain('시연')
  expect(answer('친구 신청은 어떻게 해?', ctx('home', { demo: false })).note).toBeUndefined()
  expect(answer('너 사람이야?', ctx('home')).text).toContain('사람은 아니고')
})

test('되물음 — "어디 있어?"는 앞의 답을 이어 받는다', () => {
  const first = answer('친구 신청은 어떻게 해?', ctx('home'))
  const next = answer('어디 있어?', ctx('home', { last: first }))
  expect(next.run?.kind).toBe('walk')
  expect(answer('다시 말해 줘', ctx('home', { last: first })).text).toBe(first.text)
})

test('안내 자료가 서로 맞물린다 — 화면의 추천 질문·짚을 대상이 모두 있다', () => {
  const topicIds = new Set(TOPICS.map((t) => t.id))
  expect(new Set(TOPICS.map((t) => t.id)).size).toBe(TOPICS.length)
  for (const [id, screen] of Object.entries(SCREENS)) {
    for (const s of screen.suggest) expect(topicIds, `${id} 화면의 추천 질문 ${s}`).toContain(s)
    // 가입 전 화면에는 가입 전에도 답할 수 있는 질문만 권한다
    if (screen.guest) for (const s of screen.suggest) expect(TOPICS.find((t) => t.id === s)?.audience, `${id}: ${s}`).toBe('any')
  }
  // 대표 질문은 자기 주제로 돌아와야 한다 (제안 버튼을 눌렀는데 다른 답이 나오면 안 된다)
  for (const t of TOPICS) expect(idOf(t.ask, ctx(t.audience === 'any' ? 'welcome' : 'home', { signedIn: true })), t.ask).toBe(t.id)
  expect(Object.keys(TARGETS).length).toBeGreaterThan(40)
})

test('말은 짧게, 할 일부터 — 옆에서 봐 주는 사람처럼', () => {
  // 화면 소개로 시작하기, 자기 설명, 기계가 쓴 티가 나는 표기
  const BANNED: [RegExp, string][] = [
    [/화면이에요|화면입니다/, '화면 소개로 시작하지 않는다 (보면 안다)'],
    [/제가 대신|저는 대신|대신 하지 않|대신 눌러/, '시작이 자신에 대한 설명'],
    [/준비한 안내에|지어내지/, '시작이 자신에 대한 설명'],
    [/—|을\(를\)|이\(가\)|\(약 /, '줄표·조사 병기·괄호 설명'],
    [/습니다|하십시오|드리겠/, '딱딱한 말투'],
  ]
  const sentences = (text: string) => text.split(/[.?!]\s*/).filter(Boolean).length
  const seen = new Set<string>()
  const check = (where: string, text: string, maxChars: number, maxSentences: number) => {
    if (seen.has(text)) return
    seen.add(text)
    expect.soft(text.length, `${where}: "${text}"`).toBeLessThanOrEqual(maxChars)
    expect.soft(sentences(text), `${where}: "${text}"`).toBeLessThanOrEqual(maxSentences)
    for (const [pattern, why] of BANNED) expect.soft(pattern.test(text), `${where} — ${why}: "${text}"`).toBe(false)
  }

  const VARIANTS = ['', 'code', 'identity', 'region', 'interests', 'blocked', 'warning', 'open', 'empty', 'list', 'applied', 'full', 'received', 'afterSignup', 'info']
  for (const [id, screen] of Object.entries(SCREENS) as [ScreenId, (typeof SCREENS)[ScreenId]][]) {
    if (screen.hidden) continue
    if (screen.hint) check(`${id} 첫마디`, screen.hint, 26, 2)
    for (const variant of VARIANTS) {
      const help = screen.help(variant, ctx(id, { variant }))
      check(`${id}/${variant} 화면 안내`, help.text, 50, 2)
      if (help.demoNote) check(`${id}/${variant} 시연 알림`, help.demoNote, 40, 2)
    }
  }

  for (const topic of TOPICS) {
    for (const screen of [...(topic.screens ?? []), 'home', 'welcome'] as ScreenId[]) {
      for (const variant of VARIANTS) {
        for (const signedIn of [true, false]) {
          const body = topic.reply(ctx(screen, { variant, signedIn }), topic.ask)
          check(`${topic.id}@${screen}/${variant}`, body.text, 62, 2)
          for (const step of body.steps ?? []) check(`${topic.id} 차례`, step, 34, 1)
          expect(body.steps?.length ?? 0, topic.id).toBeLessThanOrEqual(3)
          if (body.demoNote) check(`${topic.id} 시연 알림`, body.demoNote, 40, 2)
        }
      }
    }
  }

  // 길을 짚을 때 하는 말도 한두 마디
  for (const q of CASES.map(([q]) => q)) {
    for (const screen of ['home', 'friends', 'chat', 'me'] as ScreenId[]) {
      const reply = answer(q, ctx(screen))
      if (reply.kind === 'safety') continue
      check(`"${q}"@${screen}`, reply.text, 62, 2)
      for (const a of reply.actions ?? []) {
        if (a.kind === 'show') check(`"${q}" 짚는 말`, a.say, 42, 2)
        if (a.kind === 'walk') for (const step of a.steps) check(`"${q}" 길 안내`, step.say, 42, 2)
      }
    }
  }
})
