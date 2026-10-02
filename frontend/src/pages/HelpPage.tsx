import { Link } from 'react-router-dom'
import { TopBar } from '@/shared/ui/TopBar'
import styles from './HelpPage.module.css'

/** ⑨ → 도움말 — 자주 묻는 질문 (펼쳐 보기) */
export function HelpPage() {
  return (
    <section className={styles.page}>
      <TopBar title="도움말" backTo="/me" />

      <div className={styles.list}>
        <details className={styles.item}>
          <summary>글자가 너무 작아요</summary>
          <p>
            <Link to="/me/settings">화면 설정</Link>에서 글자 크기를 &lsquo;크게&rsquo;나 &lsquo;아주
            크게&rsquo;로 바꿔 보세요. 누르는 즉시 바뀌어요.
          </p>
        </details>

        <details className={styles.item}>
          <summary>인증번호가 오지 않아요</summary>
          <p>
            1~2분 기다려도 오지 않으면 &lsquo;인증번호 다시 받기&rsquo;를 눌러 주세요. 휴대폰이 본인
            명의가 아니면 가족이나 복지관 직원에게 도움을 받아 주세요.
          </p>
        </details>

        <details className={styles.item}>
          <summary>누가 돈이나 계좌번호를 물어봐요</summary>
          <p>
            절대 알려 주지 마세요. 시작에서는 누구도 돈을 요구하지 않아요. 대화 화면에서 바로
            신고하고 차단할 수 있어요. <Link to="/safety">안전하게 이용하기</Link>
          </p>
        </details>

        <details className={styles.item}>
          <summary>사는 곳이나 소개를 바꾸고 싶어요</summary>
          <p>
            마이페이지의 <Link to="/me/profile">내 프로필 관리</Link>에서 언제든 바꿀 수 있어요.
          </p>
        </details>
      </div>
    </section>
  )
}
