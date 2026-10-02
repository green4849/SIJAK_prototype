import { useNavigate } from 'react-router-dom'
import { ProfileEditForm, useAuth } from '@/features/auth'
import { TopBar } from '@/shared/ui/TopBar'

/** ⑨ → 내 프로필 관리 */
export function ProfileEditPage() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  if (!user) return null

  return (
    <>
      <TopBar title="내 프로필 관리" backTo="/me" />
      <ProfileEditForm
        user={user}
        onSaved={(u) => {
          updateUser(u)
          navigate('/me', { replace: true })
        }}
      />
    </>
  )
}
