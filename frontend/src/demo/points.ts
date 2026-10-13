/**
 * 포인트 원장 — backend/app/domains/point/service.py 의 사본 (C12).
 * 핸들러(friend·activity·points)가 함께 쓰므로 handlers/ 밖에 둔다 (서로 import 하지 않게).
 */
import { POINTS } from './constants'
import { fail } from './http'
import { db, type DPointEntry } from './store'

const KST_MS = 9 * 3600_000

/** 한국 날짜의 0시 (ISO) — 하루 평가 횟수 세기용 */
function kstMidnightIso(): string {
  const kst = new Date(Date.now() + KST_MS)
  kst.setUTCHours(0, 0, 0, 0)
  return new Date(kst.getTime() - KST_MS).toISOString()
}

const mine = (uid: string) => db().points.filter((e) => e.uid === uid)

export const balanceOf = (uid: string) => mine(uid).reduce((sum, e) => sum + e.amount, 0)
export const hasRef = (uid: string, ref: string) => mine(uid).some((e) => e.ref === ref)

/** 같은 ref 는 한 번만 (백엔드 UNIQUE(user_id, ref)) — 들어갔으면 true */
function add(uid: string, amount: number, reason: DPointEntry['reason'], ref: string, memo: string) {
  if (hasRef(uid, ref)) return false
  const s = db()
  s.points.push({ id: ++s.seq, uid, amount, reason, ref, memo, at: new Date().toISOString() })
  return true
}

export function ensureWelcome(uid: string) {
  add(uid, POINTS.welcome, 'welcome', 'welcome', '')
}

export function ratingsLeftToday(uid: string) {
  const since = kstMidnightIso()
  const used = mine(uid).filter((e) => e.reason === 'rating' && e.at >= since).length
  return Math.max(0, POINTS.ratingDailyLimit - used)
}

export const usedFirstFree = (uid: string) => mine(uid).some((e) => e.reason === 'friend_request')

/** 받은 포인트 (못 받으면 0) */
export function earn(uid: string, amount: number, reason: DPointEntry['reason'], ref: string, memo: string) {
  ensureWelcome(uid)
  return add(uid, amount, reason, ref, memo) ? amount : 0
}

export function earnRating(uid: string, target: string, memo: string) {
  if (ratingsLeftToday(uid) <= 0) return 0
  return earn(uid, POINTS.rating, 'rating', `rating:${target}`, memo)
}

export function removeRef(uid: string, ref: string) {
  const s = db()
  s.points = s.points.filter((e) => !(e.uid === uid && e.ref === ref))
}

/** 새 친구 신청 비용 — 첫 신청 무료, 같은 사람은 한 번만, 모자라면 402 */
export function chargeFriendRequest(uid: string, target: string, memo: string) {
  ensureWelcome(uid)
  const ref = `friend_request:${target}`
  if (hasRef(uid, ref)) return
  const cost = usedFirstFree(uid) ? POINTS.friendRequest : 0
  if (cost && balanceOf(uid) < cost)
    fail(402, 'insufficient_points', `친구 신청에는 ${cost}P가 필요해요.`)
  add(uid, -cost, 'friend_request', ref, memo)
}
