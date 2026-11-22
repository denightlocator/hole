#!/usr/bin/env python3
"""Preview the sky's panorama and idealized spherical projection, without Minecraft.

Requires JDK 21, Pillow and NumPy. The panorama itself is made by the actual Java
SkyPanorama class; the views below are an approximate ray-cast of the renderer's
longitude/latitude mapping, not an in-game screenshot.
"""
from __future__ import annotations

import argparse
import math
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_IMAGE = ROOT / "src/main/resources/assets/orbit/textures/gui/sky/moonlit_aurora.png"
W, H = 640, 360
FOV = math.radians(90)


def java_tool(name: str) -> str:
    home = os.environ.get("JAVA_HOME")
    if home:
        return str(Path(home) / "bin" / (name + (".exe" if os.name == "nt" else "")))
    return name


def build_panorama(source: Path, destination: Path, classes: Path) -> None:
    """Compile and invoke the real production builder, rather than a second implementation."""
    subprocess.run([
        java_tool("javac"), "--release", "21", "-encoding", "UTF-8", "-d", str(classes),
        str(ROOT / "src/main/java/dev/orbit/client/render/SkyPanorama.java"),
        str(ROOT / "tools/SkyPanoramaPreview.java"),
    ], check=True)
    subprocess.run([
        java_tool("java"), "-Djava.awt.headless=true", "-cp", str(classes),
        "SkyPanoramaPreview", str(source), str(destination),
    ], check=True)


def ray_dirs(yaw: float, pitch: float) -> np.ndarray:
    xs = np.broadcast_to(np.linspace(-1, 1, W)[None, :], (H, W))
    ys = np.broadcast_to(np.linspace(-1, 1, H)[:, None], (H, W))
    scale = math.tan(FOV / 2)
    directions = np.stack([xs * scale * W / H, -ys * scale, np.ones_like(xs)], axis=-1)
    directions /= np.linalg.norm(directions, axis=-1, keepdims=True)
    cy, sy = math.cos(yaw), math.sin(yaw)
    cp, sp = math.cos(pitch), math.sin(pitch)
    ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    rx = np.array([[1, 0, 0], [0, cp, sp], [0, -sp, cp]])
    return directions @ (ry @ rx).T


def sample_sky(panorama: np.ndarray, directions: np.ndarray) -> np.ndarray:
    """Approximate the UV sphere: v=0 is up, v=1 down, u runs once around."""
    elevation = np.arcsin(np.clip(directions[..., 1], -1, 1))
    v = np.clip((math.pi / 2 - elevation) / math.pi, 0.0, 1.0)
    u = (np.arctan2(directions[..., 2], directions[..., 0]) / (2 * math.pi)) % 1.0
    sh, sw = panorama.shape[:2]
    px = np.clip((u * (sw - 1)).astype(int), 0, sw - 1)
    py = np.clip((v * (sh - 1)).astype(int), 0, sh - 1)
    return panorama[py, px, :3]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", type=Path, default=DEFAULT_IMAGE, help="Source PNG to preview")
    parser.add_argument("--output", type=Path, default=ROOT / "art/sky-dome-preview.png",
                        help="Path for the four simulated views")
    parser.add_argument("--panorama", type=Path, help="Also save the prepared panorama PNG")
    args = parser.parse_args()

    with tempfile.TemporaryDirectory(prefix="orbit-sky-preview-") as temp:
        temp_path = Path(temp)
        prepared = temp_path / "panorama.png"
        build_panorama(args.image.resolve(), prepared, temp_path)
        if args.panorama:
            args.panorama.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(prepared, args.panorama)
        with Image.open(prepared) as image:
            panorama = np.asarray(image.convert("RGBA"))

    if not np.array_equal(panorama[:, 0], panorama[:, -1]):
        raise AssertionError("Panorama edges do not match")
    if not (np.all(panorama[0] == panorama[0, 0]) and np.all(panorama[-1] == panorama[-1, 0])):
        raise AssertionError("Panorama does not close at both poles")

    views = [
        ("ART VIEW", -68, 30),
        ("WRAP SEAM", 90, 20),
        ("ZENITH", 30, 85),
        ("NADIR", 30, -85),
    ]
    canvas = Image.new("RGB", (2 * W, 2 * H))
    for index, (name, yaw, pitch) in enumerate(views):
        tile = Image.fromarray(sample_sky(panorama, ray_dirs(math.radians(yaw), math.radians(pitch))))
        draw = ImageDraw.Draw(tile)
        draw.rectangle((0, 0, W - 1, 20), fill=(10, 12, 24))
        draw.text((8, 4), f"{name}  |  simulated projection (not in-game)", fill=(225, 230, 240))
        canvas.paste(tile, ((index % 2) * W, (index // 2) * H))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(args.output)
    print(f"Prepared panorama {panorama.shape[1]}x{panorama.shape[0]}: wrap and poles verified")
    print(f"Wrote simulated views to {args.output}")


if __name__ == "__main__":
    main()
