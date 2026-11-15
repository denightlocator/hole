"""Draws the Gear Portal from a dump of tools/check.mjs.
Usage: python tools/render.py frames.json preview/portal.png
A rough stand-in: particles are glowing dots, meshes are flat-shaded boxes."""
import json, math, random, sys
from PIL import Image, ImageDraw, ImageFilter, ImageChops

data = json.load(open(sys.argv[1]))
frames, BASE = data['frames'], data['start']
W, H = 640, 600

def corners(p, size, yaw):
    w, h, d = size[0] / 2, size[1] / 2, size[2] / 2
    c, s = math.cos(yaw), math.sin(yaw)
    return [(p[0] + x * c + z * s, p[1] + y, p[2] + z * c - x * s) for x in (-w, w) for y in (-h, h) for z in (-d, d)]

FACES = [(0, 1, 3, 2), (4, 5, 7, 6), (0, 1, 5, 4), (2, 3, 7, 6), (0, 2, 6, 4), (1, 3, 7, 5)]
BODY = [((0, 1.55, 0), (0.5, 0.5, 0.5), (205, 170, 140)), ((0, 0.95, 0), (0.5, 0.7, 0.25), (150, 70, 40)), ((-0.13, 0.3, 0), (0.24, 0.6, 0.24), (55, 50, 80)), ((0.13, 0.3, 0), (0.24, 0.6, 0.24), (55, 50, 80))]

def grad(stops, f):
    prev = stops[0]
    for st in stops:
        if st[0] >= f:
            if st[0] == prev[0]: return st[1]
            k = (f - prev[0]) / (st[0] - prev[0])
            return [prev[1][i] + (st[1][i] - prev[1][i]) * k for i in range(4)]
        prev = st
    return stops[-1][1]

def draw(frame, eye, look, title, zoom=520):
    random.seed(7)
    img = Image.new('RGB', (W, H), (9, 12, 24))
    f = [look[i] - eye[i] for i in range(3)]
    n = math.sqrt(sum(v * v for v in f)); f = [v / n for v in f]
    right = [f[2], 0, -f[0]]; n = math.hypot(right[0], right[2]); right = [v / n for v in right]
    up = [right[1] * f[2] - right[2] * f[1], right[2] * f[0] - right[0] * f[2], right[0] * f[1] - right[1] * f[0]]
    if up[1] < 0: up = [-v for v in up]
    def proj(p):
        v = [p[i] - eye[i] for i in range(3)]
        z = sum(v[i] * f[i] for i in range(3))
        if z < 0.3: return None
        return (W / 2 + sum(v[i] * right[i] for i in range(3)) / z * zoom, H / 2 - sum(v[i] * up[i] for i in range(3)) / z * zoom, z)
    d = ImageDraw.Draw(img)
    for g in range(-12, 13):
        for a, b in (((BASE[0] + g, BASE[1], BASE[2] - 12), (BASE[0] + g, BASE[1], BASE[2] + 12)), ((BASE[0] - 12, BASE[1], BASE[2] + g), (BASE[0] + 12, BASE[1], BASE[2] + g))):
            pa, pb = proj(a), proj(b)
            if pa and pb: d.line([pa[:2], pb[:2]], fill=(22, 28, 44))
    PLAYER = frame['player']
    boxes = [((PLAYER[0] + c[0], PLAYER[1] + c[1], PLAYER[2] + c[2]), s, 0, col) for c, s, col in BODY] if frame['opacity'] > 0 else []
    boxes += [(m['p'], (m['width'], m['height'], m['depth']), m['r'][1], tuple(int(v) for v in m['emissiveColor'])) for m in frame['meshes']]
    polys = []
    for p, size, yaw, col in boxes:
        pts = [proj(q) for q in corners(p, size, yaw)]
        if any(q is None for q in pts): continue
        for k, face in enumerate(FACES):
            shade = (1, 1, 0.92, 0.92, 0.84, 0.84)[k]
            polys.append((sum(pts[i][2] for i in face) / 4, [pts[i][:2] for i in face], tuple(int(v * shade) for v in col)))
    for _, poly, col in sorted(polys, key=lambda q: -q[0]):
        d.polygon(poly, fill=col)
        d.line(poly + [poly[0]], fill=col)
    glow = Image.new('RGB', (W, H), (0, 0, 0))
    gd = ImageDraw.Draw(glow)
    dots = []
    for q in frame['fx']:
        for k in range(q['count']):
            life = random.uniform(q['minLife'], q['life'])
            t = q['t']
            if t >= life: continue
            fq = t / life
            col = [q['col'][i] + (q['end'][i] - q['col'][i]) * fq for i in range(3)] + [1 - fq]
            if col[3] <= 0.02: continue
            p = [q['a'][i] + (q['b'][i] - q['a'][i]) * random.random() for i in range(3)]
            power = random.uniform(q['minPower'], q['power'])
            if power > 0:
                dirn = [q['d1'][i] + (q['d2'][i] - q['d1'][i]) * random.random() for i in range(3)]
                fr = t / life
                travel = t * (1 - 0.4 * fr)
                p = [p[i] + dirn[i] * power * travel for i in range(3)]
            s = proj(p)
            if not s: continue
            dots.append((s[2], s[0], s[1], max(1.0, q['size'] * 0.55 / s[2] * zoom), tuple(int(col[i] * col[3]) for i in range(3))))
    for z, x, y, r, col in sorted(dots, key=lambda q: -q[0]):
        gd.ellipse([x - r, y - r, x + r, y + r], fill=col)
    soft = glow.filter(ImageFilter.GaussianBlur(4))
    img = ImageChops.add(img, soft.point(lambda v: int(v * 0.8)))
    img = ImageChops.lighter(img, glow)
    ImageDraw.Draw(img).text((8, 6), title, fill=(225, 235, 245))
    return img

mid = (BASE[0] + 3, BASE[1] + 0.6, BASE[2])
eye = (BASE[0] + 3, BASE[1] + 7.5, BASE[2] - 10.5)
titles = ['0.1 s  the first portal opens under the player', '0.3 s  arms up, the player drops in and fades',
          '1.0 s  inside (hidden): arrows show where the player will come out', '2.3 s  the player has turned right; the rim is running out',
          '3.3 s  teleported 6 blocks: second portal opens, first one folds away', '3.5 s  the 360 slash sweeps round at once']
sheet = Image.new('RGB', (W * 3, H * 2))
for i, fr in enumerate(frames):
    sheet.paste(draw(fr, eye, mid, titles[i], 620), ((i % 3) * W, (i // 3) * H))
sheet.save(sys.argv[2])
print('wrote', sys.argv[2])
