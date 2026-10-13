/**
 * 페이지 간 이동 경로. feature는 다른 feature의 경로를 모르므로
 * 페이지가 여기서 만들어 props로 넘긴다 (예: 친구 카드 → 대화방).
 */
export const chatWith = (userId: string) => `/chats/with/${userId}`
export const chatRoom = (roomId: string) => `/chats/${roomId}`
export const activityDetail = (activityId: string) => `/activities/${activityId}`
/** 지역생활 목록을 특정 분류로 열기 (예: 내 포인트 → 봉사모임) */
export const activitiesOf = (category: string) => `/activities?category=${category}`
/** 마음 건강 → 자가평가 (C11) */
export const assessment = (kind: string) => `/me/wellbeing/check/${kind}`
/** 가까운 복지시설 상세 (C7) */
export const welfareDetail = (id: string) => `/welfare/${id}`
/** 두뇌 운동 게임 */
export const brainGame = (game: string) => `/brain/${game}`
