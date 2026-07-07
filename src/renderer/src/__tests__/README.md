# __tests__/ — Vitest suites

Unit and integration tests for the pure layers. Run with `npm test` (once) or `npm run test:watch`.

Coverage spans:

- **Migrations** — the v1..v14 chain, including a real v13 fixture upgrading to `featureState`.
- **Rules engine parity** — `domain/rules/*` vs `shared/data/charCalculations.ts` produce identical
  results (AC, attacks, saves, floors).
- **Equipment** — CSV round-trip, `computeEquipmentStats`, attunement gating, ability floors reaching
  derived stats, live weapon-def resolution, custom-item catalog merge.
- **Caster parity** — metamagic (catalog, eligibility, spell-influence mapping), Font of Magic, Channel
  Divinity catalogs, trackable caster features, dual-wield eligibility.

`helpers.ts` provides `makeChar` for fixtures. Tests import from `@/…` path aliases and mutate the
catalog via `setGearData` / `setWeaponsData` with an `afterEach` restore.
