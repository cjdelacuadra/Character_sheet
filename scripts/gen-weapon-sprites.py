#!/usr/bin/env python3
"""Generate the procedural weapon-progression inventory sprites (all of weapons.csv).

48x48 ornate fantasy / TTRPG icons. Weapons are drawn from reusable archetype functions
(blade, axe, hammer, polearm, bow, crossbow, thrown, whip, ...) parameterised per weapon, so
the whole catalogue is covered. Each weapon has a tier ladder (base -> +1/+2/+3, only the
tiers present in weapons.csv) that keeps the silhouette while gaining fullers, runes, gilded
fittings, gem pommels and a magical aura; every tier is then re-skinned with each of the 10
D&D damage-type enchantments as an edge-aware overlay so the base weapon stays readable.

Outputs (static 48x48 P-mode PNGs, index 0 transparent):
    /assets/weapons/<id>.png              plain tier
    /assets/weapons/<enchant>/<id>.png    enchanted tier (resolveWeaponSprite subdir layout)

Run from repo root:
    python scripts/gen-weapon-sprites.py            # generate + verify
    python scripts/gen-weapon-sprites.py --montage  # also dump upscaled previews to .montage/
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

from PIL import Image

from spritelib import (
    F, H, T, DAMAGE_PALS,
    dith, disc, ring, line, spark, cluster, box, edge_mask, outline,
    save_png, montage, _to_p,
)

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "src" / "renderer" / "public" / "assets"

S = 48          # icon canvas
CX = 24         # icon centre
INV = 0.70710678

OUT = 1
STEEL_D = 2;  STEEL_M = 3;  STEEL_H = 4;  STEEL_S = 5
WOOD_D  = 6;  WOOD_M  = 7;  WOOD_H  = 8
GOLD_D  = 9;  GOLD_M  = 10; GOLD_H  = 11
GLOW_F  = 12; GLOW_B  = 13
RUNE    = 14; CRYSTAL = 15
LEATH_D = 16; LEATH_M = 17
GEM     = 18; GEM_H   = 19

BASE_PAL = [
    T,
    H("120c08"),
    H("353d4a"), H("6b7689"), H("aab6c8"), H("f2f6ff"),
    H("2e1d10"), H("5a3c22"), H("8a6038"),
    H("6e4a12"), H("c8962e"), H("ffe07a"),
    H("9a86c0"), H("e6dcff"),
    H("86d8ff"), H("c2a0ff"),
    H("2a1a0e"), H("4a2f18"),
    H("d23a52"), H("ff8a9a"),
]

EN_D, EN_M, EN_H, EN_S = 20, 21, 22, 23
LIT = (STEEL_H, STEEL_S, WOOD_H, GOLD_H, GEM_H)


def enchant_pal(name):
    p = DAMAGE_PALS[name]
    return BASE_PAL + [p[1], p[2], p[3], p[4]]


# ── shared sub-helpers ──────────────────────────────────────────────────────────
def diag_blade(f, bx, by, length, hw, fuller=False, taper=6):
    dx, dy, px, py = INV, -INV, INV, INV
    for s in range(length):
        cx = bx + dx * s; cy = by + dy * s
        w = hw if s < length - taper else max(0, hw - (s - (length - taper)))
        for k in range(-w, w + 1):
            x = cx + px * k; y = cy + py * k
            if k == -w and w > 0:
                c = STEEL_S
            elif k < 0:
                c = STEEL_H
            elif k > 0:
                c = STEEL_D
            else:
                c = STEEL_D if (fuller and taper < s < length - taper) else STEEL_M
            f.set(x, y, c)


def wrapped_grip(f, bx, by, steps, dx, dy):
    for i in range(steps):
        f.set(bx + dx * i, by + dy * i, LEATH_M if i % 2 else LEATH_D)


def vhaft(f, top, bot, gx=24, finial=False, grip=True):
    box(f, gx - 1, top, gx + 1, bot, WOOD_M)
    box(f, gx - 1, top, gx - 1, bot, WOOD_H); box(f, gx + 1, top, gx + 1, bot, WOOD_D)
    if grip:
        for y in range(bot - 9, bot, 2):
            box(f, gx - 1, y, gx + 1, y, LEATH_M)
    if finial:
        box(f, gx - 1, top - 2, gx, top, STEEL_M); f.set(gx - 1, top - 3, STEEL_H)


def gem_pommel(f, px, py, tier):
    disc(f, px, py, 2, GOLD_M); f.set(px - 1, py - 1, GOLD_H)
    if tier >= 2:
        f.set(px, py, GEM); f.set(px - 1, py - 1, GEM_H)
    else:
        f.set(px, py, GOLD_D)
    if tier >= 3:
        cluster(f, px, py, [(0, -3), (3, 0), (-3, 0)], CRYSTAL)


# ── archetype: straight blade (sword family) ──────────────────────────────────────
def blade(f, tier, length=42, hw=2, guard="cross", base=(14, 33)):
    bx, by = base
    diag_blade(f, bx, by, length, hw, fuller=(tier >= 1))
    if guard == "swept":                                   # rapier swept hilt
        for k in range(-4, 4):
            f.set(bx - 1 + k * INV, by + 1 - k * 0.0, GOLD_M)
        for k in range(3):                                 # knuckle bow curl
            f.set(bx - 3 - k * INV, by + 1 + k, GOLD_M)
        f.set(bx - 4, by + 3, GOLD_H)
    else:
        gl = 6 if guard == "cross" else 3
        line(f, bx - gl * INV, by - gl * INV, bx + (gl - 2) * INV, by + (gl - 2) * INV, GOLD_M)
        f.set(bx - gl * INV, by - gl * INV, GOLD_H)
        if guard == "cross":
            f.set(bx - (gl + 1) * INV, by - (gl + 1) * INV, GOLD_H)
            f.set(bx + (gl - 1) * INV, by + (gl - 1) * INV, GOLD_M)
    steps = 5 if guard == "small" else 7
    wrapped_grip(f, bx, by, steps, -INV, INV)
    gem_pommel(f, bx - steps * INV, by + steps * INV, tier)
    if tier >= 2:
        for s in range(10, length - 6, 6):
            f.set(bx + s * INV, by - s * INV, RUNE)


def scimitar(f, tier):
    # crescent single-edged blade (part of a big circle), grip lower-left
    cxc, cyc, r = 5, 41, 35
    a = -0.95
    while a <= -0.32:
        for rr in (r - 2, r - 1, r):
            x = cxc + math.cos(a) * rr; y = cyc + math.sin(a) * rr
            f.set(x, y, STEEL_S if rr == r else (STEEL_M if rr == r - 1 else STEEL_D))
        a += 0.025
    bx = cxc + math.cos(-0.95) * r; by = cyc + math.sin(-0.95) * r
    line(f, bx - 3, by - 2, bx + 3, by + 2, GOLD_M); f.set(bx - 3, by - 2, GOLD_H)
    wrapped_grip(f, bx, by + 1, 6, -INV, INV)
    gem_pommel(f, bx - 5, by + 6, tier)


# ── archetype: axe (bearded single-bit, scalable) ──────────────────────────────────
def axe(f, tier, peak=41, cy=20, half=13, htop=2, hbot=46, pick=False, style="bearded"):
    vhaft(f, htop, hbot, finial=not pick)
    if pick:
        for j in range(15):                                # right pick spike
            hh = max(0, 2 - j // 5)
            box(f, 26 + j, cy - hh, 26 + j, cy + hh, STEEL_M)
        f.set(40, cy, STEEL_S)
        box(f, 18, cy - 2, 22, cy + 2, STEEL_M); f.set(18, cy - 2, STEEL_H)   # hammer poll
    elif style == "double":
        # asymmetric great-axe (BG style): big bit on the LEFT, smaller bit on the RIGHT
        for y in range(cy - 12, cy + 13):                  # big left bit (reaches far out)
            lo = int(round(5 + 0.0715 * (y - cy) ** 2))
            if lo >= 22:
                continue
            box(f, lo, y, 22, y, STEEL_M); f.set(lo, y, STEEL_H)
            if lo + 1 < 22:
                f.set(lo + 1, y, STEEL_S)
            box(f, 21, y, 22, y, STEEL_D)
        for y in range(cy - 8, cy + 9):                    # small right bit
            ex = int(round(34 - 0.107 * (y - cy) ** 2))
            if ex <= 26:
                continue
            box(f, 26, y, ex, y, STEEL_M); f.set(ex, y, STEEL_H)
            if ex - 1 > 26:
                f.set(ex - 1, y, STEEL_S)
            box(f, 26, y, 27, y, STEEL_D)
        for gy in (cy - 7, cy - 2, cy + 3, cy + 8):        # gold filigree on the big bit
            f.set(13, gy, GOLD_M); f.set(16, gy, GOLD_D)
    else:
        # bearded single-bit (handaxe / battleaxe)
        k = 13.0 / half
        for y in range(cy - half, cy + half + 1):
            ex = int(round(peak - 0.066 * k * (y - cy) ** 2))
            lx = 30 if y < cy - half + 3 else (26 if y <= cy + 6 else 26 + (y - (cy + 6)))
            if ex <= lx:
                continue
            box(f, lx, y, ex, y, STEEL_M); f.set(ex, y, STEEL_H)
            if ex - 1 > lx:
                f.set(ex - 1, y, STEEL_S)
            box(f, lx, y, min(lx + 1, ex), y, STEEL_D)
        for j in range(5):                                 # rear spike
            box(f, 22 - j, cy - 1 - j // 2, 22 - j, cy - 1 + (j + 1) // 2, STEEL_M)
    box(f, 21, cy + 5, 27, cy + 7, GOLD_M); f.set(21, cy + 5, GOLD_H)          # collar
    box(f, 24, cy - 6, 24, cy + 5, GOLD_D)                                     # centre langet
    if tier >= 1 and not pick and style != "double":
        for y in range(cy - half + 2, cy + half - 2, 3):
            ex = int(round(peak - 0.066 * (13.0 / half) * (y - cy) ** 2))
            if ex > 31:
                f.set(ex - 2, y, STEEL_S)
    if tier >= 3:
        cluster(f, 24, htop, [(0, 0), (-1, -1), (1, -1)], CRYSTAL)


# ── archetype: hammer / blunt ──────────────────────────────────────────────────────
def hammer(f, tier, head="block", scale=1.0, spike=False):
    cx, cy = 24, 13
    vhaft(f, 16, 44)
    if head in ("block", "wood"):
        w = int(round(6 * scale)); h = int(round(5 * scale))
        body = WOOD_M if head == "wood" else STEEL_M
        lit = WOOD_H if head == "wood" else STEEL_H
        drk = WOOD_D if head == "wood" else STEEL_D
        box(f, cx - w, cy - h, cx + w, cy + h, body)
        box(f, cx - w, cy - h, cx - w + 1, cy + h, lit); box(f, cx + w - 1, cy - h, cx + w, cy + h, drk)
        box(f, cx - w, cy - h, cx + w, cy - h + 1, STEEL_S if head != "wood" else WOOD_H)
        if head == "wood":
            for sx in (cx - 3, cx, cx + 3):
                f.set(sx, cy, STEEL_H)
        if spike:
            for j in range(4):
                box(f, cx + w + 1 + j, cy - 1, cx + w + 1 + j, cy + 1, STEEL_M)
            f.set(cx + w + 5, cy, STEEL_S)
    elif head == "flanged":
        disc(f, cx, cy, 4, STEEL_M); f.set(cx - 2, cy - 2, STEEL_S)
        for ang in range(0, 360, 45):
            a = math.radians(ang)
            f.set(cx + math.cos(a) * 6, cy + math.sin(a) * 6, STEEL_H)
            f.set(cx + math.cos(a) * 7, cy + math.sin(a) * 7, STEEL_S)
    elif head == "spikeball":
        disc(f, cx, cy, 5, STEEL_M); f.set(cx - 2, cy - 2, STEEL_H)
        for ang in range(0, 360, 45):
            a = math.radians(ang)
            f.set(cx + math.cos(a) * 7, cy + math.sin(a) * 7, STEEL_S)
            f.set(cx + math.cos(a) * 6, cy + math.sin(a) * 6, STEEL_H)
    elif head == "flail":
        for i in range(5):
            f.set(cx, 21 - i * 2, STEEL_M)                 # chain
        disc(f, cx + 2, 11, 4, STEEL_M); f.set(cx, 9, STEEL_H)
        for ang in range(0, 360, 60):
            a = math.radians(ang)
            f.set(cx + 2 + math.cos(a) * 6, 11 + math.sin(a) * 6, STEEL_S)
    box(f, cx - 2, cy + int(5 * scale) + 2, cx + 2, cy + int(5 * scale) + 3, GOLD_M)  # collar
    if tier >= 2:
        f.set(cx, cy, RUNE)


def club_studded(f, tier):
    box(f, 18, 6, 30, 24, WOOD_M)
    box(f, 18, 6, 20, 24, WOOD_H); box(f, 28, 6, 30, 24, WOOD_D)
    box(f, 21, 24, 27, 43, WOOD_M); box(f, 21, 24, 22, 43, WOOD_H); box(f, 26, 24, 27, 43, WOOD_D)
    f.set(23, 30, WOOD_D); f.set(26, 36, WOOD_D)
    box(f, 18, 9, 30, 10, STEEL_M); box(f, 18, 20, 30, 21, STEEL_M); f.set(18, 9, STEEL_H)
    for sx in (21, 24, 27):
        for sy in (14, 17):
            f.set(sx, sy, STEEL_H)
    for y in range(35, 43, 2):
        box(f, 21, y, 27, y, LEATH_M)


# ── archetype: polearm ──────────────────────────────────────────────────────────────
def polearm(f, tier, head="spear", top=4, bot=46, reinforced=False):
    cx = 24
    sh_top = top + (2 if head == "staff" else 10)
    box(f, cx - 1, sh_top, cx + 1, bot, WOOD_M)
    box(f, cx - 1, sh_top, cx - 1, bot, WOOD_H); box(f, cx + 1, sh_top, cx + 1, bot, WOOD_D)
    for y in range(bot - 9, bot, 2):
        box(f, cx - 1, y, cx + 1, y, LEATH_M)
    if head == "spear":
        for i in range(9):
            w = max(0, 3 - abs(i - 4))
            box(f, cx - w, top + i, cx + w, top + i, STEEL_M); f.set(cx - w, top + i, STEEL_H)
        f.set(cx, top - 1, STEEL_S); box(f, cx - 1, top + 9, cx + 1, top + 10, GOLD_M)
    elif head == "point":                                   # pike
        for i in range(6):
            w = max(0, 1 - abs(i - 3) // 2)
            box(f, cx - w, top + 4 + i, cx + w, top + 4 + i, STEEL_M)
        f.set(cx, top + 3, STEEL_S)
    elif head == "lance":
        for i in range(11):
            w = min(2, i // 3)                                    # point at TOP, widening down
            box(f, cx - w, top + i, cx + w, top + i, STEEL_M); f.set(cx - w, top + i, STEEL_H)
        f.set(cx, top - 1, STEEL_S)                              # sharp tip up
        box(f, cx - 3, top + 11, cx + 3, top + 12, GOLD_M)       # vamplate guard at the base
        f.set(cx - 3, top + 11, GOLD_H)
    elif head == "glaive":
        for i in range(13):
            x = cx + 1 + i // 3
            box(f, cx, top + i, x + 2, top + i, STEEL_M); f.set(x + 2, top + i, STEEL_S)
        box(f, cx - 1, top + 13, cx + 1, top + 14, GOLD_M)
    elif head == "halberd":
        for i in range(9):                                  # axe bit
            box(f, cx + 1, top + 3 + i, cx + 1 + (4 - abs(i - 4) + 3), top + 3 + i, STEEL_M)
        for i in range(6):
            f.set(cx, top + i, STEEL_M)                     # top spike
        f.set(cx, top - 1, STEEL_S)
        f.set(cx - 2, top + 6, STEEL_M); f.set(cx - 3, top + 7, STEEL_H)   # back hook
    elif head == "trident":
        # three flat blade-prongs (central longest), ridged + ornate gold base + gem
        def prong(x0, y0, x1, y1, n):
            for i in range(n):
                t = i / (n - 1); x = x0 + (x1 - x0) * t; y = y0 + (y1 - y0) * t
                w = 1 if i < n - 3 else 0
                box(f, x - w, y, x + w, y, STEEL_M)
                if w:
                    f.set(x - w, y, STEEL_H); f.set(x + w, y, STEEL_D)
            f.set(x1, y1 - 1, STEEL_S)
        prong(cx, top + 10, cx, top, 11)                # central blade (longest)
        prong(cx, top + 10, cx - 5, top + 2, 10)        # left blade, angled out
        prong(cx, top + 10, cx + 5, top + 2, 10)        # right blade, angled out
        box(f, cx - 4, top + 10, cx + 4, top + 11, GOLD_M); f.set(cx - 4, top + 10, GOLD_H)
        box(f, cx - 2, top + 12, cx + 2, top + 13, GOLD_D); f.set(cx, top + 12, GEM)
    elif head == "staff":
        box(f, cx - 1, top, cx + 1, top + 2, STEEL_M); f.set(cx - 1, top, STEEL_H)
        box(f, cx - 1, bot - 2, cx + 1, bot, STEEL_M)
    if reinforced:                                              # metal-banded / langeted shaft
        box(f, cx - 2, sh_top, cx + 2, sh_top + 1, GOLD_M); f.set(cx - 2, sh_top, GOLD_H)
        box(f, cx - 1, sh_top, cx - 1, bot - 11, GOLD_D)        # langet stripe down the shaft
        for y in range(sh_top + 4, bot - 10, 6):
            box(f, cx - 1, y, cx + 1, y, STEEL_M); f.set(cx - 1, y, STEEL_H)  # binding rings
    if tier >= 2:
        f.set(cx, top + 6, RUNE)


def sickle(f, tier):
    box(f, 20, 30, 22, 42, WOOD_M); box(f, 20, 30, 20, 42, WOOD_H)
    for y in range(37, 42, 2):
        box(f, 20, y, 22, y, LEATH_M)
    cxc, cyc, r = 6, 30, 18
    a = -0.95
    while a <= -0.15:
        for rr in (r - 1, r):
            x = cxc + math.cos(a) * rr; y = cyc + math.sin(a) * rr
            f.set(x, y, STEEL_S if rr == r else STEEL_M)
        a += 0.035


def whip(f, tier):
    box(f, 7, 30, 9, 42, LEATH_M); f.set(7, 30, LEATH_D)
    box(f, 7, 36, 9, 37, GOLD_M)
    prev = None
    for p in [(9, 30), (15, 25), (24, 23), (32, 17), (40, 12), (45, 5)]:
        if prev:
            line(f, prev[0], prev[1], p[0], p[1], LEATH_M)
            line(f, prev[0], prev[1] - 1, p[0], p[1] - 1, LEATH_D)
        prev = p
    f.set(45, 5, LEATH_D)


# ── archetype: ranged ────────────────────────────────────────────────────────────────
def bow(f, tier, long=False):
    def bez(p0, p1, p2, n=24):
        for i in range(n + 1):
            t = i / n; u = 1 - t
            yield (u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
                   u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1], t)

    if long:
        # single deep-curved frame (one continuous stave) + STRAIGHT string, no arrow
        tips = [(18, 3), (18, 45)]
        prev = None
        for x, y, t in bez(tips[0], (-6, 24), tips[1], 34):       # deep belly bow to the left
            if prev:
                line(f, prev[0], prev[1], x, y, WOOD_M)
            f.set(x - 1, y, WOOD_H); f.set(x + 1, y, WOOD_D)      # round the stave (~3px)
            prev = (x, y)
        line(f, tips[0][0], tips[0][1], tips[1][0], tips[1][1], STEEL_H)   # straight string
        box(f, 5, 21, 7, 27, LEATH_M); f.set(5, 21, LEATH_D)     # grip at the belly
    else:
        # recurve limbs + nocked arrow
        nock = (21, 24)
        tips = []
        for p0, p1, p2 in (((13, 23), (6, 13), (15, 5)), ((13, 25), (6, 35), (15, 43))):
            pts = list(bez(p0, p1, p2, 20)); tips.append((pts[-1][0], pts[-1][1]))
            prev = None
            for x, y, t in pts:
                if prev:
                    line(f, prev[0], prev[1], x, y, WOOD_M)
                prev = (x, y)
            for x, y, t in pts:
                f.set(x - 1, y, WOOD_H)
                if t < 0.55:
                    f.set(x + 1, y, WOOD_D)
        box(f, 12, 22, 14, 26, LEATH_M); f.set(12, 22, LEATH_D)
        line(f, tips[0][0], tips[0][1], nock[0], nock[1], STEEL_H)
        line(f, nock[0], nock[1], tips[1][0], tips[1][1], STEEL_H)
        line(f, nock[0], nock[1], 4, 24, WOOD_H)                  # arrow shaft
        f.set(3, 24, STEEL_S); f.set(4, 23, STEEL_H); f.set(4, 25, STEEL_H)
        f.set(nock[0] - 1, 22, GOLD_M); f.set(nock[0] - 1, 26, GOLD_M); f.set(nock[0], nock[1], STEEL_S)
    if tier >= 1:
        for tx, ty in tips:
            f.set(tx, ty, WOOD_H)
    if tier >= 2:
        for tx, ty in tips:
            f.set(tx, ty, GOLD_H)
        f.set(tips[0][0] - 1, 24, RUNE)
    if tier >= 3:
        cluster(f, tips[0][0] - 1, 24, [(0, -2), (0, 2), (-2, 0)], CRYSTAL)


def crossbow(f, tier, scale=1.0):
    arm = int(round(9 * scale))
    box(f, 8, 23, 33, 27, WOOD_M); box(f, 8, 23, 33, 23, WOOD_H); box(f, 8, 27, 33, 27, WOOD_D)
    ax = 12
    for y in range(25 - arm, 26 + arm):
        f.set(ax, y, STEEL_M)
    f.set(ax, 25 - arm, STEEL_H); f.set(ax, 25 + arm, STEEL_H)
    line(f, ax, 25 - arm, 24, 25, STEEL_H); line(f, ax, 25 + arm, 24, 25, STEEL_H)   # string
    box(f, 26, 27, 28, 33, WOOD_M); f.set(26, 33, WOOD_D)                            # grip
    box(f, 31, 24, 33, 26, GOLD_M)                                                   # fitting
    line(f, 14, 25, 30, 25, GOLD_D); f.set(13, 25, STEEL_S)                          # bolt
    if tier >= 2:
        f.set(20, 24, RUNE)


def thrown(f, tier, kind="dart"):
    cx = 24
    if kind == "dart":
        diag_blade(f, 20, 28, 16, 1)
        line(f, 19, 29, 13, 35, WOOD_M)
        f.set(12, 36, GOLD_M); f.set(11, 35, GOLD_M); f.set(11, 37, GOLD_M)          # fletch
    elif kind == "sling":
        line(f, 14, 6, 21, 26, LEATH_M); line(f, 34, 6, 27, 26, LEATH_M)             # cords
        box(f, 20, 26, 28, 30, LEATH_M); f.set(20, 26, LEATH_D)                      # pouch
        disc(f, 24, 28, 2, STEEL_M); f.set(23, 27, STEEL_H)                          # stone
    elif kind == "blowgun":
        bx, by, L = 8, 40, 40                                                        # diagonal tube
        for s in range(L):
            ccx = bx + INV * s; ccy = by - INV * s
            for kk in (-2, -1, 0, 1, 2):
                c = WOOD_H if kk == -2 else (WOOD_D if kk == 2 else WOOD_M)
                f.set(ccx + INV * kk, ccy + INV * kk, c)
        f.set(bx + INV * (L - 1), by - INV * (L - 1), STEEL_D)                        # bore opening
        for kk in (-3, -2, -1, 0, 1, 2, 3):                                          # mouthpiece
            f.set(bx + INV * kk, by + INV * kk, GOLD_M if abs(kk) >= 2 else WOOD_M)
        for s in (10, 20, 30):                                                       # segment rings
            ccx = bx + INV * s; ccy = by - INV * s
            for kk in (-2, -1, 0, 1, 2):
                f.set(ccx + INV * kk, ccy + INV * kk, WOOD_D)
    elif kind == "net":
        pts = [(24, 7), (41, 24), (24, 41), (7, 24)]
        for k in range(4):
            line(f, pts[k][0], pts[k][1], pts[(k + 1) % 4][0], pts[(k + 1) % 4][1], LEATH_M)
        for d in range(-12, 13, 5):
            line(f, 24 + d, 7 + abs(d), 24 + d, 41 - abs(d), LEATH_D)
            line(f, 7 + abs(d), 24 + d, 41 - abs(d), 24 + d, LEATH_D)
        for wx, wy in pts:                                                           # corner weights
            disc(f, wx, wy, 1, STEEL_M)


def _w(fn, **kw):
    return lambda f, tier: fn(f, tier, **kw)


WEAPONS = {
    # ── blades ──
    "longsword":  {"draw": _w(blade, length=42, hw=2, guard="cross"), "tiers": [0, 1, 2, 3]},
    "greatsword": {"draw": _w(blade, length=46, hw=3, guard="cross", base=(11, 40)), "tiers": [0, 1, 2, 3]},
    "shortsword": {"draw": _w(blade, length=30, hw=2, guard="cross"), "tiers": [0, 1, 2]},
    "dagger":     {"draw": _w(blade, length=22, hw=2, guard="small"), "tiers": [0, 1]},
    "rapier":     {"draw": _w(blade, length=42, hw=1, guard="swept"), "tiers": [0, 1]},
    "scimitar":   {"draw": _w(scimitar), "tiers": [0]},
    # ── axes / picks ──
    "greataxe":   {"draw": _w(axe, style="double", cy=16, htop=2, hbot=46), "tiers": [0, 1]},
    "battleaxe":  {"draw": _w(axe, peak=37, cy=17, half=10, htop=8, hbot=42), "tiers": [0]},
    "handaxe":    {"draw": _w(axe, peak=35, cy=18, half=8, htop=18, hbot=41), "tiers": [0, 1]},
    "warPick":    {"draw": _w(axe, pick=True, cy=17, htop=8, hbot=43), "tiers": [0]},
    # ── blunt ──
    "mace":       {"draw": _w(hammer, head="flanged"), "tiers": [0]},
    "warhammer":  {"draw": _w(hammer, head="block", spike=True), "tiers": [0]},
    "maul":       {"draw": _w(hammer, head="block", scale=1.4), "tiers": [0]},
    "lightHammer":{"draw": _w(hammer, head="block", scale=0.7), "tiers": [0]},
    "greatclub":  {"draw": _w(hammer, head="wood", scale=1.2), "tiers": [0]},
    "morningstar":{"draw": _w(hammer, head="spikeball"), "tiers": [0]},
    "flail":      {"draw": _w(hammer, head="flail"), "tiers": [0]},
    "club":       {"draw": _w(club_studded), "tiers": [0]},
    # ── polearms ──
    "spear":      {"draw": _w(polearm, head="spear"), "tiers": [0]},
    "royal-spear":{"draw": _w(polearm, head="spear", reinforced=True), "tiers": [0, 1, 2, 3]},
    "javelin":    {"draw": _w(polearm, head="spear", top=12), "tiers": [0]},
    "pike":       {"draw": _w(polearm, head="point", top=2), "tiers": [0]},
    "lance":      {"draw": _w(polearm, head="lance"), "tiers": [0]},
    "glaive":     {"draw": _w(polearm, head="glaive"), "tiers": [0]},
    "halberd":    {"draw": _w(polearm, head="halberd"), "tiers": [0]},
    "trident":    {"draw": _w(polearm, head="trident"), "tiers": [0]},
    "quarterstaff":{"draw": _w(polearm, head="staff"), "tiers": [0]},
    "sickle":     {"draw": _w(sickle), "tiers": [0]},
    "whip":       {"draw": _w(whip), "tiers": [0]},
    # ── ranged ──
    "shortbow":   {"draw": _w(bow, long=False), "tiers": [0, 1]},
    "longbow":    {"draw": _w(bow, long=True), "tiers": [0, 1, 2, 3]},
    "lightCrossbow":{"draw": _w(crossbow, scale=0.9), "tiers": [0]},
    "handCrossbow": {"draw": _w(crossbow, scale=0.6), "tiers": [0]},
    "heavyCrossbow":{"draw": _w(crossbow, scale=1.15), "tiers": [0]},
    "sling":      {"draw": _w(thrown, kind="sling"), "tiers": [0]},
    "dart":       {"draw": _w(thrown, kind="dart"), "tiers": [0]},
    "blowgun":    {"draw": _w(thrown, kind="blowgun"), "tiers": [0]},
    "net":        {"draw": _w(thrown, kind="net"), "tiers": [0]},
}

ENCHANTS = ["acid", "cold", "fire", "force", "lightning",
            "necrotic", "poison", "psychic", "radiant", "thunder"]


# ── tier glow / aura (post-outline, additive) ──────────────────────────────────────
def rim_ring(f, around_idx):
    out = []
    w, h = f.w, f.h
    for y in range(h):
        for x in range(w):
            if f.get(x, y) != 0:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and f.get(nx, ny) == around_idx:
                    out.append((x, y)); break
    return out


def add_tier_glow(f, tier):
    if tier <= 0:
        return
    ring1 = rim_ring(f, OUT)
    if tier == 1:
        for x, y in ring1:
            if dith(x, y, 0.5):
                f.set(x, y, GLOW_F)
    elif tier == 2:
        for x, y in ring1:
            f.set(x, y, GLOW_F)
    elif tier >= 3:
        for x, y in ring1:
            f.set(x, y, GLOW_B)
        ring(f, CX, CX, 21, GLOW_F, th=1.2, density=0.4)
        for px, py in [(7, 7), (40, 9), (9, 40), (39, 38)]:
            f.set(px, py, GLOW_B)


# ── enchant overlay (edge-aware: colored halo + lit-edge tint + particles) ──────────
def apply_enchant(f, rim, name):
    for x, y in rim_ring(f, OUT):
        f.set(x, y, EN_M)
    for x, y in rim:
        if f.get(x, y) in LIT:
            f.set(x, y, EN_S)
    cx = CX
    if name == "fire":
        for k, (dx, dy) in enumerate([(0, -4), (3, -8), (-3, -9), (2, -13), (-2, -16)]):
            f.set(cx + dx, 12 + dy, EN_S if k % 2 else EN_H)
    elif name == "cold":
        for i, (x, y) in enumerate(rim):
            if i % 6 == 0:
                spark(f, x, y, EN_S, size=1)
    elif name == "lightning":
        prev = None
        for p in [(34, 8), (29, 13), (35, 17), (30, 22)]:
            if prev:
                line(f, prev[0], prev[1], p[0], p[1], EN_S)
            prev = p
    elif name == "thunder":
        ring(f, cx, cx, 18, EN_M, th=1.2, density=0.6); ring(f, cx, cx, 13, EN_H, th=1.0, density=0.5)
    elif name == "acid":
        for dx, dy in [(-5, 39), (3, 42), (8, 38), (-9, 37)]:
            f.set(cx + dx, dy, EN_H); f.set(cx + dx, dy + 1, EN_M)
    elif name == "poison":
        for dx, dy in [(-11, 12), (12, 18), (-8, 33), (11, 36), (0, 6), (14, 8)]:
            f.set(cx + dx, dy, EN_H)
    elif name == "necrotic":
        for dx, dy in [(-8, 10), (9, 13), (-3, 6), (6, 7), (0, 42)]:
            f.set(cx + dx, dy, EN_M)
        for dx, dy in [(-9, 9), (10, 13), (0, 42)]:
            f.set(cx + dx, dy, EN_S)
    elif name == "radiant":
        for ang in range(0, 360, 45):
            a = math.radians(ang)
            f.set(cx + math.cos(a) * 20, cx + math.sin(a) * 20, EN_S)
            f.set(cx + math.cos(a) * 17, cx + math.sin(a) * 17, EN_H)
    elif name == "force":
        ring(f, cx, cx, 20, EN_H, th=1.4, density=0.9); ring(f, cx, cx, 20, EN_S, th=1.0, density=0.4)
    elif name == "psychic":
        for k in range(10):
            a = k * math.pi / 5; r = 14 + (k % 3) * 2
            f.set(cx + math.cos(a) * r, cx + math.sin(a) * r, EN_H if k % 2 else EN_S)


# ── build one sprite ───────────────────────────────────────────────────────────────
def build_icon(name, tier, enchant=None):
    f = F(S, S)
    WEAPONS[name]["draw"](f, tier)
    rim = edge_mask(f)
    outline(f, OUT)
    if enchant:
        apply_enchant(f, rim, enchant)
    else:
        add_tier_glow(f, tier)
    return f


def tier_id(name, tier):
    return name if tier == 0 else f"{name}+{tier}"


# ── upscaled preview helpers ────────────────────────────────────────────────────────
def _rgba(frame, pal, scale):
    im = _to_p(frame, pal).convert("RGBA")
    px = im.load()
    for y in range(frame.h):
        for x in range(frame.w):
            if frame.px[y * frame.w + x] == 0:
                px[x, y] = (0, 0, 0, 0)
    return im.resize((frame.w * scale, frame.h * scale), Image.NEAREST)


def dump(frame, pal, out_path, scale=8):
    sheet = Image.new("RGBA", (frame.w * scale, frame.h * scale), (32, 32, 40, 255))
    sheet.alpha_composite(_rgba(frame, pal, scale))
    out_path = Path(out_path); out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_path)


def main():
    do_montage = "--montage" in sys.argv
    weapons_dir = ASSETS / "weapons"
    count = 0
    plain_frames = []

    for stale in weapons_dir.glob("*__*.png"):
        stale.unlink()

    for name, spec in WEAPONS.items():
        for tier in spec["tiers"]:
            wid = tier_id(name, tier)
            plain = build_icon(name, tier)
            save_png(weapons_dir / f"{wid}.png", plain, BASE_PAL)
            plain_frames.append((wid, plain)); count += 1
            for ench in ENCHANTS:
                fr = build_icon(name, tier, ench)
                save_png(weapons_dir / ench / f"{wid}.png", fr, enchant_pal(ench)); count += 1
        print(f"  ok  {name:14s} tiers={spec['tiers']}")

    for p in list(weapons_dir.glob("*.png")) + list(weapons_dir.glob("*/*.png")):
        with Image.open(p) as im:
            assert im.size == (S, S), f"{p.relative_to(weapons_dir)}: {im.size}"
    print(f"\nGenerated {count} icons ({S}x{S}, {len(plain_frames)} plain) into {weapons_dir}")

    if do_montage:
        m = ROOT / ".montage"
        montage([fr for _, fr in plain_frames], BASE_PAL, m / "_weapons_all.png", scale=5)
        for wid, fr in plain_frames:
            dump(fr, BASE_PAL, m / f"plain__{wid}.png")
        print(f"Montages in {m}")


if __name__ == "__main__":
    main()
