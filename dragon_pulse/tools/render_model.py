"""Draws a mesh model written by tools/goodra_check.mjs from four sides.

    node tools/goodra_check.mjs --dump /tmp/goodra.json
    python3 tools/render_model.py /tmp/goodra.json preview/goodra.png

A rough picture of the boxes with simple light, not a screenshot of the game.
"""
import json, math, sys
from PIL import Image, ImageDraw

meshes = json.load(open(sys.argv[1]))
W, H = 640, 560
LIGHT = [0.35, 0.8, -0.45]
ll = math.sqrt(sum(v * v for v in LIGHT)); LIGHT = [v / ll for v in LIGHT]
FACES = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]


def corners(m):
    rx, ry, rz = m['r']
    out = []
    for a in (-1, 1):
        for b in (-1, 1):
            for c in (-1, 1):
                x, y, z = a * m['width'] / 2, b * m['height'] / 2, c * m['depth'] / 2
                x, y = x * math.cos(rz) - y * math.sin(rz), x * math.sin(rz) + y * math.cos(rz)   # roll
                y, z = y * math.cos(rx) - z * math.sin(rx), y * math.sin(rx) + z * math.cos(rx)   # pitch
                x, z = x * math.cos(ry) + z * math.sin(ry), -x * math.sin(ry) + z * math.cos(ry)  # yaw
                out.append([m['p'][0] + x, m['p'][1] + y, m['p'][2] + z])
    return out


def view(angle, height, title):
    """Looks at the model from `angle` degrees round it (0 = from its front)."""
    img = Image.new('RGB', (W, H), (96, 150, 214))
    d = ImageDraw.Draw(img)
    d.rectangle([0, H * 0.78, W, H], fill=(104, 150, 92))
    # the model faces yaw: find it from the skull so the camera can go round it
    a = math.radians(angle) + FACING
    mid = [0, 3.2, -0.6 * 0]
    eye = [mid[0] + math.sin(a) * 15, mid[1] + height, mid[2] + math.cos(a) * 15]
    f = [mid[i] - eye[i] for i in range(3)]; l = math.sqrt(sum(v * v for v in f)); f = [v / l for v in f]
    r = [f[2], 0, -f[0]]; l = math.hypot(r[0], r[2]); r = [v / l for v in r]
    u = [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]]
    quads = []
    for m in meshes:
        pts = corners(m)
        c = m['p']
        for face in FACES:
            p = [pts[i] for i in face]
            e1 = [p[1][i] - p[0][i] for i in range(3)]; e2 = [p[3][i] - p[0][i] for i in range(3)]
            nrm = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
            fc = [sum(q[i] for q in p) / 4 for i in range(3)]
            if sum(nrm[i] * (fc[i] - c[i]) for i in range(3)) < 0: nrm = [-v for v in nrm]
            if sum(nrm[i] * f[i] for i in range(3)) >= 0: continue  # faces away
            l = math.sqrt(sum(v * v for v in nrm)) or 1
            lit = max(0, sum(nrm[i] * LIGHT[i] for i in range(3)) / l)
            col = tuple(int(min(255, m['emissiveColor'][i] + m['diffuseColor'][i] * (0.3 + 0.5 * lit))) for i in range(3))
            pr = []
            for q in p:
                dd = [q[i] - eye[i] for i in range(3)]
                z = sum(dd[i] * f[i] for i in range(3)); k = 900 / z
                pr.append((W / 2 + sum(dd[i] * r[i] for i in range(3)) * k, H * 0.5 - sum(dd[i] * u[i] for i in range(3)) * k))
            quads.append((sum((fc[i] - eye[i]) * f[i] for i in range(3)), pr, col))
    for z, poly, col in sorted(quads, key=lambda q: -q[0]):
        d.polygon(poly, fill=col)
    d.text((10, 8), title, fill=(255, 255, 255))
    return img


# which way the model faces: from the middle of everything to the snout tip
far = max(meshes, key=lambda m: m['p'][0] ** 2 + m['p'][2] ** 2 if m['p'][1] > 4.5 else 0)
FACING = math.atan2(far['p'][0], far['p'][2]) if len(sys.argv) < 4 else 0.0  # a third argument: it faces +Z
sheet = Image.new('RGB', (W * 2, H * 2))
for i, (ang, hgt, title) in enumerate([(35, 3, 'front right'), (90, 1, 'right side'), (180, 3, 'back'), (-25, -1.5, 'front left, from the ground')]):
    sheet.paste(view(ang, hgt, f'{title}  ({len(meshes)} meshes)'), ((i % 2) * W, (i // 2) * H))
sheet.save(sys.argv[2])
print('wrote', sys.argv[2])
