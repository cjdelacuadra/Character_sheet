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

**Source:** `Attack Info` sheet in GSheet v2.1 — 60+ SRD weapons plus magic variants.

**What:** Create `src/renderer/src/shared/data/weaponData.ts` cataloging every SRD weapon. Extend the `Weapon` interface in `types.ts` with properties needed to compute bonuses and render cards correctly.

Data per weapon:
- `damageDie`: e.g. `"1d6"`, `"2d6"`, `"1"` (unarmed)
- `damageType`: `"slashing" | "piercing" | "bludgeoning" | "force" | string`
- `proficiencyCategory`: `"Simple" | "Martial" | "Unarmed" | "Natural" | "Spell"`
- `rangeType`: `"Melee" | "Ranged" | "Melee or Ranged"`
- `properties`: `string[]` — e.g. `["Finesse", "Light"]`, `["Versatile (1d8)"]`, `["Thrown (range 20/60)"]`
- `enchantmentBonus`: `number` (0 for normal, 1 for +1 items)
- `bonusDamageDie?`: `string` — e.g. `"2d6"` (Flame Tongue)
- `bonusDamageType?`: `string` — e.g. `"fire"`
- `isMonkWeapon`: `boolean`
- `applyAbilityMod`: `boolean` — false for off-hand variants listed in GSheet

Update `CharacterView` weapon cards to show damage type, range, and properties.

**Conditions of success:**
- [x] `weaponData.ts` exports a `WeaponDef` interface and `WEAPON_BY_ID` record covering all weapons in the GSheet Attack Info sheet (Simple + Martial, melee + ranged).
- [x] `WeaponDef` has at minimum: `id`, `name`, `damageDie`, `damageType`, `proficiencyCategory`, `rangeType`, `properties[]`, `enchantmentBonus`, `isMonkWeapon`.
- [x] The `Weapon` interface in `types.ts` is extended with `damageType: string` and `properties: string[]` (with defaults `""` / `[]` for backward compat).
- [x] Weapon cards in CharacterView show damage die, damage type, and range classification.
- [x] The weapon picker in character creation (or an "Add Weapon" flow) lets the player choose from the catalog instead of entering everything manually.

---

## 11. Correct Attack Bonus by Weapon Properties ✅

**Source:** `Attack Info` sheet — `Apply Ability Mod` column and weapon properties (Finesse, ranged weapons).

**What:** `computeAttackBonus` in `domain/rules/index.ts` currently always picks `max(STR, DEX)`. This is wrong for most weapons. Fix it to follow 5e rules based on weapon properties.

Rules:
- **Finesse** weapon → attacker's choice: STR or DEX (take the higher)
- **Ranged** weapon (non-Finesse) → DEX only
- **Melee** weapon (non-Finesse) → STR only
- **Unarmed / Natural** → STR

