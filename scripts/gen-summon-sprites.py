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

from spritelib import F, H, dith, disc, ring, arc, line, box, save_png, montage
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

# ── dragon color palettes (chromatic + metallic) ──────────────────────────────
PAL_red_dragon    = DP["fire"]  # crimson-orange
PAL_blue_dragon   = [T, H("1a3080"), H("2858c8"), H("4888f8"), H("98c8ff")]
PAL_green_dragon  = [T, H("183818"), H("286828"), H("48a848"), H("88d888")]
PAL_black_dragon  = [T, H("1a1820"), H("282630"), H("404058"), H("686080")]
PAL_white_dragon  = [T, H("7ab0c8"), H("b0d8e8"), H("d8eef8"), H("f0faff")]
PAL_gold_dragon   = [T, H("8a5000"), H("c88010"), H("f0b820"), H("ffe880")]
PAL_silver_dragon = [T, H("4a5060"), H("808890"), H("b8c0c8"), H("e8eef8")]
PAL_bronze_dragon = [T, H("4a3010"), H("806020"), H("b09040"), H("d8c070")]
PAL_copper_dragon = [T, H("582010"), H("8a4020"), H("b86838"), H("e09070")]
PAL_brass_dragon  = [T, H("604000"), H("987010"), H("c8a020"), H("f0d060")]


# ── archetypes ────────────────────────────────────────────────────────────────
def _wing_fan(f, pivot_x, pivot_y, side, flap, base_idx=2):
    """Draw a bat-style wing as overlapping arcs fanning from pivot.
    side: -1 = left wing, +1 = right wing. flap: -1..1 sin value."""
    for dr in range(4):
        wr = (2.5 + dr * 1.8) * S
        if side < 0:  # left wing spans upper-left to lower-left
            a0 = math.pi * (0.7 - 0.12 * flap)
            a1 = math.pi * (1.35 + 0.12 * flap)
        else:          # right wing spans upper-right to lower-right
            a0 = math.pi * (-0.35 - 0.12 * flap)
            a1 = math.pi * (0.3 + 0.12 * flap)
        arc(f, pivot_x, pivot_y, wr, a0, a1,
            3 if dr < 2 else base_idx, step=0.04)


def arch_humanoid(f, i, N, pal, wings=False, armor=False, fey=False, fury=False):
    ph = 2 * math.pi * i / N
    flap = math.sin(ph)
    # Gentle left-right sway
    cx = C + math.sin(ph) * 0.8*S

    # All y in pixels: head≈9, torso 14-31, elbow≈23, feet≈60 — fits 64px canvas
    head_y     = 3*S       # ≈ 9px
    torso_t    = 5*S       # ≈ 15px
    torso_b    = 10.5*S    # ≈ 31px
    elbow_y    = 8*S       # ≈ 23px
    leg_b      = 20.5*S    # ≈ 60px
    shoulder_y = 6.5*S     # ≈ 19px

    # Fey: floating slightly above ground
    if fey:
        float_off = math.sin(ph) * 1.5*S  # gentle up-down float
        head_y += float_off; torso_t += float_off; torso_b += float_off
        elbow_y += float_off; leg_b += float_off - 3*S  # feet don't touch ground
        shoulder_y += float_off

    # Head
    disc(f, cx, head_y, 2.2*S, 3)
    if armor:
        ring(f, cx, head_y, 2.9*S, 4, th=1.0*S)
    if fey:  # pointed elf ears
        line(f, cx - 2.5*S, head_y - 0.5*S, cx - 3.5*S, head_y - 2.5*S, 3)
        line(f, cx + 2.5*S, head_y - 0.5*S, cx + 3.5*S, head_y - 2.5*S, 3)
    # Eye blink — bright on frames 0-2, absent on frame 3
    if i % 4 < 3:
        disc(f, cx - 0.7*S, head_y - 0.3*S, 0.5*S, 4)

    # Neck + torso
    line(f, cx, head_y + 2.2*S, cx, torso_t, 2)
    box(f, cx - 2*S, torso_t, cx + 2*S, torso_b, 2)
    if armor:
        box(f, cx - 3*S, torso_t, cx + 3*S, torso_t + 2*S, 4)

    # Arms — fury raises them threateningly
    if fury:
        elbow_y_l = torso_t - 1*S     # arms up
        wrist_y_l = torso_t + 2*S
        line(f, cx - 2*S, shoulder_y, cx - 6*S, elbow_y_l, 2)
        line(f, cx - 6*S, elbow_y_l,  cx - 7*S, wrist_y_l, 1)
        line(f, cx + 2*S, shoulder_y, cx + 6*S, elbow_y_l, 2)
        line(f, cx + 6*S, elbow_y_l,  cx + 7*S, wrist_y_l, 1)
    else:
        line(f, cx - 2*S, shoulder_y, cx - 6*S, elbow_y, 2)
        line(f, cx - 6*S, elbow_y,    cx - 5*S, torso_b, 1)
        line(f, cx + 2*S, shoulder_y, cx + 6*S, elbow_y, 2)
        line(f, cx + 6*S, elbow_y,    cx + 5*S, torso_b, 1)

    # Legs
    box(f, cx - 2.5*S, torso_b, cx - 0.5*S, leg_b, 1)
    box(f, cx + 0.5*S, torso_b, cx + 2.5*S, leg_b, 1)

    # Wings (arc fans — visible at display size)
    if wings:
        _wing_fan(f, cx - 2*S, shoulder_y, -1, flap, base_idx=2)
        _wing_fan(f, cx + 2*S, shoulder_y,  1, flap, base_idx=2)

    # Fey sparkle ring
    if fey:
        ring(f, cx, (torso_t + torso_b) / 2, 4*S, 4, th=0.8*S, density=0.25 + 0.15*math.sin(ph))

    # Fury shadow tendrils
    if fury:
        for k in range(3):
            a = math.pi / 2 + (k - 1) * 0.6 + math.sin(ph + k) * 0.3
            r = (3 + k) * S
            f.set(cx + math.cos(a)*r, leg_b + S + math.sin(a)*r, 1)

    # Travelling shimmer
    sy = head_y + (i / N) * (leg_b - head_y)
    disc(f, cx, sy, 0.5*S, 4)


