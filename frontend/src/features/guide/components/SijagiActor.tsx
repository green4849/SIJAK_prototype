import { useEffect, useRef, useState, type CSSProperties, type Ref } from 'react'
import faceBlink from '../assets/face-blink.png'
import faceHappy from '../assets/face-happy.png'
import faceSmile from '../assets/face-smile.png'
import faceThink from '../assets/face-think.png'
import faceWorry from '../assets/face-worry.png'
import model from '../assets/sijagi.glb?url'
import stillCheer from '../assets/still-cheer-happy.webp'
import stillPointL from '../assets/still-pointL-happy.webp'
import stillPointR from '../assets/still-pointR-happy.webp'
import stillHappy from '../assets/still-rest-happy.webp'
import stillSmile from '../assets/still-rest-smile.webp'
import stillThink from '../assets/still-rest-think.webp'
import stillWorry from '../assets/still-rest-worry.webp'
import stillWave from '../assets/still-wave-smile.webp'
import type { Face, Pose, Sijagi3d } from '../lib/sijagi3d'
import styles from './Guide.module.css'

/** 캔버스 한 변(px) — 크기는 scale 로 조절한다 */
export const ACTOR_SIZE = 160
/** 캔버스 높이에서 발이 놓이는 자리 (sijagi3d 의 카메라와 맞춘 값) */
export const ACTOR_FOOT = 0.865
/** scale 1 일 때 시작이의 키·너비(px) — 겹침 계산에 쓴다 */
export const ACTOR_TALL = 120
export const ACTOR_WIDE = 100

/** 3D를 그리기 전·그릴 수 없을 때 보여 주는 같은 구도의 정지 그림 */
function stillFor(pose: Pose, face: Face) {
  if (pose === 'wave') return stillWave
  if (pose === 'cheer') return stillCheer
  if (pose === 'pointL') return stillPointL
  if (pose === 'pointR') return stillPointR
  return face === 'happy' ? stillHappy : face === 'think' ? stillThink : face === 'worry' ? stillWorry : stillSmile
}

/** 화면이 뜬 뒤 이만큼 기다렸다가 3D를 준비한다 — 첫 화면의 내용이 먼저 그려지게 */
const WARM_UP_MS = 1500
/** 그래픽 칩 없이 CPU로 흉내 내는 그리기 — 3D를 준비하는 동안 화면이 몇 초씩 멈춘다 */
const SOFTWARE_GL = /swiftshader|llvmpipe|softpipe|software|basic render/i

/**
 * 이 기기가 3D를 무리 없이 그릴 수 있는지 — three.js 를 받기 전에 먼저 가볍게 물어본다 (못 그리면 받지도 않는다).
 * 그래픽 칩이 없는 기기는 그릴 수는 있어도 앱이 멈칫하므로 정지 그림으로 둔다.
 */
function canDraw3d() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
    if (!gl) return false
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const chip = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ''
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return !SOFTWARE_GL.test(chip)
  } catch {
    return false
  }
}

interface Props {
  /** 발이 놓일 화면 좌표(px) */
  x: number
  y: number
  scale: number
  pose: Pose
  face: Face
  yaw: number
  /** 값이 바뀔 때마다 통통 한 번 뛴다 */
  hop: number
  /** 계속 움직일지 — 구석에서 쉴 때는 false (몇 초 뒤 멈춘다) */
  lively: boolean
  /** 비켜 주는 중 (자판이 올라옴, 숨기기 설정) — 지우지 않고 감추기만 한다 */
  hidden?: boolean
  /** 스크롤을 따라다니는 중 — 위치를 미끄러지지 않고 바로 옮긴다 */
  tracking?: boolean
  /** 있으면 시작이 자체가 누르는 버튼이 된다 (구석에 서 있을 때) */
  button?: { label: string; onClick: () => void }
  buttonRef?: Ref<HTMLButtonElement>
}

/**
 * 화면 위의 시작이. 구석에 서 있다가, 부르면 말풍선 위로, 짚어 줄 때는 그 버튼 옆으로 옮겨 간다.
 * 그림은 실시간 3D — 앱이 뜬 뒤 한가할 때 받아 오고, 그 전이나 3D를 못 쓰는 기기·'움직임 줄이기'에서는
 * 같은 구도의 정지 그림을 보여 준다. 장식이라 화면 낭독기에는 읽히지 않는다 (뜻은 말풍선의 글자가 전한다).
 */
export function SijagiActor({ x, y, scale, pose, face, yaw, hop, lively, hidden, tracking, button, buttonRef }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const three = useRef<Sijagi3d | null>(null)
  const [live, setLive] = useState(false)
  const latest = useRef({ pose, face, yaw, lively })
  useEffect(() => {
    latest.current = { pose, face, yaw, lively }
  })

  useEffect(() => {
    const el = canvas.current
    if (!el || !canDraw3d()) return
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    let cancelled = false
    let handle = 0
    // 앱 화면이 먼저 — 첫 화면이 그려지고 한가해진 뒤에 3D를 받아 온다
    const idle = window.requestIdleCallback ?? ((run: () => void) => window.setTimeout(run, 600))
    const load = () => {
      import('../lib/sijagi3d')
        .then(({ createSijagi3d }) =>
          createSijagi3d(el, {
            model,
            faces: { smile: faceSmile, happy: faceHappy, think: faceThink, worry: faceWorry, blink: faceBlink },
            size: ACTOR_SIZE,
            still,
          }),
        )
        .then((made) => {
          if (cancelled) return made.dispose()
          const s = latest.current
          made.set({ pose: s.pose, face: s.face, yaw: s.yaw })
          made.lively(s.lively)
          three.current = made
          setLive(true)
        })
        .catch(() => {
          // 받지 못했거나 그리지 못하면 정지 그림 그대로 둔다
        })
    }
    const timer = window.setTimeout(() => {
      handle = idle(load)
    }, WARM_UP_MS)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      if (handle) (window.cancelIdleCallback ?? window.clearTimeout)(handle)
      three.current?.dispose()
      three.current = null
    }
  }, [])

  useEffect(() => three.current?.set({ pose, face, yaw }), [pose, face, yaw])
  useEffect(() => three.current?.lively(lively), [lively])
  useEffect(() => {
    if (hop) three.current?.hop()
  }, [hop])

  const style: CSSProperties = {
    transform: `translate(${Math.round(x - ACTOR_SIZE / 2)}px, ${Math.round(y - ACTOR_SIZE * ACTOR_FOOT)}px) scale(${scale})`,
  }
  return (
    <div className={styles.actor} style={style} data-guide-ui data-hidden={hidden} data-tracking={tracking} data-pose={pose} data-face={face} data-live={live}>
      <span className={styles.actorShade} />
      <img className={styles.actorStill} src={stillFor(pose, face)} alt="" hidden={live} />
      <canvas ref={canvas} className={styles.actorCanvas} hidden={!live} aria-hidden="true" />
      {button && (
        <button ref={buttonRef} type="button" className={styles.actorButton} aria-label={button.label} aria-haspopup="dialog" onClick={button.onClick} />
      )}
    </div>
  )
}
