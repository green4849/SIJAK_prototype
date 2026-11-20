/**
 * 시작이가 답할 수 있는 앱 사용법 — 사람이 검수한 안내 목록.
 *
 * 알아듣기: 띄어쓰기를 지운 문장에서 단서(cue)를 찾아 점수를 더한다 (engine.ts).
 * 문구 규칙: 한 문장은 짧게, 버튼은 화면에 적힌 글자 그대로 ‘’ 안에, 차례는 세 줄 이하.
 * 신청·신고·보내기처럼 되돌리기 어려운 일은 어디를 누르는지만 알려 주고 누르는 것은 사용자에게 맡긴다.
 */
import { TAB_SCREENS, type ScreenId } from './screens'
import type { TargetId } from './targets'
import type { GuideAction, GuideContext, Mood, WalkStep } from './types'

export interface TopicBody {
  text: string
  steps?: string[]
  actions?: GuideAction[]
  /** 시연 빌드에서만 덧붙이는 말 */
  demoNote?: string
  mood?: Mood
}

export interface Topic {
  id: string
  /** 제안 버튼·되묻기에 쓰는 대표 질문 */
  ask: string
  /** [찾을 표현, 점수] — 3점 이상이면 그 주제로 본다. 1점은 '그럴 수도' */
  cues: [RegExp, number][]
  /** 이 화면에서 물으면 이 주제일 가능성이 더 높다 */
  screens?: ScreenId[]
  /** 기본은 본인 확인을 마친 사람용. 'any' 는 가입 전에도 답한다 */
  audience?: 'member' | 'any'
  reply: (ctx: GuideContext, question: string) => TopicBody
}

const nav = (target: TargetId, name: string): WalkStep => ({
  on: TAB_SCREENS,
  target,
  say: `먼저 아래 ‘${name}’ 메뉴를 누르세요.`,
})

const walk = (via: string, steps: WalkStep[], label = '같이 가 보기'): GuideAction => ({ kind: 'walk', label, via, steps })

const show = (label: string, target: TargetId, say: string): GuideAction => ({ kind: 'show', label, target, say })

/** 마이페이지 메뉴 한 줄로 가는 길 */
const viaMe = (target: TargetId, name: string, next?: WalkStep): GuideAction =>
  walk('/me', [nav('nav-me', '마이페이지'), { on: ['me'], target, say: `여기 ${name}을(를) 누르세요.` }, ...(next ? [next] : [])])

const AUTO_REPLY_NOTE = '시연 화면에서는 이웃이 자동으로 답해요. 실제 사람이 응답하는 것이 아니에요.'

