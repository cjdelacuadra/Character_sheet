# DnD Character Companion — Complete Functional Documentation (V1 Analysis)

> **Purpose:** Full architectural and functional analysis of the existing Electron/React D&D 5e Character Sheet application, to serve as the foundation for designing Version 2.

---

## 1. Executive Summary

**DnD Character Companion** is a cross-platform desktop application (Electron 34) that provides a digital character sheet for Dungeons & Dragons 5th Edition. The application targets D&D players who want a structured, rules-enforcing alternative to paper sheets. It manages complete character state from creation through level 20, enforcing official SRD rules for combat, spellcasting, abilities, and progression.

**Main capabilities:**
- Full character lifecycle: creation, gameplay tracking, leveling, deletion
- Offline-first: characters stored as local JSON files via Electron IPC
- Rules-enforcing: attack bonuses, AC, HP, spell slots, resources all auto-calculated
- 14 classes, 23 races, 36 weapons, 70+ spells, 15 conditions, 10+ feats — all SRD-compliant
- Real-time UI: click-to-edit inline fields, pip trackers, collapsible panels, spell card modals

---

## 2. Functional Overview

### 2.1 Feature List

| # | Feature | Status |
|---|---------|--------|
| 1 | Character Selection Screen | ✅ Complete |
| 2 | Character Creation Wizard (4-step) | ✅ Complete |
| 3 | Ability Score Methods (Standard Array, Point Buy, Roll) | ✅ Complete |
| 4 | Race & Class Selection with subclasses | ✅ Complete |
| 5 | Armor & Weapon selection at creation | ✅ Complete |
| 6 | Spell selection at creation (casters only) | ✅ Complete |
| 7 | Character Header (identity grid) | ✅ Complete |
| 8 | Ability Scores with live modifier calculation | ✅ Complete |
| 9 | HP tracking (current, max, temp) | ✅ Complete |
| 10 | HP delta buttons (±1, ±5, ±10) | ✅ Complete |
| 11 | HP progress bar with color thresholds | ✅ Complete |
| 12 | Death Saving Throws (conditional visibility) | ✅ Complete |
| 13 | AC panel with armor picker | ✅ Complete |
| 14 | Initiative & Speed display | ✅ Complete |
| 15 | Proficiency Bonus, Spell Save DC, Spell Attack | ✅ Complete |
| 16 | Saving Throws panel (toggleable proficiency) | ✅ Complete |
| 17 | Skills panel with proficiency/expertise markers | ✅ Complete |
| 18 | Passive Perception display | ✅ Complete |
| 19 | Conditions panel (15 conditions) | ✅ Complete |
| 20 | Inspiration pips (0–3 counter) | ✅ Complete |
| 21 | Weapons table with computed attack bonus | ✅ Complete |
| 22 | Custom weapon addition | ✅ Complete |
| 23 | Magic weapon enchantment (+1/+2/+3) | ✅ Complete |
| 24 | Weapon proficiency enforcement | ✅ Complete |
| 25 | Actions panel (Action/Bonus/Reaction/Class Abilities tabs) | ✅ Complete |
| 26 | Class-contextual actions filtered by level & resource | ✅ Complete |
| 27 | Action Detail Pane (right panel, context-sensitive) | ⚠️ Partial |
| 28 | Spell list with concentration tracking | ✅ Complete |
| 29 | Spell slot pip tracker (levels 1–9) | ✅ Complete |
| 30 | Spell card modal (full spell details) | ✅ Complete |
| 31 | Resource tracking panel (class-specific pips) | ✅ Complete |
| 32 | Features list (expandable cards) | ✅ Complete |
| 33 | Short Rest (HD roller, resource recovery) | ✅ Complete |
| 34 | Long Rest (full HP, all slots/resources reset) | ✅ Complete |
| 35 | XP tracker with level-up prompt | ✅ Complete |
| 36 | Level Up modal (ASI/feat selection) | ✅ Complete |
| 37 | Spellbook panel (spells learned on level-up) | ❌ Not implemented |
| 38 | Spell selection on level-up | ❌ Not implemented |
| 39 | Full action detail view with attack cards | ⚠️ Partial |
| 40 | Character persistence (Electron IPC / local files) | ✅ Complete |

