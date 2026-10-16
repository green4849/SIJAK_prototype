/** 마음 건강 (C11) · 긴급 도움·보호자 (C10) — 백엔드 없음. 계약: shared/api/draft.ts */
import { fail, json, noContent, type Route } from '../http'
import { db, newId, save, type DGuardian } from '../store'
import { FORMS, relationIndex, resultOf } from '../wellbeing'
import { requireUser } from './auth'
import type { AssessmentIn, GuardianIn, GuardianOut, SosOut } from '@/shared/api/draft'

const digits = (s: string) => s.replace(/\D/g, '')
const isKind = (k: string): k is 'phq9' | 'gad7' => k === 'phq9' || k === 'gad7'

function guardianOut(g: DGuardian): GuardianOut {
  const d = g.phone
  return {
    id: g.id,
    name: g.name,
    relation: g.relation,
    phone: d,
    phone_masked: `${d.slice(0, 3)}-****-${d.slice(-4)}`,
  }
}

export const wellbeingRoutes: Route[] = [
  ['GET', '/me/relation-index', (req) => json(relationIndex(requireUser(req)))],

  ['GET', '/me/self-assessment', (req) => {
    const me = requireUser(req)
    return json(db().assessments.filter((a) => a.uid === me.id).sort((a, b) => b.id - a.id).map(resultOf))
  }],

  ['GET', '/me/self-assessment/:kind', (req) => {
    requireUser(req)
    const k = req.params.kind
    return isKind(k) ? json(FORMS[k]) : fail(404, 'not_found', '없는 점검이에요.')
  }],

  ['POST', '/me/self-assessment', (req) => {
    const me = requireUser(req)
    const body = req.body as AssessmentIn
    if (!isKind(body?.kind)) return fail(422, 'validation_error', '점검 종류를 다시 골라 주세요.')
    const n = FORMS[body.kind].questions.length
    if (!Array.isArray(body.answers) || body.answers.length !== n || body.answers.some((v) => ![0, 1, 2, 3].includes(v)))
      return fail(422, 'validation_error', '모든 질문에 답해 주세요.')
    const s = db()
    const a = { id: ++s.seq, uid: me.id, kind: body.kind, answers: body.answers, at: new Date().toISOString() }
    s.assessments.push(a)
    save()
    return json(resultOf(a), 201)
  }],

  // ---------- C10 ----------

  ['GET', '/me/guardians', (req) => {
    const me = requireUser(req)
    return json(db().guardians.filter((g) => g.uid === me.id).map(guardianOut))
  }],

  ['POST', '/me/guardians', (req) => {
    const me = requireUser(req)
    const body = req.body as GuardianIn
    const name = (body?.name ?? '').trim()
    const phone = digits(body?.phone ?? '')
    if (!name) return fail(422, 'validation_error', '이름을 적어 주세요.')
    if (!body.relation) return fail(422, 'validation_error', '어떤 사이인지 골라 주세요.')
    if (phone.length < 9 || phone.length > 11) return fail(422, 'validation_error', '전화번호를 다시 확인해 주세요.')
    const s = db()
    if (s.guardians.filter((g) => g.uid === me.id).length >= 3)
      return fail(422, 'too_many_guardians', '보호자는 3명까지 등록할 수 있어요.')
    const g: DGuardian = { id: newId(), uid: me.id, name, relation: body.relation, phone }
    s.guardians.push(g)
    save()
    return json(guardianOut(g), 201)
  }],

  ['DELETE', '/me/guardians/:id', (req) => {
    const me = requireUser(req)
    const s = db()
    s.guardians = s.guardians.filter((g) => !(g.uid === me.id && g.id === req.params.id))
    save()
    return noContent()
  }],

  ['POST', '/emergency/sos', (req) => {
    const me = requireUser(req)
    const s = db()
    const ev = { id: newId(), uid: me.id, at: new Date().toISOString() }
    s.sos.push(ev)
    save()
    // 실제: 보호자 문자·푸시 + 담당 복지사 알림 + 위치(동의한 경우) — 데모는 기록만
    const out: SosOut = {
      id: ev.id,
      created_at: ev.at,
      notified: s.guardians.filter((g) => g.uid === me.id).map((g) => ({ name: g.name, relation: g.relation })),
    }
    return json(out, 201)
  }],
]
