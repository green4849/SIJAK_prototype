// 데모 빌드가 window에 남기는 호출 수 (src/demo/transport.ts)
interface Window {
  __demoCalls?: Record<string, number>
}
