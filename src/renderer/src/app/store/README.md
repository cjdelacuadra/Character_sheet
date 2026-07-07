# app/store/ — Zustand store

Global state and the only sanctioned way to mutate a character.

| File | Role |
|------|------|
| `characterSlice.ts` | Characters map + every character action (equip/attune, rest, level-up, cast, buffs, summons, custom items, load/save). Loads saves through `migrateCharacterV14`. |
| `turnSlice.ts` | Per-turn combat economy (action/bonus/reaction, per-turn resource state, next-turn reset). |
| `index.ts` | Composes the slices into the `useAppStore` hook. |

## Conventions

- **`mutateCharacter(id, recipe)`** — the clone-recompute-persist helper. Actions build the next
  `Character`, recompute derived stats (`computeDerivedStats`), call `ipcService.save`, and set state.
  UI never edits a character object in place.
- **`mirrorLegacyPatch`** — transitional shim: a patch that writes a legacy one-off field is mirrored
  into `featureState`, so compat accessors see every write regardless of which generation wrote it.
  Removed at cutover together with the legacy fields.
- Rests and resource recovery are **data-driven** from `recoverOn` in the resource definitions — no
  hardcoded class lists.

Depends on `domain/`, `shared/data`, and `services/`. See
[domain/character/README.md](../../domain/character/README.md) for the schema and compat layer.
