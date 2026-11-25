/**
 * 시연 빌드 여부 (VITE_DEMO=1, npm run build:demo).
 * 시연에서는 전화 링크를 실제로 실행하지 않도록 화면이 이 값을 본다.
 */
export const IS_DEMO = import.meta.env.VITE_DEMO === '1'
