character header:
- armor and weapon ReadSlots (Chest, Weapon, Off-Hand) should also show a stat breakdown on click
  ✓ DONE

armoury & shop:
  - DRAG & DROP implementation
    ✓ DONE

equipment data consolidation:
  - move armorData / weaponData / shopData into equipment/ subfolder, download sprites locally
    ✓ DONE

---

## Backlog

### [bug] UI breaks when selecting an empty slot
**What:** Clicking an empty equipment slot (no item equipped) should open the Armoury to let
the user pick something. Instead, the panel either does not open or renders in an invalid state
(e.g. the breakdown panel for the previous slot lingers, or slot highlight state is wrong).
**Root cause:** `openSlot()` in EquipmentLayout.tsx calls `setActiveSlot(slot)` + `setArmouryOpen(true)`
but does not clear `slotBreakdown` and `weaponBreakdown` simultaneously, leaving stale UI.
**Files:** `src/renderer/src/features/character-header/EquipmentLayout.tsx` (openSlot ~line 342)
**Tests:**
- Click an empty Chest slot → Armoury opens, no breakdown panel is visible
- Click an empty Ring slot → Armoury opens filtered to ring-compatible items
- Click an empty slot while a breakdown is open → breakdown closes, Armoury opens
- Click the same empty slot again → Armoury closes (toggle)
- Click a filled slot, open breakdown, then click a different empty slot → breakdown closes, Armoury opens for the new slot
**Success:** All five test cases pass. No stale panels, no React key errors in console.

---

### Replace inspiration in header with an Equipment button
**What:** The three inspiration pips + "Insp" label in the header bar are rarely used and take up
space. Replace them with a single "Equipment" button that toggles the EquipmentLayout panel
(currently always visible inline). EquipmentLayout becomes a collapsible section or overlay.
**Files:**
- `src/renderer/src/features/character-header/CharacterHeader.tsx` (inspiration pips ~line 93)
- `src/renderer/src/features/character-header/EquipmentLayout.tsx` (receives `isOpen` prop)
- `src/renderer/src/features/character-header/CharacterHeader.module.css`
**Tests:**
- Header renders "Equipment" button; inspiration pips are gone
- Click Equipment button → EquipmentLayout becomes visible
- Click again → EquipmentLayout hides
- Equipment button shows a visual indicator (e.g. dot, count badge) when any slot is filled
- Inspiration value is still stored on the character and not lost (just hidden from header)
**Success:** Equipment panel is hidden by default; button toggles it. No regression in rest, HP,
or other header controls. Inspiration data is preserved in the character store.

---

### Show inventory count inside Equipment panel
**What:** When the Equipment panel is open, show a summary of unequipped owned items grouped by
slot type (e.g. "Helmets: 2 unequipped", "Rings: 1 unequipped"). Clicking a group opens the
Armoury filtered to that slot. This gives the player a quick "what do I own?" glance.
**Files:**
- `src/renderer/src/features/character-header/EquipmentLayout.tsx`
- `src/renderer/src/shared/data/equipment/catalogue.ts` (SHOP_ITEM_BY_ID)
- `src/renderer/src/entities/character/types.ts` (ownedItemIds: string[])
**Tests:**
- Player owns 3 helmets, 1 is equipped → panel shows "Helmets: 2 unequipped"
- Player owns 0 capes → cape row is hidden (not shown)
- Clicking "Rings: 1 unequipped" opens Armoury filtered to ring slot
- Unequipping an item increments the count immediately (reactive)
- Equipping from Armoury decrements the count immediately
**Success:** Inventory counts are accurate and reactive. Clicking a count row filters the Armoury.
Empty categories are hidden to avoid noise.

---

### Versatile weapons: one-hand / two-hand mode toggle
**What:** 16 weapons have the "Versatile (XdY)" property (quarterstaff, longsword, warhammer, etc.).
When one of these is equipped, the player should be able to toggle between one-handed (base die)
and two-handed (versatile die). The chosen mode must be persisted on the `Weapon` object and
reflected in all damage displays.
**Files:**
- `src/renderer/src/shared/data/equipment/weapons.ts` (WeaponDef, properties array)
- `src/renderer/src/entities/character/types.ts` (Weapon interface — add `twoHanded?: boolean`)
- `src/renderer/src/features/combat/CombatPanel.tsx` (damage display ~line 224)
- `src/renderer/src/features/combat-actions/ActionDetailPanel.tsx` (damage detail ~line 220)
- `src/renderer/src/features/character-header/EquipmentLayout.tsx` (weapon breakdown panel)
**Versatile regex:** `/Versatile\s*\((\d+d\d+)\)/` applied to `weapon.properties`
**Two-Handed weapons** (greatsword etc.) cannot be toggled — they are always two-handed.
**Tests:**
- Longsword equipped one-handed → damage shows `1d8`; toggle to two-handed → damage shows `1d10`
- Quarterstaff toggle: `1d6` ↔ `1d8`
- Two-handed-only weapon (greatsword) → toggle UI is not shown
- Non-versatile weapon → toggle UI is not shown
- `twoHanded` flag persisted in character store → survives page reload
- Off-hand weapon slot occupied → one-handed mode only (cannot two-hand with off-hand item)
**Success:** Toggle is visible only for versatile weapons. Damage die updates correctly in CombatPanel
and ActionDetailPanel. Two-Handed-only weapons are unaffected.

---

