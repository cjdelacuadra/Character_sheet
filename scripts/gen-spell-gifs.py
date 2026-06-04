#!/usr/bin/env python3
"""Generate every pending spell-visualization GIF sprite (64x64 px).

Procedurally draws each pending `.gif` listed across the `needed.md` specs under
`src/renderer/public/assets/spells/`. Run from the repo root:

    python scripts/gen-spell-gifs.py            # generate + verify
    python scripts/gen-spell-gifs.py --montage  # also dump frame montages to .montage/

Resolution bump (22→64 px): all spatial constants are multiplied by S=64/22≈2.909 so art
fills the same fraction of the canvas as before. CSS display sizes are unchanged — the browser
smooth-downscales from the higher-res source, giving richer anti-aliased edges.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "src" / "renderer" / "public" / "assets" / "spells"

# ── resolution constants ──────────────────────────────────────────────────────
W = 64           # sprite width/height in pixels
C = (W - 1) / 2  # = 31.5  sprite centre
S = W / 22       # ≈ 2.909 spatial scale factor

MOTE_W = 24      # mote icon size (3× their 8px origin for clean integer scale)
MOTE_C = (MOTE_W - 1) / 2  # = 11.5


# ── pixel canvas ────────────────────────────────────────────────────────────
class F:
    """A single frame: a w*h grid of palette indices (0 == transparent)."""
    __slots__ = ("w", "h", "px")

    def __init__(self, w: int, h: int):
        self.w, self.h = w, h
        self.px = bytearray(w * h)

    def set(self, x, y, idx):
        x = int(round(x)); y = int(round(y))
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[y * self.w + x] = idx

    def get(self, x, y):
        return self.px[y * self.w + x]


def H(s: str):
    s = s.lstrip("#")
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


# ── ordered dithering ──────────────────────────────────────────────────────
_BAYER = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]]

def dith(x: int, y: int, density: float) -> bool:
    return (_BAYER[int(y) % 4][int(x) % 4] + 0.5) / 16.0 < density


# ── primitives ─────────────────────────────────────────────────────────────
def disc(f: F, cx, cy, r, idx, density=1.0):
    r2 = r * r
    for y in range(int(cy - r) - 1, int(cy + r) + 2):
        for x in range(int(cx - r) - 1, int(cx + r) + 2):
            dx = x - cx; dy = y - cy
            if dx*dx + dy*dy <= r2 and (density >= 1.0 or dith(x, y, density)):
                f.set(x, y, idx)


def ring(f: F, cx, cy, r, idx, th=1.2, density=1.0):
    r0, r1 = r - th/2, r + th/2
    for y in range(int(cy - r - 1), int(cy + r + 2)):
        for x in range(int(cx - r - 1), int(cx + r + 2)):
            d = math.hypot(x - cx, y - cy)
            if r0 <= d <= r1 and (density >= 1.0 or dith(x, y, density)):
                f.set(x, y, idx)


def arc(f: F, cx, cy, r, a0, a1, idx, step=0.04):
    a = a0
    while a <= a1:
        f.set(cx + math.cos(a) * r, cy + math.sin(a) * r, idx)
        a += step


def line(f: F, x0, y0, x1, y1, idx):
    x0=int(round(x0)); y0=int(round(y0)); x1=int(round(x1)); y1=int(round(y1))
    dx=abs(x1-x0); dy=-abs(y1-y0)
    sx=1 if x0<x1 else -1; sy=1 if y0<y1 else -1
    err=dx+dy
    while True:
        f.set(x0, y0, idx)
        if x0==x1 and y0==y1: break
        e2=2*err
        if e2>=dy: err+=dy; x0+=sx
        if e2<=dx: err+=dx; y0+=sy


def cluster(f: F, cx, cy, pts, idx):
    for dx, dy in pts:
        f.set(cx + dx, cy + dy, idx)


def figure(f: F, x, y, idx, density=1.0, sc=1):
    """Humanoid silhouette; sc scales the point offsets for higher-res canvases."""
    pts = [(0,-2),(0,-1),(-1,-1),(1,-1),(-1,0),(0,0),(1,0),(0,1),(-1,2),(1,2)]
    for bdx, bdy in pts:
        px, py = x + bdx*sc, y + bdy*sc
        if density >= 1.0 or dith(int(px), int(py), density):
            f.set(px, py, idx)


def glyph_z(f: F, x, y, idx, s=3):
    for dx in range(s):
        f.set(x + dx, y, idx)
        f.set(x + dx, y + s - 1, idx)
    for k in range(s):
        f.set(x + (s - 1 - k), y + k, idx)


def heart(f: F, x, y, idx, sc=1):
    pts = [(-1,-1),(1,-1),(-2,0),(-1,0),(0,0),(1,0),(2,0),(-1,1),(0,1),(1,1),(0,2)]
    for bdx, bdy in pts:
        f.set(x + bdx*sc, y + bdy*sc, idx)


def spark(f: F, x, y, idx, size=2):
    for k in range(-size, size + 1):
        f.set(x + k, y, idx)
        f.set(x, y + k, idx)


# ── GIF writer ─────────────────────────────────────────────────────────────
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


T = (0, 0, 0)  # index 0 — transparent


# =============================================================================
#  AURA / BUFF  (64x64, 8f loop)
# =============================================================================
def d_defense(f, i, N):
    ph = 2 * math.pi * i / N
    r = (8 + 0.9 * math.sin(ph)) * S
    ring(f, C, C, r, 2, th=1.6*S)
    ring(f, C, C, r - 2.5*S, 1, th=1.0*S, density=0.5)
    arc(f, C, C, r, ph, ph + 1.4, 3)
PAL_defense = [T, H("5a8fd6"), H("9ecbff"), H("d7e9ff")]


def d_damage(f, i, N):
    ph = 2 * math.pi * i / N
    pulse = 0.5 + 0.5 * math.sin(ph)
    dirs = [(0,-1),(1,-1),(1,0),(1,1),(0,1),(-1,1),(-1,0),(-1,-1)]
    for k, (dx, dy) in enumerate(dirs):
        nx = dx / math.hypot(dx, dy); ny = dy / math.hypot(dx, dy)
        L = (8 + (1.5 if k % 2 == 0 else 0) + pulse * 1.5) * S
        s0 = int(2 * S)
        for s in range(s0, int(L)):
            idx = 3 if s >= int(L)-int(2*S) else (2 if s >= int(L)-int(4*S) else 1)
            f.set(C + nx * s, C + ny * s, idx)
    a = ph
    for s in range(int(2*S), int(9*S)):
        f.set(C + math.cos(a)*s, C + math.sin(a)*s, 3)
    disc(f, C, C, 1.6*S, 2)
PAL_damage = [T, H("c01818"), H("ff5a2a"), H("ffb24a")]


def d_speed(f, i, N):
    off = (i / N) * 7 * S
    rows_y = [int(4*S), int(9*S), int(14*S), int(18*S)]
    seg_w = 7 * S
    wrap = 28 * S
    for y in rows_y:
        for seg in range(-1, 5):
            x0 = (seg * seg_w - off) % wrap - 3*S
            line(f, x0, y, x0 + 4*S, y, 2)
            f.set(x0 + 5*S, y, 3)
            f.set(x0 + 6*S, y, 1)
PAL_speed = [T, H("8fd0f0"), H("bfe8ff"), H("eaffff")]


def d_heal(f, i, N):
    ph = 2 * math.pi * i / N
    r = (4.5 + 1.5 * (0.5 + 0.5 * math.sin(ph))) * S
    disc(f, C, C, r, 1, density=0.55)
    disc(f, C, C, r - 1.5*S, 2, density=0.7)
    disc(f, C, C, 2*S, 3)
    for j in range(3):
        t = (i / N + j / 3) % 1.0
        y = (16 - t * 12) * S
        x = (7 + j * 4) * S
        if t < 0.85:
            f.set(x, y, 3)
PAL_heal = [T, H("8ff08a"), H("e9ffb0"), H("ffe79a")]


def d_holy(f, i, N):
    for j in range(5):
        t = (i / N + j / 5) % 1.0
        y = (19 - t * 17) * S
        x = (4 + j * 3 + (j % 2)) * S
        idx = 3 if y < 7*S else (2 if y < 13*S else 1)
        f.set(x, y, idx)
        if y < 9*S:
            f.set(x, y - S, 3)
    for x in range(int(8*S), int(14*S)):
        if dith(x, int(2*S), 0.6):
            f.set(x, int(2*S), 3)
PAL_holy = [T, H("d9a93a"), H("ffe79a"), H("fff4cf")]


def d_frost(f, i, N):
    dens = 0.25 + 0.75 * (0.5 + 0.5 * math.cos(2 * math.pi * i / N))
    spokes = [(0,-1),(1,0),(0,1),(-1,0),(0.707,0.707),(-0.707,-0.707),
              (0.707,-0.707),(-0.707,0.707)]
    L = int((2 + 6 * dens) * S)
    for sx, sy in spokes:
        nd = math.hypot(sx, sy)
        nx, ny = sx/nd, sy/nd
        for k in range(1, L):
            f.set(C + nx*k, C + ny*k, 2 if k > int(2*S) else 1)
    disc(f, C, C, 1.6*S, 3)
PAL_frost = [T, H("6fb8e0"), H("9fe6ff"), H("d6f7ff")]


def d_mirror(f, i, N):
    base = (2 * math.pi / 3) * (i / N)
    for k in range(3):
        a = base + k * (2 * math.pi / 3)
        x, y = C + math.cos(a) * 6*S, C + math.sin(a) * 6*S
        figure(f, x, y, 1, sc=S)
        f.set(x, y - 2*S, 2)
PAL_mirror = [T, H("9a8ff0"), H("d4ccff")]


def d_weapon(f, i, N):
    line(f, 5*S, 17*S, 16*S, 6*S, 1)
    line(f, 5*S, 18*S, 16*S, 7*S, 1)
    line(f, 16*S, 6*S, 18*S, 4*S, 2)
    t = i / N
    sx = (5 + t * 11) * S; sy = (17 - t * 11) * S
    disc(f, sx, sy, S*0.6, 3)
    disc(f, sx - S, sy + S, S*0.4, 2)
PAL_weapon = [T, H("8a78c0"), H("d7e9ff"), H("ffffff")]


# =============================================================================
#  AURA / DEBUFF  (64x64, 8f loop)
# =============================================================================
def d_marked(f, i, N):
    ph = 2 * math.pi * i / N
    pulse = 0.5 + 0.5 * math.sin(ph)
    ring(f, C, C, 8*S, 1, th=1.2*S)
    ring(f, C, C, (4 + pulse)*S, 2, th=1.0*S)
    for k in range(4):
        a = ph + k * (math.pi / 2)
        line(f, C + math.cos(a)*6*S, C + math.sin(a)*6*S,
             C + math.cos(a)*9.5*S, C + math.sin(a)*9.5*S, 2)
    disc(f, C, C, S*0.5, 2)
PAL_marked = [T, H("ff4040"), H("ffd0d0")]


def d_paralyzed(f, i, N):
    specks = [(6,5),(15,7),(8,14),(16,15),(5,11),(13,11),(10,4),(11,17)]
    for sx, sy in specks:
        disc(f, sx*S, sy*S, 1.5*S, 1)
    sweep = int((i / N) * W)
    ystep = max(1, int(3*S))
    for y in range(W):
        x = sweep - (y // ystep)
        if 0 <= x < W and dith(x, y, 0.5):
            f.set(x, y, 2)
PAL_paralyzed = [T, H("8fcfe6"), H("e6fbff")]


def d_slowed(f, i, N):
    for k in range(2):
        t = (i / N + k / 2) % 1.0
        r = (1 + t * 9) * S
        idx = 2 if t < 0.5 else 1
        ring(f, C, C, r, idx, th=1.2*S, density=0.85 - t * 0.5)
PAL_slowed = [T, H("8a8aa6"), H("c8c8e0")]


def d_frightened(f, i, N):
    ph = 2 * math.pi * i / N
    bases = [(4,21),(11,21),(18,21),(8,21),(15,21)]
    for j, (bx, by) in enumerate(bases):
        bx2, by2 = bx*S, by*S
        h = int((9 + (j % 2) * 3) * S)
        for k in range(h):
            x = bx2 + math.sin(ph + j*1.3 + k*0.5/S) * 1.6*S * (k/h)
            f.set(x, by2 - k, 1)
            if k >= h - int(2*S):
                f.set(x, by2 - k, 2)
    jit = int(round(math.sin(ph) * 1.5*S))
    for fx in (int(2*S), int(19*S)):
        line(f, fx+jit, int(4*S), fx+jit, int(8*S), 2)
PAL_frightened = [T, H("332838"), H("8a7a9a")]


def d_charmed(f, i, N):
    for j in range(3):
        t = (i / N + j / 3) % 1.0
        y = (17 - t * 13) * S
        x = (6 + j * 5) * S
        idx = 2 if t > 0.6 else 1
        if t < 0.9:
            heart(f, x, y, idx, sc=round(S))
PAL_charmed = [T, H("ff8fd0"), H("c060d0")]


def d_illuminated(f, i, N):
    ph = 2 * math.pi * i / N
    dens = 0.45 + 0.4 * (0.5 + 0.5 * math.sin(ph))
    b1, b2 = int(S), int(2*S)
    e2 = W - 1 - b1; e1 = W - 1 - b2
    for x in range(b1, W - b1):
        for y in (b1, b2, e1, e2):
            if dith(x, y, dens):
                f.set(x, y, 1 if (x + y) % 2 else 2)
    for y in range(b1, W - b1):
        for x in (b1, b2, e1, e2):
            if dith(x, y, dens):
                f.set(x, y, 1 if (x + y) % 2 else 2)
PAL_illuminated = [T, H("c79fff"), H("e9d6ff")]


def d_transformed(f, i, N):
    for k in range(5):
        a = k * (2 * math.pi / 5)
        rr = (5 + 2.2 * math.sin(2 * math.pi * i / N + k)) * S
        bx = C + math.cos(a) * 3*S
        by = C + math.sin(a) * 3*S
        disc(f, bx, by, rr * 0.5, 1, density=0.8)
        disc(f, bx, by, rr * 0.3, 2)
PAL_transformed = [T, H("78b85a"), H("b0e0a0")]


def d_blinded(f, i, N):
    arc(f, C, C + S, 5*S, math.pi*0.15, math.pi*0.85, 2)
    for k in range(int(-3*S), int(4*S)):
        f.set(C + k, C + 4*S, 2)
    f.set(C - 3*S, C + 5*S, 1); f.set(C - 4*S, C + 6*S, 1)
    f.set(C + 3*S, C + 5*S, 1); f.set(C + 4*S, C + 6*S, 1)
    sweep = (i / N) * (30*S) - 5*S
    for y in range(W):
        bx = int(sweep + y * 0.5)
        for xx in (bx, bx + 1):
            if 0 <= xx < W and dith(xx, y, 0.55):
                f.set(xx, y, 1)
PAL_blinded = [T, H("6a6a6a"), H("d2d2d2")]


def d_asleep(f, i, N):
    for j in range(3):
        t = (i / N + j / 3) % 1.0
        y = (16 - t * 13) * S
        x = (6 + j * 4) * S
        s = max(3, int((2 + j) * S))
        if t < 0.9:
            glyph_z(f, x, y, 2 if t > 0.5 else 1, s=s)
PAL_asleep = [T, H("8f9fd6"), H("cfd8ff")]


def d_banished(f, i, N):
    ph = 2 * math.pi * i / N
    ring(f, C, C, 8*S, 1, th=1.4*S)
    arc(f, C, C, 8*S, ph, ph + 2.2, 2)
    dens = 0.7 * (0.5 + 0.5 * math.cos(ph))
    figure(f, C, C + S, 2, density=dens, sc=S)
PAL_banished = [T, H("6a3fd0"), H("c4a0ff")]


def d_restrain(f, i, N):
    """Shaky black tendrils anchored on the rim, curling inward."""
    ph = 2 * math.pi * i / N
    for k in range(8):
        a0 = k * (2 * math.pi / 8)
        seg = 8
        for s in range(seg):
            t = s / (seg - 1)
            r = (10.0 - t * 8.0) * S
            a = a0 + t * 1.2 + math.sin(ph + k + s * 0.7) * 0.22 * t
            idx = 2 if s >= seg - 2 else 1
            f.set(C + math.cos(a) * r, C + math.sin(a) * r, idx)
PAL_restrain = [T, H("33303a"), H("8a8298")]


# =============================================================================
#  EFFECTS / TERRAIN  (64x64, 8f loop)
# =============================================================================
def d_vines(f, i, N):
    ph = 2 * math.pi * i / N
    bases = [(3,21),(9,21),(15,21),(20,21)]
    grow = 0.6 + 0.4 * (0.5 + 0.5 * math.sin(ph))
    leaf_step = max(1, int(3*S))
    for bx, by in bases:
        bx2, by2 = bx*S, by*S
        h = int(13 * grow * S)
        x = bx2
        for k in range(h):
            x = bx2 + math.sin(ph + k/S * 0.5 + bx) * 1.6*S
            f.set(x, by2 - k, 1)
            if k % leaf_step == 0:
                f.set(x + 1, by2 - k, 2)
PAL_vines = [T, H("5fae3f"), H("7a5230")]


def d_spikes(f, i, N):
    ph = 2 * math.pi * i / N
    grow = 0.5 + 0.5 * (0.5 + 0.5 * math.sin(ph))
    step = max(1, int(4*S))
    for bx in range(int(2*S), W - int(S), step):
        h = int((6 + 5 * grow) * S)
        sway = math.sin(ph + bx/S) * 0.8*S
        for k in range(h):
            w = (h - k) // 3
            xx = bx + sway * (k / h)
            for dx in range(-w, w + 1):
                f.set(xx + dx, W - 1 - k, 1 if abs(dx) == w else 2)
PAL_spikes = [T, H("8a7a5a"), H("b6b6b6")]


def d_fog(f, i, N):
    off = (i / N) * W
    freq = 1.0 / S
    for y in range(W):
        for x in range(W):
            v = math.sin((x + off) * 0.5 * freq) + math.cos((y - off * 0.5) * 0.4 * freq)
            d = 0.5 + 0.28 * v
            if dith(x, y, max(0, min(1, d)) * 0.75):
                f.set(x, y, 1 if v < 0 else 2)
PAL_fog = [T, H("9a9aa6"), H("c8c8d2")]


def d_darkness(f, i, N):
    ph = 2 * math.pi * i / N
    disc(f, C, C, 9.5*S, 1)
    arc(f, C, C, 9.5*S, ph, ph + 1.0, 2)
    arc(f, C, C, 9.5*S, ph + math.pi, ph + math.pi + 1.0, 2)
PAL_darkness = [T, H("0a0a12"), H("3a3a4a")]


def d_silence(f, i, N):
    ph = 2 * math.pi * i / N
    ring(f, C, C, 9*S, 1, th=1.6*S, density=0.4)
    a = ph
    for k in range(5):
        aa = a + k * 0.18
        f.set(C + math.cos(aa) * 9*S, C + math.sin(aa) * 9*S, 2)
PAL_silence = [T, H("9a9aa8"), H("dcdce6")]


def d_hypnotic(f, i, N):
    ph = 2 * math.pi * i / N
    cols = [1, 2, 3, 4]
    for arm in (0.0, math.pi):
        prev = None
        a = 0.0
        while a < 6.0:
            r = (1 + a * 1.6) * S
            if r > C + 0.5:
                break
            x = C + math.cos(a + ph + arm) * r
            y = C + math.sin(a + ph + arm) * r
            idx = cols[int(r / S) % len(cols)]
            if prev:
                line(f, prev[0], prev[1], x, y, idx)
            prev = (x, y)
            a += 0.4
PAL_hypnotic = [T, H("ff5a8a"), H("ffd24a"), H("5ad6ff"), H("a05aff")]


def d_illusion(f, i, N):
    ph = 2 * math.pi * i / N
    freq = 1.0 / S
    for y in range(W):
        shift = math.sin(ph + y * 0.6 * freq) * 1.8*S
        for x in range(int(2*S), W - int(2*S), max(1, int(2*S))):
            xx = x + shift
            if dith(int(xx), y, 0.3):
                f.set(xx, y, 1 if y % 2 else 2)
PAL_illusion = [T, H("c2c2e0"), H("e2e2f4")]


# =============================================================================
#  EFFECTS / HEAL
# =============================================================================
def d_heal_pulse(f, i, N):
    t = i / (N - 1)
    r = (1 + t * 8) * S
    ring(f, C, C, r, 1, th=1.4*S, density=1 - t * 0.6)
    disc(f, C, C, max(0.5, (3 - t*3)*S), 3)
    for j in range(4):
        y = C - t*9*S - j*S
        f.set(C - 3*S + j*2*S, y, 2)
PAL_heal_pulse = [T, H("8ff08a"), H("e9ffb0"), H("ffe79a")]


def d_heal_wave(f, i, N):
    for k in range(2):
        t = (i / N + k / 2) % 1.0
        r = (1 + t * 9.5) * S
        ring(f, C, C, r, 1 if k else 2, th=1.4*S, density=0.9 - t*0.55)
    disc(f, C, C, 2*S, 3)
PAL_heal_wave = [T, H("8ff08a"), H("c8ffa0"), H("ffe79a")]


def d_restoration(f, i, N):
    t = i / (N - 1)
    flash = max(0.0, 1 - t * 1.4)
    disc(f, C, C, (2 + flash*7)*S, 3, density=flash)
    ring(f, C, C, (4 + t*5)*S, 2, th=1.2*S, density=1 - t)
    for j in range(4):
        x = (5 + j * 4) * S
        y = ((4 + t*14 + j*2) % 22) * S
        f.set(x, y, 1)
PAL_restoration = [T, H("c8a83a"), H("ffe79a"), H("ffffff")]


def d_revive(f, i, N):  # 64x128
    t = i / (N - 1)
    bx = W // 2
    beam_h = int((4 + t * 30) * S)
    hw = max(1, round(S * 0.55))
    for y in range(beam_h):
        for dx_off in range(-hw, hw + 1):
            if dith(bx + dx_off, y, 1 - y / (W*2)):
                f.set(bx + dx_off, y, 2)
        f.set(bx, y, 3)
    sy = (38 - t * 6) * S
    figure(f, bx, sy, 1, density=0.9, sc=S)
    if t > 0.5:
        ring(f, bx, sy + 2*S, (4 + (t-0.5)*6)*S, 2, th=1.0*S, density=0.6)
PAL_revive = [T, H("c8a83a"), H("ffe79a"), H("fffbe6")]


# =============================================================================
#  EFFECTS / VANISH
# =============================================================================
def _silhouette_dissolve(f, t):
    figure(f, C, C, 2, density=max(0.0, 1 - t), sc=S)
    n = int(t * 10)
    for j in range(n):
        a = j * 2.39996
        rr = (2 + t * 9) * S
        x = C + math.cos(a) * rr
        y = C + math.sin(a) * rr - t * 3*S
        f.set(x, y, 1)


def d_fade_out(f, i, N):
    _silhouette_dissolve(f, i / (N - 1))
PAL_fade = [T, H("c8c8d4"), H("9a9aa6")]


def d_fade_in(f, i, N):
    _silhouette_dissolve(f, 1 - i / (N - 1))


def d_silver_mist(f, i, N):
    off = (i / N) * W
    freq = 1.0 / S
    for y in range(W):
        for x in range(W):
            v = math.sin((x + off) * 0.55 * freq) + math.cos((y + off*0.6) * 0.45 * freq)
            if dith(x, y, max(0, 0.45 + 0.3 * v) * 0.7):
                f.set(x, y, 1 if v > 0 else 2)
PAL_silver_mist = [T, H("d2d2dc"), H("a6a6b4")]


def d_purple_warp(f, i, N):
    ph = 2 * math.pi * i / N
    pS = max(1, int(S))
    for r in range(1, int(10*S)):
        a = ph - (r / S) * 0.6
        idx = 2 if (r // pS) % 2 else 1
        f.set(C + math.cos(a)*r, C + math.sin(a)*r, idx)
        f.set(C + math.cos(a+math.pi)*r, C + math.sin(a+math.pi)*r, idx)
    disc(f, C, C, 1.5*S, 3)
PAL_purple_warp = [T, H("7a30c0"), H("b46cff"), H("e6c8ff")]


# =============================================================================
#  EFFECTS / COUNTER
# =============================================================================
def d_counter_beam(f, i, N):
    t = i / (N - 1)
    y = int(C)
    tip = int((2 + t * 17) * S)
    hw = max(1, round(S * 0.55))
    for x in range(int(2*S), tip):
        for dy in range(-hw, hw + 1):
            f.set(x, y + dy, 2 if abs(dy) < hw else 1)
        f.set(x, y, 3)
    if t > 0.55:
        for a in range(0, 360, 45):
            rr = (t - 0.55) * 10 * S
            f.set(tip + math.cos(math.radians(a))*rr,
                  y + math.sin(math.radians(a))*rr, 3)
PAL_counter_beam = [T, H("5a9fd6"), H("bfe8ff"), H("ffffff")]


def d_incoming(f, i, N):
    ph = 2 * math.pi * i / N
    disc(f, C, C, (3 + 0.6*math.sin(ph))*S, 1)
    disc(f, C, C, 1.8*S, 3)
    for k in range(5):
        a = ph + k * (2 * math.pi / 5)
        rr = (6 + math.sin(ph*2 + k)) * S
        f.set(C + math.cos(a)*rr, C + math.sin(a)*rr, 2)
PAL_incoming = [T, H("7a30c0"), H("c060ff"), H("e6c8ff")]


# =============================================================================
#  EFFECTS / SUMMON  (GIF idle loops only)
# =============================================================================
def d_spiritual_weapon(f, i, N):
    ph = 2 * math.pi * i / N
    a = ph
    hx, hy = C + math.cos(a)*5*S, C + math.sin(a)*5*S
    tx = C + math.cos(a)*5*S - math.cos(a)*7*S
    ty = C + math.sin(a)*5*S - math.sin(a)*7*S
    line(f, hx, hy, tx, ty, 2)
    disc(f, tx, ty, S*0.6, 3)
    px, py = -math.sin(a), math.cos(a)
    line(f, hx - px*2*S, hy - py*2*S, hx + px*2*S, hy + py*2*S, 1)
PAL_spiritual_weapon = [T, H("6a9fd0"), H("bfe0ff"), H("ffffff")]


def d_mage_hand(f, i, N):
    ph = 2 * math.pi * i / N
    cy = C + math.sin(ph) * 1.6*S
    disc(f, C, cy + S, 3*S, 1, density=0.7)
    disc(f, C, cy + S, 2.2*S, 2, density=0.6)
    step = max(1, int(S))
    for dx in range(int(-2*S), int(3*S), step):
        f.set(C + dx, cy - 2*S, 1)
        f.set(C + dx, cy - 3*S, 2 if (dx // step) % 2 == 0 else 0)
PAL_mage_hand = [T, H("9ad0e6"), H("d6f4ff")]


def d_unseen_servant(f, i, N):
    for k in range(3):
        r = ((i/N + k/3) % 1.0) * 9*S + S
        ring(f, C, C, r, 1 if k % 2 else 2, th=1.0*S, density=0.5)
PAL_unseen_servant = [T, H("c2c2d0"), H("e4e4f0")]


# =============================================================================
#  ICONS  (GIFs)
# =============================================================================
def d_mote_warm(f, i, N):
    cy = MOTE_C + math.sin(2 * math.pi * i / N) * 3.0
    disc(f, MOTE_C, cy, 4.8, 1, density=0.7)
    disc(f, MOTE_C, cy, 2.7, 2)
PAL_mote_warm = [T, H("ff9a30"), H("ffe07a")]


def d_mote_cool(f, i, N):
    cy = MOTE_C + math.sin(2 * math.pi * i / N) * 3.0
    disc(f, MOTE_C, cy, 4.8, 1, density=0.7)
    disc(f, MOTE_C, cy, 2.7, 2)
PAL_mote_cool = [T, H("5ac0ff"), H("c8b0ff")]


def d_flourish(f, i, N):
    t = i / (N - 1)
    rr = (1 + t * 8) * S
    fade = 1 - t
    for a in (0, 90, 180, 270):
        x = C + math.cos(math.radians(a)) * rr
        y = C + math.sin(math.radians(a)) * rr
        disc(f, x, y, S*0.6, 2 if fade > 0.4 else 1)
    for a in (45, 135, 225, 315):
        x = C + math.cos(math.radians(a)) * rr * 0.7
        y = C + math.sin(math.radians(a)) * rr * 0.7
        disc(f, x, y, S*0.5, 1)
    if t < 0.4:
        disc(f, C, C, 1.5 * fade * 2 * S, 3)
PAL_flourish = [T, H("c89aff"), H("e9d6ff"), H("ffffff")]


# ── manifest ──────────────────────────────────────────────────────────────────
# (rel_path, size, n_frames, loop, duration_ms, palette, draw_fn)
MANIFEST = [
    # aura / buff
    ("aura/buff/defense_aura.gif",      (W, W), 8, 0, 100, PAL_defense,  d_defense),
    ("aura/buff/damage_aura.gif",       (W, W), 8, 0, 100, PAL_damage,   d_damage),
    ("aura/buff/speed_aura.gif",        (W, W), 8, 0,  90, PAL_speed,    d_speed),
    ("aura/buff/heal_aura.gif",         (W, W), 8, 0, 110, PAL_heal,     d_heal),
    ("aura/buff/holy_aura.gif",         (W, W), 8, 0, 110, PAL_holy,     d_holy),
    ("aura/buff/frost_aura.gif",        (W, W), 8, 0, 110, PAL_frost,    d_frost),
    ("aura/buff/mirror_aura.gif",       (W, W), 8, 0, 110, PAL_mirror,   d_mirror),
    ("aura/buff/weapon_glow_aura.gif",  (W, W), 8, 0, 100, PAL_weapon,   d_weapon),
    # aura / debuff
    ("aura/debuff/marked_aura.gif",     (W, W), 8, 0, 100, PAL_marked,     d_marked),
    ("aura/debuff/paralyzed_aura.gif",  (W, W), 8, 0, 120, PAL_paralyzed,  d_paralyzed),
    ("aura/debuff/slowed_aura.gif",     (W, W), 8, 0, 130, PAL_slowed,     d_slowed),
    ("aura/debuff/frightened_aura.gif", (W, W), 8, 0,  90, PAL_frightened, d_frightened),
    ("aura/debuff/charmed_aura.gif",    (W, W), 8, 0, 110, PAL_charmed,    d_charmed),
    ("aura/debuff/illuminated_aura.gif",(W, W), 8, 0, 110, PAL_illuminated,d_illuminated),
    ("aura/debuff/transformed_aura.gif",(W, W), 8, 0, 110, PAL_transformed,d_transformed),
    ("aura/debuff/blinded_aura.gif",    (W, W), 8, 0, 110, PAL_blinded,    d_blinded),
    ("aura/debuff/asleep_aura.gif",     (W, W), 8, 0, 130, PAL_asleep,     d_asleep),
    ("aura/debuff/banished_aura.gif",   (W, W), 8, 0, 110, PAL_banished,   d_banished),
    ("aura/debuff/restrain_aura.gif",   (W, W), 8, 0, 110, PAL_restrain,   d_restrain),
    # effects / terrain
    ("effects/terrain/vines_grasping.gif",  (W, W), 8, 0, 110, PAL_vines,    d_vines),
    ("effects/terrain/spikes_thorns.gif",   (W, W), 8, 0, 120, PAL_spikes,   d_spikes),
    ("effects/terrain/fog_cloud.gif",       (W, W), 8, 0, 130, PAL_fog,      d_fog),
    ("effects/terrain/darkness_sphere.gif", (W, W), 8, 0, 120, PAL_darkness, d_darkness),
    ("effects/terrain/silence_dome.gif",    (W, W), 8, 0, 120, PAL_silence,  d_silence),
    ("effects/terrain/hypnotic_swirl.gif",  (W, W), 8, 0, 100, PAL_hypnotic, d_hypnotic),
    ("effects/terrain/illusion_shimmer.gif",(W, W), 8, 0, 120, PAL_illusion, d_illusion),
    # effects / heal
    ("effects/heal/heal_pulse.gif",       (W,   W),   6, None, 84, PAL_heal_pulse,  d_heal_pulse),
    ("effects/heal/heal_wave.gif",        (W,   W),   8, 0,   100, PAL_heal_wave,   d_heal_wave),
    ("effects/heal/restoration_cleanse.gif",(W, W),   6, None, 84, PAL_restoration, d_restoration),
    ("effects/heal/revive_beam.gif",      (W, W*2),   8, None, 88, PAL_revive,      d_revive),
    # effects / vanish
    ("effects/vanish/fade_out.gif",    (W, W), 6, None, 50, PAL_fade,        d_fade_out),
    ("effects/vanish/fade_in.gif",     (W, W), 6, None, 50, PAL_fade,        d_fade_in),
    ("effects/vanish/silver_mist.gif", (W, W), 8, 0,   90, PAL_silver_mist,  d_silver_mist),
    ("effects/vanish/purple_warp.gif", (W, W), 8, 0,  100, PAL_purple_warp,  d_purple_warp),
    # effects / counter
    ("effects/counter/counter_beam.gif",  (W, W), 8, None, 50, PAL_counter_beam, d_counter_beam),
    ("effects/counter/incoming_spell.gif",(W, W), 8, 0,    90, PAL_incoming,     d_incoming),
    # effects / summon (GIF idle loops)
    ("effects/summon/construct/spiritual_weapon.gif",(W, W), 8, 0, 110, PAL_spiritual_weapon, d_spiritual_weapon),
    ("effects/summon/spectral/mage_hand.gif",        (W, W), 8, 0, 120, PAL_mage_hand,        d_mage_hand),
    ("effects/summon/spirit/unseen_servant.gif",     (W, W), 8, 0, 120, PAL_unseen_servant,   d_unseen_servant),
    # icons
    ("icons/mote_warm.gif",      (MOTE_W, MOTE_W), 4, 0,   180, PAL_mote_warm,  d_mote_warm),
    ("icons/mote_cool.gif",      (MOTE_W, MOTE_W), 4, 0,   180, PAL_mote_cool,  d_mote_cool),
    ("icons/flourish_sparkle.gif",(W, W),           6, None, 67, PAL_flourish,   d_flourish),
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
    scale = 4  # 4× upscale (64px frames → 256px per cell)
    w, h = frames[0].w, frames[0].h
    gap = 2
    sheet = Image.new("RGBA", ((w*scale + gap) * len(frames) + gap, h*scale + gap*2),
                      (32, 32, 40, 255))
    for fi, fr in enumerate(frames):
        cell = _to_p(fr, pal).convert("RGBA")
        px = cell.load()
        raw = fr.px
        for y in range(h):
            for x in range(w):
                if raw[y * w + x] == 0:
                    px[x, y] = (0, 0, 0, 0)
        cell = cell.resize((w*scale, h*scale), Image.NEAREST)
        sheet.alpha_composite(cell, (gap + fi * (w*scale + gap), gap))
    out = ROOT / ".montage" / (rel.replace("/", "__") + ".png")
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)


def main():
    do_montage = "--montage" in sys.argv
    coalesced = []
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
        print(f"  ok  {rel:52s} {im.size[0]}x{im.size[1]}  {len(frames)}f"
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
