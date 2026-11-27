import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ScrollToTop } from './ScrollToTop'
import { AuthProvider } from '@/features/auth'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { WelcomePage } from '@/pages/WelcomePage'
import { ToastHost } from '@/shared/ui/Toast'
import { IS_DEMO } from '@/shared/lib/demo'
import { PlainLayout, TabLayout } from './AppLayout'
import { OfflineBanner } from './OfflineBanner'
import { UpdateBanner } from './UpdateBanner'
import { RequireAuth, RequireGuest } from './guards'

/**
 * 첫 화면(시작·홈)과 없는 주소만 앱 본체에 두고, 나머지 화면은 들어갈 때 받는다 (H33).
 * 서비스 워커가 화면 조각을 미리 저장하므로(H34) 오프라인에서도 열린다.
 */
// 시작이 안내는 첫 화면이 그려진 뒤 받아 구석에 선다
const Guide = lazy(() => import('@/features/guide').then((m) => ({ default: m.Guide })))
const AssistPage = lazy(() => import('@/pages/AssistPage').then((m) => ({ default: m.AssistPage })))
const ActivitiesPage = lazy(() => import('@/pages/ActivitiesPage').then((m) => ({ default: m.ActivitiesPage })))
const ActivityDetailPage = lazy(() => import('@/pages/ActivityDetailPage').then((m) => ({ default: m.ActivityDetailPage })))
const BlockedPage = lazy(() => import('@/pages/BlockedPage').then((m) => ({ default: m.BlockedPage })))
const ChatListPage = lazy(() => import('@/pages/ChatListPage').then((m) => ({ default: m.ChatListPage })))
const ChatOpenPage = lazy(() => import('@/pages/ChatOpenPage').then((m) => ({ default: m.ChatOpenPage })))
const ChatRoomPage = lazy(() => import('@/pages/ChatRoomPage').then((m) => ({ default: m.ChatRoomPage })))
const CompanionPage = lazy(() => import('@/pages/CompanionPage').then((m) => ({ default: m.CompanionPage })))
const AssessmentPage = lazy(() => import('@/pages/AssessmentPage').then((m) => ({ default: m.AssessmentPage })))
const Who5HistoryPage = lazy(() => import('@/pages/Who5HistoryPage').then((m) => ({ default: m.Who5HistoryPage })))
const FriendSurveyPage = lazy(() => import('@/pages/FriendSurveyPage').then((m) => ({ default: m.FriendSurveyPage })))
const GuardiansPage = lazy(() => import('@/pages/GuardiansPage').then((m) => ({ default: m.GuardiansPage })))
const SosPage = lazy(() => import('@/pages/SosPage').then((m) => ({ default: m.SosPage })))
const WellbeingPage = lazy(() => import('@/pages/WellbeingPage').then((m) => ({ default: m.WellbeingPage })))
const WelfarePage = lazy(() => import('@/pages/WelfarePage').then((m) => ({ default: m.WelfarePage })))
const WelfareDetailPage = lazy(() => import('@/pages/WelfareDetailPage').then((m) => ({ default: m.WelfareDetailPage })))
const BrainPage = lazy(() => import('@/pages/BrainPage').then((m) => ({ default: m.BrainPage })))
const BrainGamePage = lazy(() => import('@/pages/BrainGamePage').then((m) => ({ default: m.BrainGamePage })))
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })))
const LegalPage = lazy(() => import('@/pages/LegalPage').then((m) => ({ default: m.LegalPage })))
const ConsentPage = lazy(() => import('@/pages/ConsentPage').then((m) => ({ default: m.ConsentPage })))
const MyConsentsPage = lazy(() => import('@/pages/MyConsentsPage').then((m) => ({ default: m.MyConsentsPage })))
const WithdrawPage = lazy(() => import('@/pages/WithdrawPage').then((m) => ({ default: m.WithdrawPage })))
const AdminPage = lazy(() => import('@/pages/AdminPage').then((m) => ({ default: m.AdminPage })))
const FriendListPage = lazy(() => import('@/pages/FriendListPage').then((m) => ({ default: m.FriendListPage })))
const FriendsPage = lazy(() => import('@/pages/FriendsPage').then((m) => ({ default: m.FriendsPage })))
const HelpPage = lazy(() => import('@/pages/HelpPage').then((m) => ({ default: m.HelpPage })))
const InstallPage = lazy(() => import('@/pages/InstallPage').then((m) => ({ default: m.InstallPage })))
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const KakaoCallbackPage = lazy(() => import('@/pages/KakaoCallbackPage').then((m) => ({ default: m.KakaoCallbackPage })))
const MyActivitiesPage = lazy(() => import('@/pages/MyActivitiesPage').then((m) => ({ default: m.MyActivitiesPage })))
const MyPage = lazy(() => import('@/pages/MyPage').then((m) => ({ default: m.MyPage })))
const PhoneVerifyPage = lazy(() => import('@/pages/PhoneVerifyPage').then((m) => ({ default: m.PhoneVerifyPage })))
const PointsPage = lazy(() => import('@/pages/PointsPage').then((m) => ({ default: m.PointsPage })))
const ProfileEditPage = lazy(() => import('@/pages/ProfileEditPage').then((m) => ({ default: m.ProfileEditPage })))
const SafetyPage = lazy(() => import('@/pages/SafetyPage').then((m) => ({ default: m.SafetyPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const SignupPage = lazy(() => import('@/pages/SignupPage').then((m) => ({ default: m.SignupPage })))

/**
 * 라우트 등록 지점 — 화면 번호는 docs/design/screens-v1.png
 *   Stage 1: ① /welcome ② /login(+kakao/callback, 시연용 phone·help) /signup ⑧ /safety
 *   Stage 2: ③ / ⑨ /me (+profile·settings·help)
 *   Stage 3: ④ /friends   Stage 4: ⑤ /chats   Stage 5: /me/blocks   Stage 6: ⑥⑦ /activities
 *   C12: /me/points (알림 설정은 /me/settings#notify — 옛 /me/notifications 는 넘겨 준다)
 *   화면·데모만(백엔드 없음, docs/deferred.md §7): C8 /companion · C11 /me/wellbeing · C10 /sos /me/guardians · C7 /welfare · 두뇌 운동 /brain
 *     · 알림함 /notifications · B3 /me/leave · B7 /admin (운영자)
 */
export function App() {
  return (
    <AuthProvider>
      {/* GitHub Pages 같은 하위 경로(/저장소명/)에서도 동작하도록 */}
      <OfflineBanner />
      <UpdateBanner />
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <ScrollToTop />
        <Routes>
          {/* 비회원 */}
          <Route element={<RequireGuest />}>
            <Route element={<PlainLayout />}>
              <Route path="welcome" element={<WelcomePage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="login/kakao/callback" element={<KakaoCallbackPage />} />
              <Route path="login/phone" element={<PhoneVerifyPage />} />
              <Route path="login/help" element={IS_DEMO ? <AssistPage /> : <Navigate to="/login" replace />} />
              <Route path="signup" element={<SignupPage />} />
            </Route>
          </Route>

          {/* 회원 */}
          <Route element={<RequireAuth />}>
            <Route element={<TabLayout />}>
              <Route index element={<HomePage />} />
              <Route path="friends" element={<FriendsPage />} />
              <Route path="friends/survey" element={<FriendSurveyPage />} />
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
              <Route path="me/install" element={<InstallPage />} />
              <Route path="me/points" element={<PointsPage />} />
              {/* 알림 설정은 '설정' 화면으로 합쳤다 — 옛 주소는 그 칸으로 */}
              <Route path="me/notifications" element={<Navigate to="/me/settings#notify" replace />} />
              <Route path="companion" element={<CompanionPage />} />
              <Route path="me/wellbeing" element={<WellbeingPage />} />
              <Route path="me/wellbeing/check/:kind" element={<AssessmentPage />} />
              <Route path="me/wellbeing/history" element={<Who5HistoryPage />} />
              <Route path="sos" element={<SosPage />} />
              <Route path="me/guardians" element={<GuardiansPage />} />
              <Route path="welfare" element={<WelfarePage />} />
              <Route path="welfare/:centerId" element={<WelfareDetailPage />} />
              <Route path="brain" element={<BrainPage />} />
              <Route path="brain/:game" element={<BrainGamePage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="me/leave" element={<WithdrawPage />} />
              <Route path="me/consents" element={<MyConsentsPage />} />
              <Route path="consent" element={<ConsentPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Route>

          <Route element={<PlainLayout />}>
            {/* 약관·개인정보 문서 — 로그인 여부와 상관없이 (가입 전에도 읽는다) */}
            <Route path="legal/:doc" element={<LegalPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
        <ToastHost />
        <Suspense fallback={null}>
          <Guide />
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
