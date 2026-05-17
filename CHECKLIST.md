# Implementation Checklist

Each item follows this structure:
- **Goal** — what problem it solves
- **Minimum** — smallest useful implementation
- **Success** — precise observable condition (numeric where possible)
- **Tests** — unit test assertion + step-by-step visual verification

Automated test stubs live in `src/renderer/src/__tests__/checklist.test.ts`.
Run `npm test` to see passing tests (green) and pending items (yellow todo).

---

## Features Panel

### Correct Display of Selected Features
- **Goal**: When a class feature card is clicked in FeaturesPanel, its full description appears in the right detail column with a selection highlight on the card.
- **Minimum**: Selected card gets `.featureCardSel` CSS class (border + tinted background); description, name, and level render in ActionDetailPanel.
- **Success**: Clicking a feature shows it in the right column; clicking it again returns the right column to the empty/default state.
- **Tests**:
  - Unit: `test.todo('selected feature card gets .featureCardSel CSS class')`
  - Visual:
    1. Open any character
    2. Click "Second Wind" in the Features panel
    3. Confirm right column shows "Second Wind · Level 1" and its full description
    4. Click "Second Wind" again → right column returns to empty state

### Correct Application of Selected Features
- **Goal**: Class features that gate actions (Extra Attack, Spellcasting, Cunning Action) appear in the Actions panel at exactly the correct level — not before, not after.
- **Minimum**: `getAvailableActions()` returns level-appropriate entries; Extra Attack feature modifies the Attack action label/count for Fighter ≥ level 5.
- **Success**:
  - Fighter level 4 → no Extra Attack indicator on Attack action
  - Fighter level 5 → Attack action notes multiple attacks
  - Rogue level 1 → no Cunning Action; Rogue level 2 → Cunning Action appears
- **Tests**:
  - Unit (passing): `getAvailableActions(Rogue level 2)` contains `'Cunning Action'`
  - Unit (passing): `getAvailableActions(Rogue level 1)` does not contain `'Cunning Action'`
  - Unit: `test.todo('Fighter level 5+ Attack action indicates multiple attacks (Extra Attack feature)')`
  - Visual:
    1. Create Fighter level 5
    2. Actions panel shows Attack — confirm description or label indicates extra attack
    3. Level down to 4 (or create Fighter level 4) → Attack shows single attack only

---

## Fighter Fighting Style

### Selection
- **Goal**: Fighter characters have a required Fighting Style choice (Archery, Defense, Dueling, Great Weapon Fighting, Protection, Two-Weapon Fighting) at creation (level 1+) and when leveling up to level 1.
- **Minimum**: Dropdown in character creator Equipment step for Fighter; `character.fightingStyle: string` stored on the character; schema migration sets `fightingStyle: undefined` for old characters.
- **Success**: After creating a Fighter, `char.fightingStyle` is a non-null string; non-Fighter characters have `fightingStyle: undefined`.
- **Tests**:
  - Unit: `test.todo('buildCharacter() includes fightingStyle when class is Fighter')`
  - Unit: `test.todo('migration: existing characters without fightingStyle get fightingStyle: undefined')`
  - Visual:
    1. Open character creator, choose Fighter
    2. Proceed to Equipment step → Fighting Style picker appears
    3. Choose "Archery" → create character → confirm fightingStyle is stored (visible in Features panel)
    4. Open character creator, choose Rogue → Equipment step has no Fighting Style picker

### Display
- **Goal**: The chosen Fighting Style is visible in the FeaturesPanel as a feature entry with its full description.
- **Minimum**: FeaturesPanel synthesizes a `FeatureEntry` for `char.fightingStyle` and renders it alongside class features.
- **Success**: Fighter with Fighting Style "Archery" shows "Fighting Style: Archery" entry with description in the Features panel.
- **Tests**:
  - Unit: `test.todo('Fighter with fightingStyle set shows "Fighting Style: <name>" in FeaturesPanel (visual)')`
  - Visual:
    1. Open a Fighter character with Archery style
    2. Features panel shows "Fighting Style: Archery" card
    3. Click the card → right column shows Archery description

