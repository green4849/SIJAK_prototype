/**
 * 앱 안내보다 먼저 챙길 것 — 위기 · 위급 · 금전 요구 · 몸 상태.
 *
 * 순서가 곧 우선순위다 (engine.ts 가 위에서부터 본다). 여기 걸리면 길 안내를 하지 않고
 * 전화처럼 실제 도움으로 이어지는 방법을 먼저 보여 준다.
 * 정해 둔 표현만 알아듣기 때문에 돌려 말하면 놓칠 수 있다 — 그래서 안내 창 아래에는
 * 질문과 상관없이 '급할 때는 119' 줄을 늘 둔다 (GuidePanel).
 */
import type { GuideAction, GuideContext, GuideReply } from './types'

const call = (number: string, label: string): GuideAction => ({ kind: 'call', number, label })

const CRISIS = /죽고싶|죽을래|죽어버|죽는게낫|살기싫|살고싶지않|사라지고싶|자살|목숨(을)?끊|끝내고싶|그만살/
const CRIME = /강도|도둑|때려|때리|맞았|폭행|쫓아|스토킹|협박|흉기|칼(을|로)|납치|성추행|성폭/
const EMERGENCY =
  /살려|쓰러|숨(이|을)?(안|못|막|차)|가슴(이)?(너무)?(아프|아파|답답|조여)|의식(이)?없|피(가|를)?(나|흘|많)|불(이)?났|화재|연기(가)?나|다쳤|넘어졌|낙상|못일어|위급|응급|구급|119|112|긴급(상황|해|합|이야)|(너무|많이|지금)(위험|급해|급합)|큰일났/
const SCAM =
  /돈(을|좀)?(보내|빌려|달라|요구|부쳐|주라|입금)|송금|입금(하|해)|계좌|통장|비밀번호|카드번호|인증번호(를)?(알려|달라|물어|요구|보내)|보이스피싱|피싱|사기|투자(하라|권유|하래|하면)|대출|상품권|돈(을)?보냈/
const MEDICAL = /아파|아프|통증|약(을|은|이)|병원|혈압|당뇨|어지러|어지럽|진료|의사|쑤셔|열(이)?나/

/** 위기·위급·금전 요구 — 앱 사용법 질문보다 항상 먼저 */
export function urgentReply(q: string, ctx: GuideContext): GuideReply | null {
  if (CRISIS.test(q))
    return {
      id: 'crisis',
      kind: 'safety',
      mood: 'care',
      text: '많이 힘드셨군요. 혼자 견디지 않으셔도 돼요. 지금 전화하면 이야기를 들어 줄 분이 있어요.',
      actions: [call('109', '109 상담 전화하기 (24시간)'), call('119', '다쳤거나 위급하면 119')],
    }

  if (CRIME.test(q) || EMERGENCY.test(q)) {
    const crime = CRIME.test(q)
    const calls = crime
      ? [call('112', '112 경찰에 전화하기'), call('119', '다쳤으면 119에 전화하기')]
      : [call('119', '119에 전화하기'), call('112', '112 경찰에 전화하기')]
    return {
      id: 'emergency',
      kind: 'safety',
      mood: 'care',
      text: '급하면 앱보다 전화가 먼저예요. 아래를 눌러 바로 전화하세요. 옆에 누가 있으면 크게 부르세요.',
      actions: ctx.signedIn ? [...calls, { kind: 'go', label: '보호자에게 알리는 ‘긴급 도움’ 화면', to: '/sos' }] : calls,
      note: ctx.demo && ctx.signedIn ? '시연의 ‘도움 요청’은 실제로 알림이 가지 않아요. 급하면 꼭 전화하세요.' : undefined,
    }
  }

  if (SCAM.test(q))
    return {
      id: 'scam',
      kind: 'safety',
      mood: 'care',
      text: '돈이나 계좌번호, 비밀번호는 누구에게도 알려 주지 마세요. ‘시작’은 돈을 달라고 하지 않아요.',
      steps: [
        '이미 보냈거나 알려 줬다면 바로 112에 전화하세요.',
        ctx.signedIn
          ? '그분과의 대화에서 오른쪽 위 ‘더보기’를 누르면 ‘신고하기’가 있어요.'
          : '가족에게도 바로 알리세요.',
      ],
      actions: [
        call('112', '112 경찰에 전화하기'),
        ...(ctx.screen === 'chat'
          ? [{ kind: 'show', label: '‘더보기’ 어디 있어요?', target: 'chat-more', say: '여기 ‘더보기’를 누르면 ‘신고하기’가 나와요.' } satisfies GuideAction]
          : []),
      ],
    }

  return null
}

/** 몸 상태·약 — 앱 사용법으로 알아듣지 못했을 때만 (예: '글씨가 작아 눈이 아파'는 글씨 안내가 먼저) */
export function medicalReply(q: string): GuideReply | null {
  if (!MEDICAL.test(q)) return null
  return {
    id: 'medical',
    kind: 'boundary',
    mood: 'care',
    text: '몸이나 약에 대한 것은 의사나 약사에게 물어보세요. 많이 아프면 바로 119에 전화하세요.',
    actions: [call('119', '119에 전화하기')],
  }
}
