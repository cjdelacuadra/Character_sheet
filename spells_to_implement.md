# Spells To Implement

Spells from [src/renderer/src/shared/data/spellData.ts](src/renderer/src/shared/data/spellData.ts) that don't yet have a visualization in [SpellVisualization.tsx](src/renderer/src/features/spells/SpellVisualization.tsx).

Each entry describes the animation we'd want, why it can't ship with the current asset/template set, and a concrete proposal for when someone picks it up.

> Templates available today: `damage` (aoeShape + damageType), `self-buff` (looping aura on player tile), `debuff-aura` (looping aura on each rolled-hit enemy tile). Magic frame sprites (`earth, fire, lightning, poison, psychic, thunder`) live under `/assets/equipment/sprites/missiles/magic/[type]/` — the canonical source for both missiles and AOE waves. Impact GIFs (`Blood_Effect.gif`, `Poof_Effect.gif`, `Sparks_Effect.gif`) live under `/assets/spells/{hit,pass,miss}/`.

---

## aid
- **What the animation should show**: a soft golden uplift that pulses on up to three ally tiles, signaling +5 max HP.
- **Why it isn't built**: no ally-tile concept in the grid yet (only player + enemies + bystanders).
- **Proposed implementation when picked up**: extend `computeSpellGrid` to return `allyPositions`, then add a `buff-allies` template that loops a `radiant` aura on each ally tile.

## animate-dead
- **What the animation should show**: a corpse silhouette rises from the ground next to the player and shambles into formation.
- **Why it isn't built**: needs a corpse/undead sprite and a "spawn from ground" two-stage animation.
- **Proposed implementation when picked up**: add `/assets/spells/animation/undead/` rise frames; new `summon` template that mounts the sprite at a tile adjacent to the player.

## booming-blade
- **What the animation should show**: weapon glow on the player + a thunder ring on the chosen enemy that "booms" if the enemy moves.
- **Why it isn't built**: requires a conditional two-state effect (passive ring + triggered burst on movement) that the current single-loop template can't express.
- **Proposed implementation when picked up**: extend `debuff-aura` to support a "trigger frame" (one-shot burst overlay) and trigger it via a hovered "if moves" toggle.

## counterspell
- **What the animation should show**: a beam from the caster intercepting an incoming spell mid-flight, both fizzling out.
- **Why it isn't built**: requires the concept of an "incoming spell" object on the grid — we only model the player's spell.
- **Proposed implementation when picked up**: add a phantom enemy-caster sprite and an incoming missile; the player's counter-beam intercepts at the midpoint.

## cure-wounds
- **What the animation should show**: a green/holy sparkle on the touched ally tile, +HP shimmer rising.
- **Why it isn't built**: no green heal sprite + no ally tiles.
- **Proposed implementation when picked up**: add `/assets/spells/animation/heal/` (green/gold frames); add `allyPositions` to the grid; new `heal-single` template.

## dancing-lights
- **What the animation should show**: up to four torch-sized motes hovering around the grid, weaving slowly.
- **Why it isn't built**: needs free-floating sprites with independent paths (not tile-bound).
- **Proposed implementation when picked up**: new free-positioned `dancing-mote` overlay with `requestAnimationFrame`-driven sinusoidal paths.

## darkness
- **What the animation should show**: a black sphere fills a 15ft radius zone, swallowing the tiles underneath.
- **Why it isn't built**: needs a near-opaque dark sprite (we only have brightly coloured magical sprites).
- **Proposed implementation when picked up**: add a `darkness` sprite (semi-opaque black); reuse the AOE wave template with `vizDamageType: 'darkness'`.

## death-ward
- **What the animation should show**: a gold halo on an ally that flickers briefly when triggered (1 HP save).
- **Why it isn't built**: no ally tiles; the "trigger flash" is a two-state effect.
- **Proposed implementation when picked up**: ally-tile concept + a trigger overlay (single burst on top of the looping halo).

## detect-magic
- **What the animation should show**: a 30ft scan ring with arrows pointing at magical objects/creatures inside it.
- **Why it isn't built**: non-combat UI; needs "magical" tagging on grid sprites that doesn't exist.
- **Proposed implementation when picked up**: out-of-combat helper view — not a tile animation, more like an overlay listing detected items.

