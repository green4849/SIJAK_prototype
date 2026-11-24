import stillWave from '../assets/still-wave-smile.webp'

/** 시작이 정지 그림 (손 흔들기) — 3D 없이 화면 안 삽화로 쓴다 (예: 마음 건강 살펴보기 시작 화면) */
export function SijagiStill({ size = 120 }: { size?: number }) {
  return <img src={stillWave} alt="" width={size} height={size} style={{ alignSelf: 'center' }} />
}
