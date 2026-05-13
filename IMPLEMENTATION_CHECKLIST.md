# Character Sheet — Implementation Checklist

Ordered by priority. Each item states what to build and the exact condition that marks it done.

---

## 1. Short / Long Rest ✅

**What:** Add a rest panel (or header button) with "Short Rest" and "Long Rest" actions.

- Short Rest: recover HP using Hit Dice (player chooses how many to spend), recover class resources marked `recoverOn: 'short'`.
- Long Rest: fully restore HP to max, reset all spell slots to total, reset all class resources.

**Conditions of success:**
- [x] A "Rest" button is visible in the Character View header or vitals panel.
- [x] Clicking "Short Rest" opens a Hit Dice roller: shows available HD (e.g. `3d10`), player clicks to roll each die, current HP increases by the rolled amount (capped at max).
- [x] After a Long Rest, `hitPoints.current === hitPoints.max`.
- [x] After a Long Rest, every spell slot has `used === 0`.
- [x] After a Long Rest, every resource with `recoverOn: 'long'` resets to `used === 0`.
- [x] After a Short Rest, resources marked `recoverOn: 'short'` reset to `used === 0`.
- [x] Rest state is persisted to disk (character file reflects the recovered values).

---

## 2. Bundled SRD Spell Data + Spell Card Modal ✅

**What:** Add a local spell data file (`src/renderer/src/shared/data/spellData.ts`) with at minimum the spells commonly used by the classes in the app (cantrips + levels 1–5). Each spell has: `id`, `name`, `level`, `school`, `castingTime`, `range`, `components`, `duration`, `description`.

In the Known Spells panel, render each spell as a compact row showing name + level badge. Clicking a spell opens a modal overlay with the full spell card.

**Conditions of success:**
- [x] `spellData.ts` exports a typed `SpellEntry` interface and a `SPELL_BY_ID` record.
- [x] The Known Spells panel shows spell name and level (e.g. "Fireball — 3rd") instead of raw IDs.
- [x] Clicking a spell opens a modal that displays: name, level, school, casting time, range, components, duration, and full description.
- [x] The modal closes on click-outside or Escape key.
- [x] Spell search filters by name in real time.
- [x] Cantrips are labeled "Cantrip" (level 0).
- [x] If a spell ID has no entry in `SPELL_BY_ID`, the name falls back to the raw ID (no crash).

---

## 3. Resource Tracking Panel ✅

**What:** Display and control class-specific resources in the vitals column. Resources are stored in `character.resources` as `Record<string, { used: number; total: number }>`. Populate default resources at character creation based on class (e.g. Barbarian gets Rage, Bard gets Bardic Inspiration, etc.).

