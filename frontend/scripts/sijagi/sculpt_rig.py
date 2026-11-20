# "시작이" 3D 모델 만들기 — 도형을 조합해 원화의 모양을 만들고, 부위별 노드로 나눠 움직일 수 있게 내보낸다.
# 앱에 넣는 법과 배경: docs/tasks/C14-sijagi-guide.md §8 (numpy · opencv-python · scipy 필요)
#   노드: body(얼굴 텍스처) · sprout(줄기·잎, 밑동이 축) · armL / armR(어깨가 축) · feet · bag
#   표정은 몸 텍스처를 바꿔 끼운다: face-<mood>.png (smile · happy · think · worry · blink)
# usage: python3 sculpt_rig.py outdir
import sys, os, json, struct, numpy as np, cv2
outdir = sys.argv[1]
def spow(v, e): return np.sign(v) * np.abs(v) ** e
CREAM = np.array([253, 248, 233.0]); LEAF = np.array([128, 196, 64.0]); LEAF_D = np.array([98, 164, 52.0])
LIME = np.array([206, 224, 150.0]); YELLOW = np.array([246, 206, 108.0]); DARK = (70, 52, 26)
RX, RY, RZ = 0.300, 0.290, 0.285
FOOT_H = 0.035
CY = FOOT_H + RY * 0.93
def body_point(th, ph):
    sp, cp = np.sin(ph), np.cos(ph)
    k = np.where(sp >= 0, np.abs(cp) ** 0.95, np.abs(cp) ** 0.80)
    y = np.where(sp >= 0, RY * sp, RY * 0.93 * sp)
    return np.stack([RX * k * np.sin(th), CY + y, RZ * k * np.cos(th)], -1), sp
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'helpers.py')).read())

# ---- face → equirect body texture, one per mood
C = 1000
yy, xx = np.mgrid[0:C, 0:C]
def cxy(nx, ny): return 500 + nx * 500, 500 - ny * 500
def ell(cx, cy, ax, ay):
    img = np.zeros((C, C), np.uint8)
    cv2.ellipse(img, (int(cx), int(cy)), (int(ax), int(ay)), 0, 0, 360, 255, -1, cv2.LINE_AA)
    return img / 255.0