### Implementation
- **Goal**: Fighting Style bonuses are reflected in computed stats.
  - **Archery**: +2 to all ranged attack rolls
  - **Defense**: +1 AC while wearing any armor
  - **Dueling**: +2 to damage rolls with a one-handed melee weapon (no off-hand weapon)
  - **Great Weapon Fighting**: reroll 1s/2s on damage dice (display note; no automated reroll)
  - **Protection**: reaction mechanic (display only)
  - **Two-Weapon Fighting**: add ability modifier to off-hand damage roll
- **Minimum**: Archery and Defense implemented in `computeAttackBonus()` and `computeAC()`.
- **Success**:
  - Archery Fighter DEX 14, prof +2, shortbow → attack bonus = +2 (DEX) + 2 (prof) + 2 (Archery) = **+6**
  - Defense Fighter in leather armor → AC = 11 + DEX mod + **1** (vs. 11 + DEX mod without)
- **Tests**:
  - Unit: `test.todo('Archery: computeAttackBonus adds +2 for ranged weapon attacks')`
  - Unit: `test.todo('Defense: computeAC adds +1 when wearing any armor')`
  - Visual:
    1. Create Fighter (Archery), DEX 14, equip shortbow
    2. Attack detail panel shows +6 to hit
    3. Create Fighter (Defense), equip leather armor
    4. AC shown is 1 higher than an identical Fighter without a Fighting Style

---

## Subclass / Archetype

### Selection When Creating a Character Above the Unlock Level
- **Goal**: When creating a character at a level ≥ the subclass unlock level, the subclass selector in Step 1 (Basics) is required before advancing.
- **Minimum**: `subclassRequired` flag already in StepBasics; verify it fires correctly for all classes based on `SUBCLASSES_BY_CLASS[classId][0].unlocksAtLevel`.
- **Success**:
  - Fighter at level 3 → "Ability Scores →" button disabled until subclass chosen
  - Fighter at level 2 → button enabled without subclass (level 3 not reached)
  - Cleric at level 1 → button disabled until domain chosen (unlocks at level 1)
- **Tests**:
  - Unit (passing): `SUBCLASSES_BY_CLASS['Fighter'][0].unlocksAtLevel === 3`
  - Unit (passing): `SUBCLASSES_BY_CLASS['Cleric'][0].unlocksAtLevel === 1`
  - Unit (passing): `SUBCLASSES_BY_CLASS['Wizard'][0].unlocksAtLevel === 2`
  - Unit: `test.todo('StepBasics "Next" disabled for Fighter level 3 with no subclass chosen')`
  - Unit: `test.todo('StepBasics "Next" enabled for Fighter level 2 with no subclass')`
  - Visual:
    1. New Character → Fighter → Level 3 → confirm "Ability Scores →" is greyed out
    2. Select any Fighter subclass → button becomes active
    3. Repeat for Wizard level 2 and Cleric level 1

### Selection When Leveling Up
- **Goal**: When a character reaches the subclass unlock level via level-up, the LevelUpModal shows a subclass picker before confirming the level.
- **Minimum**: LevelUpModal gains a subclass selection step when `newLevel === subclassUnlockLevel && !char.subclass`; `levelUp()` accepts a `subclassChoice` parameter and stores it on the character.
- **Success**: Fighter at level 2 levels up to 3 → LevelUpModal shows subclass picker; after confirming, `char.subclass` is set; leveling from 3→4 does not show the picker again.
- **Tests**:
  - Unit: `test.todo('LevelUpModal shows subclass picker when newLevel === subclassUnlockLevel and char.subclass is unset')`
  - Unit: `test.todo('levelUp() with subclassChoice stores it on character.subclass')`
  - Visual:
    1. Open Fighter level 2 → click Level Up
    2. LevelUpModal shows a subclass picker step
    3. Select "Champion" → confirm → char.subclass = 'Champion'
    4. Level up again (3→4) → no subclass picker appears

