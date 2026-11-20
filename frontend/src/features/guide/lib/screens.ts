/**
 * 화면별 안내 — "이 화면에서 뭘 해야 해?"의 답.
 *
 * 주소만 보지 않고 화면의 지금 상태(인증번호 단계인지, 이미 신청했는지 …)도 본다.
 * 문구는 화면에 실제로 적힌 글자를 그대로 따옴표로 부른다 — 화면을 바꾸면 여기도 같이 고친다.
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
  variant?: (p: Probe) => string
  help: (variant: string, ctx: GuideContext) => ScreenHelp
  /** 이 화면에서 먼저 권할 질문 (주제 id) */
  suggest: string[]
  /** 이 화면에 처음 들어왔을 때 시작이가 먼저 건네는 한마디 (없으면 건네지 않는다) */
  hint?: string
}

const DEMO_INFO = '시연 화면의 정보는 예시예요. 가시기 전에 꼭 전화로 확인하세요.'

/** 위에서부터 먼저 맞는 화면 — 더 구체적인 주소를 위에 둔다 */
const ORDER = [
  'welcome', 'phone', 'idcard', 'assist', 'login', 'signup',
  'chat', 'chats', 'activity', 'activities', 'friends',
  'profile', 'settings', 'help', 'install', 'myfriends', 'blocks', 'myacts', 'points', 'notifyset',
  'check', 'wellbeing', 'guardians', 'leave', 'me',
  'safety', 'companion', 'welfaredetail', 'welfare', 'braingame', 'brain', 'inbox', 'sos', 'admin', 'home', 'other',
] as const

export type ScreenId = (typeof ORDER)[number]

