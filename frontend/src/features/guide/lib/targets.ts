/**
 * 시작이가 짚어 줄 수 있는 화면 속 버튼·칸.
 *
 * 다른 feature 를 import 하지 않고(레이어 규칙) 화면에 실제로 그려진 것을 찾아 쓴다 —
 * 링크는 가는 곳으로, 버튼은 화면에 적힌 글자로. 그래서 안내 문구와 화면이 어긋나면
 * 찾지 못하고, 그때 시작이는 "지금 화면에서는 안 보여요"라고 말한다 (없는 버튼을 가리키지 않는다).
 * 모든 대상이 시연 화면에서 실제로 찾아지는지는 e2e/guide.spec.ts 가 확인한다.
 */

/** 화면에서 찾는 도구 — 실제 구현은 dom.ts (여기는 브라우저 없이도 읽을 수 있어야 한다) */
export interface Finder {
  /** 앱 안 경로로 가는 링크 */
  link(path: string, within?: string): Element | null
  /** 경로가 이 글자로 시작하는 첫 링크 (목록의 첫 항목) */
  linkUnder(prefix: string, within?: string): Element | null
  /** 보이는 글자가 맞는 첫 요소 */
  text(selector: string, text: string | RegExp): Element | null
  css(selector: string): Element | null
}

interface Target {
  /** 사람에게 말할 때의 이름 */
  name: string
  find: (f: Finder) => Element | null
}

const NAV = 'nav[aria-label="주요 메뉴"]'
const HOME_CARDS = 'nav[aria-label="바로 가기"]'
const MY_MENU = 'ul[aria-label="내 활동"]'
const HELP_MENU = 'ul[aria-label="도움"]'

const target = (name: string, find: Target['find']): Target => ({ name, find })

