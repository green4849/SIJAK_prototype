/**
 * 실시간 3D 시작이 — three.js 로 기기에서 바로 그린다.
 *
 * 모델 하나(assets/sijagi.glb)의 팔·새싹·몸을 움직이고, 표정은 몸 텍스처를 바꿔 끼운다.
 * 이 파일은 three.js 를 끌고 오므로 반드시 `import()` 로 늦게 불러온다 (SijagiActor) —
 * 앱 첫 화면의 무게에 영향을 주지 않고, 3D를 못 쓰는 기기에서는 아예 받지 않는다.
 * 모델을 다시 만드는 스크립트와 과정: docs/tasks/C14-sijagi-guide.md.
 */
import {
  DirectionalLight,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  NeutralToneMapping,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  WebGLRenderer,
  type MeshStandardMaterial,
  type Texture,
} from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

export type Pose = 'rest' | 'wave' | 'cheer' | 'pointL' | 'pointR'
export type Face = 'smile' | 'happy' | 'think' | 'worry'

export interface SijagiState {
  pose: Pose
  face: Face
  /** 몸을 돌린 각도(도) — 양수면 화면 왼쪽을 본다 */
  yaw: number
}

export interface Sijagi3d {
  set(next: Partial<SijagiState>): void
  /** 통통 한 번 뛴다 */
  hop(): void
  /** true 면 계속 움직이고(숨쉬기·깜빡임), false 면 몇 초 뒤 멈춰 배터리를 아낀다 */
  lively(on: boolean): void
  dispose(): void
}

interface Options {
  model: string
  faces: Record<Face | 'blink', string>
  /** 캔버스 한 변(CSS px) */
  size: number
  /** 움직임 줄이기 — 움직이지 않고, 상태가 바뀔 때만 한 장 그린다 */
  still: boolean
}

const rad = MathUtils.degToRad
/** 팔 벌림 각도(도) — 0 이면 아래로 늘어뜨림, 90 이면 옆으로 뻗음 */
const ARMS: Record<Pose, { L: number; R: number; wave?: true }> = {
  rest: { L: 18, R: 18 },
  wave: { L: 18, R: 138, wave: true },
  cheer: { L: 142, R: 142 },
  pointL: { L: 94, R: 18 },
  pointR: { L: 18, R: 94 },
}
/** 점토 인형 같은 반무광 재질 */
const LOOK: Record<string, object> = {
  body: { roughness: 0.62, clearcoat: 0.18, clearcoatRoughness: 0.55, sheen: 0.5, sheenRoughness: 0.6, sheenColor: 0xfff1d6 },
  leaf: { roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35 },
  vein: { roughness: 0.5 },
  lime: { roughness: 0.55, clearcoat: 0.2, clearcoatRoughness: 0.5 },
  yellow: { roughness: 0.48, clearcoat: 0.3, clearcoatRoughness: 0.4 },
}
/** 가만히 있을 때 이만큼 지나면 그리기를 멈춘다 (초) */
const DOZE = 6

