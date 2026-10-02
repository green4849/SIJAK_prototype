import {
  CircleHelp,
  Heart,
  LogOut,
  NotebookPen,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { useMyFriends } from '@/features/friend'
import { Avatar } from '@/shared/ui/Avatar'
import { MenuItem, MenuList } from '@/shared/ui/MenuList'
import { TopBar } from '@/shared/ui/TopBar'
import styles from './MyPage.module.css'

/** ⑨ 마이페이지 */
export function MyPage() {
  const { user, signOut } = useAuth()
  const friends = useMyFriends()
  if (!user) return null

  return (
    <section className={styles.page}>
      <TopBar
        title="마이페이지"
        back={false}
        right={
          <Link to="/me/settings" className={styles.iconLink} aria-label="설정">
            <Settings aria-hidden="true" size="1.4em" />
          </Link>
        }
      />

      <div className={styles.profile}>
        <Avatar name={user.name} seed={user.id} size="xl" />
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

      {/* 활동 숫자는 Stage 6에서 채운다 */}
      <MenuList label="내 활동">
        <MenuItem icon={UserRound} label="내 프로필 관리" to="/me/profile" />
        <MenuItem
          icon={Users}
          label="내 친구 목록"
          value={friends.data ? `${friends.data.length}명` : undefined}
          to="/me/friends"
        />
        <MenuItem icon={NotebookPen} label="신청한 활동" to="/activities" />
        <MenuItem icon={Heart} label="관심 있는 활동" to="/activities" />
      </MenuList>

      <MenuList label="도움">
        <MenuItem icon={Settings} label="글자 크기 · 화면 설정" to="/me/settings" />
        <MenuItem icon={ShieldCheck} label="안전하게 이용하기" to="/safety" />
        <MenuItem icon={CircleHelp} label="도움말" to="/me/help" />
      </MenuList>

      <MenuList>
        <MenuItem icon={LogOut} label="로그아웃" onClick={signOut} danger />
      </MenuList>
    </section>
  )
}
