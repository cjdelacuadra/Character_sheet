# Assets needed: aura/debuff/

Looping auras that sit on each rolled-hit enemy tile for the duration of a debuff/control spell.
Maps to render template `vizCategory: 'debuff-aura'`.

## Files

| Filename | Format | Frames | Style notes |
|---|---|---|---|
| `marked_aura.gif` | gif | 8 looped | Bullseye / crosshair overlay; red or arcane. |
| `paralyzed_aura.gif` | gif | 8 looped | Frozen-in-place shimmer; faint ice crystals on the tile. |
| `slowed_aura.gif` | gif | 8 looped | Slow-motion ripple; concentric rings expanding outward at half speed. |
| `frightened_aura.gif` | gif | 8 looped | Shaky black tendrils + fear lines around the tile. |
| `charmed_aura.gif` | gif | 8 looped | Pink/violet heart particles or hypnotic spirals. |
| `illuminated_aura.gif` | gif | 8 looped | Soft outline glow (Faerie Fire colours: blue/green/violet, pick one). |
| `transformed_aura.gif` | gif | 8 looped | Bubbling/morphing distortion; suggests shape change. |
| `blinded_aura.gif` | gif | 8 looped | Closed-eyes overlay + grayscale shimmer. |
| `asleep_aura.gif` | gif | 8 looped | Floating "Z" letters above the tile. |
| `banished_aura.gif` | gif | 8 looped | Fading-portal ring; the target's silhouette ghosting out. |

All files target **22×22 px**, image-rendering: pixelated.

## Spell coverage

| Spell | File used | Render template |
|---|---|---|
| hex | marked_aura.gif | debuff-aura (already tagged necrotic) |
| hunter-s-mark | marked_aura.gif | debuff-aura (already tagged force) |
| silvery-barbs | marked_aura.gif (enemy side) + holy_aura.gif from aura/buff/ (ally side) | combined one-shot reaction |
| hold-person | paralyzed_aura.gif | debuff-aura (already tagged psychic) |
| hold-monster | paralyzed_aura.gif | debuff-aura (already tagged psychic) |
| slow | slowed_aura.gif | debuff-aura (already tagged psychic) |
| suggestion | charmed_aura.gif | debuff-aura (already tagged psychic) |
| dominate-person | charmed_aura.gif | debuff-aura (already tagged psychic) |
| confusion | charmed_aura.gif | debuff-aura (already tagged psychic) |
| faerie-fire | illuminated_aura.gif | debuff-aura (already tagged radiant) |
| polymorph | transformed_aura.gif | debuff-aura (already tagged psychic) |
| blindness-deafness | blinded_aura.gif | debuff-aura (already tagged necrotic) |
| sleep | asleep_aura.gif | debuff-aura (needs `vizCategory: 'debuff-aura'` + tag) |
| banishment | banished_aura.gif | debuff-aura (already tagged force) |
| wrathful-smite (target side) | frightened_aura.gif | debuff-aura |

## Reuse rules

- New condition-type debuffs **map to the closest existing aura**. The resolver routes `vizDamageType` to a sprite here when the value matches a filename stem (e.g., `'paralyzed'`, `'charmed'`); otherwise it falls back to `/assets/equipment/sprites/missiles/magic/[damage_type]/`.
- Don't add a new aura unless the existing ten can't reasonably represent the condition.
- Save-passed targets do **not** get an aura — the render template suppresses it and shows the existing `pass/Sparks_Effect.gif` instead.
