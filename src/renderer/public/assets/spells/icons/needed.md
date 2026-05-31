# Assets needed: icons/

Static UI overlays anchored to a tile or character. Single-tile, non-looping (or 4-frame tiny loops).
Use this folder for **decorative or informational** overlays that don't represent damage/area/condition mechanics.

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
