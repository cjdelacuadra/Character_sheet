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

## 10. Weapon Catalog (`weaponData.ts`) & Rich Weapon Type

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
- [ ] `weaponData.ts` exports a `WeaponDef` interface and `WEAPON_BY_ID` record covering all weapons in the GSheet Attack Info sheet (Simple + Martial, melee + ranged).
- [ ] `WeaponDef` has at minimum: `id`, `name`, `damageDie`, `damageType`, `proficiencyCategory`, `rangeType`, `properties[]`, `enchantmentBonus`, `isMonkWeapon`.
- [ ] The `Weapon` interface in `types.ts` is extended with `damageType: string` and `properties: string[]` (with defaults `""` / `[]` for backward compat).
- [ ] Weapon cards in CharacterView show damage die, damage type, and range classification.
- [ ] The weapon picker in character creation (or an "Add Weapon" flow) lets the player choose from the catalog instead of entering everything manually.

---

## 11. Correct Attack Bonus by Weapon Properties

**Source:** `Attack Info` sheet — `Apply Ability Mod` column and weapon properties (Finesse, ranged weapons).

**What:** `computeAttackBonus` in `domain/rules/index.ts` currently always picks `max(STR, DEX)`. This is wrong for most weapons. Fix it to follow 5e rules based on weapon properties.

Rules:
- **Finesse** weapon → attacker's choice: STR or DEX (take the higher)
- **Ranged** weapon (non-Finesse) → DEX only
- **Melee** weapon (non-Finesse) → STR only
- **Unarmed / Natural** → STR

When the weapon catalog (item #10) is in place, pass the `WeaponDef` into the function so properties are available.

**Conditions of success:**
- [ ] `computeAttackBonus(character, weapon)` takes a `properties: string[]` parameter (or the full `WeaponDef`).
- [ ] A Longsword (Melee, non-Finesse) uses STR mod.
- [ ] A Rapier (Melee, Finesse) uses max(STR, DEX).
- [ ] A Shortbow (Ranged) uses DEX mod.
- [ ] Unarmed strike uses STR mod.
- [ ] The attack bonus shown in the Attacks panel matches the expected value for a test character.

---

## 12. Armor Strength Requirement & Magic Armor Variants

**Source:** `Gear Info` sheet — `Strength Required` column and +1 magic armor rows.

**What:** Add `strRequirement?: number` to `ArmorDef`. When a character equips armor they don't meet the STR threshold for, show a warning in the UI (speed is reduced by 10 ft per 5e rules). Also add the +1 magic armor variants from the GSheet.

Affected armor in `armorData.ts`:
- Chain Mail: STR 13
- Splint: STR 15
- Plate: STR 15

Magic variants to add: Shield +1, Breastplate +1, Half Plate +1, Ring Mail +1, Chain Mail +1, Splint +1, Plate +1.

**Conditions of success:**
- [ ] `ArmorDef` has an optional `strRequirement?: number` field.
- [ ] Chain Mail, Splint, and Plate have their correct STR requirements in `armorData.ts`.
- [ ] The Character View AC section shows a ⚠ warning badge when `character.abilityScores.str < equippedArmor.strRequirement`.
- [ ] `armorData.ts` includes the +1 magic armor variants (7 items from GSheet) with `enchantmentBonus: 1` or equivalent field.
- [ ] AC calculation uses the enchantment bonus when a magic armor is equipped.

---

## 13. Artificer Class

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
- [ ] `classData.ts` includes an `Artificer` entry in the `CLASSES` array.
- [ ] `CLASS_BY_ID['Artificer']` returns a valid `ClassDef` with correct hit die, saving throws, spellcasting ability (INT), and `isSpellcaster: true`.
- [ ] The Artificer appears in the class picker in character creation.
- [ ] An Artificer character has `Infuse Item` seeded in resources at level 2+, scaling per level.
- [ ] Artificer subclasses (Alchemist, Armorer, Artillerist, Battle Smith) appear in the subclass picker (they are already in `subclassData.ts`).

---

## 14. Race Weapon Proficiencies & Bonus HP per Level

**Source:** `Race Info` sheet — `Bonus Weapon and Armor Proficiencies` and `Bonus HP per Level` columns.

**What:** Two race features are tracked in the GSheet but not in the app's `RaceDef`:
1. **Bonus weapon proficiencies**: Hill Dwarf gains Battleaxe, Handaxe, Light Hammer, Warhammer. High Elf gains Longsword, Shortsword, Shortbow, Longbow. These should be added to the character's effective weapon proficiencies.
2. **Bonus HP per level**: Hill Dwarf gains +1 HP per level from Dwarven Toughness. This should be factored into `computeMaxHP`.

**Conditions of success:**
- [ ] `RaceDef` has optional `bonusWeaponProficiencies?: string[]` and `bonusHpPerLevel?: number` fields.
- [ ] Hill Dwarf entry has `bonusHpPerLevel: 1` and `bonusWeaponProficiencies: ['Battleaxe', 'Handaxe', 'Light Hammer', 'Warhammer']`.
- [ ] High Elf entry has `bonusWeaponProficiencies: ['Longsword', 'Shortsword', 'Shortbow', 'Longbow']`.
- [ ] `computeMaxHP` (in `charCalculations.ts`) accepts an optional `bonusHpPerLevel` parameter and adds it per level.
- [ ] A level 5 Hill Dwarf Fighter has 5 more max HP than an equivalent Human Fighter.
- [ ] Race bonus weapon proficiencies are applied at character creation (merged with class proficiencies for the purpose of proficiency bonus on attack rolls).

---

## 15. Subclass Selection in Character Creation

**Source:** `Class Info` sheet — `Subclass` column per class. `subclassData.ts` already has all subclasses with `unlocksAtLevel`.

**What:** Add a subclass selection step to the character creation wizard. For classes where the subclass unlocks at level 1 (Cleric, Sorcerer, Warlock), make it a mandatory step. For classes that unlock at level 3+ (most others), offer the selection but mark it optional/deferred.

Some subclasses modify base stats:
- **Sorcerer — Draconic Bloodline**: unarmored AC = 13 + DEX mod (instead of 10 + DEX).
- **Life Cleric**: gains Heavy Armor proficiency.

**Conditions of success:**
- [ ] Character creation includes a subclass step that lists available subclasses from `SUBCLASSES_BY_CLASS[classId]`.
- [ ] For Cleric, Sorcerer, and Warlock (level 1 unlock), the subclass step is required before finishing creation.
- [ ] For level 3+ classes, the step shows subclasses with a "Choose at level 3" note and allows skipping.
- [ ] The created character's `subclass` field is set to the selected subclass ID.
- [ ] Sorcerer with Draconic Bloodline subclass has AC calculated as `13 + DEX mod` when unarmored — the AC formula must read `character.subclass` to apply this.
- [ ] Life Cleric subclass correctly adds Heavy Armor to the character's effective armor proficiencies.

---

## Notes

- Items 1–9 are fully implemented. All code changes have been made and the project typechecks cleanly.
- Items 10–11 are coupled: the weapon catalog (10) must come first so the correct attack bonus formula (11) has properties to inspect.
- Item 12 (armor STR req) is self-contained and low risk.
- Item 13 (Artificer) is self-contained: add one class entry to classData.ts and verify the creation flow.
- Items 14–15 require changes to character creation and to `computeMaxHP` — test both the creation wizard and an existing character load after completing them.