### Damage display: combine dice, sort descending
**What:** When a weapon has multiple damage components (base die + bonus die + flat modifier from
STR/DEX + enchantment), the display currently concatenates them literally: `1d6+1d4+3+2`.
Instead, combine same-face dice (`1d6+1d6` → `2d6`) and sort groups descending by die face
(`2d10 + 1d6 + 5`), then append the flat bonus last.
**Algorithm:**
1. Parse each damage term into `{ count, face }` or flat integer.
2. Group by `face`, sum counts.
3. Sort groups descending by face (d12 > d10 > d8 > d6 > d4).
4. Sum all flat integers.
5. Render: `2d10 + 1d6 + 5` (positive flat) or `2d10 + 1d6 - 1` (negative flat).
**Files:**
- `src/renderer/src/features/combat/CombatPanel.tsx` (~line 224)
- `src/renderer/src/features/combat-actions/ActionDetailPanel.tsx` (~line 220)
- New utility: `src/renderer/src/shared/utils/diceExpr.ts` — `parseDice()`, `combineDice()`, `formatDice()`
**Tests:**
- `1d6 + 1d4 + 3 + 2` → `1d6 + 1d4 + 5`
- `1d6 + 1d6 + 1d6 + 2 + 3` → `3d6 + 5`
- `2d6 + 1d8 + 4` → `1d8 + 2d6 + 4` (sorted desc by face)
- Negative mod: `1d8 - 1` renders correctly
- Greatsword (2d6) + `+1` enchantment + STR +3 → `2d6 + 4`
- Versatile two-hand longsword (1d10) + STR +2 → `1d10 + 2`
**Success:** All test cases match expected output. `parseDice` has unit tests in `diceExpr.test.ts`.

---

### To-hit display: dice notation with adv/dis
**What:** Attack rolls currently show `+7` (just the modifier). Change to show the full roll
expression: `1d20 + 7`. Add per-weapon advantage/disadvantage toggle so the full expression
becomes `max(1d20, 1d20) + 7` (advantage) or `min(1d20, 1d20) + 7` (disadvantage).
**Files:**
- `src/renderer/src/features/combat/CombatPanel.tsx` (fmtMod / attack column ~line 170)
- `src/renderer/src/features/combat-actions/ActionDetailPanel.tsx` (Hit stat ~line 217)
**Note:** `rollMap` state already tracks `adv: 'n' | 'a' | 'd'` per weapon — reuse it.
**Tests:**
- Normal: displays `1d20 + 5` (not just `+5`)
- Advantage toggle: displays `max(1d20, 1d20) + 5`
- Disadvantage toggle: displays `min(1d20, 1d20) + 5`
- Zero modifier: displays `1d20`
- Negative modifier: displays `1d20 - 2`
- ActionDetailPanel Hit row matches CombatPanel notation
**Success:** All five test cases pass. Toggling adv/dis updates display immediately. No regression
in roll animation or numerical value.

---

### Unify accessory bonuses to D&D 5e stats only (AC, saves, skills, advantage)
**What:** The current `AccessoryStats` interface mirrors OSRS stats (attackBonus.stab,
defenceBonus.crush, other.meleeStr, etc.). These don't map to D&D 5e. Replace with a unified
D&D-native bonus set: flat AC bonus, saving throw bonuses, skill bonuses, and advantage grants.
**New interface:**
```ts
export interface AccessoryStats {
  acBonus?: number
  savingThrowBonus?: Partial<Record<AbilityScore, number>>  // { str: 2, con: 1 }
  skillBonus?: Partial<Record<SkillKey, number>>            // { athletics: 2 }
  advantage?: {
    savingThrows?: AbilityScore[]   // saves with advantage
    skills?: SkillKey[]             // skill checks with advantage
    deathSaves?: boolean
  }
}
```
**Files:**
- `src/renderer/src/shared/data/equipment/types.ts` — replace `AccessoryStats`
- `src/renderer/src/shared/data/equipment/accessories.ts` — update all 37 item `stats` fields
- `src/renderer/src/shared/data/charCalculations.ts` — update `computeEquipmentStats()`
- `src/renderer/src/features/character-header/EquipmentLayout.tsx` — update stat breakdown rows
**Tests:**
- Amulet with `acBonus: 1` → character AC increases by 1
- Ring with `savingThrowBonus: { wis: 2 }` → WIS save shows `+2` bonus
- Item with `advantage.skills: ['perception']` → perception check tooltip shows advantage
- Removing item reverts all bonuses
- `tsc --noEmit` passes after type changes
**Success:** No OSRS stat fields remain. All 37 accessories have valid D&D stats. `tsc` clean.
Equipment stat breakdown panel shows meaningful D&D labels.

---

### Only allow 1 maneuver selection (Battle Master)
**What:** Battle Master subclass currently lets players select 3–9 maneuvers scaling with level.
The intent is to allow only 1 at a time. Change the data model to a single selected maneuver
(or null) and update the UI accordingly.
**Files:**
- `src/renderer/src/entities/character/types.ts` — change `battleMasterManeuvers?: string[]` to `selectedManeuver?: string | null`
- `src/renderer/src/features/combat-actions/ActionDetailPanel.tsx` (~lines 1194–1346)
- `src/renderer/src/app/store.ts` — update any store actions that write `battleMasterManeuvers`
**Tests:**
- Picker shows all 16 maneuvers; selecting one sets `selectedManeuver` and closes picker
- Only one maneuver is displayed at a time; "+" button hidden once one is selected
- Clicking the active maneuver again deselects it (sets to null)
- Selecting a different maneuver replaces the previous one
- Characters with old `battleMasterManeuvers` array in saved state degrade gracefully (use first item)
**Success:** UI shows exactly 0 or 1 maneuver. `battleMasterManeuvers` array field removed.
Existing saved characters with array data are migrated without crash.
