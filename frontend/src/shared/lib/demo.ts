/**
 * 시연 빌드 여부 (VITE_DEMO=1, npm run build:demo).
 * 시연에서는 전화가 실제로 걸리거나 '알렸어요'가 거짓이 되지 않게 화면이 이 값을 본다.
 */
export const IS_DEMO = import.meta.env.VITE_DEMO === '1'
