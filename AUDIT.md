# Character Sheet — Audit & Improvement Report

_Generated during a cleanup + diagnosis pass. Part A (deletions) and the safe Part B quick-fixes have been **applied**; the findings below are **recommendations not yet implemented**, in rough priority order._

---

## Changes already applied in this pass

**Deletions (unused):**
- Removed `.montage/` (224 files, ~2.3 MB) and `.render/` (14 files) dev/preview artifacts; added both to `.gitignore`. Regenerate montages on demand with the Python generators' `--montage` flag.
- Removed unused npm deps `zod`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (only `@dnd-kit/core` is imported). `@dnd-kit/utilities` remains installed as a transitive dep of core.
- Removed 8 empty placeholder asset dirs (`weapons/{axes,bows,clubs,swords,throwables,wands and rods}`, `spells/effects/summon/{other,void}`).
- Removed the stale git worktree `claude/priceless-sutherland-987883` (no unique commits).

**Safe quick-fixes:**
- `weapons.ts`: fixed `W` sprite base path `/assets/equipment/sprites/weapons/` → `/assets/weapons/` (the old path doesn't exist on disk; see P0 below).
- Enchantment vocabulary aligned to canonical damage types in `weapons.ts` **and** `weapons.csv` (`fire|ice|thunder|earth|energy` → `fire|cold|thunder|acid|lightning`) so selecting an enchantment resolves to a real sprite dir **and** a valid damage type.
- `electron/main/index.ts`: `character:load` now wraps `JSON.parse` in try/catch (logs + returns null) so a corrupt character file no longer crashes startup.
- Added `logError()` to `rendererLogger.ts` and routed the data-loader parse-error logs (`equipmentLoader`, `summonLoader`) through it instead of `console.error`.

---

## P0 — Equipment data pipeline is inconsistent (highest impact)

The app works today only because the committed CSVs (`weapons.csv`, `gear.csv`) carry correct sprite paths. The TypeScript sources that *seed* those CSVs do not, and the regenerator is broken. This is a latent footgun: a fresh packaged install (empty `userData/equipment`) seeds CSVs from in-code defaults and would ship broken sprites.

1. **`scripts/gen-equipment-csv.mts` is broken / orphaned.** It imports `ARMOR_LIST, ACCESSORIES` from `accessories.ts` (which **does not exist**) and `armorToCsv/accessoriesToCsv` (which don't exist), and writes `armor.csv` + `accessories.csv` (which the app never reads — the app reads `gear.csv`). `npm run gen:csv` therefore **crashes**. _Decision needed:_ repair it to regenerate `weapons.csv` + `gear.csv` from `weapons.ts`/`gear.ts` via the existing `weaponsToCsv`/`gearToCsv` codecs, or delete it if the CSVs are now hand-maintained.
2. **`gear.ts` inline sprites use a dead naming scheme.** They point at legacy OSRS-style files (`${S}` = `/assets/Amulet_of_power.png`, `${A}` = `/assets/armor/leather armor.png`), while `gear.csv` (and the `gen-gear-sprites.py` output) use `/assets/<category>/<id>.png` (e.g. `/assets/amulets/amulet-of-power.png`). The `/assets/armor/` dir (singular) doesn't even exist. Left untouched in this pass because blindly rewriting ~40 paths is risky — fix it together with #1 and #3.
3. **Recommended robust fix:** on first run, seed `userData/equipment` by **copying the bundled `public/equipment_data` CSVs** rather than regenerating from TS defaults (`equipmentLoader.loadEquipmentFromCsv` + `electron/main/index.ts`). That makes the committed, correct CSVs authoritative and removes the whole TS-default-path footgun.

## P1 — `npm run typecheck` fails (16 pre-existing errors)

Typecheck is currently red, so it can't gate commits/CI. None are from this pass. Notable:
- **`quiver` is an unfinished slot.** `gear.ts` defines 3 `kind: 'quiver'` items, but `AccessorySlot`, `ShopItemKind`, and `Equipment` have no quiver slot (`gear.ts:165-168`, `EquipmentLayout.tsx:535`). Either finish wiring a quiver slot or remove the 3 items.
- **Test-file type mismatches** (`charCalculations.test.ts` ×10, `equipment.test.ts`, `characterSlice.test.ts`): `Equipment.armorId` typed `string | null` but tests pass `undefined`; `StateCreator<CharacterSlice & TurnSlice>` passed where `StateCreator<CharacterSlice>` is expected. Fix the test fixtures/types so `typecheck` is green, then add it to a pre-commit/CI gate.

## P2 — Maintainability

- **Oversized components** (extract, don't rewrite): `ActionDetailPanel.tsx` (~2419 lines — split spell/invocation/maneuver/attack-row subcomponents), `CharacterSelectScreen.tsx` (~1342 — split creation steps), `domain/rules/index.ts` (~739 — split `attacks`/`spellcasting`/`xp`), `app/store/characterSlice.ts` (~656).
- **No ESLint/Prettier.** Adding both would have auto-caught the unused deps and stray `console.*`. Recommend `eslint` + `@typescript-eslint` + `eslint-plugin-react-hooks` + Prettier.
- **Untyped IPC bridge.** `window.characterStore/equipmentStore/assetStore/appLogger` are accessed untyped (with `as any` in `services/ipc.ts` and `ItemEditorPanel.tsx`). Add a `global.d.ts` declaring the contract exposed by `electron/preload/index.ts`.

## P3 — Lower priority

- **Remaining stray `console.*`** in `EquipmentLayout.tsx` and `ItemEditorPanel.tsx` — route through the new `logError()`.
- **Error handling is sparse** (~14 try/catch across ~365 functions). The main-process character load is now guarded; consider a recovery/notice UI when a character file is unreadable.
- **Tests:** ~7% test:source ratio, no E2E. Add component tests for the largest panels and a smoke test for character-create → combat.
- **Security:** `sandbox: false` in `electron/main/index.ts`; character ids aren't sanitized before `join()` (path-traversal hardening).
- **Unused enchant sprite dirs:** all 10 damage-type dirs exist under `/assets/weapons/`, but weapons now reference only `fire/cold/thunder/acid/lightning`. Keep the other 5 (`force/necrotic/poison/psychic/radiant`) if you plan to offer them, otherwise they're ~1.4 MB removable — or expand the `enchantments` lists to use all 10.
- **Possibly orphaned assets:** `royal-spear*.png` exist under `/assets/weapons/` but no `royal-spear` weapon is defined — verify and remove or add the weapon.
- **13 subclass TODOs** ("mechanical wiring") in `subclassData.ts` (Champion crit range, Battle Master, Bladesong toggle, etc.).
- **Stale doc:** `V2_DESIGN_BLUEPRINT.md` references `zod` and a `skills.ts` that don't match current code — update or delete.
