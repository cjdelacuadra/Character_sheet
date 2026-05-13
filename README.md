# D&D 5e Character Sheet

A desktop companion app for D&D 5th Edition, built with Electron + React + TypeScript.

## Stack

- **Electron 34** — native desktop shell, file-based character persistence
- **React 19 + Vite (electron-vite)** — renderer
- **TypeScript 6** — strict types throughout
- **Zustand 5** — global state
- **Zod 4** — schema validation

## Features

### Character Management
- Create, load, and delete characters; all data persisted to disk per-character
- Character selection screen with HP bar, AC, and background at a glance

### Character Creation Wizard
- **Step 1 — Basics**: name, race, class, subclass (required for level-1 subclasses such as Cleric, Sorcerer, Warlock), background, level
- **Step 2 — Ability Scores**: Standard Array, Point Buy (27 pts), or Roll (4d6 drop lowest); racial bonuses applied in preview
- **Step 3 — Equipment & Skills**: armor picker filtered by class + subclass proficiencies, shield toggle, class skill selection, weapon picker from full SRD catalog
- **Step 4 — Spells** *(caster classes only)*: searchable spell list filtered by class, cantrip + leveled spell limits from class tables

### Vitals & Combat
- HP tracker with inline editing; damage / heal; temp HP setter
- AC chip with ⚠ warning when equipped armor's STR requirement exceeds character's STR
- Spell Save DC and Spell Attack Bonus shown for casters
- Speed, Initiative, Passive Perception
- Death saving throws (successes / failures)
- Inspiration toggle

### Ability Scores & Skills
- Click-to-edit any ability score; AC and HP recalculate live
- Full skill list with proficiency / expertise markers and computed bonuses
- Saving throw proficiencies per class

### Attacks & Weapons
- Weapon table showing computed attack bonus (STR / DEX / max for Finesse, DEX for ranged), damage die, and damage type
- Inline "Add Weapon" row for custom entries

### Spells
- Known spells panel with level badge, school, and concentration marker
- Click any spell to open a full stat card modal (casting time, range, components, duration, description)
- Concentration tracker — one-click activate / drop
- Spell slot pips per level with used / total tracking

### Resources
- Class resources (Rage, Ki, Channel Divinity, Sorcery Points, etc.) as pip trackers
- Totals scale with level from per-class tables
- Recovery type badge (SR / LR) shown per resource

### Actions
- Actions panel grouped by type (Action / Bonus Action / Reaction / Class Abilities)
- Filtered by class and level — only shows abilities the character has unlocked
- Resource cost displayed; depleted-resource actions visually grayed out

### Rest
- **Short Rest**: Hit Dice roller (auto-roll or manual entry), HP recovery capped at max, SR resources reset
- **Long Rest**: Full HP, all spell slots reset, all LR resources reset, death saves cleared

### XP & Leveling
- XP tracker with inline edit; threshold shown per 5e table (level 2–20)
- Level Up button pulses when XP threshold is reached; increments level, recalculates proficiency bonus and max HP

### Conditions
- Toggle standard 5e conditions (Blinded, Charmed, Exhaustion, etc.)

## Data

| File | Contents |
|------|----------|
| `weaponData.ts` | 36 SRD weapons — Simple + Martial, melee + ranged — with damage die, damage type, range classification, and properties (Finesse, Light, Heavy, Versatile, Thrown, Ammunition, Reach, Loading, Two-Handed) |
| `armorData.ts` | All standard armor (light / medium / heavy) plus 7 magic +1 variants; STR requirements for Chain Mail (13), Splint (15), Plate (15) |
| `spellData.ts` | 70+ SRD spells (cantrips through level 5) with full stat blocks |
| `classData.ts` | 14 classes (Barbarian through Wizard + Artificer) with hit die, saving throws, proficiencies, resource scaling tables, spell tables |
| `subclassData.ts` | Full subclass list with unlock levels; Life Domain grants Heavy Armor, Draconic Bloodline overrides unarmored AC to 13 + DEX |
| `raceData.ts` | 23 races with ability bonuses, natural AC formulas, speed, traits; Hill Dwarf has +1 HP/level and bonus weapon proficiencies |

## Domain Rules (`src/renderer/src/domain/rules/`)

Pure functions — no React or Zustand imports:

- `computeAttackBonus(character, weapon)` — STR for melee, DEX for ranged, max(STR,DEX) for Finesse
- `computeSpellSaveDC(character)` — 8 + proficiency + spellcasting ability mod
- `computeSpellAttackBonus(character)`
- `getAvailableActions(character)` — merges generic + class-specific actions filtered by class/level
- `xpForLevel / xpForNextLevel` — standard 5e XP table

## Development

```bash
# Install dependencies
npm install

# Start dev server (opens Electron window)
npm run dev

# TypeScript check
npm run typecheck

# Production build
npm run build
```

> **Note:** Node.js must be in your PATH. On Windows, if `npm` is blocked by execution policy, use `npm.cmd run dev` or `cmd /c "npm run dev"`.

## Project Structure

```
src/
  main/                  Electron main process
  preload/               Context bridge (exposes characterStore IPC)
  renderer/src/
    app/                 Zustand store (state + actions)
    domain/rules/        Pure game logic functions
    entities/character/  Character type definitions
    features/
      character-select/  Character list + creation wizard
    shared/data/         Static SRD data files
    widgets/
      character-view/    Main character sheet UI
```
