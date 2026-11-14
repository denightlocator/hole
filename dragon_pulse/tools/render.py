"""Draws what tools/sim.mjs recorded, so the move can be looked at without the game.

    node tools/sim.mjs --target --dump /tmp/frames.json
    python3 tools/render.py /tmp/frames.json preview

A rough picture: boxes are drawn as shaded boxes, particles as soft dots.
"""
import json, math, random, sys, os
from PIL import Image, ImageDraw, ImageChops, ImageFilter

frames = json.load(open(sys.argv[1]))
out = sys.argv[2]
os.makedirs(out, exist_ok=True)
W, H = 640, 360
S = 0.6  # one second on the particle clock
random.seed(4)


def camera(eye, look):
    f = [look[i] - eye[i] for i in range(3)]
    l = math.sqrt(sum(v * v for v in f)); f = [v / l for v in f]
    r = [f[2], 0, -f[0]]; l = math.hypot(r[0], r[2]); r = [v / l for v in r]
    u = [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]]
    def project(p):
        d = [p[i] - eye[i] for i in range(3)]
        z = sum(d[i] * f[i] for i in range(3))
        if z < 0.3: return None
        k = 330 / z
        return (W / 2 + sum(d[i] * r[i] for i in range(3)) * k, H / 2 - sum(d[i] * u[i] for i in range(3)) * k, z, k)
    return project


FACES = [(0, 1, 3, 2), (4, 5, 7, 6), (0, 1, 5, 4), (2, 3, 7, 6), (0, 2, 6, 4), (1, 3, 7, 5)]
SHADE = [0.8, 0.9, 0.7, 1.0, 0.85, 0.95]


def corners(m):
    rx, ry = (m['r'] or [0, 0, 0])[:2]
    cx, sx, cy, sy = math.cos(rx), math.sin(rx), math.cos(ry), math.sin(ry)
    pts = []
    for a in (-1, 1):
        for b in (-1, 1):
            for c in (-1, 1):
                x, y, z = a * m['width'] / 2, b * m['height'] / 2, c * m['depth'] / 2
                y, z = y * cx - z * sx, y * sx + z * cx      # pitch about x
                x, z = x * cy + z * sy, -x * sy + z * cy     # yaw about y
                pts.append([m['p'][0] + x, m['p'][1] + y, m['p'][2] + z])
    return pts


def draw(tick, live, project):
    f = frames[tick]
    img = Image.new('RGB', (W, H), (70, 120, 200))
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=(int(40 + 90 * t), int(90 + 90 * t), int(190 + 40 * t)))
    quads = []
    for m in f['meshes']:
        if not m['p']: continue
        col = [min(255, m['emissiveColor'][i] + m['diffuseColor'][i] * 0.5) for i in range(3)]
        pr = [project(p) for p in corners(m)]
        if any(p is None for p in pr): continue
        for face, sh in zip(FACES, SHADE):
            quads.append((sum(pr[i][2] for i in face) / 4, [(pr[i][0], pr[i][1]) for i in face], tuple(int(v * sh) for v in col)))
    for z, poly, col in sorted(quads, key=lambda q: -q[0]):
        d.polygon(poly, fill=col)
    glow = Image.new('RGB', (W, H), (0, 0, 0))
    g = ImageDraw.Draw(glow)
    for p in live:
        age = (tick - p['born']) / 20
        if age < 0 or age >= p['life']: continue
        k = age / p['life']
        drag = 1 + (p['drag'] - 1) * k / 2
        pos = [p['pos'][i] + p['vel'][i] * age * drag + (0.5 * p['grav'] * age * age if i == 1 else 0) for i in range(3)]
        pr = project(pos)
        if not pr: continue
        a = p['a0'] + (p['a1'] - p['a0']) * k
        rad = max(1, p['size'] * pr[3] / 2)
        col = tuple(int(v * a) for v in p['col'])
        box = [pr[0] - rad, pr[1] - rad, pr[0] + rad, pr[1] + rad]
        if p['blend'] == 1: d.rectangle(box, fill=tuple(int(v) for v in p['col']))
        else: g.rectangle(box, fill=col)
    img = ImageChops.add(img, glow)
    img = ImageChops.add(img, glow.filter(ImageFilter.GaussianBlur(6)))
    ImageDraw.Draw(img).text((8, 6), '%.2f s  %s' % (tick / 20, ['charge', 'beams', 'dragon', 'coil', 'blast', 'smoke'][f['ph']]), fill=(255, 255, 255))
    return img


live = []
for f in frames:
    for o in f['fx']:
        for _ in range(int(o['manualEmitCount'])):
            rnd = lambda a, b: a + (b - a) * random.random()
            dirv = [rnd(o['dir1'][i], o['dir2'][i]) for i in range(3)]
            power = rnd(o['minEmitPower'], o['maxEmitPower']) * S
            c0 = o['colorGradients'][0]; k = random.random()
            live.append(dict(born=f['t'], life=rnd(o['minLifeTime'], o['maxLifeTime']) / S,
                             pos=[rnd(o['pos1'][i], o['pos2'][i]) for i in range(3)], vel=[v * power for v in dirv],
                             grav=o['gravity'][1] * S * S, size=rnd(o['minSize'], o['maxSize']), blend=o['blendMode'],
                             col=[c0['minColor'][i] + (c0['maxColor'][i] - c0['minColor'][i]) * k for i in range(3)],
                             a0=c0['minColor'][3], a1=o['colorGradients'][-1]['minColor'][3], drag=o['velocityGradients'][-1]['factor']))

def follow(tick, back):
    """A camera that stays beside whatever is on screen at this tick."""
    pts = [m['p'] for m in frames[tick]['meshes'] if m['p']] or [[0, 12, 5]]
    mid = [sum(p[i] for p in pts) / len(pts) for i in range(3)]
    return camera([mid[0] + back, mid[1] + back * 0.25, mid[2] - back * 0.45], mid)


n = len(frames)
picks = [int(n * i / 12) for i in range(12)]
wide = camera([34, 22, 14], [2, 15, 18])
strip = Image.new('RGB', (W * 4, H * 3))
for i, t in enumerate(picks):
    strip.paste(draw(t, live, wide), ((i % 4) * W, (i // 4) * H))
strip.resize((W * 2, H * 3 // 2)).save(os.path.join(out, 'timeline.png'))

# Four moments from close by: beams, dragon, bite, smoke.
phase_ticks = lambda ph: [f['t'] for f in frames if f['ph'] == ph]
shots = [(phase_ticks(1)[-3], 12), (phase_ticks(2)[-4], 13), (phase_ticks(3)[8], 12), (phase_ticks(5)[9], 13)]
sheet = Image.new('RGB', (W * 2, H * 2))
for i, (t, back) in enumerate(shots):
    sheet.paste(draw(t, live, follow(t, back)), ((i % 2) * W, (i // 2) * H))
sheet.save(os.path.join(out, 'moments.png'))