def arch_quadruped(f, i, N, pal):
    ph = 2 * math.pi * i / N
    # Wide horizontal — body centred, head far right, tail far left — fits 64px canvas
    body_y = 10*S     # ≈29px (body top — vertically centred)
    body_b = 13.5*S   # ≈39px
    body_l = 3.5*S    # ≈10px
    body_r = 16.5*S   # ≈48px
    leg_b  = 18.5*S   # ≈54px

    # Body
    box(f, body_l, body_y, body_r, body_b, 2)
    disc(f, (body_l+body_r)/2, (body_y+body_b)/2, 3*S, 1)  # shadow

    # Head — far right, disc + snout
    disc(f, 18*S, body_y - 1.5*S, 2.8*S, 3)     # ≈52px, y≈25px ✓
    disc(f, 18.5*S, body_y - 2.5*S, 0.9*S, 4)   # eye glint
    disc(f, 19.5*S, body_y - 0.5*S, 1.2*S, 2)   # snout ≈57px ✓

    # Tail — sweeps left and upward from body, tip animated
    tail_x = 1*S + math.sin(ph) * 1.5*S          # ≈3-7px
    line(f, body_l, body_y + 2*S, tail_x, body_y - 3*S, 1)
    line(f, tail_x, body_y - 3*S, max(1, tail_x - 2*S), body_y - 6*S, 1)

    # 4 legs — front pair right, rear pair left, alternating walk phase
    front_off = math.sin(ph) * 1.5*S
    rear_off  = math.sin(ph + math.pi) * 1.5*S
    for lx, off in [(5*S, rear_off), (8*S, rear_off),
                    (13*S, front_off), (16*S, front_off)]:
        box(f, lx - 1.5*S, body_b + off, lx + 1.5*S, leg_b + off, 1)

    # Ridge shimmer
    sx = body_l + (i / N) * (body_r - body_l)
    disc(f, sx, body_y, 0.6*S, 4)


def arch_mephit(f, i, N, pal):
    ph = 2 * math.pi * i / N
    flap = math.sin(ph)
    cy = 7.5*S + math.sin(ph) * 1.5*S             # hovering bob — upper half ≈22-26px

    # Wings — arc fans dominating the canvas width
    _wing_fan(f, C - 3*S, cy - S, -1, flap, base_idx=1)
    _wing_fan(f, C + 3*S, cy - S,  1, flap, base_idx=1)

    # Body (small — wings should be the dominant shape)
    disc(f, C, cy, 3*S, 2)
    disc(f, C, cy, 1.8*S, 3)
    # Eyes
    disc(f, C - 1.2*S, cy - 0.8*S, 0.6*S, 4)
    disc(f, C + 1.2*S, cy - 0.8*S, 0.6*S, 4)
    # Feet / claws
    disc(f, C - 1.2*S, cy + 3.5*S, 0.8*S, 1)
    disc(f, C + 1.2*S, cy + 3.5*S, 0.8*S, 1)

    # Rising vapour (elemental steam)
    off = (i / N) * 14*S
    for k in range(10):
        vy = (k * 2*S - off) % (14*S)
        vx = C + math.sin(k * 1.3) * 4*S
        if vy < cy - 4*S and dith(int(vx), int(vy), 0.45):
            f.set(vx, 4*S + vy, 1)


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
    cy = 7*S + math.sin(ph) * 1.5*S   # bob up/down ≈20-24px

    # Cranium — wide dome, brighter at top
    disc(f, C, cy, 4*S, 2)
    disc(f, C, cy - 0.5*S, 3.2*S, 3)

    # Cheekbones / jaw body
    box(f, C - 3.5*S, cy + 1.5*S, C + 3.5*S, cy + 4*S, 2)

    # Eye sockets — transparent holes punched into skull (index 0 = transparent)
    disc(f, C - 1.7*S, cy - 0.4*S, 1.2*S, 0)
    disc(f, C + 1.7*S, cy - 0.4*S, 1.2*S, 0)
    # Tiny glowing ember deep in each socket
    disc(f, C - 1.7*S, cy - 0.3*S, 0.4*S, 4)
    disc(f, C + 1.7*S, cy - 0.3*S, 0.4*S, 4)

    # Nasal cavity (two holes, index 0)
    disc(f, C - 0.5*S, cy + 0.9*S, 0.5*S, 0)
    disc(f, C + 0.5*S, cy + 0.9*S, 0.5*S, 0)

    # Upper teeth: 4 tooth pillars with transparent gaps between
    for tooth in range(4):
        tx = C - 2.5*S + tooth * 1.4*S
        box(f, tx, cy + 1.5*S, tx + 1*S, cy + 3*S, 3)
    # Gaps (index 0) between teeth
    for gap in range(3):
        gx = C - 2.5*S + (gap + 1) * 1.4*S - 0.4*S
        box(f, gx, cy + 1.5*S, gx + 0.5*S, cy + 3*S, 0)

    # Lower jaw bone (below teeth)
    box(f, C - 3.5*S, cy + 3*S, C + 3.5*S, cy + 4.5*S, 1)

    # Flame wreath orbiting the skull
    for k in range(8):
        a = k * math.pi / 4
        fl = (5.5 + (0.5 + 0.5 * math.sin(ph * 2 + k)) * 2) * S
        x = C + math.cos(a) * fl
        y = cy + math.sin(a) * fl
        if dith(int(x), int(y), 0.65):
            f.set(x, y, 4)


