# domain/migrations/ — save migration chain

| File | Role |
|------|------|
| `index.ts` | The ordered v1..v14 migration chain applied to a loaded save. Each step upgrades one schema version; the v13→v14 step (in [`../character/migrations.ts`](../character/migrations.ts)) is the generalization that introduces `featureState`. |

Migrations are covered by fixture-based tests in `__tests__/` (including a real v13 fixture) so a save
written by any prior version loads cleanly.