---

## 3. Detailed Functional Breakdown

### 3.1 Character Selection Screen

**Description:** Entry point. Lists all saved characters as cards. Provides navigation to character view and triggers character creation.

**Inputs:** User clicks "New Character" or selects an existing card or clicks delete.

**Outputs:** Navigate to CharacterView, open create modal, or delete character from disk.

**Logic / Rules:**
- Characters displayed as cards with name, class/level, race/subclass, HP (color-coded), AC, Background
- Hover state: border glow (purple accent), background lighten
- Delete: requires hover to reveal button; turns red on hover
- Empty state: shows message + create button
- Cards sorted by last-modified (disk order)

**Dependencies:** `store.ts`, `CharacterSelectScreen.tsx`, Electron IPC (`listCharacters`, `deleteCharacter`)

---

### 3.2 Character Creation Wizard

**Description:** 4-step modal wizard for creating a new character.

**Step 1 — Basics**

Inputs: Name (required), Player Name (optional), Alignment (9 options), Race (23 options), Class (14 options), Subclass (conditional — unlocks at class-specific level), Background (grants skills), Starting Level (1–20).

Logic:
- "Next" disabled until name provided
- Background auto-lists granted skill proficiencies in info box
- Subclass dropdown appears based on class unlock level

**Step 2 — Ability Scores**

Three assignment methods (tab-based):

1. **Standard Array:** Fixed values [15,14,13,12,10,8] — click to assign to each ability
2. **Point Buy:** 27-point budget — [−][+] buttons, cost table applied, warns red when negative
3. **Roll (4d6 drop lowest):** "Roll Scores" generates 6 values — click to assign, used values strikethrough

Racial ability bonuses applied after method. Variant Human: pick 2 abilities for +1 each. Half-Elf: +2 CHA + pick 2 others.

**Step 3 — Equipment & Skills**

- Stat preview chips (Max HP, AC, Speed, Initiative, Proficiency Bonus)
- Armor selection grid (filtered by class proficiency)
- Shield checkbox
- Skill selection (multi-select, class-limited count, background skills pre-shown)
- Weapon selection (multi-select grid: name, damage die, range type)

**Step 4 — Spells** (casters only)

- Search input for filtering
- Cantrips section: select up to class-defined maximum
- Known/Prepared Spells: select up to class-defined limit; shows level + school + cast time

**Navigation:** Back | Next/Create. Non-casters skip Step 4.

**Dependencies:** `classData.ts`, `raceData.ts`, `backgrounds.ts`, `armorData.ts`, `weaponData.ts`, `spellData.ts`, `charCalculations.ts`, `store.addCharacter`

---

### 3.3 Character Header

**Description:** 2-row × 4-column identity grid fixed to top of CharacterView.

**Row 1:** Character Name | Class & Level (+ subclass) | Background | Player Name
**Row 2:** Race | Alignment | XP block (editable + Level-Up button) | Inspiration pips + Rest + Back

**Logic:**
- XP field: inline editable number
- Level-Up button: pulses when XP ≥ next-level threshold; disabled at level 20
- Inspiration: 0–3 pip counter; click to toggle; shows "{current}/3" or "—"
- Rest button: toggles collapsible RestPanel below header
- Back button: exits to CharacterSelectScreen

**Dependencies:** `store.updateCharacter`, `domain/rules/xpForNextLevel`

---

### 3.4 HP System

**Description:** Tracks current HP, max HP, and temporary HP with visual feedback.

**Inputs:** Inline click-to-edit for current HP, temp HP delta buttons (±1, ±5, ±10), `setTempHp` action.

**Logic:**
- Damage: Applied to Temp HP first; remainder reduces Current HP
- Heal: Increases Current HP (capped at max); does not restore Temp HP
- Temp HP: Set directly (not additive); expires on long rest
- HP bar colors: >50% green, 25–50% orange, <25% red
- Death Saves: visible only when Current HP ≤ 0
- Stabilization: 3 successes → HP = 1, death saves cleared
- Death: 3 failures → tracked in state
- Max HP formula: `hitDie + CONmod + (level-1) × (avgPerLevel + CONmod) + level × bonusHpPerLevel`
- Tough feat: +2 `bonusHpPerLevel`