## detect-thoughts
- **What the animation should show**: a thought bubble icon floating above the player while the spell is active.
- **Why it isn't built**: non-combat UI; no speech/thought-bubble primitive.
- **Proposed implementation when picked up**: simple SVG overlay anchored to the player tile.

## enlarge-reduce
- **What the animation should show**: target sprite scales up to 200% (enlarge) or down to 50% (reduce) over ~0.5s.
- **Why it isn't built**: needs a per-target scale transform on the existing enemy/player sprite, which `SpellVisualization` doesn't currently apply.
- **Proposed implementation when picked up**: per-target `transform: scale(...)` driven by spell metadata (enlarge vs reduce); pair with `vizCategory: 'debuff-aura'` for a wrapping aura.

## entangle
- **What the animation should show**: vines erupt from the ground in a 20ft square, then writhe, restraining anyone inside.
- **Why it isn't built**: needs "vine" sprite distinct from the magical-energy frames we have.
- **Proposed implementation when picked up**: add `/assets/spells/animation/vines/` 8-frame loop; reuse the AOE wave template with `aoeShape: 'cube', aoeSize: 20, vizDamageType: 'earth'` and a vine sprite override.

## fly
- **What the animation should show**: the touched ally lifts off the ground and gains a flying speed of 60ft.
- **Why it isn't built**: needs a vertical-offset sprite render (current sprites are all ground-tile bound).
- **Proposed implementation when picked up**: add a `flying` modifier — render the ally sprite with a `transform: translateY(-8px)` plus a small wing/feather overlay; can pair with ally-tile work.

## fog-cloud
- **What the animation should show**: a 20ft sphere of gray fog billowing over the chosen tiles.
- **Why it isn't built**: no grey/fog sprite.
- **Proposed implementation when picked up**: add `/assets/spells/animation/fog/` 8-frame loop; mark the spell as `aoeShape: 'sphere', vizDamageType: 'fog'` with a custom sprite folder mapping.

## greater-invisibility
- **What the animation should show**: target sprite fades to ~20% opacity and stays that way.
- **Why it isn't built**: needs a per-target opacity override on existing sprites; no animation per se.
- **Proposed implementation when picked up**: tag with a new `vizCategory: 'self-invisible'`; render the player/ally sprite at low opacity for the duration.

## green-flame-blade
- **What the animation should show**: weapon glow on the player + a small green flame leap from the struck enemy to one adjacent enemy.
- **Why it isn't built**: requires a chained two-target animation (primary enemy → secondary enemy), which we don't model.
- **Proposed implementation when picked up**: extend `debuff-aura` with an optional "chain to nearest other" overlay; tag with `vizDamageType: 'fire'`.

## guidance
- **What the animation should show**: a tiny d4 icon floating above the touched ally for the duration.
- **Why it isn't built**: no ally tile concept; no die-icon primitive.
- **Proposed implementation when picked up**: SVG d4 overlay anchored to the targeted ally tile; pair with ally-tile work.

## healing-word
- **What the animation should show**: same as cure-wounds but at range (60ft) and as a bonus action.
- **Why it isn't built**: same blockers as cure-wounds — no green heal sprite + no ally tiles.
- **Proposed implementation when picked up**: shared with cure-wounds; reuse the same `heal-single` template.

## hypnotic-pattern
- **What the animation should show**: a swirling rainbow pattern fills a 30ft cube; creatures inside dazed.
- **Why it isn't built**: no swirling/iridescent sprite; the wave loop would look wrong here.
- **Proposed implementation when picked up**: add `/assets/spells/animation/swirl/` frames; reuse `aoeShape: 'cube', aoeSize: 30, vizDamageType: 'swirl'` with a custom sprite override.

## intellect-fortress
- **What the animation should show**: a helm-shaped glow on the targeted ally.
- **Why it isn't built**: no ally tile concept; no helm sprite.
- **Proposed implementation when picked up**: extend ally-tile work; add `psychic` self-buff variant that anchors to allies instead of player.

## invisibility
- **What the animation should show**: target sprite fades to ~20% opacity at cast and stays invisible until they act.
- **Why it isn't built**: needs sprite opacity override + a "breaks on attack/cast" toggle.
- **Proposed implementation when picked up**: shared with greater-invisibility (just without the "doesn't end on attack" rule).

