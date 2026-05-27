# Assets needed: effects/summon/

Sprites for spells that bring a new creature, object, or weapon into existence on the grid.
Every summon = a universal `portal_open` opener + the summoned entity's idle loop.

## Files

| Filename | Format | Frames | Style notes |
|---|---|---|---|
| `portal_open.png` | png sequence | 6 one-shot, ~400ms | Concentric expanding rings; arcane-purple. Use as `portal_open_0.png` … `portal_open_5.png`. **Reusable opener for every summon.** |
| `summon_beast.png` | png sequence | 4 one-shot | Bestial spirit rises; 3 colour variants: Air (white/blue), Land (brown/green), Water (cyan/teal). Files: `summon_beast_air_*.png`, `summon_beast_land_*.png`, `summon_beast_water_*.png`. |
| `summon_fey.png` | png sequence | 4 one-shot | Fey spirit rises; 3 mood variants: Fuming (red), Mirthful (pink), Tricksy (green). Files: `summon_fey_fuming_*.png`, etc. |
| `summon_undead.png` | png sequence | 4 one-shot | Corpse-grey humanoid rises from the ground. |
| `spectral_hand.gif` | gif | 8 looped | Translucent hand drifting; for Mage Hand. |
| `floating_weapon.gif` | gif | 8 looped | Spectral weapon orbiting a fixed point; for Spiritual Weapon. |

All files target **22×22 px** (multi-frame entities may use larger if needed, but render at 22px), image-rendering: pixelated.

## Spell coverage

| Spell | File used | Render template |
|---|---|---|
| animate-dead | portal_open + summon_undead | `vizCategory: 'summon'` |
| revivify | portal_open + summon_undead (or heal/revive_beam — pick one) | `vizCategory: 'summon'` or `'resurrect'` |
| raise-dead | portal_open + summon_undead | `vizCategory: 'summon'` |
| summon-beast | portal_open + summon_beast_{form} | `vizCategory: 'summon'` |
| summon-fey | portal_open + summon_fey_{mood} | `vizCategory: 'summon'` |
| mage-hand | spectral_hand.gif (no portal — appears smoothly near player) | `vizCategory: 'summon'` |
| spiritual-weapon | floating_weapon.gif (orbits at player tile + nearby enemy strike cycle) | `vizCategory: 'summon'` |

## Reuse rules

- `portal_open` is the **universal** opener — used before every summoned creature appears. Don't duplicate it per summon type.
- For variant-bearing summons (Beast forms, Fey moods), use **filename suffix** rather than new folders: `summon_beast_air_*.png`, not `effects/summon/air/...`.
- Summons that are objects, not creatures (Mage Hand, Spiritual Weapon), skip `portal_open` and just mount the idle loop directly.
- If a new summon spell is added (e.g., Summon Construct), add a single `summon_<type>.png` sequence here.
