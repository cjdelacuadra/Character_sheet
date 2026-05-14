# DnD Character Companion — Version 2 System Design Blueprint

> **Status:** Implementation-Ready Design Document
> **Source:** `FUNCTIONAL_DOCUMENTATION.md` (V1 analysis)
> **Scope:** Full redesign — architecture, features, UX, data model, and migration strategy

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Extracted Functionalities](#2-extracted-functionalities)
3. [Feature Rationalization](#3-feature-rationalization)
4. [V2 Functional Design](#4-v2-functional-design)
5. [Architecture Blueprint](#5-architecture-blueprint)
6. [UX/UI Redesign](#6-uxui-redesign)
7. [Data Model V2](#7-data-model-v2)
8. [Technical Improvements](#8-technical-improvements)
9. [Migration Strategy](#9-migration-strategy)
10. [Implementation Guidelines](#10-implementation-guidelines)

---

## 1. Executive Summary

### 1.1 V1 State Assessment

V1 delivered a functionally complete D&D 5e character sheet covering the full character lifecycle: creation, combat tracking, leveling, and resting. The rules engine is solid and the SRD data coverage is broad. However, the application has significant structural debt:

- **`CharacterView.tsx`** is a monolithic 1,000+ line component hosting the entire game screen, making every feature change high-risk.
- **`store.ts`** conflates IPC communication, game logic, schema migration, and state mutation in a single file.
- **Two features are entirely missing** at the point of most user need: spell selection on level-up and a spellbook management panel.
- **Spell data is incomplete** — levels 6–9 are absent, cutting off high-level play.
- **No undo, no export, no validation** on core gameplay inputs.

### 1.2 V2 Goals

| Goal | Outcome |
|------|---------|
| Modular, feature-sliced codebase | Each panel is independently testable and changeable |
| Complete the missing features | Spell selection on level-up, spellbook, levels 6–9 spells |
| Introduce command pattern | All HP/slot/resource mutations are undoable |
| Improve UX with dice roller + export | Players have a complete in-app session toolkit |
| Establish a design system | Shared primitives eliminate CSS duplication |
| Zod validation on all inputs | No invalid state can enter the character model |
| Full unit test coverage on domain logic | Rules engine is regression-proof |

### 1.3 Technology Stack (Retained + Additions)

| Layer | V1 | V2 |
|-------|----|----|
| Shell | Electron 34 | Electron 34 (retain) |
| UI | React 19 + Vite | React 19 + Vite (retain) |
| Language | TypeScript 6 | TypeScript 6 (retain) |
| State | Zustand 5 | Zustand 5 — split into slices |
| Validation | Zod 4 (partial) | Zod 4 — full schema coverage |
| Testing | None | Vitest + React Testing Library |
| Component dev | None | Storybook |
| CSS | Module CSS (duplicated) | Module CSS + shared design tokens |
| IPC | Inline in store | Dedicated IPC service layer |

---

## 2. Extracted Functionalities

All features extracted from V1, grouped into logical modules.

### Module A — Character Management
- A1: Character selection screen (list, create, delete)
- A2: 4-step creation wizard (Basics → Scores → Equipment → Spells)
- A3: Ability score assignment (Standard Array, Point Buy, Roll 4d6)
- A4: Race & class selection with subclass support
- A5: Background selection (grants skill proficiencies)
- A6: Disk persistence via Electron IPC (save/load/list/delete)
- A7: Schema migration on load (legacy field normalization)

### Module B — Character Identity & Header
- B1: 2×4 identity grid (name, class, level, race, alignment, background, player name)
- B2: XP inline editor with level-up threshold detection
- B3: Inspiration pip counter (0–3)
- B4: Back-to-select navigation
- B5: Rest panel trigger button

### Module C — Combat Vitals
- C1: HP tracking (current, max, temp) with inline editing
- C2: HP delta buttons (±1, ±5, ±10)
- C3: HP progress bar with color thresholds (green/orange/red)
- C4: Temp HP setter (direct set, not additive)
- C5: Death saving throws panel (conditional on HP ≤ 0)
- C6: Stabilization logic (3 successes → HP 1)
- C7: AC display with inline armor picker
- C8: STR requirement warning on armor
- C9: Initiative display (editable)
- C10: Speed display (editable)
- C11: Proficiency bonus, Spell Save DC, Spell Attack bonus display

### Module D — Ability Scores & Derived Stats
- D1: Six ability score blocks with inline editing
- D2: Ability modifier calculation (`floor((score-10)/2)`)
- D3: Live recalculation of all derived stats on score edit
- D4: 18 skills with proficiency/expertise toggle
- D5: Saving throws with proficiency toggle
- D6: Passive Perception display

### Module E — Weapons & Attacks
- E1: Weapon table with computed attack bonus
- E2: Attack bonus logic (Finesse, Ranged, Melee, Proficiency, Enchantment)
- E3: Weapon proficiency check (class + race profs merged)
- E4: Magic weapon enchantment (+1/+2/+3)
- E5: Custom weapon form (name, atk bonus, damage, damage type)
- E6: Delete weapon

### Module F — Actions
- F1: Action tabs (Action / Bonus Action / Reaction / Class Abilities)
- F2: Generic actions (always available)
- F3: Class-filtered actions by level
- F4: Resource-depleted action grayout
- F5: Special attack sub-items (Sneak Attack, Divine Smite, etc.)
- F6: Action detail pane (description + resource + attack cards) — PARTIAL in V1

### Module G — Spells
- G1: Spell list with search filter
- G2: Spell slot pip tracker (levels 1–9)
- G3: Spell card modal (full details)
- G4: Concentration tracking (one active spell, banner)
- G5: Slot recovery on rest (Warlock: short; all others: long)
- G6: Spell selection at character creation (cantrips + known/prepared)
- G7: Spell selection on level-up — MISSING in V1
- G8: Spellbook management panel (post-creation) — MISSING in V1
- G9: Spell data levels 6–9 — MISSING in V1

### Module H — Resources
- H1: Class-specific resource pip trackers
- H2: Resource total scaling (by level, ability mod, or fixed)
- H3: Short rest resource recovery
- H4: Long rest resource recovery
- H5: Recovery type badge (SR / LR)

### Module I — Rest
- I1: Short rest panel (Hit Dice roller, heal preview, confirm)
- I2: Long rest panel (full reset info + confirm)
- I3: Hit Dice tracking (`hitDiceUsed`)
- I4: Half Hit Dice recovery on long rest

### Module J — Progression
- J1: XP threshold detection per level (SRD standard)
- J2: Level-up trigger (pulsing button)
- J3: ASI/Feat modal (Double / Split / Feat modes)
- J4: Feat effects application (Tough, Alert, Mobile)
- J5: HP/spell slot/resource recalculation on level-up
- J6: Features list (class + race, expandable, level-filtered)

### Module K — Conditions
- K1: 15 condition toggles (pill tags)
- K2: Condition picker grid (add/remove)
- K3: Long rest condition clear (Exhaustion persists)

---

## 3. Feature Rationalization

### 3.1 Core Features (Must-Have for V2)

These are non-negotiable — the application is incomplete without them.

| ID | Feature | Rationale |
|----|---------|-----------|
| A1–A7 | Character management & persistence | Foundation of the app |
| B1–B5 | Character header | Primary identity surface |
| C1–C11 | Combat vitals | Core gameplay loop |
| D1–D6 | Ability scores & skills | Foundational stat block |
| E1–E6 | Weapons & attacks | Core combat |
| F1–F6 | Actions panel | Combat utility |
| G1–G6 | Spells (existing) | Half the classes need it |
| **G7** | **Spell selection on level-up** | **Missing; breaks caster progression** |
| **G8** | **Spellbook management panel** | **Missing; blocks spell management** |
| **G9** | **Spell data levels 6–9** | **Missing; blocks high-level play** |
| H1–H5 | Resources | Class identity |
| I1–I4 | Rest | Session lifecycle |
| J1–J6 | Progression | Campaign lifecycle |
| K1–K3 | Conditions | Combat state |

### 3.2 Supporting Features (High Value, V2 Target)

Features that improve the experience but don't block core functionality.

| ID | Feature | Notes |
|----|---------|-------|
| P1 | Dice roller overlay | Eliminates need for external dice app |
| P2 | Character export (JSON) | Data portability |
| P3 | Character export (PDF) | Shareable paper-equivalent |
| P4 | Prepared spell tracking | Required for Cleric/Druid/Wizard accuracy |
| P5 | Concentration save DC reminder | Rules accuracy on damage-while-concentrating |
| P6 | Spell slot upcasting tracker | Players need to declare upcast level |
| P7 | Notes/journal panel | Session notes per character |
| P8 | Undo stack for HP/slot changes | Accidental misclick recovery |
| P9 | Ability score input validation | Prevent invalid state (must be 1–30) |

### 3.3 Proposed New Features (V2 Innovation)

Features not present in V1, clearly marked as new proposals.

| ID | Feature | Priority |
|----|---------|----------|
| N1 | Initiative / turn order tracker | Medium |
| N2 | Homebrew content (custom races/classes/spells) | Medium |
| N3 | Character import (JSON) | High (pairs with P2) |
| N4 | Multi-class support | Medium |
| N5 | DM mode (read-only view of player characters) | Low |

### 3.4 Deprecated / Refactored Logic

| V1 Item | Action |
|---------|--------|
| `hasShield: boolean` field | Removed — superseded by `shieldId` |
| Migration logic inline in `store.ts` | Moved to `domain/migrations/` module |
| IPC calls inside Zustand store | Moved to `services/ipc.ts` |
| Duplicate proficiency bonus function in `spellSlots.ts` | Removed — use `charCalculations.profBonus` |
| Magic strings for action IDs | Replaced with typed `ActionId` enum |

---

## 4. V2 Functional Design

Each feature redesigned with clear specification.

---

### 4.1 Character Creation Wizard

**Purpose:** Guide users through creating a valid, rules-compliant character in 4 steps.

**V2 Improvements:**
- Step 3 (Equipment) validates armor proficiency before allowing selection (currently silently allows invalid armor)
- Custom starting HP option (for DMs setting HP manually)
- Step progress persists in local state — navigating Back does not reset inputs
- Subclass always shows (greyed out with tooltip if not yet unlocked) instead of hidden
- Spell step shows cantrip/spell counts live as user selects

**Inputs:**
- Step 1: name (string, required, 1–50 chars), playerName (string, optional), alignment (9-value enum), race (RaceId), classId (ClassId), subclassId (SubclassId | null), background (BackgroundId), level (1–20)
- Step 2: method ('standard-array' | 'point-buy' | 'roll'), assignments (Record<AbilityScore, number>)
- Step 3: armorId (string | null), shieldId (string | null), skillIds (string[], class-limited), weaponIds (string[])
- Step 4 (casters): cantripIds (string[], count-limited), spellIds (string[], count-limited)

**Outputs:** `Character` object, validated via Zod `CharacterSchema`, written to disk.

**Edge Cases:**
- Variant Human: requires exactly 2 ability selections for +1 bonus; wizard blocks Next until satisfied
- Point Buy: budget cannot go below 0; each ability constrained to 8–15 range during buy
- Standard Array: all 6 values must be assigned; duplicates not allowed
- Non-caster classes: Step 4 is skipped entirely; wizard has 3 steps
- Half-Elf: CHA always +2 (locked), user picks 2 from remaining 5 for +1 each

**Dependencies:** `classData`, `raceData`, `backgrounds`, `armorData`, `weaponData`, `spellData`, `CharacterSchema` (Zod), `store.addCharacter`

---

### 4.2 HP System (V2)

**Purpose:** Track character health state across damage, healing, temp HP, and death.

**V2 Improvements:**
- Undo stack: last 10 HP mutations stored in session; Ctrl+Z restores previous value
- Input validation: current HP clamped to `[-maxHP, maxHP]` (negative allowed for tracking overdamage, but displayed as 0)
- Temp HP: shows as a separate colored segment on the HP bar (blue stacked on top of green)
- Death saves: clicking success/failure shows animation and confirms "Stabilized!" or "Character has died" banner
- HP delta buttons configurable: default ±1/±5/±10 but user can set custom preset values

**Inputs:** `damage(amount: number)`, `heal(amount: number)`, `setTempHp(amount: number)`, `setCurrentHp(amount: number)`, `toggleDeathSave(type: 'success'|'failure')`

**Outputs:** Updated `hitPoints`, `deathSaves`, event emitted to undo stack

**Edge Cases:**
- Damage with temp HP: `tempDamage = min(damage, tempHP)`, `hpDamage = damage - tempDamage`, temp HP cannot go negative
- Healing at 0 HP: automatically clears death saves, sets `current = min(healAmount, max)`
- 3 successes: sets `current = 1`, clears death saves, shows stabilized banner
- 3 failures: sets `isDead = true` flag, greys out character card in select screen

**Dependencies:** `store/characterSlice`, `undoStack`, `charCalculations.computeMaxHP`

---

### 4.3 Spell Selection on Level-Up (V2 — Was Missing)

**Purpose:** Allow spellcasters to learn new spells when leveling up, as defined by their class.

**V2 Behavior:**
- After level increment, if character is a spellcaster, the level-up flow continues to a `SpellSelectionStep` modal
- Modal shows: how many new cantrips (if any), how many new spells the character learns at this level
- Search and filter by level, school, concentration
- Already-known spells are greyed out and non-selectable
- Confirm: merges new spell IDs into `character.spellIds`

**Class-Specific Rules:**
- **Wizard:** `+2` spells per level (spellbook), can learn spells from scrolls separately
- **Cleric / Druid:** "Prepared casters" — known spell list = all class spells of available levels; instead of selection, unlock higher spell levels
- **Bard / Ranger / Sorcerer:** Fixed spells known count per level table (class data already has this)
- **Warlock:** Fixed spells known per level; also check for new Eldritch Invocations at levels 2, 5, 7, 9, 11, 13, 15, 17

**Inputs:** `character.classId`, `character.level` (new level), current `spellIds`

**Outputs:** Updated `character.spellIds`

**Edge Cases:**
- Cleric/Druid/Paladin: no selection needed — all class spells auto-available at appropriate slot level
- Level-up with no new spells (non-caster): step is skipped entirely
- Replacing a known spell (Bard/Sorcerer): one existing spell can be swapped — shown as "Replace" option alongside new selections

**Dependencies:** `spellData`, `classData.spellsKnownTable`, `SpellSelectionModal` component

---

### 4.4 Spellbook Panel (V2 — Was Missing)

**Purpose:** Provide a dedicated management view for a character's known/prepared spells outside of the creation wizard.

**V2 Behavior:**
- Accessible from a "Spellbook" tab in the center column (alongside Actions tab group)
- Two sub-views based on class type:
  - **Known Spells** (Bard, Ranger, Sorcerer, Warlock): list of currently known spells with option to swap (Bard/Sorcerer on level-up only)
  - **Prepared Spells** (Cleric, Druid, Paladin, Wizard): shows total available spells, current prepared count vs max, toggle to mark spells as prepared for the day
- Search and filter: by level, school, concentration requirement
- Click any spell: opens spell card modal (same as existing)
- "Add Spell" button: opens filtered spell selection (restricted by class + level availability)

**Prepared Spell Rules:**
- Cleric/Druid: `preparedMax = WIS modifier + character level`
- Paladin: `preparedMax = CHA modifier + floor(paladin level / 2)`
- Wizard: `preparedMax = INT modifier + character level`
- Prepared state resets on long rest (user re-marks)

**Inputs:** Character spell IDs, class prepared rules, long rest trigger

**Outputs:** Updated `character.preparedSpellIds`, `character.spellIds` (for add/replace operations)

**Edge Cases:**
- Wizard preparing 0 spells: shows warning "No spells prepared"
- Adding a spell above current slot level: blocked with explanation tooltip
- Concentration filter: useful for players managing concentration choices

**Dependencies:** `spellData`, `classData`, `PreparedSpellTracker` component, `store/characterSlice`

---

### 4.5 Actions Panel (V2 — Full Completion)

**Purpose:** Display all available combat options filtered by class, level, and resource state.

**V2 Improvements over V1:**
- Action Detail Pane fully implemented for all action types:
  - **Attack actions:** shows all weapons with computed attack + damage, each as a clickable card
  - **Resource actions:** shows current resource count, pip toggle inline in the pane
  - **Spell actions:** shows spells available for that action type with slot cost
  - **Free actions:** shows description only
- Actions can be "used" directly from the panel — clicking "Use Action" decrements the relevant resource
- "Quick Reference" mode: collapse to icon-only tab bar for players who know their class

**Inputs:** `character.classId`, `character.level`, `character.resources`, `character.weapons`

**Outputs:** Resource decremented, action marked as used (greyed) until rest

**Edge Cases:**
- Multiple instances of same resource-cost action: UI shows combined resource pool
- Action Surge (Fighter): once used, the action itself disappears until short rest
- Bonus action attack: only visible when character has an action that grants it (e.g., off-hand after two-weapon fighting)

**Dependencies:** `domain/rules/combat.getAvailableActions`, `domain/rules/combat.getSpecialAttacks`, `store/characterSlice`

---

### 4.6 Dice Roller (V2 — Proposed New Feature)

**Purpose:** Provide an in-app dice roller so players never need an external tool during a session.

**V2 Behavior:**
- Accessible via a persistent floating button (bottom-right of CharacterView) or keyboard shortcut (R)
- Overlay panel (not full modal): slides in from right, does not obscure character sheet
- Dice available: d4, d6, d8, d10, d12, d20, d100
- Quick rolls: pre-configured buttons for common rolls (Attack, Skill Check, Saving Throw, Initiative)
- Roll history: last 10 rolls shown with timestamp and result
- Result highlights: natural 20 (gold), natural 1 (red)
- Modifier field: add static bonus to any roll

**Inputs:** `diceType`, `count`, `modifier`

**Outputs:** Roll result displayed, added to roll history

**Edge Cases:**
- Advantage/Disadvantage: rolls 2d20, highlights the one being used
- Roll in short rest panel: auto-fills the HD roll input when dice roller is used while rest panel is open

**Dependencies:** Pure `rollDice(count, sides, modifier)` utility, no store dependency

---

### 4.7 Character Export (V2 — Proposed New Feature)

**Purpose:** Allow players to back up and share characters.

**V2 — JSON Export:**
- Menu item in character card context menu: "Export as JSON"
- Exports full `Character` object + schema version
- Saved to user's Downloads folder via Electron dialog

**V2 — JSON Import:**
- "Import Character" button on select screen
- Reads JSON file, validates via `CharacterSchema` (Zod)
- Runs migration if `schemaVersion` < current
- Adds to characters list, saves to disk

**Edge Cases:**
- Invalid JSON: shows error toast "File is not a valid character"
- Version mismatch: migration runs silently, shows "Character upgraded from V1 format"
- Duplicate name: auto-appends "(imported)" suffix

**Dependencies:** Electron `dialog.showSaveDialog`, `CharacterSchema`, `domain/migrations`

---

## 5. Architecture Blueprint

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Electron Shell                               │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    React Renderer (Vite)                        │ │
│  │                                                                  │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │ │
│  │  │  App Router  │  │  Zustand     │  │  IPC Service Layer    │ │ │
│  │  │  (App.tsx)   │  │  Store       │  │  (services/ipc.ts)    │ │ │
│  │  └──────┬───────┘  │  ├ charSlice │  └──────────┬────────────┘ │ │
│  │         │          │  └ uiSlice   │              │              │ │
│  │  ┌──────▼──────────────────────────────────────────────────┐  │ │
│  │  │                   Feature Modules                        │  │ │
│  │  │  character-select │ vitals │ abilities │ combat │ spells  │  │ │
│  │  │  resources │ conditions │ features-panel │ level-up │ rest │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  │                                                                  │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │                    Shared Layer                           │  │ │
│  │  │  ui/ (design system)  │  hooks/  │  utils/               │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  │                                                                  │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │                    Domain Layer                           │  │ │
│  │  │  rules/ (combat, spells, progression, resources, skills)  │  │ │
│  │  │  migrations/ (versioned schema upgrades)                  │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  │                                                                  │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │                    Data Layer                             │  │ │
│  │  │  entities/ (TypeScript types)  │  data/ (SRD static)     │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Electron Main Process                        │ │
│  │  main/index.ts (window + IPC handlers + file I/O)              │ │
│  │  preload/index.ts (contextBridge — window.ipc)                  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                        Local File System                             │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Full Directory Structure

```
src/
├── electron/
│   ├── main/
│   │   └── index.ts                  IPC host, window, file I/O
│   └── preload/
│       └── index.ts                  contextBridge → window.ipc
│
└── renderer/
    └── src/
        ├── main.tsx                  React entry point
        ├── app/
        │   ├── App.tsx               Route: SelectScreen ↔ CharacterView
        │   ├── global.css            CSS custom properties (design tokens)
        │   └── store/
        │       ├── characterSlice.ts Character CRUD + rest + level-up
        │       ├── uiSlice.ts        Panel open/close, active tabs, undo stack
        │       └── index.ts          Combined Zustand store
        │
        ├── domain/
        │   ├── rules/
        │   │   ├── combat.ts         computeAC, computeAttackBonus, isProficient,
        │   │   │                     getAvailableActions, getSpecialAttacks
        │   │   ├── spells.ts         computeSpellSaveDC, computeSpellAttackBonus,
        │   │   │                     defaultSpellSlots, spellcastingAbility,
        │   │   │                     getSpellsLearnedOnLevelUp, getPreparedMax
        │   │   ├── progression.ts    profBonus, xpForLevel, xpForNextLevel,
        │   │   │                     computeMaxHP, isAsiLevel
        │   │   ├── resources.ts      getResourceDefaults, applyShortRest,
        │   │   │                     applyLongRest
        │   │   └── skills.ts         skillBonus, savingThrowBonus,
        │   │                         passivePerception
        │   ├── migrations/
        │   │   ├── index.ts          migrateCharacter(raw) → Character
        │   │   ├── v1_to_v2.ts       hasShield → shieldId, add schemaVersion
        │   │   └── v2_baseline.ts    addDefaultFields for missing keys
        │   └── validation/
        │       └── CharacterSchema.ts Zod schema for full Character type
        │
        ├── entities/
        │   ├── character/types.ts    Character, AbilityScores, HitPoints, etc.
        │   ├── class/types.ts        ClassDef, ResourceDef, FeatureDef
        │   ├── condition/types.ts    ActiveCondition
        │   ├── spell/types.ts        SpellEntry
        │   └── weapon/types.ts       Weapon, WeaponDef
        │
        ├── data/                     Read-only SRD content
        │   ├── armorData.ts
        │   ├── backgrounds.ts
        │   ├── classData.ts
        │   ├── featsData.ts
        │   ├── raceData.ts
        │   ├── skills.ts
        │   ├── spellData.ts          EXPANDED: levels 0–9
        │   ├── spellSlots.ts
        │   ├── subclassData.ts
        │   ├── weaponData.ts
        │   └── resourceDefaults.ts
        │
        ├── services/
        │   └── ipc.ts                saveCharacter, loadCharacter,
        │                             listCharacters, deleteCharacter,
        │                             exportCharacterJson, importCharacterJson
        │
        ├── features/
        │   ├── character-select/
        │   │   ├── CharacterSelectScreen.tsx
        │   │   ├── CharacterCard.tsx
        │   │   ├── CreateWizard/
        │   │   │   ├── CreateWizard.tsx
        │   │   │   ├── StepBasics.tsx
        │   │   │   ├── StepScores.tsx
        │   │   │   ├── StepEquipment.tsx
        │   │   │   └── StepSpells.tsx
        │   │   └── *.module.css
        │   ├── character-header/
        │   │   ├── CharacterHeader.tsx
        │   │   └── CharacterHeader.module.css
        │   ├── vitals/
        │   │   ├── VitalsPanel.tsx
        │   │   ├── HpDisplay.tsx
        │   │   ├── HpBar.tsx
        │   │   ├── HpDeltaButtons.tsx
        │   │   ├── TempHpEditor.tsx
        │   │   ├── DeathSaves.tsx
        │   │   ├── AcDisplay.tsx
        │   │   ├── ArmorPicker.tsx
        │   │   └── *.module.css
        │   ├── abilities/
        │   │   ├── AbilitiesPanel.tsx
        │   │   ├── AbilityBlock.tsx
        │   │   ├── SavingThrows.tsx
        │   │   ├── SkillsList.tsx
        │   │   └── *.module.css
        │   ├── combat/
        │   │   ├── CombatPanel.tsx
        │   │   ├── ActionTabs.tsx
        │   │   ├── ActionList.tsx
        │   │   ├── ActionRow.tsx
        │   │   ├── ActionDetailPane.tsx
        │   │   ├── WeaponsTable.tsx
        │   │   ├── AddWeaponForm.tsx
        │   │   └── *.module.css
        │   ├── spells/
        │   │   ├── SpellsPanel.tsx
        │   │   ├── SpellbookView.tsx       NEW
        │   │   ├── PreparedSpellsList.tsx  NEW
        │   │   ├── SpellSlotTracker.tsx
        │   │   ├── SpellList.tsx
        │   │   ├── SpellCard.tsx
        │   │   ├── SpellModal.tsx
        │   │   ├── ConcentrationBanner.tsx
        │   │   ├── SpellSelectionModal.tsx NEW (level-up spell pick)
        │   │   └── *.module.css
        │   ├── resources/
        │   │   ├── ResourcesPanel.tsx
        │   │   ├── ResourceRow.tsx
        │   │   └── *.module.css
        │   ├── conditions/
        │   │   ├── ConditionsPanel.tsx
        │   │   ├── ConditionPicker.tsx
        │   │   └── *.module.css
        │   ├── features-panel/
        │   │   ├── FeaturesPanel.tsx
        │   │   ├── FeatureCard.tsx
        │   │   └── *.module.css
        │   ├── level-up/
        │   │   ├── LevelUpModal.tsx
        │   │   ├── AsiStep.tsx
        │   │   ├── FeatStep.tsx
        │   │   ├── SpellSelectionStep.tsx  NEW
        │   │   └── *.module.css
        │   ├── rest/
        │   │   ├── RestPanel.tsx
        │   │   ├── ShortRestTab.tsx
        │   │   ├── LongRestTab.tsx
        │   │   └── *.module.css
        │   ├── dice-roller/             NEW
        │   │   ├── DiceRollerOverlay.tsx
        │   │   ├── DiceButton.tsx
        │   │   ├── RollHistory.tsx
        │   │   └── *.module.css
        │   └── notes/                   NEW
        │       ├── NotesPanel.tsx
        │       └── *.module.css
        │
        └── shared/
            ├── ui/
            │   ├── tokens.css            Design token definitions
            │   ├── Pip.tsx               Reusable pip indicator
            │   ├── StatBlock.tsx         Reusable stat display
            │   ├── InlineEdit.tsx        Click-to-edit number/text
            │   ├── Modal.tsx             Base modal wrapper
            │   ├── Badge.tsx             Level/type badges
            │   ├── SearchInput.tsx       Debounced search field
            │   ├── Tooltip.tsx           Hover tooltip
            │   └── Toast.tsx             Notification toasts
            ├── hooks/
            │   ├── useCharacter.ts       Selector: active character from store
            │   ├── useDerivedStats.ts    Computed: AC, HP max, spell DC, etc.
            │   ├── useUndo.ts            Undo stack management
            │   └── useKeyboard.ts        Global keyboard shortcuts
            └── utils/
                ├── dice.ts              rollDice(count, sides, mod)
                ├── format.ts            formatModifier(n): "+3" / "-1"
                └── ids.ts               generateId(): UUID
```

### 5.3 Data Flow

```
User Interaction
      │
      ▼
Feature Component
  (reads via useCharacter + useDerivedStats)
      │
      ├──► Dispatches Command to store/characterSlice
      │         │
      │         ├──► Domain rule function validates/computes
      │         ├──► Zod schema validates new state
      │         ├──► State updated in Zustand
      │         ├──► Command pushed to undo stack (uiSlice)
      │         └──► services/ipc.saveCharacter called
      │                   │
      │                   └──► Electron IPC → file system write
      │
      └──► useDerivedStats recomputes derived values
               │
               └──► Components re-render with new values
```

### 5.4 Command Pattern (Undo)

Every character mutation goes through a command object:

```typescript
interface CharacterCommand {
  type: string
  characterId: string
  apply: (state: Character) => Character
  undo: (state: Character) => Character
  description: string   // e.g., "Dealt 12 damage"
}

// Example:
const DamageCommand = (amount: number): CharacterCommand => ({
  type: 'DAMAGE',
  characterId,
  apply: (char) => ({
    ...char,
    hitPoints: {
      ...char.hitPoints,
      current: Math.max(0, char.hitPoints.current - amount)
    }
  }),
  undo: (char) => ({
    ...char,
    hitPoints: { ...char.hitPoints, current: previousHp }
  }),
  description: `Dealt ${amount} damage`
})
```

The `uiSlice` maintains a stack of the last 10 commands per character. `Ctrl+Z` calls `undo()` on the top command and pops the stack.

### 5.5 useDerivedStats Hook

Centralized derived stat computation — computed once, passed via React context to all panels:

```typescript
interface DerivedStats {
  abilityModifiers: Record<AbilityScore, number>
  proficiencyBonus: number
  maxHP: number
  armorClass: number
  initiative: number
  speed: number
  spellSaveDC: number | null
  spellAttackBonus: number | null
  skillBonuses: Record<Skill, number>
  savingThrowBonuses: Record<AbilityScore, number>
  passivePerception: number
  attackBonuses: Record<string, number>   // weaponId → computed bonus
}

function useDerivedStats(character: Character): DerivedStats
```

No component computes derived stats independently — they all read from this hook.

---

## 6. UX/UI Redesign

### 6.1 Design System

**Token File** (`shared/ui/tokens.css`):

```css
/* Colors */
--color-bg-base:        #0f1117;
--color-bg-surface:     #1a1d27;
--color-bg-elevated:    #22263a;
--color-bg-hover:       #2a2f47;
--color-border:         #2e3248;
--color-border-focus:   #7c6af7;
--color-text-primary:   #e8eaf0;
--color-text-secondary: #8b90a8;
--color-text-muted:     #555b75;
--color-accent:         #7c6af7;
--color-accent-dim:     #3d3580;
--color-accent-hover:   #9585ff;
--color-danger:         #e05c5c;
--color-success:        #4caf7d;
--color-warning:        #e8a44a;
--color-info:           #4a9eff;
--color-hp-high:        #4caf7d;
--color-hp-mid:         #e8a44a;
--color-hp-low:         #e05c5c;
--color-temp-hp:        #4a9eff;

/* Spacing scale */
--space-1: 4px;   --space-2: 8px;   --space-3: 12px;
--space-4: 16px;  --space-5: 20px;  --space-6: 24px;

/* Typography */
--font-sans:  'Inter', 'Segoe UI', system-ui, sans-serif;
--text-xs:    10px;  --text-sm: 12px;  --text-base: 14px;
--text-lg:    16px;  --text-xl: 20px;  --text-2xl:  24px;
--text-3xl:   30px;  --text-4xl: 36px;

/* Borders */
--radius-sm:  4px;  --radius-md: 8px;  --radius-lg: 12px;  --radius-full: 9999px;

/* Transitions */
--transition-fast:   0.1s ease;
--transition-normal: 0.2s ease;
--transition-slow:   0.3s ease;
```

### 6.2 Screen Structure

#### Screen 1: Character Select Screen

```
┌─────────────────────────────────────────────────────────┐
│  🎲 DnD Character Companion          [+ New Character]  │
│  ─────────────────────────────────────────────────────  │
│  [ Search characters... ]            Sort: [Name ▼]     │
│                                                          │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ Thorin Ironfist  │  │ Elara Moonwhisper│            │
│  │ Fighter 8        │  │ Wizard 12         │            │
│  │ Mountain Dwarf   │  │ High Elf          │            │
│  │ HP 72/72  AC 18  │  │ HP 48/48  AC 13  │            │
│  │ [▶ Open] [🗑]    │  │ [▶ Open] [🗑]    │            │
│  └──────────────────┘  └──────────────────┘            │
│                                                          │
│  [⬆ Import Character]                                   │
└─────────────────────────────────────────────────────────┘
```

**V2 Changes vs V1:**
- Search + sort controls added
- "Import Character" button (JSON)
- Export button on each card (context menu)
- Card shows last-opened timestamp on hover
- Empty state is more prominent with art/flavor text

---

#### Screen 2: Character View (Main Game Screen)

**Three-column layout retained but fully decomposed.**

```
┌────────────────────────────────────────────────────────────────────────┐
│  HEADER: Name | Class Lv | Background | Race | XP [▲Level Up] | [Rest]│
│          Alignment | Player | Inspiration ◉◉◯ | [Spellbook] | [◀ Back]│
├──────────────────┬────────────────────────────┬────────────────────────┤
│  LEFT COLUMN     │  CENTER COLUMN              │  RIGHT COLUMN          │
│                  │                             │                        │
│  AC  Init  Speed │  [Actions][Spellbook][Notes]│  ┌─ Action Detail ──┐ │
│  ⚠ if STR miss  │                             │  │                  │ │
│  ─────────────── │  Action sub-tabs:           │  │  (context panel) │ │
│  Prof  SpDC  SpA │  Action | Bonus | React     │  │                  │ │
│  ─────────────── │  Class Abilities            │  └──────────────────┘ │
│  HP ███████░░░   │                             │                        │
│  72 / 72  +4 THP │  Action list                │  Weapons Table         │
│  [-10][-5][-1]   │  (scrollable)               │  (scrollable)          │
│  [+1] [+5][+10]  │                             │                        │
│  Death Saves     │  ─── OR ───                 │  Features List         │
│  (if HP=0)       │                             │  (expandable)          │
│  ─────────────── │  Spellbook view             │                        │
│  Conditions [+]  │  (if Spellbook tab)         │  Resources Panel       │
│  ─────────────── │                             │                        │
│  Inspiration ◉◉◯ │  ─── OR ───                │  [🎲 Roll]             │
│  ─────────────── │  Notes (if Notes tab)       │  (dice roller button)  │
│  STR  DEX  CON   │                             │                        │
│  (+3) (+1) (+2)  │                             │                        │
│  INT  WIS  CHA   │                             │                        │
│  (-1) (+2) (+3)  │                             │                        │
│  ─────────────── │                             │                        │
│  Saving Throws   │                             │                        │
│  Skills          │                             │                        │
│  Passive Perc.   │                             │                        │
└──────────────────┴────────────────────────────┴────────────────────────┘
```

**V2 Changes vs V1:**
- Center column gains a tab group: **Actions** | **Spellbook** | **Notes**
- Dice roller button (bottom-right) opens overlay
- Header gains "Spellbook" quick-access link for casters
- HP bar shows temp HP as a distinct colored segment
- Undo toast appears bottom-left after any HP/slot change ("Undone: 12 damage — Ctrl+Z")

---

#### Overlay: Dice Roller

```
                        ┌──────────────────┐
                        │  🎲 Dice Roller   │ [×]
                        │ ────────────────  │
                        │  d4  d6  d8  d10  │
                        │  d12  d20  d100   │
                        │                   │
                        │  Count [1▲▼]      │
                        │  Modifier [+0   ] │
                        │  [Roll!]          │
                        │ ────────────────  │
                        │  Results          │
                        │  d20+3 = 18 ✨    │
                        │  d6 = 4           │
                        │  d20 = 1 💀       │
                        └──────────────────┘
```

---

#### Modal: Level-Up Flow (V2)

**Step 1: ASI or Feat** (same as V1)

**Step 2: Spell Selection** (new for casters)

```
┌───────────────────────────────────────────────┐
│  Level Up — New Spells  (Step 2 of 2)          │
│  ─────────────────────────────────────────────│
│  You learn 2 new spells as a Bard Lv 6.        │
│  Choose 2 spells from level 1–3:               │
│                                                 │
│  [Search spells...              ]               │
│  [ ] Hypnotic Pattern (3rd, Conc.)              │
│  [✓] Counterspell (3rd, Reaction)              │
│  [✓] Dispel Magic (3rd)                        │
│  [ ] Fear (3rd, Conc.)                         │
│                                                 │
│  Selected: 2/2  ─────────── [Confirm]          │
└───────────────────────────────────────────────┘
```

---

### 6.3 Key Interaction Changes

| Interaction | V1 Behavior | V2 Behavior |
|-------------|-------------|-------------|
| HP damage | Click button, immediate | Click button → toast with undo option (3s) |
| Spell slot use | Click pip | Click pip → slot darkens; hover shows "Click to restore" |
| Ability score edit | Click → input inline | Click → input with arrows; validates 1–30 on blur |
| Level up | Button → modal | Button → multi-step flow (ASI → Spells if caster) |
| Rest | Button → panel expands | Button → modal overlay (cleaner, less cluttered) |
| Conditions | Add button → grid | Floating badge list; click "+" on character sheet directly |
| Spell search | Single text input | Search + filter chips (Level, School, Concentration) |

### 6.4 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `R` | Open/close dice roller |
| `Ctrl+Z` | Undo last HP/slot/resource change |
| `Escape` | Close any open modal/overlay |
| `L` | Open/close rest panel |
| `1–4` | Switch action tabs (Action/Bonus/Reaction/Class) |
| `S` | Switch center column to Spellbook |
| `N` | Switch center column to Notes |

---

## 7. Data Model V2

### 7.1 Character (V2)

```typescript
interface Character {
  // --- Meta ---
  id: string                                      // UUID v4
  schemaVersion: number                           // NEW: 2 for V2
  createdAt: string                               // NEW: ISO timestamp
  updatedAt: string                               // NEW: ISO timestamp

  // --- Identity ---
  name: string                                    // 1–50 chars
  playerName: string                              // default ""
  alignment: Alignment                            // 9-value enum
  race: RaceId
  classId: ClassId
  subclassId: SubclassId | null                   // RENAMED from subclass
  background: BackgroundId
  level: number                                   // 1–20
  experiencePoints: number                        // ≥ 0

  // --- Core Stats ---
  abilityScores: AbilityScores                    // 1–30 each, Zod validated
  hitPoints: HitPoints
  armorClass: number                              // derived; stored for perf
  speed: number                                   // derived base; override allowed
  initiative: number                              // derived; override allowed
  proficiencyBonus: number                        // derived

  // --- Equipment ---
  equipment: Equipment

  // --- Proficiencies ---
  savingThrowProficiencies: AbilityScore[]
  skillProficiencies: Partial<Record<Skill, ProficiencyLevel>>

  // --- Weapons ---
  weapons: Weapon[]                               // REMOVED ?: now always array

  // --- Spells ---
  spellIds: string[]
  preparedSpellIds: string[]                      // NEW: for preparers
  spellSlots: Record<number, SlotState>
  concentrationSpellId: string | null             // CHANGED ?: to | null

  // --- Conditions ---
  conditionIds: ActiveCondition[]

  // --- Resources ---
  resources: Record<string, ResourceState>

  // --- Progression ---
  deathSaves: DeathSaves
  inspiration: number                             // 0–3
  hitDiceUsed: number
  feats: string[]                                 // REMOVED ?: now always array
  bonusHpPerLevel: number                         // REMOVED ?: default 0

  // --- Session ---
  notes: string                                   // NEW: free-text notes
}
```

### 7.2 Supporting Types (V2)

```typescript
// Enums (replace magic strings)
type Alignment =
  | 'lawful-good' | 'neutral-good' | 'chaotic-good'
  | 'lawful-neutral' | 'true-neutral' | 'chaotic-neutral'
  | 'lawful-evil' | 'neutral-evil' | 'chaotic-evil'

type AbilityScore = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

type ProficiencyLevel = 'proficient' | 'expert'

type AbilityScores = Record<AbilityScore, number>

interface HitPoints {
  current: number     // 0 to max (never negative in state)
  max: number
  temp: number        // 0 or positive
}

interface Equipment {
  armorId: string | null
  shieldId: string | null       // REMOVED hasShield boolean (legacy gone)
  items: EquipmentItem[]        // NEW: for future gear tracking
}

interface EquipmentItem {       // NEW
  id: string
  name: string
  quantity: number
  notes: string
}

interface SlotState {
  used: number
  total: number
}

interface ResourceState {
  used: number
  total: number
}

interface DeathSaves {
  successes: number   // 0–3
  failures: number    // 0–3
}

interface ActiveCondition {
  conditionId: ConditionId
  appliedAt: number   // timestamp
}

// Weapon V2 — all fields explicit, no optional chains needed
interface Weapon {
  id: string
  name: string
  atkBonus: number                    // manual override (0 if none)
  damage: string                      // "1d8", "2d6+3"
  damageType: string                  // default ""
  rangeType: 'Melee' | 'Ranged' | 'Melee or Ranged'
  properties: string[]                // always array
  enchantmentBonus: number            // 0 if non-magic
  bonusDamageDie: string              // "" if none
  bonusDamageType: string             // "" if none
  category: 'Simple' | 'Martial' | 'Natural' | 'Unarmed' | 'Improvised'
  isCustom: boolean                   // NEW: true for user-created weapons
}
```

### 7.3 Data Model Improvements Summary

| V1 Field | V2 Change | Reason |
|----------|-----------|--------|
| `subclass?: string` | `subclassId: SubclassId \| null` | Typed reference; explicit null |
| `hasShield: boolean` | Removed | Replaced by `shieldId` in V1 already; legacy removed |
| `concentrationSpellId?: string` | `concentrationSpellId: string \| null` | Explicit null > undefined |
| `weapons?: Weapon[]` | `weapons: Weapon[]` | Always an array; simplifies null checks |
| `feats?: string[]` | `feats: string[]` | Always an array |
| `bonusHpPerLevel?: number` | `bonusHpPerLevel: number` | Default 0, always present |
| — | `schemaVersion: number` | Drives versioned migrations |
| — | `createdAt: string` | Audit + card sort |
| — | `updatedAt: string` | Audit + card sort |
| — | `preparedSpellIds: string[]` | Enables Cleric/Druid/Wizard prep tracking |
| — | `notes: string` | In-app session notes |
| — | `equipment.items: EquipmentItem[]` | Foundation for gear tracking |
| — | `weapon.isCustom: boolean` | Distinguish SRD from user-created |

### 7.4 Zod Validation Schema

```typescript
// domain/validation/CharacterSchema.ts
import { z } from 'zod'

const AbilityScoresSchema = z.object({
  str: z.number().int().min(1).max(30),
  dex: z.number().int().min(1).max(30),
  con: z.number().int().min(1).max(30),
  int: z.number().int().min(1).max(30),
  wis: z.number().int().min(1).max(30),
  cha: z.number().int().min(1).max(30),
})

const HitPointsSchema = z.object({
  current: z.number().int().min(0),
  max: z.number().int().min(1),
  temp: z.number().int().min(0),
})

const WeaponSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  atkBonus: z.number().int(),
  damage: z.string().regex(/^(\d+d\d+([+-]\d+)?|\d+)$/),
  damageType: z.string(),
  rangeType: z.enum(['Melee', 'Ranged', 'Melee or Ranged']),
  properties: z.array(z.string()),
  enchantmentBonus: z.number().int().min(0).max(3),
  bonusDamageDie: z.string(),
  bonusDamageType: z.string(),
  category: z.enum(['Simple', 'Martial', 'Natural', 'Unarmed', 'Improvised']),
  isCustom: z.boolean(),
})

export const CharacterSchema = z.object({
  id: z.string().uuid(),
  schemaVersion: z.number().int().min(2),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  name: z.string().min(1).max(50),
  playerName: z.string().max(100),
  alignment: z.enum([...alignments]),
  race: z.string(),
  classId: z.string(),
  subclassId: z.string().nullable(),
  background: z.string(),
  level: z.number().int().min(1).max(20),
  experiencePoints: z.number().int().min(0),
  abilityScores: AbilityScoresSchema,
  hitPoints: HitPointsSchema,
  // ... (all fields validated)
  notes: z.string().max(10000),
})

export type Character = z.infer<typeof CharacterSchema>
```

---

## 8. Technical Improvements

### 8.1 Performance

| Issue | Solution |
|-------|---------|
| Derived stats recomputed in each component | Single `useDerivedStats` hook; result passed via React context; memoized with `useMemo` |
| Full character written to disk on every mutation | Debounce IPC save calls: wait 500ms after last mutation before writing |
| Large component tree re-renders on any state change | Zustand selectors per feature (e.g., `useVitals()`, `useSpells()`) prevent cross-feature re-renders |
| Spell data loaded into memory eagerly | Lazy-load spellData at first spell interaction; split into per-level files |

### 8.2 Error Handling

```typescript
// Per-panel error boundaries
class PanelErrorBoundary extends React.Component {
  // Catches render errors in a feature panel
  // Shows: "This panel encountered an error. [Reload panel]"
  // Does NOT crash the rest of the character sheet
}

// Wrap each feature panel:
<PanelErrorBoundary name="Vitals">
  <VitalsPanel />
</PanelErrorBoundary>
```

IPC error handling:
```typescript
// services/ipc.ts — every call wrapped:
async function saveCharacter(id: string, char: Character): Promise<void> {
  try {
    await window.ipc.saveCharacter(id, char)
  } catch (err) {
    showToast({ type: 'error', message: 'Failed to save character. Check disk space.' })
    console.error('[IPC] saveCharacter failed:', err)
  }
}
```

### 8.3 Validation

Every mutation validates the resulting state before applying:

```typescript
// store/characterSlice.ts
function applyCommand(cmd: CharacterCommand) {
  const nextState = cmd.apply(get().characters[cmd.characterId])
  const result = CharacterSchema.safeParse(nextState)
  if (!result.success) {
    console.error('[Store] Invalid state after command:', result.error)
    showToast({ type: 'error', message: 'Invalid state — action was rejected.' })
    return
  }
  set(state => { state.characters[cmd.characterId] = result.data })
  ipc.saveCharacter(cmd.characterId, result.data)
  uiStore.pushUndo(cmd)
}
```

### 8.4 Testing Strategy

```
domain/rules/     ─── Vitest unit tests (100% coverage target)
                      Pure functions: no mocks needed
                      Input/output per rule, edge cases

domain/migrations/ ─── Vitest unit tests
                       V1 fixture → run migration → assert V2 shape

shared/ui/        ─── React Testing Library
                      Render + interaction tests for Pip, InlineEdit, Modal

features/vitals/  ─── React Testing Library
                      HP damage/heal/temp HP/death save interactions

features/spells/  ─── React Testing Library
                      Slot use/recover, concentration toggle
```

### 8.5 Scalability Considerations

| Area | V2 Design |
|------|-----------|
| Adding a new class | Add entry to `classData.ts` + `resourceDefaults.ts` — no component changes needed |
| Adding new spells | Add entries to `spellData.ts` — automatically available in spell selection |
| Adding a new feat | Add to `featsData.ts` + handle effect in `store/characterSlice.levelUp` |
| Adding a new race | Add to `raceData.ts` — AC formula, speed, bonuses picked up automatically |
| New panel in CharacterView | Create feature folder, add `<PanelErrorBoundary>` wrapper in CharacterView layout — no other changes |
| Homebrew content (future) | `customContent` field in Character stores user-defined races/classes/spells; domain layer checks custom data first |

---

## 9. Migration Strategy

### 9.1 Schema Migration

Every character file loaded from disk goes through `domain/migrations/migrateCharacter()`:

```typescript
// domain/migrations/index.ts
export function migrateCharacter(raw: unknown): Character {
  const base = raw as Record<string, unknown>
  const version = (base.schemaVersion as number) ?? 1

  let migrated = base
  if (version < 2) migrated = v1_to_v2(migrated)

  // Validate final shape
  return CharacterSchema.parse(migrated)
}
```

**V1 → V2 migration (`v1_to_v2.ts`):**

```typescript
export function v1_to_v2(char: Record<string, unknown>) {
  return {
    ...char,
    schemaVersion: 2,
    createdAt: new Date().toISOString(),    // approximate; not available in V1
    updatedAt: new Date().toISOString(),
    subclassId: char.subclass ?? null,      // rename field
    concentrationSpellId: char.concentrationSpellId ?? null,
    weapons: char.weapons ?? [],
    feats: char.feats ?? [],
    bonusHpPerLevel: char.bonusHpPerLevel ?? 0,
    preparedSpellIds: [],                   // empty; user re-marks on first long rest
    notes: '',
    equipment: {
      armorId: (char.equipment as any)?.armorId ?? null,
      shieldId: (char.equipment as any)?.shieldId
        ?? ((char.equipment as any)?.hasShield ? 'shield' : null),
      items: [],
    },
  }
}
```

### 9.2 Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Migration corrupts character data | Low | Zod parse catches any invalid output; bad migration throws before writing |
| Undo stack grows too large | Low | Cap at 10 commands per character; older commands dropped |
| Spell data gaps (levels 6–9) break level-up | High if not addressed | Implement spell data before releasing level-up spell selection feature |
| Users lose characters during upgrade | Medium | V2 installer backs up `~/.dnd-companion/characters/` before first launch |
| Performance regression from derived stats context | Low | Memoize `useDerivedStats`; profile with React DevTools before release |

### 9.3 Rollout Plan

```
Phase 1 — Architecture refactor (no new features)
  - Split CharacterView.tsx into feature components
  - Split store.ts into slices
  - Create services/ipc.ts
  - Create domain/migrations/
  - Add Zod CharacterSchema
  - Set up Vitest + write domain layer tests
  Result: V1-equivalent behavior, V2 architecture

Phase 2 — Complete missing core features
  - Add SpellSelectionStep to level-up flow
  - Add SpellbookView + PreparedSpellsList
  - Add spell data for levels 6–9
  Result: Caster gameplay fully functional

Phase 3 — UX improvements
  - Add dice roller overlay
  - Add undo stack (command pattern)
  - Add ability score validation
  - Add error boundaries
  - Refactor CSS to use design tokens
  - Complete ActionDetailPane for all action types
  Result: Polished, robust gameplay experience

Phase 4 — Export / import
  - JSON export + import
  - Character backup on first V2 launch
  Result: Data portability

Phase 5 — Supporting features
  - Notes panel
  - Concentration save DC reminder
  - Spell slot upcasting tracker
  Result: Full session companion
```

---

## 10. Implementation Guidelines

### 10.1 Component Writing Rules

1. **Max 300 lines per component.** Extract sub-components if exceeded.
2. **No derived stat computation in JSX.** Use `useDerivedStats()` exclusively.
3. **No direct store mutations in event handlers.** Dispatch a command through `store.applyCommand()`.
4. **No magic strings.** Use typed enums/constants for all IDs (action IDs, condition IDs, skill names).
5. **Every component wrapped in `PanelErrorBoundary`.** Exception: primitive shared/ui components.
6. **No CSS values hardcoded in components.** Always reference design tokens via `var(--color-*)`, `var(--space-*)`.

### 10.2 Domain Layer Rules

1. **All functions in `domain/rules/` are pure** — zero React, zero Zustand imports.
2. **Every function has a corresponding Vitest test file** (`*.test.ts`).
3. **Test edge cases explicitly:** max ability score (30), level 20, 0 HP, no proficiency, magic weapons, shield stacking.
4. **No domain function reads from static data files** — data is passed as parameters.

### 10.3 State Management Rules

1. **`characterSlice.ts`:** Only character data mutations + IPC persistence calls.
2. **`uiSlice.ts`:** Only UI state (open panels, active tabs, undo stack, toast queue).
3. **Selectors are colocated with features** — `features/vitals/useVitals.ts` exports `useVitalsSelector()`.
4. **No `useAppStore()` calls in leaf components** — they receive props from feature root components.

### 10.4 IPC Layer Rules

1. **All IPC calls go through `services/ipc.ts`** — no `window.ipc.*` calls outside this file.
2. **Every IPC call is async/await with try/catch** — errors show a toast, never crash the UI.
3. **Save is debounced 500ms** — prevents excessive writes on rapid HP button clicks.

### 10.5 CSS Rules

1. **All color/spacing/typography from tokens.css** — zero hardcoded values.
2. **Module CSS for component-scoped styles** — no global classes outside tokens.css and reset.
3. **Shared layout primitives in `shared/ui/`** — `.pip`, `.statBlock`, `.inlineEdit` defined once.
4. **No media queries needed** — app is Electron fixed-window; minimum 1024×768 assumed.

### 10.6 Feature Implementation Checklist (Per Feature)

Before marking a feature complete:

- [ ] Component renders without errors in Storybook (isolated)
- [ ] Unit tests cover all domain logic used by the feature
- [ ] Error boundary present
- [ ] Zod validation runs on all state mutations
- [ ] No inline style values (tokens only)
- [ ] Keyboard accessible (Tab, Enter, Space, Escape)
- [ ] Tested at levels 1, 5, 10, 20
- [ ] Tested with non-caster and full-caster classes
- [ ] Undo works for any reversible mutations

### 10.7 V2 Acceptance Test Matrix

| Scenario | Steps | Expected |
|----------|-------|----------|
| Create Wizard (level 1) | Full wizard → Create | Character on select screen with correct HP, AC, weapons |
| Create Sorcerer (level 5) | Full wizard including spells | Cantrips + known spells present, spell slots correct |
| Level up Fighter to 4 | Add XP → Level Up | ASI modal; +2 ability applied; HP increases |
| Level up Wizard to 3 | Add XP → Level Up | ASI skipped; SpellSelectionStep shows 2 spells to learn |
| Damage + undo | Deal 15 damage → Ctrl+Z | HP restored to pre-damage value |
| Death saves | Reduce to 0 HP → click 3 failures | Death state shown |
| Stabilize | 0 HP → click 3 successes | HP = 1, saves cleared |
| Long rest Warlock | Use all pact slots → Long Rest | All slots restored |
| Short rest Monk | Use 3 Ki → Short Rest | Ki restored; HP healed by rolled die |
| Prepare spells Cleric | Open Spellbook → mark prepared | preparedSpellIds updated; max enforced |
| Level 7 Fireball | Level to 7 → check Spellbook | Fireball (3rd level) available to learn |
| Export → Import | Export JSON → delete char → Import | Character restored exactly |
| Bad disk (IPC fail) | Disconnect disk mock → deal damage | Toast error shown; state unchanged |
