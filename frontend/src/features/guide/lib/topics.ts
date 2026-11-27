/**
 * 시작이가 답할 수 있는 앱 사용법 — 사람이 검수한 안내 목록.
 *
 * 알아듣기: 띄어쓰기를 지운 문장에서 단서(cue)를 찾아 점수를 더한다 (engine.ts).
 * 문구 규칙: 할 일부터, 두 문장 이하. 버튼은 화면에 적힌 글자 그대로 ‘’ 안에, 차례는 세 줄 이하.
 * 묻지 않은 조건·예외·정책은 덧붙이지 않는다. 시작이 자신에 대한 설명("제가 대신 하지 않아요")도 하지 않는다
 * — 신청·신고·보내기를 대신 하지 않는 것은 말이 아니라 동작으로 지킨다 (GuideAction 에 그런 동작이 없다).
 * 길이와 금지 표현은 e2e/guide-engine.spec.ts 가 지킨다.
 */
import { eul } from './josa'
import { COMPANION_NOTE, TAB_SCREENS, type ScreenId } from './screens'
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
  walk('/me', [nav('nav-me', '마이페이지'), { on: ['me'], target, say: `여기 ${eul(name)} 누르세요.` }, ...(next ? [next] : [])])

const AUTO_REPLY_NOTE = '시연에서는 이웃이 자동으로 답해요. 진짜 사람이 아니에요.'
const WELFARE_NOTE = '시연이라 예시 정보예요. 가기 전에 전화로 확인하세요.'

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
            text: '마음에 드는 분의 ‘친구 신청’을 누르세요. 그분이 받아 주면 친구가 돼요.',
            actions: [show('‘친구 신청’ 어디 있어요?', 'friend-request', '여기 ‘친구 신청’이에요. 마음에 드는 분이면 눌러 보세요.')],
            demoNote: AUTO_REPLY_NOTE,
          }
        : {
            text: '두 번만 누르면 돼요.',
            steps: ['아래 ‘친구’ 메뉴를 눌러요.', '마음에 드는 분의 ‘친구 신청’을 눌러요.'],
            actions: [
              walk('/friends', [
                nav('nav-friends', '친구'),
                { on: ['friends'], target: 'friend-request', say: '여기 ‘친구 신청’이에요. 마음에 드는 분이면 눌러 보세요.' },
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
          ? '지금은 온 신청이 없어요. 오면 이 화면 맨 위에 보여요.'
          : '‘친구’ 화면 맨 위 ‘나에게 온 친구 신청’에 있어요. 좋으면 ‘수락하기’를 누르세요.',
      actions:
        ctx.screen === 'friends' && ctx.variant !== 'received'
          ? undefined
          : [
              walk('/friends', [
                nav('nav-friends', '친구'),
                { on: ['friends'], target: 'friend-accept', say: '좋으면 여기 ‘수락하기’를 누르세요.' },
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
      text: '‘친구’ 화면에서 ‘같은 동네’를 누르면 가까이 사는 분만 보여요.',
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
        ? { text: '여기 다 있어요. ‘대화하기’를 누르면 그분과 이야기할 수 있어요.' }
        : { text: '마이페이지의 ‘내 친구 목록’에 있어요.', actions: [viaMe('me-friends', '‘내 친구 목록’')] },
  },
  {
    id: 'friend-rate',
    ask: '‘이런 분 더 보여 주세요’는 뭐예요?',
    cues: [[/만나보고싶|이런분더|더보여|평가/, 4]],
    screens: ['friends'],
    reply: () => ({
      text: '추천이 마음에 드는지 알려 주는 버튼이에요. 누르면 포인트를 받아요.',
      actions: [
        walk('/friends', [nav('nav-friends', '친구'), { on: ['friends'], target: 'friend-rate', say: '여기 ‘이런 분 더 보여 주세요’예요.' }], '어디 있는지 보기'),
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
            text: '아래 칸에 하고 싶은 말을 쓰고 ‘보내기’를 누르세요.',
            actions: [show('어디에 써요?', 'chat-input', '이 칸에 쓰시면 돼요. 다 쓰면 옆에 ‘보내기’가 나와요.')],
            demoNote: AUTO_REPLY_NOTE,
          }
        : {
            text: '친구가 된 분과 이야기할 수 있어요.',
            steps: ['홈에서 ‘대화하기’를 눌러요.', '이야기할 분을 눌러요.', '아래 칸에 쓰고 ‘보내기’를 눌러요.'],
            actions: [
              walk('/chats', [
                { on: ['home'], target: 'home-chats', say: '먼저 여기 ‘대화하기’를 누르세요.' },
                { on: ['chats'], target: 'chats-room', say: '이야기할 분을 누르세요.' },
                { on: ['chat'], target: 'chat-input', say: '이 칸에 쓰시면 돼요. 다 쓰면 옆에 ‘보내기’가 나와요.' },
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
            text: '‘말하기’를 누르고 말씀하신 다음 ‘다 말했어요’를 누르세요.',
            actions: [show('‘말하기’ 어디 있어요?', 'companion-mic', '여기 ‘말하기’를 누르고 편하게 말씀하세요.')],
          }
        : {
            text: '입력칸 옆 ‘말하기’를 누르고 말씀하세요. 다 하면 ‘다 말했어요, 보내기’를 누르세요.',
            actions: ctx.screen === 'chat' ? [show('‘말하기’ 어디 있어요?', 'chat-mic', '여기 ‘말하기’예요. 누르면 녹음이 시작돼요.')] : undefined,
          },
  },
  {
    id: 'chat-topics',
    ask: '무슨 말을 해야 할지 모르겠어요',
    cues: [[/무슨말|무슨얘기|할말(이|을)?(없|모르)|뭐라고(해|말|보내|쓰|써)|대화주제|첫마디|어색/, 5]],
    screens: ['chat'],
    reply: (ctx) => ({
      text: '입력칸 위 ‘대화 주제 추천’을 눌러 보세요. 건넬 말이 나와요.',
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
      text:
        ctx.screen === 'chat'
          ? '오른쪽 위 ‘더보기’에 ‘신고하기’와 ‘차단하기’가 있어요. 신고하면 차단도 함께 돼요.'
          : '그분과의 대화에서 오른쪽 위 ‘더보기’를 누르면 ‘신고하기’와 ‘차단하기’가 있어요.',
      actions:
        ctx.screen === 'chat'
          ? [show('‘더보기’ 어디 있어요?', 'chat-more', '여기 ‘더보기’를 누르면 ‘신고하기’와 ‘차단하기’가 나와요.')]
          : [{ kind: 'go', label: '대화 목록으로 가기', to: '/chats' }],
      demoNote: '시연에서는 신고가 실제로 접수되지 않아요.',
    }),
  },
  {
    id: 'unblock',
    ask: '차단을 풀고 싶어요',
    cues: [[/차단(을)?(풀|해제|취소)|차단(한|된)(사람|이웃|목록|분)|차단목록/, 6]],
    screens: ['blocks', 'chat'],
    reply: (ctx) =>
      ctx.screen === 'blocks'
        ? { text: '다시 이야기하고 싶은 분의 ‘차단 풀기’를 누르세요.' }
        : { text: '마이페이지 맨 아래 ‘차단한 이웃’에서 풀 수 있어요.', actions: [viaMe('me-blocks', '‘차단한 이웃’')] },
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
            text: '여기예요. 마음에 드는 활동을 눌러 보세요.',
            actions: [show('어디를 눌러요?', 'activity-item', '궁금한 것을 하나 눌러 보세요.')],
          }
        : {
            text: '아래 ‘지역생활’ 메뉴에 있어요.',
            actions: [
              walk('/activities', [
                nav('nav-activities', '지역생활'),
                { on: ['activities'], target: 'activity-item', say: '궁금한 것을 누르면 날짜와 장소가 나와요.' },
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
          ? { text: '이미 신청하셨어요. 못 가게 되면 아래 ‘신청 취소하기’를 누르세요.' }
          : ctx.variant === 'full'
            ? { text: '자리가 다 찼어요. 다른 활동을 찾아보세요.' }
            : {
                text: '가고 싶으면 아래 ‘신청하기’를 누르세요.',
                actions: [show('‘신청하기’ 어디 있어요?', 'activity-apply', '여기 ‘신청하기’예요. 가고 싶으면 눌러 보세요.')],
              }
        : {
            text: '‘지역생활’에서 골라서 신청해요.',
            steps: ['아래 ‘지역생활’ 메뉴를 눌러요.', '가고 싶은 활동을 눌러요.', '아래 ‘신청하기’를 눌러요.'],
            actions: [
              walk('/activities', [
                nav('nav-activities', '지역생활'),
                { on: ['activities'], target: 'activity-item', say: '가고 싶은 활동을 누르세요.' },
                { on: ['activity'], target: 'activity-apply', say: '여기 ‘신청하기’예요. 가고 싶으면 눌러 보세요.' },
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
            text: '아래 ‘신청 취소하기’를 누르면 돼요.',
            actions: [show('어디 있어요?', 'activity-cancel', '여기 ‘신청 취소하기’예요.')],
          }
        : {
            text: '마이페이지의 ‘신청한 활동’에서 그 활동을 누르고 ‘신청 취소하기’를 누르세요.',
            actions: [viaMe('me-applied', '‘신청한 활동’')],
          },
  },
  {
    id: 'activity-mine',
    ask: '내가 신청한 활동은 어디서 봐요?',
    cues: [[/신청한(활동|모임|것|거)|내가신청|신청(내역|목록|확인)|관심(있는)?활동|하트(누른|한)/, 6]],
    screens: ['me', 'myacts'],
    reply: () => ({
      text: '마이페이지의 ‘신청한 활동’에 있어요. 하트 누른 것은 ‘관심 있는 활동’에 있고요.',
      actions: [viaMe('me-applied', '‘신청한 활동’')],
    }),
  },
  {
    id: 'activity-like',
    ask: '‘관심’ 하트는 뭐예요?',
    cues: [[/관심|하트|찜/, 3]],
    screens: ['activity'],
    reply: (ctx) => ({
      text: '나중에 다시 보려고 표시해 두는 거예요. 신청은 따로 해야 해요.',
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
        ? { text: '여기예요. 누르면 주소와 전화번호가 나와요.', demoNote: WELFARE_NOTE }
        : {
            text: '‘지역생활’ 맨 위 ‘가까운 복지관·경로당’을 누르세요.',
            actions: [
              walk('/activities', [
                nav('nav-activities', '지역생활'),
                { on: ['activities'], target: 'activities-welfare', say: '여기 ‘가까운 복지관·경로당’을 누르세요.' },
              ]),
            ],
            demoNote: WELFARE_NOTE,
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
            text: '여기가 말동무예요. ‘말하기’를 누르고 편하게 이야기하세요.',
            demoNote: COMPANION_NOTE,
          }
        : {
            text: '이야기는 ‘말동무’가 들어 드려요. 저는 앱 쓰는 법을 알려 드리고요.',
            actions: [walk('/companion', [{ on: ['home'], target: 'home-companion', say: '여기 ‘말동무’를 누르면 이야기를 시작할 수 있어요.' }], '말동무 어디 있어요?')],
            demoNote: COMPANION_NOTE,
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
      text: '아래에서 골라 보세요. 누르면 바로 바뀌어요.',
      actions: [
        { kind: 'setting', which: 'font' },
        ...(ctx.signedIn && ctx.screen !== 'settings'
          ? [
              walk(
                '/me',
                [
                  nav('nav-me', '마이페이지'),
                  { on: ['me'], target: 'me-settings', say: '여기 ‘설정’을 누르세요.' },
                  { on: ['settings'], target: 'settings-font', say: '다음에는 여기 ‘글자 크기’에서 바꾸세요.' },
                ],
                '설정 화면은 어디예요?',
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
      text: '‘선명한 화면’을 눌러 보세요. 검은 바탕에 밝은 글씨로 바뀌어요.',
      actions: [{ kind: 'setting', which: 'contrast' }],
    }),
  },
  {
    id: 'vibration',
    ask: '진동을 끄고 싶어요',
    cues: [[/진동/, 5]],
    screens: ['settings'],
    reply: () => ({
      text: '마이페이지의 ‘설정’에서 ‘진동’을 끄면 돼요.',
      actions: [viaMe('me-settings', '‘설정’', { on: ['settings'], target: 'settings-vibration', say: '여기 ‘진동’에서 ‘끄기’를 누르세요.' })],
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
        ? { text: '고치고 나서 ‘저장하기’를 누르세요. 이름과 나이는 바꿀 수 없어요.' }
        : {
            text: '마이페이지의 ‘내 프로필 관리’에서 바꿔요. 이름과 나이는 바꿀 수 없어요.',
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
            text: '마이페이지 이름 아래 ‘위치 다시 확인’을 누르면 지금 계신 동네로 바뀌어요.',
            actions: [viaMe('me-location', '‘위치 다시 확인’')],
          }
        : { text: '가입할 때 ‘위치 정보 수집 동의’를 누르면 정해져요.' },
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
      text: '친구 신청할 때 써요. 추천에 답하거나 봉사 활동에 나가면 모여요.',
      actions:
        ctx.screen === 'points'
          ? undefined
          : [walk('/me/points', [{ on: ['home'], target: 'home-points', say: '여기 포인트를 누르면 자세히 볼 수 있어요.' }, { on: ['me'], target: 'me-points', say: '여기 ‘내 포인트’를 누르세요.' }], '내 포인트 보러 가기')],
      demoNote: '결제는 아직 없어요. 시연이라 진짜 돈은 안 나가요.',
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
        ? { text: '여기예요. 소식을 누르면 그 화면으로 가요.' }
        : { text: '마이페이지의 ‘알림함’에 있어요.', actions: [viaMe('me-inbox', '‘알림함’')], demoNote: '시연 화면의 소식은 예시예요.' },
  },
  {
    id: 'notify-settings',
    ask: '알림을 끄거나 켜고 싶어요',
    cues: [[/알림(을|이)?(설정|끄|꺼|켜|시간|그만|너무|많|시끄|안오|안와|받)/, 6]],
    screens: ['settings'],
    reply: (ctx) =>
      ctx.screen === 'settings'
        ? {
            text: '‘추천 친구 알림’을 켜거나 끄면 돼요. 받는 시간도 고를 수 있어요.',
            actions: [show('‘추천 친구 알림’ 어디 있어요?', 'settings-notify', '여기서 켜고 끄고, 받는 시간을 골라요.')],
            demoNote: '시연에서는 알림이 실제로 오지 않아요.',
          }
        : {
            text: '마이페이지의 ‘설정’에서 켜고 꺼요.',
            actions: [
              viaMe('me-settings', '‘설정’', { on: ['settings'], target: 'settings-notify', say: '여기 ‘추천 친구 알림’에서 켜고 꺼요.' }),
            ],
            demoNote: '시연에서는 알림이 실제로 오지 않아요.',
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
            text: '‘보호자 추가’를 누르고 이름과 전화번호를 적으세요. 세 분까지 돼요.',
            actions: [show('어디서 추가해요?', 'guardian-add', '여기 ‘보호자 추가’를 누르세요.')],
          }
        : {
            text: '마이페이지의 ‘보호자 연결’에서 해요. 급할 때 그분께 직접 전화할 수 있어요.',
            actions: [viaMe('me-guardians', '‘보호자 연결’', { on: ['guardians'], target: 'guardian-add', say: '여기 ‘보호자 추가’를 누르세요.' })],
          },
  },
  {
    id: 'sos-how',
    ask: '‘긴급’ 버튼은 뭐예요?',
    cues: [[/긴급|sos|도움요청/, 4]],
    screens: ['home'],
    reply: (ctx) => ({
      text: '긴급 도움을 누르면 요청이 기록돼요. 자동 알림은 가지 않으니 직접 전화해 주세요.',
      actions: ctx.screen === 'home' ? [show('‘긴급’ 어디 있어요?', 'home-sos', '여기 ‘긴급’이에요. 누르면 긴급 도움 화면이 열려요.')] : undefined,
    }),
  },
  {
    id: 'wellbeing',
    ask: '마음 건강은 뭐예요?',
    cues: [[/마음(건강|날씨|점검)|기분점검|걱정점검|관계지수|웰빙|who-?5|우울(증)?(검사|점검|테스트)|자가(진단|평가|점검)/, 5]],
    screens: ['wellbeing', 'check', 'mindlog'],
    reply: (ctx) => ({
      text: '마이페이지의 ‘마음 건강’에 있어요. 스스로 살펴보는 점검이고, 병원 진단은 아니에요.',
      actions: ctx.screen === 'wellbeing' || ctx.screen === 'check' || ctx.screen === 'mindlog' ? undefined : [viaMe('me-wellbeing', '‘마음 건강’')],
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
        /치매/.test(q)
          ? '홈 아래쪽 ‘오늘의 두뇌 운동’에 있어요. 재미로 하는 놀이라 치매를 막아 준다고는 못 해요.'
          : '홈 아래쪽 ‘오늘의 두뇌 운동’에 있어요. 시간 제한이 없으니 천천히 해 보세요.',
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
        ? { text: '적힌 순서대로 하면 휴대폰 첫 화면에 새싹 아이콘이 생겨요.' }
        : {
            text: '휴대폰 첫 화면에 아이콘을 놓아 두면 돼요. 마이페이지 맨 아래 ‘홈 화면에 아이콘 놓기’에 방법이 있어요.',
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
        ? { text: '이미 들어와 계셔서 인증번호는 필요 없어요.', mood: 'happy' }
        : ctx.screen === 'phone' && ctx.variant === 'code'
          ? {
              text: '조금 기다려도 안 오면 ‘인증번호 다시 받기’를 누르세요.',
              actions: [show('‘다시 받기’ 어디 있어요?', 'code-resend', '여기 ‘인증번호 다시 받기’를 누르세요.')],
              demoNote: '시연이라 문자는 안 와요. 화면 위쪽에 적힌 숫자를 쓰세요.',
            }
          : {
              text: '‘인증번호 받기’를 누르면 문자로 와요. 안 오면 ‘인증번호 다시 받기’를 누르세요.',
              demoNote: '시연이라 문자는 안 와요. 번호는 화면 위쪽에 나와요.',
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
        ? { text: '이미 들어와 계세요. 다음에도 그냥 여시면 돼요.', mood: 'happy' }
        : {
            text: '휴대폰 인증 한 번이면 돼요.',
            steps: ['‘시작하기’, 그다음 ‘휴대폰 인증’을 눌러요.', '빈칸을 채우고 ‘인증번호 받기’를 눌러요.', '문자로 온 숫자를 적고 ‘확인’을 눌러요.'],
            actions: [
              walk(
                '/login',
                [
                  { on: ['welcome'], target: 'welcome-start', say: '먼저 여기 ‘시작하기’를 누르세요.' },
                  { on: ['login', 'idcard'], target: 'login-phone', say: '여기 ‘휴대폰 인증’을 누르세요.' },
                  { on: ['assist'], target: 'assist-start', say: '여기를 누르면 휴대폰 인증이 시작돼요.' },
                  { on: ['phone'], target: 'phone-submit', say: '다 적고 나서 여기 ‘인증번호 받기’를 누르세요.' },
                ],
              ),
            ],
            demoNote: '시연이라 문자는 안 가요. 번호는 화면 위쪽에 나와요.',
          },
  },
  {
    id: 'login-assist',
    ask: '혼자 하기 어려워요',
    audience: 'any',
    cues: [[/혼자(서)?(못|하기|는|안)|도와줄(사람|분)|가족(이|이랑|과)?(대신|같이|함께)|대신(해|가입|인증)|도움받기|함께인증/, 5]],
    screens: ['login', 'phone', 'assist'],
    reply: (ctx) =>
      ctx.signedIn
        ? { text: '막히는 화면에서 저를 눌러 물어보세요. 가족에게 화면을 보여 주셔도 좋아요.' }
        : {
            text: '가족이나 복지관 직원과 같이 하셔도 돼요. 본인 휴대폰만 곁에 두세요.',
            actions: ctx.screen === 'login' ? [show('‘함께 인증하기’ 어디 있어요?', 'login-help', '여기 ‘함께 인증하기’를 누르세요.')] : ctx.screen === 'assist' ? undefined : [{ kind: 'go', label: '‘함께 인증하기’ 화면 보기', to: '/login/help' }],
          },
  },
  {
    id: 'id-card',
    ask: '신분증으로 인증할 수 있어요?',
    audience: 'any',
    cues: [[/신분증|주민등록증|민증|운전면허/, 5]],
    screens: ['login', 'idcard'],
    reply: () => ({ text: '신분증 인증은 아직 안 돼요. 지금은 휴대폰 인증만 돼요.', mood: 'sorry' }),
  },
  {
    id: 'logout',
    ask: '로그아웃은 어디서 해요?',
    cues: [[/로그아웃|나가(기|고싶|려)|종료/, 5]],
    screens: ['me'],
    reply: () => ({
      text: '마이페이지 아래쪽에 있어요. 누르면 바로 나가지니 조심하세요.',
      actions: [walk('/me', [nav('nav-me', '마이페이지'), { on: ['me'], target: 'me-logout', say: '여기 ‘로그아웃’이에요. 누르면 한 번 더 물어봐요.' }], '어디 있는지 보기')],
    }),
  },
  {
    id: 'withdraw',
    ask: '회원 탈퇴는 어떻게 해요?',
    cues: [[/탈퇴|계정(을)?(삭제|지우|없애)|그만(쓰|두|이용)|회원(을)?(그만|삭제)/, 6]],
    screens: ['leave', 'me'],
    reply: () => ({
      text: '마이페이지 아래쪽 ‘회원 탈퇴’에 있어요. 탈퇴하면 친구와 대화, 포인트가 모두 사라져요.',
      actions: [walk('/me', [nav('nav-me', '마이페이지'), { on: ['me'], target: 'me-leave', say: '여기 ‘회원 탈퇴’예요. 누르면 안내 화면이 먼저 나와요.' }], '어디 있는지 보기')],
      demoNote: '시연에서는 실제로 지워지는 것이 없어요.',
    }),
  },
  {
    id: 'help-page',
    ask: '도움말은 어디 있어요?',
    cues: [[/도움말|자주묻는|faq|설명서|사용(법|설명)|안내(문|서)/, 4]],
    screens: ['help', 'me'],
    reply: (ctx) =>
      ctx.screen === 'help'
        ? { text: '여기예요. 궁금한 줄을 누르면 답이 펼쳐져요.' }
        : { text: '마이페이지 맨 아래 ‘도움말’에 있어요. 저한테 바로 물어보셔도 돼요.', actions: [viaMe('me-help', '‘도움말’')] },
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
      text: '전화번호는 다른 분에게 보이지 않아요. 본인 확인한 분만 들어올 수 있고요.',
      actions: ctx.screen === 'safety' ? undefined : [viaMe('me-safety', '‘안전하게 이용하기’')],
      demoNote: '시연 화면의 이웃은 진짜 사람이 아니에요.',
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
      text: '동네 이웃을 사귀고, 이야기하고, 모임에도 나가 보는 앱이에요.',
      demoNote: ctx.demo ? '지금은 시연 화면이라 이웃과 활동이 모두 예시예요.' : undefined,
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
      text: '저는 앱 쓰는 법을 알려 드리는 새싹, 시작이예요. 사람은 아니고, 준비해 둔 안내만 알려 드려요.',
      demoNote: ctx.demo ? '이 시연에서는 AI나 상담원이 답하지 않아요.' : undefined,
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
        ? { text: '아래 ‘홈’을 누르면 처음 화면으로 가요.', actions: [show('‘홈’ 어디 있어요?', 'nav-home', '여기 ‘홈’을 누르면 처음 화면으로 가요.')] }
        : { text: '왼쪽 위 ‘뒤로’를 누르세요.', actions: [show('‘뒤로’ 어디 있어요?', 'back', '여기 ‘뒤로’를 누르면 앞 화면으로 돌아가요.')] },
  },
  {
    id: 'listen',
    ask: '답을 소리로 들을 수 있어요?',
    audience: 'any',
    cues: [[/읽어(줘|주|줄)|소리(로|내어)(듣|읽|들)|들려(줘|주)|음성(으로)?안내/, 5]],
    reply: () => ({ text: '답 아래 ‘소리로 듣기’를 누르면 읽어 드려요. 휴대폰에 따라 안 될 수도 있어요.' }),
  },
]

export const topicById = (id: string) => TOPICS.find((t) => t.id === id)
