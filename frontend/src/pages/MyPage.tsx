import {
  BellRing,
  DoorOpen,
  Coins,
  Heart,
  HeartPulse,
  Phone,
  LogOut,
  NotebookPen,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, useLocationRecheck } from '@/features/auth'
import { useActivityCounts } from '@/features/activity'
import { useMyFriends, useSurveyStatus } from '@/features/friend'
import { useUnreadNotifications } from '@/features/inbox'
import { MoodBand, useRelationIndex, weatherLabel } from '@/features/wellbeing'
import { usePointSummary } from '@/features/points'
import { useInstallState } from '@/shared/lib/pwa'
import { Avatar } from '@/shared/ui/Avatar'
import { ConfirmSheet } from '@/shared/ui/ConfirmSheet'
import { IconAction } from '@/shared/ui/IconAction'
import { MenuItem, MenuList } from '@/shared/ui/MenuList'
import { TopBar } from '@/shared/ui/TopBar'
import { friendSurvey } from './routes'
import styles from './MyPage.module.css'
import { CardGrid } from '@/shared/ui/CardGrid'

/** ⑨ 마이페이지 */
export function MyPage() {
  const { user, signOut } = useAuth()
  const [askLogout, setAskLogout] = useState(false)
  const friends = useMyFriends()
  const survey = useSurveyStatus()
  const counts = useActivityCounts()
  const points = usePointSummary()
  const mood = useRelationIndex()
  const unreadNotes = useUnreadNotifications()
  const { installed } = useInstallState()
  const location = useLocationRecheck()
  if (!user) return null

  return (
    <section className={styles.page}>
      <TopBar
        title="마이페이지"
        back={false}
        right={
          <IconAction icon={Settings} label="설정" to="/me/settings" />
        }
      />

      {/* 마음 새싹 띠 — 본인 화면에서만, 살펴본 기록이 있을 때만 */}
      <MoodBand href="/me/wellbeing">
        <div className={styles.profile}>
          <Avatar name={user.name} seed={user.id} gender={user.gender} size="profile" />
          <div className={styles.who}>
            <p className={styles.name}>
              {user.name}님 <span className={styles.age}>{user.age}세</span>
            </p>
            {user.intro ? (
              <p className={styles.intro}>{user.intro}</p>
            ) : (
              <Link to="/me/profile" className={styles.introEmpty}>
                한 줄 소개를 적어 보세요
              </Link>
            )}
            {/* 사는 곳은 위치 동의로만 정해진다 — 이사했을 때 여기서 다시 확인 (누르는 것이 동의) */}
            <p className={styles.region}>
              <span>{user.region_name}</span>
              <button
                type="button"
                className={styles.textLink}
                onClick={location.recheck}
                disabled={location.pending}
              >
                {location.pending ? '위치 확인 중…' : '위치 다시 확인'}
              </button>
            </p>
          </div>
        </div>
      </MoodBand>

      <CardGrid gap="section">
        <MenuList label="내 활동">
          <MenuItem
            icon={BellRing}
            label="알림함"
            value={unreadNotes ? `새 소식 ${unreadNotes}개` : undefined}
            to="/notifications"
          />
          <MenuItem icon={UserRound} label="내 프로필 관리" to="/me/profile" />
          {/* 성향조사 — 했으면 고치러, 안 했으면 시작하러 (C15) */}
          <MenuItem
            icon={Sparkles}
            label={survey.data?.answers ? '내 취향 수정하기' : '성향조사 하기'}
            to={survey.data?.answers ? `${friendSurvey}?edit` : friendSurvey}
          />
          <MenuItem
            icon={HeartPulse}
            label="마음 건강"
            value={mood.data ? weatherLabel(mood.data.level) : undefined}
            to="/me/wellbeing"
          />
          <MenuItem
            icon={Coins}
            label="내 포인트"
            value={points ? `${points.balance.toLocaleString()}P` : undefined}
            to="/me/points"
          />
          <MenuItem
            icon={Users}
            label="내 친구 목록"
            value={friends.data ? `${friends.data.length}명` : undefined}
            to="/me/friends"
          />
          <MenuItem
            icon={NotebookPen}
            label="신청한 활동"
            value={counts.data ? `${counts.data.applied}개` : undefined}
            to="/me/activities/applied"
          />
          <MenuItem
            icon={Heart}
            label="관심 있는 활동"
            value={counts.data ? `${counts.data.liked}개` : undefined}
            to="/me/activities/liked"
          />
        </MenuList>

        <MenuList label="도움">
          {/* 글자 크기·화면·진동·알림을 한 화면에서 (메뉴 줄이기 — docs/ux-changes.md) */}
          <MenuItem icon={Settings} label="설정" to="/me/settings" />
          <MenuItem icon={Phone} label="보호자 연결" to="/me/guardians" />
          <MenuItem icon={ShieldCheck} label="안전하게 이용하기" to="/safety" />
        </MenuList>
      </CardGrid>

      <MenuList plain>
        <MenuItem icon={LogOut} label="로그아웃" onClick={() => setAskLogout(true)} danger />
        <MenuItem icon={DoorOpen} label="회원 탈퇴" to="/me/leave" />
      </MenuList>

      {/* 가끔 쓰는 것 — 메뉴 줄 대신 맨 아래 작은 글자 링크로 (docs/ux-changes.md) */}
      <nav aria-label="더 보기" className={styles.more}>
        <ul>
          <li>
            <Link to="/me/blocks">차단한 이웃</Link>
          </li>
          {!installed && (
            <li>
              <Link to="/me/install">홈 화면에 아이콘 놓기</Link>
            </li>
          )}
          <li>
            <Link to="/me/help">도움말</Link>
          </li>
          <li>
            <Link to="/me/consents">약관 및 동의</Link>
          </li>
        </ul>
      </nav>

      <ConfirmSheet
        open={askLogout}
        title="로그아웃할까요?"
        confirmLabel="로그아웃"
        onConfirm={signOut}
        onClose={() => setAskLogout(false)}
      >
        <p>다시 들어오려면 휴대폰 인증을 해야 해요.</p>
      </ConfirmSheet>
    </section>
  )
}
