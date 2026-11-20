"""Renders what the sky dome actually shows, straight from the same mapping SkyRenderer uses.

The dome is a UV sphere: latitude -> texture v, longitude -> texture u. That is an equirectangular
lookup, so a preview is a per-pixel ray cast with no 3D maths beyond the camera basis. Used to prove
the mapping is continuous (no seams, no smear) without launching Minecraft.
"""
import math
import numpy as np
from PIL import Image

W, H = 640, 360
FOV = math.radians(90)


def ray_dirs(yaw, pitch):
    xs = np.linspace(-1, 1, W)[None, :].repeat(H, axis=0)
    ys = np.linspace(-1, 1, H)[:, None].repeat(W, axis=1)
    f = 1.0 / math.tan(FOV / 2)
    # camera space: forward = +z
    d = np.stack([xs * f * (W / H), -ys * f, np.ones_like(xs)], axis=-1)
    d /= np.linalg.norm(d, axis=-1, keepdims=True)

    cy, sy = math.cos(yaw), math.sin(yaw)
    cp, sp = math.cos(pitch), math.sin(pitch)
    ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    rx = np.array([[1, 0, 0], [0, cp, sp], [0, -sp, cp]])
    return d @ (ry @ rx).T


def seam_strip(image):
    """Mirror + reverse, exactly like SkyRenderer.seamlessTexture."""
    a = np.asarray(image.convert("RGB"))
    return np.concatenate([a, a[:, ::-1]], axis=1)


ART_TOP_ELEVATION = 60.0


def panorama(image):
    """Builds the same full 360x180 panorama SkyRenderer.prepare does, in numpy."""
    art = np.asarray(image.convert("RGB")).astype(np.float32)
    h, w = art.shape[:2]
    out_w = w * 2
    out_h = out_w // 2

    art_top = round(out_h * (90.0 - ART_TOP_ELEVATION) / 180.0)
    horizon = out_h // 2

    top_rgb = art[0].mean(axis=0)
    bottom_rgb = art[h - 1].mean(axis=0) * 0.35

    out = np.zeros((out_h, out_w, 3), dtype=np.float32)
    for y in range(out_h):
        if y < art_top:
            t = 1.0 - (1.0 if art_top <= 1 else y / (art_top - 1))
            row = art[0] * (1.0 - t) + top_rgb * t
        elif y <= horizon:
            t = (y - art_top) / max(1, horizon - art_top)
            row = art[min(h - 1, round(t * (h - 1)))]
        else:
            t = (y - horizon) / max(1, out_h - 1 - horizon)
            t = min(1.0, t * 3.0)
            row = art[h - 1] * (1.0 - t) + bottom_rgb * t
        out[y, :w] = row
        out[y, w:] = row[::-1]        # mirrored half -> seamless
    return out


def sample_sky(pano, dirs):
    """v = 0 at the zenith, 1 at the nadir, exactly like SkyRenderer.draw."""
    elev = np.arcsin(np.clip(dirs[..., 1], -1, 1))
    v = np.clip((math.pi / 2 - elev) / math.pi, 0.0, 1.0)
    u = (np.arctan2(dirs[..., 2], dirs[..., 0]) / (2 * math.pi)) % 1.0

    sh, sw = pano.shape[:2]
    px = np.clip((u * (sw - 1)).astype(int), 0, sw - 1)
    py = np.clip((v * (sh - 1)).astype(int), 0, sh - 1)
    return pano[py, px].astype(np.uint8)


def main():
    skies = ["aurora", "synthwave", "day", "anime"]
    # horizon, straight up (pole check), and straight down (nadir coverage check)
    views = [("horizon", 0.0, math.radians(8)),
             ("straight up", math.radians(30), math.radians(85)),
             ("straight down", math.radians(30), math.radians(-85))]
    rows = []
    for view_name, yaw, pitch in views:
        dirs = ray_dirs(yaw, pitch)
        tiles = [sample_sky(panorama(Image.open(f"art/sky-final-{s}.png")), dirs) for s in skies]
        rows.append(np.concatenate(tiles, axis=1))
    out = np.concatenate(rows, axis=0)
    Image.fromarray(out).save("art/sky-dome-preview.png")
    print("wrote art/sky-dome-preview.png")


if __name__ == "__main__":
    main()
