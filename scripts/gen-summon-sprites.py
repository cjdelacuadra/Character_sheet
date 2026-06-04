#!/usr/bin/env python3
"""Generate the summon-sprite assets: a shared portal opener + one idle loop per summon template.

Writes, under `src/renderer/public/assets/spells/effects/summon/`:
    portal_open_0.png .. portal_open_5.png   shared 6-frame arcane-portal opener (root)
    <type>/<id>_0.png .. <id>_3.png          a 4-frame seamless idle loop per PNG template

Run from the repo root:
    python scripts/gen-summon-sprites.py            # generate + verify
    python scripts/gen-summon-sprites.py --montage  # also dump frame montages to .montage/

Resolution bump: sprites are now 64x64 px (was 22x22). All spatial constants multiplied by
S=64/22 so art fills the same fraction of the canvas. CSS display sizes are unchanged.
NAMING convention: effects/summon/<type>/<id_with_underscores>_<frame>.png — pure function of
(type, id). Ignores descriptive names in needed.md; follows real ids from summonTemplates.ts.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

from PIL import Image

from spritelib import F, H, dith, disc, ring, line, box, save_png, montage
from spritelib import DAMAGE_PALS as DP

ROOT   = Path(__file__).resolve().parents[1]
SUMMON = ROOT / "src" / "renderer" / "public" / "assets" / "spells" / "effects" / "summon"

SUMMON_FRAMES = 4
PORTAL_FRAMES = 6

W = 64
C = (W - 1) / 2   # = 31.5
S = W / 22         # ≈ 2.909

T = (0, 0, 0)  # index 0 — transparent

# ── local palettes ────────────────────────────────────────────────────────────
PAL_bone     = [T, H("7a7a6a"), H("b8b8a0"), H("dcdcc8"), H("ffffff")]
PAL_zombie   = [T, H("3a5a2a"), H("5a7a3a"), H("7a9a4a"), H("a0bf6a")]
PAL_beast    = [T, H("5a4a2a"), H("7a6a3a"), H("5f9a3a"), H("a8c860")]
PAL_steel    = [T, H("4a5a6a"), H("7a8a9a"), H("a8b8c8"), H("e0e8f0")]
PAL_stone    = [T, H("454545"), H("6a6a6a"), H("8e8e8e"), H("b6b6b6")]
PAL_steam    = [T, H("8a9a9a"), H("c0d0d0"), H("e4eeee"), H("ffffff")]
PAL_sand     = [T, H("8a7a4a"), H("b4a472"), H("d4c498"), H("f0e2b8")]
PAL_mud      = [T, H("4a3a22"), H("6a4f30"), H("8a6a40"), H("ac8e5e")]
PAL_smoke    = [T, H("2c2c2c"), H("4c4c4c"), H("6e6e6e"), H("9a9a9a")]
PAL_shadow   = [T, H("201a2a"), H("38304a"), H("56466a"), H("8c7c9c")]
PAL_feypink  = [T, H("c84aa0"), H("ff80c8"), H("ffa8d8"), H("ffd8ec")]
PAL_owl      = [T, H("5a4a3a"), H("8a7050"), H("b09472"), H("e2caa2")]
PAL_drake    = [T, H("2a5a3a"), H("3a7a4a"), H("5fa05f"), H("96c886")]
PAL_air      = [T, H("7a9ac0"), H("a8c8e8"), H("d2e8ff"), H("ffffff")]
PAL_portal   = [T, H("3a1a6a"), H("6a3fd0"), H("b46cff"), H("e6c8ff")]
PAL_cannon_fire  = [T, H("555555"), H("8a8a8a"), H("ff5a2a"), H("ffb24a")]
PAL_cannon_force = [T, H("555555"), H("8a8a8a"), H("b050e0"), H("d888f8")]
PAL_cannon_aura  = [T, H("555555"), H("8a8a8a"), H("4fd6a0"), H("b0ffd8")]
PAL_fire, PAL_cold, PAL_force   = DP["fire"], DP["cold"], DP["force"]
PAL_radiant, PAL_acid, PAL_psychic = DP["radiant"], DP["acid"], DP["psychic"]


# ── archetypes ────────────────────────────────────────────────────────────────
def arch_humanoid(f, i, N, pal, wings=False, armor=False):
    ph = 2 * math.pi * i / N
    by = W - int(2*S) + round(math.sin(ph) * 0.5*S)  # gentle bob near canvas bottom
    disc(f, C, by - 11*S, 2.0*S, 3)               # head
    if armor:
        ring(f, C, by - 11*S, 2.7*S, 4, th=1.0*S)
    box(f, C - 1.5*S, by - 9*S, C + 1.5*S, by - 3*S, 2)   # torso
    disc(f, C, by - 6*S, 0.5*S, 1)                          # torso highlight
    if armor:
        box(f, C - 2.5*S, by - 8*S, C + 2.5*S, by - 7*S, 4)  # shoulder plate
    # arms
    disc(f, C - 3*S, by - 8*S, 0.7*S, 2); disc(f, C - 3*S, by - 7*S, 0.6*S, 1)
    disc(f, C + 3*S, by - 8*S, 0.7*S, 2); disc(f, C + 3*S, by - 7*S, 0.6*S, 1)
    box(f, C - 2*S, by - 3*S, C - S, by, 1)       # left leg
    box(f, C + S,   by - 3*S, C + 2*S, by, 1)     # right leg
    if wings:
        for k in range(1, int(6*S)):
            yy = by - 10*S + (k // int(2*S)) * S
            f.set(C - 2*S - k, yy, 3 if k % int(2*S) else 2)
            f.set(C + 2*S + k, yy, 3 if k % int(2*S) else 2)
    # travelling shimmer
    sy = by - 10*S + int((i / N) * 8*S)
    disc(f, C, sy, S*0.4, 4)


def arch_quadruped(f, i, N, pal):
    ph = 2 * math.pi * i / N
    by = W - int(3*S) + round(math.sin(ph) * 0.5*S)
    box(f, 6*S, by - 5*S, 15*S, by - 2*S, 2)      # body
    disc(f, C, by - 4*S, 2.3*S, 2)
    disc(f, 16*S, by - 5*S, 2.0*S, 3)             # head
    disc(f, 17*S, by - 6*S, 0.6*S, 4)             # eye glint
    line(f, 6*S, by - 4*S, 3*S, by - 6*S, 1)      # tail
    for lx_raw in (7, 9, 13, 15):                  # legs
        lx = lx_raw * S
        disc(f, lx, by - S, 0.8*S, 1); disc(f, lx, by, 0.8*S, 1)
    sx = 7*S + int((i / N) * 7*S)
    disc(f, sx, by - 6*S, 0.6*S, 4)               # ridge shimmer


def arch_mephit(f, i, N, pal):
    ph = 2 * math.pi * i / N
    cy = 12*S + math.sin(ph) * 1.2*S              # hovering bob
    disc(f, C, cy, 2.6*S, 2); disc(f, C, cy, 1.4*S, 3)
    disc(f, C, cy - S, 0.5*S, 4)                  # eye
    wf = 1 + (0.5 + 0.5 * math.sin(ph)) * 1.5
    for k in range(1, 4):                          # wings (3 feather positions)
        f.set(C - 2*S - k*S, cy - S + int(k * 0.3*S * wf), 2)
        f.set(C + 2*S + k*S, cy - S + int(k * 0.3*S * wf), 2)
    disc(f, C - S, cy + 3*S, 0.7*S, 1); disc(f, C + S, cy + 3*S, 0.7*S, 1)
    off = (i / N) * 12*S                           # rising vapour
    for k in range(10):
        vy = (k * 2*S - off) % (12*S)
        vx = C + math.sin(k * 1.3) * 3*S
        if vy < cy - 2*S and dith(int(vx), int(vy), 0.5):
            f.set(vx, 2*S + vy, 1)


def arch_column(f, i, N, pal):
    ph = 2 * math.pi * i / N
    y_start, y_end = int(4*S), int(21*S)
    span = y_end - y_start
    for y in range(y_start, y_end):
        t = (y - y_start) / span
        sway = math.sin(ph + y * 0.5 / S) * 2.5*S * (1 - t * 0.4)
        w_px = (1 + (1 - t) * 2) * S
        for dx in range(-int(w_px), int(w_px) + 1):
            idx = 3 if abs(dx) < S else (2 if abs(dx) < w_px else 1)
            f.set(C + sway + dx, y, idx)
    disc(f, C + math.sin(ph) * 2*S, y_start, S*0.7, 4)   # bright crown


def arch_serpent(f, i, N, pal):
    ph = 2 * math.pi * i / N
    prev = None
    for k in range(14):                            # 14 body segments
        y = W - 2*S - k * S
        x = C + math.sin(ph + k * 0.55) * 4*S * (k / 14 + 0.3)
        if prev:
            line(f, prev[0], prev[1], x, y, 3 if k > 10 else 2)
        prev = (x, y)
        if k > 10:
            disc(f, x + S, y, 0.8*S, 4)           # head glint
    disc(f, C, W - 2*S, 2.2*S, 1, density=0.7)   # base pool


def arch_cannon(f, i, N, pal):
    ph = 2 * math.pi * i / N
    glow = 0.5 + 0.5 * math.sin(ph)
    box(f, 7*S, 18*S, 14*S, 20*S, 1)              # base platform
    line(f, 8*S, 18*S, 6*S, 21*S, 2)              # tripod left
    line(f, 13*S, 18*S, 15*S, 21*S, 2)            # tripod right
    disc(f, C, 14*S, 3.2*S, 2); disc(f, C, 14*S, 2.0*S, 1)  # body
    line(f, C, 14*S, 17*S, 8*S, 3)                # barrel
    line(f, C + S, 14*S, 18*S, 8*S, 3)
    disc(f, 18*S, 8*S, 0.8*S, 4)                  # muzzle
    if glow > 0.5:
        disc(f, 18*S, 8*S, 1.4*S * glow, 4, density=0.7)


def arch_skull(f, i, N, pal):
    ph = 2 * math.pi * i / N
    cy = 11*S + math.sin(ph) * S
    disc(f, C, cy, 3.4*S, 2); disc(f, C, cy + 0.5*S, 3.0*S, 3)
    disc(f, C - 1.5*S, cy - 0.5*S, 0.8*S, 1)     # left eye socket
    disc(f, C + 1.5*S, cy - 0.5*S, 0.8*S, 1)     # right eye socket
    disc(f, C, cy + 1.5*S, 0.5*S, 1)              # nose
    for dx_raw in (-2, -1, 0, 1, 2):              # jaw
        f.set(C + dx_raw*S, cy + 3*S, 2)
    for k in range(8):                             # flame wreath
        a = k * math.pi / 4
        fl = (4 + (0.5 + 0.5 * math.sin(ph * 2 + k)) * 2) * S
        x = C + math.cos(a) * fl; y = cy + math.sin(a) * fl
        if dith(int(x), int(y), 0.6):
            f.set(x, y, 4)


def arch_object(f, i, N, pal):
    ph = 2 * math.pi * i / N
    cy = (11 + math.sin(ph) * 1.4) * S
    box(f, C - 3*S, cy - 3*S, C + 3*S, cy + 3*S, 2)
    box(f, C - 3*S, cy - 3*S, C + 3*S, cy - 3*S, 3)   # top highlight
    disc(f, C - 2*S, cy - 2*S, 0.6*S, 3)
    r = (3.5 + (0.5 + 0.5 * math.sin(ph)) * 2) * S
    ring(f, C, cy, r, 1, th=1.0*S, density=0.5)
    disc(f, C + math.cos(ph)*r, cy + math.sin(ph)*r, 0.7*S, 4)


def arch_bird(f, i, N, pal):
    ph = 2 * math.pi * i / N
    cy = (11 + math.sin(ph) * 1.2) * S
    disc(f, C, cy + S, 2.6*S, 2)                  # body
    disc(f, C, cy - 1.5*S, 2.0*S, 3)             # head
    disc(f, C - S, cy - 2*S, 0.6*S, 4)            # left eye
    disc(f, C + S, cy - 2*S, 0.6*S, 4)            # right eye
    disc(f, C, cy - S, 0.5*S, 1)                  # beak
    flap = math.sin(ph) * 3*S
    for k in range(1, 4):                          # wings
        f.set(C - 2*S - k*S, cy + S - flap * (k / 3), 2)
        f.set(C + 2*S + k*S, cy + S - flap * (k / 3), 2)
    disc(f, C - S, cy + 4*S, 0.6*S, 1)            # left talon
    disc(f, C + S, cy + 4*S, 0.6*S, 1)            # right talon


def arch_drake(f, i, N, pal):
    ph = 2 * math.pi * i / N
    by = W - int(4*S) + round(math.sin(ph) * 0.5*S)
    box(f, 7*S, by - 4*S, 13*S, by - S, 2)        # body
    line(f, 13*S, by - 4*S, 15*S, by - 5*S, 2)   # neck
    disc(f, 15*S, by - 5*S, 1.8*S, 3)             # head
    disc(f, 16*S, by - 6*S, 0.6*S, 4)             # eye
    line(f, 7*S, by - 3*S, 3*S, by - S, 1)        # tail
    disc(f, 8*S, by, 0.8*S, 1); disc(f, 12*S, by, 0.8*S, 1)
    flap = math.sin(ph) * 2*S
    for k in range(1, 5):                          # wing
        f.set(9*S + k*S, by - 6*S - int(flap * (k / 4)), 3 if k % 2 else 2)


def arch_blob(f, i, N, pal):
    ph = 2 * math.pi * i / N
    by = 17*S
    disc(f, C, by - 2*S, (4.0 + math.sin(ph) * 0.4)*S, 2)  # squat body
    disc(f, C, by - 3*S, 2.5*S, 3)
    disc(f, C - 2*S, by - 5*S, 0.7*S, 4)          # left eye
    disc(f, C + 2*S, by - 5*S, 0.7*S, 4)          # right eye
    for lx_raw in (-4, -3, 3, 4):                  # splayed legs
        f.set(C + lx_raw*S, by + S, 1)
    for k in range(5):                             # rift shimmer behind
        yy = 3*S + k * 2*S
        f.set(C + math.sin(ph + k) * 4*S, yy, 4 if dith(int(C), int(yy), 0.4) else 0)


def d_portal(f, i, N):
    t = i / (N - 1)
    for k in range(3):                             # concentric expanding rings
        r = (1 + t * 9 - k * 2.5) * S
        if r > 0.5:
            idx = 4 if k == 0 else (3 if k == 1 else 2)
            ring(f, C, C, r, idx, th=1.2*S, density=1 - t * 0.4)
    if t < 0.5:                                    # core flash early
        disc(f, C, C, (2 * (1 - t*2) + 0.5) * S, 4, density=0.8)
    for k in range(6):                             # swirl sparks
        a = k * math.pi / 3 + t * 3
        rr = t * 9 * S
        disc(f, C + math.cos(a)*rr, C + math.sin(a)*rr, S*0.4, 3)


# ── manifest ──────────────────────────────────────────────────────────────────
SUMMONS = [
    ("creature",    "skeleton",                       arch_humanoid,  PAL_bone,         {}),
    ("creature",    "zombie",                         arch_humanoid,  PAL_zombie,       {}),
    ("creature",    "beast-spirit",                   arch_quadruped, PAL_beast,        {}),
    ("creature",    "fey-spirit",                     arch_humanoid,  PAL_psychic,      {}),
    ("construct",   "steel-defender",                 arch_quadruped, PAL_steel,        {}),
    ("construct",   "tiny-servant",                   arch_object,    PAL_force,        {}),
    ("construct",   "homunculus-servant",             arch_humanoid,  PAL_force,        {"wings": True}),
    ("construct",   "dancing-item",                   arch_object,    PAL_radiant,      {}),
    ("structure",   "eldritch-cannon-flamethrower",   arch_cannon,    PAL_cannon_fire,  {}),
    ("structure",   "eldritch-cannon-force-ballista", arch_cannon,    PAL_cannon_force, {}),
    ("structure",   "eldritch-cannon-protector",      arch_cannon,    PAL_cannon_aura,  {}),
    ("celestial",   "guardian-of-faith",              arch_humanoid,  PAL_radiant,      {"armor": True}),
    ("celestial",   "celestial-avenger",              arch_humanoid,  PAL_radiant,      {"wings": True}),
    ("undead",      "floating-skull",                 arch_skull,     PAL_fire,         {}),
    ("elemental",   "steam-mephit",                   arch_mephit,    PAL_steam,        {}),
    ("elemental",   "dust-mephit",                    arch_mephit,    PAL_sand,         {}),
    ("elemental",   "ice-mephit",                     arch_mephit,    PAL_cold,         {}),
    ("elemental",   "magma-mephit",                   arch_mephit,    PAL_fire,         {}),
    ("elemental",   "mud-mephit",                     arch_mephit,    PAL_mud,          {}),
    ("elemental",   "smoke-mephit",                   arch_mephit,    PAL_smoke,        {}),
    ("elemental",   "air-elemental-myrrh",            arch_humanoid,  PAL_air,          {"armor": True}),
    ("elemental",   "fire-elemental-myrrh",           arch_humanoid,  PAL_fire,         {"armor": True}),
    ("elemental",   "air-elemental-spirit",           arch_column,    PAL_air,          {}),
    ("elemental",   "fire-elemental-spirit",          arch_column,    PAL_fire,         {}),
    ("elemental",   "water-weird",                    arch_serpent,   PAL_cold,         {}),
    ("elemental",   "gargoyle",                       arch_humanoid,  PAL_stone,        {}),
    ("fey",         "fey-spirit-mirthful",            arch_humanoid,  PAL_feypink,      {}),
    ("monstrosity", "shadowspawn-fury",               arch_humanoid,  PAL_shadow,       {}),
    ("aberration",  "aberration-spawn-slaad",         arch_blob,      PAL_acid,         {}),
    ("beast",       "familiar-owl",                   arch_bird,      PAL_owl,          {}),
    ("dragon",      "drake-companion",                arch_drake,     PAL_drake,        {}),
]


def main():
    do_montage = "--montage" in sys.argv

    portal_frames = []
    for i in range(PORTAL_FRAMES):
        fr = F(W, W); d_portal(fr, i, PORTAL_FRAMES)
        save_png(SUMMON / f"portal_open_{i}.png", fr, PAL_portal)
        portal_frames.append(fr)
    with Image.open(SUMMON / "portal_open_0.png") as im:
        assert im.size == (W, W), f"portal size {im.size}"
    if do_montage:
        montage(portal_frames, PAL_portal, ROOT / ".montage" / "summon__portal_open.png")
    print(f"  ok  portal_open{'':32s} {W}x{W}  {PORTAL_FRAMES}f  once")

    count = 0
    for typ, sid, fn, pal, kw in SUMMONS:
        stem = sid.replace("-", "_")
        frames = []
        for i in range(SUMMON_FRAMES):
            fr = F(W, W); fn(fr, i, SUMMON_FRAMES, pal, **kw)
            save_png(SUMMON / typ / f"{stem}_{i}.png", fr, pal)
            frames.append(fr)
        with Image.open(SUMMON / typ / f"{stem}_0.png") as im:
            assert im.size == (W, W), f"{typ}/{stem} size {im.size}"
        if do_montage:
            montage(frames, pal, ROOT / ".montage" / f"summon__{typ}__{stem}.png")
        count += 1
        print(f"  ok  {typ + '/' + stem:44s} {W}x{W}  {SUMMON_FRAMES}f  loop")

    print(f"\nGenerated {count} summon sprites + portal_open into {SUMMON}")
    if do_montage:
        print(f"Montages in {ROOT / '.montage'}")


if __name__ == "__main__":
    main()
