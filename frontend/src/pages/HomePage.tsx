import { useAuth } from '@/features/auth'
import { Button } from '@/shared/ui/Button'

/** 홈 — 스테이지가 진행되며 각 feature 진입 버튼이 여기에 추가된다. */
export function HomePage() {
  const { user, signOut } = useAuth()

  return (
    <section>
      <h1>{user?.name}님, 안녕하세요</h1>
      <p>
        {user?.region_name} · 위피 시작에 오신 것을 환영해요.
      </p>
      <Button variant="secondary" onClick={signOut}>
        로그아웃
      </Button>
    </section>
  )
}