### Future Analysis of All Subclasses
- **Goal**: Document which subclass features are mechanically implemented vs. display-only to prioritize future work.
- **Minimum**: A table in `SUBCLASS_AUDIT.md` with columns: Subclass | Features | Status (✅ / 🟡 / ❌).
- **Success**: Every subclass in `subclassData.ts` has at least one row in the audit table.
- **Tests**: N/A — documentation task. Consider adding a unit test that every SubclassDef has a corresponding entry in the audit.

---

## Combat Display

### Off-Hand Attack Display
- **Goal**: A character wielding two light melee weapons sees an "Off-Hand Attack" bonus action in the Actions panel.
- **Minimum**: `getAvailableActions()` checks if `char.weapons` has two weapons both with the `Light` property and no `Heavy` property; if so, appends an `Off-Hand Attack` bonus action using the second weapon's damage die and no ability modifier.
- **Success**: Character with shortsword (Light) + handaxe (Light) → Bonus Actions shows "Off-Hand Attack (Handaxe) · 1d6 slashing"; character with longsword (not Light) → no such entry.
- **Tests**:
  - Unit: `test.todo('getAvailableActions: character with two light melee weapons has Off-Hand Attack bonus action')`
  - Unit: `test.todo('off-hand damage does NOT include ability modifier (without Two-Weapon Fighting style)')`
  - Visual:
    1. Create any character, equip a shortsword and a handaxe
    2. Bonus Actions panel shows "Off-Hand Attack (Handaxe)"
    3. Remove one weapon → "Off-Hand Attack" disappears
    4. Equip longsword (not Light) → "Off-Hand Attack" does not appear

### Reaction: Display of Attacks and Spells
- **Goal**: Feat-based reactions (Sentinel opportunity attack, War Caster spell) appear in the Reactions group of the Actions panel.
- **Minimum**: `getAvailableActions()` checks `char.feats` for `sentinel`, `warCaster`, etc. and appends the corresponding reaction `ActionDef`s.
- **Success**: Character with Sentinel feat → Reactions panel shows "Opportunity Attack (Sentinel)" · description explains the trigger; character without Sentinel → no such entry.
- **Tests**:
  - Unit: `test.todo('getAvailableActions: character with Sentinel feat has "Opportunity Attack (Sentinel)" reaction')`
  - Unit: `test.todo('getAvailableActions: character without Sentinel has no Sentinel reaction')`
  - Visual:
    1. Create a character with the Sentinel feat
    2. Reactions section of ActionListPanel shows "Opportunity Attack (Sentinel)"
    3. Click it → right column shows description and trigger condition
    4. Remove feat → entry disappears from Reactions

### Attack Display of Spells
- **Goal**: Attack-roll spells (Fire Bolt, Eldritch Blast) show `+N to hit · XdY type` in ActionDetailPanel, matching the format used for weapon attacks.
- **Minimum**: ActionDetailPanel detects when the selected spell has an attack-roll component and renders `+[computeSpellAttackBonus(char)] to hit · [damage die] [damage type]`.
- **Success**: Wizard INT 18, prof +2, selects "Fire Bolt" → detail pane shows "+6 to hit · 1d10 fire".
- **Tests**:
  - Unit (passing): `computeSpellAttackBonus(Wizard INT 18 level 1) === 6`
  - Unit (passing): `computeSpellAttackBonus(Warlock CHA 16 level 5) === 6`
  - Unit: `test.todo('ActionDetailPanel shows "+N to hit · XdY type" for attack-roll cantrips (visual)')`
  - Visual:
    1. Open Wizard INT 18 level 1
    2. Click "Cast a Spell" → select "Fire Bolt"
    3. Right column shows "+6 to hit · 1d10 fire"

---

## UI / UX

