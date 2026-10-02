import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // 개발 중 /api 요청은 백엔드로 프록시 → 프론트 코드에 백엔드 주소 하드코딩 금지
    proxy: { '/api': 'http://localhost:8000' },
  },
})
