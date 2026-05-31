#!/usr/bin/env python3
"""Shared pixel-art primitives for the procedural spell/aura/VFX generators.

GIF transparency is 1-bit (one reserved palette index, 0). "Soft / glow / translucent"
looks therefore use ordered (Bayer) dithering of solid pixels rather than alpha — this keeps
clean pixel clusters and avoids random noise. Frames are drawn directly in palette-index space
(index 0 == transparent), so output is deterministic with no quantisation.

Used by `gen-spell-gifs.py` and `gen-damage-vfx.py`.
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image


# ── pixel canvas ──────────────────────────────────────────────────────────────
class F:
    """A single frame: a w*h grid of palette indices (0 == transparent)."""

    __slots__ = ("w", "h", "px")

    def __init__(self, w: int, h: int):
        self.w, self.h = w, h
        self.px = bytearray(w * h)  # defaults to 0 (transparent)

    def set(self, x, y, idx):
        x = int(round(x)); y = int(round(y))
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[y * self.w + x] = idx

    def get(self, x, y):
        return self.px[y * self.w + x]


def H(s: str):
    s = s.lstrip("#")
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


# Shared per-damage-type palettes (index 1 dark/base → 4 brightest), reused by the
# spell-VFX generator and the weapon-enchant overlays. Single source of truth so the
# elemental look stays consistent across spells and enchanted gear.
T = (0, 0, 0)  # index 0 — transparent
DAMAGE_PALS = {
    "fire":      [T, H("c01818"), H("ff5a2a"), H("ffb24a"), H("ffe79a")],
    "cold":      [T, H("3a7fd0"), H("6fc0f0"), H("b0e8ff"), H("e6ffff")],
    "lightning": [T, H("5a6fd0"), H("9a9fe0"), H("bfe8ff"), H("ffffd0")],
    "thunder":   [T, H("7a7a5a"), H("b0b08a"), H("d8d8b0"), H("f4f4d8")],
    "acid":      [T, H("4a7a1a"), H("7ab82a"), H("a8e84a"), H("d8ff90")],
    "poison":    [T, H("4a2f6a"), H("7a4f9a"), H("7ab83a"), H("b0e070")],
    "necrotic":  [T, H("22182e"), H("4a2f6a"), H("6a3f8f"), H("9ac07a")],
    "radiant":   [T, H("c8902a"), H("ffd76a"), H("ffe79a"), H("fffbe6")],
    "force":     [T, H("8020c0"), H("b050e0"), H("d888f8"), H("f4d8ff")],
    "psychic":   [T, H("a040c0"), H("d060e0"), H("ff8fd0"), H("ffd0ec")],
    "blood":     [T, H("5a0c0c"), H("9a1414"), H("d83030"), H("ff6a6a")],
    "poof":      [T, H("5a5a5a"), H("8a8a8a"), H("b8b8b8"), H("e8e8e8")],
}


# ── ordered dithering ───────────────────────────────────────────────────────────
_BAYER = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
]


def dith(x: int, y: int, density: float) -> bool:
    """Stable ordered-dither test: True when this pixel is 'on' at the given density."""
    return (_BAYER[int(y) % 4][int(x) % 4] + 0.5) / 16.0 < density


# ── primitives ──────────────────────────────────────────────────────────────────
def disc(f: F, cx, cy, r, idx, density=1.0):
    r2 = r * r
    for y in range(int(cy - r) - 1, int(cy + r) + 2):
        for x in range(int(cx - r) - 1, int(cx + r) + 2):
            dx = x - cx; dy = y - cy
            if dx * dx + dy * dy <= r2 and (density >= 1.0 or dith(x, y, density)):
                f.set(x, y, idx)


def ring(f: F, cx, cy, r, idx, th=1.2, density=1.0):
    r0, r1 = r - th / 2, r + th / 2
    for y in range(int(cy - r - 1), int(cy + r + 2)):
        for x in range(int(cx - r - 1), int(cx + r + 2)):
            d = math.hypot(x - cx, y - cy)
            if r0 <= d <= r1 and (density >= 1.0 or dith(x, y, density)):
                f.set(x, y, idx)


def arc(f: F, cx, cy, r, a0, a1, idx, step=0.10):
    a = a0
    while a <= a1:
        f.set(cx + math.cos(a) * r, cy + math.sin(a) * r, idx)
        a += step


def line(f: F, x0, y0, x1, y1, idx):
    x0 = int(round(x0)); y0 = int(round(y0)); x1 = int(round(x1)); y1 = int(round(y1))
    dx = abs(x1 - x0); dy = -abs(y1 - y0)
    sx = 1 if x0 < x1 else -1; sy = 1 if y0 < y1 else -1
    err = dx + dy
    while True:
        f.set(x0, y0, idx)
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy; x0 += sx
        if e2 <= dx:
            err += dx; y0 += sy


def cluster(f: F, cx, cy, pts, idx):
    for dx, dy in pts:
        f.set(cx + dx, cy + dy, idx)


def box(f: F, x0, y0, x1, y1, idx):
    """Filled axis-aligned rectangle (inclusive bounds)."""
    if x1 < x0:
        x0, x1 = x1, x0
    if y1 < y0:
        y0, y1 = y1, y0
    for y in range(int(y0), int(y1) + 1):
        for x in range(int(x0), int(x1) + 1):
            f.set(x, y, idx)


def edge_mask(f: F):
    """Filled pixels (idx != 0) with at least one transparent 4-neighbour.

    These are the silhouette's rim — used to hug enchant tints to the weapon edge.
    Out-of-canvas neighbours count as transparent so the sprite border is included.
    """
    out = []
    w, h, px = f.w, f.h, f.px
    for y in range(h):
        for x in range(w):
            if px[y * w + x] == 0:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if not (0 <= nx < w and 0 <= ny < h) or px[ny * w + nx] == 0:
                    out.append((x, y))
                    break
    return out


def outline(f: F, idx):
    """Mark every transparent pixel 4-adjacent to a filled pixel as `idx`.

    Draws the strong dark border around an already-drawn silhouette. Collects targets
    first so the freshly-set border pixels don't seed further growth (1px ring only).
    """
    w, h, px = f.w, f.h, f.px
    targets = []
    for y in range(h):
        for x in range(w):
            if px[y * w + x] != 0:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and px[ny * w + nx] != 0:
                    targets.append((x, y))
                    break
    for x, y in targets:
        f.set(x, y, idx)


def figure(f: F, x, y, idx, density=1.0):
    """A tiny ~3x5 humanoid silhouette (head + torso + legs)."""
    pts = [(0, -2), (0, -1), (-1, -1), (1, -1), (-1, 0), (0, 0), (1, 0),
           (0, 1), (-1, 2), (1, 2)]
    for dx, dy in pts:
        if density >= 1.0 or dith(x + dx, y + dy, density):
            f.set(x + dx, y + dy, idx)


def glyph_z(f: F, x, y, idx, s=3):
    for dx in range(s):
        f.set(x + dx, y, idx)
        f.set(x + dx, y + s - 1, idx)
    for k in range(s):
        f.set(x + (s - 1 - k), y + k, idx)


def heart(f: F, x, y, idx):
    pts = [(-1, -1), (1, -1), (-2, 0), (-1, 0), (0, 0), (1, 0), (2, 0),
           (-1, 1), (0, 1), (1, 1), (0, 2)]
    cluster(f, x, y, pts, idx)


def spark(f: F, x, y, idx, size=2):
    for k in range(-size, size + 1):
        f.set(x + k, y, idx)
        f.set(x, y + k, idx)


# ── GIF writer + montage ──────────────────────────────────────────────────────
def _to_p(f: F, pal):
    im = Image.new("P", (f.w, f.h))
    flat = []
    for c in pal:
        flat += [c[0], c[1], c[2]]
    flat += [0] * (768 - len(flat))
    im.putpalette(flat)
    im.frombytes(bytes(f.px))
    return im


def save_gif(path, frames, pal, duration, loop):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    imgs = [_to_p(fr, pal) for fr in frames]
    kw = dict(save_all=True, append_images=imgs[1:], duration=duration,
              disposal=2, transparency=0, optimize=False)
    if loop is not None:
        kw["loop"] = loop
    imgs[0].save(path, **kw)


def save_png(path, frame, pal):
    """Save a single frame as a P-mode PNG with index 0 transparent (static sprite layer)."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    _to_p(frame, pal).save(path, transparency=0)


def montage(frames, pal, out_path, scale=8):
    """Write an upscaled side-by-side montage PNG of all frames for manual eyeballing."""
    w, h = frames[0].w, frames[0].h
    gap = 2
    sheet = Image.new("RGBA", ((w * scale + gap) * len(frames) + gap, h * scale + gap * 2),
                      (32, 32, 40, 255))
    for fi, fr in enumerate(frames):
        cell = _to_p(fr, pal).convert("RGBA")
        px = cell.load()
        raw = fr.px
        for y in range(h):
            for x in range(w):
                if raw[y * w + x] == 0:
                    px[x, y] = (0, 0, 0, 0)
        cell = cell.resize((w * scale, h * scale), Image.NEAREST)
        sheet.alpha_composite(cell, (gap + fi * (w * scale + gap), gap))
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_path)
