import { useNavigate } from 'react-router-dom'
import { ProfileEditForm, useAuth } from '@/features/auth'
import { toast } from '@/shared/lib/toast'
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
          toast('프로필을 저장했어요')
          navigate('/me', { replace: true })
        }}
      />
    </>
  )
}
