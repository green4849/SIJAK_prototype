import { Cloud, CloudRain, CloudSun, Sun, type LucideIcon } from 'lucide-react'
import type { RelationLevel } from '../api/wellbeingApi'

/**
 * 사회적 관계 지수를 어르신이 받아들이기 쉬운 '마음 날씨'로 (점수는 작게 함께).
 * 단계 뜻은 날씨 이름 글자로도 전달한다 — 색·그림만으로 전하지 않음.
 */
export const WEATHER: Record<RelationLevel, { icon: LucideIcon; label: string }> = {
  normal: { icon: Sun, label: '맑음' },
  caution: { icon: CloudSun, label: '구름 조금' },
  risk: { icon: Cloud, label: '흐림' },
  urgent: { icon: CloudRain, label: '비' },
}

export const weatherLabel = (level: RelationLevel) => WEATHER[level].label
