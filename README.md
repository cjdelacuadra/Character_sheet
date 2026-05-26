# D&D 5e Character Sheet

A desktop companion app for D&D 5th Edition, built with Electron + React + TypeScript.  
Current version: **2.1.0**

## Stack

- **Electron 42** — native desktop shell, file-based character persistence
- **React 19 + Vite 7 (electron-vite 5)** — renderer
- **TypeScript 6** — strict types throughout
- **Zustand 5** — global state
- **Zod 4** — schema validation

## Features

### Character Management
- Create, load, and delete characters; all data persisted to disk per-character
- Character selection screen with HP bar, AC, and background at a glance
- Dark / light mode toggle

### Character Creation Wizard
- **Step 1 — Basics**: name, race, class, subclass (required for level-1 subclasses such as Cleric, Sorcerer, Warlock), background, level
- **Step 2 — Ability Scores**: Standard Array, Point Buy (27 pts), or Roll (4d6 drop lowest); racial bonuses applied in preview
- **Step 3 — Equipment & Skills**: armor picker filtered by class + subclass proficiencies, shield toggle, class skill selection, weapon picker from full SRD catalog
- **Step 4 — Spells** *(caster classes only)*: searchable spell list filtered by class, cantrip + leveled spell limits from class tables

### Vitals & Combat
- HP tracker with inline editing; damage / heal; temp HP setter
- AC chip with ⚠ warning when equipped armor's STR requirement exceeds character's STR
- Spell Save DC and Spell Attack Bonus shown for casters
- Speed display accounts for equipment speed bonuses
- Death saving throws (successes / failures) with a rules detail card
- Inspiration pip tracker (up to 3)

### Ability Scores & Skills
- Click-to-edit any ability score; AC, initiative, and HP recalculate live
- Full skill list with proficiency / expertise markers and computed bonuses
- Saving throw proficiencies per class
- Click any save or skill row to open a detail card with formula breakdown and description

### Equipment & Accessories

#### Armor & Weapon Slots
- Armor picker in the Vitals panel, filtered by class + subclass proficiency; shield toggle
- Equipped armor and shield contribute to AC automatically

#### Accessory Slots
Ten dedicated slots — Helmet, Necklace, Cape, Legs, Boots, Gloves, Quiver, Ring ×2, Amulet — each shown as a sprite chip in the equipment layout. Clicking a chip opens the item detail panel.

Each accessory can carry any combination of:

| Stat type | Example |
|-----------|---------|
| AC bonus | +1 AC |
| To-hit bonus | +1 to attack rolls (melee / ranged / both) |
| Speed bonus | +10 ft movement |
| Ability score bonus | +2 STR |
| Saving throw bonus | +1 CON saves |
| Skill bonus | +2 Perception |
| Advantage | Advantage on DEX saves, death saves, etc. |
| Bonus damage | +1d6 fire (melee / ranged / all) |

All bonuses are aggregated by `computeEquipmentStats` and applied throughout the sheet — AC, initiative, speed, skill checks, attack tables.

#### Shop
- Browse the full catalog (weapons + accessories) filtered by name, kind, or rarity
- Item cards show sprite, rarity-tinted header, stat pills, and gold cost
- Buy to add to inventory, sell items from the Owned column
- Confirm button commits the transaction; gold balance updates live

#### Item Editor
- Create or edit any weapon or gear item (ID, name, kind, rarity, sprite, cost, enchantment bonus)
- Weapons: damage die, damage type, bonus to-hit dice/flat, secondary damage type
- Gear: base AC, AC bonus, bonus damage with `applies to` (melee / ranged / all)
- Stat rows: add any bonus stat from a dropdown (to-hit, speed, ability scores, saves, skills, advantages)
- **To-Hit Applies** select per item — restricts the to-hit bonus to melee, ranged, or both attack tables
- Items saved to CSV in the user data folder; reloaded on next launch

### Attacks & Weapons