When the weapon catalog (item #10) is in place, pass the `WeaponDef` into the function so properties are available.

**Conditions of success:**
- [x] `computeAttackBonus(character, weapon)` takes a `properties: string[]` parameter (or the full `WeaponDef`).
- [x] A Longsword (Melee, non-Finesse) uses STR mod.
- [x] A Rapier (Melee, Finesse) uses max(STR, DEX).
- [x] A Shortbow (Ranged) uses DEX mod.
- [x] Unarmed strike uses STR mod.
- [x] The attack bonus shown in the Attacks panel matches the expected value for a test character.

---

## 12. Armor Strength Requirement & Magic Armor Variants ✅

**Source:** `Gear Info` sheet — `Strength Required` column and +1 magic armor rows.

**What:** Add `strRequirement?: number` to `ArmorDef`. When a character equips armor they don't meet the STR threshold for, show a warning in the UI (speed is reduced by 10 ft per 5e rules). Also add the +1 magic armor variants from the GSheet.

Affected armor in `armorData.ts`:
- Chain Mail: STR 13
- Splint: STR 15
- Plate: STR 15

Magic variants to add: Shield +1, Breastplate +1, Half Plate +1, Ring Mail +1, Chain Mail +1, Splint +1, Plate +1.

**Conditions of success:**
- [x] `ArmorDef` has an optional `strRequirement?: number` field.
- [x] Chain Mail, Splint, and Plate have their correct STR requirements in `armorData.ts`.
- [x] The Character View AC section shows a ⚠ warning badge when `character.abilityScores.str < equippedArmor.strRequirement`.
- [x] `armorData.ts` includes the +1 magic armor variants (7 items from GSheet) with `enchantmentBonus: 1` or equivalent field.
- [x] AC calculation uses the enchantment bonus when a magic armor is equipped.

---

## 13. Artificer Class ✅

**Source:** `Class Info` sheet — Artificer row (added after the main 13 classes). Already has subclasses in `subclassData.ts`.

**What:** Add the Artificer class to `classData.ts`. It is missing entirely — `CLASS_BY_ID['Artificer']` currently returns `undefined`, causing crashes if a character with classId `'Artificer'` is loaded.

Artificer stats (from GSheet):
- Hit die: d8
- Saving throws: CON, INT
- Armor proficiencies: Light, Medium, Shields
- Weapon proficiencies: Simple weapons, Firearms (if setting allows)
- Spellcasting: Half Caster, INT
- Cantrips: 2 (no scaling per GSheet)
- Spell slots: same table as Paladin/Ranger (half-caster, rounded up)
- Primary ability: INT
- Resources: Infuse Item (2 at level 2, scales up to 12 at level 20)

**Conditions of success:**
- [x] `classData.ts` includes an `Artificer` entry in the `CLASSES` array.
- [x] `CLASS_BY_ID['Artificer']` returns a valid `ClassDef` with correct hit die, saving throws, spellcasting ability (INT), and `isSpellcaster: true`.
- [x] The Artificer appears in the class picker in character creation.
- [x] An Artificer character has `Infuse Item` seeded in resources at level 2+, scaling per level.
- [x] Artificer subclasses (Alchemist, Armorer, Artillerist, Battle Smith) appear in the subclass picker (they are already in `subclassData.ts`).

---

## 14. Race Weapon Proficiencies & Bonus HP per Level ✅

**Source:** `Race Info` sheet — `Bonus Weapon and Armor Proficiencies` and `Bonus HP per Level` columns.

**What:** Two race features are tracked in the GSheet but not in the app's `RaceDef`:
1. **Bonus weapon proficiencies**: Hill Dwarf gains Battleaxe, Handaxe, Light Hammer, Warhammer. High Elf gains Longsword, Shortsword, Shortbow, Longbow. These should be added to the character's effective weapon proficiencies.
2. **Bonus HP per level**: Hill Dwarf gains +1 HP per level from Dwarven Toughness. This should be factored into `computeMaxHP`.

**Conditions of success:**
- [x] `RaceDef` has optional `bonusWeaponProficiencies?: string[]` and `bonusHpPerLevel?: number` fields.
- [x] Hill Dwarf entry has `bonusHpPerLevel: 1` and `bonusWeaponProficiencies: ['Battleaxe', 'Handaxe', 'Light Hammer', 'Warhammer']`.
- [x] High Elf entry has `bonusWeaponProficiencies: ['Longsword', 'Shortsword', 'Shortbow', 'Longbow']`.
- [x] `computeMaxHP` (in `charCalculations.ts`) accepts an optional `bonusHpPerLevel` parameter and adds it per level.
- [x] A level 5 Hill Dwarf Fighter has 5 more max HP than an equivalent Human Fighter.
- [x] Race bonus weapon proficiencies are applied at character creation (merged with class proficiencies for the purpose of proficiency bonus on attack rolls).

---

## 15. Subclass Selection in Character Creation ✅

**Source:** `Class Info` sheet — `Subclass` column per class. `subclassData.ts` already has all subclasses with `unlocksAtLevel`.

**What:** Add a subclass selection step to the character creation wizard. For classes where the subclass unlocks at level 1 (Cleric, Sorcerer, Warlock), make it a mandatory step. For classes that unlock at level 3+ (most others), offer the selection but mark it optional/deferred.

Some subclasses modify base stats:
- **Sorcerer — Draconic Bloodline**: unarmored AC = 13 + DEX mod (instead of 10 + DEX).
- **Life Cleric**: gains Heavy Armor proficiency.

**Conditions of success:**
- [x] Character creation includes a subclass step that lists available subclasses from `SUBCLASSES_BY_CLASS[classId]`.
- [x] For Cleric, Sorcerer, and Warlock (level 1 unlock), the subclass step is required before finishing creation.
- [x] For level 3+ classes, the step shows subclasses with a "Choose at level 3" note and allows skipping.
- [x] The created character's `subclass` field is set to the selected subclass ID.
- [x] Sorcerer with Draconic Bloodline subclass has AC calculated as `13 + DEX mod` when unarmored — the AC formula must read `character.subclass` to apply this.
- [x] Life Cleric subclass correctly adds Heavy Armor to the character's effective armor proficiencies.

---

## 16. Magic Weapon Enchantment Bonus in Attack Calculations

**What:** `WeaponDef` in `weaponData.ts` has `enchantmentBonus`, `bonusDamageDie`, and `bonusDamageType` but the character's `Weapon` interface in `types.ts` doesn't carry these fields, so `computeAttackBonus` never adds the +1/+2/+3 from magic weapons. This item bridges the catalog to the character instance.

**Files to modify:**
- `src/renderer/src/entities/character/types.ts` — add 3 fields to `Weapon`
- `src/renderer/src/domain/rules/index.ts` — update `computeAttackBonus`
- `src/renderer/src/widgets/character-view/CharacterView.tsx` — armory add-weapon logic + badge in weapon row
- `src/renderer/src/features/character-select/CharacterSelectScreen.tsx` — copy fields when adding from catalog at creation

**Conditions of success:**
- [ ] `Weapon` in `types.ts` gains three optional fields: `enchantmentBonus?: number`, `bonusDamageDie?: string`, `bonusDamageType?: string`.
- [ ] The add-weapon-from-catalog flow (armory in `CharacterView.tsx`) copies `enchantmentBonus`, `bonusDamageDie`, and `bonusDamageType` from the matched `WeaponDef` into the new `Weapon`. Weapons entered manually leave these fields `undefined`.
- [ ] `computeAttackBonus` in `domain/rules/index.ts` returns `abilityMod + profBonus + (weapon.atkBonus ?? 0) + (weapon.enchantmentBonus ?? 0)`. Both `atkBonus` (manual override) and `enchantmentBonus` stack.
- [ ] A non-magical longsword and a Longsword +1 added from the catalog show different attack bonuses in the table (difference equals exactly 1).
- [ ] Existing saved characters without `enchantmentBonus` on their weapons load without errors; the absence is treated as 0 via `?? 0`.
- [ ] A compact badge (e.g., "+1") appears next to the weapon name in the attacks table for magic weapons; absent for mundane weapons.

---

## 17. Three-Subcolumn Left Panel (Ability Scores | Saves | Skills)

**What:** The left column stacks ability scores, saving throws, and skills vertically inside 240 px, making the panel tall and hard to scan. This item replaces that stack with a horizontal 3-subcolumn block so all three sections are visible at a glance, requiring the left column to widen to ~420–440 px.

**Files to modify:**
- `src/renderer/src/widgets/character-view/CharacterView.tsx` — restructure left column JSX
- `src/renderer/src/widgets/character-view/CharacterView.module.css` — widen `.leftCol`, add `.coreStatsRow` and subcolumn classes

**Conditions of success:**
- [ ] `.leftCol` is widened to ~420–440 px (fixed or min-width). Center and right columns compensate via their existing `flex` values; no horizontal overflow at 1280 px viewport width.
- [ ] A new `.coreStatsRow` container wraps the ability scores, saving throws, and skills DOM sections as three direct flex children. All other sections (vitals, combat stats, conditions) remain outside this container and are not restructured.
- [ ] **Subcolumn 1 — Ability Scores**: 6 rows (STR → CHA). Each row: uppercase label | editable numeric score | read-only modifier (`±X`). Editing behavior is identical to the current 2-column grid.
- [ ] **Subcolumn 2 — Saving Throws**: 6 rows in the same vertical order. Each row: proficiency dot (filled if proficient) | computed save bonus. Rows align with Subcolumn 1 via CSS Grid shared row tracks or equal `height` per row — not by coincidence.
- [ ] **Subcolumn 3 — Skills**: all 17 skills. Each row: prof dot | bonus | skill name | governing ability abbreviation. The subcolumn is independently scrollable (`overflow-y: auto`) so a tall list doesn't push other sections off-screen.
- [ ] Layout does not break (no overflow, no collapsed columns) at 1100 px viewport width.

---

## 18. ASI / Feat Selection Modal on Level-Up

**What:** `levelUp(id)` in `store.ts` silently increments level with no player input, violating 5e rules that grant Ability Score Improvements at class-specific levels. This item adds `asiLevels` per class, a feat data file, and a modal that captures ASI or feat choice before applying the level-up.

**Files to create:**
- `src/renderer/src/shared/data/featsData.ts`
- `src/renderer/src/widgets/level-up-modal/LevelUpModal.tsx`

**Files to modify:**
- `src/renderer/src/shared/data/classData.ts` — add `asiLevels: number[]` to `ClassDef` and all 13 entries
- `src/renderer/src/entities/character/types.ts` — add `feats?: string[]` to `Character`
- `src/renderer/src/app/store.ts` — update `levelUp(id, asiChoice?)` signature
- `src/renderer/src/widgets/character-view/CharacterView.tsx` — intercept Level Up button at ASI levels

**Conditions of success:**
- [ ] `ClassDef` in `classData.ts` gains `asiLevels: number[]` (required, no `?`). All 13 classes are updated: Fighter `[4,6,8,12,14,16,19]`, Rogue `[4,8,10,12,16,19]`, all others `[4,8,12,16,19]`. TypeScript compilation succeeds.
- [ ] `featsData.ts` exports a `FeatDef` interface (`id`, `name`, `description`, optional `abilityBonus?: Partial<AbilityScores>`) and a `FEATS` array with at least 10 SRD feats (e.g. Alert, Athlete, Lucky, Mobile, Sentinel, Tough, War Caster, Resilient, Sharpshooter, Great Weapon Master).
- [ ] `Character` in `types.ts` gains `feats?: string[]`. Existing characters without this field load without error; it defaults to `[]`.
- [ ] `LevelUpModal` presents three mutually exclusive options: (a) +2 to one ability dropdown, (b) +1/+1 to two different ability dropdowns (same ability cannot be picked twice), (c) searchable feat list. "Confirm" is disabled until a complete valid selection is made in exactly one option.
- [ ] `levelUp(id, asiChoice?)` in `store.ts` accepts an optional discriminated union `{ type:'double'; ability }` | `{ type:'split'; ability1; ability2 }` | `{ type:'feat'; featId }`. Ability scores are updated (capped at 20) or the feat id is appended to `character.feats` before HP/prof/slot recalculation.
- [ ] Clicking "Level Up" at an ASI level opens `LevelUpModal` instead of calling `levelUp` directly. At non-ASI levels the store action fires immediately with no modal.
- [ ] Confirming the modal applies the choice and closes it; canceling leaves level and scores unchanged.

---

## 19. Rich Attack Details in Right Column

**What:** The attacks table lives in the center column and shows only Name | Atk Bonus | Damage/Type | Delete. This item moves it to the right column and expands it to 8 columns — Name, Atk Bonus, Damage, Type, Bonus Dmg, Bonus Type, Range, Delete — surfacing enchantment badges, bonus damage, and range unlocked by Item 16.

**Depends on:** Item 16 (needs `weapon.bonusDamageDie`, `weapon.bonusDamageType`, `weapon.enchantmentBonus` on the `Weapon` interface).

**Files to modify:**
- `src/renderer/src/widgets/character-view/CharacterView.tsx` — move attacks from center to right column; expand to 8 columns
- `src/renderer/src/widgets/character-view/CharacterView.module.css` — new column-width classes as needed

**Conditions of success:**
- [ ] The attacks table is removed from the center column and rendered in the right column. The center column no longer shows any attacks section or duplicate summary.
- [ ] The right-column table has 8 ordered columns: **Name** | **Atk Bonus** | **Damage** | **Type** | **Bonus Dmg** | **Bonus Type** | **Range** | **Delete**. Column headers are present.
- [ ] "Bonus Dmg" and "Bonus Type" are populated from `weapon.bonusDamageDie` and `weapon.bonusDamageType`. Weapons without bonus damage show an em-dash; the columns remain in the header regardless.
- [ ] "Range" displays `"Melee"`, `"Ranged"`, or `"M/R"` from `weapon.rangeType`; `undefined` shows an em-dash.
- [ ] Magic weapons display a "+N" badge in the Name cell (consistent with Item 16); absent for mundane weapons.
- [ ] The "+ Add" weapon button is adjacent to the new right-column table. Add/delete functionality is fully preserved with no regression.

---

## 20. Character Header — 2-Row Identity Grid

**What:** The current topbar compresses all character identity into a 48px bar with a name and a single sub-label line (`Level 3 · Elf · Wizard · Sage`). The official sheet exposes each field as a separate labeled input in a 2-row × 4-column grid. Two fields — Player Name and Alignment — are not stored or shown anywhere in the current app.

**Files to modify:**
- `src/renderer/src/entities/character/types.ts` — add `playerName?: string`, `alignment?: string` to `Character`
- `src/renderer/src/features/character-select/CharacterSelectScreen.tsx` — add Player Name + Alignment inputs to character creation
- `src/renderer/src/widgets/character-view/CharacterView.tsx` — replace topbar identity block with 2-row grid
- `src/renderer/src/widgets/character-view/CharacterView.module.css` — new `.headerGrid`, `.headerCell`, `.headerLabel`, `.headerValue` classes

**Conditions of success:**
- [ ] `Character` in `types.ts` gains `playerName?: string` and `alignment?: string`. Existing saved characters load without error; both fields default to `""`.
- [ ] Character creation (`CharacterSelectScreen.tsx`) includes input fields for Player Name and Alignment (a select or free-text field with the 9 standard alignments).
- [ ] The topbar is replaced by a full-width header rendered as two rows of four labeled cells:
  - Row 1: Character Name | Class & Level | Background | Player Name
  - Row 2: Race | Alignment | Experience Points | (empty or Hit Dice remaining)
- [ ] Each cell shows a small uppercase label below the value (e.g., value `"Elara"` with label `"CHARACTER NAME"`), matching the official sheet's field structure.
- [ ] Character Name, XP, and all other currently editable topbar fields remain editable inline (click to edit). The Level Up button stays accessible near the XP cell.
- [ ] The Inspiration toggle and Rest button are relocated — either to a dedicated area adjacent to the header or to the left column — and no longer live in the topbar.

---

## 21. Left Column Top Row — AC | Initiative | Speed

**What:** AC, Initiative, and Speed are currently mixed into a 2-column combat stats grid alongside Proficiency Bonus, Spell DC, and Spell Attack. The official sheet gives these three stats a dedicated row of three equal-sized prominent boxes at the very top of the left column, before the HP section. This item extracts them into that dedicated row.

**Files to modify:**
- `src/renderer/src/widgets/character-view/CharacterView.tsx` — restructure left column top
- `src/renderer/src/widgets/character-view/CharacterView.module.css` — new `.topStatRow`, `.topStatBox` classes; retain or repurpose `.combatGrid` for Prof/Spell stats below

**Conditions of success:**
- [ ] The top of the left column renders three equal-width boxes in a single horizontal row, in order: **Armor Class** | **Initiative** | **Speed**.
- [ ] Each box has: a large centered value (e.g., `"14"`, `"+2"`, `"30"`) and a small label below it (e.g., `"Armor Class"`, `"Initiative"`, `"Speed"`). This matches the official sheet's three-box layout exactly.
- [ ] Initiative and Speed remain click-to-edit. AC remains read-only (computed). The STR-requirement warning badge (`⚠`) on AC is preserved.
- [ ] Proficiency Bonus, Spell Save DC, and Spell Attack Bonus are moved to a separate compact row or section below the HP block (or relocated as part of item 24), and are no longer mixed with AC/Initiative/Speed.
- [ ] The armor picker (equip/unequip armor) is still accessible; it can live below the top stat row or as a collapsed sub-row under AC.

---

## 22. HP Section — Three Stacked Labeled Boxes

**What:** The current HP display is an inline row (`current / max`) with a color-coded progress bar and six ±delta buttons. The official sheet uses three visually distinct stacked boxes: a "Hit Point Maximum" label+line, a large "Current Hit Points" box, and a smaller "Temporary Hit Points" box. Death Saves and Hit Dice are always visible as a side-by-side pair below the HP boxes — not hidden until downed.

**Files to modify:**
- `src/renderer/src/widgets/character-view/CharacterView.tsx` — restructure HP + death saves + hit dice JSX
- `src/renderer/src/widgets/character-view/CharacterView.module.css` — new `.hpStack`, `.hpMaxRow`, `.hpCurrentBox`, `.hpTempBox`, `.hpDeathHitRow` classes

**Conditions of success:**
- [ ] The HP area renders three stacked elements in this vertical order:
  1. **Hit Point Maximum** — a small labeled line showing the max value (e.g., `"Hit Point Maximum: 28"`).
  2. **Current Hit Points** — a large box (prominent, click-to-edit inline). Clicking opens a number input; committing on Enter or blur saves via the store.
  3. **Temporary Hit Points** — a smaller labeled box below, click-to-edit. Shows `"—"` or `"0"` when empty; clearing it sets `hitPoints.temp` to `0`.
- [ ] The progress bar and ±delta buttons (−10/−5/−1/+1/+5/+10) are retained but rendered below the three boxes as a compact utility row, not replacing the boxes.
- [ ] **Death Saves** and **Hit Dice** are rendered as a horizontal pair of boxes **always visible** (not conditional on HP = 0):
  - Death Saves box: label `"Death Saves"`, Successes row with 3 small circles, Failures row with 3 small circles. Circles toggle filled/empty on click.
  - Hit Dice box: label `"Hit Dice"`, shows available dice (e.g., `"3d10"`) and the count remaining vs total (`"3 / 5"`).
- [ ] Clicking a Death Save circle still increments the count; clicking beyond 3 wraps back to 0. Behavior is identical to current logic, just always visible.
- [ ] Existing HP, death save, and hit dice data is fully preserved — no data loss from the structural change.

---

## 23. Ability Score Blocks — Modifier Circle on Top, Score Box Below

**What:** The current ability scores use a 2-column grid where each cell shows: label (top) → large score → small modifier. The official sheet inverts the visual hierarchy: the **modifier** is the number in a prominent circle at the top (since that is what players read in play), and the **raw score** is in a secondary box below it. The six blocks stack vertically in a single column.

**Files to modify:**
- `src/renderer/src/widgets/character-view/CharacterView.tsx` — replace `.abilityGrid` section
- `src/renderer/src/widgets/character-view/CharacterView.module.css` — replace `.abilityGrid`/`.abilityCell` with `.abilityStack`, `.abilityBlock`, `.abilityModCircle`, `.abilityScoreBox`, `.abilityName`

**Note:** This item supersedes the ability-scores subcolumn described in Item 17. Items 23 and 24 together replace the vertical-stack portion of Item 17.

**Conditions of success:**
- [ ] The six ability score blocks are arranged in a **single vertical column** (one block per row), in order: STRENGTH, DEXTERITY, CONSTITUTION, INTELLIGENCE, WISDOM, CHARISMA.
- [ ] Each block contains three elements top-to-bottom:
  1. A **circle** element displaying the modifier with sign (e.g., `"+2"`, `"-1"`). The circle has a visible border and is large enough to read at a glance (min 32×32 px).
  2. A **square/rectangular box** below the circle displaying the raw score (e.g., `"16"`). This box is the click target to edit the score.
  3. A **label** at the bottom in small uppercase text (e.g., `"STRENGTH"`).
- [ ] The modifier circle updates in real-time when the score box is edited (no separate save step needed — same behavior as current click-to-edit).
- [ ] Clicking the score box opens an inline number input (1–30) bound to `character.abilityScores[key]`. Committing saves via the existing `commitEdit` handler in the store.
- [ ] The Hill Dwarf `bonusHpPerLevel` bug fix (from the 2026-05-13 audit) is preserved — `computeMaxHP` is still called with the correct `bonusHpPerLevel` when ability scores are edited.

---

## 24. Below Ability Scores — Inspiration, Proficiency Bonus, Saves, Skills, Passive Perception

**What:** In the official sheet, directly below the 6 ability score blocks sits a structured sequence: Inspiration (checkbox), Proficiency Bonus (labeled box), Saving Throws (6 rows), Skills (18 rows), and Passive Perception (labeled box). Currently: Inspiration is a topbar pill button, Proficiency Bonus is in the combat stats grid, and Saving Throws/Skills are already in the left column but use filled dots rather than open circle checkboxes.

**Files to modify:**
- `src/renderer/src/widgets/character-view/CharacterView.tsx` — move Inspiration + Prof Bonus; update save/skill row styles
- `src/renderer/src/widgets/character-view/CharacterView.module.css` — new `.inspirationRow`, `.profBonusBox`, `.saveCircle`, `.skillCircle` classes

**Conditions of success:**
- [ ] **Inspiration**: rendered as a small open square (checkbox aesthetic) + `"Inspiration"` label directly below the ability score column. Clicking toggles `character.inspiration`. When active the checkbox is visually filled/checked. The topbar pill button is removed.
- [ ] **Proficiency Bonus**: rendered as a small labeled box (e.g., value `"+3"`, label `"Proficiency Bonus"`) immediately below the Inspiration row. Value is read-only (computed from level). The Prof chip in the combat stats grid is removed.
- [ ] **Saving Throws**: 6 rows (STR → CHA) each containing: a small **open circle** (filled when proficient, empty when not) | computed bonus value | ability label (e.g., `"Strength"`). The circle is click-to-toggle proficiency. Section header: `"Saving Throws"`.
- [ ] **Skills**: 18 rows covering all standard 5e skills (Acrobatics, Animal Handling, Arcana, Athletics, Deception, History, Insight, Intimidation, Investigation, Medicine, Nature, Perception, Performance, Persuasion, Religion, Sleight of Hand, Stealth, Survival). Each row: small open circle (filled = proficient, half-filled or double-ring = expert) | computed bonus | skill name | governing ability abbreviation (e.g., `"DEX"`). Section header: `"Skills"`.
- [ ] **Passive Perception**: a small labeled box at the bottom of the section showing `10 + Perception modifier`. Label reads `"Passive Wisdom (Perception)"`. Value updates automatically when WIS or Perception proficiency changes.
- [ ] All five elements appear in the left column in the exact vertical order listed above, immediately below the ability score blocks from Item 23.

---

## Notes

- Items 1–15 are fully implemented. All code changes have been made and the project typechecks cleanly.
- One bug was fixed during audit (2026-05-13): `CharacterView.tsx` ability score edit handler was not passing `bonusHpPerLevel` to `computeMaxHP`, causing Hill Dwarf max HP to be miscalculated after ability score edits.
- Item 16 (enchantment bonus) must be completed before Item 19 (rich attacks table), as Item 19 reads `weapon.enchantmentBonus`, `weapon.bonusDamageDie`, and `weapon.bonusDamageType` from the interface extended in Item 16.
- **Item 17 (3-subcolumn layout) is superseded by Items 23 and 24**, which implement the official D&D sheet's vertical stacking approach for ability scores, saves, and skills. Item 17 should be skipped.
- Item 18 (ASI modal) is self-contained; `featsData.ts` needs to be created from scratch.
- Item 19 (rich attacks table) depends on Item 16.
- Items 20–24 collectively implement the official D&D 5e character sheet visual layout. Recommended implementation order: 21 → 22 → 23 → 24 → 20 (header last, as it touches the most shared layout code).