def arc(cx, cy, ax, ay, a0, a1, th):
    img = np.zeros((C, C), np.uint8)
    cv2.ellipse(img, (int(cx), int(cy)), (int(ax), int(ay)), 0, a0, a1, 255, th, cv2.LINE_AA)
    for a in (a0, a1):
        cv2.circle(img, (int(cx + ax * np.cos(np.radians(a))), int(cy + ay * np.sin(np.radians(a)))), th // 2, 255, -1, cv2.LINE_AA)
    return img / 255.0
def stroke(p, q, th):
    img = np.zeros((C, C), np.uint8)
    cv2.line(img, (int(p[0]), int(p[1])), (int(q[0]), int(q[1])), 255, th, cv2.LINE_AA)
    for r in (p, q): cv2.circle(img, (int(r[0]), int(r[1])), th // 2, 255, -1, cv2.LINE_AA)
    return img / 255.0
TW, TH = 1024, 512
u = (np.arange(TW) + 0.5) / TW; v = (np.arange(TH) + 0.5) / TH
TH_, PH_ = np.meshgrid(u * 2 * np.pi - np.pi, np.pi / 2 - v * np.pi)
_Pt, _ = body_point(TH_, PH_)
_mapx = (500 + _Pt[..., 0] / RX * 500).astype(np.float32); _mapy = (500 - (_Pt[..., 1] - CY) / RY * 500).astype(np.float32)
_front = np.clip(np.cos(PH_) * np.cos(TH_) * 5, 0, 1)
def face_texture(mood):
    canvas = np.zeros((C, C, 4), np.float32); canvas[..., :3] = CREAM
    def put(mask, rgb, a=1.0):
        m = (mask.astype(np.float32) * a)[..., None]
        canvas[..., :3] = canvas[..., :3] * (1 - m) + np.array(rgb, np.float32) * m
        canvas[..., 3:] = np.maximum(canvas[..., 3:], m)
    for s in (-1, 1):
        cx, cy = cxy(s * 0.56, 0.20)
        d = ((xx - cx) / 100.0) ** 2 + ((yy - cy) / 74.0) ** 2
        put(np.clip(1.25 - d, 0, 1) ** 0.8, (255, 184, 170), 0.95)
    look = (14, -12) if mood == 'think' else (0, 0)
    for s in (-1, 1):
        cx, cy = cxy(s * 0.30, 0.40)
        if mood == 'happy': put(arc(cx, cy + 16, 42, 40, 200, 340, 17), DARK)
        elif mood == 'blink': put(arc(cx, cy - 4, 36, 16, 25, 155, 15), DARK)
        else:
            put(ell(cx + look[0], cy + look[1], 37, 54), DARK)
            put(ell(cx + look[0] - 11, cy + look[1] - 21, 12, 14), (255, 255, 255))
        if mood == 'worry': put(stroke((cx + s * 50, cy - 74), (cx - s * 34, cy - 98), 13), DARK)
    mx, my = cxy(0.0, 0.25)
    if mood in ('smile', 'happy', 'blink'):
        k = 1.30 if mood == 'happy' else 1.18
        rim = ell(mx, my + 10, 70 * k, 66 * k); inner = ell(mx, my + 10, 58 * k, 54 * k)
        put(rim * (yy >= my - 8), DARK)
        put(inner * (yy >= my - 2), (226, 118, 92))
        put(ell(mx, my + 42 * k, 40 * k, 26 * k) * inner, (255, 176, 160))
    elif mood == 'worry': put(arc(mx, my + 46, 36, 20, 205, 335, 14), DARK)
    else: put(arc(mx + 6, my + 14, 34, 16, 15, 165, 15), DARK)
    FA = cv2.GaussianBlur(canvas[..., 3], (0, 0), 0.8)
    rgb = cv2.remap(canvas[..., :3], _mapx, _mapy, cv2.INTER_LINEAR)
    al = cv2.remap(FA, _mapx, _mapy, cv2.INTER_LINEAR, borderValue=0) * _front
    tex = np.empty((TH, TW, 3)); tex[:] = CREAM
    tex = tex * (1 - al[..., None]) + rgb * al[..., None]
    return cv2.imencode('.png', np.clip(tex[..., ::-1], 0, 255).astype(np.uint8))[1].tobytes()
MOODS = ['smile', 'happy', 'think', 'worry', 'blink']
TEX = {m: face_texture(m) for m in MOODS}
for m in MOODS: open(os.path.join(outdir, f'face-{m}.png'), 'wb').write(TEX[m])

# ---- body
NL, NO = 56, 96
ph = np.linspace(-np.pi / 2, np.pi / 2, NL); th = np.linspace(-np.pi, np.pi, NO)
TT, PP = np.meshgrid(th, ph)
BP, _ = body_point(TT, PP); BP = BP.reshape(-1, 3)
BUV = np.stack([(TT + np.pi) / (2 * np.pi), (np.pi / 2 - PP) / np.pi], -1).reshape(-1, 2)
BF = orient(BP, grid_tris(NL, NO)); BN = normals(BP, BF)
seam = np.arange(NL) * NO; BN[seam] = BN[seam + NO - 1] = (BN[seam] + BN[seam + NO - 1]) / 2
def surf(th_deg, nyv):
    p, _ = body_point(np.array(np.radians(th_deg)), np.array(np.arcsin(np.clip(nyv, -0.999, 0.999))))
    n = np.array([p[0] / RX ** 2, (p[1] - CY) / RY ** 2, p[2] / RZ ** 2]); return p, n / np.linalg.norm(n)

# ---- sprout (pivot: where the stem meets the head)
top = np.array([0.0, CY + RY - 0.012, 0.0])
stem_top = top + np.array([0.0, 0.10, 0.0])
sprout_green = [tube([top - np.array([0, 0.03, 0]), top + np.array([0.004, 0.05, 0]), stem_top], [0.034, 0.027, 0.024], nseg=14, samples=12)]
sprout_vein = []
TILT = rot((1, 0, 0), np.radians(-10))
def leaf_local(x, yn, zn, length, width, thick):
    prof = (0.46 + 0.70 * x) * (1 - 0.30 * x ** 5)
    y = yn * width * prof
    z = zn * thick * (1 - 0.25 * x) + 0.30 * width * (y / width) ** 2 + 0.07 * length * x ** 2
    return np.stack([x * length, y, z], -1)
def place_leaf(Pl, ang, side):
    P = Pl @ rot((0, 0, 1), np.radians(ang)).T
    P[:, 0] *= side
    return P @ TILT.T + stem_top + np.array([side * 0.002, -0.006, 0])
for side, ang, ln, wd in ((-1, 26, 0.27, 0.150), (1, 42, 0.33, 0.172)):
    n1, n2 = 22, 34
    lph = np.linspace(-np.pi / 2, np.pi / 2, n1); lth = np.linspace(-np.pi, np.pi, n2)
    LT, LP = np.meshgrid(lth, lph)
    d = np.stack([np.cos(LP) * np.cos(LT), np.cos(LP) * np.sin(LT), np.sin(LP)], -1).reshape(-1, 3)
    lp = place_leaf(leaf_local((d[:, 0] + 1) / 2, d[:, 1], d[:, 2], ln, wd, 0.034), ang, side)
    sprout_green.append((lp, orient(lp, grid_tris(n1, n2))))
    xs = np.array([0.20, 0.34, 0.48, 0.62])
    vp = place_leaf(leaf_local(xs, 0.10 * np.sin((xs - 0.2) / 0.42 * np.pi), xs * 0 + 1.0, ln, wd, 0.034), ang, side)
    sprout_vein.append(tube(list(vp), [0.0030, 0.0056, 0.0056, 0.0030], nseg=8, samples=14))

# ---- arms: a mitten hanging from the shoulder (the node's origin), feet
arms = {}
for name, side in (('armL', -1), ('armR', 1)):
    p, n = surf(side * 84, 0.02)
    arms[name] = (p + n * 0.006, ellipsoid(np.array([0, -0.066, 0.0]), np.array([0.056, 0.090, 0.054]), nlat=16, nlon=22))
feet = [ellipsoid(np.array([s * 0.115, FOOT_H + 0.008, 0.06]), np.array([0.085, 0.048, 0.095]), nlat=14, nlon=20) for s in (-1, 1)]

# ---- bag
def rbox(c, size, R, e=0.38, nl=18, no=24):
    bph = np.linspace(-np.pi / 2, np.pi / 2, nl); bth = np.linspace(-np.pi, np.pi, no)
    T2, P2 = np.meshgrid(bth, bph)
    d = np.stack([spow(np.cos(P2), e) * spow(np.sin(T2), e), spow(np.sin(P2), e), spow(np.cos(P2), e) * spow(np.cos(T2), e)], -1).reshape(-1, 3)
    Pp = (d * size) @ R.T + c
    return Pp, orient(Pp, grid_tris(nl, no))
bp, bn = surf(-30, -0.42)
bag_c = bp + bn * 0.045
bagR = rot((0, 1, 0), np.radians(-30)) @ rot((0, 0, 1), np.radians(-8))
yellows = [rbox(bag_c, np.array([0.105, 0.075, 0.035]), bagR)]
strap_pts = []
for t in np.linspace(0, 1, 13):
    p, n = surf(-30 + t * 122, -0.34 + t * 0.54 - 0.06 * np.sin(t * np.pi)); strap_pts.append(p + n * 0.012)
for t in np.linspace(0, 1, 17)[1:]:
    p, n = surf(92 + t * 238, 0.20 - t * 0.54 + 0.10 * np.sin(t * np.pi)); strap_pts.append(p + n * 0.012)
yellows.append(tube(strap_pts, [0.013] * len(strap_pts), nseg=8, samples=110))
fz = bagR @ np.array([0, 0, 1.0]); fx = bagR @ np.array([1.0, 0, 0]); fy = bagR @ np.array([0, 1.0, 0])
bc = bag_c + fz * 0.036
badge = [tube([bc - fy * 0.028, bc + fy * 0.010], [0.006, 0.005], nseg=8, samples=6)]
for s in (-1, 1):
    badge.append(ellipsoid(bc + fy * 0.016 + fx * s * 0.016, np.array([0.016, 0.010, 0.004]), bagR @ rot((0, 0, 1), np.radians(s * 25)), nlat=10, nlon=14))

# ---- GLB with one node per part
blobs, views, accs = [], [], []; off = [0]
def view(b, target=None):
    b = b.tobytes() if hasattr(b, 'tobytes') else b; pad = (4 - len(b) % 4) % 4
    blobs.append(b + b'\0' * pad); vv = {'buffer': 0, 'byteOffset': off[0], 'byteLength': len(b)}
    if target: vv['target'] = target
    views.append(vv); off[0] += len(b) + pad; return len(views) - 1
def acc(arr, typ, comp, target, mm=False):
    a = {'bufferView': view(arr, target), 'componentType': comp, 'count': len(arr), 'type': typ}
    if mm: a['min'] = arr.min(0).tolist(); a['max'] = arr.max(0).tolist()
    accs.append(a); return len(accs) - 1
def lin(c):
    c = np.array(c) / 255.0; return (np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)).tolist() + [1.0]
def mat(name, col, rough=0.75): return {'name': name, 'pbrMetallicRoughness': {'baseColorFactor': lin(col), 'metallicFactor': 0, 'roughnessFactor': rough}}
mats = [{'name': 'body', 'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicFactor': 0, 'roughnessFactor': 0.8}},
        mat('leaf', LEAF, 0.6), mat('lime', LIME), mat('yellow', YELLOW, 0.6), mat('vein', LEAF_D, 0.6)]