**Outputs:** Updated `character.hitPoints`, `character.deathSaves`

**Dependencies:** `charCalculations.computeMaxHP`, `store.updateCharacter`, `store.setTempHp`

---

### 3.5 Armor Class System

**Description:** Calculates AC from armor, DEX, race, class, and shield.

**Inputs:** Armor selection in picker, shield checkbox, ability score edits.

**Logic (priority order):**
1. Natural AC (race): `raceDef.naturalAC(scores) + shieldBonus`
2. Unarmored Defense: Barbarian = `10 + DEX + CON`; Monk = `10 + DEX + WIS`
3. Armor: `baseAC + enchantmentBonus + min(dexMod, dexCap) + shieldBonus`
4. Shield: always additive `+2 + enchantmentBonus`
5. DEX cap: Light = unlimited; Medium = +2; Heavy = 0

STR warning ⚠ shown in picker if character STR < armor requirement.

**Outputs:** `character.armorClass`

**Dependencies:** `charCalculations.computeAC`, `armorData.ts`

---

### 3.6 Ability Scores & Skills

**Description:** Six ability scores (STR/DEX/CON/INT/WIS/CHA) with inline editing and live derived stats.

**Logic:**
- `modifier = floor((score - 10) / 2)`
- Edit triggers recalculation of HP max, AC, initiative, spell DCs, skill/save bonuses
- Skill bonus: `abilityMod + prof + (expert ? prof : 0)`
- Save bonus: `abilityMod + (proficient ? prof : 0)`
- Passive Perception: `10 + Perception bonus`
- Saving throw toggle: click circle to grant/revoke proficiency
- Skill toggle: cycles none → proficient → expert → none

**Dependencies:** `charCalculations.mod`, `charCalculations.skillBonus`, `charCalculations.savingThrowBonus`, `skills.ts`

---

### 3.7 Weapons & Attack Bonus

**Description:** Manages weapon inventory with auto-computed attack bonuses.

**Inputs:** Weapon selection at creation, inline add-custom-weapon form, delete button per weapon.

**Attack Bonus Logic:**
1. Finesse weapons: `max(STR, DEX)` modifier
2. Ranged weapons: DEX modifier
3. Melee weapons: STR modifier
4. Add proficiency bonus (if proficient)
5. Add `weapon.atkBonus` (manual override)
6. Add `weapon.enchantmentBonus` (+1/+2/+3)

**Proficiency Check:**
- Class profs (`simple weapons`, `martial weapons`, or named)
- Race bonus profs merged in
- Unarmed/Natural always proficient

**Custom Weapon Form:** Name, attack bonus, damage (dice notation `1d6+3` or flat), damage type. Validates format before adding.

**Dependencies:** `domain/rules/computeAttackBonus`, `domain/rules/isProficientWithWeapon`, `weaponData.ts`

---

### 3.8 Actions Panel

**Description:** Displays available combat actions by type, filtered by class and level.

**Four tabs:** Actions | Bonus Actions | Reactions | Class Abilities (each shows item count).

**Logic:**
- Generic actions: always shown (Attack, Dash, Dodge, Help, Hide, etc.)
- Class actions: filtered by `character.classId` and `character.level`
- Resource-depleted actions: grayed out when `used >= total`
- Special attacks (Sneak Attack, Divine Smite, etc.): appear as sub-items under Attack

**Action Detail Pane:** Right panel shows description, resource info, and weapon cards for attack-type actions.

**Dependencies:** `domain/rules/getAvailableActions`, `domain/rules/getSpecialAttacks`

---

### 3.9 Spell System

**Description:** Tracks known spells, spell slots, and concentration for spellcasting classes.

**Components:** Spell list with search, slot tracker (levels 1–9 as pip rows), spell card modal, concentration banner.

**Spell Slot Logic:**
- Full casters: standard 9-level progression
- Half casters (Paladin/Ranger): starts at character level 2, capped at slot level 5
- Warlock: all slots same level (Pact Magic), recover on short rest

**Concentration:** One spell at a time; new selection drops previous; banner shows "Drop Concentration" button.

