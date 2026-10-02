/** backend/app/domains/risk 와 같은 계약 */
import { REPORT_REASONS } from '../constants'
import { fail, json, noContent, type Route } from '../http'
import { db, save, userById } from '../store'
import { requireUser } from './auth'

function block(me: string, target: string) {
  if (target === me) fail(422, 'invalid_report', '나를 차단할 수는 없어요.')
  const s = db()
  if (!s.blocks.some((b) => b.blocker === me && b.blocked === target)) s.blocks.push({ blocker: me, blocked: target })
  save()
}

export const safetyRoutes: Route[] = [
  ['GET', '/safety/report-reasons', () =>
    json(Object.entries(REPORT_REASONS).map(([code, label]) => ({ code, label })))],

  ['POST', '/safety/reports', (req) => {
    const me = requireUser(req)
    const b = req.body as { target_user_id: string; reason: string; also_block?: boolean }
    if (b.target_user_id === me.id) return fail(422, 'invalid_report', '나를 신고할 수는 없어요.')
    if (!REPORT_REASONS[b.reason]) return fail(422, 'invalid_report', '신고 이유를 골라 주세요.')
    db().reports.push({ reporter: me.id, target: b.target_user_id, reason: b.reason })
    const alsoBlock = b.also_block !== false
    if (alsoBlock) block(me.id, b.target_user_id)
    save()
    return json({ blocked: alsoBlock }, 201)
  }],

  ['GET', '/safety/blocks', (req) => {
    const me = requireUser(req)
    return json(
      db()
        .blocks.filter((b) => b.blocker === me.id)
        .map((b) => ({ user_id: b.blocked, name: userById(b.blocked)?.name ?? '알 수 없음' })),
    )
  }],

  ['POST', '/safety/blocks', (req) => {
    block(requireUser(req).id, String((req.body as { user_id: string }).user_id))
    return noContent()
  }],

  ['DELETE', '/safety/blocks/:userId', (req) => {
    const me = requireUser(req)
    const s = db()
    s.blocks = s.blocks.filter((b) => !(b.blocker === me.id && b.blocked === req.params.userId))
    save()
    return noContent()
  }],
]
