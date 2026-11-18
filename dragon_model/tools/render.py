"""Draws the dragon from a dump of tools/check.mjs.
Usage: python tools/render.py frames.json preview/dragon.png
A rough stand-in: every mesh is a flat-shaded box, seen from four angles."""
import json, math, sys
from PIL import Image, ImageDraw, ImageFilter, ImageChops

data = json.load(open(sys.argv[1]))
frames = data['frames']
W, H = 700, 620
FACES = [(0, 1, 3, 2), (4, 5, 7, 6), (0, 1, 5, 4), (2, 3, 7, 6), (0, 2, 6, 4), (1, 3, 7, 5)]


def corners(p, size, yaw):
    w, h, d = size[0] / 2, size[1] / 2, size[2] / 2
    c, s = math.cos(yaw), math.sin(yaw)
    return [(p[0] + x * c + z * s, p[1] + y, p[2] + z * c - x * s) for x in (-w, w) for y in (-h, h) for z in (-d, d)]


def draw(frame, eye, look, title, zoom):
    img = Image.new('RGB', (W, H), (10, 13, 22))
    f = [look[i] - eye[i] for i in range(3)]
    n = math.sqrt(sum(v * v for v in f))
    f = [v / n for v in f]
    right = [f[2], 0, -f[0]]
    n = math.hypot(right[0], right[2]) or 1
    right = [v / n for v in right]
    up = [right[1] * f[2] - right[2] * f[1], right[2] * f[0] - right[0] * f[2], right[0] * f[1] - right[1] * f[0]]
    if up[1] < 0:
        up = [-v for v in up]

    def proj(p):
        v = [p[i] - eye[i] for i in range(3)]
        z = sum(v[i] * f[i] for i in range(3))
        if z < 0.3:
            return None
        return (W / 2 + sum(v[i] * right[i] for i in range(3)) / z * zoom, H / 2 - sum(v[i] * up[i] for i in range(3)) / z * zoom, z)

    d = ImageDraw.Draw(img)
    polys = []
    for m in frame['meshes']:
        pts = [proj(q) for q in corners(m['p'], (m['width'], m['height'], m['depth']), m['r'])]
        if any(q is None for q in pts):
            continue
        for k, face in enumerate(FACES):
            shade = (1, 1, 0.9, 0.9, 0.74, 0.74)[k]
            depth = sum(pts[i][2] for i in face) / 4
            polys.append((depth, [pts[i][:2] for i in face], tuple(int(v * shade) for v in m['emissiveColor'])))
    dark = Image.new('RGB', (W, H), (10, 13, 22))
    dd = ImageDraw.Draw(dark)
    for depth, poly, col in sorted(polys, key=lambda q: -q[0]):
        edge = tuple(max(0, int(v * 0.55)) for v in col)
        dd.polygon(poly, fill=col, outline=edge)
    glow = Image.new('RGB', (W, H), (0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for m in frame['meshes']:
        if m['emissiveColor'] != [255, 206, 96]:
            continue
        s = proj(m['p'])
        if s:
            gd.ellipse([s[0] - 7, s[1] - 7, s[0] + 7, s[1] + 7], fill=(255, 210, 110))
    soft = glow.filter(ImageFilter.GaussianBlur(6))
    img = ImageChops.lighter(dark, soft)
    ImageDraw.Draw(img).text((10, 8), title, fill=(228, 236, 246))
    return img


boxes = [(m['p'][0] - m['width'] / 2, m['p'][1] - m['height'] / 2, m['p'][2] - m['depth'] / 2) for m in frames[0]['meshes']]
tops = [(m['p'][0] + m['width'] / 2, m['p'][1] + m['height'] / 2, m['p'][2] + m['depth'] / 2) for m in frames[0]['meshes']]
low = [min(b[i] for b in boxes) for i in range(3)]
high = [max(b[i] for b in tops) for i in range(3)]
mid = [(low[i] + high[i]) / 2 for i in range(3)]
span = high[1] - low[1]

views = [
    ((0.72, 0.32, 0.61), 'three-quarter, wings down'),
    ((0.0, 0.22, -1.0), 'side: head, body, tail'),
    ((-1.0, 0.18, 0.1), 'front, the way the player sees it'),
    ((0.0, 1.0, 0.08), 'from above: the wingspan'),
]
sheet = Image.new('RGB', (W * 2, H * 2))
for i, (dirn, title) in enumerate(views):
    length = math.sqrt(sum(v * v for v in dirn))
    dist = 17 * max(1.0, span / 3.0)
    eye = [mid[j] + dirn[j] / length * dist for j in range(3)]
    sheet.paste(draw(frames[0], eye, mid, title, 900), ((i % 2) * W, (i // 2) * H))
sheet.save(sys.argv[2])
print('wrote', sys.argv[2])