### Fix Scrollable UI — First Column
- **Goal**: The left column (VitalsPanel + ConditionsPanel + AbilitiesPanel + FeaturesPanel) scrolls independently; no content is clipped at any viewport height.
- **Minimum**: `.leftCol` in `CharacterView.module.css` already has `overflow-y: auto`; confirm the column is height-constrained to the viewport (add `height: calc(100vh - [header height])` or equivalent so it doesn't grow beyond the screen).
- **Success**: At a 768px-tall window, all left-column content is reachable by scrolling; center and right columns are unaffected.
- **Tests**:
  - Unit: `test.todo('leftCol scrolls independently at 768px viewport height without clipping FeaturesPanel (visual)')`
  - Visual:
    1. Open the app, resize window to ~768px tall
    2. Left column is scrollable — FeaturesPanel visible by scrolling down
    3. Center and right columns remain in their original positions while left column scrolls

### Equipment Slot Layout in Header
- **Goal**: The right side of the character sheet header shows a paperdoll equipment layout (head, torso, legs, feet, hands, main-hand, off-hand, ring, neck slots) where currently equipped items appear in their positions.
- **Minimum**: A static `EquipmentLayout` component renders the slot grid; each slot displays the equipped item name/icon or an empty placeholder. No drag-and-drop required.
- **Success**: Header right side shows the slot grid; equipped armor appears in the torso slot; off-hand weapon/shield appears in the off-hand slot; empty slots show a greyed placeholder.
- **Tests**:
  - Unit: `test.todo('EquipmentLayout renders correct number of equipment slots (visual)')`
  - Visual:
    1. Open any character with armor and a weapon equipped
    2. Header right side shows equipment slot grid
    3. Equipped items appear in their matching slots; unequipped slots show empty state

### Fix Ability Score Selection — Equal Values Block Each Other
- **Goal**: In the ability score assignment step, two score options with the same numeric value must be independently selectable; choosing one does not disable or consume the other.
- **Minimum**: Score selection logic tracks assignment by index (unique position in the score pool), not by value; equal-valued scores are treated as distinct items.
- **Success**: If the score pool contains two "10"s, assigning one to STR leaves the other "10" available for CON; both can be assigned without conflict.
- **Tests**:
  - Unit: `test.todo('two equal-value scores in pool are independently assignable')`
  - Visual:
    1. In ability score step, arrange a pool with two identical values (e.g. two 10s)
    2. Assign one 10 to STR → the second 10 remains selectable
    3. Assign second 10 to CON → both assignments coexist without error

### Feat ASI Display Adjacent to Ability Score
- **Goal**: When a feat grants +1 (or +2) to a specific ability score, AbilitiesPanel shows the bonus inline with that score row — not only in the feat description.
- **Minimum**: AbilitiesPanel reads `char.feats` for feats with a known ASI effect and appends a `+1 (Feat)` badge next to the affected score.
- **Success**: Character with Resilient (CON) shows `+1 (Resilient)` next to the CON value in AbilitiesPanel; a character without that feat shows no such badge.
- **Tests**:
  - Unit: `test.todo('AbilitiesPanel shows ASI badge for feats that grant +1 to a specific score')`
  - Visual:
    1. Create a character and take the Resilient (CON) feat
    2. AbilitiesPanel shows "+1 (Resilient)" next to CON
    3. Remove the feat → badge disappears

### Hide Scrollbars (Keep Scrollable)
- **Goal**: All scrollable containers look clean — no visible scrollbar track or thumb — while remaining fully scrollable via mouse wheel, trackpad, or touch. Applies to every column and modal list in the app.
- **Minimum**: Add a global CSS rule (or a `.scrollable` utility class applied to all `overflow-y: auto` containers) using `scrollbar-width: none` (Firefox) and `::-webkit-scrollbar { display: none }` (Chromium/Electron). Content must still scroll.
- **Success**: No scrollbar is visible in any column or modal list; scrolling via wheel/trackpad still works normally; no layout shift occurs from the scrollbar gutter disappearing.
- **Tests**:
  - Unit: `test.todo('scrollable containers have scrollbar-width: none applied (visual)')`
  - Visual:
    1. Open any character with enough content to overflow (e.g., a Wizard with many spells)
    2. No scrollbar thumb or track is visible in any column
    3. Scrolling with mouse wheel / trackpad works in every column and modal list
    4. Toggling light/dark mode does not make scrollbars reappear

---

## Spells

### Level-Up Spell Selector
- **Goal**: When a spellcaster levels up, the spell selection step in LevelUpModal offers only the *delta* — new spells to learn at this level — not the full known list, and only includes spells at or below the newly available slot level.
- **Minimum**: Compute `spellsToAdd = newTableCount - oldTableCount`; filter available spells to slot levels unlocked at `newLevel`.
- **Success**:
  - Wizard 1→2: picks exactly 2 new spells (both 1st-level); no 2nd-level spells shown
  - Wizard 2→3: picks exactly 2 new spells; 2nd-level spells now available in the list
  - Sorcerer 1→2: picks exactly 1 new spell
- **Tests**:
  - Unit: `test.todo('Wizard leveling 1→2: spell step offers exactly 2 new spells (delta, not cumulative)')`
  - Unit: `test.todo('Wizard leveling 2→3: spell step includes 2nd-level spells not shown at level 2')`
  - Visual:
    1. Create Wizard level 1, take one spell
    2. Level up to 2 → LevelUpModal spell step shows "Pick 2 spells"; only 1st-level spells visible
    3. Confirm → level up to 3 → modal shows "Pick 2 spells"; 2nd-level spells now appear in the list

### Spell List Filtering
- **Goal**: Any UI that lets a player select spells — level-up picker or Wizard spellbook — must show only (a) spells belonging to the character's class and (b) spells at or below the highest slot level available at the character's current level. Cantrips (level 0) are always included.
- **Minimum**: A `getSelectableSpells(classId, maxSlotLevel)` utility that filters `SPELLS` by class tag and spell level; used by both LevelUpModal and the Wizard "Add to Spellbook" flow.
- **Success**:
  - `getSelectableSpells('Wizard', 1)` returns only Wizard spells of level 0 and 1 — no Cleric, Warlock, or higher-level spells
  - `getSelectableSpells('Cleric', 2)` includes level-0, -1, and -2 Cleric spells; no Wizard/Druid spells
  - Spell picker for a Wizard at level 1 shows no Fireball (level 3), no Cure Wounds (Cleric)
- **Tests**:
  - Unit: `test.todo('getSelectableSpells: returns only spells tagged for the given class')`
  - Unit: `test.todo('getSelectableSpells: excludes spells above maxSlotLevel')`
  - Unit: `test.todo('getSelectableSpells: always includes cantrips (level 0) regardless of maxSlotLevel')`
  - Visual:
    1. Level a Wizard 1→2 → spell picker lists only Wizard spells at level 0–1
    2. Level a Cleric 2→3 → picker lists only Cleric spells at level 0–2; Fireball absent
    3. Wizard "Add to Spellbook" flow also respects class filter (no cross-class spells)

### Wizard: Learn Spells from Spellbook
- **Goal**: Wizards can copy spells into their spellbook at any time, not only on level-up. The spell list respects the Spell List Filtering rules (Wizard spells only; any level, since Wizards can learn spells above their current slot cap).
- **Minimum**: An "Add to Spellbook" button in the character sheet (ActionDetailPanel or FeaturesPanel) that opens the Wizard spell list filtered to Wizard class only (no slot-level cap for spellbook copying). Appends the chosen spell to `character.spellIds`. No gold cost enforced (DM discretion).
- **Success**:
  - Wizard opens "Add to Spellbook", selects Fireball; Fireball appears in the Cast a Spell list
  - Only Wizard spells appear in the picker — no Cleric, Sorcerer, or other class spells
  - A spell already in `spellIds` is greyed out or hidden so it can't be added twice
- **Tests**:
  - Unit: `test.todo('Adding a spell via the spellbook flow appends it to character.spellIds immediately')`
  - Unit: `test.todo('Wizard spellbook picker shows only Wizard-tagged spells')`
  - Unit: `test.todo('Wizard spellbook picker hides spells already in character.spellIds')`
  - Visual:
    1. Open Wizard character
    2. Find "Add to Spellbook" affordance (button or menu)
    3. Confirm only Wizard spells are listed; no Cure Wounds, no Eldritch Blast
    4. Select "Fireball" → confirm → "Cast a Spell" list now includes Fireball
    5. Open picker again → Fireball is no longer selectable

### Caster Classes: Prepared Spells
- **Goal**: Prepared-spell classes (Cleric, Druid, Paladin, Wizard) can mark which spells are currently prepared; only prepared spells appear in the cast list.
- **Minimum**: `computePreparedSpellCount(classId, level, abilityScore)` returns the cap; a "Prepare Spells" UI section shows all known spells as toggleable with the cap enforced; `char.preparedSpellIds` drives the cast list for prepared casters.
  - Formula: `level + abilityMod` for Cleric/Druid/Wizard; `floor(level/2) + abilityMod` for Paladin; minimum 1.
- **Success**:
  - Cleric level 5 WIS 16 → cap = **8** (5 + mod 3); after toggling 8 spells, remaining are disabled
  - Wizard level 5 INT 18 → cap = **9** (5 + mod 4)
  - Paladin level 5 CHA 14 → cap = **4** (⌊5/2⌋ + mod 2)
  - Sorcerer (known-spell class) → no prepare step; all known spells are always castable
- **Tests**:
  - Unit: `test.todo('computePreparedSpellCount: Cleric level 5 WIS 16 → 8')`
  - Unit: `test.todo('computePreparedSpellCount: Wizard level 5 INT 18 → 9')`
  - Unit: `test.todo('computePreparedSpellCount: Paladin level 5 CHA 14 → 4')`
  - Unit: `test.todo('minimum prepared spells is 1 even when formula gives 0 or negative')`
  - Visual:
    1. Open Cleric WIS 16 level 5
    2. "Prepare Spells" section shows cap "4 / 8 prepared"
    3. Toggle 8 spells on → all other toggle buttons are disabled
    4. Cast a Spell action → only the 8 prepared spells appear in the list
    5. Open Sorcerer of same level → no prepare section; all known spells are in the cast list

---

## Weapons / Equipment

### Separation of Melee and Ranged Weapons at Creation
- **Goal**: Character creation weapon picker is split into melee and ranged categories; the player must choose at least one of each before advancing.
- **Minimum**: StepEquipment (or equivalent) renders two groups (Melee / Ranged); "Next" is disabled unless at least one weapon from each group is selected.
- **Success**: Attempting to proceed without a ranged weapon (or without a melee weapon) keeps "Next" disabled; selecting one of each enables it.
- **Tests**:
  - Unit: `test.todo('StepEquipment "Next" disabled when no ranged weapon selected')`
  - Unit: `test.todo('StepEquipment "Next" disabled when no melee weapon selected')`
  - Visual:
    1. Open character creator → proceed to Equipment step
    2. Select only a shortsword → "Next" remains disabled
    3. Also select a shortbow → "Next" becomes active

### Remove Shields from Armor; Add to Off-Hand Selection
- **Goal**: Shields are not armor types — remove them from the armor picker and surface them in the off-hand selector instead; `computeAC()` adds +2 when a shield occupies the off-hand slot.
- **Minimum**: Remove shield entries from `armorData`; add Shield options to the off-hand selector; update `computeAC()` to detect `char.offHand === 'shield'` and add 2.
- **Success**: Armor picker contains no shield entries; off-hand picker lists Shield; a character with a shield in the off-hand slot shows AC +2 compared to the same character without one.
- **Tests**:
  - Unit: `test.todo('computeAC: off-hand shield adds +2 to AC')`
  - Unit: `test.todo('armorData contains no shield entries')`
  - Visual:
    1. Open character creator → Equipment → confirm armor dropdown has no shield
    2. Open off-hand selector → Shield option is present
    3. Equip shield in off-hand → AC display increases by 2

---

## Tasha's Cauldron of Everything

### Feats
- **Goal**: The 14 feats introduced in *Tasha's Cauldron of Everything* (Artificer Initiate, Chef, Crusher, Eldritch Adept, Fey Touched, Fighting Initiate, Gunner, Metamagic Adept, Piercer, Poisoner, Shadow Touched, Slasher, Telekinetic, Telepathic) are available in the feat picker.
- **Minimum**: Add TCoE feat definitions to `featsData.ts`; they appear in the feat selector during character creation and level-up.
- **Success**: All 14 TCoE feats appear in the feat picker; selecting each stores the feat name on the character.
- **Tests**:
  - Unit: `test.todo('featsData contains all 14 TCoE feats')`
  - Visual:
    1. Open feat picker during character creation
    2. Scroll/search for "Fey Touched" → it appears
    3. Select "Crusher" → character sheet reflects the feat

### Spells
- **Goal**: Spells from *Tasha's Cauldron of Everything* (e.g. Booming Blade, Green-Flame Blade, Intellect Fortress, Mind Sliver, Summon Beast, Tasha's Caustic Brew) are added to the appropriate class spell lists.
- **Minimum**: Add TCoE spell definitions to `spellsData.ts` with correct class tags and spell levels; they appear in the spell picker for the matching class.
- **Success**: Booming Blade appears for Wizard/Sorcerer/Warlock; Mind Sliver appears for Wizard/Sorcerer/Warlock; class filters exclude TCoE spells from classes that don't have them.
- **Tests**:
  - Unit: `test.todo('TCoE spells appear for the correct class tags')`
  - Unit: `test.todo('Booming Blade is tagged for Wizard, Sorcerer, and Warlock')`
  - Visual:
    1. Open Wizard spell picker → search "Booming Blade" → it appears
    2. Open Cleric spell picker → "Booming Blade" is absent

