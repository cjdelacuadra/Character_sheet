# domain/data/ — caster mechanic catalogs

Data catalogs that express caster options in the shared Effect vocabulary — the caster counterpart of the
martial catalogs in `shared/data/` (maneuvers, arcane shots, runes).

| File | Role |
|------|------|
| `metamagicData.ts` | The 10 PHB+TCoE metamagic options with RAW point costs, `metamagicApplies` (per-option eligibility), `metamagicCost`, `metamagicKnownCount`, and `applyMetamagicToSpell` (maps armed options onto a spell's displayed casting time / range / duration / components + reminder notes). |
| `channelDivinityData.ts` | Channel Divinity options for every cleric domain and paladin oath, with source semantics (`turn-undead` is cleric-domain-only) and `channelDivinityOptionsFor(subclass, level)`. |

Selection state lives in `featureState` (e.g. `featureState.metamagic.known`); spend pools are the
character's resources. Nothing here is class-gated — any character with the feature entry can use it.
