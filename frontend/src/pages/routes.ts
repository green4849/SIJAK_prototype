/**
 * 페이지 간 이동 경로. feature는 다른 feature의 경로를 모르므로
 * 페이지가 여기서 만들어 props로 넘긴다 (예: 친구 카드 → 대화방).
 */
export const chatWith = (userId: string) => `/chats/with/${userId}`
export const activityDetail = (activityId: string) => `/activities/${activityId}`