export const SCREENS: Record<ScreenId, ScreenDef> = {
  welcome: {
    name: '시작',
    match: /^\/welcome$/,
    hint: '처음 오셨군요! 막히면 저를 눌러 주세요.',
    guest: true,
    help: () => ({
      text: '‘시작’의 첫 화면이에요. 가운데 ‘시작하기’를 누르면 본인 확인으로 넘어가요.',
      actions: [{ kind: 'show', label: '‘시작하기’ 어디 있어요?', target: 'welcome-start', say: '여기예요. ‘시작하기’를 누르면 다음으로 넘어가요.' }],
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
            text: '받은 인증번호 여섯 자리를 ‘인증번호’ 칸에 적고 ‘확인’을 누르세요. 안 오면 ‘인증번호 다시 받기’를 누르면 돼요.',
            actions: [{ kind: 'show', label: '어디에 적어요?', target: 'code-input', say: '이 칸에 인증번호 여섯 자리를 적어 주세요.' }],
            demoNote: '시연 화면이라 문자는 오지 않아요. 화면 위쪽 ‘[시연용] 인증번호’에 적힌 숫자를 쓰시면 돼요.',
          }
        : {
            text: '이름, 생년월일, 휴대전화 번호를 적고 성별을 고른 다음 ‘인증번호 받기’를 누르세요.',
            actions: [{ kind: 'show', label: '‘인증번호 받기’ 어디 있어요?', target: 'phone-submit', say: '다 적으신 뒤에 여기 ‘인증번호 받기’를 누르세요.' }],
            demoNote: '시연 화면이라 실제 문자는 가지 않아요. 인증번호는 다음 화면 위쪽에 보여요.',
          },
    suggest: ['login-code', 'login-assist', 'font'],
  },
  idcard: {
    name: '신분증 인증',
    match: /^\/login\/id-card$/,
    guest: true,
    help: () => ({
      text: '신분증 인증은 아직 준비 중이에요. ‘휴대폰으로 인증하기’를 눌러 주세요.',
      actions: [{ kind: 'show', label: '어디를 눌러요?', target: 'login-phone', say: '여기 ‘휴대폰으로 인증하기’를 누르세요.' }],
    }),
    suggest: ['login-how', 'login-assist', 'font'],
  },
  assist: {
    name: '함께 해요',
    match: /^\/login\/help$/,
    guest: true,
    help: () => ({
      text: '가족이나 복지관 직원과 함께 가입하는 방법이에요. 이 화면을 보여 드리고, 도와주실 분이 옆에 계시면 ‘함께 인증 시작하기’를 누르세요.',
      actions: [{ kind: 'show', label: '어디를 눌러요?', target: 'assist-start', say: '도와주실 분과 함께 여기를 누르세요.' }],
    }),
    suggest: ['login-how', 'login-code', 'font'],
  },
  login: {
    name: '본인 확인',
    match: /^\/login$/,
    hint: '본인 확인을 하는 곳이에요. 도와드릴까요?',
    guest: true,
    help: () => ({
      text: '본인 확인 방법을 고르는 화면이에요. ‘휴대폰 인증’을 누르면 돼요. 혼자 하기 어려우면 ‘도움받기’를 눌러 보세요.',
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
        ? { text: '사는 동네를 정하는 단계예요. ‘위치 정보 수집 동의’를 누르면 동네(약 1km)까지만 저장해요. 그다음 아래 ‘가입 완료’를 누르세요.' }
        : { text: '좋아하는 활동 그림을 눌러 골라 주세요. 하나 이상 고르면 아래 버튼이 ‘다음’으로 바뀌어요.' },
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
        ? { text: '차단된 대화라 메시지를 보낼 수 없어요. 다시 이야기하려면 오른쪽 위 ‘더보기’에서 ‘차단 풀기’를 누르세요.', actions: [{ kind: 'show', label: '‘더보기’ 어디 있어요?', target: 'chat-more', say: '여기 ‘더보기’를 누르면 ‘차단 풀기’가 나와요.' }] }
        : v === 'warning'
          ? { text: '받은 메시지 아래에 위험 경고가 있어요. 돈을 보내거나 번호를 알려 주지 마세요. 불편하면 경고 안의 ‘신고하기’를 누를 수 있어요. 신고는 제가 대신 하지 않아요.' }
          : {
              text: '이웃과 이야기하는 화면이에요. 아래 입력칸에 글을 쓰면 ‘보내기’가 나와요. 글 대신 ‘말하기’를 누르면 목소리를 보낼 수 있어요.',
              actions: [{ kind: 'show', label: '입력칸 어디 있어요?', target: 'chat-input', say: '이 칸에 하고 싶은 말을 쓰세요. 보내기는 직접 눌러 주세요.' }],
            },
    suggest: ['chat-voice', 'chat-topics', 'report-block'],
  },
  chats: {
    name: '대화하기',
    match: /^\/chats$/,
    hint: '이웃과 나눈 대화가 모인 곳이에요.',
    variant: (p) => (p.has('p', '아직 대화가 없어요.') ? 'empty' : 'list'),
    help: (v) =>
      v === 'empty'
        ? { text: '아직 대화가 없어요. 친구가 된 이웃과 여기서 이야기할 수 있어요. ‘친구 찾으러 가기’를 눌러 보세요.' }
        : {
            text: '대화 목록이에요. 이야기하고 싶은 이웃을 누르면 대화 화면이 열려요.',
            actions: [{ kind: 'show', label: '어디를 눌러요?', target: 'chats-room', say: '이야기하고 싶은 이웃을 누르세요.' }],
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
        ? { text: '이미 신청한 활동이에요. 못 가게 되면 아래 ‘신청 취소하기’를 누르세요.' }
        : v === 'full'
          ? { text: '자리가 다 차서 지금은 신청할 수 없어요. ‘뒤로’를 눌러 다른 활동을 찾아보세요.', actions: [{ kind: 'show', label: '‘뒤로’ 어디 있어요?', target: 'back', say: '여기 ‘뒤로’를 누르면 활동 목록으로 돌아가요.' }] }
          : {
              text: '활동의 일시와 장소를 보는 화면이에요. 가고 싶으면 아래 ‘신청하기’를 누르세요. 나중에 다시 보려면 오른쪽 위 ‘관심’을 누르세요.',
              actions: [{ kind: 'show', label: '‘신청하기’ 어디 있어요?', target: 'activity-apply', say: '여기 ‘신청하기’예요. 가고 싶으시면 직접 눌러 주세요.' }],
            },
    suggest: ['activity-apply', 'activity-cancel', 'activity-like'],
  },
  activities: {
    name: '지역생활',
    match: /^\/activities$/,
    hint: '동네 모임을 보는 곳이에요. 도와드릴까요?',
    help: () => ({
      text: '동네 모임과 활동을 보는 화면이에요. 마음에 드는 활동을 누르면 날짜와 장소가 나와요. 위쪽 ‘전체 · 문화·여가 · 건강 …’을 누르면 종류별로 볼 수 있어요.',
      actions: [{ kind: 'show', label: '어디를 눌러요?', target: 'activity-item', say: '궁금한 활동을 누르면 자세한 내용이 나와요.' }],
    }),
    suggest: ['activity-apply', 'welfare', 'activity-mine'],
  },
  friends: {
    name: '동네 친구 찾기',
    match: /^\/friends$/,
    hint: '친구를 찾는 곳이에요. 도와드릴까요?',
    variant: (p) => (p.has('#received-title') ? 'received' : 'list'),
    help: (v) =>
      v === 'received'
        ? {
            text: '맨 위에 ‘나에게 온 친구 신청’이 있어요. ‘수락하기’를 누르면 친구가 되고, 아직 모르겠으면 ‘다음에’를 누르세요. 그 아래에는 추천 친구가 있어요.',
            actions: [{ kind: 'show', label: '‘수락하기’ 어디 있어요?', target: 'friend-accept', say: '친구가 되고 싶으시면 여기 ‘수락하기’를 누르세요.' }],
          }
        : {
            text: '동네 친구를 찾는 화면이에요. 이웃 카드를 보고 마음에 드는 분이 있으면 ‘친구 신청’을 누르세요. ‘같은 동네’를 누르면 가까운 이웃만 볼 수 있어요.',
            actions: [{ kind: 'show', label: '‘친구 신청’ 어디 있어요?', target: 'friend-request', say: '여기 ‘친구 신청’이에요. 마음에 드는 분이면 직접 눌러 주세요.' }],
          },
    suggest: ['friend-request', 'friend-accept', 'friend-nearby'],
  },

  profile: {
    name: '내 프로필 관리',
    match: /^\/me\/profile$/,
    help: () => ({
      text: '한 줄 소개와 좋아하는 것을 바꾸는 화면이에요. 다 고치면 ‘저장하기’를 누르세요.',
      actions: [{ kind: 'show', label: '‘저장하기’ 어디 있어요?', target: 'profile-save', say: '다 고치신 뒤에 여기 ‘저장하기’를 누르세요.' }],
    }),
    suggest: ['profile', 'location', 'font'],
  },
  settings: {
    name: '화면 설정',
    match: /^\/me\/settings$/,
    help: () => ({
      text: '글자 크기, 화면 대비, 진동, 시작이 버튼을 바꾸는 화면이에요. 누르는 즉시 바뀌어요.',
      actions: [{ kind: 'show', label: '‘글자 크기’ 어디 있어요?', target: 'settings-font', say: '여기서 ‘크게’나 ‘아주 크게’를 누르면 바로 바뀌어요.' }],
    }),
    suggest: ['font', 'contrast', 'vibration'],
  },
  help: {
    name: '도움말',
    match: /^\/me\/help$/,
    help: () => ({ text: '자주 묻는 질문을 모아 둔 화면이에요. 궁금한 줄을 누르면 답이 펼쳐져요. 여기에 없는 것은 저에게 물어보세요.' }),
    suggest: ['font', 'install', 'report-block'],
  },
  install: {
    name: '홈 화면에 아이콘 놓기',
    match: /^\/me\/install$/,
    help: () => ({ text: '휴대폰 첫 화면에 새싹 아이콘을 놓는 방법이에요. 화면에 적힌 순서대로 하면, 다음부터는 주소를 치지 않고 아이콘을 눌러 열 수 있어요.' }),
    suggest: ['install', 'help-page', 'font'],
  },
  myfriends: {
    name: '내 친구 목록',
    match: /^\/me\/friends$/,
    help: () => ({ text: '친구가 된 이웃 목록이에요. 이웃 카드의 ‘대화하기’를 누르면 이야기할 수 있어요.' }),
    suggest: ['chat-start', 'friend-request', 'report-block'],
  },
  blocks: {
    name: '차단한 이웃',
    match: /^\/me\/blocks$/,
    help: () => ({ text: '차단한 이웃 목록이에요. 다시 이야기하고 싶은 분이 있으면 ‘차단 풀기’를 누르세요.' }),
    suggest: ['unblock', 'report-block', 'privacy'],
  },
  myacts: {
    name: '내 활동',
    match: /^\/me\/activities\//,
    help: () => ({ text: '신청했거나 하트를 누른 활동이 모여 있어요. 활동을 누르면 자세히 볼 수 있어요.' }),
    suggest: ['activity-cancel', 'activity-apply', 'activities'],
  },
  points: {
    name: '내 포인트',
    match: /^\/me\/points$/,
    help: () => ({ text: '가진 포인트와 모으는 방법, 쓰는 곳, 최근 내역을 보는 화면이에요.', demoNote: '시연 화면의 포인트는 예시예요. 실제 돈이 나가지 않아요.' }),
    suggest: ['points', 'friend-request', 'activities'],
  },
  notifyset: {
    name: '알림 설정',
    match: /^\/me\/notifications$/,
    help: () => ({ text: '추천 친구 알림을 켜고 끄는 화면이에요. 켜 두면 알림 받을 시간을 고를 수 있어요.', demoNote: '시연 화면에서는 실제 알림이 오지 않아요.' }),
    suggest: ['notify-settings', 'inbox', 'font'],
  },
  check: {
    name: '마음 점검',
    match: /^\/me\/wellbeing\/check\//,
    help: () => ({ text: '질문을 읽고 가장 가까운 답을 고르는 점검이에요. 진단이 아니라 스스로 살펴보는 것이니 편하게 고르세요.' }),
    suggest: ['wellbeing', 'companion', 'guardians'],
  },
  wellbeing: {
    name: '마음 건강',
    match: /^\/me\/wellbeing$/,
    help: () => ({
      text: '이번 주 마음 날씨와 사회적 관계 지수를 보는 화면이에요. ‘기분 점검’, ‘걱정 점검’은 진단이 아니라 스스로 살펴보는 점검이에요.',
      demoNote: '시연 화면의 숫자는 예시예요.',
    }),
    suggest: ['wellbeing', 'companion', 'activities'],
  },
  guardians: {
    name: '보호자 연결',
    match: /^\/me\/guardians$/,
    help: () => ({
      text: '긴급 도움을 누르면 알림이 가는 분을 등록하는 화면이에요. 세 명까지 넣을 수 있어요.',
      actions: [{ kind: 'show', label: '어디서 추가해요?', target: 'guardian-add', say: '여기 ‘보호자 추가’를 누르면 이름과 전화번호를 적을 수 있어요.' }],
      demoNote: '시연 화면에서는 실제로 알림이 가지 않아요.',
    }),
    suggest: ['guardians', 'sos-how', 'privacy'],
  },
  leave: {
    name: '회원 탈퇴',
    match: /^\/me\/leave$/,
    help: () => ({ text: '회원 탈퇴 화면이에요. 탈퇴하면 친구·대화·포인트가 모두 사라져요. 천천히 읽어 보고 정하세요. 저는 대신 눌러 드리지 않아요.' }),
    suggest: ['withdraw', 'logout', 'help-page'],
  },
  me: {
    name: '마이페이지',
    match: /^\/me$/,
    hint: '내 정보와 설정이 있는 곳이에요.',
    help: () => ({ text: '내 정보와 설정을 모아 둔 화면이에요. ‘내 활동’에는 프로필·포인트·친구 목록이, ‘도움’에는 글자 크기·보호자 연결·도움말이 있어요.' }),
    suggest: ['font', 'profile', 'guardians'],
  },

  safety: {
    name: '안전한 시작',
    match: /^\/safety$/,
    variant: (p) => (p.has('a', '알겠어요, 시작할게요') ? 'afterSignup' : 'info'),
    help: (v) => ({
      text:
        '안전하게 쓰기 위한 약속을 적어 둔 화면이에요. 본인 확인한 분만 이용하고, 돈·비밀번호 이야기는 바로 알려 드려요.' +
        (v === 'afterSignup' ? ' 다 읽으셨으면 아래 ‘알겠어요, 시작할게요’를 누르세요.' : ''),
    }),
    suggest: ['report-block', 'privacy', 'guardians'],
  },
  companion: {
    name: '말동무',
    match: /^\/companion$/,
    hint: '사용법이 궁금하면 저를 눌러 주세요.',
    help: () => ({
      text: '말동무와 이야기하는 화면이에요. 아래 ‘말하기’를 누르고 말하거나, 입력칸에 글로 써도 돼요. 저는 앱 사용법을 알려 드리고, 일상 이야기는 말동무가 들어 드려요.',
      actions: [{ kind: 'show', label: '‘말하기’ 어디 있어요?', target: 'companion-mic', say: '여기 ‘말하기’를 누르고 편하게 말씀하세요.' }],
      demoNote: '시연 화면의 말동무는 실제 AI가 아니에요. 미리 준비한 답을 보여 줘요.',
    }),
    suggest: ['companion', 'who-are-you', 'activities'],
  },
  welfaredetail: {
    name: '복지시설 자세히 보기',
    match: /^\/welfare\/.+/,
    help: () => ({ text: '시설의 주소, 여는 시간, 프로그램을 보는 화면이에요. 신청은 아래 ‘전화로 신청하기’로 해요.', demoNote: DEMO_INFO }),
    suggest: ['welfare', 'activities', 'activity-apply'],
  },
  welfare: {
    name: '가까운 복지시설',
    match: /^\/welfare$/,
    help: () => ({ text: '가까운 복지관·경로당 목록이에요. 시설을 누르면 주소와 여는 시간, 전화번호가 나와요.', demoNote: DEMO_INFO }),
    suggest: ['welfare', 'activities', 'location'],
  },
  braingame: {
    name: '두뇌 운동',
    match: /^\/brain\/.+/,
    help: () => ({ text: '두뇌 운동 게임이에요. 시간 제한이 없으니 천천히 하셔도 돼요.' }),
    suggest: ['brain', 'back', 'font'],
  },
  brain: {
    name: '두뇌 운동',
    match: /^\/brain$/,
    help: () => ({ text: '두뇌 운동 화면이에요. ‘짝 맞추기’나 ‘셈하기’를 누르면 시작해요. 시간 제한은 없어요.' }),
    suggest: ['brain', 'back', 'font'],
  },
  inbox: {
    name: '알림함',
    match: /^\/notifications$/,
    help: () => ({ text: '친구 신청이나 활동 같은 새 소식이 모이는 곳이에요. 소식을 누르면 그 화면으로 가요.', demoNote: '시연 화면의 소식은 예시예요.' }),
    suggest: ['inbox', 'notify-settings', 'friend-accept'],
  },
  sos: { name: '긴급 도움', match: /^\/sos$/, hidden: true, help: () => ({ text: '' }), suggest: [] },
  admin: { name: '운영자', match: /^\/admin/, hidden: true, help: () => ({ text: '' }), suggest: [] },
  home: {
    name: '홈',
    match: /^\/$/,
    hint: '안녕하세요! 막히면 저를 눌러 주세요.',
    help: () => ({
      text: '홈 화면이에요. 가운데 큰 카드 네 개 — 친구 찾기, 대화하기, 지역생활, 말동무 — 중에 하고 싶은 것을 누르세요. 급할 때는 오른쪽 위 ‘긴급’을 누르세요.',
    }),
    suggest: ['friend-request', 'chat-start', 'activities'],
  },
  other: {
    name: '안내',
    match: /./,
    help: () => ({ text: '찾으시는 화면이 없어요. ‘처음 화면으로 돌아가기’를 누르거나 아래 메뉴에서 가고 싶은 곳을 누르세요.' }),
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
