import { Link } from 'react-router-dom'
import { openGuide } from '@/features/guide'
import { Button } from '@/shared/ui/Button'
import { TopBar } from '@/shared/ui/TopBar'
import styles from './HelpPage.module.css'

/**
 * ⑨ → 도움말 — 자주 묻는 질문 (펼쳐 보기).
 * 여기는 읽는 목록이고, 화면마다 막히는 것은 시작이(C14)가 그 화면을 보며 답한다.
 */
export function HelpPage() {
  return (
    <section className={styles.page}>
      <TopBar title="도움말" backTo="/me" />

      <div className={styles.list}>
        <details className={styles.item}>
          <summary>글자가 너무 작아요</summary>
          <p>
            <Link to="/me/settings">설정</Link>에서 글자 크기를 &lsquo;크게&rsquo;나 &lsquo;아주
            크게&rsquo;로 바꿔 보세요. 누르는 즉시 바뀌어요.
          </p>
        </details>

        <details className={styles.item}>
          <summary>매번 주소를 치기 어려워요</summary>
          <p>
            휴대폰 첫 화면에 새싹 아이콘을 놓아 두면 눌러서 바로 열려요.{' '}
            <Link to="/me/install">홈 화면에 아이콘 놓기</Link>
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
            절대 알려 주지 마세요. 시작 직원이나 이웃이 돈이나 계좌번호를 묻는 일은 없어요. 대화 화면에서 바로
            신고하고 차단할 수 있어요. <Link to="/safety">안전하게 이용하기</Link>
          </p>
        </details>

        <details className={styles.item}>
          <summary>소개나 좋아하는 것을 바꾸고 싶어요</summary>
          <p>
            마이페이지의 <Link to="/me/profile">내 프로필 관리</Link>에서 언제든 바꿀 수 있어요.
          </p>
        </details>
      </div>

      <div className={styles.ask}>
        <p>여기에 없는 것은 시작이에게 물어보세요. 지금 보고 있는 화면에 맞춰 알려 드려요.</p>
        <Button variant="secondary" block onClick={openGuide}>
          시작이에게 물어보기
        </Button>
      </div>
    </section>
  )
}
