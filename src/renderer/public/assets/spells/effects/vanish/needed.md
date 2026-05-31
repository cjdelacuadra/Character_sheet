# Assets needed: effects/vanish/

One-shot or short-loop sprites for fade-out, fade-in, and teleport effects on a tile.
Used by spells where a creature disappears, reappears, or teleports.

## Spell coverage

| Spell | File used | Render template |
|---|---|---|
| misty-step | fade_out.gif + silver_mist.gif + fade_in.gif | `vizCategory: 'teleport'` |
| invisibility | fade_out.gif + CSS opacity 0.2 (target stays at low opacity) | `vizCategory: 'invisible'` |
| greater-invisibility | fade_out.gif + CSS opacity 0.2 (does not break on attack) | `vizCategory: 'invisible'` |
| vortex-warp | purple_warp.gif + fade_out.gif on enemy → fade_in.gif at new tile | `vizCategory: 'teleport-target'` |

## Reuse rules

- **Every teleport** = `fade_out` at source + optional `silver_mist` + `fade_in` at destination. No new files needed per spell.
- **Invisibility** = `fade_out` plays once on cast, then the renderer keeps the affected sprite at ~20% opacity for the duration (CSS — no extra asset).
- **Enemy-target teleports** (Vortex Warp) start with `purple_warp` on the target tile to signal hostile intent before the fade.
- Colour the `fade_out`/`fade_in` sprites neutral (silver-grey particles) so they read for both willing and unwilling teleports.
