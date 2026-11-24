// 프런트 단위 테스트 (H41) — 화면 없이 도는 순수 로직만. 화면 흐름은 Playwright e2e(e2e/)
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    restoreMocks: true,
  },
})
