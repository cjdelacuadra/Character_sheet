# Assets needed: effects/vanish/

One-shot or short-loop sprites for fade-out, fade-in, and teleport effects on a tile.
Used by spells where a creature disappears, reappears, or teleports.

## Files

| Filename | Format | Frames | Style notes |
|---|---|---|---|
| `fade_out.gif` | gif | 6 frames, ~300ms total | Character silhouette dissolves into particles; non-looping. |
| `fade_in.gif` | gif | 6 frames reverse | Particles coalesce back into a silhouette; non-looping. |
| `silver_mist.gif` | gif | 8 looped, brief | Silvery wispy mist; ambient between fade-out and fade-in. |
| `purple_warp.gif` | gif | 8 looped | Purple swirl forming a vortex; for forced enemy teleport. |

All files target **22×22 px**, image-rendering: pixelated.

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
