# Assets needed: effects/wall/

Multi-tile barriers. Unlike `aura/` and `effects/terrain/`, walls render as a **single element spanning multiple tiles** rather than as per-tile loops.

## Files

| Filename | Format | Frames | Style notes |
|---|---|---|---|
| `wall_force.svg` | svg | n/a | Translucent rectangular panel; faint blue/white edge highlight; meant to be stretched/tiled across the wall length. |

SVG preferred so the wall can stretch cleanly to any panel count without pixelation.

## Spell coverage

| Spell | File used | Render template |
|---|---|---|
| wall-of-force | wall_force.svg | `vizCategory: 'wall'` (new wall renderer that takes a tile range + facing) |

## Reuse rules

- Each future wall spell adds one file here (`wall_fire.gif`, `wall_ice.gif`, `wall_stone.png`, etc.).
- Wall sprites should be **single, stretchable elements** — not per-tile loops — so the render code can scale them to any panel count without retiling.
- If a wall spell deals damage on contact (like Wall of Fire), add the damage VFX via the existing `/animation/[damage_type]/` folder, **not** here. This folder is for the barrier silhouette only.
