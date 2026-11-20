# ---- mesh helpers
def grid_tris(nr, nc, wrap=False):
    t = []
    for i in range(nr - 1):
        for j in range(nc - 1):
            a, b, c, d = i * nc + j, i * nc + j + 1, (i + 1) * nc + j + 1, (i + 1) * nc + j
            t += [(a, d, c), (a, c, b)]
    return np.array(t)
def normals(P, F):
    n = np.zeros_like(P); fn = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]])
    for k in range(3): np.add.at(n, F[:, k], fn)
    return n / (np.linalg.norm(n, axis=1, keepdims=True) + 1e-12)
def ellipsoid(c, r, R=np.eye(3), nlat=24, nlon=32):
    ph = np.linspace(-np.pi / 2, np.pi / 2, nlat); th = np.linspace(-np.pi, np.pi, nlon)
    TT, PP = np.meshgrid(th, ph)
    d = np.stack([np.cos(PP) * np.sin(TT), np.sin(PP), np.cos(PP) * np.cos(TT)], -1).reshape(-1, 3)
    P = (d * r) @ R.T + c
    return P, orient(P, grid_tris(nlat, nlon))
def rot(axis, ang):
    axis = np.array(axis, float); axis /= np.linalg.norm(axis); x, y, z = axis; c, s = np.cos(ang), np.sin(ang)
    return np.array([[c + x * x * (1 - c), x * y * (1 - c) - z * s, x * z * (1 - c) + y * s],
                     [y * x * (1 - c) + z * s, c + y * y * (1 - c), y * z * (1 - c) - x * s],
                     [z * x * (1 - c) - y * s, z * y * (1 - c) + x * s, c + z * z * (1 - c)]])
def lathe(profile, c, R, flat=1.0, nseg=40):
    rr, hh = np.array(profile).T
    th = np.linspace(0, 2 * np.pi, nseg)
    P = np.stack([np.outer(rr, np.cos(th)), np.repeat(hh[:, None], nseg, 1), np.outer(rr, np.sin(th)) * flat], -1).reshape(-1, 3)
    P = P @ R.T + c
    return P, orient(P, grid_tris(len(rr), nseg))
def tube(pts, radii, nseg=20, samples=60):
    pts = np.array(pts, float); t = np.linspace(0, 1, len(pts)); ts = np.linspace(0, 1, samples)
    from scipy.interpolate import CubicSpline
    cs = CubicSpline(t, pts, bc_type='natural'); C = cs(ts); T = cs(ts, 1); T /= np.linalg.norm(T, axis=1, keepdims=True)
    rad = np.interp(ts, np.linspace(0, 1, len(radii)), radii)
    up = np.array([0, 0, 1.0]); ring = []
    nrm = np.cross(T[0], up); nrm = nrm / np.linalg.norm(nrm) if np.linalg.norm(nrm) > 1e-6 else np.array([1, 0, 0.0])
    for k in range(samples):
        nrm = nrm - T[k] * np.dot(nrm, T[k]); nrm /= np.linalg.norm(nrm); b = np.cross(T[k], nrm)
        a = np.linspace(0, 2 * np.pi, nseg)
        ring.append(C[k] + rad[k] * (np.outer(np.cos(a), nrm) + np.outer(np.sin(a), b)))
    P = np.concatenate(ring); F = grid_tris(samples, nseg)
    # outward = away from the centre line
    fn = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]]); fc = P[F].mean(1)
    ci = (F[:, 0] // nseg).clip(0, samples - 1)
    if (fn * (fc - C[ci])).sum() < 0: F = F[:, ::-1].copy()
    caps = [ellipsoid(C[0], np.full(3, rad[0]), nlat=12, nlon=16), ellipsoid(C[-1], np.full(3, rad[-1]), nlat=12, nlon=16)]
    caps = [(p, orient(p, f)) for p, f in caps]
    Ps, Fs, o = [P], [F], len(P)
    for p, f in caps: Ps.append(p); Fs.append(f + o); o += len(p)
    return np.concatenate(Ps), np.concatenate(Fs)
def orient(P, F):
    fn = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]])
    d = P[F].mean(1) - P.mean(0)
    return F[:, ::-1].copy() if (fn * d).sum() < 0 else F
def merge(parts):
    Ps, Fs, off = [], [], 0
    for P, F in parts: Ps.append(P); Fs.append(F + off); off += len(P)
    return np.concatenate(Ps), np.concatenate(Fs)
_th, _ph = np.meshgrid(np.linspace(-1.5, 1.5, 300), np.linspace(-1.5, 1.5, 300))
_P, _ = body_point(_th, _ph)
def head_point(nxv, nyv):
    d = (_P[..., 0] / RX - nxv) ** 2 + ((_P[..., 1] - CY) / RY - nyv) ** 2
    i = np.unravel_index(np.argmin(d), d.shape); return _P[i]
def on_body(nxv, nyv, front_sign=1):
    """surface point of the body at normalised x/y (front side)"""
    th = np.arcsin(np.clip(nxv / np.cos(np.arcsin(np.clip(nyv, -0.999, 0.999))), -1, 1))
    ph = np.arcsin(np.clip(nyv, -0.999, 0.999))
    p, _ = body_point(np.array(th if front_sign > 0 else np.pi - th), np.array(ph))
    return p

def flame(c, length, width, thick, ang, side, curl=0.35, n1=20, n2=28):
    """flat flame/petal piece in the front plane: base at c, tip pointing outward (side) at angle ang (deg)"""
    ph = np.linspace(-np.pi / 2, np.pi / 2, n1); th = np.linspace(-np.pi, np.pi, n2)
    TT, PP = np.meshgrid(th, ph)
    d = np.stack([np.cos(PP) * np.cos(TT), np.cos(PP) * np.sin(TT), np.sin(PP)], -1).reshape(-1, 3)
    x = (d[:, 0] + 1) / 2                                   # 0 at the base .. 1 at the tip
    P = np.stack([x * length, d[:, 1] * width * (1 - 0.7 * x ** 2.2) + curl * width * x ** 2.5, d[:, 2] * thick * (1 - 0.4 * x)], -1)
    R = rot((0, 0, 1), np.radians(ang))
    if side < 0: P[:, 0] *= -1; R = rot((0, 0, 1), np.radians(-ang))
    P = P @ R.T + c
    return P, orient(P, grid_tris(n1, n2))
