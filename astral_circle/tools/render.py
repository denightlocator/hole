"""Draws moments of the Astral Circle from a dump of tools/check.mjs.
Usage: python tools/render.py frames.json preview/moments.png
The picture is a rough stand-in: glowing boxes on a dark sky, no particles."""
import json, math, sys
from PIL import Image, ImageDraw

data = json.load(open(sys.argv[1]))
frames, B, F, E, MID = data['frames'], data['B'], data['F'], data['E'], data['mid']
W, H = 640, 560

def corners(m):
    w, h, d = m['width'] / 2, m['height'] / 2, m['depth'] / 2
    yaw = m['r'][1]
    c, s = math.cos(yaw), math.sin(yaw)
    out = []
    for x in (-w, w):
        for y in (-h, h):
            for z in (-d, d):
                out.append((m['p'][0] + x * c + z * s, m['p'][1] + y, m['p'][2] + z * c - x * s))
    return out

FACES = [(0, 1, 3, 2), (4, 5, 7, 6), (0, 1, 5, 4), (2, 3, 7, 6), (0, 2, 6, 4), (1, 3, 7, 5)]

def draw(tick, eye, look, title):
    img = Image.new('RGB', (W, H), (8, 12, 22))
    d = ImageDraw.Draw(img)
    f = [look[i] - eye[i] for i in range(3)]
    n = math.sqrt(sum(v * v for v in f)); f = [v / n for v in f]
    right = [f[2], 0, -f[0]]; n = math.hypot(right[0], right[2]); right = [v / n for v in right]
    up = [right[1] * f[2] - right[2] * f[1], right[2] * f[0] - right[0] * f[2], right[0] * f[1] - right[1] * f[0]]
    if up[1] < 0: up = [-v for v in up]
    def proj(p):
        v = [p[i] - eye[i] for i in range(3)]
        z = sum(v[i] * f[i] for i in range(3))
        if z < 0.5: return None
        return (W / 2 + sum(v[i] * right[i] for i in range(3)) / z * 520, H / 2 - sum(v[i] * up[i] for i in range(3)) / z * 520, z)
    for g in range(-30, 31, 5):
        for a, b in (((MID[0] + g, MID[1], MID[2] - 30), (MID[0] + g, MID[1], MID[2] + 30)), ((MID[0] - 30, MID[1], MID[2] + g), (MID[0] + 30, MID[1], MID[2] + g))):
            pa, pb = proj(a), proj(b)
            if pa and pb: d.line([pa[:2], pb[:2]], fill=(26, 34, 52))
    polys = []
    for m in frames[min(tick, len(frames) - 1)]['meshes']:
        pts = [proj(p) for p in corners(m)]
        if any(p is None for p in pts): continue
        col = tuple(int(v) for v in m['emissiveColor'])
        for k, face in enumerate(FACES):
            shade = (1, 1, 0.9, 0.9, 0.8, 0.8)[k]
            polys.append((sum(pts[i][2] for i in face) / 4, [pts[i][:2] for i in face], tuple(int(v * shade) for v in col)))
    for _, poly, col in sorted(polys, key=lambda q: -q[0]):
        d.polygon(poly, fill=col)
        d.line(poly + [poly[0]], fill=col)
    d.text((8, 6), title, fill=(230, 235, 245))
    return img

X = data['X']
far = (MID[0] + 7, MID[1] + 9.5, MID[2] - 21)
look = (MID[0], MID[1] + 5.2, MID[2])
wide = (MID[0] + 16, MID[1] + 10, MID[2] - 46)
shots = [(B + 4, far, look, 'the circles, complete'), (F + 6, wide, (MID[0], MID[1] + 12, MID[2]), 'the beam opens'), (F + 24, wide, (MID[0], MID[1] + 12, MID[2]), 'it grows and swallows the circles'),
         (F + 33, wide, (MID[0], MID[1] + 12, MID[2]), 'at its widest, everything covered'), (X + 6, wide, (MID[0], MID[1] + 12, MID[2]), 'it explodes'), (X + 14, wide, (MID[0], MID[1] + 12, MID[2]), 'the ball shrinks away')]
sheet = Image.new('RGB', (W * 3, H * 2))
for i, (tick, eye, at, title) in enumerate(shots):
    sheet.paste(draw(tick, eye, at, '%.2f s  %s' % (tick / 20, title)), ((i % 3) * W, (i // 3) * H))
sheet.save(sys.argv[2])
print('wrote', sys.argv[2])
