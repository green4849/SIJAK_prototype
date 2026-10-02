/** backend/app/domains/activity 와 같은 계약 */
import { CATEGORIES } from '../constants'
import { fail, json, type Route } from '../http'
import { db, save, type DActivity, type DUser } from '../store'
import { requireUser } from './auth'
import type { Schema } from '@/shared/api/types'

/** 응답 모양은 백엔드 계약(ActivityOut)과 같아야 한다 — 어긋나면 타입 오류 (D3) */
function out(a: DActivity, me: DUser): Schema<'ActivityOut'> {
  const s = db()
  const applied = s.applications.some((x) => x.aid === a.id && x.uid === me.id)
  const count = a.base_applied + s.applications.filter((x) => x.aid === a.id).length
  return {
    id: a.id,
    title: a.title,
    subtitle: a.subtitle,
    category: a.category,
    category_label: CATEGORIES[a.category] ?? a.category,
    place: a.place,
    schedule_text: a.schedule_text,
    starts_at: a.starts_at,
    ends_at: a.ends_at,
    capacity: a.capacity,
    applied_count: count,
    is_full: count >= a.capacity,
    applied,
    liked: s.likes.some((x) => x.aid === a.id && x.uid === me.id),
    description: a.description,
    image_kind: a.image_kind,
  }
}

function find(id: string) {
  return db().activities.find((a) => a.id === id) ?? fail(404, 'not_found', '활동을 찾을 수 없어요.')
}

const byStart = (x: DActivity, y: DActivity) => x.starts_at.localeCompare(y.starts_at)

export const activityRoutes: Route[] = [
  ['GET', '/activities/categories', () =>
    json(Object.entries(CATEGORIES).map(([code, label]) => ({ code, label })))],

  ['GET', '/activities/mine/counts', (req) => {
    const me = requireUser(req)
    const s = db()
    return json({
      applied: s.applications.filter((x) => x.uid === me.id).length,
      liked: s.likes.filter((x) => x.uid === me.id).length,
    } satisfies Schema<'MyActivityCounts'>)
  }],

  ['GET', '/activities/mine', (req) => {
    const me = requireUser(req)
    const s = db()
    const src = req.query.get('kind') === 'liked' ? s.likes : s.applications
    const ids = new Set(src.filter((x) => x.uid === me.id).map((x) => x.aid))
    return json(s.activities.filter((a) => ids.has(a.id)).sort(byStart).map((a) => out(a, me)))
  }],

  ['GET', '/activities', (req) => {
    const me = requireUser(req)
    const cat = req.query.get('category')
    const now = new Date().toISOString()
    const upcoming = db().activities.filter((a) => a.ends_at >= now && (!cat || !CATEGORIES[cat] || a.category === cat))
    const mine = upcoming.filter((a) => a.region_code === me.region_code)
    return json((mine.length ? mine : upcoming).sort(byStart).map((a) => out(a, me)))
  }],

  ['GET', '/activities/:id', (req) => json(out(find(req.params.id), requireUser(req)))],

  ['POST', '/activities/:id/application', (req) => {
    const me = requireUser(req)
    const a = find(req.params.id)
    const s = db()
    if (!s.applications.some((x) => x.aid === a.id && x.uid === me.id)) {
      if (out(a, me).is_full) return fail(409, 'activity_full', '아쉽게도 자리가 다 찼어요.')
      s.applications.push({ aid: a.id, uid: me.id })
      save()
    }
    return json(out(a, me))
  }],

  ['DELETE', '/activities/:id/application', (req) => {
    const me = requireUser(req)
    const a = find(req.params.id)
    const s = db()
    s.applications = s.applications.filter((x) => !(x.aid === a.id && x.uid === me.id))
    save()
    return json(out(a, me))
  }],

  ['PUT', '/activities/:id/like', (req) => {
    const me = requireUser(req)
    const a = find(req.params.id)
    const s = db()
    if (!s.likes.some((x) => x.aid === a.id && x.uid === me.id)) s.likes.push({ aid: a.id, uid: me.id })
    save()
    return json(out(a, me))
  }],

  ['DELETE', '/activities/:id/like', (req) => {
    const me = requireUser(req)
    const a = find(req.params.id)
    const s = db()
    s.likes = s.likes.filter((x) => !(x.aid === a.id && x.uid === me.id))
    save()
    return json(out(a, me))
  }],
]
