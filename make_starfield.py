"""Render the Orbit title starfield from scratch.

Procedural rather than an upscaled photo: the reference is 600x366, and stretching that to a
4K desktop looks muddy. Everything here is drawn at native resolution, so it stays crisp at
any window size and the file is only a few hundred KB because the sky is mostly black.

Layers, back to front:
  sky gradient -> Milky Way band + dust -> stars (magnitude + colour) -> hero star + flare
  -> optional fog bank + tree-line silhouette
"""
import numpy as np
from PIL import Image
from scipy import ndimage

W, H = 2560, 1440
rs = np.random.default_rng(2024)

# ── sky gradient: deep navy overhead, faint blue haze near the horizon ─────
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
v = yy / H
sky = np.zeros((H, W, 3), np.float32)
sky[..., 0] = 4 + 12 * v ** 2.6
sky[..., 1] = 7 + 18 * v ** 2.6
sky[..., 2] = 20 + 30 * v ** 2.4

# ── Milky Way: soft band, tilted, with dust lanes ──────────────────────────
ang = np.deg2rad(-18)
u = (xx - W * 0.5) * np.cos(ang) + (yy - H * 0.45) * np.sin(ang)
w = -(xx - W * 0.5) * np.sin(ang) + (yy - H * 0.45) * np.cos(ang)
band = np.exp(-(w / (H * 0.30)) ** 2)
noise = ndimage.gaussian_filter(rs.standard_normal((H, W)).astype(np.float32), 90)
noise = (noise - noise.min()) / np.ptp(noise)
dust = ndimage.gaussian_filter(rs.standard_normal((H, W)).astype(np.float32), 22)
dust = (dust - dust.min()) / np.ptp(dust)
mw = band * (0.55 + 0.45 * noise) * (0.45 + 0.55 * dust ** 1.4)
sky += mw[..., None] * np.array([17, 16, 26], np.float32)

# ── stars ─────────────────────────────────────────────────────────────────
def add_star(buf, x, y, mag, tint):
    col = np.array([1.0, 0.90 + 0.10 * tint, 0.82 + 0.18 * tint], np.float32)
    core = mag
    x0, x1 = max(0, x - 6), min(W, x + 7)
    y0, y1 = max(0, y - 6), min(H, y + 7)
    if x0 >= x1 or y0 >= y1:
        return
    gy, gx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
    d2 = (gx - x) ** 2 + (gy - y) ** 2
    glow = np.exp(-d2 / 5.5) * core * 0.85 + np.exp(-d2 / 0.55) * core * 1.6
    buf[y0:y1, x0:x1] += glow[..., None] * col

n = 2600
xs = rs.integers(0, W, n)
ys = (rs.random(n) ** 1.25 * H).astype(int)          # slightly denser lower down
mags = (rs.power(0.8, n) * 1.9 + 0.04)
tints = rs.random(n)
for x, y, m, t in zip(xs, ys, mags, tints):
    add_star(sky, x, y, m * 40, t)

# ── hero star with diffraction spikes, kept right of centre ───────────────
hx, hy = int(W * 0.635), int(H * 0.235)
gy, gx = np.mgrid[0:H, 0:W].astype(np.float32)
d = np.sqrt((gx - hx) ** 2 + (gy - hy) ** 2)
hero = np.exp(-d / 34) * 46 + np.exp(-(d / 4.6) ** 2) * 245
spike_h = np.exp(-np.abs(gy - hy) / 1.6) * np.exp(-np.abs(gx - hx) / (W * 0.075))
spike_v = np.exp(-np.abs(gx - hx) / 1.6) * np.exp(-np.abs(gy - hy) / (H * 0.13))
diag = (np.exp(-np.abs((gx - hx) - (gy - hy)) / 1.6) +
        np.exp(-np.abs((gx - hx) + (gy - hy)) / 1.6)) * np.exp(-d / (W * 0.05)) * 0.5
sky += (hero + spike_h * 115 + spike_v * 115 + diag * 60)[..., None] * np.array([0.60, 0.80, 1.0], np.float32)

haze = np.clip((v - 0.55) / 0.45, 0, 1) ** 3
sky += haze[..., None] * np.array([10, 16, 26], np.float32)
img = np.clip(sky, 0, 255)

out = Image.fromarray(img.astype(np.uint8))
out.save('art/starfield-title.png', optimize=True)
out.resize((1280, 720), Image.LANCZOS).save('art/starfield-title-1280.png', optimize=True)
out.resize((960, 540), Image.LANCZOS).save('/tmp/starfield-preview.jpg', quality=86)
import os
print('2560x1440', round(os.path.getsize('art/starfield-title.png') / 1e6, 2), 'MB')
print('1280x720 ', round(os.path.getsize('art/starfield-title-1280.png') / 1e6, 2), 'MB')
