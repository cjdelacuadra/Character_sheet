# Assets needed: aura/buff/

Looping auras that sit on a single tile (player or ally) for the duration of a buff spell.
Maps to render template `vizCategory: 'self-buff'` (or the future ally-tile equivalent).

## Files

| Filename | Format | Frames | Style notes |
|---|---|---|---|
| `damage_aura.gif` | gif | 8 looped | Red/orange bubble around the tile; angular, aggressive. |
| `frost_aura.gif` | gif | 8 looped | Frost crystals forming and dissolving; cyan/white. |

All files target **22×22 px** to match the existing tile size; image-rendering: pixelated.

## Spell coverage

| Spell | File used | Render template |
|---|---|---|
| shield | defense_aura.gif | self-buff |
| mage-armor | defense_aura.gif | self-buff |
| death-ward | defense_aura.gif | self-buff (ally tile when available) |
| sanctuary | defense_aura.gif | self-buff (ally tile) |
| intellect-fortress | defense_aura.gif | self-buff (ally tile) |
| hex (caster side) | damage_aura.gif | self-buff |
| hunter-s-mark (caster side) | damage_aura.gif | self-buff |
| booming-blade (caster side) | damage_aura.gif | self-buff |
| green-flame-blade (caster side) | damage_aura.gif | self-buff |
| haste | speed_aura.gif | self-buff (ally tile) |
| longstrider | speed_aura.gif | self-buff (ally tile) |
| jump | speed_aura.gif | self-buff (ally tile) |
| fly | speed_aura.gif + CSS translateY | self-buff (ally tile) |
| aid | heal_aura.gif | self-buff (ally tile) |
| bless | holy_aura.gif | self-buff (already) |
| divine-favor | holy_aura.gif | self-buff (already) |
| guidance | holy_aura.gif | self-buff (ally tile) |
| armor-of-agathys | frost_aura.gif | self-buff (already) |
| mirror-image | mirror_aura.gif | self-buff (already tagged psychic) |
| magic-weapon | weapon_glow_aura.gif | self-buff (ally tile) |
| shillelagh | weapon_glow_aura.gif | self-buff |

## Reuse rules

- When a self-buff doesn't have a perfectly matching sprite, fall back through **`defense → holy → damage`** based on which the spell description emphasizes.
- Many self-buff spells already resolve through the existing `vizDamageType` palette (`force`, `radiant`, `cold`, etc.) via `/assets/spells/animation/[damage_type]/*.png` — those don't need a new file here. This folder only holds **effect-themed** auras for spells whose damage type doesn't match their visual flavour.
- Do **not** add per-spell files. If a new spell needs an aura, pick the closest existing one.
