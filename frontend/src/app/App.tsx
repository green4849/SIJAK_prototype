import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/features/auth'
import { AssistPage } from '@/pages/AssistPage'
import { HomePage } from '@/pages/HomePage'
import { IdCardPage } from '@/pages/IdCardPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PhoneVerifyPage } from '@/pages/PhoneVerifyPage'
import { SafetyPage } from '@/pages/SafetyPage'
import { SignupPage } from '@/pages/SignupPage'
import { WelcomePage } from '@/pages/WelcomePage'
import { PlainLayout } from './AppLayout'
import { RequireAuth, RequireGuest } from './guards'

/**
 * 라우트 등록 지점 — 화면 번호는 docs/design/screens-v1.png
 *   Stage 1: ① /welcome ② /login(+phone·id-card·help) /signup ⑧ /safety
 *   Stage 2: ③ / ⑨ /me (탭 레이아웃)
 */
export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PlainLayout />}>
            <Route element={<RequireGuest />}>
              <Route path="welcome" element={<WelcomePage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="login/phone" element={<PhoneVerifyPage />} />
              <Route path="login/id-card" element={<IdCardPage />} />
              <Route path="login/help" element={<AssistPage />} />
              <Route path="signup" element={<SignupPage />} />
            </Route>
            <Route element={<RequireAuth />}>
              <Route index element={<HomePage />} />
              <Route path="safety" element={<SafetyPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
