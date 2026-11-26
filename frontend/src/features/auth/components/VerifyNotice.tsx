import { useSignupOptions } from '../hooks/useSignupOptions'

/**
 * 휴대폰 인증 전 안내 (B4·B6) — 처음 오신 분은 약관 동의 전에 인증부터 하므로, 그 전에 무엇이 어디로 가는지 알린다.
 * 실제 문자(Firebase)일 때는 번호가 Google 로 간다는 것까지.
 */
export function VerifyNotice({ policyLink }: { policyLink: React.ReactNode }) {
  const { options } = useSignupOptions()
  const viaGoogle = options?.sms_provider === 'firebase'
  return (
    <>
      {viaGoogle
        ? '인증 문자는 Google(Firebase)이 보내요. 그래서 휴대폰 번호만 Google에 전해져요. '
        : '적어 주신 정보는 본인 확인에 써요. '}
      처음 오신 분은 다음 화면에서 약관에 동의해야 가입 정보가 저장돼요. {policyLink}
    </>
  )
}