**Slot Recovery:** Short rest: Warlock only. Long rest: all slots reset (`used: 0`).

**Dependencies:** `spellData.ts`, `spellSlots.ts`, `store.updateCharacter`

---

### 3.10 Resource Tracking

**Description:** Class-specific resources (Rage, Ki, Channel Divinity, etc.) as pip counters.

**Logic:**
- Total scales per `scalingPer`: level, CHA mod, WIS mod, CON mod, or fixed
- Recovery badge: SR (short rest) / LR (long rest)
- Short rest: `recoverOn: 'short'` resources reset
- Long rest: all resources reset to defaults

**Dependencies:** `resourceDefaults.getResourceDefaults`, `classData.ts`, `store.shortRest`, `store.longRest`

---

### 3.11 Rest System

**Description:** Collapsible panel for short and long rests.

**Short Rest:**
- Shows available Hit Dice: `{level - hitDiceUsed} / {level}`
- Roll value input + auto-roll button
- Preview: `Heal: {roll} + CON ({mod}) = {total} HP`
- Confirm: heals HP (capped at max), `hitDiceUsed++`, resets short-rest resources, resets Warlock slots

**Long Rest:**
- Full HP restore, temp HP cleared
- All spell slots reset
- All resources reset
- Half Hit Dice recovered: `max(1, floor(level / 2))`
- Death saves cleared, concentration dropped

**Dependencies:** `store.shortRest`, `store.longRest`

---

### 3.12 XP Tracker & Level Up

**Description:** Inline XP editor with level-up detection and modal.

**Logic:**
- XP displayed as inline editable number in header
- Level-Up button pulses when XP ≥ threshold; thresholds: L1=0, L2=300, ..., L20=355,000
- At ASI levels (4, 8, 12, 16, 19): `LevelUpModal` opens
  - **Double:** +2 to one ability (cap 20)
  - **Split:** +1 to two abilities (cap 20 each)
  - **Feat:** choose from feat list with search
- Non-ASI levels: auto-apply (no modal)
- Level-up recalculates: HP max, prof bonus, spell slots, resources, features list

**Missing:** Spell selection on level-up is not implemented.

**Dependencies:** `domain/rules/xpForNextLevel`, `store.levelUp`, `featsData.ts`, `LevelUpModal.tsx`

---

### 3.13 Features List

**Description:** Class and race features shown as expandable cards, filtered by current level.

**Logic:**
- Features seeded from class definition (filtered by level) and race definition
- Each feature: Name, Level badge, expandable description on click

**Dependencies:** `classData.ts`, `raceData.ts`

---

### 3.14 Conditions Panel

**Description:** Toggle standard D&D 5e conditions on the character.

**15 conditions:** Blinded, Charmed, Deafened, Exhaustion, Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious.

**Logic:**
- "Add" opens picker grid; click condition → adds pill tag; click tag → removes
- Long rest clears most conditions (Exhaustion persists per rules)

**Dependencies:** `condition/types.ts`, `store.updateCharacter`

---

### 3.15 Character Persistence

**Description:** Characters stored as JSON files on disk via Electron IPC.

**IPC Bridge** (`window.characterStore`):
- `saveCharacter(id, character)` — serialize + write JSON file
- `loadCharacter(id)` — read + parse JSON file
- `listCharacters()` — enumerate character files
- `deleteCharacter(id)` — delete JSON file

**Migration on load:**
- `hasShield: boolean` → `shieldId: string | null`
- Adds default values for any missing fields
- Normalizes death saves, inspiration, spell slot structure

**Dependencies:** `electron/main/index.ts`, `electron/preload/index.ts`, `store.loadFromDisk`

---

## 4. System Architecture

### 4.1 Layers

