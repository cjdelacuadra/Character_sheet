#!/usr/bin/env python3
"""Generate procedural gear inventory icons — armory pass (armor / shields / helmets).

64x64 ornate fantasy / TTRPG icons, mirroring scripts/gen-weapon-sprites.py. Unlike the first
pass (one cuirass shape x14 palettes), every armor id now has its own **bespoke silhouette** built
from a shared kit of forged sub-forms (pauldrons / gorget / faulds / scale rows / ring weave /
quilt channels / splint bars). Shields get a proper de-triangled heater plus distinct round / tower
/ book shapes; helmets get distinct dome silhouettes (nasal / great / bascinet / horned). Per-item
**palette + accent** still differentiates within a family. Tier suffixes (+1/+2/+3 in the id) add
gilded trim, a gem + runes, then a glow.

Reads `src/renderer/public/equipment_data/gear.csv`, processes every armor/shield/helmet row,
and writes:
    /assets/armors/<id>.png   /assets/shields/<id>.png   /assets/helmets/<id>.png

Run from repo root:
    python scripts/gen-gear-sprites.py            # generate + verify
    python scripts/gen-gear-sprites.py --montage  # also dump a labelled grid to .montage/
"""

from __future__ import annotations

import csv
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw

from spritelib import F, H, T, disc, ring, arc, line, box, cluster, edge_mask, outline, save_png, _to_p

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "src" / "renderer" / "public" / "assets"
GEAR_CSV = ROOT / "src" / "renderer" / "public" / "equipment_data" / "gear.csv"

S = 64
CX = 32

# ── semantic palette indices (shared by every gear shape) ────────────────────────────
OUT = 1
MD, MC, MB, MM, MH, MS = 2, 3, 4, 5, 6, 7        # material dark→spec (the item's main ramp)
GD, GM, GH = 8, 9, 10                            # gold trim
AD, AM, AH = 11, 12, 13                          # accent / emblem
LD, LM = 14, 15                                  # leather straps
GLOW, RUNE, GEM, GEMH = 16, 17, 18, 19           # tier sparkle (RUNE doubles as pale-blue sheen)
SMD, SMM, SMH = 20, 21, 22                        # secondary metal (iron studs/rings/bands on leather)
BOD, BOH = 23, 24                                 # bone / tooth toggle

# 6-shade material ramps (dark → spec)
MATERIALS = {
    "steel":   ["353d4a", "4a5466", "6b7689", "8c98ab", "b8c2d4", "f2f6ff"],
    "iron":    ["24272f", "333a46", "4a5260", "68707f", "9098a6", "cdd4e0"],
    "gold":    ["5a3a0a", "7a5212", "a06f1a", "c8962e", "e8b84a", "ffe07a"],
    "white":   ["5e6678", "808a9c", "a4aebe", "c6cedb", "e6ecf4", "ffffff"],
    "leather": ["241608", "3a2412", "543620", "744e28", "9a6e3e", "c49a5e"],
    "wood":    ["2a1a0c", "442c16", "5e3e20", "78562e", "9a7444", "c49a64"],
    "cloth":   ["443a30", "62523f", "847058", "a89270", "c8b48e", "ece0c0"],
    "green":   ["10301a", "1f4a28", "2f6a38", "49954e", "6abf68", "a8e88a"],
    "red":     ["3e0e12", "60181c", "8a2422", "b83838", "e05848", "ff886a"],
    "blue":    ["16223a", "25344f", "35507f", "4a6aa0", "6e92cc", "b8d0f0"],
}
ACCENTS = {     # 3 shades dark/mid/hi
    "gold":     ["7a5212", "c8962e", "ffe07a"],
    "ruby":     ["7a1020", "c83048", "ff7088"],
    "emerald":  ["12502a", "2f9a4e", "7fe090"],
    "sapphire": ["1a3a7a", "3a6ad0", "8fb8ff"],
}
GOLD = ["6e4a12", "c8962e", "ffe07a"]
LEATH = ["2a1a0e", "4a2f18"]
SECONDARY_METAL = ["30343f", "5c6678", "aab4c6"]  # dark / mid / hi iron
BONE = ["8a7a52", "ded0a4"]


def gpal(mat, accent="gold"):
    m = [H(c) for c in MATERIALS[mat]]
    g = [H(c) for c in GOLD]
    a = [H(c) for c in ACCENTS[accent]]
    sm = [H(c) for c in SECONDARY_METAL]
    bo = [H(c) for c in BONE]
    return ([T, H("120c08")] + m + g + a + [H(LEATH[0]), H(LEATH[1])]
            + [H("9a86c0"), H("86d8ff"), a[1], a[2]] + sm + bo)


# ── shared forged sub-forms ──────────────────────────────────────────────────────────
def row(f, x0, x1, y, base, lit=None, dark=None, lw=2, dw=2):
    """One horizontal span with a lit left rim and a dark right rim (forged volume)."""
    if x1 < x0:
        return
    box(f, x0, y, x1, y, base)
    if lit is not None:
        box(f, x0, y, min(x1, x0 + lw - 1), y, lit)
    if dark is not None:
        box(f, max(x0, x1 - dw + 1), y, x1, y, dark)


def taper_prof(ytop, ybot, wtop, wbot, round_bot=0, round_top=3, bell=0):
    """Build a torso half-width profile as a list of (y, halfwidth)."""
    prof = []
    span = ybot - ytop
    for y in range(ytop, ybot + 1):
        t = (y - ytop) / span
        hw = wtop + (wbot - wtop) * t
        if bell and t > 0.55:                       # flare back out near the hem (mail bell)
            hw += bell * ((t - 0.55) / 0.45) ** 2
        if round_top:                               # round the shoulders (no flat-topped points)
            d = y - ytop
            if d < round_top:
                hw -= (round_top - d) ** 1.3
        if round_bot:
            d = ybot - y
            if d < round_bot:
                hw -= (round_bot - d) ** 1.4
        prof.append((y, max(1, int(round(hw)))))
    return prof


def fill_torso(f, prof, base=MB, lit=MH, dark=MD):
    """Fill a shaded torso from a profile; return {y: (xl, xr)} bounds for texturing."""
    bounds = {}
    for y, hw in prof:
        xl, xr = CX - hw, CX + hw
        row(f, xl, xr, y, base, lit, dark)
        bounds[y] = (xl, xr)
    return bounds


def vneck(f, ytop, depth, width=4):
    for i in range(depth):
        w = max(0, width - i)
        box(f, CX - w, ytop + i, CX + w, ytop + i, 0)


def round_neck(f, ytop, r=4):
    for i in range(r):
        w = r - i
        box(f, CX - w, ytop + i, CX + w, ytop + i, 0)


