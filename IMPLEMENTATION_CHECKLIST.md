# Character Sheet — Implementation Checklist

Ordered by priority. Each item states what to build and the exact condition that marks it done.

---

## 1. Short / Long Rest

**What:** Add a rest panel (or header button) with "Short Rest" and "Long Rest" actions.

- Short Rest: recover HP using Hit Dice (player chooses how many to spend), recover class resources marked `recoverOn: 'short'`.
- Long Rest: fully restore HP to max, reset all spell slots to total, reset all class resources.

**Conditions of success:**
- [ ] A "Rest" button is visible in the Character View header or vitals panel.
- [ ] Clicking "Short Rest" opens a Hit Dice roller: shows available HD (e.g. `3d10`), player clicks to roll each die, current HP increases by the rolled amount (capped at max).
- [ ] After a Long Rest, `hitPoints.current === hitPoints.max`.
- [ ] After a Long Rest, every spell slot has `used === 0`.
- [ ] After a Long Rest, every resource with `recoverOn: 'long'` resets to `used === 0`.
- [ ] After a Short Rest, resources marked `recoverOn: 'short'` reset to `used === 0`.
- [ ] Rest state is persisted to disk (character file reflects the recovered values).

---

## 2. Bundled SRD Spell Data + Spell Card Modal

**What:** Add a local spell data file (`src/renderer/src/shared/data/spellData.ts`) with at minimum the spells commonly used by the classes in the app (cantrips + levels 1–5). Each spell has: `id`, `name`, `level`, `school`, `castingTime`, `range`, `components`, `duration`, `description`.

In the Known Spells panel, render each spell as a compact row showing name + level badge. Clicking a spell opens a modal overlay with the full spell card.

**Conditions of success:**
- [ ] `spellData.ts` exports a typed `SpellEntry` interface and a `SPELL_BY_ID` record.
- [ ] The Known Spells panel shows spell name and level (e.g. "Fireball — 3rd") instead of raw IDs.
- [ ] Clicking a spell opens a modal that displays: name, level, school, casting time, range, components, duration, and full description.
- [ ] The modal closes on click-outside or Escape key.
- [ ] Spell search filters by name in real time.
- [ ] Cantrips are labeled "Cantrip" (level 0).
- [ ] If a spell ID has no entry in `SPELL_BY_ID`, the name falls back to the raw ID (no crash).

---

## 3. Resource Tracking Panel

**What:** Display and control class-specific resources in the vitals column. Resources are stored in `character.resources` as `Record<string, { used: number; total: number }>`. Populate default resources at character creation based on class (e.g. Barbarian gets Rage, Bard gets Bardic Inspiration, etc.).