```
┌────────────────────────────────────────────────────┐
│                  Electron Shell                     │  (window, IPC host, file I/O)
├────────────────────────────────────────────────────┤
│             React Renderer (Vite)                   │  (all UI)
│  ┌─────────────────────────────────────────────┐   │
│  │           Zustand Store (store.ts)          │   │  (global state + mutations)
│  │  ┌──────────────────────────────────────┐  │   │
│  │  │   Domain Rules (domain/rules/)       │  │   │  (pure game logic, no React)
│  │  └──────────────────────────────────────┘  │   │
│  │  ┌──────────────────────────────────────┐  │   │
│  │  │   Static SRD Data (shared/data/)     │  │   │  (read-only game content)
│  │  └──────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────┘   │
├────────────────────────────────────────────────────┤
│              Local File System                      │  (character JSON files)
└────────────────────────────────────────────────────┘
```

### 4.2 Component Tree

```
App.tsx
├── CharacterSelectScreen.tsx
│   └── CreateModal (4-step wizard)
│       ├── StepBasics
│       ├── StepScores
│       ├── StepEquipment
│       └── StepSpells (casters only)
└── CharacterView.tsx
    ├── Header (2×4 grid)
    ├── RestPanel (collapsible)
    ├── LeftColumn
    │   ├── TopStatRow (AC / Initiative / Speed)
    │   ├── ArmorPicker (collapsible)
    │   ├── SecondaryStats (Prof / Spell DC / Spell Atk)
    │   ├── HPSection (current / temp / death saves)
    │   ├── HPBar + HPDeltaButtons
    │   ├── ConditionsPanel
    │   ├── InspirationPips
    │   └── StatsSubGrid
    │       ├── AbilityBlocks (6 abilities)
    │       └── SavesSkillsPanel
    ├── CenterColumn
    │   ├── ActionTabs (4 tabs)
    │   ├── ActionList
    │   └── SpellList (spellcasters)
    │       ├── SpellSlotTracker
    │       ├── ConcentrationBanner
    │       └── SpellCards → SpellModal
    ├── RightColumn
    │   ├── ActionDetailPane
    │   ├── WeaponsTable
    │   ├── FeaturesList
    │   └── ResourcesList
    └── LevelUpModal (overlay)
```

### 4.3 Module Responsibilities

| Module | Responsibility |
|--------|---------------|
| `app/App.tsx` | Root; routes between SelectScreen and CharacterView |
| `app/store.ts` | All state mutations, rest mechanics, level-up, IPC calls, migrations |
| `domain/rules/index.ts` | Pure calculations: attack bonus, spell DC, actions, XP thresholds |
| `shared/data/charCalculations.ts` | Derived stats: AC, HP max, skill/save bonuses, roll functions |
| `shared/data/classData.ts` | Class definitions: hit die, saves, proficiencies, resources, scaling |
| `shared/data/raceData.ts` | Race definitions: ability bonuses, AC formulas, speed, traits |
| `shared/data/weaponData.ts` | 36 SRD weapons with properties |
| `shared/data/armorData.ts` | All armor + magic variants with DEX caps and STR requirements |
| `shared/data/spellData.ts` | 70+ spells (cantrip through level 5) |
| `shared/data/spellSlots.ts` | Slot tables per class per level |
| `shared/data/resourceDefaults.ts` | Resource totals per class per level |
| `shared/data/featsData.ts` | Feat definitions |
| `entities/*/types.ts` | TypeScript interfaces (Character, Class, Spell, Weapon, Condition) |
| `electron/main/index.ts` | Electron main: window, IPC handlers, file I/O |
| `electron/preload/index.ts` | IPC bridge: exposes `window.characterStore` to renderer |

---

## 5. Data Model

### 5.1 Character Entity

```typescript
Character {
  id: string                          // UUID
  name: string
  playerName?: string
  alignment?: string
  race: string                        // key into raceData
  classId: string                     // key into classData
  subclass?: string
  background: string
  level: number                       // 1–20
  experiencePoints: number

  abilityScores: { str, dex, con, int, wis, cha: number }  // 1–30
  hitPoints: { current: number; max: number; temp: number }
  armorClass: number
  speed: number
  initiative: number
  proficiencyBonus: number

  equipment: {
    armorId: string | null
    hasShield: boolean                // legacy field
    shieldId?: string | null
  }
  savingThrowProficiencies: AbilityScore[]
  skillProficiencies: Partial<Record<Skill, 'proficient' | 'expert'>>

  weapons?: Weapon[]
  spellIds: string[]
  spellSlots: Record<number, { used: number; total: number }>
  concentrationSpellId?: string

  conditionIds: ActiveCondition[]
  resources: Record<string, { used: number; total: number }>
  deathSaves: { successes: number; failures: number }
  inspiration: number                 // 0–3
  hitDiceUsed: number
  feats?: string[]
  bonusHpPerLevel?: number            // from Tough feat
}
```

