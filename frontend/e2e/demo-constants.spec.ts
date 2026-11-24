/**
 * H37 — 시연(브라우저 안 가짜 서버)이 손으로 복사해 둔 백엔드 값이 백엔드와 같은지.
 * 기준 파일 backend-constants.json 은 backend/scripts/export_demo_constants.py 가 만들고,
 * CI(backend)가 그 파일이 최신인지 본다. 여기서는 시연 사본과 하나하나 비교한다 (브라우저 없이).
 */
import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import * as C from '../src/demo/constants'
import { match, QUESTIONS, type DSurvey } from '../src/demo/matching'
import { GENERAL, MAX_TOPICS, NEARBY_RADIUS_KM, PHRASES, RECOMMEND_RADIUS_KM, RULES } from '../src/demo/rules'

const B = JSON.parse(readFileSync(new URL('./backend-constants.json', import.meta.url), 'utf8'))

test('H37: 지역·좋아하는 것·글자 수 (auth, chat)', () => {
  expect(C.REGIONS).toEqual(B.auth.regions)
  expect(C.INTERESTS).toEqual(B.auth.interests)
  // 순서도 같아야 화면의 고르기 순서가 같다
  expect(Object.keys(C.INTERESTS)).toEqual(Object.keys(B.auth.interests))
  expect(C.MAX_INTERESTS).toBe(B.auth.max_interests)
  expect(C.INTRO_MAX_LEN).toBe(B.auth.intro_max_len)
  expect(C.TEXT_MAX).toBe(B.chat.text_max)
})

test('H37: 활동 분류·포인트', () => {
  expect(C.CATEGORIES).toEqual(B.activity.categories)
  expect([...C.REWARD_CATEGORIES].sort()).toEqual(B.activity.reward_categories)
  const { reasons, ...amounts } = B.points
  expect(C.POINTS).toEqual(amounts)
  expect(C.POINT_REASONS).toEqual(reasons)
})

test('H37: 알림 시간대·신고 이유·동네 반경', () => {
  expect(C.TIME_SLOTS).toEqual(B.notification.time_slots)
  expect(C.NOTIF_MAX_PER_DAY).toBe(B.notification.max_per_day)
  expect(C.REPORT_REASONS).toEqual(B.risk.report_reasons)
  expect(NEARBY_RADIUS_KM).toBe(B.nearby.default_radius_km)
  expect(RECOMMEND_RADIUS_KM).toBe(B.nearby.recommend_radius_km)
})

test('H37: 위험 대화 규칙 — 분류·문구·위험도·패턴 글자', () => {
  // JS 정규식은 / 를 \/ 로 적으므로, 백엔드 패턴도 RegExp 로 만들어 같은 표기로 비교
  const norm = (p: string) => new RegExp(p).source
  const demo = RULES.map(([code, label, level, patterns]) => [code, label, level, patterns.map((p) => norm(p instanceof RegExp ? p.source : p))])
  const back = B.risk.rules.map(([code, label, level, patterns]: [string, string, number, string[]]) => [code, label, level, patterns.map(norm)])
  expect(demo).toEqual(back)
})

test('H37: 대화 주제 추천 문구', () => {
  expect(PHRASES).toEqual(B.topics.phrases)
  expect(GENERAL).toEqual(B.topics.general)
  expect(MAX_TOPICS).toBe(B.topics.max_topics)
})

test('H37: 성향조사 8문항 — 문구·보기·고를 수', () => {
  expect(QUESTIONS).toEqual(B.survey.questions)
})

test('H37: 성향조사 적합도 — 같은 입력 40쌍에 백엔드와 같은 점수·이름표·이유', () => {
  type Case = {
    my_interests: string[]
    their_interests: string[]
    mine: DSurvey | null
    theirs: DSurvey
    expected: { score: number; label: string | null; reasons: string[] }
  }
  const cases: Case[] = B.survey.match_cases
  expect(cases.length).toBeGreaterThan(30)
  for (const c of cases) {
    expect(match(c.my_interests, c.their_interests, c.mine ?? undefined, c.theirs), JSON.stringify(c)).toEqual(c.expected)
  }
})
