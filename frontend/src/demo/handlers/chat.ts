/** backend/app/domains/chat 와 같은 계약 + 데모용 자동 답장 */
import { REGIONS, TEXT_MAX } from '../constants'
import { fail, json, type Route } from '../http'
import { assessText } from '../rules'
import { ageOf, db, newId, relatedBlocks, save, userById, voiceBlobs, type DMessage, type DRoom, type DUser } from '../store'
import { requireUser } from './auth'
import { areFriends } from './friend'
import type { Schema } from '@/shared/api/types'

const PREFIX = '/api/v1'

const REPLIES = [
  '네~ 반가워요! 😊',
  '좋아요. 다음에 꼭 같이 해요!',
  '오늘 날씨가 참 좋네요. 산책하기 딱이에요.',
  '말씀 잘 들었어요. 고마워요!',
  '저도 그렇게 생각해요. 😄',
]

const other = (r: DRoom, me: string) => (r.a === me ? r.b : r.a)

/** 응답 모양은 백엔드 계약과 같아야 한다 — 어긋나면 타입 오류 (D3) */
function peer(u: DUser): Schema<'ChatPeer'> {
  return { user_id: u.id, name: u.name, age: ageOf(u.birth_date), region_name: REGIONS[u.region_code] ?? u.region_code }
}

function roomOut(r: DRoom, me: string): Schema<'RoomOut'> {
  const msgs = db().messages.filter((m) => m.room === r.id)
  const last = msgs.at(-1)
  const lastRead = r.read[me] ?? 0
  return {
    id: r.id,
    peer: peer(userById(other(r, me))!),
    last_message: last ? (last.kind === 'voice' ? '🎤 음성 메시지' : last.body) : null,
    last_message_at: r.last_at,
    unread: msgs.filter((m) => m.id > lastRead && m.sender !== me).length,
    blocked: relatedBlocks(me).has(other(r, me)),
  }
}

function messageOut(m: DMessage, me: string): Schema<'MessageOut'> {
  return {
    id: m.id,
    sender_id: m.sender,
    mine: m.sender === me,
    kind: m.kind,
    body: m.body,
    duration_sec: m.duration_sec,
    audio_url: m.kind === 'voice' ? `${PREFIX}/chats/voice/${m.id}` : null,
    created_at: m.created_at,
    warning:
      m.risk_level > 0 && m.sender !== me ? { level: m.risk_level, reasons: m.risk_labels } : null,
  }
}

function memberRoom(id: string, me: string) {
  const r = db().rooms.find((x) => x.id === id)
  if (!r || (r.a !== me && r.b !== me)) return fail(404, 'not_found', '대화방을 찾을 수 없어요.')
  return r
}

function sendable(id: string, me: string) {
  const r = memberRoom(id, me)
  if (relatedBlocks(me).has(other(r, me)))
    fail(403, 'blocked', '차단한(된) 분께는 메시지를 보낼 수 없어요.')
  return r
}

function addMessage(r: DRoom, m: Omit<DMessage, 'id' | 'room' | 'created_at'>) {
  const s = db()
  const msg: DMessage = { ...m, id: ++s.seq, room: r.id, created_at: new Date().toISOString() }
  s.messages.push(msg)
  r.last_at = msg.created_at
  r.read[m.sender] = msg.id
  save()
  return msg
}

/** 데모: 이웃이 몇 초 뒤 답장 (대화방 폴링 3초로 자연스럽게 도착) */
function scheduleReply(r: DRoom, me: string) {
  const who = other(r, me)
  setTimeout(() => {
    if (relatedBlocks(me).has(who)) return
    addMessage(r, {
      sender: who, kind: 'text', body: REPLIES[Math.floor(Math.random() * REPLIES.length)],
      duration_sec: null, risk_level: 0, risk_labels: [],
    })
  }, 2500)
}

