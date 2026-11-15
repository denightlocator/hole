"""Draws the hologram from a dump of tools/check.mjs, with a player-sized figure for scale.
Usage: python tools/render.py frames.json preview/hologram.png
A rough stand-in: glowing boxes on a dark background, no particles."""
import json, math, sys
from PIL import Image, ImageDraw

data = json.load(open(sys.argv[1]))
frames, PLAYER = data['frames'], data['player']
W, H = 720, 620

def corners(p, size, yaw):
    w, h, d = size[0] / 2, size[1] / 2, size[2] / 2
    c, s = math.cos(yaw), math.sin(yaw)
    return [(p[0] + x * c + z * s, p[1] + y, p[2] + z * c - x * s) for x in (-w, w) for y in (-h, h) for z in (-d, d)]

FACES = [(0, 1, 3, 2), (4, 5, 7, 6), (0, 1, 5, 4), (2, 3, 7, 6), (0, 2, 6, 4), (1, 3, 7, 5)]
BODY = [((0, 1.55, 0), (0.5, 0.5, 0.5), (205, 170, 140)), ((0, 0.95, 0), (0.5, 0.7, 0.25), (150, 70, 40)), ((-0.37, 0.95, 0), (0.22, 0.7, 0.22), (190, 155, 125)),
        ((0.37, 0.95, 0), (0.22, 0.7, 0.22), (190, 155, 125)), ((-0.13, 0.3, 0), (0.24, 0.6, 0.24), (55, 50, 80)), ((0.13, 0.3, 0), (0.24, 0.6, 0.24), (55, 50, 80))]

def draw(frame, eye, look, title, zoom=620):
    img = Image.new('RGB', (W, H), (7, 10, 18))
    d = ImageDraw.Draw(img)
    f = [look[i] - eye[i] for i in range(3)]
    n = math.sqrt(sum(v * v for v in f)); f = [v / n for v in f]
    right = [f[2], 0, -f[0]]; n = math.hypot(right[0], right[2]); right = [v / n for v in right]
    up = [right[1] * f[2] - right[2] * f[1], right[2] * f[0] - right[0] * f[2], right[0] * f[1] - right[1] * f[0]]
    if up[1] < 0: up = [-v for v in up]
    def proj(p):
        v = [p[i] - eye[i] for i in range(3)]
        z = sum(v[i] * f[i] for i in range(3))
        if z < 0.2: return None
        return (W / 2 + sum(v[i] * right[i] for i in range(3)) / z * zoom, H / 2 - sum(v[i] * up[i] for i in range(3)) / z * zoom, z)
    for g in range(-6, 7):
        for a, b in (((PLAYER[0] + g, PLAYER[1], PLAYER[2] - 6), (PLAYER[0] + g, PLAYER[1], PLAYER[2] + 8)), ((PLAYER[0] - 6, PLAYER[1], PLAYER[2] + g + 1), (PLAYER[0] + 6, PLAYER[1], PLAYER[2] + g + 1))):
            pa, pb = proj(a), proj(b)
            if pa and pb: d.line([pa[:2], pb[:2]], fill=(22, 30, 46))
    boxes = [((PLAYER[0] + c[0], PLAYER[1] + c[1], PLAYER[2] + c[2]), s, 0, col) for c, s, col in BODY]
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
    d.text((8, 6), title, fill=(225, 235, 245))
    return img

px, py, pz = PLAYER
mid = (px, py + 1.4, pz + 2)
shots = [(frames[0], (px + 2.6, py + 2.3, pz - 3.2), mid, '0.6 s  booting from the floor up', 620),
         (frames[1], (px + 2.6, py + 2.3, pz - 3.2), mid, 'complete, seen from behind the player', 620),
         (frames[1], (px, py + 1.65, pz + 0.1), (px, py + 1.6, pz + 2), 'what the player sees', 330),
         (frames[2], (px - 3.4, py + 2.6, pz + 4.6), mid, 'from the far side, half a second later', 620)]
sheet = Image.new('RGB', (W * 2, H * 2))
for i, (fr, eye, at, title, zoom) in enumerate(shots):
    sheet.paste(draw(fr, eye, at, title, zoom), ((i % 2) * W, (i // 2) * H))
sheet.save(sys.argv[2])
print('wrote', sys.argv[2])