def belt(f, bounds, y, idx, buckle=False):
    if y not in bounds:
        return
    xl, xr = bounds[y]
    box(f, xl, y, xr, y, idx)
    if (y + 1) in bounds:
        xl2, xr2 = bounds[y + 1]
        box(f, xl2, y + 1, xr2, y + 1, idx)
    f.set(xl, y, LD)
    if buckle:
        box(f, CX - 2, y, CX + 2, y + 1, GM)
        f.set(CX - 1, y, GH)


def texture(f, bounds, fn, step_y=3, step_x=6, inset=2, y0=None, y1=None):
    """Stamp `fn(f, x, y)` on offset rows, clipped to the silhouette bounds."""
    rows = sorted(bounds)
    if not rows:
        return
    base_y = rows[0]
    for y in rows:
        if (y - base_y) % step_y:
            continue
        if (y0 is not None and y < y0) or (y1 is not None and y > y1):
            continue
        xl, xr = bounds[y]
        ri = (y - base_y) // step_y
        xoff = (step_x // 2) if ri % 2 else 0
        x = xl + inset + xoff
        while x <= xr - inset:
            fn(f, x, y)
            x += step_x


def pauldron(f, cx, cy, r=8):
    disc(f, cx, cy, r, MM)
    disc(f, cx - 2, cy - 2, r - 3, MH)
    box(f, cx - r, cy + r - 2, cx + r, cy + r - 1, MD)      # bottom shadow
    box(f, cx - r + 1, cy, cx + r - 1, cy, MD)              # lame line 1
    box(f, cx - r + 2, cy + 3, cx + r - 2, cy + 3, MD)      # lame line 2


def gorget(f, y, w=8):
    box(f, CX - w, y, CX + w, y + 1, MM)
    box(f, CX - w, y, CX + w, y, MH)
    box(f, CX - w, y + 2, CX + w, y + 2, MD)


def faulds(f, ytop, w, n=4, taper=1):
    for r in range(n):
        yy = ytop + r * 3
        ww = w - r * taper
        box(f, CX - ww, yy, CX + ww, yy + 2, MM)
        box(f, CX - ww, yy, CX + ww, yy, MH)
        box(f, CX - ww, yy + 2, CX + ww, yy + 2, MD)
        for sx in range(CX - ww + 3, CX + ww, 6):
            box(f, sx, yy, sx, yy + 2, MD)


def scale_one(f, x, y):
    box(f, x - 2, y, x + 2, y, MD)
    box(f, x - 2, y + 1, x + 2, y + 2, MM)
    box(f, x - 1, y + 3, x + 1, y + 3, MM)
    f.set(x - 1, y + 1, MH)


def ring_at(f, x, y):
    f.set(x, y, MH); f.set(x + 1, y, MC)
    f.set(x, y + 1, MC); f.set(x + 1, y + 1, MD)


def sring_at(f, x, y):
    f.set(x, y, SMH); f.set(x + 1, y, SMM)
    f.set(x, y + 1, SMM); f.set(x + 1, y + 1, SMD)


def stud_at(f, x, y):
    f.set(x, y, SMH); f.set(x + 1, y, SMD); f.set(x, y + 1, SMD)


def gild_top(f, idx):
    """Recolour the topmost filled pixel of each column — a gilded upper trim that hugs any shape."""
    for x in range(S):
        for y in range(S):
            if f.get(x, y) != 0:
                f.set(x, y, idx)
                break


# ── bespoke armor draws (no outline / no tier — added by the dispatcher) ──────────────
def armor_padded(f):
    b = fill_torso(f, taper_prof(15, 56, 13, 12, round_bot=4))
    round_neck(f, 15, 4)
    for x in range(CX - 10, CX + 11, 5):                    # stitched quilt seams
        for y, (xl, xr) in b.items():
            if xl + 1 <= x <= xr - 1:
                f.set(x, y, MD)
    for x in range(CX - 8, CX + 9, 5):                      # padded channel sheen
        for y, (xl, xr) in b.items():
            if xl + 1 <= x <= xr - 1 and 17 <= y <= 53 and y % 3:
                f.set(x, y, MH)
    belt(f, b, 46, LM)


def armor_leather(f):
    b = fill_torso(f, taper_prof(16, 54, 13, 12, round_bot=4))
    vneck(f, 16, 5)
    line(f, CX - 11, 17, CX - 3, 26, LD)                    # lapels
    line(f, CX + 11, 17, CX + 3, 26, LD)
    for s in (-1, 1):                                       # shoulder straps + buckles
        box(f, CX + s * 9 - 1, 17, CX + s * 9 + 1, 24, LM)
        stud_at(f, CX + s * 9 - 1, 20)
    belt(f, b, 46, LM, buckle=True)


def armor_studded(f):
    b = fill_torso(f, taper_prof(16, 54, 13, 12, round_bot=4))
    vneck(f, 16, 6)
    texture(f, b, stud_at, step_y=5, step_x=6, inset=3, y0=20, y1=50)
    belt(f, b, 47, LM)


def armor_hide(f):
    prof = taper_prof(16, 54, 13, 12, round_bot=5)
    jit = [0, 1, 0, 2, 1, 0, 2, 1]                          # rough, irregular edge
    prof = [(y, max(1, hw - (jit[y % len(jit)] if y % 2 else 0))) for y, hw in prof]
    b = fill_torso(f, prof)
    vneck(f, 16, 6)
    for x in range(CX - 12, CX + 13, 2):                    # fur trim at the collar
        f.set(x, 16, MS)
    for px, py in [(CX - 7, 28), (CX + 5, 34), (CX - 3, 42), (CX + 8, 24)]:
        box(f, px, py, px + 2, py + 1, MD)                  # rough patches
    f.set(CX, 24, BOH); f.set(CX, 25, BOD)                  # bone toggle
    belt(f, b, 47, LM)


def armor_chainshirt(f):
    b = fill_torso(f, taper_prof(16, 48, 12, 11, round_bot=6))
    round_neck(f, 16, 4)
    texture(f, b, ring_at, step_y=2, step_x=2, inset=1, y0=18, y1=47)
    box(f, CX - 5, 16, CX + 5, 17, LM)                      # tunic collar showing


def armor_chainmail(f):
    b = fill_torso(f, taper_prof(15, 57, 12, 10, round_bot=4, bell=4))
    round_neck(f, 15, 4)
    texture(f, b, ring_at, step_y=2, step_x=2, inset=1, y0=17, y1=56)
    box(f, CX - 6, 15, CX + 6, 16, MM)                      # coif collar


def armor_ringmail(f):
    b = fill_torso(f, taper_prof(16, 54, 13, 12, round_bot=4))
    vneck(f, 16, 5)
    texture(f, b, sring_at, step_y=3, step_x=3, inset=2, y0=19, y1=51)
    belt(f, b, 47, LM)


def armor_scalemail(f):
    b = fill_torso(f, taper_prof(16, 52, 13, 11, round_bot=5))
    round_neck(f, 16, 4)
    texture(f, b, scale_one, step_y=3, step_x=6, inset=2, y0=18, y1=49)


def armor_breastplate(f):
    b = fill_torso(f, taper_prof(16, 48, 13, 11, round_bot=5, round_top=5))
    round_neck(f, 16, 3)
    box(f, CX - 1, 20, CX, 46, MM); box(f, CX, 20, CX, 46, MH)     # central ridge
    for s in (-1, 1):                                              # pec swell highlights
        for k in range(6):
            f.set(CX + s * (4 + k), 26 + (k * k) // 6, MH)
    for s in (-1, 1):                                              # shoulder straps
        line(f, CX + s * 11, 18, CX + s * 6, 25, LM)
    for rx, ry in [(CX - 9, 24), (CX + 9, 24), (CX - 8, 42), (CX + 8, 42)]:
        stud_at(f, rx, ry)


def armor_halfplate(f):
    b = fill_torso(f, taper_prof(17, 44, 12, 11, round_bot=5))
    round_neck(f, 17, 5)
    box(f, CX - 1, 19, CX, 42, MM); box(f, CX, 19, CX, 42, MH)     # ridge
    gorget(f, 16, 8)
    faulds(f, 44, 10, n=2)
    pauldron(f, CX - 13, 20, 7); pauldron(f, CX + 13, 20, 7)


def armor_splint(f):
    b = fill_torso(f, taper_prof(16, 54, 13, 12, round_bot=4))    # leather body
    round_neck(f, 16, 4)
    for x in range(CX - 11, CX + 12, 5):                          # vertical steel splints
        for y, (xl, xr) in b.items():
            if xl + 1 <= x <= xr - 1 and 18 <= y <= 52:
                f.set(x - 1, y, SMM); f.set(x, y, SMH); f.set(x + 1, y, SMD)
    for by in (24, 38):                                          # banding
        if by in b:
            xl, xr = b[by]; box(f, xl, by, xr, by, SMD)
    belt(f, b, 47, LM)


def armor_plate(f):
    b = fill_torso(f, taper_prof(16, 46, 13, 12, round_bot=3))
    round_neck(f, 16, 4)
    box(f, CX - 1, 18, CX, 45, MM); box(f, CX, 18, CX, 45, MH)     # ridge
    for yy in (28, 34, 40):                                        # plate seams
        box(f, CX - 10, yy, CX + 10, yy, MD)
    gorget(f, 15, 9)
    faulds(f, 46, 12, n=4)
    pauldron(f, CX - 14, 19, 8); pauldron(f, CX + 14, 19, 8)
    for rx, ry in [(CX - 9, 23), (CX + 9, 23)]:
        stud_at(f, rx, ry)


def armor_paladin(f):
    b = fill_torso(f, taper_prof(16, 48, 13, 12, round_bot=4))
    round_neck(f, 16, 4)
    box(f, CX - 1, 18, CX, 46, MM); box(f, CX, 18, CX, 46, MH)
    gorget(f, 15, 9)
    faulds(f, 48, 12, n=3)
    pauldron(f, CX - 14, 19, 8); pauldron(f, CX + 14, 19, 8)
    disc(f, CX, 31, 4, AM); disc(f, CX, 31, 2, AH)                 # holy sun emblem
    for dx, dy in [(0, -7), (0, 7), (-7, 0), (7, 0), (-5, -5), (5, -5), (-5, 5), (5, 5)]:
        f.set(CX + dx, 31 + dy, AH)


def armor_albino(f):
    b = fill_torso(f, taper_prof(16, 50, 13, 12, round_bot=4))
    round_neck(f, 16, 4)
    box(f, CX - 1, 18, CX, 48, MM); box(f, CX, 18, CX, 48, MH)
    gorget(f, 15, 8)
    pauldron(f, CX - 13, 19, 7); pauldron(f, CX + 13, 19, 7)
    line(f, CX - 6, 23, CX - 4, 36, RUNE)                          # pale-blue sheen
    line(f, CX + 7, 25, CX + 5, 38, RUNE)


ARMOR_FNS = {
    "padded": armor_padded, "leather": armor_leather, "studded": armor_studded,
    "hide": armor_hide, "chainShirt": armor_chainshirt, "scaleMail": armor_scalemail,
    "ringMail": armor_ringmail, "chainMail": armor_chainmail, "breastplate": armor_breastplate,
    "halfPlate": armor_halfplate, "splint": armor_splint, "plate": armor_plate,
    "paladin-armor": armor_paladin, "albino-plate": armor_albino,
}
ARMOR_MAT = {
    "padded": ("cloth", "gold"), "leather": ("leather", "gold"), "studded": ("leather", "gold"),
    "hide": ("leather", "gold"), "chainShirt": ("iron", "gold"), "scaleMail": ("steel", "gold"),
    "ringMail": ("leather", "gold"), "chainMail": ("iron", "gold"), "breastplate": ("steel", "gold"),
    "halfPlate": ("steel", "gold"), "splint": ("leather", "gold"), "plate": ("steel", "gold"),
    "paladin-armor": ("gold", "sapphire"), "albino-plate": ("white", "sapphire"),
}


def _armor_tier(f, tier):
    if tier >= 1:
        gild_top(f, GM)
    if tier >= 2:
        f.set(CX, 28, GEM); f.set(CX - 9, 24, RUNE); f.set(CX + 9, 24, RUNE)
    if tier >= 3:
        cluster(f, CX, 28, [(0, -3), (0, 3), (-3, 0), (3, 0)], GEMH)


def draw_armor(f, tier, kind):
    ARMOR_FNS[kind](f)
    _armor_tier(f, tier)
    outline(f, OUT)


# ── shields ──────────────────────────────────────────────────────────────────────────
def _emblem(f, kind):
    """Bold gilded motif — gold reads on any field colour (the old accent-on-hue was too faint)."""
    HI, MID = GH, GM
    if kind == "dragon":                                   # spread wings + serpent body
        for dx in range(-12, 13):
            y = 25 + abs(dx) // 2
            f.set(CX + dx, y, HI); f.set(CX + dx, y + 1, MID)
        box(f, CX - 1, 28, CX, 40, MID); cluster(f, CX, 40, [(-1, 1), (1, 1), (0, 2)], HI)
        f.set(CX - 4, 24, HI); f.set(CX + 4, 24, HI)
    elif kind == "demon":                                  # horned skull
        line(f, CX - 6, 24, CX - 11, 16, MID); line(f, CX + 6, 24, CX + 11, 16, MID)
        f.set(CX - 11, 15, HI); f.set(CX + 11, 15, HI)
        disc(f, CX, 30, 6, MID)
        f.set(CX - 3, 29, HI); f.set(CX + 3, 29, HI); box(f, CX - 3, 35, CX + 3, 35, HI)
    elif kind == "medusa":                                 # writhing snakes
        disc(f, CX, 33, 5, MID)
        for dx, dy in [(-11, 19), (-7, 16), (0, 14), (7, 16), (11, 19), (-9, 27), (9, 27)]:
            line(f, CX, 31, CX + dx, dy, MID); f.set(CX + dx, dy, HI)
    elif kind == "mastermind":                             # facetted star
        cluster(f, CX, 31, [(0, -8), (0, 8), (-8, 0), (8, 0), (-5, -5), (5, -5), (-5, 5), (5, 5)], HI)
        disc(f, CX, 31, 3, MID); f.set(CX, 31, HI)


def shield_heater(f):
    """Wood-faced, iron-rimmed heater with a rounded (not pointed) profile."""
    top, bot, W, flat = 8, 58, 22, 0.40
    prof = {}
    for y in range(top, bot + 1):
        t = (y - top) / (bot - top)
        if t < flat:
            hw = W
        else:
            u = (t - flat) / (1 - flat)
            hw = W * math.sqrt(max(0.0, 1 - u * u))
        prof[y] = int(round(hw))
    for i, y in enumerate(range(top, top + 3)):            # round the top corners
        prof[y] = max(1, prof[y] - (3 - i) * 3)
    bounds = {}
    for y in range(top, bot + 1):
        hw = prof[y]
        if hw < 1:
            continue
        xl, xr = CX - hw, CX + hw
        row(f, xl, xr, y, MB, MH, MD)
        bounds[y] = (xl, xr)
    for x in range(CX - 14, CX + 15, 7):                   # vertical plank seams
        for y, (xl, xr) in bounds.items():
            if xl + 1 <= x <= xr - 1:
                f.set(x, y, MD)
    for by in (20, 40):                                    # iron bands
        if by in bounds:
            xl, xr = bounds[by]
            box(f, xl, by, xr, by, SMD); box(f, xl, by - 1, xr, by - 1, SMH)
    for x, y in edge_mask(f):                              # iron rim
        f.set(x, y, SMM)
    disc(f, CX, 30, 4, GM); disc(f, CX, 30, 2, GH); f.set(CX - 1, 29, GH)   # boss


def shield_round(f, emblem=None):
    disc(f, CX, CX, 22, MB)
    disc(f, CX - 5, CX - 6, 12, MM)                        # lit upper-left
    disc(f, CX - 7, CX - 8, 6, MH); f.set(CX - 9, CX - 11, MS)              # sheen
    ring(f, CX, CX, 22, MC, th=2.0)
    ring(f, CX, CX, 22, GM, th=0.8)                        # gold rim
    if emblem:
        _emblem(f, emblem)
    else:
        disc(f, CX, CX, 4, GM); disc(f, CX, CX, 2, GH)     # plain boss


def shield_tower(f):
    box(f, 14, 6, 50, 58, MB)
    for c in range(3):                                     # round the top corners
        for k in range(3 - c):
            f.set(14 + k, 6 + c, 0); f.set(50 - k, 6 + c, 0)
    box(f, 14, 6, 17, 58, MH); box(f, 47, 6, 50, 58, MD)   # lit / shaded sides
    for x in range(22, 50, 8):                             # plank seams
        box(f, x, 7, x, 57, MD)
    box(f, CX - 1, 6, CX, 58, MM)                          # centre rib
    for by in (16, 32, 48):                                # iron bands + bolts
        box(f, 14, by, 50, by + 1, SMM)
        box(f, 14, by, 50, by, SMH); box(f, 14, by + 1, 50, by + 1, SMD)
        for bx in (18, 32, 46):
            stud_at(f, bx, by)
    disc(f, CX, 32, 3, GM); f.set(CX - 1, 31, GH)


def shield_book(f):
    box(f, 14, 8, 50, 56, LM)                              # leather cover
    box(f, 14, 8, 18, 56, LD)                              # spine
    box(f, 20, 11, 48, 53, MB)                             # pages (material)
    box(f, 20, 11, 48, 12, MS); box(f, 20, 52, 48, 53, MC)
    box(f, 14, 30, 50, 33, GD)                             # clasp band
    disc(f, CX + 2, 32, 4, GEM)                            # arcane sigil
    cluster(f, CX + 2, 32, [(0, -6), (0, 6), (-6, 0), (6, 0)], GEMH)


SHIELD_FNS = {"heater": shield_heater, "round": shield_round, "tower": shield_tower, "book": shield_book}


def _shield_tier(f, tier):
    if tier >= 1:
        gild_top(f, GM)
    if tier >= 2:
        f.set(CX, 30, GEM)
    if tier >= 3:
        cluster(f, CX, 30, [(0, -3), (0, 3), (-3, 0), (3, 0)], GEMH)


def draw_shield(f, tier, shape, emblem=None):
    if shape == "round":
        shield_round(f, emblem)
    else:
        SHIELD_FNS[shape](f)
    _shield_tier(f, tier)
    outline(f, OUT)


# ── helmets ────────────────────────────────────────────────────────────────────────
def helm_nasal(f):
    disc(f, CX, 24, 13, MB)
    for k in range(4):                                     # soft conical crown
        w = 4 - k
        box(f, CX - w, 9 + k, CX + w, 9 + k, MB)
    box(f, 18, 24, 46, 36, MB)                             # cheeks
    box(f, 23, 26, 41, 35, 0)                              # open face
    box(f, CX - 1, 24, CX + 1, 37, MM); f.set(CX, 24, MS)  # nasal bar
    box(f, 18, 23, 46, 24, MM)                             # brow band
    disc(f, 22, 16, 3, MH); f.set(19, 13, MS)              # sheen
    box(f, 44, 26, 46, 36, MD)                             # right shade


def helm_great(f):
    box(f, 18, 12, 46, 40, MB)                             # cylinder
    for c in range(3):
        for k in range(3 - c):
            f.set(18 + k, 12 + c, 0); f.set(46 - k, 12 + c, 0)
    box(f, 18, 12, 21, 40, MH); box(f, 43, 12, 46, 40, MD)
    box(f, 20, 24, 44, 27, MD)                             # eye slit
    box(f, 20, 23, 44, 23, MS)                             # brow ridge
    box(f, CX - 1, 27, CX, 40, MD)                         # centre breath line
    for x in range(22, 44, 3):
        f.set(x, 33, MC)                                   # breath holes
    disc(f, 23, 16, 3, MH)                                 # sheen


def helm_bascinet(f):
    for y in range(7, 25):                                 # pointed crown
        hw = int(round((y - 7) * 0.8))
        box(f, CX - hw, y, CX + hw, y, MB)
    disc(f, CX, 24, 13, MB)
    box(f, 20, 24, 44, 35, MB)
    disc(f, 24, 15, 3, MH); f.set(21, 12, MS)
    box(f, 43, 25, 44, 35, MD)
    for k in range(10):                                    # houndskull visor snout
        f.set(28 + k, 27 + k, MM); f.set(28 + k, 28 + k, MD)
    box(f, 22, 27, 40, 28, MD)                             # eye slit
    box(f, 24, 32, 40, 33, MD)                             # breath slit


def helm_horned(f):
    disc(f, CX, 25, 13, MB)
    box(f, 19, 25, 45, 37, MB)
    box(f, 19, 24, 45, 25, AD)                              # brow ridge
    box(f, 22, 28, 29, 30, AH); box(f, 35, 28, 42, 30, AH)  # glaring eyes
    line(f, CX, 26, CX, 33, AD)                             # nasal ridge
    box(f, 26, 35, 38, 36, AD)                              # grim mouth
    for s in (-1, 1):                                       # thick tapered ram horns
        for dx, dy, w in [(8, 23, 2), (11, 20, 2), (13, 17, 2), (15, 13, 1), (16, 9, 1), (16, 6, 1)]:
            for tx in range(-w, w + 1):
                f.set(CX + s * dx + tx, dy, AM)
            f.set(CX + s * dx, dy, AH)
    disc(f, 23, 18, 3, MH)


def helm_gold(f):
    helm_great(f)
    for x in (CX - 8, CX, CX + 8):                          # crown points
        f.set(x, 10, GH); f.set(x, 9, GH)


HELM_FNS = {"nasal": helm_nasal, "great": helm_great, "bascinet": helm_bascinet,
            "horned": helm_horned, "gold": helm_gold}


def _helm_tier(f, tier):
    if tier >= 1:
        gild_top(f, GM)
    if tier >= 2:
        f.set(CX, 30, GEM)
    if tier >= 3:
        cluster(f, CX, 30, [(0, -2), (-2, 0), (2, 0)], GEMH)


def draw_helmet(f, tier, style, plume=False):
    HELM_FNS[style](f)
    if plume:
        box(f, CX - 1, 4, CX, 11, AM); f.set(CX - 1, 4, AH)
    _helm_tier(f, tier)
    outline(f, OUT)


# ── accessories (rings / amulets / capes / gloves / boots / legs) ─────────────────────
def gemstone(f, cx, cy, r):
    disc(f, cx, cy, r, AM)
    disc(f, cx - 1, cy - 1, max(1, r - 2), AH)
    ring(f, cx, cy, r, AD, th=1.0)
    f.set(cx + 1, cy + 1, AD)


def draw_ring(f, motif=None, glow=False):
    cx, cy, R, th = CX, 38, 14, 4
    ring(f, cx, cy, R, MM, th=th)
    ring(f, cx, cy, R + 1.6, MD, th=1.0)
    ring(f, cx, cy, R - 1.6, MD, th=1.0)
    arc(f, cx, cy, R, math.pi, math.pi * 1.5, MH)            # upper-left sheen
    gy = cy - R
    box(f, cx - 4, gy - 1, cx + 4, gy + 3, MM)               # gem setting
    gemstone(f, cx, gy - 1, 6)
    if glow:
        for dx, dy in [(0, -9), (-8, -3), (8, -3), (-6, 4), (6, 4)]:
            f.set(cx + dx, gy - 1 + dy, GLOW)
    if motif == "flame":
        cluster(f, cx, gy - 8, [(0, 0), (0, 1), (-1, 2), (1, 2), (0, -1)], AH)
    elif motif == "bolt":
        line(f, cx - 2, gy - 8, cx + 1, gy - 4, AH); line(f, cx + 1, gy - 4, cx - 1, gy - 1, AH)
    elif motif == "eye":
        box(f, cx - 2, gy - 2, cx + 2, gy, AH); f.set(cx, gy - 1, OUT)
    outline(f, OUT)


def draw_amulet(f, pendant="medallion"):
    for s in (-1, 1):                                        # gold chain
        for dx, dy in [(13, 9), (11, 13), (8, 18), (4, 22)]:
            f.set(CX + s * dx, dy, GH); f.set(CX + s * dx, dy + 1, GD)
    py = 37
    if pendant == "medallion":
        disc(f, CX, py, 11, MM); ring(f, CX, py, 11, GD, th=1.5); ring(f, CX, py, 11, GH, th=0.6)
        gemstone(f, CX, py, 5)
    elif pendant == "sun":
        for dx, dy in [(0, -14), (0, 14), (-14, 0), (14, 0), (-10, -10), (10, -10), (-10, 10), (10, 10)]:
            line(f, CX, py, CX + dx, py + dy, GH)
        disc(f, CX, py, 9, GM); disc(f, CX - 2, py - 2, 4, GH); gemstone(f, CX, py, 3)
    elif pendant == "fist":
        disc(f, CX, py, 10, MM); ring(f, CX, py, 10, GD, th=1.5)
        box(f, CX - 5, py - 1, CX + 5, py + 5, AM)
        for kx in (CX - 4, CX - 1, CX + 2, CX + 5):
            f.set(kx, py - 2, AH)
    elif pendant == "skull":
        disc(f, CX, py, 9, MS)
        box(f, CX - 4, py - 2, CX - 2, py, OUT); box(f, CX + 2, py - 2, CX + 4, py, OUT)  # sockets
        box(f, CX - 3, py + 4, CX + 3, py + 7, MS)           # jaw
        for tx in (CX - 2, CX, CX + 2):
            f.set(tx, py + 5, OUT)                           # teeth
    elif pendant == "pearl":
        disc(f, CX, py, 9, MH); disc(f, CX - 2, py - 2, 4, MS)
        ring(f, CX, py, 9, GD, th=1.0)
    elif pendant == "gem":                                   # ruby teardrop
        for i in range(7):
            box(f, CX - i // 2, py - 10 + i, CX + i // 2, py - 10 + i, AM)
        disc(f, CX, py, 6, AM); disc(f, CX - 1, py - 1, 3, AH); ring(f, CX, py, 6, AD, th=1.0)
        ring(f, CX, py - 12, 2, GH, th=1.2)                  # gold bail
    outline(f, OUT)


def _drape(f, ytop, ybot, hw_fn, asym=0.0):
    """Fill a centred cloth drape from a per-row half-width fn (+ optional windswept lean)."""
    bounds = {}
    for y in range(ytop, ybot + 1):
        t = (y - ytop) / (ybot - ytop)
        hw = int(round(hw_fn(t)))
        cx = CX + int(round(asym * t * t * 10))
        xl, xr = cx - hw, cx + hw
        row(f, xl, xr, y, MB, MH, MD)
        bounds[y] = (xl, xr)
    return bounds


def _folds(f, bounds, fracs):
    """Drape fold shadows that follow the silhouette (frac of half-width from each row's centre)."""
    for fr in fracs:
        for y, (xl, xr) in bounds.items():
            w = (xr - xl) / 2.0
            x = int(round((xl + xr) / 2.0 + fr * w))
            if xl + 1 <= x <= xr - 1:
                f.set(x, y, MD)
                if fr == 0.0:
                    f.set(x - 1, y, MH)


def draw_cape(f, style):
    box(f, CX - 6, 9, CX + 6, 12, GM); f.set(CX - 5, 9, GH)        # clasp
    if style == "movility":                                        # light windswept cloak
        b = _drape(f, 13, 56, lambda t: 8 + 9 * t, asym=0.9)
        _folds(f, b, (-0.5, 0.4))
        for yy in range(50, 57):                                   # forked / split hem
            if yy in b:
                xl, xr = b[yy]; mid = (xl + xr) // 2; w = yy - 49
                box(f, mid - w, yy, mid + w, yy, 0)
        for i in range(12):
            f.set(CX - 4 + i // 3, 18 + i, MH)                     # sheen streak
    elif style == "obsidian":                                      # sleek pointed mantle
        def hw(t):
            if t < 0.15:
                return 9 + 7 * (t / 0.15)
            if t < 0.7:
                return 16
            return 16 * (1 - (t - 0.7) / 0.3)
        b = _drape(f, 12, 58, hw)
        _folds(f, b, (-0.45, 0.45))
        for i in range(16):
            f.set(CX - 6 + i // 3, 18 + i, RUNE)                   # glossy blue sheen
    elif style == "fire":                                          # billowing, tattered + flames
        b = _drape(f, 12, 54, lambda t: 8 + 13 * t + 3 * math.sin(t * math.pi))
        _folds(f, b, (-0.5, 0.0, 0.5))
        for x in range(CX - 20, CX + 21, 4):
            for k in range(2 + (x * 7) % 3):
                f.set(x, 54 - k, 0); f.set(x + 1, 54 - k, 0)       # tattered hem
        for x in range(CX - 18, CX + 19, 5):
            cluster(f, x, 52, [(0, 0), (0, 2), (-1, 3), (1, 4)], AH); f.set(x, 49, AM)
    elif style == "infernal":                                      # biggest, horned, hellfire hem
        b = _drape(f, 11, 54, lambda t: 9 + 15 * t + 4 * math.sin(t * math.pi))
        _folds(f, b, (-0.5, 0.0, 0.5))
        for s in (-1, 1):                                          # horned collar clasp
            for i in range(4):
                f.set(CX + s * (8 + i), 10 - i, AM)
            f.set(CX + s * 12, 6, AH)
        for x in range(CX - 22, CX + 23, 4):
            for k in range(2 + (x * 5) % 3):
                f.set(x, 54 - k, 0); f.set(x + 1, 54 - k, 0)       # tattered hem
        for x in range(CX - 20, CX + 21, 5):
            cluster(f, x, 52, [(0, 0), (0, 2), (-1, 3), (1, 4), (0, 5)], AH)
        for ex in range(CX - 16, CX + 17, 8):
            f.set(ex, 47, GLOW)                                    # embers
    outline(f, OUT)


def draw_gloves(f, motif=None):
    box(f, CX - 10, 42, CX + 10, 52, MB)                     # flared cuff
    box(f, CX - 11, 50, CX + 11, 52, MD); box(f, CX - 10, 42, CX + 10, 43, MH)
    box(f, CX - 8, 28, CX + 8, 42, MB)                       # back of hand
    for fx in (CX - 7, CX - 3, CX + 1, CX + 5):              # four fingers
        box(f, fx, 18, fx + 2, 28, MB); f.set(fx, 18, MH)
    for gx in (CX - 4, CX, CX + 4):
        box(f, gx, 20, gx, 28, OUT)                          # finger gaps
    box(f, CX - 11, 30, CX - 8, 38, MB)                      # thumb
    box(f, CX - 8, 30, CX + 8, 31, MH)                       # knuckle ridge
    box(f, CX + 7, 28, CX + 8, 42, MD)                       # right shade
    if motif == "rune":
        for rx, ry in [(CX - 3, 34), (CX + 2, 36), (CX - 1, 38), (CX + 3, 32)]:
            f.set(rx, ry, RUNE)
    elif motif == "skull":
        box(f, CX - 2, 34, CX - 1, 35, OUT); box(f, CX + 1, 34, CX + 2, 35, OUT)
        box(f, CX - 1, 37, CX + 1, 38, MH)
    outline(f, OUT)


def _one_boot(f, cx, sign, style):
    """One rounded upright boot (flared cuff, curved shaft, rounded foot+toe)."""
    sleek = style in ("snakeskin", "haste")
    cuff_h = 4 if sleek else 6
    top, ank, bot = 9, 37, 52
    fx = cx + sign * 2                                       # foot leans slightly outward
    for y in range(top + cuff_h, ank):                       # rounded shaft (taper to ankle)
        t = (y - (top + cuff_h)) / (ank - (top + cuff_h))
        wi = max(3, int(round(5.0 - 1.2 * t)))
        row(f, cx - wi, cx + wi, y, MB, MH, MD)
    for y in range(ank, bot):                                # rounded foot (bulge → toe)
        t = (y - ank) / (bot - ank)
        wi = int(round(4 + 1.6 * math.sin(t * math.pi)))
        row(f, fx - wi, fx + wi, y, MB, MH, MD)
    disc(f, fx + sign, bot - 2, 3, MB)                       # rounded toe
    if sleek:
        f.set(fx + sign * 3, bot - 1, MB); f.set(fx + sign * 4, bot - 1, MB)   # pointed tip
    box(f, fx - 4, bot, fx + 4, bot, MD)                     # sole
    box(f, cx - 6, top, cx + 6, top + cuff_h - 1, MM)        # flared folded cuff
    f.set(cx - 6, top, 0); f.set(cx + 6, top, 0)             # round cuff corners
    box(f, cx - 6, top + 1, cx - 5, top + cuff_h - 1, MH)
    box(f, cx - 6, top + cuff_h - 1, cx + 6, top + cuff_h - 1, MD)
    box(f, cx + 4, top + cuff_h, cx + 5, ank - 1, MD)        # shaft roundness (lit L / dark R)
    box(f, cx - 5, top + cuff_h, cx - 4, ank - 1, MH)
    if style == "leather":
        box(f, cx - 5, 23, cx + 5, 24, MD)                   # strap + steel buckle
        box(f, cx - 1, 22, cx + 1, 25, SMM); f.set(cx, 23, SMH)
    elif style == "snakeskin":
        for yy in range(top + cuff_h + 1, ank, 3):
            for xx in range(cx - 3, cx + 4, 3):
                f.set(xx, yy, MH)                            # scales
    elif style == "primordial":
        for yy in range(16, 34, 4):
            for xx in range(cx - 3, cx + 4, 4):
                f.set(xx, yy, AM); f.set(xx + 1, yy + 1, AH) # molten cracks
    elif style == "steelplate":
        for yy in (20, 27, 33):                              # sabaton lames
            box(f, cx - 5, yy, cx + 5, yy, SMD); box(f, cx - 5, yy - 1, cx + 5, yy - 1, SMH)
    elif style == "haste":
        ox = cx + sign * 6
        for i in range(5):
            f.set(ox + sign * i, 24 - i, AH); f.set(ox + sign * i, 25 - i, AM)   # ankle wing
    if style in ("leather", "dragon", "primordial", "steelplate", "golden"):
        cm, ch = (GM, GH) if style == "golden" else (SMM, SMH)
        disc(f, fx + sign, bot - 2, 3, cm); f.set(fx + sign - 1, bot - 3, ch)    # metal toe cap
    if style == "dragon":
        for k in (1, 3, 5):
            f.set(fx + sign * k, bot + 1, AH); f.set(fx + sign * k, bot + 2, AM) # claws
    if style == "golden":
        box(f, cx - 6, top, cx + 6, top, GH)                 # gold cuff rim


def draw_boots(f, style):
    _one_boot(f, CX - 8, -1, style)
    _one_boot(f, CX + 8, 1, style)
    outline(f, OUT)


def draw_legs(f, style):
    plated = style != "leather"
    # hip block (pelvis)
    for y in range(14, 25):
        hw = int(round(12 - (y - 14) / 10))
        row(f, CX - hw, CX + hw, y, MB, MH, MD)
    for k in range(2):                                          # round hip top corners
        for j in range(2 - k):
            f.set(CX - 12 + j, 14 + k, 0); f.set(CX + 12 - j, 14 + k, 0)
    # two legs — full thighs together up top, spreading to the ankles (knee pinch + calf bulge)
    ytop, ybot = 23, 56
    for y in range(ytop, ybot + 1):
        t = (y - ytop) / (ybot - ytop)
        outer = 12 - 3 * t - 1.3 * math.exp(-((t - 0.42) / 0.09) ** 2) + 1.1 * math.exp(-((t - 0.6) / 0.12) ** 2)
        o, ii = int(round(outer)), int(round(1 + 3.5 * t))
        row(f, CX - o, CX - ii, y, MB, MH, MD)
        row(f, CX + ii, CX + o, y, MB, MH, MD)
    for k in range(5):                                          # crotch V notch
        box(f, CX - (4 - k), 23 + k, CX + (4 - k), 23 + k, 0)
    # belt + buckle
    box(f, CX - 12, 14, CX + 12, 15, GM if plated else LM)
    if plated:
        box(f, CX - 2, 14, CX + 2, 16, GM); f.set(CX - 1, 14, GH)
    # knee poleyns
    for s in (-1, 1):
        kx = CX + s * 6
        if plated:
            disc(f, kx, 38, 4, GM); disc(f, kx - 1, 37, 2, GH); ring(f, kx, 38, 4, GD, th=1.0)
        else:
            disc(f, kx, 38, 3, GM); f.set(kx - 1, 37, GH)
    if plated:
        heavy = style in ("knight", "golden")                   # heavy gold trim tier
        for s in (-1, 1):
            if heavy:
                for yy in range(26, 51):                        # gold outer-edge trim (side panels)
                    for dx in range(12, 2, -1):
                        if f.get(CX + s * dx, yy) != 0:
                            f.set(CX + s * dx, yy, GH if yy % 4 == 0 else GM); break
            for yy in (30, 35, 45):                             # plate segment lines
                for dx in range(3, 11):
                    if f.get(CX + s * dx, yy) != 0:
                        f.set(CX + s * dx, yy, MD)
            for dx in range(4, 11):                             # gold ankle cuff
                for yy in (52, 53, 54):
                    if f.get(CX + s * dx, yy) != 0:
                        f.set(CX + s * dx, yy, GH if yy == 52 else GM)
        if style == "knight":                                   # sapphire gems (belt + knees)
            f.set(CX, 15, AH)
            for s in (-1, 1):
                f.set(CX + s * 6, 38, AH)
    else:
        for yi, yy in enumerate(range(28, 52, 4)):              # quilted leather diamonds
            for xx in range(CX - 11, CX + 12, 4):
                px = xx + (yi % 2) * 2
                if f.get(px, yy) != 0:
                    f.set(px, yy, MD)
        for s in (-1, 1):
            for dx in range(4, 10):
                if f.get(CX + s * dx, 53) != 0:
                    f.set(CX + s * dx, 53, MC)                  # leather cuff
    outline(f, OUT)


# ── per-base specs: (kind_dir, palette, draw_callable(f, tier)) ───────────────────────
def A(kind):
    mat, accent = ARMOR_MAT[kind]
    return ("armors", gpal(mat, accent), lambda f, t: draw_armor(f, t, kind))


def SH(shape, mat, accent="gold", emblem=None):
    return ("shields", gpal(mat, accent), lambda f, t: draw_shield(f, t, shape, emblem))


def HE(style, mat, accent="gold", plume=False):
    return ("helmets", gpal(mat, accent), lambda f, t: draw_helmet(f, t, style, plume))


def RG(mat, accent, motif=None, glow=False):
    return ("rings", gpal(mat, accent), lambda f, t: draw_ring(f, motif, glow))


def AMU(kind_dir, mat, accent, pendant):
    return (kind_dir, gpal(mat, accent), lambda f, t: draw_amulet(f, pendant))


def CP(mat, accent, style):
    return ("capes", gpal(mat, accent), lambda f, t: draw_cape(f, style))


def GL(mat, accent, motif=None):
    return ("gloves", gpal(mat, accent), lambda f, t: draw_gloves(f, motif))


def BT(mat, accent, style):
    return ("boots", gpal(mat, accent), lambda f, t: draw_boots(f, style))


def LG(mat, accent, style):
    return ("legs", gpal(mat, accent), lambda f, t: draw_legs(f, style))


BASES = {
    # armor — bespoke silhouette per id
    "padded": A("padded"), "leather": A("leather"), "studded": A("studded"), "hide": A("hide"),
    "chainShirt": A("chainShirt"), "scaleMail": A("scaleMail"), "breastplate": A("breastplate"),
    "halfPlate": A("halfPlate"), "ringMail": A("ringMail"), "chainMail": A("chainMail"),
    "splint": A("splint"), "plate": A("plate"), "paladin-armor": A("paladin-armor"),
    "albino-plate": A("albino-plate"),
    # shields
    "shield": SH("heater", "wood"),
    "tower-shield": SH("tower", "wood"), "towerShield": SH("tower", "wood"),
    "dragon-shield": SH("round", "green", "emerald", "dragon"),
    "demon-shield": SH("round", "red", "ruby", "demon"),
    "medusa-shield": SH("round", "green", "emerald", "medusa"),
    "mastermind-shield": SH("round", "blue", "sapphire", "mastermind"),
    "guardian-spellbook": SH("book", "blue", "sapphire"),
    # helmets — distinct dome silhouettes
    "iron-med-helm": HE("nasal", "iron"), "steel-med-helm": HE("nasal", "steel"),
    "steel-helmet": HE("great", "steel"), "knight-helmet": HE("bascinet", "steel", plume=True),
    "golden-helmet": HE("gold", "gold"), "demon-helmet": HE("horned", "red", "ruby"),
    # capes
    "movility-cape": CP("green", "emerald", "movility"), "obsidian-cape": CP("iron", "sapphire", "obsidian"),
    "fire-cape": CP("red", "gold", "fire"), "infernal-cape": CP("red", "ruby", "infernal"),
    # amulets / necklaces (pendant on a chain)
    "amulet-of-power": AMU("amulets", "gold", "sapphire", "medallion"),
    "amulet-of-strength": AMU("amulets", "gold", "ruby", "fist"),
    "amulet-of-glory": AMU("amulets", "gold", "gold", "sun"),
    "amulet-of-torture": AMU("amulets", "steel", "ruby", "skull"),
    "necklace-of-anguish": AMU("amulets", "steel", "sapphire", "skull"),
    "pearl-necklace": AMU("necklaces", "white", "sapphire", "pearl"),
    "ruby-necklace": AMU("necklaces", "gold", "ruby", "gem"),
    # gloves
    "leather-gloves": GL("leather", "gold"), "rune-gloves": GL("blue", "sapphire", "rune"),
    "barrows-gloves": GL("iron", "ruby", "skull"), "void-mage-gloves": GL("blue", "sapphire", "rune"),
    "void-range-gloves": GL("green", "emerald", "rune"),
    # boots
    "leather-boots": BT("leather", "gold", "leather"), "snakeskin-boots": BT("green", "emerald", "snakeskin"),
    "dragon-boots": BT("red", "gold", "dragon"), "primordial-boots": BT("iron", "gold", "primordial"),
    "steel-plate-boots": BT("steel", "gold", "steelplate"), "boots-of-haste": BT("white", "sapphire", "haste"),
    "golden-boots": BT("gold", "gold", "golden"),
    # legs
    "leather-legs": LG("leather", "gold", "leather"), "steel-plate-legs": LG("steel", "gold", "steelplate"),
    "knight-legs": LG("steel", "sapphire", "knight"), "golden-legs": LG("gold", "gold", "golden"),
    # rings (band + gem; identity carried by gem colour + motif)
    "ring-of-recoil": RG("white", "gold"), "ring-of-fire-damage": RG("gold", "ruby", "flame"),
    "shocking-ring": RG("white", "sapphire", "bolt"), "ring-of-fire": RG("gold", "ruby", "flame"),
    "ring-of-life": RG("gold", "emerald"), "berserker-ring": RG("steel", "ruby", "flame"),
    "archer-ring": RG("gold", "emerald"), "seers-ring": RG("white", "sapphire", "eye"),
    "berserker-ring-i": RG("gold", "ruby", "flame", glow=True),
}


def parse_tier(item_id):
    if "+" in item_id:
        base, t = item_id.rsplit("+", 1)
        return base, int(t)
    return item_id, 0


def _grid(items, out_path, scale=3):
    cols = 8
    cell = S * scale + 8
    rows = (len(items) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * cell, rows * (cell + 12)), (28, 28, 36, 255))
    dr = ImageDraw.Draw(sheet)
    for i, (wid, fr, pal) in enumerate(items):
        im = _to_p(fr, pal).convert("RGBA")
        px = im.load()
        for y in range(S):
            for x in range(S):
                if fr.px[y * S + x] == 0:
                    px[x, y] = (0, 0, 0, 0)
        im = im.resize((S * scale, S * scale), Image.NEAREST)
        cx, cy = (i % cols) * cell + 4, (i // cols) * (cell + 12) + 4
        sheet.alpha_composite(im, (cx, cy)); dr.text((cx, cy + S * scale), wid, fill=(200, 200, 210, 255))
    out_path.parent.mkdir(parents=True, exist_ok=True); sheet.save(out_path)


def main():
    do_montage = "--montage" in sys.argv
    do_wire = "--wire" in sys.argv
    with open(GEAR_CSV, encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        fieldnames = reader.fieldnames
        rows = list(reader)
    count = 0; skipped = []; built = []
    for r in rows:
        base, tier = parse_tier(r["id"])
        spec = BASES.get(base)
        if not spec:
            skipped.append(r["id"]); continue
        kind_dir, pal, fn = spec
        f = F(S, S)
        fn(f, tier)
        assert f.w == 64 and f.h == 64, f"{r['id']} is {f.w}x{f.h}"
        save_png(ASSETS / kind_dir / f"{r['id']}.png", f, pal)
        r["sprite"] = f"/assets/{kind_dir}/{r['id']}.png"
        built.append((r["id"], f, pal)); count += 1
    print(f"Generated {count} gear icons. Skipped (no base spec): {skipped}")
    if do_wire:
        with open(GEAR_CSV, "w", encoding="utf-8", newline="") as fh:
            w = csv.DictWriter(fh, fieldnames=fieldnames, lineterminator="\n")
            w.writeheader(); w.writerows(rows)
        print(f"Wired {count} sprite cells in {GEAR_CSV.name}")
    if do_montage:
        _grid(built, ROOT / ".montage" / "_gear_grid.png")
        print("Montage:", ROOT / ".montage" / "_gear_grid.png")


if __name__ == "__main__":
    main()