### Subclasses
- **Goal**: Subclasses introduced in *Tasha's Cauldron of Everything* are available in the subclass picker for each applicable class (e.g. Barbarian: Beast / Wild Magic; Bard: College of Creation / Eloquence; Fighter: Psi Warrior / Rune Knight; Ranger: Fey Wanderer / Swarmkeeper; Rogue: Phantom / Soulknife; Wizard: Bladesinging / Order of Scribes).
- **Minimum**: Add TCoE subclass definitions to `subclassData.ts` linked to their parent class; they appear in the subclass picker.
- **Success**: Selecting Psi Warrior as Fighter subclass is possible; its unlock level matches the Fighter subclass unlock (level 3).
- **Tests**:
  - Unit: `test.todo('subclassData contains TCoE subclasses for all applicable classes')`
  - Visual:
    1. Create a Fighter → reach subclass step → Psi Warrior and Rune Knight appear
    2. Create a Bard → College of Eloquence appears in subclass picker

---

## Subclass Features

### Battle Master Maneuvers as Expandable List on Weapon Selection
- **Goal**: When a Battle Master Fighter selects a weapon, an expandable accordion in the Actions panel lists all available combat maneuvers. Other subclass-specific combat options appear adjacent to the weapon section.
- **Minimum**: ActionDetailPanel (or weapon selection panel) gains a collapsible "Maneuvers" section that reads `char.battleMasterManeuvers`; renders name + short description for each.
- **Success**: Battle Master with a longsword equipped sees a collapsed "Maneuvers ▶" section; expanding it shows e.g. Precision Attack, Riposte, Trip Attack with descriptions.
- **Tests**:
  - Unit: `test.todo('Battle Master weapon panel renders a maneuvers accordion')`
  - Visual:
    1. Create Battle Master Fighter, equip a weapon
    2. Combat Actions panel shows a collapsed "Maneuvers" section
    3. Expand it → individual maneuvers listed with descriptions

