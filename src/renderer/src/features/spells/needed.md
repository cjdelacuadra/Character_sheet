# Spell Animation Backlog

## Spells needing NEW GIF assets / new vizCategory behavior

| Spell | Current behavior | Needed |
|-------|-----------------|--------|
| Mage Hand | no visualization | Portal opens on caster tile → spectral hand floats toward target cell |
| Disguise Self | self-buff 'force' aura (generic blue shimmer) | Player sprite morphs — shimmer/dissolve transformation on caster tile |
| Jump | self-buff 'speed' aura (generic speed lines) | Player sprite leaps to a distant cell (requires player-movement animation concept) |
| Misty Step | no visualization | Player blinks out → silvery mist → reappears at far cell |
| Longstrider | self-buff 'speed' aura (same as Jump) | Persistent speed-boost shimmer; should look distinct from Jump |
| Thunderclap | not in dataset | Add spell; self-centered sphere, thunder ripple outward |

## Spells needing ALLY TARGET behavior (heal direction)

The current `heal` vizCategory puts the aura on the **caster** tile. These spells target an ally
(a separate creature), so the aura should appear on an ally tile in the lower half of the grid, not
on the caster. A new `vizCategory: 'heal-ally'` is needed, plus a grid layout mode where one
"ally" token sits in the lower row and the caster is in the upper row.

| Spell | Current | Needed |
|-------|---------|--------|
| Cure Wounds | Heal aura on caster tile | Heal aura on ally tile (lower half) |
| Healing Word | Heal aura on caster tile | Same — ranged 60 ft, targets ally |
| Prayer of Healing | Heal aura on caster tile | Multiple ally tiles lit up |
| Revivify | Heal aura on caster tile | Ally tile at 0 HP; revive effect |
| Mass Cure Wounds | Heal aura on caster tile | Heal aura across multiple ally tiles |
| Raise Dead | Heal aura on caster tile | Ally tile on ground; rise-up effect |

## Spells needing player-movement animation concept

These spells move or transform the caster in a way the current grid doesn't represent:

| Spell | Description |
|-------|------------|
| Jump | Caster hops to a far cell — animate player sprite position change |
| Misty Step | Blink teleport — caster disappears, reappears at target cell |
| Dimension Door | Same as Misty Step but with a "passenger" token |
| Gaseous Form | Player sprite becomes translucent/cloud-like (persistent state) |
| Fly | Player sprite hovers / lifts off ground (persistent state) |

## Spells whose animation tint/color is misleading

| Spell | Current vizDamageType | Better vizDamageType |
|-------|-----------------------|----------------------|
| Blink | 'force' (blue-white) | 'force' is OK but could use a dedicated blink/teleport asset |
| Disguise Self | 'force' | Should use a new 'illusion' key with purple/teal tint |
| Mirror Image | 'mirror' (key exists but no asset?) | Confirm mirror_aura.gif exists and is routed correctly |
| Sanctuary | 'defense' (same as Shield/Mage Armor) | Could use a dedicated holy shield asset |

## Implementation notes

### New GIF assets needed
All new GIFs go in the appropriate subfolder and need a key added to `animationAssets.ts`:

```
assets/spells/aura/buff/
  disguise_shimmer_aura.gif    — for Disguise Self
  blink_aura.gif               — for Blink / Misty Step

assets/spells/effects/terrain/
  thunder_ripple.gif           — for Thunderclap / Thunderwave (supplement existing)

assets/spells/aura/buff/
  heal_ally_aura.gif           — for ally-targeted heals (different from heal_aura.gif)
```

### Code changes required
1. Add `vizCategory: 'heal-ally'` to `SpellEntry` union type in `spellData.ts`
2. Add a "ally grid mode" to `computeSpellGrid` — when `spell.vizCategory === 'heal-ally'`:
   - Player (caster) at top, ally token at bottom (enemy-row position)
   - Heal aura plays on the ally token tile, not the caster tile
3. Add `isHealAlly` branch to `SpellVisualization.tsx` (similar to `isHeal` but targeting ally pos)
4. New `gifSpriteMap` entries in `animationAssets.ts` for new asset keys above
