# domain/character/ — schema, migration, compat

Defines what a character *is* at v14 and how older saves become v14.

| File | Role |
|------|------|
| `schema.ts` | The v14 `Character` shape and `FeatureState` (`{ known, active, choice, on, locked, uses, data }`). One generic `featureState: Record<featureId, FeatureState>` replaces ~20 one-off class fields. |
| `migrations.ts` | `migrateCharacterV14` — folds every legacy field (rage toggle, fighting style, maneuvers, arcane shots, infusions, runes, invocations, pact boon, totem, terrain, hex-warrior weapon, familiar, wild-shape form, racial uses) into `featureState`, then deletes the legacy keys. |
| `compat.ts` | The transitional bridge. Accessors like `isRaging`, `fightingStyleOf`, `maneuversKnownOf`, `wildShapeFormOf`, `hexWarriorWeaponIdOf` read `featureState` first and fall back to legacy fields, so both old and new call sites work during the migration period. |

**Lifecycle at cutover:** once every reader/writer targets `featureState`, delete `compat.ts`, the
`mirrorLegacyPatch` shim in the store, and the legacy fields from the `Character` type. Until then the
store's type stays a transitional superset (hence the cast in `loadFromDisk`).