**Conditions of success:**
- [ ] A "Resources" section appears in the left column when `character.resources` has at least one entry.
- [ ] Each resource shows its name, and pip buttons (like spell slots) to mark used / recover.
- [ ] Resources are correctly seeded at character creation for each class (at minimum: Fighter → Second Wind + Action Surge, Barbarian → Rage, Bard → Bardic Inspiration, Cleric → Channel Divinity, Druid → Wild Shape, Monk → Ki, Paladin → Divine Sense + Lay on Hands, Ranger → — , Rogue → —, Sorcerer → Sorcery Points, Warlock → Pact Slots, Wizard → Arcane Recovery).
- [ ] Resource totals scale with character level (e.g. Rage uses: 2 at level 1, 3 at level 3).
- [ ] Used resource state persists to disk.
- [ ] After Short / Long Rest (item #1), resources recover according to their recovery type.

---

## 4. Temporary HP Setter

**What:** Add a way to set and clear temporary HP on the character. Temp HP is displayed near the HP section.

**Conditions of success:**
- [ ] A "+Temp HP" input or button is visible in the HP section.
- [ ] The player can type or tap a value to set `hitPoints.temp`.
- [ ] Temp HP is shown visually distinct from current HP (different color or separate chip).
- [ ] Setting temp HP to 0 or clearing the field removes the display.
- [ ] Temp HP persists to disk.

---

## 5. Spell Selection Step in Character Creation

**What:** Add a 4th step to the `CreateModal` flow: "Spells". This step only appears for spellcasting classes (Wizard, Sorcerer, Bard, Cleric, Druid, Warlock, Paladin, Ranger). The player picks cantrips and known spells from the class spell list, up to the class-defined limit for their level.

**Conditions of success:**
- [ ] The step indicator shows 4 steps for caster classes, 3 for non-casters.
- [ ] The Spells step shows a searchable list of available cantrips and spells for the selected class.
- [ ] The player can select up to the class-defined cantrip count and known spell count for their level.
- [ ] Already-selected spells are visually marked; selecting again deselects.
- [ ] The created character's `spellIds` contains the selected spell IDs.
- [ ] Non-caster classes (Fighter, Rogue, Barbarian, Monk at level 1–2) skip this step entirely.

---

## 6. Concentration Tracker

**What:** Track which spell the character is concentrating on. Show a visible concentration badge on the active spell and a one-click "drop concentration" action.

**Conditions of success:**
- [ ] In the Known Spells panel, concentration spells have a "C" badge indicator.
- [ ] Clicking a concentration spell while no concentration is active sets `character.concentrationSpellId` to that spell.
- [ ] The active concentration spell is highlighted in the spell list.
- [ ] A "Drop Concentration" button appears in the vitals or spell section when `concentrationSpellId` is set.
- [ ] Clicking "Drop Concentration" sets `concentrationSpellId` to `undefined` and persists.
- [ ] Concentration state persists to disk.

---

## 7. Domain Rules Layer (`src/domain/rules`)

**What:** Extract and expand game logic into a framework-agnostic `src/renderer/src/domain/rules/` module. Pure functions only — no React imports, no store access.

Minimum functions to implement:
- `computeAttackBonus(character, weapon)` → number
- `computeSpellSaveDC(character)` → number
- `computeSpellAttackBonus(character)` → number
- `getAvailableActions(character)` → `ActionDef[]` (class + level aware)
- `getResourceDefaults(classId, level)` → `Record<string, { used: number; total: number }>`

**Conditions of success:**
- [ ] All functions live under `src/renderer/src/domain/rules/` with no React or Zustand imports.
- [ ] `computeSpellSaveDC` returns `8 + profBonus + spellcastingMod` based on class spellcasting ability.
- [ ] `computeAttackBonus` for a weapon returns `abilityMod + profBonus + weapon.atkBonus`.
- [ ] Weapon rows in the Attacks section display the computed attack bonus instead of the raw stored value.
- [ ] `getAvailableActions` filters the static action list and appends class-specific actions (see item #8).

---

## 8. Class-Contextual Actions

**What:** The Actions panel should show only actions available to the character given their class, level, and current resource state. Class-specific actions (Action Surge, Cunning Action, Ki abilities, etc.) should appear and show resource cost.

**Conditions of success:**
- [ ] A Fighter at level 2+ sees "Action Surge" in the Bonus Actions section (costs 1 use of the Action Surge resource).
- [ ] A Rogue at level 2+ sees "Cunning Action" (Dash/Disengage/Hide as Bonus Action).
- [ ] A Monk at level 2+ sees "Flurry of Blows", "Patient Defense", "Step of the Wind" with Ki cost displayed.
- [ ] An action that requires a depleted resource is visually grayed out.
- [ ] Generic actions (Attack, Dodge, Help, etc.) are shown for all characters.
- [ ] Class-specific actions are derived from `getAvailableActions` in the domain rules layer (item #7).

---

## 9. XP Tracker and Level-Up Prompt

**What:** Display the character's current XP and the XP threshold for the next level. Allow inline editing of XP. When XP reaches the threshold, show a "Level Up" prompt.

**Conditions of success:**
- [ ] XP is displayed in the topbar or identity section as `1200 / 2700 XP`.
- [ ] Clicking XP opens an inline editor to add or set a new value.
- [ ] XP thresholds follow the standard D&D 5e table (300 for level 2, 900 for level 3, … 355000 for level 20).
- [ ] When XP ≥ threshold, a "Level Up" badge or button appears.
- [ ] Clicking "Level Up" increments `character.level`, recalculates `proficiencyBonus` and `hitPoints.max`, and persists.
- [ ] Leveling up does not reset current HP or used resources.

---

## Notes

- Items 1–4 are additive: they touch only existing UI and data fields, no new data files needed.
- Items 5–6 depend on spell data from item 2.
- Items 7–8 are refactors: they improve correctness but require moving logic currently inlined in components.
- Item 9 is self-contained and lowest risk.
