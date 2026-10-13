/** 말동무 (C8) — 백엔드 없음. 계약: shared/api/draft.ts */
import { draftReply, STARTERS, VOICE_SAMPLES } from '../companion'
import { TEXT_MAX } from '../constants'
import { fail, json, type Route } from '../http'
import { db, save, type DCompanionMsg } from '../store'
import { requireUser } from './auth'
import type { CompanionInfoOut, CompanionMessage, CompanionReplyOut, CompanionSendIn } from '@/shared/api/draft'

const out = (m: DCompanionMsg): CompanionMessage => ({
  id: m.id,
  role: m.role,
  text: m.text,
  input_type: m.input_type,
  created_at: m.at,
  suggestion: m.suggestion,
  safety: m.safety,
})

export const companionRoutes: Route[] = [
  ['GET', '/companion', (req) => {
    requireUser(req)
    return json({ name: '말동무', starters: STARTERS } satisfies CompanionInfoOut)
  }],

  ['GET', '/companion/messages', (req) => {
    const me = requireUser(req)
    return json(db().companion.filter((m) => m.uid === me.id).slice(-100).map(out))
  }],

  ['POST', '/companion/messages', (req) => {
    const me = requireUser(req)
    const s = db()
    const body = (req.body ?? {}) as CompanionSendIn
    let text: string
    if (body.input_type === 'voice') {
      // 녹음 → 받아쓰기(STT) 자리. 데모는 미리 정한 문장을 차례로
      text = VOICE_SAMPLES[s.companionVoiceTurn % VOICE_SAMPLES.length]
      s.companionVoiceTurn++
    } else {
      text = (body.text ?? '').trim()
      if (!text) return fail(422, 'validation_error', '하실 말을 적어 주세요.')
      if (text.length > TEXT_MAX) return fail(422, 'validation_error', `${TEXT_MAX}자까지 보낼 수 있어요.`)
    }

    const turn = s.companion.filter((m) => m.uid === me.id && m.role === 'user').length
    const r = draftReply(me, text, turn)
    const now = new Date().toISOString()
    const mine: DCompanionMsg = {
      id: ++s.seq, uid: me.id, role: 'user', text, input_type: body.input_type === 'voice' ? 'voice' : 'text',
      at: now, suggestion: null, safety: null, emotion: r.emotion,
    }
    const answer: DCompanionMsg = {
      id: ++s.seq, uid: me.id, role: 'assistant', text: r.text, input_type: 'text',
      at: now, suggestion: r.suggestion, safety: r.safety, emotion: null,
    }
    s.companion.push(mine, answer)
    save()
    return json({ messages: [out(mine), out(answer)] } satisfies CompanionReplyOut)
  }],
]
