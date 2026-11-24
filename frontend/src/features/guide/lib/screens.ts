/**
 * 화면별 안내 — "이 화면에서 뭘 해야 해?"의 답.
 *
 * 주소만 보지 않고 화면의 지금 상태(인증번호 단계인지, 이미 신청했는지 …)도 본다.
 * 문구는 화면에 실제로 적힌 글자를 그대로 따옴표로 부른다 — 화면을 바꾸면 여기도 같이 고친다.
 *
 * 말하는 법 (옆에서 봐 주는 사람처럼):
 *  · 지금 할 일 하나부터 말한다. "~하는 화면이에요" 같은 화면 소개로 시작하지 않는다 (보면 안다)
 *  · 두 문장 이하. 화면에 있는 것을 다 늘어놓지 않는다 — 나머지는 추천 질문이 맡는다
 *  · 시작이 자신에 대한 설명("제가 대신 하지 않아요")은 하지 않는다
 *  길이와 금지 표현은 e2e/guide-engine.spec.ts 가 지킨다.
 */
import type { GuideAction, GuideContext } from './types'

/** 화면 속 글자를 읽는 도구 (실제 구현은 dom.ts) — 상태 판별에만 쓴다 */
export interface Probe {
  has(selector: string, text?: string | RegExp): boolean
}

export interface ScreenHelp {
  text: string
  steps?: string[]
  actions?: GuideAction[]
  /** 시연 빌드에서만 덧붙이는 말 */
  demoNote?: string
}

interface ScreenDef {
  /** "지금은 ‘○○’ 화면이에요" */
  name: string
  match: RegExp
  /** 본인 확인 전에 보는 화면 */
  guest?: boolean
  /** 시작이를 두지 않는 화면 (긴급·운영자) */
  hidden?: boolean
  /** 그림이 화면 아래 끝까지 닿는 화면 — 시작이 자리를 따로 비우지 않는다 (그림 위에 선다) */
  bleed?: boolean
  variant?: (p: Probe) => string
  help: (variant: string, ctx: GuideContext) => ScreenHelp
  /** 이 화면에서 먼저 권할 질문 (주제 id) */
  suggest: string[]
  /** 이 화면에 처음 들어왔을 때 시작이가 먼저 건네는 한마디 (없으면 건네지 않는다) */
  hint?: string
}

/** 말동무가 실제 AI처럼 보이지 않게 — 시연 빌드에서만 붙인다 */
export const COMPANION_NOTE = '시연의 말동무는 진짜 AI가 아니에요. 준비해 둔 답이 나와요.'
const DEMO_INFO = '시연이라 예시 정보예요. 가기 전에 전화로 확인하세요.'

/** 위에서부터 먼저 맞는 화면 — 더 구체적인 주소를 위에 둔다 */
const ORDER = [
  'welcome', 'phone', 'idcard', 'assist', 'login', 'signup',
  'chat', 'chats', 'activity', 'activities', 'survey', 'friends',
  'profile', 'settings', 'help', 'install', 'myfriends', 'blocks', 'myacts', 'points', 'notifyset',
  'check', 'mindlog', 'wellbeing', 'guardians', 'leave', 'me',
  'safety', 'companion', 'welfaredetail', 'welfare', 'braingame', 'brain', 'inbox', 'sos', 'admin', 'home', 'other',
] as const

export type ScreenId = (typeof ORDER)[number]

