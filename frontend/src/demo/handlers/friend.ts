/** backend/app/domains/friend 와 같은 계약 */
import { INTERESTS, REGIONS } from '../constants'
import { fail, json, noContent, type Route } from '../http'
import { ageOf, db, newId, relatedBlocks, save, type DUser } from '../store'
import { requireUser } from './auth'
import type { Schema } from '@/shared/api/types'

type Relation = 'none' | 'sent' | 'received' | 'friends'

function relations(meId: string): Map<string, [Relation, string]> {
  const out = new Map<string, [Relation, string]>()
  for (const r of db().requests) {
    if (r.from !== meId && r.to !== meId) continue
    const other = r.from === meId ? r.to : r.from
    if (r.status === 'accepted') out.set(other, ['friends', r.id])
    else if (r.status === 'pending' && !out.has(other))
      out.set(other, [r.from === meId ? 'sent' : 'received', r.id])
  }
  return out
}

export function areFriends(a: string, b: string) {
  return relations(a).get(b)?.[0] === 'friends'
}

/** 응답 모양은 백엔드 계약(FriendCard)과 같아야 한다 — 어긋나면 타입 오류 (D3) */
function card(u: DUser, me: DUser, rel: Map<string, [Relation, string]>): Schema<'FriendCard'> {
  const [relation, request_id] = rel.get(u.id) ?? ['none', null]
  return {
    user_id: u.id,
    name: u.name,
    age: ageOf(u.birth_date),
    gender: u.gender,
    intro: u.intro,
    region_name: REGIONS[u.region_code] ?? u.region_code,
    interests: u.interests.map((i) => INTERESTS[i] ?? i),
    common_interests: u.interests.filter((i) => me.interests.includes(i)).map((i) => INTERESTS[i] ?? i),
    distance_km: null, // 반경 검색은 비워 둔 기능 (docs/deferred.md §1)
    relation,
    request_id,
  }
}

function listBy(me: DUser, wanted: Relation) {
  const rel = relations(me.id)
  const blocked = relatedBlocks(me.id)
  return db()
    .users.filter((u) => rel.get(u.id)?.[0] === wanted && !blocked.has(u.id))
    .map((u) => card(u, me, rel))
}

export const friendRoutes: Route[] = [
  ['GET', '/friends/recommendations', (req) => {
    const me = requireUser(req)
    const rel = relations(me.id)
    const blocked = relatedBlocks(me.id)
    const pool = db().users.filter(
      (u) => u.id !== me.id && rel.get(u.id)?.[0] !== 'friends' && !blocked.has(u.id),
    )
    const overlap = (u: DUser) => u.interests.filter((i) => me.interests.includes(i)).length
    const list =
      req.query.get('tab') === 'nearby'
        ? pool.filter((u) => u.region_code === me.region_code).sort((a, b) => b.last_login - a.last_login)
        : [...pool].sort(
            (a, b) =>
              overlap(b) - overlap(a) ||
              Number(a.region_code !== me.region_code) - Number(b.region_code !== me.region_code),
          )
    return json(list.slice(0, 30).map((u) => card(u, me, rel)))
  }],

  ['GET', '/friends', (req) => json(listBy(requireUser(req), 'friends'))],
  ['GET', '/friends/requests', (req) => json(listBy(requireUser(req), 'received'))],

  ['POST', '/friends/requests', (req) => {
    const me = requireUser(req)
    const to = String((req.body as { to_user_id?: string }).to_user_id)
    const target = db().users.find((u) => u.id === to)
    if (!target) return fail(404, 'not_found', '사용자를 찾을 수 없어요.')
    if (to === me.id) return fail(400, 'cannot_request_self', '나에게는 신청할 수 없어요.')
    if (relatedBlocks(me.id).has(to)) return fail(403, 'blocked', '신청할 수 없는 분이에요.')
    const s = db()
    const between = s.requests.filter((r) => (r.from === me.id && r.to === to) || (r.from === to && r.to === me.id))
    if (between.some((r) => r.status === 'accepted')) return fail(409, 'already_friends', '이미 친구예요.')
    const theirs = between.find((r) => r.status === 'pending' && r.to === me.id)
    if (theirs) theirs.status = 'accepted'
    else if (!between.some((r) => r.from === me.id && r.status === 'pending')) {
      const mine = between.find((r) => r.from === me.id)
      if (mine) mine.status = 'pending'
      else s.requests.push({ id: newId(), from: me.id, to, status: 'pending', at: Date.now() })
      // 데모: 이웃이 잠시 뒤 수락해 준다
      setTimeout(() => {
        const r = db().requests.find((x) => x.from === me.id && x.to === to && x.status === 'pending')
        if (r) {
          r.status = 'accepted'
          save()
        }
      }, 8000)
    }
    save()
    return json(card(target, me, relations(me.id)), 201)
  }],

  ['POST', '/friends/requests/:id/accept', (req) => respond(req.params.id, requireUser(req).id, true)],
  ['POST', '/friends/requests/:id/decline', (req) => respond(req.params.id, requireUser(req).id, false)],
]

function respond(id: string, meId: string, accept: boolean) {
  const r = db().requests.find((x) => x.id === id)
  if (!r || r.to !== meId || r.status !== 'pending') return fail(404, 'not_found', '이미 처리됐거나 없는 신청이에요.')
  r.status = accept ? 'accepted' : 'declined'
  save()
  return noContent()
}