def arch_skeleton(f, i, N, pal):
    ph = 2 * math.pi * i / N
    # Rattle: high-frequency jitter
    jx = math.sin(ph * 2) * 0.8*S
    jy = math.sin(ph * 3 + 1) * 0.5*S
    cx = C + jx

    # Skull
    disc(f, cx, 2.5*S + jy, 2.5*S, 3)
    # Transparent eye sockets
    disc(f, cx - 1*S, 2.3*S + jy, 0.8*S, 0)
    disc(f, cx + 1*S, 2.3*S + jy, 0.8*S, 0)
    # Glowing eyes in sockets
    disc(f, cx - 1*S, 2.3*S + jy, 0.3*S, 4)
    disc(f, cx + 1*S, 2.3*S + jy, 0.3*S, 4)

    # Spine — visible central column
    for y_step in range(int(5*S), int(11*S)):
        f.set(cx, y_step + jy, 2 if y_step % 2 == 0 else 1)

    # Ribcage — 3 rib pairs curving outward from spine
    for rib in range(3):
        ry = (5.5 + rib * 1.6) * S + jy
        line(f, cx - 0.5*S, ry, cx - 4*S, ry + 0.8*S, 3 if rib == 0 else 2)
        line(f, cx + 0.5*S, ry, cx + 4*S, ry + 0.8*S, 3 if rib == 0 else 2)

    # Pelvis (wider hip box)
    box(f, cx - 3*S, 11*S + jy, cx + 3*S, 12.5*S + jy, 2)

    # Arms — thin bony lines
    line(f, cx - 1.5*S, 6*S + jy, cx - 5.5*S, 9*S + jy, 2)
    line(f, cx - 5.5*S, 9*S + jy, cx - 4.5*S, 12.5*S + jy, 1)
    line(f, cx + 1.5*S, 6*S + jy, cx + 5.5*S, 9*S + jy, 2)
    line(f, cx + 5.5*S, 9*S + jy, cx + 4.5*S, 12.5*S + jy, 1)

    # Legs — thin, with knee knob
    line(f, cx - 1.5*S, 12.5*S + jy, cx - 2*S,   17*S + jy, 1)   # left thigh
    disc(f, cx - 2*S, 17*S + jy, 0.6*S, 2)                        # left knee
    line(f, cx - 2*S,   17*S + jy, cx - 1.5*S, 21.5*S + jy, 1)   # left shin
    line(f, cx + 1.5*S, 12.5*S + jy, cx + 2*S,   17*S + jy, 1)   # right thigh
    disc(f, cx + 2*S, 17*S + jy, 0.6*S, 2)                        # right knee
    line(f, cx + 2*S,   17*S + jy, cx + 1.5*S, 21.5*S + jy, 1)   # right shin


def arch_zombie(f, i, N, pal):
    ph = 2 * math.pi * i / N
    # Slow shambling lurch — arms outstretched, head drooped
    lurch = math.sin(ph) * 0.7*S   # slow body sway
    arm_swing = math.sin(ph) * 1.2*S

    # Head — drooped forward and to the side
    head_x = C + 1.5*S + lurch
    disc(f, head_x, 3.5*S, 2.5*S, 2)
    # Hollow eye sockets
    disc(f, head_x + 0.8*S, 3*S, 0.8*S, 0)
    disc(f, head_x - 0.5*S, 3.2*S, 0.7*S, 0)
    # Exposed rot / flesh
    disc(f, head_x - 0.5*S, 4.5*S, 0.5*S, 3)

    # Torso (hunched — narrower, slightly tilted)
    box(f, C - 2*S, 6*S, C + 2.5*S, 12*S, 2)
    # Decay patches
    disc(f, C - 1.5*S, 8*S, 0.9*S, 3)   # wound
    disc(f, C + 1*S,   10*S, 0.6*S, 1)  # rot

    # Arms OUTSTRETCHED (zombie shuffle) — reaching forward
    line(f, C - 2*S, 7.5*S, C - 7*S, 9*S + arm_swing, 2)
    line(f, C - 7*S, 9*S + arm_swing, C - 9*S, 7.5*S, 1)     # forearm juts out
    line(f, C + 2.5*S, 7.5*S, C + 8*S, 9*S - arm_swing, 2)
    line(f, C + 8*S, 9*S - arm_swing, C + 9.5*S, 7.5*S, 1)

    # Legs — one drags behind (shamble)
    drag = math.sin(ph * 0.5) * 1.5*S
    box(f, C - 2.5*S, 12*S,        C - 0.5*S, 21*S, 1)          # left leg
    box(f, C + 0.5*S, 12*S + drag, C + 2.5*S, 21*S + drag, 1)   # right leg drags


