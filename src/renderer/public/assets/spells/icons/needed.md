# Assets needed: icons/

Static UI overlays anchored to a tile or character. Single-tile, non-looping (or 4-frame tiny loops).
Use this folder for **decorative or informational** overlays that don't represent damage/area/condition mechanics.

## Files

| Filename | Format | Frames | Style notes |
|---|---|---|---|
| `d4_floating.svg` | svg | static | A d4 die floating above the tile; small (≤ 14×14 px effective render). |
| `thought_bubble.svg` | svg | static | Small comic-style thought bubble; positioned above the tile. |
| `magic_scan.svg` | svg | static | 30ft-equivalent ring (≈ 6-tile radius outline); used as a single SVG circle over the grid. |
| `light_glow.svg` | svg | static | Soft radial-gradient glow; semi-transparent yellow/white. |
| `mote_warm.gif` | gif | 4 looped | Tiny ≤ 6×6 px warm-coloured mote (yellow/orange) bobbing. |
| `mote_cool.gif` | gif | 4 looped | Tiny ≤ 6×6 px cool-coloured mote (cyan/violet) bobbing. |
| `flourish_sparkle.gif` | gif | 6 one-shot, ~400ms | Small magical sparkle burst; for minor cantrip cosmetic effects. |

Prefer **SVG** for crisp scaling; use GIF for the tiny animated motes/flourishes.

## Spell coverage

| Spell | File used | Render template |
|---|---|---|
| guidance | d4_floating.svg | icon overlay (anchored above ally tile) |
| detect-thoughts | thought_bubble.svg | icon overlay (anchored to player tile) |
| detect-magic | magic_scan.svg | icon overlay (centred on player, large ring) |
| light | light_glow.svg | icon overlay (anchored to a chosen tile/object) |
| dancing-lights | mote_warm.gif × 2 + mote_cool.gif × 2 | free-positioned motes (up to 4 around the grid) |
| prestidigitation | flourish_sparkle.gif | one-shot icon overlay |
| thaumaturgy | flourish_sparkle.gif | one-shot icon overlay |

## Reuse rules

- One-tile, non-mechanical overlays (status info, cosmetic flourishes) go here. **Don't put combat effects here** — those belong in `aura/`, `effects/`, or `animation/`.
- `flourish_sparkle` is reusable across any minor-utility cantrip. Don't add a per-cantrip variant.
- Motes have **two colour variants** (warm / cool) — Dancing Lights mixes them; future spells that need a single magical mote pick one or the other.
- Future condition-icon UI (e.g., a small "blinded" icon over an enemy) goes here too; suggested naming: `condition_blinded.svg`, `condition_paralyzed.svg`, etc.
