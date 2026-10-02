import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/features/auth'
import { AssistPage } from '@/pages/AssistPage'
import { ActivitiesPage } from '@/pages/ActivitiesPage'
import { ActivityDetailPage } from '@/pages/ActivityDetailPage'
import { BlockedPage } from '@/pages/BlockedPage'
import { ChatListPage } from '@/pages/ChatListPage'
import { ChatOpenPage } from '@/pages/ChatOpenPage'
import { ChatRoomPage } from '@/pages/ChatRoomPage'
import { FriendListPage } from '@/pages/FriendListPage'
import { FriendsPage } from '@/pages/FriendsPage'
import { HelpPage } from '@/pages/HelpPage'
import { HomePage } from '@/pages/HomePage'
import { IdCardPage } from '@/pages/IdCardPage'
import { LoginPage } from '@/pages/LoginPage'
import { MyActivitiesPage } from '@/pages/MyActivitiesPage'
import { MyPage } from '@/pages/MyPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PhoneVerifyPage } from '@/pages/PhoneVerifyPage'
import { ProfileEditPage } from '@/pages/ProfileEditPage'
import { SafetyPage } from '@/pages/SafetyPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { SignupPage } from '@/pages/SignupPage'
import { WelcomePage } from '@/pages/WelcomePage'
import { ToastHost } from '@/shared/ui/Toast'
import { PlainLayout, TabLayout } from './AppLayout'
import { RequireAuth, RequireGuest } from './guards'

/**
 * 라우트 등록 지점 — 화면 번호는 docs/design/screens-v1.png
 *   Stage 1: ① /welcome ② /login(+phone·id-card·help) /signup ⑧ /safety
 *   Stage 2: ③ / ⑨ /me (+profile·settings·help)
 *   Stage 3: ④ /friends   Stage 4: ⑤ /chats   Stage 5: /me/blocks   Stage 6: ⑥⑦ /activities
 */
export function App() {
  return (
    <AuthProvider>
      {/* GitHub Pages 같은 하위 경로(/저장소명/)에서도 동작하도록 */}
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Routes>
          {/* 비회원 */}
          <Route element={<RequireGuest />}>
            <Route element={<PlainLayout />}>
              <Route path="welcome" element={<WelcomePage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="login/phone" element={<PhoneVerifyPage />} />
              <Route path="login/id-card" element={<IdCardPage />} />
              <Route path="login/help" element={<AssistPage />} />
              <Route path="signup" element={<SignupPage />} />
            </Route>
          </Route>

          {/* 회원 */}
          <Route element={<RequireAuth />}>
            <Route element={<TabLayout />}>
              <Route index element={<HomePage />} />
              <Route path="friends" element={<FriendsPage />} />
              <Route path="activities" element={<ActivitiesPage />} />
              <Route path="me" element={<MyPage />} />
            </Route>
            <Route element={<PlainLayout />}>
              <Route path="chats" element={<ChatListPage />} />
              <Route path="chats/with/:userId" element={<ChatOpenPage />} />
              <Route path="chats/:roomId" element={<ChatRoomPage />} />
              <Route path="me/friends" element={<FriendListPage />} />
              <Route path="me/blocks" element={<BlockedPage />} />
              <Route path="me/activities/:kind" element={<MyActivitiesPage />} />
              <Route path="activities/:activityId" element={<ActivityDetailPage />} />
              <Route path="safety" element={<SafetyPage />} />
              <Route path="me/profile" element={<ProfileEditPage />} />
              <Route path="me/settings" element={<SettingsPage />} />
              <Route path="me/help" element={<HelpPage />} />
            </Route>
          </Route>

          <Route element={<PlainLayout />}>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
        <ToastHost />
      </BrowserRouter>
    </AuthProvider>
  )
}
