# domain/ — the rules engine (pure)

Pure TypeScript game logic. **No React, no Zustand imports.** Fully unit-tested. This is where 5e
mechanics live.

| File / folder | Role |
|---------------|------|
| `dice.ts` | Dice-expression parsing, combining, and rolling. |
| `effects.ts` | The core vocabulary: the `Effect` union + `SourcedEffect`, plus fold helpers (`sumOf`, `productOfSpeedMultipliers`, `damageRiders`, `acBaseFormulas`, …). |
| `collect.ts` | `collectActiveEffects(char)` — gathers effects from buffs, conditions, and equipment into one `SourcedEffect[]` the rules fold over. |
| `character/` | v14 schema, v13→v14 migration, and the transitional compat layer. → [character/README.md](character/README.md) |
| `data/` | Caster catalogs expressed in the shared vocabulary (metamagic, channel divinity). → [data/README.md](data/README.md) |
| `migrations/` | The full v1..v14 migration chain. → [migrations/README.md](migrations/README.md) |
| `rules/` | The unified engine, split by concern (defense, mobility, attacks, spellcasting, …). → [rules/README.md](rules/README.md) |

## Two calculation paths (transitional)

Both are live and kept in agreement by parity tests:

- **`rules/*`** — the unified engine (attacks, spells, actions, economy, resources, progression), folding
  `SourcedEffect`s. This is the target architecture.
- **`shared/data/charCalculations.ts`** — the older helpers (AC, HP, initiative, speed, equipment stats).
  Several UI panels still import from here; `computeEquipmentStats` and `effectiveAbilityScore` are its
  key exports and feed both paths.

New mechanics go through the Effect vocabulary so both paths see them. `__tests__/` includes
engine-parity suites that assert the two paths produce identical results.