### 5.2 Key Entities

```typescript
Weapon {
  id: string
  name: string
  atkBonus: number
  damage: string                      // "1d8", "2d6+3"
  damageType?: string
  rangeType?: 'Melee' | 'Ranged' | 'Melee or Ranged'
  properties?: string[]               // "finesse", "light", "thrown", etc.
  enchantmentBonus?: number           // +1 / +2 / +3
  bonusDamageDie?: string
  bonusDamageType?: string
  category?: 'Simple' | 'Martial'
  profCategory?: 'Unarmed' | 'Natural' | 'Simple' | 'Martial'
}

Spell {
  id: string
  name: string
  level: number                       // 0 = cantrip
  school: string
  castingTime: string
  range: string
  components: string
  duration: string
  concentration: boolean
  description: string
  higherLevels?: string
}

ClassDef {
  id: string
  name: string
  hitDie: number                      // 6 / 8 / 10 / 12
  savingThrowProficiencies: AbilityScore[]
  armorProficiencies: ArmorProficiency[]
  weaponProficiencies: string[]
  skillChoicesCount: number
  availableSkills: Skill[]
  isSpellcaster: boolean
  spellcastingAbility?: AbilityScore
  resourceDefs: ResourceDef[]
  asiLevels: number[]
  features: FeatureDef[]
  bonusHpPerLevel?: number
}
```

### 5.3 Key Relations

```
Character ──(1)──► ClassDef         via classId
Character ──(1)──► RaceDef          via race
Character ──(N)──► Weapon           via weapons[]
Character ──(N)──► SpellEntry       via spellIds[]
Character ──(N)──► ActiveCondition  via conditionIds[]
Character ──(N)──► Resource         via resources{}
Character ──(N)──► SpellSlot        via spellSlots{}
ClassDef  ──(N)──► ResourceDef      via resourceDefs[]
ClassDef  ──(N)──► FeatureDef       via features[]
```

---

## 6. User Flows

### 6.1 Create a New Character

```
1. App opens → CharacterSelectScreen loads all saved characters from disk
2. User clicks "New Character" → 4-step wizard opens
3. Step 1: Name + race/class/subclass/background/level → Next
4. Step 2: Choose ability score method → assign scores → racial bonuses auto-applied → Next
5. Step 3: Pick armor + skills + starting weapons → Next (or Create if non-caster)
6. Step 4 (casters): Select cantrips + known spells → Create Character
7. Character saved to disk, added to Zustand store, navigates to CharacterView
```

### 6.2 Play Session (Combat)

```
1. Open character → CharacterView (3-column layout)
2. Note AC, initiative, HP in left column
3. Apply conditions as they occur → pill tags appear
4. Attack: view weapon table → read computed attack bonus
5. Take damage: click [-10] / [-5] / [-1] OR inline edit HP value
6. HP = 0 → death saves panel appears → click S/F each round
7. 3 successes → HP = 1, stabilized
8. Use class resource (e.g., Barbarian Rage): click pip in Resources panel
9. Cast spell → click slot pip to mark used
10. Concentration spell → banner shows active spell
11. Rest → collapsible panel → choose Short/Long → confirm
```

### 6.3 Level Up

```
1. Edit XP inline → Level-Up button pulses when threshold reached
2. Click Level-Up
3. If ASI level → LevelUpModal:
   a. Choose mode: double (+2 one ability) / split (+1 two) / feat
   b. Select ability or feat → Confirm
4. If non-ASI level → auto-applies (no modal)
5. Level++, HP recalculated, spell slots updated, resources updated
6. New class features appear in Features panel
```

### 6.4 Short Rest

```
1. Click Rest → panel expands → Short Rest tab
2. Displays available Hit Dice: {level - hitDiceUsed} / {level}
3. Enter roll OR click "Roll" → preview shows "Heal: X + CON (Y) = Z HP"
4. Click "Take Short Rest"
   → HP healed (capped at max)
   → hitDiceUsed++
   → short-rest resources reset
   → Warlock spell slots reset
```