export async function createSijagi3d(canvas: HTMLCanvasElement, { model, faces, size, still }: Options): Promise<Sijagi3d> {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(size, size, false)
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = NeutralToneMapping

  const scene = new Scene()
  const pmrem = new PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.55
  pmrem.dispose()
  // 따뜻한 주광(왼쪽 위 앞) + 하늘빛 보조 + 뒤쪽 테두리 빛
  const key = new DirectionalLight(0xfff0d8, 2.35)
  key.position.set(-1.6, 2.6, 2.4)
  const rim = new DirectionalLight(0xe6f7d2, 1.7)
  rim.position.set(2.2, 1.4, -2.2)
  scene.add(key, rim, new HemisphereLight(0xffffff, 0xeedcb6, 0.72))

  const loader = new TextureLoader()
  const [gltf, ...textures] = await Promise.all([
    new GLTFLoader().loadAsync(model),
    ...Object.values(faces).map((url) => loader.loadAsync(url)),
  ])
  const maps = {} as Record<Face | 'blink', Texture>
  Object.keys(faces).forEach((name, i) => {
    const t = textures[i]
    t.flipY = false
    t.colorSpace = SRGBColorSpace
    t.anisotropy = 8
    maps[name as Face | 'blink'] = t
  })

  const root = gltf.scene
  let skin: MeshPhysicalMaterial | undefined
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return
    const src = o.material as MeshStandardMaterial
    const material = new MeshPhysicalMaterial({ color: src.color, map: src.map, ...LOOK[src.name] })
    if (src.name === 'body') skin = material
    o.material = material
  })
  const armL = root.getObjectByName('armL')!
  const armR = root.getObjectByName('armR')!
  const sprout = root.getObjectByName('sprout')!

  // 몸 전체를 돌리고(고개 돌리기) 통통 튀게 하는 틀
  const turn = new Group()
  const squash = new Group()
  squash.add(root)
  turn.add(squash)
  scene.add(turn)

  // 팔을 들고 뛰어도 잘리지 않게 넉넉히 잡은 고정 화면 — 발이 캔버스 높이의 86.5% 에 온다 (SijagiActor 의 FOOT)
  const camera = new PerspectiveCamera(24, 1, 0.1, 50)
  const centre = new Vector3(0, 0.46, 0)
  const distance = 1.3 / 2 / Math.tan(rad(12))
  camera.position.set(0, centre.y + Math.sin(rad(7)) * distance, Math.cos(rad(7)) * distance)
  camera.lookAt(centre)

  const want: SijagiState = { pose: 'rest', face: 'smile', yaw: -14 }
  const now = { L: 18, R: 18, yaw: -14 }
  let t = 0
  let hopAt = -9
  let shown: Face | 'blink' | '' = ''
  let stay = false
  let awakeUntil = DOZE
  let frame = 0
  let last = 0
  let gone = false

  function draw(dt: number) {
    t += dt
    const k = still ? 1 : 1 - Math.exp(-dt * 9)
    const arms = ARMS[want.pose]
    now.L += (arms.L - now.L) * k
    now.R += (arms.R - now.R) * k
    now.yaw += (want.yaw - now.yaw) * k
    const wave = arms.wave && !still ? Math.sin(t * 9) * 16 : 0
    armL.rotation.z = -rad(now.L)
    armR.rotation.z = rad(now.R + wave)
    turn.rotation.y = rad(now.yaw)

    if (!still) {
      // 숨쉬기 · 새싹 흔들림 · 통통 뛰기
      const breath = Math.sin(t * 2.3) * 0.012
      sprout.rotation.z = Math.sin(t * 1.7) * 0.07 + (arms.wave ? Math.sin(t * 9) * 0.02 : 0)
      const h = t - hopAt
      const up = h >= 0 && h < 0.42 ? Math.sin((h / 0.42) * Math.PI) : 0
      const land = h >= 0.42 && h < 0.6 ? Math.sin(((h - 0.42) / 0.18) * Math.PI) : 0
      const wide = 1 - breath + land * 0.06 - up * 0.03
      squash.position.y = up * 0.11
      squash.scale.set(wide, 1 + breath - land * 0.07 + up * 0.04, wide)
    }

    // 표정 + 눈 깜빡임 (웃는 얼굴일 때만)
    const face = !still && want.face === 'smile' && t % 3.4 > 3.27 ? 'blink' : want.face
    if (face !== shown && skin) {
      skin.map = maps[face]
      shown = face
    }
    renderer.render(scene, camera)
  }

  function loop(ms: number) {
    frame = 0
    if (gone) return
    draw(Math.min(0.05, last ? (ms - last) / 1000 : 0.016))
    last = ms
    if ((stay || t < awakeUntil) && !document.hidden) frame = requestAnimationFrame(loop)
    else last = 0
  }

  /** 상태가 바뀌었으니 다시 그린다 — 멈춰 있었다면 깨운다 */
  function wake() {
    if (gone) return
    if (still) return draw(0)
    awakeUntil = t + DOZE
    if (!frame) frame = requestAnimationFrame(loop)
  }
  const onVisible = () => !document.hidden && wake()
  document.addEventListener('visibilitychange', onVisible)
  wake()

  return {
    set(next) {
      Object.assign(want, next)
      wake()
    },
    hop() {
      hopAt = t
      wake()
    },
    lively(on) {
      stay = on
      wake()
    },
    dispose() {
      gone = true
      cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', onVisible)
      Object.values(maps).forEach((m) => m.dispose())
      renderer.dispose()
    },
  }
}