def _feather_fan(f, pivot_x, pivot_y, side, flap, base_idx=2):
    """Angel/bird feathered wings spreading UPWARD — divine spread."""
    for dr in range(4):
        wr = (2.5 + dr * 1.8) * S
        fm = 0.12 * flap
        if side < 0:  # left wing: upper-left quadrant (-0.9π to -0.5π)
            a0, a1 = -math.pi * (0.9 + fm), -math.pi * 0.5
        else:          # right wing: upper-right quadrant (-0.5π to -0.1π)
            a0, a1 = -math.pi * 0.5, -math.pi * (0.1 - fm)
        arc(f, pivot_x, pivot_y, wr, a0, a1, 3 if dr < 2 else base_idx, step=0.04)


def arch_gargoyle(f, i, N, pal):
    """Crouching stone gargoyle — wings spread wide, horns, talons, menacing."""
    ph = 2 * math.pi * i / N
    flap = math.sin(ph)
    cy = 14*S   # body center ≈40px (crouching, lower in canvas)
    cx = C

    # Bat wings dominate (drawn first, behind body)
    _wing_fan(f, cx - 3*S, cy - 2*S, -1, flap, base_idx=1)
    _wing_fan(f, cx + 3*S, cy - 2*S,  1, flap, base_idx=1)

    # Stone body (compact, hunched)
    disc(f, cx, cy, 3.2*S, 2)
    disc(f, cx, cy, 1.8*S, 3)

    # Head (low, thrust forward)
    disc(f, cx, cy - 4.5*S, 2.2*S, 2)
    # Horns — angled outward like a devil
    line(f, cx - 1.5*S, cy - 6*S, cx - 3*S, cy - 8.5*S, 2)
    line(f, cx + 1.5*S, cy - 6*S, cx + 3*S, cy - 8.5*S, 2)
    # Glowing eyes (awakening)
    disc(f, cx - 0.8*S, cy - 4.5*S, 0.55*S, 4)
    disc(f, cx + 0.8*S, cy - 4.5*S, 0.55*S, 4)

    # Crouching legs with talons
    line(f, cx - 2*S, cy + 3*S, cx - 4*S, cy + 6*S, 1)
    line(f, cx + 2*S, cy + 3*S, cx + 4*S, cy + 6*S, 1)
    disc(f, cx - 4.5*S, cy + 6.5*S, 1.2*S, 1)   # left talon mass
    disc(f, cx + 4.5*S, cy + 6.5*S, 1.2*S, 1)   # right talon mass


def arch_homunculus(f, i, N, pal):
    """Tiny imp hovering — oversized head, big bat wings, imp tail. More wing than body."""
    ph = 2 * math.pi * i / N
    flap = math.sin(ph)
    cy = 6.5*S + math.sin(ph) * 1.5*S   # hover ≈19-23px

    # Large bat wings (the dominant visual — wider than the body)
    _wing_fan(f, C - 1.5*S, cy, -1, flap, base_idx=1)
    _wing_fan(f, C + 1.5*S, cy,  1, flap, base_idx=1)

    # Tiny body
    disc(f, C, cy + 1.5*S, 1.5*S, 2)

    # Oversized head (imp-like proportions)
    disc(f, C, cy - 1.5*S, 2.5*S, 3)
    # Tiny horns
    line(f, C - 1.5*S, cy - 3.2*S, C - 2.2*S, cy - 4.8*S, 2)
    line(f, C + 1.5*S, cy - 3.2*S, C + 2.2*S, cy - 4.8*S, 2)
    # Eyes (beady)
    disc(f, C - 0.8*S, cy - 1.8*S, 0.5*S, 4)
    disc(f, C + 0.8*S, cy - 1.8*S, 0.5*S, 4)

    # Imp tail (curling behind)
    tail_x = C + math.sin(ph) * 0.8*S
    line(f, C, cy + 3*S, tail_x + 2*S, cy + 4.5*S, 1)
    line(f, tail_x + 2*S, cy + 4.5*S, tail_x + 3*S, cy + 3.5*S, 1)

    # Clawed feet
    disc(f, C - 0.8*S, cy + 3.5*S, 0.6*S, 1)
    disc(f, C + 0.8*S, cy + 3.5*S, 0.6*S, 1)