## jump
- **What the animation should show**: a small upward-arrow halo on the touched ally for the duration.
- **Why it isn't built**: no ally tiles; minor utility — low priority.
- **Proposed implementation when picked up**: could be retagged as `self-buff` with `vizDamageType: 'force'` if visualized on caster.

## lesser-restoration
- **What the animation should show**: a green sparkle on the touched ally + condition icons (blinded/deafened/etc.) dropping away.
- **Why it isn't built**: no heal sprite + no condition-icon UI on enemy/ally tiles.
- **Proposed implementation when picked up**: shared with healing template; plus a condition-icon overlay system.

## light
- **What the animation should show**: a glow on a touched object (no enemy interaction).
- **Why it isn't built**: no object/item sprite primitive on the grid.
- **Proposed implementation when picked up**: not really a combat animation; could be a static caster halo for visualization purposes.

## longstrider
- **What the animation should show**: a faint speed-line trail behind the touched ally.
- **Why it isn't built**: no ally tiles; minor utility — low priority.
- **Proposed implementation when picked up**: could be retagged as `self-buff` with `vizDamageType: 'force'` if visualized on caster.

## mage-hand
- **What the animation should show**: a spectral hand sprite hovering 30ft from the player, drifting between positions.
- **Why it isn't built**: needs a free-moving hand sprite + a "hand position" not bound to a target tile.
- **Proposed implementation when picked up**: add `/assets/spells/animation/hand/` sprite; render at a player-relative offset that gently bobs.

## magic-weapon
- **What the animation should show**: a touched weapon glows with a +1/+2/+3 rank halo.
- **Why it isn't built**: no weapon sprite on the grid; needs a rank indicator.
- **Proposed implementation when picked up**: weapon-icon overlay on the caster's tile with a small numeric badge.

## mass-cure-wounds
- **What the animation should show**: a 30ft green/holy wave centered on a point, healing every ally inside.
- **Why it isn't built**: no heal sprite + no ally tiles to render the heal target.
- **Proposed implementation when picked up**: shared heal template; AOE wave with a green sprite folder.

## mass-healing-word
- **What the animation should show**: a soft chime visual over up to 6 ally tiles simultaneously.
- **Why it isn't built**: same as mass-cure-wounds — heal sprite + ally tiles.
- **Proposed implementation when picked up**: shared template.

## minor-illusion
- **What the animation should show**: a shimmering placeholder shape within 30ft.
- **Why it isn't built**: needs a generic "illusion" sprite that doesn't exist.
- **Proposed implementation when picked up**: add a translucent shape overlay; not high-priority.

## misty-step
- **What the animation should show**: silver mist envelops the player; they vanish, then re-appear at a new tile.
- **Why it isn't built**: needs a two-position teleport animation; current player render is single-tile.
- **Proposed implementation when picked up**: new `teleport` template — fade out at playerPosA, brief vapor at the destination, fade in. Requires a chosen destination tile (probably 4–6 tiles away from current).

## prayer-of-healing
- **What the animation should show**: a slow holy aura over up to 6 ally tiles within 30ft.
- **Why it isn't built**: same as mass-cure-wounds.
- **Proposed implementation when picked up**: shared template.

## prestidigitation
- **What the animation should show**: a tiny magical flourish — sparkle, puff, colour shift.
- **Why it isn't built**: too varied (chooses one of many minor effects); needs a randomized sub-effect picker.
- **Proposed implementation when picked up**: low priority; could be a static `self-buff` flourish with `vizDamageType: 'psychic'`.

## raise-dead
- **What the animation should show**: a large resurrection animation — body rises, glow ascends.
- **Why it isn't built**: same as revivify but more elaborate; out-of-combat.
- **Proposed implementation when picked up**: shared with revivify resurrection template.

## revivify
- **What the animation should show**: a downward beam onto a downed creature, lifting them to 1 HP.
- **Why it isn't built**: needs a "downed" creature sprite + a downward beam primitive.
- **Proposed implementation when picked up**: new `resurrection` template; one-shot animation (not looping); pair with ally-tile/downed-ally concept.

## sanctuary
- **What the animation should show**: a shimmer barrier around a warded ally.
- **Why it isn't built**: no ally tiles.
- **Proposed implementation when picked up**: extend self-buff to optionally render on an ally tile rather than the player.

