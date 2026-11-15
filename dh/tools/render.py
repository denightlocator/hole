"""Draws the particle circle from a dump of tools/check.mjs.
Usage: python tools/render.py frames.json preview/circle.png
A rough stand-in: every particle is a glowing diamond; the game will look softer."""
import json, math, random, sys
from PIL import Image, ImageDraw, ImageFilter

data = json.load(open(sys.argv[1]))
frames, MID = data['frames'], data['mid']
W, H = 720, 560
random.seed(4)

def draw(parts, eye, look, title, zoom=560):
    img = Image.new('RGB', (W, H), (10, 12, 20))
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
    d = ImageDraw.Draw(img)
    for g in range(-10, 11):
        for a, b in (((MID[0] + g, MID[1], MID[2] - 10), (MID[0] + g, MID[1], MID[2] + 10)), ((MID[0] - 10, MID[1], MID[2] + g), (MID[0] + 10, MID[1], MID[2] + g))):
            pa, pb = proj(a), proj(b)
            if pa and pb: d.line([pa[:2], pb[:2]], fill=(24, 30, 44))
    dots = []
    for q in parts:
        age = q['age']
        for k in range(q['count']):
            p = [q['a'][i] + (q['b'][i] - q['a'][i]) * random.random() for i in range(3)]
            if q['power'] > 0:
                t = age * q['life']
                sp = q['power'] * 0.7
                p = [p[0] + q['dir'][0] * sp * t * random.uniform(-1, 1), p[1] + q['dir'][1] * sp * t * 0.8, p[2] + q['dir'][2] * sp * t * random.uniform(-1, 1)]
            s = proj(p)
            if not s: continue
            fade = 1 - max(0, age - 0.5) * 2 * 0.8
            dots.append((s[2], s[0], s[1], q['size'] * 0.62 / s[2] * zoom, tuple(int(v * fade) for v in q['col'])))
    glow = Image.new('RGB', (W, H), (0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for z, x, y, r, col in sorted(dots, key=lambda q: -q[0]):
        r = max(r, 1.2)
        gd.polygon([(x, y - r), (x + r, y), (x, y + r), (x - r, y)], fill=col)
    soft = glow.filter(ImageFilter.GaussianBlur(5))
    img = Image.composite(glow, img, glow.convert('L').point(lambda v: 255 if v > 8 else 0))
    from PIL import ImageChops
    img = ImageChops.add(img, soft.point(lambda v: int(v * 0.7)))
    ImageDraw.Draw(img).text((8, 6), title, fill=(225, 235, 245))
    return img

x, y, z = MID
near = (x + 2, y + 6.5, z - 11)
shots = [(frames[0], near, (x, y + 1.6, z), '0.4 s  growing out from the centre'),
         (frames[1], near, (x, y + 1.6, z), 'open and spinning'),
         (frames[2], near, (x, y + 1.6, z), 'one second later: rings and star have turned'),
         (frames[1], (x, y + 15, z - 0.01), (x, y, z), 'from straight above')]
sheet = Image.new('RGB', (W * 2, H * 2))
for i, (fr, eye, at, title) in enumerate(shots):
    sheet.paste(draw(fr, eye, at, title), ((i % 2) * W, (i // 2) * H))
sheet.save(sys.argv[2])
print('wrote', sys.argv[2])