export const SCREENS: Record<ScreenId, ScreenDef> = {
  welcome: {
    name: '시작',
    match: /^\/welcome$/,
    bleed: true,
    hint: '안녕하세요! 막히면 저를 눌러 주세요.',
    guest: true,
    help: () => ({
      text: '가운데 ‘시작하기’를 누르시면 돼요.',
      actions: [{ kind: 'show', label: '‘시작하기’ 어디 있어요?', target: 'welcome-start', say: '여기 ‘시작하기’예요. 눌러 보세요.' }],
    }),
    suggest: ['font', 'what-is-app', 'login-how'],
  },
  phone: {
    name: '휴대폰 인증',
    match: /^\/login\/phone$/,
    hint: '적기 어려우면 저를 눌러 주세요.',
    guest: true,
    variant: (p) => (p.has('h1', '인증번호 입력') ? 'code' : 'identity'),
    help: (v) =>
      v === 'code'
        ? {
            text: '문자로 온 숫자 여섯 자리를 적고 ‘확인’을 누르세요.',
            actions: [{ kind: 'show', label: '어디에 적어요?', target: 'code-input', say: '이 칸에 적어 주세요.' }],
            demoNote: '시연이라 문자는 안 와요. 화면 위쪽에 적힌 숫자를 쓰세요.',
          }
        : {
            text: '빈칸을 다 채우고 ‘인증번호 받기’를 누르세요.',
            actions: [{ kind: 'show', label: '‘인증번호 받기’ 어디 있어요?', target: 'phone-submit', say: '다 적고 나서 여기 ‘인증번호 받기’를 누르세요.' }],
            demoNote: '시연이라 문자는 안 가요. 번호는 다음 화면 위쪽에 나와요.',
          },
    suggest: ['login-code', 'login-assist', 'font'],
  },
  idcard: {
    name: '신분증 인증',
    match: /^\/login\/id-card$/,
    guest: true,
    help: () => ({
      text: '신분증 인증은 아직 안 돼요. ‘휴대폰으로 인증하기’를 눌러 주세요.',
      actions: [{ kind: 'show', label: '어디를 눌러요?', target: 'login-phone', say: '여기 ‘휴대폰으로 인증하기’를 누르세요.' }],
    }),
    suggest: ['login-how', 'login-assist', 'font'],
  },
  assist: {
    name: '함께 해요',
    match: /^\/login\/help$/,
    guest: true,
    help: () => ({
      text: '도와주실 분과 같이 보면서 ‘함께 인증 시작하기’를 누르세요.',
      actions: [{ kind: 'show', label: '어디를 눌러요?', target: 'assist-start', say: '도와주실 분과 같이 여기를 누르세요.' }],
    }),
    suggest: ['login-how', 'login-code', 'font'],
  },
  login: {
    name: '본인 확인',
    match: /^\/login$/,
    hint: '혼자 하기 어려우면 저를 눌러 주세요.',
    guest: true,
    help: () => ({
      text: '‘휴대폰 인증’을 누르시면 돼요. 혼자 어려우면 ‘함께 인증하기’도 있어요.',
      actions: [{ kind: 'show', label: '‘휴대폰 인증’ 어디 있어요?', target: 'login-phone', say: '여기 ‘휴대폰 인증’을 누르세요.' }],
    }),
    suggest: ['login-how', 'login-assist', 'id-card'],
  },
  signup: {
    name: '가입',
    match: /^\/signup$/,
    guest: true,
    variant: (p) => (p.has('h1', /사는 동네/) ? 'region' : 'interests'),
    help: (v) =>
      v === 'region'
        ? { text: '‘위치 정보 수집 동의’를 누른 다음, 아래 ‘가입 완료’를 누르세요.' }
        : { text: '좋아하는 것을 골라 보세요. 1개부터 5개까지 돼요.' },
    suggest: ['location', 'font', 'what-is-app'],
  },

  chat: {
    name: '대화',
    match: /^\/chats\/.+/,
    hint: '말 걸기가 어려우면 저를 눌러 주세요.',
    variant: (p) =>
      p.has('[role="status"]', /차단된 대화/) ? 'blocked' : p.has('[aria-label="위험 경고"]') ? 'warning' : 'open',
    help: (v) =>
      v === 'blocked'
        ? { text: '차단한 분이라 보낼 수 없어요. 오른쪽 위 ‘더보기’에서 풀 수 있어요.', actions: [{ kind: 'show', label: '‘더보기’ 어디 있어요?', target: 'chat-more', say: '여기 ‘더보기’를 누르면 ‘차단 풀기’가 나와요.' }] }
        : v === 'warning'
          ? { text: '돈을 보내거나 번호를 알려 주지 마세요. 불편하면 경고 안의 ‘신고하기’를 누르세요.' }
          : {
              text: '아래 칸에 하고 싶은 말을 쓰고 ‘보내기’를 누르세요.',
              actions: [{ kind: 'show', label: '어디에 써요?', target: 'chat-input', say: '이 칸에 쓰시면 돼요.' }],
            },
    suggest: ['chat-voice', 'chat-topics', 'report-block'],
  },
  chats: {
    name: '대화하기',
    match: /^\/chats$/,
    variant: (p) => (p.has('p', '아직 대화가 없어요.') ? 'empty' : 'list'),
    help: (v) =>
      v === 'empty'
        ? { text: '친구가 생기면 여기서 이야기해요. ‘친구 찾으러 가기’를 눌러 보세요.' }
        : {
            text: '이야기할 분을 누르면 대화가 열려요.',
            actions: [{ kind: 'show', label: '어디를 눌러요?', target: 'chats-room', say: '이야기할 분을 누르세요.' }],
          },
    suggest: ['chat-start', 'chat-voice', 'report-block'],
  },
  activity: {
    name: '활동 자세히 보기',
    match: /^\/activities\/.+/,
    hint: '신청 방법이 궁금하면 저를 눌러 주세요.',
    variant: (p) => (p.has('button', '신청 취소하기') ? 'applied' : p.has('button', '자리가 다 찼어요') ? 'full' : 'open'),
    help: (v) =>
      v === 'applied'
        ? { text: '이미 신청하셨어요. 못 가게 되면 아래 ‘신청 취소하기’를 누르세요.' }
        : v === 'full'
          ? { text: '자리가 다 찼어요. ‘뒤로’ 가서 다른 활동을 찾아보세요.', actions: [{ kind: 'show', label: '‘뒤로’ 어디 있어요?', target: 'back', say: '여기 ‘뒤로’예요.' }] }
          : {
              text: '날짜와 장소를 보고, 가고 싶으면 아래 ‘신청하기’를 누르세요.',
              actions: [{ kind: 'show', label: '‘신청하기’ 어디 있어요?', target: 'activity-apply', say: '여기 ‘신청하기’예요. 가고 싶으면 눌러 보세요.' }],
            },
    suggest: ['activity-apply', 'activity-cancel', 'activity-like'],
  },
  activities: {
    name: '지역생활',
    match: /^\/activities$/,
    help: () => ({
      text: '마음에 드는 활동을 눌러 보세요. 날짜와 장소가 나와요.',
      actions: [{ kind: 'show', label: '어디를 눌러요?', target: 'activity-item', say: '궁금한 것을 하나 눌러 보세요.' }],
    }),
    suggest: ['activity-apply', 'welfare', 'activity-mine'],
  },
  survey: {
    name: '성향조사',
    match: /^\/friends\/survey$/,
    help: () => ({ text: '평소 내 모습에 가까운 답을 고르고 ‘다음’을 누르세요. 정답은 없어요.' }),
    suggest: ['friend-request', 'privacy'],
  },
  friends: {
    name: '동네 친구 찾기',
    match: /^\/friends$/,
    hint: '친구 신청이 처음이면 저를 눌러 주세요.',
    variant: (p) => (p.has('#received-title') ? 'received' : 'list'),
    help: (v) =>
      v === 'received'
        ? {
            text: '친구 신청이 와 있어요. 좋으면 ‘수락하기’, 아직 모르겠으면 그냥 두셔도 돼요.',
            actions: [{ kind: 'show', label: '‘수락하기’ 어디 있어요?', target: 'friend-accept', say: '좋으면 여기 ‘수락하기’를 누르세요.' }],
          }
        : {
            text: '마음에 드는 분의 ‘친구 신청’을 눌러 보세요.',
            actions: [{ kind: 'show', label: '‘친구 신청’ 어디 있어요?', target: 'friend-request', say: '여기 ‘친구 신청’이에요. 마음에 드는 분이면 눌러 보세요.' }],
          },
    suggest: ['friend-request', 'friend-accept', 'friend-nearby'],
  },

  profile: {
    name: '내 프로필 관리',
    match: /^\/me\/profile$/,
    help: () => ({
      text: '소개 글을 고치고 ‘저장하기’를 누르세요.',
      actions: [{ kind: 'show', label: '‘저장하기’ 어디 있어요?', target: 'profile-save', say: '다 고치고 여기 ‘저장하기’를 누르세요.' }],
    }),
    suggest: ['profile', 'location', 'font'],
  },
  settings: {
    name: '화면 설정',
    match: /^\/me\/settings$/,
    help: () => ({
      text: '글자 크기나 화면 색을 누르면 바로 바뀌어요.',
      actions: [{ kind: 'show', label: '‘글자 크기’ 어디 있어요?', target: 'settings-font', say: '여기서 ‘크게’를 눌러 보세요.' }],
    }),
    suggest: ['font', 'contrast', 'vibration'],
  },
  help: {
    name: '도움말',
    match: /^\/me\/help$/,
    help: () => ({ text: '궁금한 줄을 누르면 답이 펼쳐져요.' }),
    suggest: ['font', 'install', 'report-block'],
  },
  install: {
    name: '홈 화면에 아이콘 놓기',
    match: /^\/me\/install$/,
    help: () => ({ text: '적힌 순서대로 하면 휴대폰 첫 화면에 새싹 아이콘이 생겨요.' }),
    suggest: ['install', 'help-page', 'font'],
  },
  myfriends: {
    name: '내 친구 목록',
    match: /^\/me\/friends$/,
    help: () => ({ text: '이야기하고 싶은 분의 ‘대화하기’를 누르세요.' }),
    suggest: ['chat-start', 'friend-request', 'report-block'],
  },
  blocks: {
    name: '차단한 이웃',
    match: /^\/me\/blocks$/,
    help: () => ({ text: '다시 이야기하고 싶은 분의 ‘차단 풀기’를 누르세요.' }),
    suggest: ['unblock', 'report-block', 'privacy'],
  },
  myacts: {
    name: '내 활동',
    match: /^\/me\/activities\//,
    help: () => ({ text: '활동을 누르면 날짜와 장소가 다시 나와요.' }),
    suggest: ['activity-cancel', 'activity-apply', 'activities'],
  },
  points: {
    name: '내 포인트',
    match: /^\/me\/points$/,
    help: () => ({ text: '지금 가진 포인트와 모으는 방법이 나와 있어요.', demoNote: '시연이라 진짜 돈은 안 나가요.' }),
    suggest: ['points', 'friend-request', 'activities'],
  },
  notifyset: {
    name: '알림 설정',
    match: /^\/me\/notifications$/,
    help: () => ({ text: '추천 친구 알림을 켜거나 끄는 곳이에요.', demoNote: '시연에서는 알림이 실제로 오지 않아요.' }),
    suggest: ['notify-settings', 'inbox', 'font'],
  },
  check: {
    name: '마음 점검',
    match: /^\/me\/wellbeing\/check\//,
    help: () => ({ text: '읽어 보고 가장 가까운 답을 고르세요. 정답은 없어요.' }),
    suggest: ['wellbeing', 'companion', 'guardians'],
  },
  mindlog: {
    name: '나의 이전 결과',
    match: /^\/me\/wellbeing\/history$/,
    help: () => ({ text: '마음 건강 살펴보기 점수가 어떻게 바뀌었는지 보여 드려요. 높을수록 좋아요.' }),
    suggest: ['wellbeing', 'companion', 'activities'],
  },
  wellbeing: {
    name: '마음 건강',
    match: /^\/me\/wellbeing$/,
    help: () => ({
      text: '이번 주 마음이 어땠는지 보여 드려요. ‘마음 건강 살펴보기’도 해 보세요.',
      demoNote: '시연 화면의 숫자는 예시예요.',
    }),
    suggest: ['wellbeing', 'companion', 'activities'],
  },
  guardians: {
    name: '보호자 연결',
    match: /^\/me\/guardians$/,
    help: () => ({
      text: '급할 때 알릴 분을 적어 두세요. ‘보호자 추가’를 누르면 돼요.',
      actions: [{ kind: 'show', label: '어디서 추가해요?', target: 'guardian-add', say: '여기 ‘보호자 추가’를 누르세요.' }],
      demoNote: '시연에서는 알림이 실제로 가지 않아요.',
    }),
    suggest: ['guardians', 'sos-how', 'privacy'],
  },
  leave: {
    name: '회원 탈퇴',
    match: /^\/me\/leave$/,
    help: () => ({ text: '탈퇴하면 친구와 대화, 포인트가 모두 사라져요. 천천히 읽어 보고 정하세요.' }),
    suggest: ['withdraw', 'logout', 'help-page'],
  },
  me: {
    name: '마이페이지',
    match: /^\/me$/,
    help: () => ({ text: '내 정보와 설정이 모여 있어요. 찾는 것이 안 보이면 물어보세요.' }),
    suggest: ['font', 'profile', 'guardians'],
  },

  safety: {
    name: '안전한 시작',
    match: /^\/safety$/,
    variant: (p) => (p.has('a', '알겠어요, 시작할게요') ? 'afterSignup' : 'info'),
    help: (v) => ({
      text: v === 'afterSignup' ? '천천히 읽어 보시고, 아래 ‘알겠어요, 시작할게요’를 누르세요.' : '안전하게 쓰려고 정한 약속이에요. 천천히 읽어 보세요.',
    }),
    suggest: ['report-block', 'privacy', 'guardians'],
  },
  companion: {
    name: '말동무',
    match: /^\/companion$/,
    hint: '사용법이 궁금하면 저를 눌러 주세요.',
    help: () => ({
      text: '아래 ‘말하기’를 누르고 편하게 이야기하세요. 글로 써도 돼요.',
      actions: [{ kind: 'show', label: '‘말하기’ 어디 있어요?', target: 'companion-mic', say: '여기 ‘말하기’를 누르고 편하게 말씀하세요.' }],
      demoNote: COMPANION_NOTE,
    }),
    suggest: ['companion', 'who-are-you', 'activities'],
  },
  welfaredetail: {
    name: '복지시설 자세히 보기',
    match: /^\/welfare\/.+/,
    help: () => ({ text: '가 보고 싶으면 아래 ‘전화로 신청하기’를 누르세요.', demoNote: DEMO_INFO }),
    suggest: ['welfare', 'activities', 'activity-apply'],
  },
  welfare: {
    name: '가까운 복지시설',
    match: /^\/welfare$/,
    help: () => ({ text: '가까운 곳부터 나와요. 누르면 주소와 전화번호가 보여요.', demoNote: DEMO_INFO }),
    suggest: ['welfare', 'activities', 'location'],
  },
  braingame: {
    name: '두뇌 운동',
    match: /^\/brain\/.+/,
    help: () => ({ text: '시간 제한이 없으니 천천히 해 보세요.' }),
    suggest: ['brain', 'back', 'font'],
  },
  brain: {
    name: '두뇌 운동',
    match: /^\/brain$/,
    help: () => ({ text: '‘짝 맞추기’나 ‘셈하기’ 중에 하나 눌러 보세요.' }),
    suggest: ['brain', 'back', 'font'],
  },
  inbox: {
    name: '알림함',
    match: /^\/notifications$/,
    help: () => ({ text: '새 소식이에요. 누르면 그 화면으로 가요.', demoNote: '시연 화면의 소식은 예시예요.' }),
    suggest: ['inbox', 'notify-settings', 'friend-accept'],
  },
  sos: { name: '긴급 도움', match: /^\/sos$/, hidden: true, help: () => ({ text: '' }), suggest: [] },
  admin: { name: '운영자', match: /^\/admin/, hidden: true, help: () => ({ text: '' }), suggest: [] },
  home: {
    name: '홈',
    match: /^\/$/,
    hint: '막히면 저를 눌러 주세요.',
    help: () => ({ text: '하고 싶은 것을 하나 눌러 보세요. 처음이면 ‘친구 찾기’부터 해 보세요.' }),
    suggest: ['friend-request', 'chat-start', 'activities'],
  },
  other: {
    name: '안내',
    match: /./,
    help: () => ({ text: '길을 잘못 들었어요. ‘처음 화면으로 돌아가기’를 누르세요.' }),
    suggest: ['what-is-app', 'help-page', 'font'],
  },
}

/** 하단 메뉴(홈·친구·지역생활·마이페이지)가 보이는 화면 */
export const TAB_SCREENS: ScreenId[] = ['home', 'friends', 'activities', 'me']

export function screenOf(pathname: string): ScreenId {
  const path = pathname.replace(/\/+$/, '') || '/'
  return ORDER.find((id) => SCREENS[id].match.test(path)) ?? 'other'
}

export const screenDef = (id: ScreenId): ScreenDef => SCREENS[id]