def arch_celestial(f, i, N, pal, armor=False):
    """Floating divine figure — feathered wings pointing upward, halo, glow. Clearly holy."""
    ph = 2 * math.pi * i / N
    flap = math.sin(ph)
    fy = math.sin(ph) * S           # gentle float offset

    head_y  = 3*S + fy
    torso_t = 5*S + fy
    torso_b = 10.5*S + fy
    sh_y    = 6.5*S + fy
    elb_y   = 8.5*S + fy
    leg_b   = 16*S + fy             # short legs — floating, feet off ground

    # Feathered wings spread upward (NOT bat wings)
    _feather_fan(f, C - 2*S, sh_y, -1, flap, base_idx=2)
    _feather_fan(f, C + 2*S, sh_y,  1, flap, base_idx=2)

    # Divine body glow ring
    ring(f, C, (torso_t + torso_b) / 2, 5.5*S, 4, th=1.5*S,
         density=0.18 + 0.08*math.sin(ph))

    # Head + halo
    disc(f, C, head_y, 2.2*S, 3)
    ring(f, C, head_y, 3.2*S, 4, th=0.8*S, density=0.45)
    if i % 4 < 3:
        disc(f, C - 0.7*S, head_y - 0.3*S, 0.5*S, 4)

    # Neck + torso
    line(f, C, head_y + 2.2*S, C, torso_t, 2)
    box(f, C - 2*S, torso_t, C + 2*S, torso_b, 2)
    if armor:
        box(f, C - 3*S, torso_t, C + 3*S, torso_t + 2*S, 4)

    # Arms
    line(f, C - 2*S, sh_y, C - 6*S, elb_y, 2)
    line(f, C - 6*S, elb_y, C - 5*S, torso_b, 1)
    line(f, C + 2*S, sh_y, C + 6*S, elb_y, 2)
    line(f, C + 6*S, elb_y, C + 5*S, torso_b, 1)

    # Short legs (floating)
    box(f, C - 2*S, torso_b, C - 0.5*S, leg_b, 1)
    box(f, C + 0.5*S, torso_b, C + 2*S, leg_b, 1)


def arch_myrmidon(f, i, N, pal):
    """Elemental warrior — humanoid upper body, lower half dissolves into elemental wisps."""
    ph = 2 * math.pi * i / N

    head_y  = 3*S
    torso_t = 5*S
    torso_b = 11*S
    sh_y    = 6.5*S
    elb_y   = 8.5*S

    # Head
    disc(f, C, head_y, 2.2*S, 3)
    if i % 4 < 3:
        disc(f, C - 0.7*S, head_y - 0.3*S, 0.5*S, 4)
    line(f, C, head_y + 2.2*S, C, torso_t, 2)

    # Torso — dithered to look elemental/semi-translucent
    for py in range(int(torso_t), int(torso_b)):
        fade = (py - torso_t) / (torso_b - torso_t)
        for px in range(int(C - 2.5*S), int(C + 2.5*S)):
            if dith(px, py, 0.9 - fade * 0.4):
                f.set(px, py, 3 if py < torso_t + 2*S else 2)
    # Shoulder plates
    box(f, C - 3.5*S, torso_t, C + 3.5*S, torso_t + 2*S, 4)

    # Arms
    line(f, C - 2.5*S, sh_y, C - 6*S, elb_y, 2)
    line(f, C - 6*S, elb_y, C - 5*S, torso_b + S, 1)
    line(f, C + 2.5*S, sh_y, C + 6*S, elb_y, 2)
    line(f, C + 6*S, elb_y, C + 5*S, torso_b + S, 1)

    # Lower body: elemental wisp trail instead of legs
    for k in range(14):
        t = k / 13.0
        wy = torso_b + t * 10*S
        if wy > W - S:
            break
        wx = C + math.sin(ph + k * 0.9) * 2.5*S * (1 - t * 0.6)
        dens = 0.85 - t * 0.78
        if dith(int(wx), int(wy), dens):
            f.set(wx, wy, 4 if t < 0.15 else (3 if t < 0.45 else (2 if t < 0.75 else 1)))


def arch_steel_defender(f, i, N, pal):
    """Mechanical quadruped — all boxes and lines, geometric joints, sensor eye, antenna."""
    ph = 2 * math.pi * i / N
    pulse = 0.5 + 0.5 * math.sin(ph)

    # Main body (boxy, horizontal)
    box(f, 3.5*S, 8.5*S, 17*S, 14*S, 2)
    box(f, 4*S, 7.5*S, 16*S, 8.5*S, 3)    # top armour plate

    # Head (angular sensor block, right side)
    box(f, 13.5*S, 5.5*S, 18.5*S, 8.5*S, 2)
    box(f, 14*S, 6*S, 17.5*S, 8*S, 1)     # visor recess
    disc(f, 16*S, 7*S, 0.9*S, 4)           # sensor eye
    if pulse > 0.65:
        disc(f, 16*S, 7*S, 1.6*S, 4, density=0.35)   # sensor glow

    # Tail (segmented, left side)
    for k in range(3):
        bx = 3.5*S - k * 1.6*S
        by = 9.5*S
        box(f, bx - 1.2*S, by, bx, by + 3*S, 1 if k % 2 else 2)

    # Legs: 4 rigid pistons with foot pads, alternating phase
    for lx, phase in [(5.5*S, 0), (8.5*S, math.pi), (12*S, math.pi), (15*S, 0)]:
        lift = math.sin(ph + phase) * 1.2*S
        line(f, lx, 14*S, lx, 19.5*S - lift, 2)
        box(f, lx - 1.2*S, 19.5*S - lift, lx + 1.2*S, 20.5*S - lift, 1)

    # Antenna (fin on top)
    line(f, 10*S, 7.5*S, 10*S, 4*S, 3)
    disc(f, 10*S, 3.5*S, 0.7*S, 4)