### Arcane Archer: Infused Arrows (Arcane Shots)
- **Goal**: Arcane Archer Fighters can select Arcane Shot options (Banishing, Beguiling, Bursting, Enfeebling, Grasping, Piercing, Seeking, Shadow Arrow) and track their 2/short-rest usage.
- **Minimum**: Add Arcane Shot definitions; display available shots in the Actions panel for Arcane Archer subclass; show a usage counter (e.g. "2 / 2 charges").
- **Success**: Arcane Archer sees Arcane Shot options in the Combat Actions panel with a 2-charge tracker; non-Arcane Archer Fighters do not see these actions.
- **Tests**:
  - Unit: `test.todo('Arcane Archer actions list includes Arcane Shot options')`
  - Unit: `test.todo('non-Arcane Archer Fighter actions list excludes Arcane Shots')`
  - Visual:
    1. Create Arcane Archer Fighter
    2. Combat Actions shows "Arcane Shot (2/2)" section with individual shot options
    3. Create Champion Fighter → no Arcane Shot section

### Fighter: Indomitable / Samurai: Fighting Spirit
- **Goal**: The Fighter's *Indomitable* feature (reroll a failed saving throw, available at level 9/13/17) and the Samurai subclass's *Fighting Spirit* (bonus action advantage on attacks, 3/long rest from level 3) are tracked in the Features panel and Actions panel.
- **Minimum**: Add Indomitable to the Fighter feature table unlocking at level 9; add Fighting Spirit to Samurai subclass features; both display in FeaturesPanel with a usage counter for Fighting Spirit.
- **Success**: Fighter level 9 sees "Indomitable (1/long rest)" in Features; Samurai level 3 sees "Fighting Spirit (3/long rest)" in Features and as a Bonus Action in Combat Actions.
- **Tests**:
  - Unit: `test.todo('Fighter level 9 has Indomitable feature')`
  - Unit: `test.todo('Samurai level 3 has Fighting Spirit feature')`
  - Visual:
    1. Create Fighter level 9 → Features panel shows Indomitable
    2. Create Samurai Fighter level 3 → Features shows Fighting Spirit; Bonus Actions include Fighting Spirit

