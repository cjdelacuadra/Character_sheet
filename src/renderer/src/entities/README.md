# entities/ — shared type contracts

Type definitions only — **no logic** — so every layer can depend on them without cycles.

| Folder | Contents |
|--------|----------|
| `character/types.ts` | The `Character`, `Weapon`, `Equipment`, `AbilityScores`, and related runtime types the whole app shares. (Currently a transitional superset — see [../domain/character/README.md](../domain/character/README.md).) |
| `class/types.ts` | Class/subclass definition shapes. |
| `condition/types.ts` | Condition definition shapes. |
| `spell/types.ts` | Spell definition shape. |
| `summon/types.ts` | Summon template + active-summon runtime shapes. |

Static data conforming to these contracts lives in `shared/data/`; the pure logic that consumes them
lives in `domain/`.
