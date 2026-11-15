"""Draws the bomb from a dump of tools/check.mjs. Usage: python tools/render.py boxes.json preview/bomb.png
A rough stand-in: flat-shaded boxes, no game lighting."""
import json, math, sys
from PIL import Image, ImageDraw
boxes = json.load(open(sys.argv[1]))
W, H = 560, 640
FACES = [((0, 1, 3, 2), (-1, 0, 0)), ((4, 5, 7, 6), (1, 0, 0)), ((0, 1, 5, 4), (0, -1, 0)), ((2, 3, 7, 6), (0, 1, 0)), ((0, 2, 6, 4), (0, 0, -1)), ((1, 3, 7, 5), (0, 0, 1))]
def draw(eye, look, title):
    img = Image.new('RGB', (W, H), (150, 185, 225))
    f = [look[i] - eye[i] for i in range(3)]; n = math.sqrt(sum(v * v for v in f)); f = [v / n for v in f]
    right = [f[2], 0, -f[0]]; n = math.hypot(right[0], right[2]); right = [v / n for v in right]
    up = [right[1] * f[2] - right[2] * f[1], right[2] * f[0] - right[0] * f[2], right[0] * f[1] - right[1] * f[0]]
    if up[1] < 0: up = [-v for v in up]
    def proj(p):
        v = [p[i] - eye[i] for i in range(3)]; z = sum(v[i] * f[i] for i in range(3))
        return (W / 2 + sum(v[i] * right[i] for i in range(3)) / z * 900, H / 2 - sum(v[i] * up[i] for i in range(3)) / z * 900, z)
    sun = (0.5, 0.75, -0.43)
    polys = []
    for m in boxes:
        w, h, d = m['width'] / 2, m['height'] / 2, m['depth'] / 2
        c, s = math.cos(m['r'][1]), math.sin(m['r'][1])
        rot = lambda x, y, z: (x * c + z * s, y, z * c - x * s)
        pts = [tuple(m['p'][i] + rot(x, y, z)[i] for i in range(3)) for x in (-w, w) for y in (-h, h) for z in (-d, d)]
        for face, nrm in FACES:
            nr = rot(*nrm)
            mid = [sum(pts[i][k] for i in face) / 4 for k in range(3)]
            if sum(nr[k] * (eye[k] - mid[k]) for k in range(3)) <= 0: continue
            lit = 0.45 + 0.55 * max(0, sum(nr[k] * sun[k] for k in range(3)))
            pp = [proj(pts[i]) for i in face]
            polys.append((sum(q[2] for q in pp) / 4, [q[:2] for q in pp], tuple(min(255, int(v * lit * 1.25)) for v in m['diffuseColor'])))
    d = ImageDraw.Draw(img)
    for _, poly, col in sorted(polys, key=lambda q: -q[0]):
        d.polygon(poly, fill=col)
    d.text((8, 6), title, fill=(20, 30, 40))
    return img
mid = (0.5, 13.4, 0.5)
views = [((7.5, 15.5, -5.5), 'from the side'), ((5, 20.5, -3.5), 'from above (tail)'), ((5.5, 9.3, -4), 'from below (nose)')]
sheet = Image.new('RGB', (W * 3, H))
for i, (eye, title) in enumerate(views): sheet.paste(draw(eye, mid, title), (i * W, 0))
sheet.save(sys.argv[2]); print('wrote', sys.argv[2])