def arch_beast_spirit(f, i, N, pal):
    """Ethereal predator spirit — elongated wolf/panther silhouette, ghost wisps, lithe legs."""
    ph = 2 * math.pi * i / N

    bx = C - S          # body centre-x (slightly left)
    body_y = 11.5*S     # body top ≈33px
    body_b = 14.5*S     # body bottom ≈42px

    # Elongated body disc (horizontal, wide)
    disc(f, bx, (body_y + body_b) / 2, 6*S, 2)
    disc(f, bx, (body_y + body_b) / 2, 3.8*S, 3)

    # Head — low, predatory, pointing right
    disc(f, bx + 6.5*S, body_y, 2.5*S, 3)         # head ≈48px ✓
    disc(f, bx + 8*S, body_y - S, 0.8*S, 4)        # eye
    line(f, bx + 8*S, body_y + S, bx + 10*S, body_y + 2*S, 2)  # snout

    # Tail — long sweep to the left, animated sway
    tip_x = bx - 8*S + math.sin(ph) * 2*S
    tip_y = body_y - 4*S + math.cos(ph) * S
    line(f, bx - 5*S, body_y + S, tip_x, tip_y, 1)
    disc(f, tip_x, tip_y, 0.6*S, 2)

    # 4 lithe legs
    front_off = math.sin(ph) * 1.5*S
    rear_off  = math.sin(ph + math.pi) * 1.5*S
    for lx, off in [(bx - 3*S, rear_off), (bx, rear_off),
                    (bx + 3*S, front_off), (bx + 5*S, front_off)]:
        line(f, lx, body_b, lx + 0.5*S, body_b + 4*S + off, 1)
        disc(f, lx + 0.5*S, body_b + 4*S + off, 0.6*S, 2)

    # Ghost wisps trailing behind (spirit nature)
    off_w = (i / N) * 8*S
    for k in range(6):
        wy = (k * 1.5*S - off_w) % (9*S) + body_y - 2*S
        wx = bx - 4*S + math.sin(k * 1.5 + ph * 0.5) * 2*S
        if dith(int(wx), int(wy), 0.3):
            f.set(wx, wy, 4)


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
    flap = math.sin(ph)
    cy = (6.5 + math.sin(ph) * 0.5) * S            # vertically centred ≈19px + bob

    # Wings — wide arcs spanning nearly full canvas width
    _wing_fan(f, C - 3*S, cy, -1, flap, base_idx=2)
    _wing_fan(f, C + 3*S, cy,  1, flap, base_idx=2)

    # Body
    disc(f, C, cy + 2*S, 3*S, 2)

    # Head — round owl silhouette, clearly above body
    head_y = cy - 3*S
    disc(f, C, head_y, 2.5*S, 3)
    # Owl ear tufts
    line(f, C - 1.5*S, head_y - 2.2*S, C - 0.5*S, head_y - 0.5*S, 2)
    line(f, C + 1.5*S, head_y - 2.2*S, C + 0.5*S, head_y - 0.5*S, 2)
    # Eyes
    disc(f, C - 1*S, head_y - 0.2*S, 0.7*S, 4)
    disc(f, C + 1*S, head_y - 0.2*S, 0.7*S, 4)
    # Beak
    disc(f, C, head_y + 1.2*S, 0.5*S, 1)

    # Tail fan (head rotates 1px side-to-side per frame)
    tail_lean = math.sin(ph) * 0.8*S
    line(f, C - 2*S + tail_lean, cy + 5*S,
         C - 3.5*S + tail_lean, cy + 8*S, 1)
    line(f, C + tail_lean,       cy + 5*S,
         C + 0.5*S + tail_lean,  cy + 8.5*S, 1)
    line(f, C + 2*S + tail_lean, cy + 5*S,
         C + 3.5*S + tail_lean,  cy + 8*S, 1)

    # Talons
    disc(f, C - 1.5*S, cy + 6*S, 0.8*S, 1)
    disc(f, C + 1.5*S, cy + 6*S, 0.8*S, 1)


def _dragon_wing(f, pivot_x, pivot_y, side, flap):
    """Large dragon bat wing — 6 dense arc layers + 3 finger-bone lines."""
    fm = 0.18 * flap
    for dr in range(6):
        wr = (3.2 + dr * 1.65) * S
        if side < 0:
            a0, a1 = math.pi*(0.48-fm), math.pi*(1.52+fm)
        else:
            a0, a1 = math.pi*(-0.52-fm), math.pi*(0.52+fm)
        idx = 4 if dr == 0 else (3 if dr < 3 else (2 if dr < 5 else 1))
        arc(f, pivot_x, pivot_y, wr, a0, a1, idx, step=0.022)
    for k in range(3):
        fa = math.pi*(0.62 + k*0.3 - fm) if side < 0 else math.pi*(-0.62 - k*0.3 + fm)
        fr = (5.5 + k * 1.6) * S
        line(f, pivot_x, pivot_y,
             pivot_x + math.cos(fa)*fr, pivot_y + math.sin(fa)*fr,
             4 if k == 0 else 3)


