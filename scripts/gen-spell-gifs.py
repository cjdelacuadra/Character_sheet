#!/usr/bin/env python3
"""Generate every pending spell-visualization GIF sprite.

Procedurally draws each pending `.gif` listed across the `needed.md` specs under
`src/renderer/public/assets/spells/`. Run from the repo root:

    python scripts/gen-spell-gifs.py            # generate + verify
    python scripts/gen-spell-gifs.py --montage  # also dump frame montages to .montage/

Notes
-----
* GIF transparency is 1-bit (one reserved palette index). "Soft / glow / translucent"
  looks therefore use ordered (Bayer) dithering of solid pixels rather than alpha — this
  keeps clean pixel clusters and avoids random noise.
* Every looped sprite is *seamless*: motion is periodic in ``t = i / N`` (rotation
  ``360/N`` per frame, ``sin``/``cos`` pulses, modular scroll, phase-staggered particles),
  so frame ``N`` is identical to frame ``0`` by construction.
* Each sprite declares a tiny fixed palette with **index 0 reserved transparent**, and is
  drawn directly in palette-index space — deterministic and reproducible, no quantisation.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "src" / "renderer" / "public" / "assets" / "spells"


# ── pixel canvas ────────────────────────────────────────────────────────────
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


# ── ordered dithering ─────────────────────────────────────────────────────────
_BAYER = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
]


def dith(x: int, y: int, density: float) -> bool:
    """Stable ordered-dither test: True when this pixel is 'on' at the given density."""
    return (_BAYER[int(y) % 4][int(x) % 4] + 0.5) / 16.0 < density


# ── primitives ────────────────────────────────────────────────────────────────
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


# ── GIF writer ──────────────────────────────────────────────────────────────
def _to_p(f: F, pal):
    im = Image.new("P", (f.w, f.h))
    flat = []
    for c in pal:
        flat += [c[0], c[1], c[2]]
    flat += [0] * (768 - len(flat))
    im.putpalette(flat)
    im.frombytes(bytes(f.px))
    return im


def save_gif(path: Path, frames, pal, duration, loop):
    path.parent.mkdir(parents=True, exist_ok=True)
    imgs = [_to_p(fr, pal) for fr in frames]
    kw = dict(save_all=True, append_images=imgs[1:], duration=duration,
              disposal=2, transparency=0, optimize=False)
    if loop is not None:
        kw["loop"] = loop
    imgs[0].save(path, **kw)


# ── shared palettes ───────────────────────────────────────────────────────────
T = (0, 0, 0)  # index 0 — transparent (RGB irrelevant; nearest-neighbour render)


# =============================================================================
#  AURA / BUFF  (22x22, 8f loop)
# =============================================================================
def d_defense(f, i, N):
    C = 10.5; ph = 2 * math.pi * i / N
    r = 8 + 0.9 * math.sin(ph)
    ring(f, C, C, r, 2, th=1.6)
    ring(f, C, C, r - 2.5, 1, th=1.0, density=0.5)
    a0 = ph
    arc(f, C, C, r, a0, a0 + 1.4, 3)
PAL_defense = [T, H("5a8fd6"), H("9ecbff"), H("d7e9ff")]


def d_damage(f, i, N):
    C = 10.5; ph = 2 * math.pi * i / N
    pulse = 0.5 + 0.5 * math.sin(ph)
    dirs = [(0, -1), (1, -1), (1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1)]
    for k, (dx, dy) in enumerate(dirs):
        nx = dx / math.hypot(dx, dy); ny = dy / math.hypot(dx, dy)
        L = 8 + (1.5 if k % 2 == 0 else 0) + pulse * 1.5  # aggressive spikes, cardinals longer
        for s in range(2, int(L)):
            idx = 3 if s >= int(L) - 2 else (2 if s >= int(L) - 4 else 1)
            f.set(C + nx * s, C + ny * s, idx)
    # rotating bright flare riding one spike
    a = ph
    for s in range(2, 9):
        f.set(C + math.cos(a) * s, C + math.sin(a) * s, 3)
    disc(f, C, C, 1.6, 2)
PAL_damage = [T, H("c01818"), H("ff5a2a"), H("ffb24a")]


def d_speed(f, i, N):
    off = (i / N) * 7
    rows = [(4, 3), (9, 4), (14, 3), (18, 2)]  # (y, length-tier)
    for y, _ in rows:
        for seg in range(-1, 4):
            x0 = (seg * 7 - off) % 28 - 3
            line(f, x0, y, x0 + 4, y, 2)
            f.set(x0 + 5, y, 3)
            f.set(x0 + 6, y, 1)
PAL_speed = [T, H("8fd0f0"), H("bfe8ff"), H("eaffff")]


def d_heal(f, i, N):
    C = 10.5; ph = 2 * math.pi * i / N
    r = 4.5 + 1.5 * (0.5 + 0.5 * math.sin(ph))
    disc(f, C, C, r, 1, density=0.55)
    disc(f, C, C, r - 1.5, 2, density=0.7)
    disc(f, C, C, 2, 3)
    for j in range(3):
        t = (i / N + j / 3) % 1.0
        y = 16 - t * 12
        x = 7 + j * 4
        if t < 0.85:
            f.set(x, y, 3)
PAL_heal = [T, H("8ff08a"), H("e9ffb0"), H("ffe79a")]


def d_holy(f, i, N):
    for j in range(5):
        t = (i / N + j / 5) % 1.0
        y = 19 - t * 17
        x = 4 + j * 3 + (j % 2)
        idx = 3 if y < 7 else (2 if y < 13 else 1)
        f.set(x, y, idx)
        if y < 9:
            f.set(x, y - 1, 3)
    # bright crown at top
    for x in range(8, 14):
        if dith(x, 2, 0.6):
            f.set(x, 2, 3)
PAL_holy = [T, H("d9a93a"), H("ffe79a"), H("fff4cf")]


def d_frost(f, i, N):
    C = 10.5
    dens = 0.25 + 0.75 * (0.5 + 0.5 * math.cos(2 * math.pi * i / N))  # full→sparse→full
    spokes = [(0, -1), (1, 0), (0, 1), (-1, 0), (0.7, 0.7), (-0.7, -0.7),
              (0.7, -0.7), (-0.7, 0.7)]
    L = int(2 + 6 * dens)
    for dx, dy in spokes:
        for k in range(1, L):
            f.set(C + dx * k, C + dy * k, 2 if k > 2 else 1)
    disc(f, C, C, 1.6, 3)
PAL_frost = [T, H("6fb8e0"), H("9fe6ff"), H("d6f7ff")]


def d_mirror(f, i, N):
    C = 10.5
    base = (2 * math.pi / 3) * (i / N)  # 120deg over the loop -> seamless for 3-fold symmetry
    for k in range(3):
        a = base + k * (2 * math.pi / 3)
        x, y = C + math.cos(a) * 6, C + math.sin(a) * 6
        figure(f, x, y, 1)       # solid (but muted) ghost body reads clearly at 22px
        f.set(x, y - 2, 2)       # brighter head highlight
PAL_mirror = [T, H("9a8ff0"), H("d4ccff")]


def d_weapon(f, i, N):
    # diagonal blade from lower-left to upper-right with a travelling sheen
    line(f, 5, 17, 16, 6, 1)
    line(f, 5, 18, 16, 7, 1)
    line(f, 16, 6, 18, 4, 2)  # tip
    t = i / N
    sx = 5 + t * 11; sy = 17 - t * 11
    f.set(sx, sy, 3); f.set(sx + 0.5, sy - 0.5, 3)
    f.set(sx - 1, sy + 1, 2)
PAL_weapon = [T, H("8a78c0"), H("d7e9ff"), H("ffffff")]


# =============================================================================
#  AURA / DEBUFF  (22x22, 8f loop)
# =============================================================================
def d_marked(f, i, N):
    C = 10.5; ph = 2 * math.pi * i / N
    pulse = 0.5 + 0.5 * math.sin(ph)
    ring(f, C, C, 8, 1, th=1.2)
    ring(f, C, C, 4 + pulse, 2, th=1.0)
    for k in range(4):
        a = ph + k * (math.pi / 2)
        line(f, C + math.cos(a) * 6, C + math.sin(a) * 6,
             C + math.cos(a) * 9.5, C + math.sin(a) * 9.5, 2)
    f.set(C, C, 2)
PAL_marked = [T, H("ff4040"), H("ffd0d0")]


def d_paralyzed(f, i, N):
    specks = [(6, 5), (15, 7), (8, 14), (16, 15), (5, 11), (13, 11), (10, 4), (11, 17)]
    for sx, sy in specks:
        cluster(f, sx, sy, [(0, 0), (1, 0), (0, 1)], 1)
    # shimmer sweep
    sweep = int((i / N) * 22)
    for y in range(22):
        x = sweep - (y // 3)
        if 0 <= x < 22 and dith(x, y, 0.5):
            f.set(x, y, 2)
PAL_paralyzed = [T, H("8fcfe6"), H("e6fbff")]


def d_slowed(f, i, N):
    C = 10.5
    for k in range(2):
        t = (i / N + k / 2) % 1.0
        r = 1 + t * 9
        idx = 2 if t < 0.5 else 1
        ring(f, C, C, r, idx, th=1.2, density=0.85 - t * 0.5)
PAL_slowed = [T, H("8a8aa6"), H("c8c8e0")]


def d_frightened(f, i, N):
    ph = 2 * math.pi * i / N
    bases = [(4, 21), (11, 21), (18, 21), (8, 21), (15, 21)]
    for j, (bx, by) in enumerate(bases):
        h = 9 + (j % 2) * 3
        for k in range(h):
            x = bx + math.sin(ph + j * 1.3 + k * 0.5) * 1.6 * (k / h)  # shaky, more at the tip
            f.set(x, by - k, 1)
            if k >= h - 2:
                f.set(x, by - k, 2)  # pale wavering tip
    jit = int(round(math.sin(ph) * 1.5))
    for fx in (2, 19):  # jittering fear lines hugging the sides
        line(f, fx + jit, 4, fx + jit, 8, 2)
PAL_frightened = [T, H("332838"), H("8a7a9a")]  # dark violet stays visible on the dark grid


def d_charmed(f, i, N):
    for j in range(3):
        t = (i / N + j / 3) % 1.0
        y = 17 - t * 13
        x = 6 + j * 5
        idx = 2 if t > 0.6 else 1
        if t < 0.9:
            heart(f, x, y, idx)
PAL_charmed = [T, H("ff8fd0"), H("c060d0")]


def d_illuminated(f, i, N):
    ph = 2 * math.pi * i / N
    dens = 0.45 + 0.4 * (0.5 + 0.5 * math.sin(ph))
    for x in range(1, 21):
        for y in (1, 2, 19, 20):
            if dith(x, y, dens):
                f.set(x, y, 1 if (x + y) % 2 else 2)
    for y in range(1, 21):
        for x in (1, 2, 19, 20):
            if dith(x, y, dens):
                f.set(x, y, 1 if (x + y) % 2 else 2)
PAL_illuminated = [T, H("c79fff"), H("e9d6ff")]


def d_transformed(f, i, N):
    C = 10.5
    for k in range(5):
        a = k * (2 * math.pi / 5)
        rr = 5 + 2.2 * math.sin(2 * math.pi * i / N + k)
        bx, by = C + math.cos(a) * 3, C + math.sin(a) * 3
        disc(f, bx, by, rr * 0.5, 1, density=0.8)
        disc(f, bx, by, rr * 0.3, 2)
PAL_transformed = [T, H("78b85a"), H("b0e0a0")]


def d_blinded(f, i, N):
    C = 10.5
    # closed-eye arc + lashes (static — reads as a shut eye)
    arc(f, C, C + 1, 5, math.pi * 0.15, math.pi * 0.85, 2)
    for k in range(-3, 4):
        f.set(C + k, C + 4, 2)
    f.set(C - 3, C + 5, 1); f.set(C - 4, C + 6, 1)
    f.set(C + 3, C + 5, 1); f.set(C + 4, C + 6, 1)
    # grayscale shimmer: a 2px diagonal band that sweeps across (moves every frame)
    sweep = (i / N) * 30 - 5
    for y in range(22):
        bx = int(sweep + y * 0.5)
        for xx in (bx, bx + 1):
            if 0 <= xx < 22 and dith(xx, y, 0.55):
                f.set(xx, y, 1)
PAL_blinded = [T, H("6a6a6a"), H("d2d2d2")]


def d_asleep(f, i, N):
    for j in range(3):
        t = (i / N + j / 3) % 1.0
        y = 16 - t * 13
        x = 6 + j * 4
        s = 2 + j
        if t < 0.9:
            glyph_z(f, x, y, 2 if t > 0.5 else 1, s=s)
PAL_asleep = [T, H("8f9fd6"), H("cfd8ff")]


def d_banished(f, i, N):
    C = 10.5; ph = 2 * math.pi * i / N
    ring(f, C, C, 8, 1, th=1.4)
    arc(f, C, C, 8, ph, ph + 2.2, 2)
    dens = 0.7 * (0.5 + 0.5 * math.cos(ph))  # silhouette ghosts out then back
    figure(f, C, C + 1, 2, density=dens)
PAL_banished = [T, H("6a3fd0"), H("c4a0ff")]


# =============================================================================
#  EFFECTS / TERRAIN  (22x22, 8f loop)
# =============================================================================
def d_vines(f, i, N):
    ph = 2 * math.pi * i / N
    bases = [(3, 21), (9, 21), (15, 21), (20, 21)]
    grow = 0.6 + 0.4 * (0.5 + 0.5 * math.sin(ph))
    for bx, by in bases:
        h = int(13 * grow)
        x = bx
        for k in range(h):
            x = bx + math.sin(ph + k * 0.5 + bx) * 1.6
            f.set(x, by - k, 1)
            if k % 3 == 0:
                f.set(x + 1, by - k, 2)
PAL_vines = [T, H("5fae3f"), H("7a5230")]


def d_spikes(f, i, N):
    ph = 2 * math.pi * i / N
    grow = 0.5 + 0.5 * (0.5 + 0.5 * math.sin(ph))
    for bx in range(2, 21, 4):
        h = int(6 + 5 * grow)
        sway = math.sin(ph + bx) * 0.8
        for k in range(h):
            w = (h - k) // 3
            xx = bx + sway * (k / h)
            for dx in range(-w, w + 1):
                f.set(xx + dx, 21 - k, 1 if abs(dx) == w else 2)
PAL_spikes = [T, H("8a7a5a"), H("b6b6b6")]


def d_fog(f, i, N):
    off = (i / N) * 22
    for y in range(22):
        for x in range(22):
            v = math.sin((x + off) * 0.5) + math.cos((y - off * 0.5) * 0.4)
            d = 0.5 + 0.28 * v
            if dith(x, y, max(0, min(1, d)) * 0.75):
                f.set(x, y, 1 if v < 0 else 2)
PAL_fog = [T, H("9a9aa6"), H("c8c8d2")]


def d_darkness(f, i, N):
    C = 10.5; ph = 2 * math.pi * i / N
    disc(f, C, C, 9.5, 1)
    arc(f, C, C, 9.5, ph, ph + 1.0, 2)
    arc(f, C, C, 9.5, ph + math.pi, ph + math.pi + 1.0, 2)
PAL_darkness = [T, H("0a0a12"), H("3a3a4a")]


def d_silence(f, i, N):
    C = 10.5; ph = 2 * math.pi * i / N
    ring(f, C, C, 9, 1, th=1.6, density=0.4)
    a = ph
    for k in range(5):
        aa = a + k * 0.18
        f.set(C + math.cos(aa) * 9, C + math.sin(aa) * 9, 2)
PAL_silence = [T, H("9a9aa8"), H("dcdce6")]


def d_hypnotic(f, i, N):
    C = 10.5; ph = 2 * math.pi * i / N
    cols = [1, 2, 3, 4]
    for arm in (0.0, math.pi):  # two opposing spiral arms
        prev = None
        a = 0.0
        while a < 6.0:
            r = 1 + a * 1.6
            if r > 10.5:
                break
            x = C + math.cos(a + ph + arm) * r
            y = C + math.sin(a + ph + arm) * r
            idx = cols[int(r) % len(cols)]
            if prev:
                line(f, prev[0], prev[1], x, y, idx)  # connect for continuous arms
            prev = (x, y)
            a += 0.4
PAL_hypnotic = [T, H("ff5a8a"), H("ffd24a"), H("5ad6ff"), H("a05aff")]


def d_illusion(f, i, N):
    ph = 2 * math.pi * i / N
    for y in range(22):
        shift = math.sin(ph + y * 0.6) * 1.8
        for x in range(2, 20, 2):
            xx = x + shift
            if dith(int(xx), y, 0.3):
                f.set(xx, y, 1 if y % 2 else 2)
PAL_illusion = [T, H("c2c2e0"), H("e2e2f4")]


# =============================================================================
#  EFFECTS / HEAL
# =============================================================================
def d_heal_pulse(f, i, N):
    C = 10.5; t = i / (N - 1)
    r = 1 + t * 8
    ring(f, C, C, r, 1, th=1.4, density=1 - t * 0.6)
    disc(f, C, C, max(0.5, 3 - t * 3), 3)
    for j in range(4):
        y = C - t * 9 - j
        f.set(C - 3 + j * 2, y, 2)
PAL_heal_pulse = [T, H("8ff08a"), H("e9ffb0"), H("ffe79a")]


def d_heal_wave(f, i, N):
    C = 10.5
    for k in range(2):
        t = (i / N + k / 2) % 1.0
        r = 1 + t * 9.5
        ring(f, C, C, r, 1 if k else 2, th=1.4, density=0.9 - t * 0.55)
    disc(f, C, C, 2, 3)
PAL_heal_wave = [T, H("8ff08a"), H("c8ffa0"), H("ffe79a")]


def d_restoration(f, i, N):
    C = 10.5; t = i / (N - 1)
    flash = max(0.0, 1 - t * 1.4)
    disc(f, C, C, 2 + flash * 7, 3, density=flash)
    ring(f, C, C, 4 + t * 5, 2, th=1.2, density=1 - t)
    for j in range(4):  # falling condition specks
        x = 5 + j * 4
        y = (4 + t * 14 + j * 2) % 22
        f.set(x, y, 1)
PAL_restoration = [T, H("c8a83a"), H("ffe79a"), H("ffffff")]


def d_revive(f, i, N):  # 22x44
    t = i / (N - 1)
    bx = 11
    # descending beam
    beam_h = int(4 + t * 30)
    for y in range(beam_h):
        for dx in (-1, 0, 1):
            if dith(bx + dx, y, 1 - y / 44):
                f.set(bx + dx, y, 2)
        f.set(bx, y, 3)
    # lifting silhouette near the bottom
    sy = 38 - t * 6
    figure(f, bx, sy, 1, density=0.9)
    if t > 0.5:
        ring(f, bx, sy + 2, 4 + (t - 0.5) * 6, 2, th=1.0, density=0.6)
PAL_revive = [T, H("c8a83a"), H("ffe79a"), H("fffbe6")]


# =============================================================================
#  EFFECTS / VANISH
# =============================================================================
def _silhouette_dissolve(f, t):
    C = 10.5
    figure(f, C, C, 2, density=max(0.0, 1 - t))
    n = int(t * 10)
    for j in range(n):
        a = j * 2.39996
        rr = 2 + t * 9
        x = C + math.cos(a) * rr
        y = C + math.sin(a) * rr - t * 3
        f.set(x, y, 1)


def d_fade_out(f, i, N):
    _silhouette_dissolve(f, i / (N - 1))
PAL_fade = [T, H("c8c8d4"), H("9a9aa6")]


def d_fade_in(f, i, N):
    _silhouette_dissolve(f, 1 - i / (N - 1))


def d_silver_mist(f, i, N):
    off = (i / N) * 22
    for y in range(22):
        for x in range(22):
            v = math.sin((x + off) * 0.55) + math.cos((y + off * 0.6) * 0.45)
            if dith(x, y, max(0, 0.45 + 0.3 * v) * 0.7):
                f.set(x, y, 1 if v > 0 else 2)
PAL_silver_mist = [T, H("d2d2dc"), H("a6a6b4")]


def d_purple_warp(f, i, N):
    C = 10.5; ph = 2 * math.pi * i / N
    for r in range(1, 10):
        a = ph - r * 0.6
        idx = 2 if r % 2 else 1
        f.set(C + math.cos(a) * r, C + math.sin(a) * r, idx)
        f.set(C + math.cos(a + math.pi) * r, C + math.sin(a + math.pi) * r, idx)
    disc(f, C, C, 1.5, 3)
PAL_purple_warp = [T, H("7a30c0"), H("b46cff"), H("e6c8ff")]


# =============================================================================
#  EFFECTS / COUNTER
# =============================================================================
def d_counter_beam(f, i, N):
    t = i / (N - 1)
    y = 11
    tip = int(2 + t * 17)
    for x in range(2, tip):
        f.set(x, y, 2)
        f.set(x, y - 1, 1); f.set(x, y + 1, 1)
    if t > 0.55:  # fizzle sparks at the tip
        for a in range(0, 360, 45):
            rr = (t - 0.55) * 10
            f.set(tip + math.cos(math.radians(a)) * rr,
                  y + math.sin(math.radians(a)) * rr, 3)
PAL_counter_beam = [T, H("5a9fd6"), H("bfe8ff"), H("ffffff")]


def d_incoming(f, i, N):
    C = 10.5; ph = 2 * math.pi * i / N
    disc(f, C, C, 3 + 0.6 * math.sin(ph), 1)
    disc(f, C, C, 1.8, 3)
    for k in range(5):
        a = ph + k * (2 * math.pi / 5)
        rr = 6 + math.sin(ph * 2 + k)
        f.set(C + math.cos(a) * rr, C + math.sin(a) * rr, 2)
PAL_incoming = [T, H("7a30c0"), H("c060ff"), H("e6c8ff")]


# =============================================================================
#  EFFECTS / SUMMON  (GIF idle loops only)
# =============================================================================
def d_spiritual_weapon(f, i, N):
    C = 10.5; ph = 2 * math.pi * i / N
    a = ph
    hx, hy = C + math.cos(a) * 5, C + math.sin(a) * 5      # hilt
    tx, ty = C + math.cos(a) * 5 - math.cos(a) * 7, C + math.sin(a) * 5 - math.sin(a) * 7
    line(f, hx, hy, tx, ty, 2)
    f.set(tx, ty, 3); f.set(tx + 0.4, ty + 0.4, 3)
    # crossguard
    px, py = -math.sin(a), math.cos(a)
    line(f, hx - px * 2, hy - py * 2, hx + px * 2, hy + py * 2, 1)
PAL_spiritual_weapon = [T, H("6a9fd0"), H("bfe0ff"), H("ffffff")]


def d_mage_hand(f, i, N):
    C = 10.5; ph = 2 * math.pi * i / N
    cy = C + math.sin(ph) * 1.6
    # palm
    disc(f, C, cy + 1, 3, 1, density=0.7)
    disc(f, C, cy + 1, 2.2, 2, density=0.6)
    # fingers
    for dx in (-2, -1, 0, 1, 2):
        f.set(C + dx, cy - 2, 1)
        f.set(C + dx, cy - 3, 2 if dx % 2 == 0 else 0)
PAL_mage_hand = [T, H("9ad0e6"), H("d6f4ff")]


def d_unseen_servant(f, i, N):
    C = 10.5; ph = 2 * math.pi * i / N
    for k in range(3):
        r = ((i / N + k / 3) % 1.0) * 9 + 1
        ring(f, C, C, r, 1 if k % 2 else 2, th=1.0, density=0.5)
PAL_unseen_servant = [T, H("c2c2d0"), H("e4e4f0")]


# =============================================================================
#  ICONS  (GIFs)
# =============================================================================
def d_mote_warm(f, i, N):
    C = 3.5; cy = C + math.sin(2 * math.pi * i / N) * 1.0
    disc(f, C, cy, 1.6, 1, density=0.7)
    disc(f, C, cy, 0.9, 2)
PAL_mote_warm = [T, H("ff9a30"), H("ffe07a")]


def d_mote_cool(f, i, N):
    C = 3.5; cy = C + math.sin(2 * math.pi * i / N) * 1.0
    disc(f, C, cy, 1.6, 1, density=0.7)
    disc(f, C, cy, 0.9, 2)
PAL_mote_cool = [T, H("5ac0ff"), H("c8b0ff")]


def d_flourish(f, i, N):
    C = 10.5; t = i / (N - 1)
    rr = 1 + t * 8
    fade = 1 - t
    for a in (0, 90, 180, 270):
        x = C + math.cos(math.radians(a)) * rr
        y = C + math.sin(math.radians(a)) * rr
        f.set(x, y, 2 if fade > 0.4 else 1)
    for a in (45, 135, 225, 315):
        x = C + math.cos(math.radians(a)) * rr * 0.7
        y = C + math.sin(math.radians(a)) * rr * 0.7
        f.set(x, y, 1)
    if t < 0.4:
        disc(f, C, C, 1.5 * fade * 2, 3)
PAL_flourish = [T, H("c89aff"), H("e9d6ff"), H("ffffff")]


# ── manifest ──────────────────────────────────────────────────────────────────
# (rel_path, size, n_frames, loop, duration_ms, palette, draw_fn)
MANIFEST = [
    # aura / buff
    ("aura/buff/defense_aura.gif", (22, 22), 8, 0, 100, PAL_defense, d_defense),
    ("aura/buff/damage_aura.gif", (22, 22), 8, 0, 100, PAL_damage, d_damage),
    ("aura/buff/speed_aura.gif", (22, 22), 8, 0, 90, PAL_speed, d_speed),
    ("aura/buff/heal_aura.gif", (22, 22), 8, 0, 110, PAL_heal, d_heal),
    ("aura/buff/holy_aura.gif", (22, 22), 8, 0, 110, PAL_holy, d_holy),
    ("aura/buff/frost_aura.gif", (22, 22), 8, 0, 110, PAL_frost, d_frost),
    ("aura/buff/mirror_aura.gif", (22, 22), 8, 0, 110, PAL_mirror, d_mirror),
    ("aura/buff/weapon_glow_aura.gif", (22, 22), 8, 0, 100, PAL_weapon, d_weapon),
    # aura / debuff
    ("aura/debuff/marked_aura.gif", (22, 22), 8, 0, 100, PAL_marked, d_marked),
    ("aura/debuff/paralyzed_aura.gif", (22, 22), 8, 0, 120, PAL_paralyzed, d_paralyzed),
    ("aura/debuff/slowed_aura.gif", (22, 22), 8, 0, 130, PAL_slowed, d_slowed),
    ("aura/debuff/frightened_aura.gif", (22, 22), 8, 0, 90, PAL_frightened, d_frightened),
    ("aura/debuff/charmed_aura.gif", (22, 22), 8, 0, 110, PAL_charmed, d_charmed),
    ("aura/debuff/illuminated_aura.gif", (22, 22), 8, 0, 110, PAL_illuminated, d_illuminated),
    ("aura/debuff/transformed_aura.gif", (22, 22), 8, 0, 110, PAL_transformed, d_transformed),
    ("aura/debuff/blinded_aura.gif", (22, 22), 8, 0, 110, PAL_blinded, d_blinded),
    ("aura/debuff/asleep_aura.gif", (22, 22), 8, 0, 130, PAL_asleep, d_asleep),
    ("aura/debuff/banished_aura.gif", (22, 22), 8, 0, 110, PAL_banished, d_banished),
    # effects / terrain
    ("effects/terrain/vines_grasping.gif", (22, 22), 8, 0, 110, PAL_vines, d_vines),
    ("effects/terrain/spikes_thorns.gif", (22, 22), 8, 0, 120, PAL_spikes, d_spikes),
    ("effects/terrain/fog_cloud.gif", (22, 22), 8, 0, 130, PAL_fog, d_fog),
    ("effects/terrain/darkness_sphere.gif", (22, 22), 8, 0, 120, PAL_darkness, d_darkness),
    ("effects/terrain/silence_dome.gif", (22, 22), 8, 0, 120, PAL_silence, d_silence),
    ("effects/terrain/hypnotic_swirl.gif", (22, 22), 8, 0, 100, PAL_hypnotic, d_hypnotic),
    ("effects/terrain/illusion_shimmer.gif", (22, 22), 8, 0, 120, PAL_illusion, d_illusion),
    # effects / heal
    ("effects/heal/heal_pulse.gif", (22, 22), 6, None, 84, PAL_heal_pulse, d_heal_pulse),
    ("effects/heal/heal_wave.gif", (22, 22), 8, 0, 100, PAL_heal_wave, d_heal_wave),
    ("effects/heal/restoration_cleanse.gif", (22, 22), 6, None, 84, PAL_restoration, d_restoration),
    ("effects/heal/revive_beam.gif", (22, 44), 8, None, 88, PAL_revive, d_revive),
    # effects / vanish
    ("effects/vanish/fade_out.gif", (22, 22), 6, None, 50, PAL_fade, d_fade_out),
    ("effects/vanish/fade_in.gif", (22, 22), 6, None, 50, PAL_fade, d_fade_in),
    ("effects/vanish/silver_mist.gif", (22, 22), 8, 0, 90, PAL_silver_mist, d_silver_mist),
    ("effects/vanish/purple_warp.gif", (22, 22), 8, 0, 100, PAL_purple_warp, d_purple_warp),
    # effects / counter
    ("effects/counter/counter_beam.gif", (22, 22), 8, None, 50, PAL_counter_beam, d_counter_beam),
    ("effects/counter/incoming_spell.gif", (22, 22), 8, 0, 90, PAL_incoming, d_incoming),
    # effects / summon (GIF idle loops)
    ("effects/summon/construct/spiritual_weapon.gif", (22, 22), 8, 0, 110, PAL_spiritual_weapon, d_spiritual_weapon),
    ("effects/summon/spectral/mage_hand.gif", (22, 22), 8, 0, 120, PAL_mage_hand, d_mage_hand),
    ("effects/summon/spirit/unseen_servant.gif", (22, 22), 8, 0, 120, PAL_unseen_servant, d_unseen_servant),
    # icons
    ("icons/mote_warm.gif", (8, 8), 4, 0, 180, PAL_mote_warm, d_mote_warm),
    ("icons/mote_cool.gif", (8, 8), 4, 0, 180, PAL_mote_cool, d_mote_cool),
    ("icons/flourish_sparkle.gif", (22, 22), 6, None, 67, PAL_flourish, d_flourish),
]


def build(entry):
    rel, (w, h), n, loop, dur, pal, draw = entry
    frames = []
    for i in range(n):
        fr = F(w, h)
        draw(fr, i, n)
        frames.append(fr)
    return rel, frames, pal, loop, dur


def montage(rel, frames, pal):
    """Write an upscaled side-by-side montage PNG for manual eyeballing."""
    scale = 8
    w, h = frames[0].w, frames[0].h
    gap = 2
    sheet = Image.new("RGBA", ((w * scale + gap) * len(frames) + gap, h * scale + gap * 2),
                      (32, 32, 40, 255))
    for fi, fr in enumerate(frames):
        cell = _to_p(fr, pal).convert("RGBA")
        # apply transparency: index 0 -> alpha 0
        px = cell.load()
        raw = fr.px
        for y in range(h):
            for x in range(w):
                if raw[y * w + x] == 0:
                    px[x, y] = (0, 0, 0, 0)
        cell = cell.resize((w * scale, h * scale), Image.NEAREST)
        sheet.alpha_composite(cell, (gap + fi * (w * scale + gap), gap))
    out = ROOT / ".montage" / (rel.replace("/", "__") + ".png")
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)


def main():
    do_montage = "--montage" in sys.argv
    coalesced = []  # sprites where Pillow merged identical consecutive frames (dead frame)
    for entry in MANIFEST:
        rel, frames, pal, loop, dur = build(entry)
        path = ASSETS / rel
        save_gif(path, frames, pal, dur, loop)
        with Image.open(path) as im:
            assert im.size == (frames[0].w, frames[0].h), f"{rel}: size {im.size}"
            n = getattr(im, "n_frames", 1)
        if do_montage:
            montage(rel, frames, pal)
        flag = "" if n == len(frames) else f"  <-- {n}f written (dead frame)"
        if n != len(frames):
            coalesced.append(rel)
        print(f"  ok  {rel:48s} {im.size[0]}x{im.size[1]}  {len(frames)}f"
              f"  {'loop' if loop == 0 else 'once'}{flag}")
    print(f"\nGenerated {len(MANIFEST)} GIFs into {ASSETS}")
    if coalesced:
        print(f"COALESCED ({len(coalesced)}): " + ", ".join(coalesced))
    else:
        print("All frames distinct (no dead frames).")
    if do_montage:
        print(f"Montages in {ROOT / '.montage'}")


if __name__ == "__main__":
    main()
