/** 브라우저 GPS 한 번 읽기 — 실패 이유를 어르신이 이해할 문장으로 */

export class GeoError extends Error {}

export function getCurrentPosition(timeoutMs = 10_000): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new GeoError('이 휴대폰에서는 위치를 확인할 수 없어요.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? '위치 사용을 허락하지 않으셨어요. 휴대폰 설정에서 허용하면 다시 할 수 있어요.'
            : err.code === err.TIMEOUT
              ? '위치를 찾는 데 시간이 오래 걸려요. 잠시 후 다시 해 주세요.'
              : '지금은 위치를 찾을 수 없어요. 잠시 후 다시 해 주세요.'
        reject(new GeoError(msg))
      },
      // 대략 위치면 충분 — 정밀 GPS는 배터리·시간만 더 든다
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 10 * 60_000 },
    )
  })
}