---

## Priority Order

1. ✅ Fix scrollable UI — first column (quick win, unblocks usability)
2. ✅ Hide scrollbars (keep scrollable) — pure CSS, global win
3. ✅ Fighter Fighting Style — selection + display
4. ✅ Fighter Fighting Style — Archery & Defense implementation (attack/AC bonuses)
5. ✅ Subclass selection on level-up
6. ✅ Off-hand attack display
7. ✅ Level-up spell selector correctness + spell list filtering (class + level gate)
8. ✅ Wizard learn spells (also uses spell list filtering)
9. ✅ Caster prepared spells
10. ✅ Attack display of spells (polish)
11. ✅ Reaction display from feats (polish)
12. Subclass feature audit (documentation prerequisite for deeper subclass work)
13. ✅ Fix ability score selection — equal values block each other (bug, quick fix)
14. Remove shields from armor → off-hand (data refactor, correctness)
15. ✅ Separation of melee/ranged weapons at creation (UX, creation flow)
16. ✅ Feat ASI display in AbilitiesPanel (polish, readability)
17. ✅ Equipment slot layout in header (visual feature)
18. ✅ Battle Master maneuvers expandable list (subclass UX)
19. Fighter: Indomitable ✅ + Samurai: Fighting Spirit (class/subclass features)
20. ✅ Arcane Archer infused arrows / Arcane Shots (subclass feature)
21. ✅ Tasha's Feats (content expansion)
22. ✅ Tasha's Spells (content expansion)
23. ✅ Tasha's Subclasses (content expansion)
24. Versatile weapon two-handed damage display
25. Barbarian Rage active — show resistance, advantage, and damage bonus in conditions
26. ✅ Prepared spells count in class Features panel