def _thick_limb(f, x0, y0, x1, y1, r0, r1):
    """Tapered disc-chain limb. r0/r1 are radii in S-units."""
    n = max(4, int(math.hypot(x1-x0, y1-y0) / S) + 2)
    for k in range(n):
        t = k / (n-1)
        r = (r0 + (r1-r0)*t) * S
        xk = x0 + (x1-x0)*t
        yk = y0 + (y1-y0)*t
        disc(f, xk, yk, r, 2)
        disc(f, xk, yk - 0.35*S, r*0.55, 3)   # dorsal highlight per segment


def arch_drake(f, i, N, pal):
    ph = 2 * math.pi * i / N
    flap = math.sin(ph)

    body_y = 13*S    # body centre-row ≈37.8px
    wing_y =  9*S    # wing pivot above body ≈26.2px

    # ── WINGS — drawn first so body renders over the roots ──────────────────────
    _dragon_wing(f, 9*S,  wing_y, -1, flap)
    _dragon_wing(f, 11*S, wing_y,  1, flap)

    # ── BODY — 3 barrel discs: hip / torso / chest ─────────────────────────────
    for bx, br, doff in [(5.5*S, 4.0*S, 0.6*S),
                         (9.5*S, 5.2*S, 1.0*S),
                         (13.5*S, 4.2*S, 0.6*S)]:
        disc(f, bx, body_y + 0.5*S, br, 2)
        disc(f, bx, body_y - doff,   br*0.55, 3)    # dorsal highlight
        disc(f, bx, body_y + br*0.5, br*0.65, 1)   # belly shadow

    # ── SCALE TEXTURE — overlapping dithered dots across body ────────────────────
    for row in range(3):
        for col in range(7):
            sx = (4 + col*1.65)*S + (row % 2)*0.82*S
            sy = body_y + (row - 1)*1.4*S
            if 0 < sx < W and 0 < sy < W and dith(int(sx), int(sy), 0.5):
                f.set(sx, sy, 1)

    # ── NECK — disc chain curving up-right to head ──────────────────────────────
    for nx, ny, nr in [(15.0*S, body_y - 2.5*S, 2.4*S),
                       (16.5*S, body_y - 5.0*S, 2.0*S),
                       (17.8*S, body_y - 7.2*S, 1.7*S)]:
        disc(f, nx, ny, nr, 2)
        disc(f, nx, ny - 0.5*S, nr*0.5, 3)   # neck dorsal ridge

    # ── HEAD ─────────────────────────────────────────────────────────────────────
    hx = 18.5*S    # ≈53.8px
    hy = body_y - 9.0*S   # = 4*S ≈11.6px

    disc(f, hx, hy, 2.5*S, 2)              # cranium
    disc(f, hx, hy - 0.5*S, 1.5*S, 3)     # dorsal cranium highlight
    disc(f, hx + 1.5*S, hy + 1.5*S, 1.8*S, 2)   # jaw/snout ≈58px
    disc(f, hx + 1.8*S, hy + 0.8*S, 0.9*S, 3)   # upper-snout ridge
    disc(f, hx + 2.5*S, hy + 1.8*S, 0.4*S, 0)   # nostril (transparent)
    disc(f, hx + 0.5*S, hy - 0.3*S, 0.8*S, 4)   # eye bright
    disc(f, hx + 0.5*S, hy - 0.3*S, 0.35*S, 1)  # pupil slit
    # Brow ridge
    line(f, hx - 1.0*S, hy - 1.5*S, hx + 0.8*S, hy - 0.8*S, 1)
    # Two curved horns sweeping back from skull
    line(f, hx - 0.3*S, hy - 2.5*S, hx - 2.0*S, hy - 5.5*S, 2)
    line(f, hx - 1.5*S, hy - 2.5*S, hx - 3.5*S, hy - 5.2*S, 2)
    line(f, hx - 0.3*S, hy - 2.5*S, hx - 1.8*S, hy - 5.2*S, 1)  # horn shadow

    # ── TAIL — disc chain S-curve from hips, tip animated ───────────────────────
    tail_tip_y = body_y + 7.5*S + math.sin(ph) * 1.2*S   # ≈ 59-62px ✓
    tail_pts = [
        (5.5*S, body_y + 3.0*S),
        (4.0*S, body_y + 5.0*S),
        (2.8*S, body_y + 6.5*S),
        (1.8*S, tail_tip_y),
    ]
    for k in range(len(tail_pts) - 1):
        x0, y0 = tail_pts[k]; x1, y1 = tail_pts[k+1]
        r0 = (2.0 - k*0.45)*S; r1 = (1.55 - k*0.45)*S
        steps = 4
        for s in range(steps+1):
            t = s / steps
            r = r0 + (r1-r0)*t
            disc(f, x0+(x1-x0)*t, y0+(y1-y0)*t, r, 2 if k < 2 else 1)
    # Spade tail tip
    disc(f, tail_pts[-1][0], tail_pts[-1][1], 1.1*S, 3)

    # ── LEGS — 4 robust tapered disc-chain limbs with claws ──────────────────────
    # (x-of-hip, front-or-rear)
    for hip_x, is_front in [(7.0*S, False), (11.5*S, True),
                             (9.0*S, False), (13.0*S, True)]:
        phase = math.pi if is_front else 0.0
        lift  = math.sin(ph + phase) * 0.9*S
        hip_y = body_y + 3.5*S
        knee  = (hip_x + 0.8*S, hip_y + 2.0*S - lift)
        foot  = (hip_x + 1.0*S, hip_y + 4.2*S - lift*0.4)
        # Thigh
        _thick_limb(f, hip_x, hip_y, knee[0], knee[1], 1.7, 1.2)
        # Shin
        _thick_limb(f, knee[0], knee[1], foot[0], foot[1], 1.2, 0.8)
        # Claw foot
        disc(f, foot[0], foot[1], 1.2*S, 1)
        for claw_dx in [-1.2*S, 0, 1.2*S]:
            disc(f, foot[0]+claw_dx, foot[1]+0.8*S, 0.5*S, 2)


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
    ("creature",    "skeleton",                       arch_skeleton,  PAL_bone,         {}),
    ("creature",    "zombie",                         arch_zombie,    PAL_zombie,       {}),
    ("creature",    "beast-spirit",                   arch_beast_spirit, PAL_beast,       {}),
    ("creature",    "fey-spirit",                     arch_humanoid,  PAL_psychic,      {"fey": True}),
    ("construct",   "steel-defender",                 arch_steel_defender, PAL_steel,   {}),
    ("construct",   "tiny-servant",                   arch_object,    PAL_force,        {}),
    ("construct",   "homunculus-servant",             arch_homunculus, PAL_force,       {}),
    ("construct",   "dancing-item",                   arch_object,    PAL_radiant,      {}),
    ("structure",   "eldritch-cannon-flamethrower",   arch_cannon,    PAL_cannon_fire,  {}),
    ("structure",   "eldritch-cannon-force-ballista", arch_cannon,    PAL_cannon_force, {}),
    ("structure",   "eldritch-cannon-protector",      arch_cannon,    PAL_cannon_aura,  {}),
    ("celestial",   "guardian-of-faith",              arch_celestial, PAL_radiant,      {"armor": True}),
    ("celestial",   "celestial-avenger",              arch_celestial, PAL_radiant,      {}),
    ("undead",      "floating-skull",                 arch_skull,     PAL_fire,         {}),
    ("elemental",   "steam-mephit",                   arch_mephit,    PAL_steam,        {}),
    ("elemental",   "dust-mephit",                    arch_mephit,    PAL_sand,         {}),
    ("elemental",   "ice-mephit",                     arch_mephit,    PAL_cold,         {}),
    ("elemental",   "magma-mephit",                   arch_mephit,    PAL_fire,         {}),
    ("elemental",   "mud-mephit",                     arch_mephit,    PAL_mud,          {}),
    ("elemental",   "smoke-mephit",                   arch_mephit,    PAL_smoke,        {}),
    ("elemental",   "air-elemental-myrrh",            arch_myrmidon,  PAL_air,          {}),
    ("elemental",   "fire-elemental-myrrh",           arch_myrmidon,  PAL_fire,         {}),
    ("elemental",   "air-elemental-spirit",           arch_column,    PAL_air,          {}),
    ("elemental",   "fire-elemental-spirit",          arch_column,    PAL_fire,         {}),
    ("elemental",   "water-weird",                    arch_serpent,   PAL_cold,         {}),
    ("elemental",   "gargoyle",                       arch_gargoyle,  PAL_stone,        {}),
    ("fey",         "fey-spirit-mirthful",            arch_humanoid,  PAL_feypink,      {"fey": True}),
    ("monstrosity", "shadowspawn-fury",               arch_humanoid,  PAL_shadow,       {"fury": True}),
    ("aberration",  "aberration-spawn-slaad",         arch_blob,      PAL_acid,         {}),
    ("beast",       "familiar-owl",                   arch_bird,      PAL_owl,          {}),
    ("dragon",      "drake-companion",                arch_drake,     PAL_drake,        {}),
    # Chromatic dragon drakes
    ("dragon",      "drake-red",                      arch_drake,     PAL_red_dragon,   {}),
    ("dragon",      "drake-blue",                     arch_drake,     PAL_blue_dragon,  {}),
    ("dragon",      "drake-green",                    arch_drake,     PAL_green_dragon, {}),
    ("dragon",      "drake-black",                    arch_drake,     PAL_black_dragon, {}),
    ("dragon",      "drake-white",                    arch_drake,     PAL_white_dragon, {}),
    # Metallic dragon drakes
    ("dragon",      "drake-gold",                     arch_drake,     PAL_gold_dragon,  {}),
    ("dragon",      "drake-silver",                   arch_drake,     PAL_silver_dragon,{}),
    ("dragon",      "drake-bronze",                   arch_drake,     PAL_bronze_dragon,{}),
    ("dragon",      "drake-copper",                   arch_drake,     PAL_copper_dragon,{}),
    ("dragon",      "drake-brass",                    arch_drake,     PAL_brass_dragon, {}),
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
