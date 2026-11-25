/** 마음 건강 (C11, 백엔드 domains/wellbeing) · 긴급 도움·보호자 (C10, 백엔드 domains/emergency) */
import { fail, json, noContent, type Route } from '../http'
import { db, newId, save, type DAssessment, type DGuardian } from '../store'
import { FORMS, relationIndex, resultOf, resultsWithPrevious, WHO5_INTERVAL_MS } from '../wellbeing'
import { hasConsent, requireUser, setConsent } from './auth'
import type { Schema } from '@/shared/api/types'

type AssessmentIn = Schema<'AssessmentIn'>
type GuardianOut = Schema<'GuardianOut'>
type GuardianIn = Schema<'GuardianIn'>
type SosOut = Schema<'SosOut'>

const digits = (s: string) => s.replace(/\D/g, '')
const isKind = (k: string): k is DAssessment['kind'] => k in FORMS
type Who5StatusOut = Schema<'Who5StatusOut'>

/** 내 점검 기록 — 새것부터 */
const mine = (uid: string) => db().assessments.filter((a) => a.uid === uid).sort((a, b) => b.id - a.id)

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
    return json(resultsWithPrevious(mine(me.id)))
  }],

  // WHO-5 — 4주가 지났으면 알림함에 한 번 (백엔드 who5_status 와 같게)
  ['GET', '/me/who5', (req) => {
    const me = requireUser(req)
    const [last, prev] = mine(me.id).filter((a) => a.kind === 'who5')
    if (!last) return json({ last: null, next_due_at: null, due: true } satisfies Who5StatusOut)
    const nextDue = new Date(new Date(last.at).getTime() + WHO5_INTERVAL_MS)
    const due = Date.now() >= nextDue.getTime()
    const s = db()
    const ref = `who5_due:${last.id}`
    if (due && !s.notifications.some((n) => n.uid === me.id && n.ref === ref)) {
      s.notifications.push({
        id: newId(),
        uid: me.id,
        kind: 'wellbeing',
        title: '마음 건강 살펴볼 때예요',
        body: '지난 2주 동안의 기분을 질문 다섯 개로 살펴봐요',
        at: new Date().toISOString(),
        read: false,
        link: '/me/wellbeing/check/who5',
        ref,
      })
      save()
    }
    return json({ last: resultOf(last, prev), next_due_at: nextDue.toISOString(), due } satisfies Who5StatusOut)
  }],

  ['GET', '/me/self-assessment/:kind', (req) => {
    requireUser(req)
    const k = req.params.kind
    return isKind(k) ? json(FORMS[k]) : fail(404, 'not_found', '없는 점검이에요.')
  }],

  // 마음 건강 기록(민감정보) 동의·철회 — 철회하면 점검 기록을 먼저 지운다 (B6, 백엔드와 같은 순서)
  ['PUT', '/me/self-assessment/consent', (req) => {
    const me = requireUser(req)
    const agreed = !!(req.body as Schema<'HealthConsentIn'>)?.agreed
    const s = db()
    if (!agreed) s.assessments = s.assessments.filter((a) => a.uid !== me.id)
    setConsent(me, 'health', agreed)
    save()
    return json({ health_consent: hasConsent(me, 'health') } satisfies Schema<'HealthConsentOut'>)
  }],

  ['POST', '/me/self-assessment', (req) => {
    const me = requireUser(req)
    if (!hasConsent(me, 'health'))
      return fail(403, 'health_consent_required', '마음 건강 기록에 동의해야 결과를 저장할 수 있어요.')
    const body = req.body as AssessmentIn
    if (!isKind(body?.kind)) return fail(422, 'validation_error', '점검 종류를 다시 골라 주세요.')
    const form = FORMS[body.kind]
    const allowed = form.options.map((o) => o.value)
    if (
      !Array.isArray(body.answers) ||
      body.answers.length !== form.questions.length ||
      body.answers.some((v) => !allowed.includes(v))
    )
      return fail(422, 'validation_error', '모든 질문에 답해 주세요.')
    const previous = mine(me.id).find((a) => a.kind === body.kind)
    const s = db()
    const a: DAssessment = { id: ++s.seq, uid: me.id, kind: body.kind, answers: body.answers, at: new Date().toISOString() }
    s.assessments.push(a)
    save()
    return json(resultOf(a, previous), 201)
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
