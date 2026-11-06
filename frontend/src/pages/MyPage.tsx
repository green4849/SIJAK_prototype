import {
  Ban,
  Bell,
  BellRing,
  DoorOpen,
  CircleHelp,
  Coins,
  Heart,
  HeartPulse,
  Phone,
  LogOut,
  MapPin,
  NotebookPen,
  Settings,
  Smartphone,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth, useLocationRecheck } from '@/features/auth'
import { useActivityCounts } from '@/features/activity'
import { useMyFriends } from '@/features/friend'
import { useUnreadNotifications } from '@/features/inbox'
import { useRelationIndex, weatherLabel } from '@/features/wellbeing'
import { usePointSummary } from '@/features/points'
import { useInstallState } from '@/shared/lib/pwa'
import { Avatar } from '@/shared/ui/Avatar'
import { IconAction } from '@/shared/ui/IconAction'
import { MenuItem, MenuList } from '@/shared/ui/MenuList'
import { TopBar } from '@/shared/ui/TopBar'
import styles from './MyPage.module.css'
import { CardGrid } from '@/shared/ui/CardGrid'

/** ⑨ 마이페이지 */
export function MyPage() {
  const { user, signOut } = useAuth()
  const friends = useMyFriends()
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
          <p className={styles.region}>{user.region_name}</p>
        </div>
      </div>

      <CardGrid gap="section">
        <MenuList label="내 활동">
          <MenuItem
            icon={BellRing}
            label="알림함"
            value={unreadNotes ? `새 소식 ${unreadNotes}개` : undefined}
            to="/notifications"
          />
          <MenuItem icon={UserRound} label="내 프로필 관리" to="/me/profile" />
          {/* 사는 곳은 위치 동의로만 정해진다 — 이사했을 때 여기서 다시 확인 */}
          <MenuItem
            icon={MapPin}
            label={location.pending ? '위치 확인 중…' : '위치 다시 확인'}
            value={location.pending ? undefined : user.region_name}
            onClick={location.recheck}
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
          <MenuItem icon={Settings} label="글자 크기 · 화면 설정" to="/me/settings" />
          <MenuItem icon={Bell} label="알림 설정" to="/me/notifications" />
          <MenuItem icon={Phone} label="보호자 연결" to="/me/guardians" />
          <MenuItem icon={ShieldCheck} label="안전하게 이용하기" to="/safety" />
          <MenuItem icon={Ban} label="차단한 이웃" to="/me/blocks" />
          {!installed && (
            <MenuItem icon={Smartphone} label="홈 화면에 아이콘 놓기" to="/me/install" />
          )}
          <MenuItem icon={CircleHelp} label="도움말" to="/me/help" />
        </MenuList>
      </CardGrid>

      <MenuList plain>
        <MenuItem icon={LogOut} label="로그아웃" onClick={signOut} danger />
        <MenuItem icon={DoorOpen} label="회원 탈퇴" to="/me/leave" />
      </MenuList>
    </section>
  )
}
