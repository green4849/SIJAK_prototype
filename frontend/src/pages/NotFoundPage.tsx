import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section>
      <h1>찾으시는 화면이 없어요</h1>
      <p>
        <Link to="/">처음 화면으로 돌아가기</Link>
      </p>
    </section>
  )
}
