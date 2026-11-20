"""Render candidate custom skies for the Sky module prototype.

Each sky is a baked 1280x720 image the mod would sample as a dome/backdrop. All procedural so the
prototype is honest about what a baked sky can look like without external art.
"""
import numpy as np
from PIL import Image
from scipy import ndimage

W, H = 1280, 720
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
v = yy / H                      # 0 top, 1 bottom
u = xx / W

def fbm(seed, octaves=5, base=4.0):
    rs = np.random.default_rng(seed)
    out = np.zeros((H, W), np.float32)
    amp = 1.0
    total = 0.0
    for o in range(octaves):
        gh, gw = int(base * 2 ** o), int(base * 2 ** o * 16 / 9)
        g = rs.standard_normal((max(2, gh), max(2, gw))).astype(np.float32)
        g = ndimage.gaussian_filter(g, 1.0)
        layer = np.asarray(Image.fromarray(((g - g.min()) / np.ptp(g) * 255).astype(np.uint8))
                           .resize((W, H), Image.BICUBIC), np.float32) / 255.0
        out += layer * amp
        total += amp
        amp *= 0.5
    return out / total

def stars(img, count, seed, bright=200, ymax=0.85):
    rs = np.random.default_rng(seed)
    for _ in range(count):
        x = rs.integers(0, W)
        y = int((rs.random() ** 1.3) * H * ymax)
        m = float(rs.power(0.6)) * bright + 20
        tint = rs.random()
        col = np.array([m, m * (0.88 + 0.12 * tint), m * (0.78 + 0.22 * tint)], np.float32)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                xxp, yyp = x + dx, y + dy
                if 0 <= xxp < W and 0 <= yyp < H:
                    f = 1.0 if (dx == 0 and dy == 0) else 0.28
                    img[yyp, xxp] += col * f
    return img

def save(img, name):
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(f'art/sky-{name}.png', optimize=True)
    print(name)

# ── 1. vanilla-ish day ────────────────────────────────────────────────
img = np.zeros((H, W, 3), np.float32)
img += (np.array([80, 138, 222], np.float32) * (1 - v)[..., None]) + np.array([150, 190, 240], np.float32) * v[..., None]
clouds = fbm(3, 5, 6.0)
clouds = np.clip((clouds - 0.52) * 3.2, 0, 1) * (1 - np.clip((v - 0.55) / 0.45, 0, 1))
img += clouds[..., None] * np.array([235, 238, 245], np.float32) * 0.85
save(img, 'day')

# ── 2. aurora night ───────────────────────────────────────────────────
img = np.zeros((H, W, 3), np.float32)
img += np.array([5, 9, 22], np.float32) + np.array([0, 6, 16], np.float32) * (1 - v)[..., None]
img = stars(img, 900, 7, 190)
curtain = fbm(11, 4, 3.0)
band = np.exp(-((v - 0.38 - 0.12 * np.sin(u * 5.0)) / 0.16) ** 2)
fold = np.clip(np.sin(u * 9.0 + curtain * 7.0) * 0.5 + 0.5, 0, 1)
aur = band * (0.35 + 0.65 * fold) * (0.4 + 0.6 * curtain)
img += aur[..., None] * np.array([40, 200, 150], np.float32)
img += (aur ** 2)[..., None] * np.array([70, 120, 210], np.float32) * 1.4
save(img, 'aurora')

# ── 3. nebula dusk ────────────────────────────────────────────────────
img = np.zeros((H, W, 3), np.float32)
img += np.array([12, 8, 26], np.float32) + np.array([0, 4, 10], np.float32) * (1 - v)[..., None]
img = stars(img, 700, 21, 170)
n = fbm(5, 6, 3.5)
n2 = ndimage.gaussian_filter(fbm(9, 4, 2.0), 6)
neb = np.clip((n - 0.45) * 2.4, 0, 1) * (0.35 + 0.65 * n2)
img += neb[..., None] * np.array([120, 40, 130], np.float32)
img += (neb ** 2.4)[..., None] * np.array([190, 70, 150], np.float32)
horizon = np.exp(-((v - 0.95) / 0.28) ** 2)
img += horizon[..., None] * np.array([60, 20, 55], np.float32)
save(img, 'nebula')

# ── 4. void ───────────────────────────────────────────────────────────
img = np.zeros((H, W, 3), np.float32)
img += np.array([3, 4, 8], np.float32) + np.array([0, 1, 4], np.float32) * (1 - v)[..., None]
img = stars(img, 420, 33, 150)
wisp = np.clip((ndimage.gaussian_filter(fbm(13, 3, 2.0), 10) - 0.5) * 2.0, 0, 1)
img += wisp[..., None] * np.array([26, 20, 44], np.float32)
save(img, 'void')

# ── 5. sunset gold ────────────────────────────────────────────────────
img = np.zeros((H, W, 3), np.float32)
sky = np.array([38, 22, 58], np.float32) * (1 - v)[..., None]
sky += np.array([240, 150, 90], np.float32) * np.clip((v - 0.35) / 0.65, 0, 1)[..., None] ** 1.6
img += sky
sun = np.exp(-(((u - 0.72) ** 2) / 0.0022 + ((v - 0.86) ** 2) / 0.006))
img += sun[..., None] * np.array([255, 220, 160], np.float32) * 1.1
glow = np.exp(-(((u - 0.72) ** 2) / 0.09 + ((v - 0.88) ** 2) / 0.06))
img += glow[..., None] * np.array([255, 160, 90], np.float32) * 0.55
cloud = fbm(17, 5, 5.0)
streak = np.clip((cloud - 0.45) * 2.6, 0, 1) * np.clip((v - 0.30) / 0.6, 0, 1) * (1 - np.clip((v - 0.9) / 0.1, 0, 1))
img += streak[..., None] * np.array([255, 190, 150], np.float32) * 0.5
save(img, 'sunset')

import os
for n in ('day', 'aurora', 'nebula', 'void', 'sunset'):
    print(n, round(os.path.getsize(f'art/sky-{n}.png') / 1e6, 2), 'MB')
