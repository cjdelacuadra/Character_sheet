# shared/data/ — static SRD data & calculations

The game's content catalogs plus the older calculation helpers. No React.

## Calculations

| File | Role |
|------|------|
| `charCalculations.ts` | AC, HP, initiative, speed, and `computeEquipmentStats` / `effectiveAbilityScore` / `effectiveAbilityBonus` (ability bonuses **and** abilitySet floors, attunement-gated). Feeds both calculation paths — see [../../domain/README.md](../../domain/README.md). |

## Content catalogs

| File | Contents |
|------|----------|
| `classData.ts` | Classes — hit die, saves, proficiencies, resource scaling, spell tables. |
| `subclassData.ts`, `classFeaturesData.ts` | Subclass list + class/subclass feature definitions. |
| `raceData.ts`, `racialActions.ts` | Races (ability bonuses, natural AC, speed, racial spells) + racial actions. |
| `backgrounds.ts` | Backgrounds. |
| `spellData.ts`, `spellSlots.ts` | Spell catalog + slot tables. |
| `featsData.ts`, `fightingStylesData.ts` | Feats and fighting styles. |
| `maneuversData.ts`, `arcaneShotsData.ts`, `runeData.ts`, `infusionsData.ts`, `invocationsData.ts`, `psiWarriorData.ts`, `arcaneTraditonsData.ts` | Martial/other subclass option catalogs. |
| `wildShapeBeasts.ts`, `wildMagicSurgeTable.ts`, `wildSurgeTable.ts` | Wild Shape forms; Sorcerer d100 and Barbarian d8 surge tables. |
| `conditionsData.ts`, `skills.ts` | Conditions and skill list. |
| `resourceDefaults.ts`, `resourceEffects.ts` | Resource definitions (with `recoverOn`) and their effects. |
| `equipment/` | Weapons, gear, catalog, CSV codec, loader. → [equipment/README.md](equipment/README.md) |

Caster-specific catalogs (metamagic, channel divinity) live under
[`../../domain/data/`](../../domain/data/) because they are expressed in the Effect vocabulary.
