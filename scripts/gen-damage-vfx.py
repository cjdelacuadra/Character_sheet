#!/usr/bin/env python3
"""Generate per-damage-type spell VFX: missile, area loop, and hit impact.

For each of the 10 magic/elemental D&D damage types, writes three self-animating 22x22 GIFs:
    /assets/spells/missiles/magic/<type>.gif   the flying projectile (radial/spin: reads in any
                                               flight direction; CSS handles the travel)
    /assets/spells/animation/<type>.gif         the on-tile / AOE loop
    /assets/spells/hit/<type>_effect.gif        the hit burst
Plus the two generic result impacts the cleanup removed:
    /assets/spells/hit/Blood_Effect.gif         generic hit
    /assets/spells/miss/Poof_Effect.gif         generic miss (one-shot)

Run from repo root:
    python scripts/gen-damage-vfx.py            # generate + verify
    python scripts/gen-damage-vfx.py --montage  # also dump frame montages to .montage/

Shares pixel primitives with the aura generator via scripts/spritelib.py. Seamless loops:
motion is periodic in t = i/N. 1-bit transparency with ordered dithering for glows.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

from PIL import Image

from spritelib import F, H, dith, disc, ring, arc, line, save_gif, montage
from spritelib import T, DAMAGE_PALS as PALS

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "src" / "renderer" / "public" / "assets" / "spells"

W = 64
C = (W - 1) / 2   # = 31.5
S = W / 22         # ≈ 2.909 spatial scale factor

# Palettes (index 1 dark/base → 4 brightest) live in spritelib.DAMAGE_PALS — the generic
# core/halo logic below relies on that dark→bright ordering per type.

TYPES = ["fire", "cold", "lightning", "thunder", "acid",
         "poison", "necrotic", "radiant", "force", "psychic"]


# ── missiles ───────────────────────────────────────────────────────────────────
def draw_missile(f, i, N, t):
    ph = 2 * math.pi * i / N
    pulse = 0.5 + 0.5 * math.sin(ph)
    disc(f, C, C, (3.0 + 0.5 * pulse) * S, 1, density=0.5)
    disc(f, C, C, 2.1 * S, 2)
    disc(f, C, C, 1.1 * S, 4)

    if t == "fire":
        for k in range(6):
            a = ph + k * math.pi / 3
            ln = (3.5 + (0.5 + 0.5 * math.sin(ph * 2 + k)) * 2) * S
            f.set(C + math.cos(a) * ln, C + math.sin(a) * ln, 3)
    elif t == "cold":
        for k in range(4):
            a = ph * 0.3 + k * math.pi / 2
            for r_raw in (2, 3, 4):
                r = r_raw * S
                f.set(C + math.cos(a) * r, C + math.sin(a) * r, 4 if r_raw < 4 else 2)
    elif t == "lightning":
        a = ph
        prev = None
        for dx, dy in [(-4, -1), (-1, 1.5), (1, -1.5), (4, 1)]:
            rx = (dx * math.cos(a) - dy * math.sin(a)) * S
            ry = (dx * math.sin(a) + dy * math.cos(a)) * S
            if prev:
                line(f, C + prev[0], C + prev[1], C + rx, C + ry, 4)
            prev = (rx, ry)
    elif t == "thunder":
        ring(f, C, C, (3.0 + 0.6 * pulse) * S, 3, th=1.0*S)
        ring(f, C, C, (4.5 + 0.6 * pulse) * S, 2, th=1.0*S, density=0.6)
    elif t == "acid":
        for k in range(3):
            a = k * 2 * math.pi / 3 + ph
            f.set(C + math.cos(a) * 3.6*S, C + math.sin(a) * 3.6*S + S, 3)
    elif t == "poison":
        for dx, dy in [(-2, -1), (2, 0), (0, 2), (1, -2)]:
            disc(f, C + dx*S, C + dy*S, 1.2*S, 3)
        disc(f, C, C, 4.5*S, 1, density=0.2 + 0.3 * pulse)
    elif t == "necrotic":
        for k in range(2):
            a = ph + k * math.pi
            arc(f, C, C, 4*S, a, a + 1.2, 4)
    elif t == "radiant":
        for k in range(4):
            a = ph + k * math.pi / 2
            line(f, C + math.cos(a)*2*S, C + math.sin(a)*2*S,
                 C + math.cos(a)*5*S, C + math.sin(a)*5*S, 3)
    elif t == "force":
        prev = None
        for k in range(7):
            a = ph + k * math.pi / 3
            p = (C + math.cos(a) * 4*S, C + math.sin(a) * 4*S)
            if prev:
                line(f, prev[0], prev[1], p[0], p[1], 3)
            prev = p
    elif t == "psychic":
        prev = None; a = 0.0
        while a < 5:
            r = (1 + a * 0.8) * S
            if r > 5*S:
                break
            p = (C + math.cos(a + ph) * r, C + math.sin(a + ph) * r)
            if prev:
                line(f, prev[0], prev[1], p[0], p[1], 3)
            prev = p; a += 0.5


# ── area loops ───────────────────────────────────────────────────────────────
def draw_area(f, i, N, t):
    ph = 2 * math.pi * i / N
    freq = 1.0 / S  # spatial frequency: keeps patterns same coarseness relative to canvas
    if t == "fire":
        for bx_raw in (5, 10, 15):
            bx = bx_raw * S
            h = int((9 + (0.5 + 0.5 * math.sin(ph + bx_raw)) * 6) * S)
            for k in range(h):
                xx = bx + math.sin(ph*2 + k*freq*0.5 + bx_raw) * 1.2*S * (k/h)
                idx = 4 if k >= h - int(2*S) else (3 if k >= h - int(5*S) else 2)
                f.set(xx, W-1-k, idx)
                if k < h - int(5*S) and k % max(1, int(2*S)) == 0:
                    f.set(xx - S, W-1-k, 1)
    elif t == "cold":
        dens = 0.3 + 0.7 * (0.5 + 0.5 * math.cos(ph))
        L = int((2 + 7 * dens) * S)
        for dx, dy in [(0,-1),(1,0),(0,1),(-1,0),(0.7,0.7),(-0.7,-0.7),(0.7,-0.7),(-0.7,0.7)]:
            nd = math.hypot(dx, dy)
            nx, ny = dx/nd, dy/nd
            for k in range(1, L):
                f.set(C + nx*k, C + ny*k, 3 if k > int(2*S) else 2)
        disc(f, C, C, 1.6*S, 4)
        f.set(C + math.cos(ph)*5*S, C + math.sin(ph)*5*S, 4)
    elif t == "lightning":
        for arm in range(3):
            base = ph + arm * 2 * math.pi / 3
            x, y = C, C
            for k in range(6):
                a = base + math.sin(ph*2 + k) * 0.6 + k
                nx = x + math.cos(a) * 2*S
                ny = y + math.sin(a) * 2*S
                line(f, x, y, nx, ny, 3 if k % 2 else 2)
                x, y = nx, ny
        disc(f, C, C, 1.2*S, 4)
    elif t == "thunder":
        for k in range(2):
            tt = (i / N + k / 2) % 1.0
            ring(f, C, C, (1 + tt * 9.5)*S, 2 if k else 3, th=1.2*S, density=0.9 - tt * 0.5)
    elif t == "acid":
        for x in range(int(2*S), W - int(S)):
            for y in range(int(13*S), W - int(S)):
                if dith(x, y + int(math.sin(ph + x*freq)), 0.55):
                    f.set(x, y, 2 if (x + y) % 2 else 1)
        for k in range(3):
            tt = (i / N + k / 3) % 1.0
            bx = (5 + k * 5) * S
            by = (18 - tt * 7) * S
            f.set(bx, by, 3)
            if tt > 0.8:
                disc(f, bx, by, 1.2*S, 3)
    elif t == "poison":
        off = (i / N) * W
        for y in range(W):
            for x in range(W):
                v = math.sin((x + off) * 0.5*freq) + math.cos((y - off*0.5) * 0.4*freq)
                if dith(x, y, max(0.0, 0.4 + 0.28 * v) * 0.8):
                    f.set(x, y, 3 if v > 0.5 else (2 if v > -0.3 else 1))
    elif t == "necrotic":
        for arm in range(3):
            base = C + (arm - 1) * 5*S
            h = int(11 * S)
            for k in range(h):
                x = base + math.sin(ph + k*freq*0.5 + arm) * 1.8*S
                idx = 4 if k % max(1, int(4*S)) == 0 else (2 if k > int(6*S) else 1)
                f.set(x, W - 2*S - k, idx)
    elif t == "radiant":
        for k in range(8):
            a = ph * 0.5 + k * math.pi / 4
            L = (5 + 2 * (0.5 + 0.5 * math.sin(ph + k))) * S
            for r in range(int(2*S), int(L)):
                f.set(C + math.cos(a)*r, C + math.sin(a)*r, 4 if r >= int(L) - int(S) else 3)
        disc(f, C, C, 2*S, 4)
    elif t == "force":
        pulse = 0.5 + 0.5 * math.sin(ph)
        for ringr_raw, idx in ((7 + pulse, 2), (4, 3)):
            ringr = ringr_raw * S
            prev = None
            for k in range(7):
                a = ph + k * math.pi / 3
                p = (C + math.cos(a)*ringr, C + math.sin(a)*ringr)
                if prev:
                    line(f, prev[0], prev[1], p[0], p[1], idx)
                prev = p
    elif t == "psychic":
        for arm in (0.0, math.pi):
            prev = None; a = 0.0
            while a < 6:
                r = (1 + a * 1.5) * S
                if r > 10*S:
                    break
                p = (C + math.cos(a + ph + arm)*r, C + math.sin(a + ph + arm)*r)
                if prev:
                    line(f, prev[0], prev[1], p[0], p[1], 3 if int(r/S) % 2 else 2)
                prev = p; a += 0.45


# ── impacts (seamless throb / expanding rings) ──────────────────────────────────
def draw_impact(f, i, N, t):
    ph = 2 * math.pi * i / N
    g = 0.5 + 0.5 * math.sin(ph)

    if t in ("thunder", "force", "psychic"):
        for k in range(2):
            tt = (i / N + k / 2) % 1.0
            ring(f, C, C, (1 + tt * 9)*S, 3 if k else 2, th=1.3*S, density=1 - tt * 0.6)
        return

    disc(f, C, C, (2.5 + 3 * g)*S, 1, density=0.5)
    disc(f, C, C, (1.5 + 2.5 * g)*S, 2)
    disc(f, C, C, (1 + 1.2 * g)*S, 4)
    for k in range(3):
        a = ph + k * 2 * math.pi / 3
        f.set(C + math.cos(a)*(3 + 2*g)*S, C + math.sin(a)*(3 + 2*g)*S, 3)

    if t == "fire":
        for k in range(6):
            a = ph + k * math.pi / 3
            f.set(C + math.cos(a)*(4 + 3*g)*S, C + math.sin(a)*(4 + 3*g)*S, 3)
    elif t == "cold":
        for k in range(4):
            a = k * math.pi / 2 + ph * 0.2
            r = (3 + 4 * g) * S
            f.set(C + math.cos(a)*r, C + math.sin(a)*r, 3)
            f.set(C + math.cos(a)*(r - S), C + math.sin(a)*(r - S), 2)
    elif t == "lightning":
        if i % 2 == 0:
            for k in range(6):
                a = k * math.pi / 3 + ph
                line(f, C, C, C + math.cos(a)*(5 + 2*g)*S, C + math.sin(a)*(5 + 2*g)*S, 3)
    elif t == "acid":
        for k in range(5):
            a = k * 2 * math.pi / 5 + ph * 0.3
            r = (3 + 4 * g) * S
            f.set(C + math.cos(a)*r, C + math.sin(a)*r + S, 3)
    elif t == "poison":
        disc(f, C, C, (4 + 3 * g)*S, 3, density=0.4)
    elif t == "necrotic":
        ring(f, C, C, (8 - 5 * g)*S, 4, th=1.0*S, density=0.7)
    elif t == "radiant":
        for k in range(8):
            a = k * math.pi / 4 + ph * 0.3
            line(f, C, C, C + math.cos(a)*(5 + 3*g)*S, C + math.sin(a)*(5 + 3*g)*S,
                 4 if k % 2 else 3)


# ── generic result impacts ──────────────────────────────────────────────────────
def draw_blood(f, i, N):
    ph = 2 * math.pi * i / N
    g = 0.5 + 0.5 * math.sin(ph)
    disc(f, C, C, (2 + 1.5 * g)*S, 2)
    disc(f, C, C, 1.2*S, 3)
    for k in range(7):
        a = k * 2 * math.pi / 7 + ph
        r = (4 + 4 * g) * S
        f.set(C + math.cos(a)*r, C + math.sin(a)*r, 1 if k % 2 else 2)
        f.set(C + math.cos(a)*(r*0.6), C + math.sin(a)*(r*0.6), 2)


def draw_poof(f, i, N):  # one-shot: dust puff expands and fades
    tt = i / (N - 1)
    r = (2 + tt * 7) * S
    dens = (1 - tt) * 0.8
    disc(f, C, C, r, 1, density=dens * 0.7)
    disc(f, C, C, r * 0.6, 2, density=dens)
    if tt < 0.6:
        for k in range(6):
            a = k * math.pi / 3
            f.set(C + math.cos(a)*r, C + math.sin(a)*r, 3)


# ── manifest ────────────────────────────────────────────────────────────────────
# (rel_path, n_frames, loop, duration_ms, palette, draw_fn)
MANIFEST = []
for _t in TYPES:
    MANIFEST.append((f"missiles/magic/{_t}.gif", 8, 0, 70, PALS[_t], lambda f, i, N, t=_t: draw_missile(f, i, N, t)))
    MANIFEST.append((f"animation/{_t}.gif",      8, 0, 100, PALS[_t], lambda f, i, N, t=_t: draw_area(f, i, N, t)))
    MANIFEST.append((f"hit/{_t}_effect.gif",     6, 0, 90, PALS[_t], lambda f, i, N, t=_t: draw_impact(f, i, N, t)))
MANIFEST.append(("hit/Blood_Effect.gif", 6, 0, 90, PALS["blood"], draw_blood))
MANIFEST.append(("miss/Poof_Effect.gif", 6, None, 90, PALS["poof"], draw_poof))


def build(entry):
    rel, n, loop, dur, pal, draw = entry
    frames = []
    for i in range(n):
        fr = F(W, W)
        draw(fr, i, n)
        frames.append(fr)
    return rel, frames, pal, loop, dur


def main():
    do_montage = "--montage" in sys.argv
    coalesced = []
    for entry in MANIFEST:
        rel, frames, pal, loop, dur = build(entry)
        path = ASSETS / rel
        save_gif(path, frames, pal, dur, loop)
        with Image.open(path) as im:
            assert im.size == (W, W), f"{rel}: size {im.size}"
            n = getattr(im, "n_frames", 1)
        if do_montage:
            montage(frames, pal, ROOT / ".montage" / (rel.replace("/", "__") + ".png"))
        flag = "" if n == len(frames) else f"  <-- {n}f written (dead frame)"
        if n != len(frames):
            coalesced.append(rel)
        print(f"  ok  {rel:40s} {len(frames)}f  {'loop' if loop == 0 else 'once'}{flag}")
    print(f"\nGenerated {len(MANIFEST)} GIFs into {ASSETS}")
    if coalesced:
        print(f"COALESCED ({len(coalesced)}): " + ", ".join(coalesced))
    else:
        print("All frames distinct (no dead frames).")
    if do_montage:
        print(f"Montages in {ROOT / '.montage'}")


if __name__ == "__main__":
    main()
