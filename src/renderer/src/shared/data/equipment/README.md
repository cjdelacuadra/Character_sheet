# shared/data/equipment/ — equipment catalog & CSV

The equipment system: item shapes, the in-code defaults, the CSV round-trip, and the loader.

| File | Role |
|------|------|
| `types.ts` | `WeaponEquipmentItem`, `GearEquipmentItem`, and `AccessoryStats` (AC/to-hit dice+flat, `abilityBonus`, `abilitySet` floors, saves, skills, advantage, `bonusDamage`, `critModifier`, `critBonusDamage`). |
| `weapons.ts`, `gear.ts` | In-code default catalogs and the mutable `WEAPON_BY_ID` / `GEAR_BY_ID` lookups (`setWeaponsData` / `setGearData` swap them at load). |
| `csvCodec.ts` | Weapons/gear ⇄ CSV. Shared `STATS_COLS` + `writeStatsColumns`/`readStatsColumns` used by both codecs. |
| `catalogue.ts` | The shop catalog view (`SHOP_CATALOGUE`, `getShopItemById`, custom-item merge/dedupe). |
| `equipmentLoader.ts` | Loads the authoritative bundled CSVs (`public/equipment_data/`) into the lookups at startup, seeds user CSVs, and merges legacy custom items into the catalog. |

**Authority:** the bundled CSVs under `src/renderer/public/equipment_data/` are the source of truth.
Every stat computation resolves items through `GEAR_BY_ID` / `WEAPON_BY_ID`, so items must live in the
catalog to have any effect — the item editor writes there (and syncs the legacy custom-items store).
