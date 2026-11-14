"""Draws moments of Dragon Claw from a dump of tools/check.mjs.

The player is drawn the way the animation editor draws it (same pivots, same
order of turns), so the picture shows what the editor would show, not the game.

Usage: python tools/render.py frames.json preview/moments.png
"""
import json, math, sys
from PIL import Image, ImageDraw

data = json.load(open(sys.argv[1]))
frames, pose = data['frames'], data['pose']
W, H = 520, 400
PLAYER = (0.5, 10.0, 0.5)

# the editor's model, in its pixels (16 to a block): box corners and pivot
PARTS = {
    'LegRightMesh': ((-4, 0, -2), (0, 12, 2), (-2, 12, 0), (70, 60, 90)),
    'LegLeftMesh': ((0, 0, -2), (4, 12, 2), (2, 12, 0), (70, 60, 90)),
    'ArmRightMesh': ((-8, 12, -2), (-4, 24, 2), (-4, 24, 0), (225, 190, 160)),
    'ArmLeftMesh': ((4, 12, -2), (8, 24, 2), (4, 24, 0), (225, 190, 160)),
    'TorsoNode': ((-4, 12, -2), (4, 24, 2), (0, 12, 0), (200, 90, 40)),
    'HeadMesh': ((-4, 24, -4), (4, 32, 4), (0, 24, 0), (235, 200, 170)),
}
FACES = [(0, 1, 3, 2), (4, 5, 7, 6), (0, 1, 5, 4), (2, 3, 7, 6), (0, 2, 6, 4), (1, 3, 7, 5)]

def rotx(p, a): c, s = math.cos(a), math.sin(a); return (p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c)
def roty(p, a): c, s = math.cos(a), math.sin(a); return (p[0] * c + p[2] * s, p[1], p[2] * c - p[0] * s)
def rotz(p, a): c, s = math.cos(a), math.sin(a); return (p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2])

def turn(p, rot, pivot):
    # the editor: z, then y (negated), then x (negated), round the pivot
    q = tuple(p[i] - pivot[i] for i in range(3))
    q = rotx(roty(rotz(q, math.radians(rot['z'])), -math.radians(rot['y'])), -math.radians(rot['x']))
    return tuple(q[i] + pivot[i] for i in range(3))

def lerp(a, b, t): return a + (b - a) * t

def pose_at(time):
    prev, nxt = pose[0], pose[-1]
    for i in range(len(pose) - 1):
        if pose[i]['time'] <= time <= pose[i + 1]['time']:
            prev, nxt = pose[i], pose[i + 1]
            break
    t = 0 if nxt['time'] == prev['time'] else (time - prev['time']) / (nxt['time'] - prev['time'])
    return {n: {k: {a: lerp(prev['data'][n][k][a], nxt['data'][n][k][a], t) for a in 'xyz'} for k in ('position', 'rotation')} for n in PARTS}

def player_boxes(time):
    P = pose_at(min(time, pose[-1]['time']))
    torso = P['TorsoNode']
    out = []
    for name, (lo, hi, pivot, col) in PARTS.items():
        pts = [(x, y, z) for x in (lo[0], hi[0]) for y in (lo[1], hi[1]) for z in (lo[2], hi[2])]
        pts = [turn(p, P[name]['rotation'], pivot) for p in pts]
        pts = [tuple(p[i] + P[name]['position']['xyz'[i]] * 15.5 for i in range(3)) for p in pts]
        if name in ('HeadMesh', 'ArmLeftMesh', 'ArmRightMesh'):
            pts = [turn(p, torso['rotation'], (0, 12, 0)) for p in pts]
        # editor pixels to the world: 16 to a block, and the editor's z points the other way
        out.append(([(PLAYER[0] + p[0] / 16, PLAYER[1] + p[1] / 16, PLAYER[2] - p[2] / 16) for p in pts], col))
    return out

def mesh_box(m):
    w, h, d = m['width'] / 2, m['height'] / 2, m['depth'] / 2
    pitch, yaw = m['r'][0], m['r'][1]
    f = (math.sin(yaw) * math.cos(pitch), -math.sin(pitch), math.cos(yaw) * math.cos(pitch))
    r = (math.cos(yaw), 0, -math.sin(yaw))
    u = (f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0])
    pts = [tuple(m['p'][i] + r[i] * a * w + u[i] * b * h + f[i] * c * d for i in range(3)) for a in (-1, 1) for b in (-1, 1) for c in (-1, 1)]
    return (pts, tuple(int(v) for v in m['emissiveColor']))

def draw(tick, eye, title):
    img = Image.new('RGB', (W, H), (24, 28, 40))
    d = ImageDraw.Draw(img)
    look = (PLAYER[0], PLAYER[1] + 1.1, PLAYER[2] + (0.8 if eye[2] > PLAYER[2] else 3.5))
    fwd = tuple(look[i] - eye[i] for i in range(3))
    n = math.sqrt(sum(v * v for v in fwd)); fwd = tuple(v / n for v in fwd)
    right = (fwd[2], 0, -fwd[0]); n = math.hypot(right[0], right[2]); right = (right[0] / n, 0, right[2] / n)
    up = (right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0])
    up = tuple(-v for v in up) if up[1] < 0 else up
    def proj(p):
        v = tuple(p[i] - eye[i] for i in range(3))
        z = sum(v[i] * fwd[i] for i in range(3))
        return (W / 2 + sum(v[i] * right[i] for i in range(3)) / z * 520, H / 2 - sum(v[i] * up[i] for i in range(3)) / z * 520, z)
    for gx in range(-4, 6):
        a, b = proj((gx, PLAYER[1], -3)), proj((gx, PLAYER[1], 6)); d.line([a[:2], b[:2]], fill=(44, 50, 66))
        a, b = proj((-4, PLAYER[1], gx)), proj((5, PLAYER[1], gx)); d.line([a[:2], b[:2]], fill=(44, 50, 66))
    polys = []
    boxes = [(pts, col, False) for pts, col in player_boxes(tick / 20)] + [(*mesh_box(m), True) for m in frames[tick]['meshes']]
    for pts, col, glow in boxes:
        pp = [proj(p) for p in pts]
        for k, face in enumerate(FACES):
            shade = 1 if glow else (0.62, 0.62, 0.8, 1.0, 0.7, 0.9)[k]
            polys.append((sum(pp[i][2] for i in face) / 4, [pp[i][:2] for i in face], tuple(int(c * shade) for c in col)))
    for _, pts, col in sorted(polys, key=lambda q: -q[0]):
        d.polygon(pts, fill=col)
    d.text((8, 6), title, fill=(230, 235, 245))
    return img

T = [(10, 'half way down: the marks follow the claw'), (14, 'first claw finished'), (20, 'first claw flies on'), (37, 'the ring widens'), (46, 'second claw'), (52, 'second claw flies on')]
sheet = Image.new('RGB', (W * 3, H * 2))
for i, (tick, title) in enumerate(T):
    eye = (PLAYER[0] + 7.5, PLAYER[1] + 4.2, PLAYER[2] - 3.5) if i in (2, 3, 5) else (PLAYER[0] + 4.6, PLAYER[1] + 3.2, PLAYER[2] + 8)
    sheet.paste(draw(tick, eye, '%.2f s  %s' % (tick / 20, title)), ((i % 3) * W, (i // 3) * H))
sheet.save(sys.argv[2])
print('wrote', sys.argv[2])
