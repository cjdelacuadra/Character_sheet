# Implementation Checklist

Items below are **not yet implemented**. Completed work has been removed.

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

---

## Priority Order

1. Correct Display of Selected Features (Features Panel)
2. Correct Application of Selected Features (Features Panel)
3. Subclass selection when creating a character above unlock level