def prim(P, F, m, pivot, N=None, UV=None):
    N = (normals(P.astype(float), F) if N is None else N).astype(np.float32)
    P = (P - pivot).astype(np.float32)
    at = {'POSITION': acc(P, 'VEC3', 5126, 34962, True), 'NORMAL': acc(N, 'VEC3', 5126, 34962)}
    if UV is not None: at['TEXCOORD_0'] = acc(UV.astype(np.float32), 'VEC2', 5126, 34962)
    return {'attributes': at, 'indices': acc(F.astype(np.uint32 if len(P) > 65535 else np.uint16).ravel(), 'SCALAR', 5125 if len(P) > 65535 else 5123, 34963), 'material': m}
Z = np.zeros(3)
parts = [
    ('body', Z, [prim(BP, BF, 0, Z, N=BN, UV=BUV)]),
    ('sprout', top, [prim(*merge(sprout_green), 1, top), prim(*merge(sprout_vein), 4, top)]),
    ('armL', arms['armL'][0], [prim(*arms['armL'][1], 2, Z)]),
    ('armR', arms['armR'][0], [prim(*arms['armR'][1], 2, Z)]),
    ('feet', Z, [prim(*merge(feet), 2, Z)]),
    ('bag', Z, [prim(*merge(yellows), 3, Z), prim(*merge(badge), 1, Z)]),
]
meshes = [{'name': n, 'primitives': pr} for n, _, pr in parts]
nodes = [{'name': 'sijagi', 'children': list(range(1, len(parts) + 1))}] + [{'name': n, 'mesh': i, 'translation': [float(x) for x in pv]} for i, (n, pv, _) in enumerate(parts)]
j = {'asset': {'version': '2.0', 'generator': 'sijagi sculpt_rig'}, 'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': nodes,
     'meshes': meshes, 'materials': mats, 'textures': [{'source': 0, 'sampler': 0}],
     'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 33071}], 'images': [{'bufferView': view(TEX['smile']), 'mimeType': 'image/png'}],
     'accessors': accs, 'bufferViews': views, 'buffers': [{'byteLength': off[0]}]}
binb = b''.join(blobs); js = json.dumps(j, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
out = os.path.join(outdir, 'sijagi-rig.glb')
open(out, 'wb').write(struct.pack('<III', 0x46546C67, 2, 28 + len(js) + len(binb)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(binb), 0x004E4942) + binb)
print('ok', out, 'tris', sum(a['count'] for a in accs if a['type'] == 'SCALAR') // 3, 'bytes', os.path.getsize(out))
