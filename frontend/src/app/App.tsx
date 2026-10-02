import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/features/auth'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { SignupPage } from '@/pages/SignupPage'
import { StartPage } from '@/pages/StartPage'
import { AppLayout } from './AppLayout'
import { RequireAuth, RequireGuest } from './guards'

/**
 * 라우트 등록 지점. 페이지는 스테이지를 통과할 때마다 하나씩 추가한다.
 *   Stage 1: /start, /signup (guest) · / (auth)
 *   Stage 2: /companion
 */
export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route element={<RequireGuest />}>
              <Route path="start" element={<StartPage />} />
              <Route path="signup" element={<SignupPage />} />
            </Route>
            <Route element={<RequireAuth />}>
              <Route index element={<HomePage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