export const TARGETS = {
  // 아래 메뉴
  'nav-home': target('아래 ‘홈’ 메뉴', (f) => f.link('/', NAV)),
  'nav-friends': target('아래 ‘친구’ 메뉴', (f) => f.link('/friends', NAV)),
  'nav-activities': target('아래 ‘지역생활’ 메뉴', (f) => f.link('/activities', NAV)),
  'nav-me': target('아래 ‘마이페이지’ 메뉴', (f) => f.link('/me', NAV)),
  back: target('왼쪽 위 ‘뒤로’', (f) => f.text('button', '뒤로')),

  // 시작·본인 확인
  'welcome-start': target('‘시작하기’ 버튼', (f) => f.link('/login')),
  'welcome-font': target('맨 위 ‘가가’ 버튼', (f) => f.css('button[aria-label="글씨 크게"]')),
  'login-phone': target('‘휴대폰 인증’', (f) => f.link('/login/phone')),
  'login-help': target('‘도움받기’', (f) => f.link('/login/help')),
  'phone-submit': target('‘인증번호 받기’ 버튼', (f) => f.text('button', '인증번호 받기')),
  'code-input': target('‘인증번호’ 칸', (f) => f.css('input[autocomplete="one-time-code"]')),
  'code-resend': target('‘인증번호 다시 받기’ 버튼', (f) => f.text('button', '인증번호 다시 받기')),
  'assist-start': target('‘함께 인증 시작하기’ 버튼', (f) => f.link('/login/phone')),

  // 홈
  'home-friends': target('‘친구 찾기’ 카드', (f) => f.link('/friends', HOME_CARDS)),
  'home-chats': target('‘대화하기’ 카드', (f) => f.link('/chats', HOME_CARDS)),
  'home-activities': target('‘지역생활’ 카드', (f) => f.link('/activities', HOME_CARDS)),
  'home-companion': target('‘말동무’ 카드', (f) => f.link('/companion', HOME_CARDS)),
  'home-sos': target('오른쪽 위 ‘긴급’', (f) => f.link('/sos')),
  'home-points': target('오른쪽 위 포인트', (f) => f.link('/me/points')),
  'home-brain': target('‘오늘의 두뇌 운동’', (f) => f.link('/brain')),

  // 친구
  'friend-request': target('‘친구 신청’ 버튼', (f) => f.text('button', /^친구 신청/)),
  'friend-accept': target('‘수락하기’ 버튼', (f) => f.text('button', '수락하기')),
  'friends-nearby': target('‘같은 동네’', (f) => f.text('[role="tab"]', '같은 동네')),
  'friends-recommended': target('‘추천 친구’', (f) => f.text('[role="tab"]', '추천 친구')),
  'friend-location': target('‘내 위치 사용하기’ 버튼', (f) => f.text('button', '내 위치 사용하기')),
  'friend-rate': target('‘만나보고 싶어요’ 버튼', (f) => f.text('button', /만나보고 싶어요/)),

  // 대화
  'chats-room': target('대화 목록의 이웃', (f) => f.linkUnder('/chats/')),
  'chat-input': target('아래 입력칸', (f) => f.css('#composer-input')),
  'chat-mic': target('입력칸 옆 ‘말하기’', (f) => f.css('button[aria-label="음성으로 말하기"]')),
  'chat-topics': target('입력칸 위 ‘대화 주제 추천’', (f) => f.text('button', '대화 주제 추천')),
  'chat-more': target('오른쪽 위 ‘더보기’', (f) => f.text('button', '더보기')),

  // 지역생활
  'activities-welfare': target('‘가까운 복지관·경로당’', (f) => f.link('/welfare')),
  'activities-kinds': target('활동 종류 고르기', (f) => f.css('[role="tablist"][aria-label="활동 종류"]')),
  'activity-item': target('활동 카드', (f) => f.linkUnder('/activities/')),
  'activity-apply': target('아래 ‘신청하기’ 버튼', (f) => f.text('button', '신청하기')),
  'activity-cancel': target('‘신청 취소하기’ 버튼', (f) => f.text('button', '신청 취소하기')),
  'activity-like': target('오른쪽 위 ‘관심’', (f) => f.text('button', '관심')),

  // 마이페이지
  'me-inbox': target('‘알림함’', (f) => f.link('/notifications', MY_MENU)),
  'me-profile': target('‘내 프로필 관리’', (f) => f.link('/me/profile', MY_MENU)),
  'me-location': target('‘위치 다시 확인’', (f) => f.text(`${MY_MENU} button`, /^위치 다시 확인/)),
  'me-wellbeing': target('‘마음 건강’', (f) => f.link('/me/wellbeing', MY_MENU)),
  'me-points': target('‘내 포인트’', (f) => f.link('/me/points', MY_MENU)),
  'me-friends': target('‘내 친구 목록’', (f) => f.link('/me/friends', MY_MENU)),
  'me-applied': target('‘신청한 활동’', (f) => f.link('/me/activities/applied', MY_MENU)),
  'me-liked': target('‘관심 있는 활동’', (f) => f.link('/me/activities/liked', MY_MENU)),
  'me-settings': target('‘글자 크기 · 화면 설정’', (f) => f.link('/me/settings', HELP_MENU)),
  'me-notify': target('‘알림 설정’', (f) => f.link('/me/notifications', HELP_MENU)),
  'me-guardians': target('‘보호자 연결’', (f) => f.link('/me/guardians', HELP_MENU)),
  'me-safety': target('‘안전하게 이용하기’', (f) => f.link('/safety', HELP_MENU)),
  'me-blocks': target('‘차단한 이웃’', (f) => f.link('/me/blocks', HELP_MENU)),
  'me-install': target('‘홈 화면에 아이콘 놓기’', (f) => f.link('/me/install', HELP_MENU)),
  'me-help': target('‘도움말’', (f) => f.link('/me/help', HELP_MENU)),
  'me-logout': target('맨 아래 ‘로그아웃’', (f) => f.text('button', '로그아웃')),
  'me-leave': target('맨 아래 ‘회원 탈퇴’', (f) => f.link('/me/leave')),

  // 설정·그 밖
  'settings-font': target('‘글자 크기’', (f) => f.text('fieldset', /^글자 크기/)),
  'settings-contrast': target('‘화면 대비’', (f) => f.text('fieldset', /^화면 대비/)),
  'settings-vibration': target('‘진동’', (f) => f.text('fieldset', /^진동/)),
  'profile-save': target('‘저장하기’ 버튼', (f) => f.text('button', '저장하기')),
  'guardian-add': target('‘보호자 추가’ 버튼', (f) => f.text('button', '보호자 추가')),
  'companion-input': target('아래 입력칸', (f) => f.css('#companion-input')),
  'companion-mic': target('입력칸 옆 ‘말하기’', (f) => f.css('button[aria-label="말로 하기"]')),
} satisfies Record<string, Target>

export type TargetId = keyof typeof TARGETS

export const targetName = (id: TargetId) => TARGETS[id].name
