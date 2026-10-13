import { useAsync } from '@/shared/lib/useAsync'
import { brainApi, type BrainGame } from '../api/brainApi'

export function useBrainStats() {
  return useAsync(() => brainApi.stats(), [])
}

/** 게임이 끝나면 기록 — 실패해도 게임 결과 화면은 그대로 (기록만 못 함) */
export async function saveResult(game: BrainGame, score: number, total: number) {
  try {
    return await brainApi.submit({ game, score, total })
  } catch {
    return null
  }
}