#### Single-table weapons
For non-throwable weapons, a single breakdown table shows:
- **Normal** — base to-hit and damage
- **Versatile** (toggle) — two-handed damage die variant
- Special attacks (GWM Power Attack, Divine Smite, Reckless Attack, Sneak Attack, Booming Blade, Sharpshooter) — each toggleable
- BattleMaster maneuvers (Precision, Trip, Disarm, etc.) — automatically added when applicable
- Arcane Shot options (Bursting Arrow, Shadow Arrow, etc.) — for Arcane Archer fighters
- Concentration and buff spell rows (Hunter's Mark, Hex, Divine Favor, etc.) — from active spells
- Equipment bonus rows — gear that contributes to-hit or bonus damage for that attack type

**Opportunity Attack** and **Off-Hand Attack** are generated as separate action entries, not inline rows.

#### Throwable weapons (split tables)
When a weapon has the Thrown property (e.g. Dagger, Handaxe, Spear), the breakdown splits into two labeled sub-tables:

```
Dagger melee
Attack        To Hit   DMG    DMG Type
Normal        +7       1d4    piercing
Booming Blade +0       2d8    thunder
Sneak Attack  —        2d6    piercing

Dagger ranged (20/60)
Attack        To Hit   DMG    DMG Type
Normal        +7       1d4    piercing
Sharpshooter  −5       —      —
Sneak Attack  —        2d6    piercing
```

- Melee-only options (Versatile, GWM, Booming Blade) appear only in the melee table
- Ranged-only options (Sharpshooter, Arcane Shots) appear only in the ranged table
- Shared modifiers (Sneak Attack, spell buffs, BattleMaster maneuvers) appear in both
- Equipment rows with a scoped to-hit bonus appear only in the applicable table

Each table has its own Total row (to-hit sum + damage subtotals by type) and Norm / Adv / Dis toggle. The shared d20 roll result populates both tables.

### Spells
- Known spells panel with level badge, school, and concentration marker
- Click any spell to open a full stat card modal (casting time, range, components, duration, description)
- Concentration tracker — one-click activate / drop; concentration spells highlighted
- Spell slot pips per level with used / total tracking
- **Spell Mastery** *(Wizard level 18)*: designate one 1st-level and one 2nd-level spell for at-will free casts

### Racial Spells
Races that grant innate spellcasting automatically receive the correct spells at the right levels:

| Race | Level 1 | Level 3 | Level 5 |
|------|---------|---------|---------|
| Tiefling | Thaumaturgy | Hellish Rebuke | Darkness |
| Drow | Dancing Lights | Faerie Fire | Darkness |
| Gnome (Forest) | Minor Illusion | — | — |
| Aasimar | Light | — | — |
| Githyanki | Mage Hand | Jump | Misty Step |
| Githzerai | Mage Hand | Shield | Detect Thoughts |

### Class Features & Subclasses
- Actions panel grouped by type (Action / Bonus Action / Reaction / Class Abilities)
- Filtered by class and level — only shows abilities the character has unlocked
- Resource cost displayed; depleted-resource actions visually grayed out
- **Fighting Style** *(Fighters, Rangers, Paladins)*: confirmation step before locking in; permanent once confirmed
- **Arcane Tradition** *(Wizard level 2)*: choose from 8 schools of magic; permanent once confirmed

### Resources
- Class resources (Rage, Ki, Channel Divinity, Sorcery Points, etc.) as pip trackers
- Totals scale with level from per-class tables
- Recovery type badge (SR / LR) per resource

### Rest
- **Short Rest**: Hit Dice roller (auto-roll or manual entry), HP recovery capped at max, SR resources reset
- **Long Rest**: Full HP, all spell slots reset, all LR resources reset, death saves cleared

### XP & Leveling
- XP tracker with inline edit; threshold shown per 5e table (level 2–20)
- Level Up button pulses when XP threshold is reached; increments level, recalculates proficiency bonus and max HP
- ASI / Feat picker on eligible levels

### Conditions
- Toggle standard 5e conditions (Blinded, Charmed, Exhaustion, etc.)

### Dice Roller
- Overlay roller for arbitrary dice expressions; results shown inline

---

## Data

| File | Contents |
|------|----------|
| `equipment/weapons.ts` | 53 weapons — Simple + Martial, melee + ranged — with damage die, type, range, properties, enchantment bonus, and optional bonus to-hit / bonus damage fields |
| `equipment/gear.ts` | 82 armor, shield, and accessory items with full `AccessoryStats` (AC, to-hit, speed, ability scores, saves, skills, advantage, bonus damage) |
| `equipment/csvCodec.ts` | Round-trip serialization of weapons and gear to/from CSV for user-defined items |
| `spellData.ts` | 75+ SRD spells (cantrips through level 5) with full stat blocks |
| `classData.ts` | 14 classes (Barbarian through Wizard + Artificer) with hit die, saving throws, proficiencies, resource scaling tables, spell tables |
| `subclassData.ts` | Full subclass list with unlock levels; Life Domain grants Heavy Armor, Draconic Bloodline overrides unarmored AC to 13 + DEX |
| `raceData.ts` | 23 races with ability bonuses, natural AC formulas, speed, traits, and racial spell grants by level |
| `featsData.ts` | Feat list with ability score improvements (Alert, Mobile, Tough, War Caster, etc.) |

---

## Domain Rules (`src/renderer/src/domain/rules/`)

Pure functions — no React or Zustand imports:

- `computeAttackBonus(character, weapon)` — STR for melee, DEX for ranged, max(STR,DEX) for Finesse; archery bonus for ranged weapons
- `computeSpellSaveDC(character)` — 8 + proficiency + spellcasting ability mod
- `computeSpellAttackBonus(character)`
- `getAvailableActions(character)` — merges generic + class-specific actions filtered by class/level
- `xpForLevel / xpForNextLevel` — standard 5e XP table

Key shared calculation helpers (`src/renderer/src/shared/data/charCalculations.ts`):

- `computeACFull(char)` — armor + shield + DEX cap + enchantment + equipment AC bonuses + ability score bonuses from accessories
- `computeInitiativeFull(char)` — DEX mod + Alert / Jack of All Trades / Remarkable Athlete + DEX bonuses from accessories
- `computeSpeedFull(char)` — base speed + equipment speed bonuses
- `computeEquipmentStats(char)` — aggregates all accessory bonuses across every gear slot

---

## Development

**Requirements:** Node.js ≥ 18 and npm ≥ 9. See [INSTALL.md](INSTALL.md) for full setup.

```bash
# Install dependencies
npm install

# Start dev server (opens Electron window)
npm run dev

# TypeScript check
npm run typecheck

# Run tests
npm test

# Production build (outputs to out/)
npm run build
```

> **Windows note:** If `npm` is blocked by PowerShell execution policy, use `cmd /c "npm run dev"` or prefix commands with `npm.cmd`.

---

## Project Structure

```
src/
  main/                  Electron main process
  preload/               Context bridge (exposes characterStore IPC)
  renderer/src/
    app/                 Zustand store (state + actions)
    domain/              Migrations + pure game logic
    entities/character/  Character type definitions
    features/
      abilities/         Ability scores, saving throws, skills panel
      character-header/  Equipment layout panel (armor + accessory slot grid)
      character-select/  Character list + creation wizard
      combat/            Combat panel (initiative, conditions, turns)
      combat-actions/    Actions panel with attack breakdown tables + feature detail pane
      conditions/        Condition toggles
      detail-panel/      Death save + skill/save detail cards
      dice-roller/       Dice roller overlay
      features-panel/    Class features list
      inventory/         Item editor, item card, shop modal, inventory grid
      level-up/          Level Up modal (ASI / Feat picker + spell selection)
      resources/         Class resource pip trackers
      rest/              Short / Long rest panel
      shop/              Shop panel (catalog + owned columns, buy/sell flow)
      spells/            Spells panel + slot tracker
      vitals/            HP, AC, speed, initiative, death saves, inspiration
    shared/data/         Static SRD data + equipment catalog + CSV codecs
    widgets/
      character-view/    Main character sheet layout and tabs
```
