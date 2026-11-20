export interface GuideAnswer {
  id: string
  question: string
  answer: string
  path?: string
  action?: string
  keywords: string[]
}

const ANSWERS: GuideAnswer[] = [
  {
    id: 'safety', question: '돈이나 계좌번호를 요구해요',
    answer: '돈을 보내거나 계좌번호·인증번호를 알려 주지 마세요. 대화 화면의 신고하기를 누르고, 안전하게 이용하기에서 차단 방법을 확인할 수 있어요.',
    path: '/safety', action: '안전하게 이용하기',
    keywords: ['송금', '계좌', '사기', '인증번호 알려', '인증번호 요구', '돈을 요구', '신고', '차단'],
  },
  {
    id: 'emergency', question: '급하게 도움이 필요해요',
    answer: '지금 위험하다면 앱 화면보다 112 또는 119에 먼저 연락하세요. 시작의 긴급 화면에서 보호자에게 알리는 방법도 볼 수 있어요.',
    path: '/sos', action: '긴급 화면 보기',
    keywords: ['긴급', '위급', '응급', '위험해', '도와줘', '살려줘'],
  },
  {
    id: 'friends', question: '친구는 어떻게 찾나요?',
    answer: '아래 친구 메뉴에서 추천 친구와 같은 동네 이웃을 볼 수 있어요. 마음에 드는 분에게 친구 신청을 보내 보세요.',
    path: '/friends', action: '친구 찾기',
    keywords: ['친구 찾', '친구 추천', '친구 신청', '동네 친구', '친구를 사귀'],
  },
  {
    id: 'chat', question: '친구와 어떻게 대화하나요?',
    answer: '홈의 대화하기를 누르면 대화 목록이 열려요. 친구를 고른 뒤 아래 입력칸에 글을 쓰고 보내면 돼요.',
    path: '/chats', action: '대화하기',
    keywords: ['대화', '채팅', '메시지', '답장', '말 걸'],
  },
  {
    id: 'activities', question: '동네 활동은 어디서 보나요?',
    answer: '아래 지역생활 메뉴에서 모임과 활동을 볼 수 있어요. 활동을 누르면 날짜·장소·신청 가능 여부가 나와요.',
    path: '/activities', action: '지역생활 보기',
    keywords: ['지역생활', '활동', '모임', '신청하기', '복지관 프로그램'],
  },
  {
    id: 'welfare', question: '가까운 복지관을 찾고 싶어요',
    answer: '지역생활 화면 위쪽의 가까운 복지관·경로당을 눌러 보세요. 시설 정보는 시연용일 수 있으니 방문 전 직접 확인해 주세요.',
    path: '/welfare', action: '복지시설 보기',
    keywords: ['복지관', '경로당', '복지시설'],
  },
  {
    id: 'companion', question: '말동무와 이야기하고 싶어요',
    answer: '홈의 말동무를 누르면 대화를 시작할 수 있어요. 말동무는 친구를 찾거나 앱을 이용하는 방법을 안내하는 이 도움말과는 다른 기능이에요.',
    path: '/companion', action: '말동무 열기',
    keywords: ['말동무', '외로워', '이야기하고 싶', 'AI 친구'],
  },
  {
    id: 'profile', question: '내 소개를 바꾸고 싶어요',
    answer: '마이페이지의 내 프로필 관리에서 소개와 좋아하는 것을 바꿀 수 있어요.',
    path: '/me/profile', action: '프로필 관리',
    keywords: ['프로필', '내 소개', '관심사', '좋아하는 것', '정보 수정'],
  },
  {
    id: 'font', question: '글씨를 크게 보고 싶어요',
    answer: '로그인한 뒤 마이페이지의 화면 설정에서 글자 크기를 크게 또는 아주 크게로 바꿀 수 있어요.',
    path: '/me/settings', action: '화면 설정',
    keywords: ['글씨', '글자 크기', '작아서', '화면 설정', '고대비'],
  },
  {
    id: 'install', question: '휴대폰 첫 화면에 놓고 싶어요',
    answer: '홈 화면에 아이콘 놓기에서 휴대폰 첫 화면에 시작 바로 가기를 추가하는 방법을 볼 수 있어요.',
    path: '/me/install', action: '아이콘 놓는 방법',
    keywords: ['설치', '바로 가기', '홈 화면에', '앱 아이콘'],
  },
  {
    id: 'points', question: '포인트는 어디서 보나요?',
    answer: '홈 오른쪽 위 포인트 숫자를 누르면 잔액과 사용 내역을 볼 수 있어요. 시연 화면의 포인트는 실제 돈으로 결제되지 않아요.',
    path: '/me/points', action: '내 포인트',
    keywords: ['포인트', '점수', '적립'],
  },
  {
    id: 'login', question: '인증번호가 오지 않아요',
    answer: '인증번호가 보이지 않으면 다시 받기를 눌러 보세요. 도움이 더 필요하면 로그인 화면의 도움받기를 열어 주세요.',
    path: '/login/help', action: '로그인 도움받기',
    keywords: ['로그인', '본인 확인', '휴대폰 인증', '인증번호', '가입'],
  },
]

const BY_ID = new Map(ANSWERS.map((answer) => [answer.id, answer]))
const GUEST = new Set(['login', 'font'])

/** 현재 화면에서 바로 물어볼 만한 질문을 먼저 보여 준다. */
export function suggestedAnswers(pathname: string): GuideAnswer[] {
  const ids = pathname.startsWith('/login') || pathname === '/signup' || pathname === '/welcome'
    ? ['login', 'font']
    : pathname.startsWith('/friends') ? ['friends', 'chat', 'safety']
      : pathname.startsWith('/chats') ? ['chat', 'safety', 'friends']
        : pathname.startsWith('/activities') || pathname.startsWith('/welfare') ? ['activities', 'welfare', 'friends']
          : pathname.startsWith('/companion') ? ['companion', 'activities', 'emergency']
            : pathname.startsWith('/me') ? ['profile', 'font', 'points']
              : ['friends', 'chat', 'activities']
  return ids.map((id) => BY_ID.get(id)!).filter(Boolean)
}

export function findGuideAnswer(question: string, pathname: string): GuideAnswer | null {
  const normalized = question.toLowerCase().replace(/\s+/g, ' ').trim()
  if (!normalized) return null
  const guest = pathname.startsWith('/login') || pathname === '/signup' || pathname === '/welcome'
  const matches = ANSWERS.filter((answer) => !guest || GUEST.has(answer.id))
    .map((answer) => ({ answer, score: Math.max(0, ...answer.keywords.filter((word) => normalized.includes(word.toLowerCase())).map((word) => word.length)) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
  return matches[0]?.answer ?? null
}