**Conditions of success:**
- [x] A "Resources" section appears in the left column when `character.resources` has at least one entry.
- [x] Each resource shows its name, and pip buttons (like spell slots) to mark used / recover.
- [x] Resources are correctly seeded at character creation for each class (at minimum: Fighter → Second Wind + Action Surge, Barbarian → Rage, Bard → Bardic Inspiration, Cleric → Channel Divinity, Druid → Wild Shape, Monk → Ki, Paladin → Divine Sense + Lay on Hands, Ranger → — , Rogue → —, Sorcerer → Sorcery Points, Warlock → Pact Slots, Wizard → Arcane Recovery).
- [x] Resource totals scale with character level (e.g. Rage uses: 2 at level 1, 3 at level 3).
- [x] Used resource state persists to disk.
- [x] After Short / Long Rest (item #1), resources recover according to their recovery type.

---

## 4. Temporary HP Setter ✅

**What:** Add a way to set and clear temporary HP on the character. Temp HP is displayed near the HP section.

**Conditions of success:**
- [x] A "+Temp HP" input or button is visible in the HP section.
- [x] The player can type or tap a value to set `hitPoints.temp`.
- [x] Temp HP is shown visually distinct from current HP (different color or separate chip).
- [x] Setting temp HP to 0 or clearing the field removes the display.
- [x] Temp HP persists to disk.

---

## 5. Spell Selection Step in Character Creation ✅

**What:** Add a 4th step to the `CreateModal` flow: "Spells". This step only appears for spellcasting classes (Wizard, Sorcerer, Bard, Cleric, Druid, Warlock, Paladin, Ranger). The player picks cantrips and known spells from the class spell list, up to the class-defined limit for their level.

**Conditions of success:**
- [x] The step indicator shows 4 steps for caster classes, 3 for non-casters.
- [x] The Spells step shows a searchable list of available cantrips and spells for the selected class.
- [x] The player can select up to the class-defined cantrip count and known spell count for their level.
- [x] Already-selected spells are visually marked; selecting again deselects.
- [x] The created character's `spellIds` contains the selected spell IDs.
- [x] Non-caster classes (Fighter, Rogue, Barbarian, Monk at level 1–2) skip this step entirely.

---

## 6. Concentration Tracker ✅

**What:** Track which spell the character is concentrating on. Show a visible concentration badge on the active spell and a one-click "drop concentration" action.

**Conditions of success:**
- [x] In the Known Spells panel, concentration spells have a "C" badge indicator.
- [x] Clicking a concentration spell while no concentration is active sets `character.concentrationSpellId` to that spell.
- [x] The active concentration spell is highlighted in the spell list.
- [x] A "Drop Concentration" button appears in the vitals or spell section when `concentrationSpellId` is set.
- [x] Clicking "Drop Concentration" sets `concentrationSpellId` to `undefined` and persists.
- [x] Concentration state persists to disk.

---

## 7. Domain Rules Layer (`src/domain/rules`) ✅

**What:** Extract and expand game logic into a framework-agnostic `src/renderer/src/domain/rules/` module. Pure functions only — no React imports, no store access.

Minimum functions to implement:
- `computeAttackBonus(character, weapon)` → number
- `computeSpellSaveDC(character)` → number
- `computeSpellAttackBonus(character)` → number
- `getAvailableActions(character)` → `ActionDef[]` (class + level aware)
- `getResourceDefaults(classId, level)` → `Record<string, { used: number; total: number }>`

**Conditions of success:**
- [x] All functions live under `src/renderer/src/domain/rules/` with no React or Zustand imports.
- [x] `computeSpellSaveDC` returns `8 + profBonus + spellcastingMod` based on class spellcasting ability.
- [x] `computeAttackBonus` for a weapon returns `abilityMod + profBonus + weapon.atkBonus`.
- [x] Weapon rows in the Attacks section display the computed attack bonus instead of the raw stored value.
- [x] `getAvailableActions` filters the static action list and appends class-specific actions (see item #8).

---

## 8. Class-Contextual Actions ✅

**What:** The Actions panel should show only actions available to the character given their class, level, and current resource state. Class-specific actions (Action Surge, Cunning Action, Ki abilities, etc.) should appear and show resource cost.

**Conditions of success:**
- [x] A Fighter at level 2+ sees "Action Surge" in the Bonus Actions section (costs 1 use of the Action Surge resource).
- [x] A Rogue at level 2+ sees "Cunning Action" (Dash/Disengage/Hide as Bonus Action).
- [x] A Monk at level 2+ sees "Flurry of Blows", "Patient Defense", "Step of the Wind" with Ki cost displayed.
- [x] An action that requires a depleted resource is visually grayed out.
- [x] Generic actions (Attack, Dodge, Help, etc.) are shown for all characters.
- [x] Class-specific actions are derived from `getAvailableActions` in the domain rules layer (item #7).

---

## 9. XP Tracker and Level-Up Prompt ✅

**What:** Display the character's current XP and the XP threshold for the next level. Allow inline editing of XP. When XP reaches the threshold, show a "Level Up" prompt.

**Conditions of success:**
- [x] XP is displayed in the topbar or identity section as `1200 / 2700 XP`.
- [x] Clicking XP opens an inline editor to add or set a new value.
- [x] XP thresholds follow the standard D&D 5e table (300 for level 2, 900 for level 3, … 355000 for level 20).
- [x] When XP ≥ threshold, a "Level Up" badge or button appears.
- [x] Clicking "Level Up" increments `character.level`, recalculates `proficiencyBonus` and `hitPoints.max`, and persists.
- [x] Leveling up does not reset current HP or used resources.

---

## 10. Weapon Catalog (`weaponData.ts`) & Rich Weapon Type ✅

**What:** Create `src/renderer/src/shared/data/weaponData.ts` cataloging every SRD weapon. Extend the `Weapon` interface in `types.ts` with properties needed to compute bonuses and render cards correctly.

**Conditions of success:**
- [x] `weaponData.ts` exports a `WeaponDef` interface and `WEAPON_BY_ID` record covering all weapons in the GSheet Attack Info sheet (Simple + Martial, melee + ranged).
- [x] `WeaponDef` has at minimum: `id`, `name`, `damageDie`, `damageType`, `proficiencyCategory`, `rangeType`, `properties[]`, `enchantmentBonus`, `isMonkWeapon`.
- [x] The `Weapon` interface in `types.ts` is extended with `damageType: string` and `properties: string[]` (with defaults `""` / `[]` for backward compat).
- [x] Weapon cards in CharacterView show damage die, damage type, and range classification.
- [x] The weapon picker in character creation (or an "Add Weapon" flow) lets the player choose from the catalog instead of entering everything manually.

---

## 11. Correct Attack Bonus by Weapon Properties ✅

**What:** `computeAttackBonus` in `domain/rules/index.ts` currently always picks `max(STR, DEX)`. This is wrong for most weapons. Fix it to follow 5e rules based on weapon properties.

Rules:
- **Finesse** weapon → attacker's choice: STR or DEX (take the higher)
- **Ranged** weapon (non-Finesse) → DEX only
- **Melee** weapon (non-Finesse) → STR only
- **Unarmed / Natural** → STR

**Conditions of success:**
- [x] `computeAttackBonus(character, weapon)` takes a `properties: string[]` parameter (or the full `WeaponDef`).
- [x] A Longsword (Melee, non-Finesse) uses STR mod.
- [x] A Rapier (Melee, Finesse) uses max(STR, DEX).
- [x] A Shortbow (Ranged) uses DEX mod.
- [x] Unarmed strike uses STR mod.
- [x] The attack bonus shown in the Attacks panel matches the expected value for a test character.

---

## 12. Armor Strength Requirement & Magic Armor Variants ✅

**What:** Add `strRequirement?: number` to `ArmorDef`. When a character equips armor they don't meet the STR threshold for, show a warning in the UI (speed is reduced by 10 ft per 5e rules). Also add the +1 magic armor variants from the GSheet.

**Conditions of success:**
- [x] `ArmorDef` has an optional `strRequirement?: number` field.
- [x] Chain Mail, Splint, and Plate have their correct STR requirements in `armorData.ts`.
- [x] The Character View AC section shows a ⚠ warning badge when `character.abilityScores.str < equippedArmor.strRequirement`.
- [x] `armorData.ts` includes the +1 magic armor variants (7 items from GSheet) with `enchantmentBonus: 1` or equivalent field.
- [x] AC calculation uses the enchantment bonus when a magic armor is equipped.

---

## 13. Artificer Class ✅

**What:** Add the Artificer class to `classData.ts`. It is missing entirely — `CLASS_BY_ID['Artificer']` currently returns `undefined`, causing crashes if a character with classId `'Artificer'` is loaded.

**Conditions of success:**
- [x] `classData.ts` includes an `Artificer` entry in the `CLASSES` array.
- [x] `CLASS_BY_ID['Artificer']` returns a valid `ClassDef` with correct hit die, saving throws, spellcasting ability (INT), and `isSpellcaster: true`.
- [x] The Artificer appears in the class picker in character creation.
- [x] An Artificer character has `Infuse Item` seeded in resources at level 2+, scaling per level.
- [x] Artificer subclasses (Alchemist, Armorer, Artillerist, Battle Smith) appear in the subclass picker (they are already in `subclassData.ts`).

---

## 14. Race Weapon Proficiencies & Bonus HP per Level ⚠️ Partial

**What:** Two race features are tracked in the GSheet but not in the app's `RaceDef`:
1. **Bonus weapon proficiencies**: Hill Dwarf gains Battleaxe, Handaxe, Light Hammer, Warhammer. High Elf gains Longsword, Shortsword, Shortbow, Longbow. These should be added to the character's effective weapon proficiencies.
2. **Bonus HP per level**: Hill Dwarf gains +1 HP per level from Dwarven Toughness. This should be factored into `computeMaxHP`.

**Conditions of success:**
- [x] `RaceDef` has optional `bonusWeaponProficiencies?: string[]` and `bonusHpPerLevel?: number` fields.
- [x] Hill Dwarf entry has `bonusHpPerLevel: 1` and `bonusWeaponProficiencies: ['Battleaxe', 'Handaxe', 'Light Hammer', 'Warhammer']`.
- [x] High Elf entry has `bonusWeaponProficiencies: ['Longsword', 'Shortsword', 'Shortbow', 'Longbow']`.
- [x] `computeMaxHP` (in `charCalculations.ts`) accepts an optional `bonusHpPerLevel` parameter and adds it per level.
- [x] A level 5 Hill Dwarf Fighter has 5 more max HP than an equivalent Human Fighter.
- [x] Race bonus weapon proficiencies are used in attack bonus computation — `computeAttackBonus` checks the character's effective proficiency list (class + race) and only adds `proficiencyBonus` when the weapon is in that list. Implemented in Item 25.

---

## 15. Subclass Selection in Character Creation ✅

**What:** Add a subclass selection step to the character creation wizard. For classes where the subclass unlocks at level 1 (Cleric, Sorcerer, Warlock), make it a mandatory step. For classes that unlock at level 3+ (most others), offer the selection but mark it optional/deferred.

**Conditions of success:**
- [x] Character creation includes a subclass step that lists available subclasses from `SUBCLASSES_BY_CLASS[classId]`.
- [x] For Cleric, Sorcerer, and Warlock (level 1 unlock), the subclass step is required before finishing creation.
- [x] For level 3+ classes, the step shows subclasses with a "Choose at level 3" note and allows skipping.
- [x] The created character's `subclass` field is set to the selected subclass ID.
- [x] Sorcerer with Draconic Bloodline subclass has AC calculated as `13 + DEX mod` when unarmored — the AC formula must read `character.subclass` to apply this.
- [x] Life Cleric subclass correctly adds Heavy Armor to the character's effective armor proficiencies.

---

## 16. Magic Weapon Enchantment Bonus in Attack Calculations ⚠️ Partial

**What:** `WeaponDef` in `weaponData.ts` has `enchantmentBonus`, `bonusDamageDie`, and `bonusDamageType` but the character's `Weapon` interface in `types.ts` doesn't carry these fields, so `computeAttackBonus` never adds the +1/+2/+3 from magic weapons. This item bridges the catalog to the character instance.

**Conditions of success:**
- [x] `Weapon` in `types.ts` gains three optional fields: `enchantmentBonus?: number`, `bonusDamageDie?: string`, `bonusDamageType?: string`.
- [x] The add-weapon-from-catalog flow (armory in `CharacterView.tsx`) copies `enchantmentBonus`, `bonusDamageDie`, and `bonusDamageType` from the matched `WeaponDef` into the new `Weapon`. Weapons entered manually leave these fields `undefined`.
- [x] `computeAttackBonus` in `domain/rules/index.ts` returns `abilityMod + (isProficient ? character.proficiencyBonus : 0) + (weapon.atkBonus ?? 0) + (weapon.enchantmentBonus ?? 0)`. Both `atkBonus` and `enchantmentBonus` stack. Proficiency-conditional formula supersedes earlier version — see Item 25.
- [x] A non-magical longsword and a Longsword +1 added from the catalog show different attack bonuses in the table (difference equals exactly 1).
- [x] Existing saved characters without `enchantmentBonus` on their weapons load without errors; the absence is treated as 0 via `?? 0`.
- [x] A compact badge (e.g., "+1") appears next to the weapon name in the attacks table for magic weapons; absent for mundane weapons.
- [x] `buildCharacter` in `CharacterSelectScreen.tsx` copies `enchantmentBonus`, `bonusDamageDie`, and `bonusDamageType` from `WeaponDef` when building the initial weapon list from `chosenWeapons`.

---

## 17. Three-Subcolumn Left Panel (Ability Scores | Saves | Skills)

**Superseded by Items 23 and 24**, which implement the official D&D 5e vertical stacking approach. Skip.

---

## 18. ASI / Feat Selection Modal on Level-Up ✅

**What:** `levelUp(id)` in `store.ts` silently increments level with no player input, violating 5e rules that grant Ability Score Improvements at class-specific levels. This item adds `asiLevels` per class, a feat data file, and a modal that captures ASI or feat choice before applying the level-up.

**Conditions of success:**
- [x] `ClassDef` in `classData.ts` gains `asiLevels: number[]` (required, no `?`). All 13 classes are updated: Fighter `[4,6,8,12,14,16,19]`, Rogue `[4,8,10,12,16,19]`, all others `[4,8,12,16,19]`. TypeScript compilation succeeds.
- [x] `featsData.ts` exports a `FeatDef` interface (`id`, `name`, `description`, optional `abilityBonus?: Partial<AbilityScores>`) and a `FEATS` array with at least 10 SRD feats (e.g. Alert, Athlete, Lucky, Mobile, Sentinel, Tough, War Caster, Resilient, Sharpshooter, Great Weapon Master).
- [x] `Character` in `types.ts` gains `feats?: string[]`. Existing characters without this field load without error; it defaults to `[]`.
- [x] `LevelUpModal` presents three mutually exclusive options: (a) +2 to one ability dropdown, (b) +1/+1 to two different ability dropdowns (same ability cannot be picked twice), (c) searchable feat list. "Confirm" is disabled until a complete valid selection is made in exactly one option.
- [x] `levelUp(id, asiChoice?)` in `store.ts` accepts an optional discriminated union `{ type:'double'; ability }` | `{ type:'split'; ability1; ability2 }` | `{ type:'feat'; featId }`. Ability scores are updated (capped at 20) or the feat id is appended to `character.feats` before HP/prof/slot recalculation.
- [x] Clicking "Level Up" at an ASI level opens `LevelUpModal` instead of calling `levelUp` directly. At non-ASI levels the store action fires immediately with no modal.
- [x] Confirming the modal applies the choice and closes it; canceling leaves level and scores unchanged.

---

## 19. Rich Attack Details in Right Column ✅

**What:** The attacks table lives in the center column and shows only Name | Atk Bonus | Damage/Type | Delete. This item moves it to the right column and expands it to 8 columns — Name, Atk Bonus, Damage, Type, Bonus Dmg, Bonus Type, Range, Delete — surfacing enchantment badges, bonus damage, and range unlocked by Item 16.

**Conditions of success:**
- [x] The attacks table is removed from the center column and rendered in the right column. The center column no longer shows any attacks section or duplicate summary.
- [x] The right-column table has 8 ordered columns: **Name** | **Atk Bonus** | **Damage** | **Type** | **Bonus Dmg** | **Bonus Type** | **Range** | **Delete**. Column headers are present.
- [x] "Bonus Dmg" and "Bonus Type" are populated from `weapon.bonusDamageDie` and `weapon.bonusDamageType`. Weapons without bonus damage show an em-dash; the columns remain in the header regardless.
- [x] "Range" displays `"Melee"`, `"Ranged"`, or `"M/R"` from `weapon.rangeType`; `undefined` shows an em-dash.
- [x] Magic weapons display a "+N" badge in the Name cell (consistent with Item 16); absent for mundane weapons.
- [x] The "+ Add" weapon button is adjacent to the new right-column table. Add/delete functionality is fully preserved with no regression.

---

## 20. Character Header — 2-Row Identity Grid ✅

**What:** The current topbar compresses all character identity into a 48px bar with a name and a single sub-label line. This item replaces it with a 2-row × 4-column grid matching the official D&D sheet.

**Conditions of success:**
- [x] `Character` in `types.ts` gains `playerName?: string` and `alignment?: string`. Existing saved characters load without error; both fields default to `""`.
- [x] Character creation (`CharacterSelectScreen.tsx`) includes input fields for Player Name and Alignment (a select or free-text field with the 9 standard alignments).
- [x] The topbar is replaced by a full-width header rendered as two rows of four labeled cells:
  - Row 1: Character Name | Class & Level | Background | Player Name
  - Row 2: Race | Alignment | Experience Points | (actions: Insp/Rest/Back)
- [x] Each cell shows a small uppercase label below the value, matching the official sheet's field structure.
- [x] XP remains editable inline with Level Up button adjacent.
- [x] Inspiration and Rest buttons relocated to the actions cell of the header grid.

---

## 21. Left Column — AC | Initiative | Speed Row + Armor Picker ✅

**What:** Extract AC, Initiative, and Speed into a dedicated Row 1 of the left column as three equal-sized prominent boxes.

**Conditions of success:**
- [x] Row 1 renders three equal-width boxes: **Armor Class** | **Initiative** | **Speed**, each with a large centered value and a small label below.
- [x] Initiative and Speed remain click-to-edit. AC is read-only (computed). The STR-requirement warning badge (`⚠`) on AC is preserved.
- [x] The armor picker (equip/unequip, shield toggle) is rendered as a collapsed sub-row directly below Row 1, toggled by clicking the AC box.
- [x] Proficiency Bonus, Spell Save DC, and Spell Attack Bonus moved to a compact secondary stat row below the top stat row.

---

## 22. Left Column — HP | Temp HP | Death Saves Row ✅

**What:** Redesign the HP section as a single full-width row with three horizontally arranged sections.

**Conditions of success:**
- [x] Row 2 renders as a single horizontal container with three sections side-by-side:
  1. **Current HP section**: `"Hit Point Maximum: N"` label at top; large click-to-edit current HP value below it.
  2. **Temp HP section**: labeled `"Temp HP"`, click-to-edit value. Shows `"—"` when 0.
  3. **Death Saves section**: labeled `"Death Saves"`, always visible. Two rows — Successes and Failures — each with 3 toggleable circles.
- [x] The ±delta buttons and the HP progress bar are retained as a compact sub-row below the three-section row.
- [x] Existing HP, death save data is fully preserved.
- [x] The conditional `{isDown && ...}` death saves block replaced by always-visible section.

---

## 23. Left Column Row 4 Left — Ability Score Blocks (modifier circle on top) ✅

**What:** In Row 4 of the left column, the left 1/3-width sub-column holds the six ability score blocks. Each block shows the **modifier** prominently in a circle at the top and the **raw score** in a smaller box below.

**Conditions of success:**
- [x] The six ability score blocks sit in a narrow (1fr) left sub-column of `.statsSubGrid`, stacked vertically: STR, DEX, CON, INT, WIS, CHA.
- [x] Each block (top to bottom): **modifier circle** (36×36 px with visible border) → **score box** (raw number, click-to-edit) → **label** (e.g., `"STR"`, small uppercase).
- [x] Clicking the score box opens an inline number input (1–30). Committing on Enter/blur saves via the existing `commitEdit` handler.
- [x] The modifier circle updates in real-time when the score is edited.

---

## 24. Left Column Rows 3 & 4 Right — Inspiration Row + Saves/Skills Sub-column ✅

**What:** Row 3 adds inspiration pip buttons; Row 4 Right adds a scrollable saves/skills sub-column.

**Conditions of success:**
- [x] **Row 3 — Inspiration pip**: a row with a pip button. The existing `character.inspiration: boolean` maps to 1 filled pip; clicking toggles it. The topbar `✦ Inspiration` button is removed (relocated to header actions cell).
- [x] **Row 4 `.statsSubGrid`**: a CSS grid container with columns `1fr 2fr`. Left child is `.statsSubLeft` (ability blocks from Item 23). Right child is `.statsSubRight`.
- [x] **Saving Throws** (top of `.statsSubRight`): section header `"Saving Throws"` + small `"Prof +N"` badge. 6 rows: circle button (filled = proficient) | computed bonus | ability name. Circle click toggles proficiency.
- [x] **Skills** (middle of `.statsSubRight`): section header `"Skills"`. Rows: circle indicator | computed bonus | skill name | ability abbreviation. `.statsSubRight` has `overflow-y: auto` so it scrolls independently.
- [x] **Passive Perception** (bottom of `.statsSubRight`): small labeled box.
- [x] **Proficiency Bonus**: shown as a small `"Prof +N"` badge inside the Saving Throws header (read-only).

---

## 25. Weapon Proficiency Check in Attack Bonus ❌ Not Implemented

**What:** `computeAttackBonus` in `domain/rules/index.ts` always adds `character.proficiencyBonus` regardless of whether the character is actually proficient with the weapon. In 5e, proficiency bonus is only added to attack rolls when the attacker is proficient with the weapon. This also means `bonusWeaponProficiencies` from `RaceDef` (item #14) has no effect in practice.

**Files to modify:**
- `src/renderer/src/domain/rules/index.ts` — add a proficiency check helper and call it in `computeAttackBonus`
- `src/renderer/src/widgets/character-view/CharacterView.tsx` — optionally show a ⚠ badge or greyed text on non-proficient weapon rows

**Logic for proficiency check:**
1. Gather effective proficiency list: `[...classDef.weaponProficiencies, ...(raceDef?.bonusWeaponProficiencies ?? [])]`
2. Match weapon: a weapon is proficient if its `proficiencyCategory` (`'Simple'` / `'Martial'`) maps to a broad proficiency string (e.g. `"Simple weapons"`, `"Martial weapons"`) OR its `name` appears directly in the list (e.g. `"Longsword"` for Bard weapon profs).
3. Return `abilityMod + (isProficient ? character.proficiencyBonus : 0) + (weapon.atkBonus ?? 0) + (weapon.enchantmentBonus ?? 0)`.

**Conditions of success:**
- [x] `computeAttackBonus` accepts a `character` and optional race/class context (or reads it from `character.classId` and `character.race`) and only adds `character.proficiencyBonus` when the character is proficient with the weapon.
- [x] A Fighter (proficient with Martial weapons) attacking with a Longsword: proficiency bonus added. ✓
- [x] A Wizard (not proficient with Martial weapons) attacking with a Longsword: no proficiency bonus added. ✓
- [x] A Hill Dwarf Wizard attacking with a Battleaxe (race bonus prof): proficiency bonus added. ✓
- [x] A Bard with Longsword class proficiency attacking with a Longsword: proficiency bonus added. ✓
- [x] Non-proficient weapon rows in the attacks table show a visual indicator (e.g. `⚠` badge or greyed attack bonus).

---

## 26. Character Creation — Preserve Weapon Enchantment ❌ Not Implemented

**What:** `buildCharacter` in `CharacterSelectScreen.tsx` maps `chosenWeapons` (selected in StepEquipment) to `Weapon` objects but does not copy `enchantmentBonus`, `bonusDamageDie`, or `bonusDamageType` from the source `WeaponDef`. A player who picks "Longsword +1" from the catalog during creation gets a character saved with a plain Longsword (no +1 bonus, no enchantment badge).

**Files to modify:**
- `src/renderer/src/features/character-select/CharacterSelectScreen.tsx` — `buildCharacter`, lines 159–167

**Fix:** extend the `chosenWeapons.map(...)` to include the three enchantment fields:
```ts
const weapons = chosenWeapons.map(w => ({
  id: w.id,
  name: w.name,
  atkBonus: 0,
  damage: w.damageDie,
  damageType: w.damageType,
  rangeType: w.rangeType,
  properties: w.properties,
  enchantmentBonus: w.enchantmentBonus || undefined,
  bonusDamageDie: w.bonusDamageDie,
  bonusDamageType: w.bonusDamageType,
}))
```

**Conditions of success:**
- [x] A character created with "Longsword +1" selected in StepEquipment has `weapon.enchantmentBonus === 1` after creation.
- [x] The attacks table for that character shows `"+N"` enchantment badge immediately after creation, with no re-adding needed.
- [x] The attack bonus for the magic weapon is computed correctly (`+1` more than the non-magical equivalent) from the first session.
- [x] Custom weapons added via the "Custom" tab (which have no `enchantmentBonus`) are unaffected.

---

## 27. Half-Elf Racial Ability Score Flexibility ❌ Not Implemented

**What:** Per D&D 5e rules, Half-Elf gets +2 to Charisma **and +1 to any two other ability scores of the player's choice**. The current `raceData.ts` entry for Half-Elf only has `abilityBonus: { cha: 2 }`, omitting the two free +1s. The `freeAbilityPoints` mechanism (already used for Variant Human) should be applied to Half-Elf as well, but Half-Elf's picks must exclude CHA (already at +2) or at minimum allow the player to freely pick any two non-CHA abilities.

**Files to modify:**
- `src/renderer/src/shared/data/raceData.ts` — add `freeAbilityPoints: 2` to the `HalfElf` entry
- `src/renderer/src/features/character-select/CharacterSelectScreen.tsx` — optionally filter CHA from the free-pick dropdowns when race is Half-Elf (to match the 5e rule that the two free points must go to abilities other than CHA)

**Conditions of success:**
- [x] The `HalfElf` entry in `raceData.ts` has `freeAbilityPoints: 2` in addition to `abilityBonus: { cha: 2 }`.
- [x] In StepScores, a Half-Elf character shows the free-ability-pick UI (same as Variant Human) allowing the player to assign +1 to any two ability scores.
- [x] A Half-Elf Wizard who picks STR and DEX for the free picks ends with: STR +1, DEX +1, CHA +2 (plus racial/array base scores). No other scores are changed.
- [x] Existing Half-Elf characters already saved to disk load without error; the `freeAbilityPoints` field only affects creation.

---

## Notes

- Items 1–16 (except 14 last condition) are fully implemented.
- Item 14 last condition (race weapon proficiencies in attack bonus) is now covered by Item 25.
- Item 16 last condition (enchantment fields in buildCharacter) is now covered by Item 26.
- Item 17 (3-subcolumn layout) is superseded by Items 23 and 24 and should be skipped.
- Items 18–27 are fully implemented.
- One bug was fixed during audit (2026-05-13): `CharacterView.tsx` ability score edit handler was not passing `bonusHpPerLevel` to `computeMaxHP`, causing Hill Dwarf max HP to be miscalculated after ability score edits.
- Item 16 formula contradiction with Item 25 resolved (2026-05-13): Item 25 supersedes the always-add-profBonus formula — `computeAttackBonus` now uses proficiency-conditional bonus.
