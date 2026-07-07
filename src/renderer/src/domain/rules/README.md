# domain/rules/ — unified rules engine

The single engine, split by concern. Each file is pure and folds `SourcedEffect`s from
[`../collect.ts`](../collect.ts). No class-gating — rules define defaults, never restrictions.

| File | Owns |
|------|------|
| `defense.ts` | AC (base formulas, armor/shield, DEX cap, enchantment, gear + buff + condition folding, Dual Wielder). |
| `mobility.ts` | Speed — bonuses, multipliers, Dash, Bladesong, conditions. |
| `attacks.ts` | To-hit, weapon damage, crits, riders, attack count. Resolves the live catalog weapon def. |
| `spellcasting.ts` | Save DCs, prepared counts, slots, upcast, spell damage. |
| `economy.ts` | Action / bonus / reaction per-turn state transitions. |
| `resources.ts` | Resource maxes and rest recovery (data-driven `recoverOn`). |
| `progression.ts` | XP, level-up, ASI, known-spell tables. |
| `fontOfMagic.ts` | Sorcery-point ↔ spell-slot conversion (RAW cost table). |
| `casterFeatures.ts` | Trackable caster bits — Portent, Arcane Ward, Bardic Inspiration/Song of Rest dice, Wild Shape limits, Divine Intervention. |
| `index.ts` | The older/legacy engine surface still imported by some UI (attacks, actions, special attacks, `canDualWield`, `critExtraDice`). Kept in parity with the split modules. |

Both `index.ts` and the split modules are live during the transition; parity tests keep them agreeing.
See [../README.md](../README.md) for the two-path note.
