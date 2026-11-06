/** 알림함 · 회원 탈퇴(B3) · 운영자 화면(B7) — 백엔드 없음. 계약: shared/api/draft.ts */
import { REPORT_REASONS, REGIONS } from '../constants'
import { fail, json, noContent, type Route } from '../http'
import { ageOf, db, save, userById, type DAdminCase, regionLabel } from '../store'
import { requireUser } from './auth'
import type { AdminCaseOut, AdminWatchOut, CaseAction, NotificationItemOut, WithdrawIn, WithdrawOut } from '@/shared/api/draft'

const DAY = 86400_000

const STATUS_OF: Record<CaseAction, DAdminCase['status']> = {
  warn: 'warned',
  suspend: 'suspended',
  ban: 'banned',
  dismiss: 'dismissed',
}

function caseOut(c: DAdminCase): AdminCaseOut {
  const { at, ...rest } = c
  return { ...rest, created_at: at }
}

/** 시드 사건 + 데모 안에서 들어온 신고 (신고 화면 → 여기로 바로 이어짐) */
function allCases(): AdminCaseOut[] {
  const s = db()
  const fromReports = s.reports.map((r, i): AdminCaseOut => {
    const u = userById(r.target)
    return {
      id: `report-${i}`,
      source: 'report',
      target_id: r.target,
      target_name: u?.name ?? '알 수 없음',
      reasons: [REPORT_REASONS[r.reason] ?? r.reason],
      excerpt: null,
      level: r.reason === 'money' || r.reason === 'personal_info' ? 3 : 2,
      reports_count: s.reports.filter((x) => x.target === r.target).length,
      created_at: new Date().toISOString(),
      status: s.reportStatus[i] ?? 'open',
    }
  })
  return [...fromReports, ...s.adminCases.map(caseOut)].sort(
    (a, b) => Number(a.status !== 'open') - Number(b.status !== 'open') || b.level - a.level,
  )
}

/** 복지기관이 살피는 '돌봄이 필요한 이웃' — 시연용 고정 목록 (사회적 관계 지수 낮은 순) */
function watchList(): AdminWatchOut[] {
  const row = (id: string, score: number, last: string, signal: string, notified: boolean): AdminWatchOut | null => {
    const u = userById(id)
    if (!u) return null
    return {
      user_id: id, name: u.name, age: ageOf(u.birth_date), region_name: regionLabel(u, REGIONS),
      relation_score: score, last_seen_text: last, signal, guardian_notified: notified,
    }
  }
  return [
    row('u-malsoon', 18, '7일 전', '일주일째 접속이 없어요', true),
    row('u-okja', 36, '오늘', '말동무 대화에 쓸쓸하다는 말이 늘었어요', false),
    row('u-gicheol', 52, '어제', '이번 주 대화가 줄었어요', false),
  ].filter((x): x is AdminWatchOut => x !== null)
}

export const inboxRoutes: Route[] = [
  // ---------- 알림함 ----------
  ['GET', '/notifications', (req) => {
    const me = requireUser(req)
    const list = db()
      .notifications.filter((n) => n.uid === me.id)
      .sort((a, b) => b.at.localeCompare(a.at))
      .map(({ uid: _uid, at, ...n }): NotificationItemOut => ({ ...n, created_at: at }))
    return json(list)
  }],

  ['POST', '/notifications/:id/read', (req) => {
    const me = requireUser(req)
    const n = db().notifications.find((x) => x.uid === me.id && x.id === req.params.id)
    if (!n) return fail(404, 'not_found', '없는 알림이에요.')
    n.read = true
    save()
    return noContent()
  }],

  ['POST', '/notifications/read-all', (req) => {
    const me = requireUser(req)
    db().notifications.forEach((n) => n.uid === me.id && (n.read = true))
    save()
    return noContent()
  }],

  // ---------- 회원 탈퇴 (B3) ----------
  ['POST', '/me/withdraw', (req) => {
    const me = requireUser(req)
    const s = db()
    void (req.body as WithdrawIn) // 이유는 실제로는 통계용으로만 저장
    const deleteAt = new Date(Date.now() + 30 * DAY).toISOString().slice(0, 10)
    s.withdrawn[me.id] = deleteAt
    s.me = null // 바로 로그아웃
    save()
    return json({ delete_at: deleteAt } satisfies WithdrawOut)
  }],

  // ---------- 운영자 화면 (B7) — 실제로는 운영자 권한 필요, 데모는 로그인만 확인 ----------
  ['GET', '/admin/cases', (req) => {
    requireUser(req)
    return json(allCases())
  }],

  ['POST', '/admin/cases/:id/action', (req) => {
    requireUser(req)
    const action = (req.body as { action?: CaseAction })?.action
    if (!action || !STATUS_OF[action]) return fail(422, 'validation_error', '처리 방법을 골라 주세요.')
    const s = db()
    const id = req.params.id
    if (id.startsWith('report-')) {
      const i = Number(id.slice(7))
      if (!s.reports[i]) return fail(404, 'not_found', '없는 신고예요.')
      s.reportStatus[i] = STATUS_OF[action]
    } else {
      const c = s.adminCases.find((x) => x.id === id)
      if (!c) return fail(404, 'not_found', '없는 신고예요.')
      c.status = STATUS_OF[action]
    }
    save()
    return json(allCases().find((c) => c.id === id))
  }],

  ['GET', '/admin/watch', (req) => {
    requireUser(req)
    return json(watchList())
  }],
]
