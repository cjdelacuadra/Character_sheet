## Backlog

_(nothing pending — all items shipped)_

---

## Done

- **[bug] Empty-slot UI** — `openSlot()` now clears stale breakdown state before opening armoury
- **Inventory count panel** — `EquipmentLayout` shows unequipped counts as clickable chips
- **Versatile weapon toggle** — 1H/2H button in weapon breakdown; persisted on `Weapon.twoHanded`
- **Damage display** — dice combined via `combineDiceExpr`, subtotals per damage type, no double-plus
- **To-hit notation** — `1d20 + 7` / `max(1d20,1d20) + 7` shown in CombatPanel and ActionDetailPanel
- **Accessory stats** — `AccessoryStats` uses D&D 5e fields (acBonus, saves, skills, advantage)
- **Equipment type TS errors** — all partial Equipment literals have all 13 required fields
- **StatGroup crash** — replaced OSRS panel with `DndEquipStatsPanel`
- **shake() leak** — timer stored in `useRef`, cleared in `useEffect` cleanup
- **slotToKind dedup** — single definition in `catalogue.ts`
- **resolveSlotName fallback** — dev warning added; raw IDs never shown in UI
- **SHOP_ITEM_BY_ID double init** — single `getAllShopItems()` call at module load
- **1 maneuver (Battle Master)** — `selectedManeuver: string | null`; legacy data migrated
- **Error log** — main-process `logger.ts` + renderer `rendererLogger.ts` → `<userData>/app-errors.log`
- **Character list scroll** — select screen scrolls without showing scrollbar
- **Equipment in 3rd column** — `EquipmentLayout` permanently visible in right column
- **Equipment / inspiration header** — Equipment moved to 3rd column; inspiration preserved in store