---

## 7. Identified Limitations / Issues

### 7.1 Missing Features

1. **Spell selection on level-up** — Spellcasters cannot learn new spells when leveling (tracked as item #38)
2. **Spellbook panel** — No dedicated spell management view for adding/removing spells post-creation
3. **Multi-classing** — Architecture is single-`classId`; multi-class characters not supported
4. **Concentration saving throw** — No prompt or DC calculation when damaged while concentrating
5. **Prepared spell tracking** — Cleric/Druid/Wizard prepare spells daily; this distinction is not modeled

### 7.2 Partial Implementations

6. **Action Detail Pane** — Weapon sub-cards built but not fully rendered for all action types
7. **Level-Up feature application** — Subclass features and higher-level abilities not all auto-applied

### 7.3 Technical Weaknesses

8. **Monolithic `CharacterView.tsx`** — Entire 3-column game screen in one component; ~1,000+ lines, very hard to maintain
9. **Duplicated CSS patterns** — Similar layout primitives repeated across `CharacterView.module.css`
10. **No undo/history** — Accidental HP changes or deletions are permanent
11. **No input validation** — Ability scores outside 1–30 can be entered inline
12. **No error boundaries** — A single panel crash brings down the full CharacterView
13. **Mixed concerns in store** — `store.ts` combines IPC calls, game rule logic, migrations, and state mutations

### 7.4 Data Limitations

14. **Spells only through level 5** — `spellData.ts` missing levels 6–9
15. **Subclass features incomplete** — Unlock levels defined but most feature descriptions are placeholders
16. **No homebrew support** — Users cannot add custom races, classes, spells, or items

### 7.5 UX Issues

17. **No undo for HP changes** — Easy to misclick ±10 buttons
18. **No character export/import** — Characters are locked to the local machine
19. **No spell preparation workflow** — Cleric/Druid/Paladin/Wizard cannot mark daily prepared spells
20. **No initiative/turn tracker** — Turn order must be tracked externally

---

## 8. Opportunities for Improvement (V2)

### 8.1 Architecture

| Improvement | Priority |
|-------------|----------|
| Split `CharacterView.tsx` into feature-sliced panels (~100–200 lines each) | High |
| Extract game logic from store into domain service layer | High |
| Add error boundaries per panel | High |
| Separate IPC layer from Zustand store | High |
| Command pattern for undoable mutations (HP, slot usage, etc.) | Medium |
| Zod validation on all character mutations | Medium |
| React Query or dedicated loading layer for disk I/O | Medium |

### 8.2 Feature Completions

| Improvement | Priority |
|-------------|----------|
| Spell selection on level-up | High |
| Spellbook management panel | High |
| Level 6–9 spell data | High |
| Prepared spell tracking (Cleric/Druid/Wizard daily prep) | High |
| Full action detail view for all action types | Medium |
| Multi-class support | Medium |
| Complete subclass feature text + mechanics | Medium |

### 8.3 New Features

| Feature | Priority |
|---------|----------|
| Visual dice roller | High |
| Character export (PDF / JSON) | High |
| Concentration saving throw reminder | Medium |
| Spell slot upcasting tracker | Medium |
| Combat turn tracker (initiative order) | Medium |
| Notes / journal section per character | Medium |
| Homebrew content support | Medium |
| Cloud sync / character sharing | Medium |
| DM mode (manage multiple characters) | Low |

### 8.4 Data Quality

| Improvement | Priority |
|-------------|----------|
| Complete spells for levels 6–9 | High |
| Full subclass feature descriptions and mechanics | High |
| Full SRD feat list (40+ feats) | Medium |
| All official PHB races and subraces | Medium |
| Equipment items beyond weapons/armor | Low |

---

## 9. Suggested V2 Design Approach

### 9.1 Proposed File Structure

```
src/
├── electron/
│   ├── main/index.ts              (IPC host + window)
│   └── preload/index.ts           (IPC bridge)
└── renderer/
    ├── app/
    │   ├── App.tsx                (routing)
    │   └── store/
    │       ├── characterSlice.ts  (character CRUD)
    │       ├── uiSlice.ts         (panel states, active tabs)
    │       └── index.ts
    ├── domain/
    │   ├── rules/
    │   │   ├── combat.ts          (attack, AC, initiative)
    │   │   ├── spells.ts          (slots, DC, concentration)
    │   │   ├── progression.ts     (XP, levels, ASI)
    │   │   ├── resources.ts       (short/long rest logic)
    │   │   └── skills.ts          (proficiencies, bonuses)
    │   └── migrations/            (versioned schema migrations)
    ├── entities/                  (TypeScript types — unchanged)
    ├── data/                      (SRD data — expanded)
    ├── features/
    │   ├── character-select/
    │   ├── character-header/
    │   ├── vitals/                (HP + AC + death saves)
    │   ├── abilities/             (scores + saves + skills)
    │   ├── combat/                (weapons + actions)
    │   ├── spells/                (spellbook + slots + concentration)
    │   ├── resources/
    │   ├── conditions/
    │   ├── features-panel/
    │   ├── level-up/
    │   └── rest/
    └── shared/
        ├── ui/                    (Pip, StatBlock, InlineEdit, Modal, etc.)
        └── hooks/                 (useCharacter, useDerivedStats)
```

### 9.2 Modularization Strategy

1. **Feature slicing:** Each feature owns its component, styles, and local state. Reads from global store via selectors only.
2. **Domain isolation:** All game rule functions stay pure (no React/Zustand imports). Full unit test coverage per function.
3. **`useDerivedStats` hook:** Single hook computes AC, HP max, attack bonuses, spell DC — eliminates duplicated recalc logic in JSX.
4. **Command pattern:** Wrap mutations in commands (`ApplyDamageCommand`, `UseSpellSlotCommand`) to enable undo stack.
5. **`schemaVersion` field:** Add to Character to drive clean, versioned migrations on load.

### 9.3 Maintainability Improvements

| Improvement | Description |
|-------------|-------------|
| Centralize derived stats | `computeDerivedStats(char)` called once per render, passed via context |
| Component size cap | No component >300 lines; extract sub-components aggressively |
| UI design system | Reusable `<Pip>`, `<StatBlock>`, `<InlineEdit>`, `<Modal>` primitives |
| Typed action IDs | Enum/const map for action IDs — eliminate magic strings |
| Unit test domain layer | Full coverage on `domain/rules/` functions |
| Storybook | Develop components in isolation; catches visual regressions |

### 9.4 Critical Files to Modify for V2

| File | Change Needed |
|------|--------------|
| `src/renderer/src/widgets/character-view/CharacterView.tsx` | Decompose into ~15 feature components |
| `src/renderer/src/app/store.ts` | Split into slices; extract IPC and migrations |
| `src/renderer/src/domain/rules/index.ts` | Split by domain (combat, spells, progression, skills) |
| `src/renderer/src/shared/data/spellData.ts` | Add levels 6–9 spells |
| `src/renderer/src/shared/data/classData.ts` | Complete subclass feature text and mechanics |
| All `*.module.css` files | Consolidate into shared design token system |

### 9.5 V2 Verification Checklist

- [ ] Create a character for each of the 14 classes at levels 1, 5, 10, 20 — verify HP, AC, attack bonus, spell slots, resources
- [ ] Level up through all ASI levels — verify feat/ASI/spell-selection modals fire correctly
- [ ] Test short and long rest for: Barbarian (rage), Monk (ki), Warlock (pact slots), Cleric (channel divinity)
- [ ] Equip magic armor and shield — verify additive bonus calculation
- [ ] Test unarmored scenarios: Monk, Barbarian, Half-Orc with natural armor
- [ ] Apply all 15 conditions — verify correct persistence through short/long rest
- [ ] Test death saves: 3 successes → stabilize; 3 failures → death state
- [ ] Add custom weapon with dice notation and flat damage — verify correct attack bonus
- [ ] Set concentration spell, take damage, verify banner; set second concentration spell, verify auto-drop
- [ ] Load existing V1 character JSON — verify migration produces valid, complete state