export const chatRoutes: Route[] = [
  ['POST', '/chats/with/:userId', (req) => {
    const me = requireUser(req)
    const to = req.params.userId
    if (relatedBlocks(me.id).has(to)) return fail(403, 'blocked', '차단한(된) 분과는 대화할 수 없어요.')
    if (!areFriends(me.id, to)) return fail(403, 'not_friends', '친구가 된 분과만 대화할 수 있어요.')
    const s = db()
    let r = s.rooms.find((x) => (x.a === me.id && x.b === to) || (x.a === to && x.b === me.id))
    if (!r) {
      r = { id: newId(), a: me.id, b: to, read: {}, last_at: null }
      s.rooms.push(r)
      save()
    }
    return json(roomOut(r, me.id))
  }],

  ['GET', '/chats', (req) => {
    const me = requireUser(req)
    const rooms = db()
      .rooms.filter((r) => r.a === me.id || r.b === me.id)
      .sort((x, y) => (y.last_at ?? '').localeCompare(x.last_at ?? ''))
    return json(rooms.map((r) => roomOut(r, me.id)))
  }],

  ['GET', '/chats/voice/:messageId', (req) => {
    const me = requireUser(req)
    const m = db().messages.find((x) => x.id === Number(req.params.messageId))
    if (!m) return fail(404, 'not_found', '음성을 찾을 수 없어요.')
    memberRoom(m.room, me.id)
    const blob = voiceBlobs.get(m.id)
    if (!blob) return fail(404, 'not_found', '음성을 찾을 수 없어요.') // 새로고침 후엔 사라짐
    return new Response(blob, { status: 200, headers: { 'Content-Type': blob.type } })
  }],

  ['GET', '/chats/:roomId', (req) => {
    const me = requireUser(req)
    return json(roomOut(memberRoom(req.params.roomId, me.id), me.id))
  }],

  ['GET', '/chats/:roomId/messages', (req) => {
    const me = requireUser(req)
    const r = memberRoom(req.params.roomId, me.id)
    const after = Number(req.query.get('after') ?? 0)
    let msgs = db().messages.filter((m) => m.room === r.id)
    msgs = after ? msgs.filter((m) => m.id > after) : msgs.slice(-100)
    if (msgs.length) {
      r.read[me.id] = Math.max(r.read[me.id] ?? 0, msgs.at(-1)!.id)
      save()
    }
    return json(msgs.map((m) => messageOut(m, me.id)))
  }],

  ['POST', '/chats/:roomId/messages', (req) => {
    const me = requireUser(req)
    const r = sendable(req.params.roomId, me.id)
    const body = String((req.body as { text?: string }).text ?? '').trim()
    if (!body) return fail(422, 'invalid_message', '보낼 내용을 적어 주세요.')
    if (body.length > TEXT_MAX) return fail(422, 'invalid_message', `한 번에 ${TEXT_MAX}자까지 보낼 수 있어요.`)
    const risk = assessText(body)
    const msg = addMessage(r, {
      sender: me.id, kind: 'text', body, duration_sec: null, risk_level: risk.level, risk_labels: risk.labels,
    })
    scheduleReply(r, me.id)
    return json(messageOut(msg, me.id), 201)
  }],

  ['POST', '/chats/:roomId/voice', (req) => {
    const me = requireUser(req)
    const r = sendable(req.params.roomId, me.id)
    const form = req.body as FormData
    const audio = form.get('audio')
    if (!(audio instanceof Blob) || audio.size === 0)
      return fail(422, 'invalid_message', '녹음된 소리가 없어요. 다시 녹음해 주세요.')
    const msg = addMessage(r, {
      sender: me.id, kind: 'voice', body: '', risk_level: 0, risk_labels: [],
      duration_sec: Math.max(1, Number(form.get('duration_sec') ?? 1)),
    })
    voiceBlobs.set(msg.id, audio)
    scheduleReply(r, me.id)
    return json(messageOut(msg, me.id), 201)
  }],
]