## shillelagh
- **What the animation should show**: a glowing nature-themed haze around the caster's weapon (club/quarterstaff) for the duration.
- **Why it isn't built**: no weapon-icon overlay on the caster tile.
- **Proposed implementation when picked up**: could be retagged as `self-buff` with `vizDamageType: 'earth'` — but a weapon-shape glow would read more clearly than a generic player aura.

## silence
- **What the animation should show**: a grey shimmer dome (20ft sphere) over the chosen point.
- **Why it isn't built**: no grey/shimmer sprite.
- **Proposed implementation when picked up**: AOE wave template with a custom "silence" sprite folder.

## silvery-barbs
- **What the animation should show**: a quick swirl over an enemy (force them to reroll) + a buff swirl over an ally (advantage).
- **Why it isn't built**: needs two targets in different states; no ally tile concept.
- **Proposed implementation when picked up**: combined `debuff-aura` + `buff-allies` instance; one shot rather than looping.

## sleep
- **What the animation should show**: Z's float over multiple enemies in a 20ft area; affected enemies fall unconscious.
- **Why it isn't built**: needs a "Z" overlay sprite distinct from the magical-energy sprites we have.
- **Proposed implementation when picked up**: add `/assets/spells/animation/sleep/` (Z's frames); reuse `debuff-aura` template with that sprite folder and `attackType: 'auto-hit'` (no save in 5e SRD).

## spare-the-dying
- **What the animation should show**: a soft green pulse on a downed ally tile.
- **Why it isn't built**: no heal sprite + no downed-ally state.
- **Proposed implementation when picked up**: shared with healing template; needs downed-ally rendering.

## spike-growth
- **What the animation should show**: 20ft radius of camouflaged thorns; movement triggers piercing damage.
- **Why it isn't built**: needs a thorn/spike sprite and a "movement-triggered" damage effect (not in current model).
- **Proposed implementation when picked up**: add `/assets/spells/animation/spikes/` frames; reuse AOE wave template with that folder.

## spiritual-weapon
- **What the animation should show**: a floating spectral weapon next to the player, repeatedly striking a nearby enemy.
- **Why it isn't built**: needs an animated weapon sprite that moves between positions (player ↔ enemy) on a cycle.
- **Proposed implementation when picked up**: new `floating-weapon` template; combine a tile-anchored weapon sprite with a small attack-strike cycle.

## summon-beast
- **What the animation should show**: a bestial spirit appears in an unoccupied space and acts independently.
- **Why it isn't built**: needs a beast sprite + a summoned-creature placement system.
- **Proposed implementation when picked up**: new `summon` template; renders a creature sprite next to the player and idles.

## summon-fey
- **What the animation should show**: same as summon-beast but a fey sprite.
- **Why it isn't built**: same blockers.
- **Proposed implementation when picked up**: shared summon template; different sprite folder per spirit type (Fuming/Mirthful/Tricksy).

## thaumaturgy
- **What the animation should show**: a randomly-chosen minor wonder (booming voice, flickering flames, ground tremor…).
- **Why it isn't built**: too many sub-effects, each needing its own animation.
- **Proposed implementation when picked up**: low priority; a small "minor flourish" loop similar to prestidigitation.

## vortex-warp
- **What the animation should show**: a swirl on the target enemy, then a flash as they reappear at a new tile.
- **Why it isn't built**: needs a forced-teleport animation on an enemy (existing teleport ideas only target the player).
- **Proposed implementation when picked up**: extend the planned `teleport` template to work on enemy tiles.

## wall-of-force
- **What the animation should show**: a translucent rectangle/panel snaps into existence in the chosen position.
- **Why it isn't built**: needs a multi-tile rectangle render (not a per-tile loop) and a translucent material.
- **Proposed implementation when picked up**: new `wall` template; render a single SVG/div spanning the chosen tile line with a faint shimmer overlay.

---

## Tracking

Total spells in `SPELLS`: **99**
- Auto-rendered in-app today (damage / self-buff / debuff-aura templates): **51**
- Documented here for future implementation: **48**

Re-run [SpellsPanel.tsx:168](src/renderer/src/features/spells/SpellsPanel.tsx) gate `hasVisualization = !!(spell.aoeShape && spell.damageType) || !!spell.vizCategory` against the `SPELLS` array to identify any spell that still has no visualization — those need either a new entry here or a tagging update.
