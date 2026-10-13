/** backend/app/domains/point · mission · notification 과 같은 계약 (C12) */
import { NOTIF_MAX_PER_DAY, POINTS, POINT_REASONS, TIME_SLOTS } from '../constants'
import { fail, json, type Route } from '../http'
import { balanceOf, earn, ensureWelcome, hasRef, ratingsLeftToday, usedFirstFree } from '../points'
import { db, relatedBlocks, save, type DUser } from '../store'
import { requireUser } from './auth'
import { areFriends } from './friend'
import type { Schema } from '@/shared/api/types'

type TimeSlot = Schema<'NotificationPrefsOut'>['recommend_times'][number]
const FIRST_FRIENDS_GOAL = 3

function summary(me: DUser): Schema<'PointSummaryOut'> {
  ensureWelcome(me.id)
  save()
  return {
    balance: balanceOf(me.id),
    friend_request_cost: POINTS.friendRequest,
    next_request_free: !usedFirstFree(me.id),
    free_until: null, // 데모는 체험 기간 없음 — 포인트 흐름이 보이게
    rating_reward: POINTS.rating,
    ratings_left_today: ratingsLeftToday(me.id),
    volunteer_reward: POINTS.volunteer,
    first_friends_reward: POINTS.firstFriends,
  }
}

/** 서로 한 번 이상 말을 주고받은 친구 수 (차단 제외) — chat.talked_friend_ids */
function talkedFriends(me: DUser): number {
  const s = db()
  const blocked = relatedBlocks(me.id)
  let n = 0
  for (const r of s.rooms) {
    if (r.a !== me.id && r.b !== me.id) continue
    const other = r.a === me.id ? r.b : r.a
    if (blocked.has(other) || !areFriends(me.id, other)) continue
    const senders = new Set(s.messages.filter((m) => m.room === r.id).map((m) => m.sender))
    if (senders.has(me.id) && senders.has(other)) n++
  }
  return n
}

function firstFriends(me: DUser): Schema<'MissionOut'> {
  const progress = Math.min(talkedFriends(me), FIRST_FRIENDS_GOAL)
  return {
    code: 'first_friends',
    title: '첫 친구 3명 사귀기',
    description: '친구와 서로 한 번 이상 이야기를 나누면 1명으로 세어요',
    progress,
    goal: FIRST_FRIENDS_GOAL,
    reward: POINTS.firstFriends,
    done: progress >= FIRST_FRIENDS_GOAL,
    claimed: hasRef(me.id, 'mission:first_friends'),
  }
}

function prefsOut(me: DUser): Schema<'NotificationPrefsOut'> {
  const p = db().notif[me.id] ?? { enabled: true, times: ['morning', 'evening'] }
  return {
    recommend_enabled: p.enabled,
    recommend_times: p.times,
    max_per_day: NOTIF_MAX_PER_DAY,
    time_options: Object.entries(TIME_SLOTS).map(([code, label]) => ({ code: code as TimeSlot, label })),
    quiet_hours: '밤 9시부터 아침 8시까지는 알림을 보내지 않아요',
  }
}

export const pointRoutes: Route[] = [
  ['GET', '/points', (req) => json(summary(requireUser(req)))],

  ['GET', '/points/history', (req) => {
    const me = requireUser(req)
    ensureWelcome(me.id)
    save()
    const list = db()
      .points.filter((e) => e.uid === me.id)
      .sort((a, b) => b.id - a.id)
      .slice(0, 30)
      .map(
        (e): Schema<'PointEntryOut'> => ({
          id: e.id,
          amount: e.amount,
          reason: e.reason,
          label: e.memo || POINT_REASONS[e.reason] || e.reason,
          created_at: e.at,
        }),
      )
    return json(list)
  }],

  ['GET', '/missions', (req) => json([firstFriends(requireUser(req))])],

  ['POST', '/missions/:code/claim', (req) => {
    const me = requireUser(req)
    if (req.params.code !== 'first_friends') return fail(422, 'validation_error', '없는 미션이에요.')
    const m = firstFriends(me)
    if (m.claimed) return json(m)
    if (!m.done) return fail(400, 'mission_not_done', '아직 미션을 다 하지 않았어요.')
    earn(me.id, POINTS.firstFriends, 'mission_first_friends', 'mission:first_friends', '')
    save()
    return json(firstFriends(me))
  }],

  ['GET', '/notifications/settings', (req) => json(prefsOut(requireUser(req)))],

  ['PUT', '/notifications/settings', (req) => {
    const me = requireUser(req)
    const body = req.body as Schema<'NotificationPrefsUpdate'>
    const times = Object.keys(TIME_SLOTS).filter((t) => body.recommend_times.includes(t as TimeSlot)) as TimeSlot[]
    if (body.recommend_enabled && times.length === 0)
      return fail(422, 'invalid_notification_prefs', '받는 시간을 하나 이상 골라 주세요.')
    if (times.length > NOTIF_MAX_PER_DAY)
      return fail(422, 'invalid_notification_prefs', `하루 ${NOTIF_MAX_PER_DAY}번까지 고를 수 있어요.`)
    db().notif[me.id] = { enabled: body.recommend_enabled, times }
    save()
    return json(prefsOut(me))
  }],
]
