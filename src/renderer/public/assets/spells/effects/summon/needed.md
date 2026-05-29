# Assets needed: effects/summon/

Sprites for spells/abilities that bring a creature, object, or weapon into existence.
Every summon = a universal `portal_open` opener (in root) + the entity's idle loop in its type subfolder.

All sprites target **22×22 px** (multi-frame may render larger but display at 22 px), `image-rendering: pixelated`.

---

## Shared root files

| File | Format | Frames | Notes |
|---|---|---|---|
| `portal_open_*.png` | png sequence | 6 one-shot | Concentric expanding arcane rings. **Reused before every summoned creature.** |

---

## Subfolders by summon type

Each subfolder mirrors the `SummonType` values used in summonTemplates.ts.

### creature/
Generic bestial or humanoid spirits (Skeleton, Zombie, Beast Spirit, Fey Spirit).

| File | Format | Frames | Notes |
|---|---|---|---|
| `skeleton.png` | png sequence | 4 one-shot | Bones assembling from the ground. |
| `zombie.png` | png sequence | 4 one-shot | Corpse rising slowly. |
| `beast_land.png` | png sequence | 4 one-shot | Brown/green bestial spirit. |
| `beast_air.png` | png sequence | 4 one-shot | White/blue air-form. |
| `beast_water.png` | png sequence | 4 one-shot | Cyan/teal water-form. |
| `fey_spirit.png` | png sequence | 4 one-shot | Shimmering fey silhouette. |

### elemental/
Mephits, Myrmidons, Water Weird, Gargoyle, Elemental Spirits.

| File | Format | Frames | Notes |
|---|---|---|---|
| `mephit_steam.png` | png sequence | 4 one-shot | Wispy steam vapour rising. |
| `mephit_dust.png` | png sequence | 4 one-shot | Sandy particle cloud. |
| `mephit_ice.png` | png sequence | 4 one-shot | Frost crystals forming. |
| `mephit_magma.png` | png sequence | 4 one-shot | Lava droplets coalescing. |
| `mephit_mud.png` | png sequence | 4 one-shot | Mud bubbling upward. |
| `mephit_smoke.png` | png sequence | 4 one-shot | Black smoke billowing. |
| `myrmidon_air.png` | png sequence | 4 one-shot | Armoured air elemental forming. |
| `myrmidon_fire.png` | png sequence | 4 one-shot | Armoured fire elemental forming. |
| `water_weird.png` | png sequence | 4 one-shot | Serpentine water shape rising. |
| `gargoyle.png` | png sequence | 4 one-shot | Stone figure cracking to life. |
| `spirit_air.png` | png sequence | 4 one-shot | Translucent air whirlwind. |
| `spirit_fire.png` | png sequence | 4 one-shot | Translucent fire column. |

### construct/
Mechanical or magical objects (Steel Defender, Spiritual Weapon, Homunculus, etc.).

| File | Format | Frames | Notes |
|---|---|---|---|
| `spiritual_weapon.gif` | gif | 8 looped | Spectral weapon orbiting; no portal opener — appears directly. |
| `steel_defender.png` | png sequence | 4 one-shot | Metal dog assembling from parts. |
| `tiny_servant.png` | png sequence | 4 one-shot | Small animated object. |
| `homunculus.png` | png sequence | 4 one-shot | Tiny winged figure emerging from a gem. |
| `dancing_item.png` | png sequence | 4 one-shot | Object lifting and glowing. |

### structure/
Eldritch Cannons and similar placed objects.

| File | Format | Frames | Notes |
|---|---|---|---|
| `cannon_flamethrower.png` | png sequence | 4 one-shot | Cannon materialising with fire nozzle. |
| `cannon_ballista.png` | png sequence | 4 one-shot | Cannon materialising with force barrel. |
| `cannon_protector.png` | png sequence | 4 one-shot | Cannon materialising with glowing aura. |

### celestial/
Divine beings (Guardian of Faith, Celestial Spirit).

| File | Format | Frames | Notes |
|---|---|---|---|
| `guardian_of_faith.png` | png sequence | 4 one-shot | Radiant armoured figure descending in light. |
| `celestial_avenger.png` | png sequence | 4 one-shot | Winged spirit with radiant bow. |

### undead/
Risen dead (Flaming Skull Spirit).

| File | Format | Frames | Notes |
|---|---|---|---|
| `flaming_skull.png` | png sequence | 4 one-shot | Skull wreathed in fire rising. |

### fey/
Fey spirits with mood variants.

| File | Format | Frames | Notes |
|---|---|---|---|
| `fey_mirthful.png` | png sequence | 4 one-shot | Pink/sparkle fey silhouette. |
| `fey_fuming.png` | png sequence | 4 one-shot | Red/angry fey silhouette. |
| `fey_tricksy.png` | png sequence | 4 one-shot | Green/mischievous fey silhouette. |

### monstrosity/
Shadow horrors (Shadowspawn Fury).

| File | Format | Frames | Notes |
|---|---|---|---|
| `shadowspawn_fury.png` | png sequence | 4 one-shot | Dark monstrosity emerging from shadow. |

### aberration/
Alien entities (Summoned Aberration / Slaad).

| File | Format | Frames | Notes |
|---|---|---|---|
| `slaad.png` | png sequence | 4 one-shot | Froglike aberration tearing through a rift. |

### beast/
Natural animals (Familiars).

| File | Format | Frames | Notes |
|---|---|---|---|
| `familiar_owl.png` | png sequence | 4 one-shot | Owl materialising from arcane dust. |

### dragon/
Draconic companions (Drake Companion).

| File | Format | Frames | Notes |
|---|---|---|---|
| `drake_companion.png` | png sequence | 4 one-shot | Small drake hatching/forming. |

### spectral/
Ghostly appendages (Mage Hand).

| File | Format | Frames | Notes |
|---|---|---|---|
| `mage_hand.gif` | gif | 8 looped | Translucent hand drifting; no portal opener — appears smoothly. |

### spirit/
Invisible or formless servants (Unseen Servant).

| File | Format | Frames | Notes |
|---|---|---|---|
| `unseen_servant.gif` | gif | 8 looped | Subtle ripple/distortion effect. |

### void/
Reserved for void-type summons (none currently in templates).

### other/
Catch-all for homebrew or unclassified summons.

---

## Reuse rules

- `portal_open_*.png` (root) is the **universal opener** — plays before every creature-type summon appears.
- Summons that are objects, not creatures (Mage Hand, Spiritual Weapon, Unseen Servant), skip the portal and mount their idle loop directly.
- Use **one file per template** named after the template `id` (snake_case), not generic names.
- If a new template is added, drop its sprite in the matching type subfolder and document it here.