export const TOPICS: Topic[] = [
  // ───────── 친구
  {
    id: 'friend-request',
    ask: '친구 신청은 어떻게 해요?',
    cues: [
      [/친구.{0,6}(신청|맺|추가|사귀|만들|찾|추천|구하|소개)|친구(가|를)?(되고|하고)싶/, 4],
      [/이웃(을|과|이랑)?(찾|만나|사귀)|사람(을)?(만나|사귀)/, 3],
      [/친구|신청/, 1],
    ],
    screens: ['friends'],
    reply: (ctx) =>
      ctx.screen === 'friends'
        ? {
            text: '이 화면에서 하시면 돼요. 이웃 카드를 보고 마음에 드는 분의 ‘친구 신청’을 누르세요. 상대가 받아 주면 친구가 돼요.',
            actions: [show('‘친구 신청’ 어디 있어요?', 'friend-request', '여기 ‘친구 신청’이에요. 마음에 드는 분이면 직접 눌러 주세요.')],
            demoNote: AUTO_REPLY_NOTE,
          }
        : {
            text: '‘친구’ 화면에서 이웃에게 친구 신청을 보낼 수 있어요.',
            steps: ['아래 ‘친구’ 메뉴를 눌러요.', '이웃 카드를 살펴봐요.', '마음에 드는 분의 ‘친구 신청’을 눌러요.'],
            actions: [
              walk('/friends', [
                nav('nav-friends', '친구'),
                { on: ['friends'], target: 'friend-request', say: '여기 ‘친구 신청’이에요. 마음에 드는 분이면 직접 눌러 주세요.' },
              ]),
            ],
            demoNote: AUTO_REPLY_NOTE,
          },
  },
  {
    id: 'friend-accept',
    ask: '받은 친구 신청은 어디서 봐요?',
    cues: [
      [/(받은|온|들어온)(친구)?신청|신청(을|이)?(수락|받아|받았|왔|들어왔|온)|수락|친구(를)?받/, 6],
      [/친구신청(이)?(왔|온|와)/, 6],
    ],
    screens: ['friends', 'inbox'],
    reply: (ctx) => ({
      text:
        ctx.screen === 'friends' && ctx.variant !== 'received'
          ? '지금은 받은 친구 신청이 없어요. 신청이 오면 이 화면 맨 위에 ‘나에게 온 친구 신청’이 생겨요.'
          : '받은 신청은 ‘친구’ 화면 맨 위 ‘나에게 온 친구 신청’에 나와요. ‘수락하기’를 누르면 친구가 되고, 아직 모르겠으면 ‘다음에’를 누르세요.',
      actions:
        ctx.screen === 'friends' && ctx.variant !== 'received'
          ? undefined
          : [
              walk('/friends', [
                nav('nav-friends', '친구'),
                { on: ['friends'], target: 'friend-accept', say: '친구가 되고 싶으시면 여기 ‘수락하기’를 누르세요.' },
              ]),
            ],
    }),
  },
  {
    id: 'friend-nearby',
    ask: '가까이 사는 이웃만 보고 싶어요',
    cues: [[/같은동네|가까운(이웃|친구|사람|분)|근처(이웃|친구|사람|분|에사는)|동네(이웃|친구|사람|분)|가까이사는/, 5]],
    screens: ['friends'],
    reply: () => ({
      text: '‘친구’ 화면에서 ‘같은 동네’를 누르면 가까운 이웃만 보여요. 위치를 아직 알려 주지 않았다면 ‘내 위치 사용하기’가 먼저 나와요. 위치는 동네 정도(약 1km)로만 저장해요.',
      actions: [
        walk('/friends', [
          nav('nav-friends', '친구'),
          { on: ['friends'], target: 'friends-nearby', say: '여기 ‘같은 동네’를 누르세요.' },
        ]),
      ],
    }),
  },
  {
    id: 'friend-list',
    ask: '내 친구는 어디서 봐요?',
    cues: [[/내친구|친구목록|친구(들)?(이|은|는)?(누구|몇)|친구가된/, 5]],
    screens: ['me', 'myfriends'],
    reply: (ctx) =>
      ctx.screen === 'myfriends'
        ? { text: '지금 이 화면이 내 친구 목록이에요. 이웃 카드의 ‘대화하기’를 누르면 이야기할 수 있어요.' }
        : { text: '마이페이지의 ‘내 친구 목록’에서 볼 수 있어요.', actions: [viaMe('me-friends', '‘내 친구 목록’')] },
  },
  {
    id: 'friend-rate',
    ask: '‘만나보고 싶어요’는 뭐예요?',
    cues: [[/만나보고싶|평가/, 4]],
    screens: ['friends'],
    reply: () => ({
      text: '추천 친구 카드 아래 ‘만나보고 싶어요’는 추천이 마음에 드는지 알려 주는 평가예요. 평가하면 포인트를 받는데, 하루에 받을 수 있는 횟수가 정해져 있어요.',
      actions: [
        walk('/friends', [nav('nav-friends', '친구'), { on: ['friends'], target: 'friend-rate', say: '여기 ‘만나보고 싶어요’예요.' }], '어디 있는지 보기'),
      ],
    }),
  },

  // ───────── 대화
  {
    id: 'chat-start',
    ask: '친구와 대화는 어떻게 해요?',
    cues: [
      [/대화|채팅|메시지|메세지|문자(를|는)?보내|말(을)?걸|연락(하|을)|답장|이야기(를)?(하|나누)|얘기(를)?(하|나누)/, 3],
      [/(친구|이웃|사람|그분)(랑|이랑|와|과|하고|에게|한테|들과).*(이야기|얘기|말|대화|연락)/, 2],
      [/보내(기|는법|려면)|쓰는법/, 1],
    ],
    screens: ['chats', 'chat', 'myfriends'],
    reply: (ctx) =>
      ctx.screen === 'chat'
        ? {
            text: '아래 입력칸에 하고 싶은 말을 쓰면 ‘보내기’가 나와요. 보내기는 직접 눌러 주세요.',
            actions: [show('입력칸 어디 있어요?', 'chat-input', '이 칸에 하고 싶은 말을 쓰세요. 다 쓰면 옆에 ‘보내기’가 나와요.')],
            demoNote: AUTO_REPLY_NOTE,
          }
        : {
            text: '친구가 된 이웃과 대화할 수 있어요.',
            steps: ['홈에서 ‘대화하기’를 눌러요.', '이야기할 이웃을 눌러요.', '아래 입력칸에 쓰고 ‘보내기’를 눌러요.'],
            actions: [
              walk('/chats', [
                { on: ['home'], target: 'home-chats', say: '먼저 여기 ‘대화하기’를 누르세요.' },
                { on: ['chats'], target: 'chats-room', say: '이야기하고 싶은 이웃을 누르세요.' },
                { on: ['chat'], target: 'chat-input', say: '이 칸에 하고 싶은 말을 쓰세요. 보내기는 직접 눌러 주세요.' },
              ]),
            ],
            demoNote: AUTO_REPLY_NOTE,
          },
  },
  {
    id: 'chat-voice',
    ask: '글 대신 목소리로 보낼 수 있어요?',
    cues: [
      [/음성|목소리|녹음|마이크/, 4],
      [/말로(보내|하|해)|글(씨|자)?(쓰기|치기)?(가|는)?(어려|힘들|못)|자판|타자/, 4],
    ],
    screens: ['chat', 'companion'],
    reply: (ctx) =>
      ctx.screen === 'companion'
        ? {
            text: '아래 ‘말하기’를 누르고 말씀하신 뒤 ‘다 말했어요’를 누르면 돼요.',
            actions: [show('‘말하기’ 어디 있어요?', 'companion-mic', '여기 ‘말하기’를 누르고 편하게 말씀하세요.')],
          }
        : {
            text: '대화 화면 입력칸 옆 ‘말하기’를 누르면 녹음이 시작돼요. 다 말한 뒤 ‘다 했어요, 보내기’를 누르면 목소리가 가요. 입력칸이 비어 있을 때만 ‘말하기’가 보여요.',
            actions: ctx.screen === 'chat' ? [show('‘말하기’ 어디 있어요?', 'chat-mic', '여기 ‘말하기’예요. 누르면 녹음이 시작돼요.')] : undefined,
          },
  },
  {
    id: 'chat-topics',
    ask: '무슨 말을 해야 할지 모르겠어요',
    cues: [[/무슨말|무슨얘기|할말(이|을)?(없|모르)|뭐라고(해|말|보내|쓰|써)|대화주제|첫마디|어색/, 5]],
    screens: ['chat'],
    reply: (ctx) => ({
      text: '대화 화면 입력칸 위 ‘대화 주제 추천’을 누르면 건넬 말이 나와요. 하나를 고르면 입력칸에 들어가고, 고쳐 써도 돼요. 보내기는 직접 눌러 주세요.',
      actions: ctx.screen === 'chat' ? [show('어디 있어요?', 'chat-topics', '여기 ‘대화 주제 추천’을 누르면 건넬 말이 나와요.')] : undefined,
    }),
  },
  {
    id: 'report-block',
    ask: '불편한 사람은 어떻게 신고해요?',
    cues: [
      [/신고/, 4],
      [/차단(하|해|을|시키|은)|차단$/, 4],
      [/막고싶|안보고싶|싫은사람|괴롭|욕(을|설)|이상한(사람|말|메시지)|불쾌|기분나쁜|무례/, 3],
    ],
    screens: ['chat', 'safety'],
    reply: (ctx) => ({
      text: '그분과의 대화 화면 오른쪽 위 ‘더보기’를 누르면 ‘신고하기’와 ‘차단하기’가 있어요. 신고하면 차단도 함께 되어 더는 대화할 수 없어요. 신고와 차단은 제가 대신 하지 않아요. 직접 눌러 주세요.',
      actions:
        ctx.screen === 'chat'
          ? [show('‘더보기’ 어디 있어요?', 'chat-more', '여기 ‘더보기’를 누르면 ‘신고하기’와 ‘차단하기’가 나와요.')]
          : [{ kind: 'go', label: '대화 목록으로 가기', to: '/chats' }],
      demoNote: '시연 화면에서는 신고가 실제 운영자에게 전달되지 않아요.',
    }),
  },
  {
    id: 'unblock',
    ask: '차단을 풀고 싶어요',
    cues: [[/차단(을)?(풀|해제|취소)|차단(한|된)(사람|이웃|목록|분)|차단목록/, 6]],
    screens: ['blocks', 'chat'],
    reply: (ctx) =>
      ctx.screen === 'blocks'
        ? { text: '이 화면에서 다시 이야기하고 싶은 분 옆 ‘차단 풀기’를 누르세요.' }
        : { text: '마이페이지의 ‘차단한 이웃’에서 ‘차단 풀기’를 누르면 돼요.', actions: [viaMe('me-blocks', '‘차단한 이웃’')] },
  },

  // ───────── 지역생활
  {
    id: 'activities',
    ask: '동네 모임은 어디서 봐요?',
    cues: [
      [/모임|활동|프로그램|행사|지역생활|나들이|취미|동아리|봉사/, 3],
      [/동네(에서|에)?(뭐|무슨)|할(거|게|것)(없|있|뭐)|놀(거|데|러)/, 3],
    ],
    screens: ['activities'],
    reply: (ctx) =>
      ctx.screen === 'activities'
        ? {
            text: '지금 이 화면이에요. 활동을 누르면 날짜와 장소가 나와요. 위쪽에서 ‘문화·여가’, ‘건강’ 같은 종류를 고를 수 있어요.',
            actions: [show('어디를 눌러요?', 'activity-item', '궁금한 활동을 누르면 자세한 내용이 나와요.')],
          }
        : {
            text: '아래 ‘지역생활’ 메뉴에 동네 모임과 활동이 모여 있어요.',
            actions: [
              walk('/activities', [
                nav('nav-activities', '지역생활'),
                { on: ['activities'], target: 'activity-item', say: '궁금한 활동을 누르면 날짜와 장소가 나와요.' },
              ]),
            ],
          },
  },
  {
    id: 'activity-apply',
    ask: '활동 신청은 어떻게 해요?',
    cues: [
      [/(활동|모임|프로그램|행사|봉사).*(신청|참여|참가|가고싶|나가고싶|등록)/, 6],
      [/신청하(기|고|려|는)|참여하(기|고|려|는)|참가/, 3],
      [/신청/, 1],
    ],
    screens: ['activities', 'activity'],
    reply: (ctx) =>
      ctx.screen === 'activity'
        ? ctx.variant === 'applied'
          ? { text: '이 활동은 이미 신청하셨어요. 못 가게 되면 아래 ‘신청 취소하기’를 누르세요.' }
          : ctx.variant === 'full'
            ? { text: '이 활동은 자리가 다 차서 지금은 신청할 수 없어요. 다른 활동을 찾아보세요.' }
            : {
                text: '일시와 장소를 확인하고, 가고 싶으면 아래 ‘신청하기’를 누르세요. 신청은 제가 대신 하지 않아요.',
                actions: [show('‘신청하기’ 어디 있어요?', 'activity-apply', '여기 ‘신청하기’예요. 가고 싶으시면 직접 눌러 주세요.')],
              }
        : {
            text: '‘지역생활’에서 활동을 고른 다음 신청할 수 있어요.',
            steps: ['아래 ‘지역생활’ 메뉴를 눌러요.', '가고 싶은 활동을 눌러요.', '아래 ‘신청하기’를 눌러요.'],
            actions: [
              walk('/activities', [
                nav('nav-activities', '지역생활'),
                { on: ['activities'], target: 'activity-item', say: '가고 싶은 활동을 누르세요.' },
                { on: ['activity'], target: 'activity-apply', say: '여기 ‘신청하기’예요. 가고 싶으시면 직접 눌러 주세요.' },
              ]),
            ],
          },
  },
  {
    id: 'activity-cancel',
    ask: '신청한 활동을 취소하고 싶어요',
    cues: [
      [/(신청|참여|참가)(을|를|한거|한것)?(취소|빼|안하|무르)|취소/, 7],
      [/못가(게|요|겠|$)|못갈|안가(려|고싶)/, 7],
    ],
    screens: ['activity', 'myacts'],
    reply: (ctx) =>
      ctx.screen === 'activity' && ctx.variant === 'applied'
        ? {
            text: '아래 ‘신청 취소하기’를 누르면 취소돼요. 취소는 제가 대신 하지 않아요.',
            actions: [show('어디 있어요?', 'activity-cancel', '여기 ‘신청 취소하기’예요. 취소하시려면 직접 눌러 주세요.')],
          }
        : {
            text: '마이페이지의 ‘신청한 활동’에서 그 활동을 누른 다음, 아래 ‘신청 취소하기’를 누르세요.',
            actions: [viaMe('me-applied', '‘신청한 활동’')],
          },
  },
  {
    id: 'activity-mine',
    ask: '내가 신청한 활동은 어디서 봐요?',
    cues: [[/신청한(활동|모임|것|거)|내가신청|신청(내역|목록|확인)|관심(있는)?활동|하트(누른|한)/, 6]],
    screens: ['me', 'myacts'],
    reply: () => ({
      text: '마이페이지의 ‘신청한 활동’에 모여 있어요. 하트를 누른 활동은 ‘관심 있는 활동’에 있어요.',
      actions: [viaMe('me-applied', '‘신청한 활동’')],
    }),
  },
  {
    id: 'activity-like',
    ask: '‘관심’ 하트는 뭐예요?',
    cues: [[/관심|하트|찜/, 3]],
    screens: ['activity'],
    reply: (ctx) => ({
      text: '활동 화면 오른쪽 위 ‘관심’을 누르면 그 활동이 마이페이지 ‘관심 있는 활동’에 모여요. 신청과는 달라서, 누른다고 신청되지는 않아요.',
      actions: ctx.screen === 'activity' ? [show('‘관심’ 어디 있어요?', 'activity-like', '여기 ‘관심’이에요.')] : undefined,
    }),
  },
  {
    id: 'welfare',
    ask: '가까운 복지관은 어디서 찾아요?',
    cues: [[/복지관|경로당|시니어센터|복지시설|노인정|노인회관/, 5]],
    screens: ['activities', 'welfare', 'welfaredetail'],
    reply: (ctx) =>
      ctx.screen === 'welfare'
        ? { text: '지금 이 화면이에요. 시설을 누르면 주소와 여는 시간, 전화번호가 나와요.', demoNote: '시연 화면의 시설 정보는 예시예요. 가시기 전에 꼭 전화로 확인하세요.' }
        : {
            text: '‘지역생활’ 화면 맨 위 ‘가까운 복지관·경로당’을 누르면 가까운 순서로 나와요.',
            actions: [
              walk('/activities', [
                nav('nav-activities', '지역생활'),
                { on: ['activities'], target: 'activities-welfare', say: '여기 ‘가까운 복지관·경로당’을 누르세요.' },
              ]),
            ],
            demoNote: '시연 화면의 시설 정보는 예시예요. 가시기 전에 꼭 전화로 확인하세요.',
          },
  },

  // ───────── 말동무 (역할 구분)
  {
    id: 'companion',
    ask: '말동무는 뭐예요?',
    cues: [
      [/말동무|말벗|ai친구/, 5],
      [/심심|외로|쓸쓸|적적|우울|울적|허전/, 4],
      [/(이야기|얘기|수다)(를)?(하고|나누고|떨고)싶|말(할|걸)(사람|데)(이|가)?없/, 4],
    ],
    screens: ['companion'],
    reply: (ctx) =>
      ctx.screen === 'companion'
        ? {
            text: '지금 이 화면이 말동무예요. 아래 ‘말하기’를 누르거나 입력칸에 글로 써서 이야기하시면 돼요. 저는 앱 사용법만 알려 드려요.',
            demoNote: '시연 화면의 말동무는 실제 AI가 아니에요. 미리 준비한 답을 보여 줘요.',
          }
        : {
            text: '이야기를 나누고 싶으실 때는 ‘말동무’가 있어요. 저는 앱 사용법을 알려 드리는 안내자라, 일상 이야기는 말동무가 들어 드려요.',
            actions: [walk('/companion', [{ on: ['home'], target: 'home-companion', say: '여기 ‘말동무’를 누르면 이야기를 시작할 수 있어요.' }], '말동무 어디 있어요?')],
            demoNote: '시연 화면의 말동무는 실제 AI가 아니에요. 미리 준비한 답을 보여 줘요.',
            mood: 'happy',
          },
  },

  // ───────── 화면·설정
  {
    id: 'font',
    ask: '글씨를 키우고 싶어요',
    audience: 'any',
    cues: [
      [/글씨|글자|폰트|활자/, 3],
      [/(잘)?안보(여|이|임)|너무작|작아(서|요)?|작게|크게|키우|키워|확대|침침|눈이(나쁘|나빠|안좋)/, 3],
    ],
    screens: ['settings', 'welcome'],
    reply: (ctx) => ({
      text: '아래에서 크기를 눌러 보세요. 누르는 즉시 바뀌고, 언제든 다시 바꿀 수 있어요.',
      actions: [
        { kind: 'setting', which: 'font' },
        ...(ctx.signedIn && ctx.screen !== 'settings'
          ? [
              walk(
                '/me',
                [
                  nav('nav-me', '마이페이지'),
                  { on: ['me'], target: 'me-settings', say: '여기 ‘글자 크기 · 화면 설정’을 누르세요.' },
                  { on: ['settings'], target: 'settings-font', say: '다음에는 여기 ‘글자 크기’에서 바꾸시면 돼요.' },
                ],
                '설정 화면 위치도 알려 주세요',
              ),
            ]
          : []),
      ],
    }),
  },
  {
    id: 'contrast',
    ask: '화면을 더 선명하게 보고 싶어요',
    audience: 'any',
    cues: [
      [/선명|대비|흐릿|흐려|고대비|밝게|어둡게|눈부/, 5],
      [/(색|화면)(이|을)?(연해|연하|옅|진하게)/, 5],
    ],
    screens: ['settings'],
    reply: () => ({
      text: '‘선명한 화면’을 누르면 검은 바탕에 밝은 글씨로 바뀌어요. 마음에 안 들면 ‘기본 화면’을 누르세요.',
      actions: [{ kind: 'setting', which: 'contrast' }],
    }),
  },
  {
    id: 'vibration',
    ask: '진동을 끄고 싶어요',
    cues: [[/진동/, 5]],
    screens: ['settings'],
    reply: () => ({
      text: '마이페이지의 ‘글자 크기 · 화면 설정’에 ‘진동’이 있어요. ‘끄기’를 누르면 돼요.',
      actions: [viaMe('me-settings', '‘글자 크기 · 화면 설정’', { on: ['settings'], target: 'settings-vibration', say: '여기 ‘진동’에서 ‘켜기’나 ‘끄기’를 누르세요.' })],
    }),
  },
  {
    id: 'profile',
    ask: '내 소개를 바꾸고 싶어요',
    cues: [
      [/프로필|자기소개|한줄소개|내소개|소개(글|를|말)|좋아하는것|관심사/, 5],
      [/내(정보|사진|이름|나이)|이름(을)?(바꾸|고치)/, 4],
    ],
    screens: ['me', 'profile'],
    reply: (ctx) =>
      ctx.screen === 'profile'
        ? { text: '이 화면에서 한 줄 소개와 좋아하는 것을 고친 다음 ‘저장하기’를 누르세요. 이름과 나이는 본인 확인한 내용이라 여기서 바꿀 수 없어요.' }
        : {
            text: '마이페이지의 ‘내 프로필 관리’에서 한 줄 소개와 좋아하는 것을 바꿀 수 있어요. 이름과 나이는 본인 확인한 내용이라 바꿀 수 없어요.',
            actions: [viaMe('me-profile', '‘내 프로필 관리’')],
          },
  },
  {
    id: 'location',
    ask: '사는 동네가 바뀌었어요',
    audience: 'any',
    cues: [[/위치|이사(했|를|가|감|왔)|사는(곳|동네)|동네(가|를)?(바뀌|바꾸|틀리|다르|잘못)|주소(를|가)?(바꾸|바뀌)|gps/, 5]],
    screens: ['me', 'signup'],
    reply: (ctx) =>
      ctx.signedIn
        ? {
            text: '마이페이지의 ‘위치 다시 확인’을 누르면 지금 계신 곳으로 동네를 다시 정해요. 위치는 동네 정도(약 1km)로만 저장해요.',
            actions: [viaMe('me-location', '‘위치 다시 확인’')],
          }
        : { text: '사는 동네는 가입할 때 ‘위치 정보 수집 동의’를 누르면 정해져요. 위치는 동네(약 1km)까지만 저장해요.' },
  },
  {
    id: 'points',
    ask: '포인트는 어디에 써요?',
    cues: [
      [/포인트|적립/, 5],
      [/돈(이|을)?(들|내야|내나|써|필요)|유료|무료|결제|충전|구독|얼마/, 4],
    ],
    screens: ['points', 'friends'],
    reply: (ctx) => ({
      text: '포인트는 친구 신청에 써요. 추천 친구 평가, 봉사모임 참여, 첫 친구 3명 사귀기로 모을 수 있어요. 받은 신청을 수락하는 것은 무료예요.',
      actions:
        ctx.screen === 'points'
          ? undefined
          : [walk('/me/points', [{ on: ['home'], target: 'home-points', say: '여기 포인트를 누르면 자세히 볼 수 있어요.' }, { on: ['me'], target: 'me-points', say: '여기 ‘내 포인트’를 누르세요.' }], '내 포인트 보러 가기')],
      demoNote: '결제는 아직 준비 중이에요. 시연 화면에서는 실제 돈이 나가지 않아요.',
    }),
  },
  {
    id: 'inbox',
    ask: '새 소식은 어디서 봐요?',
    cues: [
      [/알림함|새소식|소식(이|을|은)?(어디|보)/, 5],
      [/알림/, 2],
    ],
    screens: ['inbox', 'me'],
    reply: (ctx) =>
      ctx.screen === 'inbox'
        ? { text: '지금 이 화면이 알림함이에요. 소식을 누르면 그 화면으로 가요.' }
        : { text: '마이페이지의 ‘알림함’에 새 소식이 모여요.', actions: [viaMe('me-inbox', '‘알림함’')], demoNote: '시연 화면의 소식은 예시예요.' },
  },
  {
    id: 'notify-settings',
    ask: '알림을 끄거나 켜고 싶어요',
    cues: [[/알림(을|이)?(설정|끄|꺼|켜|시간|그만|너무|많|시끄|안오|안와|받)/, 6]],
    screens: ['notifyset'],
    reply: (ctx) =>
      ctx.screen === 'notifyset'
        ? { text: '이 화면의 ‘추천 친구 알림’에서 켜고 끌 수 있어요. 켜 두면 받을 시간도 고를 수 있어요.' }
        : {
            text: '마이페이지의 ‘알림 설정’에서 추천 친구 알림을 켜고 끌 수 있어요.',
            actions: [viaMe('me-notify', '‘알림 설정’')],
            demoNote: '시연 화면에서는 실제 알림이 오지 않아요.',
          },
  },
  {
    id: 'guardians',
    ask: '보호자는 어떻게 등록해요?',
    cues: [
      [/보호자/, 5],
      [/(가족|자녀|자식|아들|딸|며느리|복지사)(을|를|에게|한테)?(등록|연결|추가|알리|알려)/, 5],
    ],
    screens: ['guardians'],
    reply: (ctx) =>
      ctx.screen === 'guardians'
        ? {
            text: '‘보호자 추가’를 누르고 이름, 어떤 사이인지, 휴대전화 번호를 적은 뒤 ‘등록하기’를 누르세요. 세 명까지 넣을 수 있어요.',
            actions: [show('어디서 추가해요?', 'guardian-add', '여기 ‘보호자 추가’를 누르세요.')],
            demoNote: '시연 화면에서는 보호자에게 실제로 알림이 가지 않아요.',
          }
        : {
            text: '마이페이지의 ‘보호자 연결’에서 등록해요. 긴급 도움을 누르면 그분들께 알림이 가요. 세 명까지 넣을 수 있어요.',
            actions: [viaMe('me-guardians', '‘보호자 연결’', { on: ['guardians'], target: 'guardian-add', say: '여기 ‘보호자 추가’를 누르세요.' })],
            demoNote: '시연 화면에서는 보호자에게 실제로 알림이 가지 않아요.',
          },
  },
  {
    id: 'sos-how',
    ask: '‘긴급’ 버튼은 뭐예요?',
    cues: [[/긴급|sos|도움요청/, 4]],
    screens: ['home'],
    reply: (ctx) => ({
      text: '홈 오른쪽 위 ‘긴급’을 누르면 긴급 도움 화면이 열려요. ‘도움 요청’을 누르고 한 번 더 확인하면 등록한 보호자에게 알려요. 119와 109에 바로 전화하는 줄도 있어요.',
      actions: ctx.screen === 'home' ? [show('‘긴급’ 어디 있어요?', 'home-sos', '여기 ‘긴급’이에요. 눌러도 바로 알림이 가지는 않고, 긴급 도움 화면이 열려요.')] : undefined,
      demoNote: '시연 화면의 ‘도움 요청’은 실제로 알림이 가지 않아요. 정말 급할 때는 119에 전화하세요.',
    }),
  },
  {
    id: 'wellbeing',
    ask: '마음 건강은 뭐예요?',
    cues: [[/마음(건강|날씨|점검)|기분점검|걱정점검|관계지수|우울(증)?(검사|점검|테스트)|자가(진단|평가|점검)/, 5]],
    screens: ['wellbeing', 'check'],
    reply: (ctx) => ({
      text: '마이페이지의 ‘마음 건강’에서 이번 주 마음 날씨를 보고, ‘기분 점검’과 ‘걱정 점검’을 해 볼 수 있어요. 진단이 아니라 스스로 살펴보는 점검이에요.',
      actions: ctx.screen === 'wellbeing' || ctx.screen === 'check' ? undefined : [viaMe('me-wellbeing', '‘마음 건강’')],
      demoNote: '시연 화면의 숫자는 예시예요.',
    }),
  },
  {
    id: 'brain',
    ask: '두뇌 운동은 어디서 해요?',
    cues: [[/두뇌|게임|기억력|셈하기|짝맞추기|퀴즈|머리(쓰|운동)|치매/, 5]],
    screens: ['brain', 'braingame', 'home'],
    reply: (ctx, q) => ({
      text:
        '홈 화면 아래쪽 ‘오늘의 두뇌 운동’을 누르면 ‘짝 맞추기’와 ‘셈하기’를 할 수 있어요. 시간 제한은 없어요.' +
        (/치매/.test(q) ? ' 재미로 하는 놀이라, 치매를 막거나 알아낸다고 말씀드릴 수는 없어요.' : ''),
      actions:
        ctx.screen === 'brain' || ctx.screen === 'braingame'
          ? undefined
          : [walk('/brain', [nav('nav-home', '홈'), { on: ['home'], target: 'home-brain', say: '여기 ‘오늘의 두뇌 운동’을 누르세요.' }])],
    }),
  },
  {
    id: 'install',
    ask: '매번 주소를 치기 어려워요',
    cues: [[/설치|아이콘|바로가기|바탕화면|홈화면|첫화면에|주소(를)?(치|입력|쳐)|앱(으로|을)?(깔|받|다운)|다운로드/, 5]],
    screens: ['install'],
    reply: (ctx) =>
      ctx.screen === 'install'
        ? { text: '이 화면에 적힌 순서대로 하면 휴대폰 첫 화면에 새싹 아이콘이 생겨요. 다음부터는 그 아이콘을 누르면 바로 열려요.' }
        : {
            text: '휴대폰 첫 화면에 새싹 아이콘을 놓아 두면 주소를 치지 않고 눌러서 열 수 있어요. 마이페이지의 ‘홈 화면에 아이콘 놓기’에 방법이 있어요. 이미 놓으셨다면 그 줄은 보이지 않아요.',
            actions: [viaMe('me-install', '‘홈 화면에 아이콘 놓기’')],
          },
  },

  // ───────── 본인 확인 (가입 전에도)
  {
    id: 'login-code',
    ask: '인증번호가 오지 않아요',
    audience: 'any',
    cues: [
      [/인증번호|인증문자|인증(이)?(안|못)/, 5],
      [/문자(가)?(안|못)(와|오|옴)|번호(가)?안(와|오)/, 5],
    ],
    screens: ['phone'],
    reply: (ctx) =>
      ctx.signedIn
        ? { text: '이미 본인 확인을 마치고 들어와 계세요. 지금은 인증번호가 필요 없어요.', mood: 'happy' }
        : ctx.screen === 'phone' && ctx.variant === 'code'
          ? {
              text: '1~2분 기다려도 오지 않으면 ‘인증번호 다시 받기’를 누르세요. 휴대폰이 본인 이름으로 되어 있지 않으면 가족이나 복지관 직원에게 도움을 받아 주세요.',
              actions: [show('‘다시 받기’ 어디 있어요?', 'code-resend', '여기 ‘인증번호 다시 받기’를 누르세요.')],
              demoNote: '시연 화면이라 문자는 오지 않아요. 화면 위쪽 ‘[시연용] 인증번호’에 적힌 숫자를 쓰시면 돼요.',
            }
          : {
              text: '휴대폰 인증에서 ‘인증번호 받기’를 누르면 문자로 와요. 1~2분 기다려도 오지 않으면 ‘인증번호 다시 받기’를 누르세요.',
              demoNote: '시연 화면이라 문자는 오지 않아요. 인증번호는 화면 위쪽에 보여요.',
            },
  },
  {
    id: 'login-how',
    ask: '가입은 어떻게 해요?',
    audience: 'any',
    cues: [
      [/로그인|회원가입|가입|본인확인|본인인증|인증(하|해|방법)/, 3],
      [/어떻게(시작|들어가)|시작(하려면|하는법|하고싶)/, 3],
    ],
    screens: ['welcome', 'login', 'phone', 'assist', 'idcard'],
    reply: (ctx) =>
      ctx.signedIn
        ? { text: '이미 본인 확인을 마치고 들어와 계세요. 다음에 열 때도 자동으로 들어와요.', mood: 'happy' }
        : {
            text: '휴대폰 인증 한 번이면 돼요. 한 번 하면 다음부터는 자동으로 들어가요.',
            steps: ['‘시작하기’ 다음에 ‘휴대폰 인증’을 눌러요.', '이름·생년월일·휴대전화 번호를 적고 ‘인증번호 받기’를 눌러요.', '받은 인증번호를 적고 ‘확인’을 눌러요.'],
            actions: [
              walk(
                '/login',
                [
                  { on: ['welcome'], target: 'welcome-start', say: '먼저 여기 ‘시작하기’를 누르세요.' },
                  { on: ['login', 'idcard'], target: 'login-phone', say: '여기 ‘휴대폰 인증’을 누르세요.' },
                  { on: ['assist'], target: 'assist-start', say: '여기를 누르면 휴대폰 인증이 시작돼요.' },
                  { on: ['phone'], target: 'phone-submit', say: '위 칸을 다 적으신 뒤에 여기 ‘인증번호 받기’를 누르세요.' },
                ],
              ),
            ],
            demoNote: '시연 화면이라 실제 문자는 가지 않아요. 인증번호는 화면 위쪽에 보여요.',
          },
  },
  {
    id: 'login-assist',
    ask: '혼자 하기 어려워요',
    audience: 'any',
    cues: [[/혼자(서)?(못|하기|는|안)|도와줄(사람|분)|가족(이|이랑|과)?(대신|같이|함께)|대신(해|가입|인증)|도움받기/, 5]],
    screens: ['login', 'phone', 'assist'],
    reply: (ctx) =>
      ctx.signedIn
        ? { text: '막히는 화면에서 저를 눌러 “이 화면에서 뭘 해야 해요?”라고 물어보세요. 가족이나 복지관 직원에게 화면을 보여 주고 함께 하셔도 좋아요.' }
        : {
            text: '가족이나 복지관 직원과 함께 하셔도 돼요. 본인 확인 화면의 ‘도움받기’에 함께 하는 방법이 있어요. 인증번호는 본인 휴대폰으로 오니 휴대폰을 곁에 두세요.',
            actions: ctx.screen === 'login' ? [show('‘도움받기’ 어디 있어요?', 'login-help', '여기 ‘도움받기’를 누르세요.')] : ctx.screen === 'assist' ? undefined : [{ kind: 'go', label: '‘도움받기’ 화면 보기', to: '/login/help' }],
          },
  },
  {
    id: 'id-card',
    ask: '신분증으로 인증할 수 있어요?',
    audience: 'any',
    cues: [[/신분증|주민등록증|민증|운전면허/, 5]],
    screens: ['login', 'idcard'],
    reply: () => ({ text: '신분증 인증은 아직 준비 중이에요. 지금은 휴대폰 인증만 할 수 있어요.', mood: 'sorry' }),
  },
  {
    id: 'logout',
    ask: '로그아웃은 어디서 해요?',
    cues: [[/로그아웃|나가(기|고싶|려)|종료/, 5]],
    screens: ['me'],
    reply: () => ({
      text: '마이페이지 맨 아래에 ‘로그아웃’이 있어요. 누르면 묻지 않고 바로 로그아웃되니, 정말 나가실 때만 눌러 주세요.',
      actions: [walk('/me', [nav('nav-me', '마이페이지'), { on: ['me'], target: 'me-logout', say: '여기 ‘로그아웃’이에요. 누르면 바로 로그아웃돼요.' }], '어디 있는지 보기')],
    }),
  },
  {
    id: 'withdraw',
    ask: '회원 탈퇴는 어떻게 해요?',
    cues: [[/탈퇴|계정(을)?(삭제|지우|없애)|그만(쓰|두|이용)|회원(을)?(그만|삭제)/, 6]],
    screens: ['leave', 'me'],
    reply: () => ({
      text: '마이페이지 맨 아래 ‘회원 탈퇴’에서 할 수 있어요. 탈퇴하면 친구·대화·포인트가 모두 사라지고, 30일 뒤 개인정보를 완전히 지워요. 탈퇴는 제가 대신 하지 않아요.',
      actions: [walk('/me', [nav('nav-me', '마이페이지'), { on: ['me'], target: 'me-leave', say: '여기 ‘회원 탈퇴’예요. 누르면 안내 화면이 먼저 나와요.' }], '어디 있는지 보기')],
      demoNote: '시연 화면에서는 실제로 지워지는 계정이 없어요.',
    }),
  },
  {
    id: 'help-page',
    ask: '도움말은 어디 있어요?',
    cues: [[/도움말|자주묻는|faq|설명서|사용(법|설명)|안내(문|서)/, 4]],
    screens: ['help', 'me'],
    reply: (ctx) =>
      ctx.screen === 'help'
        ? { text: '지금 이 화면이 도움말이에요. 궁금한 줄을 누르면 답이 펼쳐져요. 여기 없는 것은 저에게 물어보세요.' }
        : { text: '마이페이지의 ‘도움말’에 자주 묻는 질문이 모여 있어요. 화면마다 막히는 것은 저에게 바로 물어보셔도 돼요.', actions: [viaMe('me-help', '‘도움말’')] },
  },
  {
    id: 'privacy',
    ask: '내 전화번호가 남에게 보이나요?',
    cues: [
      [/개인정보|실명|안전(한가|하나|한지|할까|해요)|믿어도|믿을수|가짜/, 5],
      [/(전화번호|연락처|내번호).*(보여|보이|공개|알려지|노출|알수|아나|알아)/, 5],
    ],
    screens: ['safety'],
    reply: (ctx) => ({
      text: '전화번호는 다른 이웃에게 보이지 않아요. 본인 확인한 분만 이용하고, 대화에 돈·비밀번호 이야기가 나오면 경고로 알려 드려요.',
      actions: ctx.screen === 'safety' ? undefined : [viaMe('me-safety', '‘안전하게 이용하기’')],
      demoNote: '시연 화면의 이웃은 실제 사람이 아니라 예시예요.',
    }),
  },

  // ───────── 앱·시작이
  {
    id: 'what-is-app',
    ask: '‘시작’은 어떤 앱이에요?',
    audience: 'any',
    cues: [
      [/(이앱|이거|시작이란|시작은|시작앱)(은|는|이|가)?(뭐|무엇|무슨|어떤|뭘)/, 4],
      [/뭐하는(앱|곳|데|거)|어떤(앱|곳)|무슨(앱|곳)/, 5],
    ],
    screens: ['welcome'],
    reply: (ctx) => ({
      text: '‘시작’은 같은 동네 이웃을 만나 친구가 되고, 대화하고, 동네 모임에 나가 볼 수 있는 앱이에요. 본인 확인한 분만 이용해요.',
      demoNote: ctx.demo ? '지금 보시는 것은 서버 없이 돌아가는 시연 화면이에요. 이웃과 활동은 모두 예시예요.' : undefined,
      mood: 'happy',
    }),
  },
  {
    id: 'who-are-you',
    ask: '시작이는 누구예요?',
    audience: 'any',
    cues: [
      [/(너|넌|당신|자네|니가|네가)(는|은)?(누구|뭐|사람|ai|로봇|기계)/, 6],
      [/시작이(는|가|란)?(누구|뭐|무엇)/, 7],
      [/(진짜)?사람(이야|이에요|인가|이니|맞|이세요|입니까)|상담원|ai(야|니|예요|에요|인가|맞)|로봇|인공지능|챗봇/, 6],
      [/이름(이)?뭐/, 5],
    ],
    reply: (ctx) => ({
      text: '저는 시작이예요. ‘시작’ 앱의 길잡이 새싹이에요. 사람이 아니고, 미리 준비해 둔 앱 사용법 안내를 찾아서 보여 드려요. 그래서 준비되지 않은 질문에는 모른다고 말씀드려요.',
      demoNote: ctx.demo ? '이 시연 화면에서는 AI나 상담원이 답하지 않아요.' : undefined,
      mood: 'hello',
    }),
  },
  {
    id: 'back',
    ask: '앞 화면으로 돌아가고 싶어요',
    audience: 'any',
    cues: [[/뒤로|이전(화면|으로)|돌아가|처음(으로|화면)|홈으로|나가는법/, 5]],
    reply: (ctx) =>
      TAB_SCREENS.includes(ctx.screen)
        ? { text: '아래 메뉴에서 ‘홈’을 누르면 처음 화면으로 가요.', actions: [show('‘홈’ 어디 있어요?', 'nav-home', '여기 ‘홈’을 누르면 처음 화면으로 가요.')] }
        : { text: '화면 왼쪽 위 ‘뒤로’를 누르면 앞 화면으로 돌아가요.', actions: [show('‘뒤로’ 어디 있어요?', 'back', '여기 ‘뒤로’를 누르면 앞 화면으로 돌아가요.')] },
  },
  {
    id: 'listen',
    ask: '답을 소리로 들을 수 있어요?',
    audience: 'any',
    cues: [[/읽어(줘|주|줄)|소리(로|내어)(듣|읽|들)|들려(줘|주)|음성(으로)?안내/, 5]],
    reply: () => ({ text: '제 답 아래 ‘소리로 듣기’를 누르면 읽어 드려요. 기기에 따라 이 버튼이 보이지 않을 수 있어요.' }),
  },
]

export const topicById = (id: string) => TOPICS.find((t) => t.id === id)
