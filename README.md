# D&D 5e Character Companion

A desktop + mobile companion app for D&D 5th Edition, built with Electron + Capacitor and React + TypeScript.
Current version: **3.0.0**

> **Guiding principle — no class cage.** The rules engine tracks 5e mechanics rigorously (RAW), but any
> feature, resource, or buff can attach to *any* character. Rules define defaults; they never restrict.
> A Sorcerer can carry maneuvers, a Fighter can hold Metamagic — if the character has the feature, the
> mechanic fires.

## Development

**Requirements:** Node.js ≥ 18 and npm ≥ 9. See [INSTALL.md](INSTALL.md) for full setup, Windows notes, and packaging.

```bash
npm install       # install dependencies
npm run dev       # start dev server + Electron window (HMR)
npm run typecheck # tsc over renderer + main + preload
npm test          # Vitest unit tests once
npm run lint      # ESLint over src + electron
npm run build     # production build into out/
```

> **Windows note:** if `npm` is blocked by PowerShell execution policy, use `cmd /c "npm run dev"`.

---

## Stack

- **Electron 42** — native desktop shell, file-based character persistence
- **Capacitor 7** — iOS/mobile packaging of the same renderer (`npm run build:ios`)
- **React 19 + Vite 7 (electron-vite 5)** — renderer
- **TypeScript 6** — strict types throughout
- **Zustand 5** — global state (character + turn slices)
- **Vitest 4** — unit/integration tests (~440 tests)

---

## Architecture at a glance

The renderer is layered so dependencies point **inward** — UI depends on rules, rules depend on data,
data depends on nothing. Each folder carries its own `README.md` describing its contents and role.

```
electron/            Native shell — main process + preload context bridge   → electron/README.md
scripts/             Build/dev scripts + Python sprite/VFX generators        → scripts/README.md
src/renderer/src/
  app/               Zustand store, ThemeContext, App shell, global.css      → app/README.md
  domain/            Pure game logic — the rules engine (zero React)         → domain/README.md
    character/         v14 schema, migrations, transitional compat layer
    data/              caster catalogs (metamagic, channel divinity)
    migrations/        v1..v14 migration chain
    rules/             ONE engine: defense, mobility, attacks, spellcasting…
  entities/          Character/class/condition/spell/summon type contracts   → entities/README.md
  features/          One folder per UI panel, reusing its own module.css     → features/README.md
  services/          IPC + storage adapter (Electron ⇄ browser/Capacitor)    → services/README.md
  shared/            Static SRD data, equipment catalog, dice lib, helpers   → shared/README.md
  ui/                Look-preserving primitives (Panel, Modal)               → ui/README.md
  widgets/           CharacterView — the main sheet layout + panel router    → widgets/character-view
```

**The split that matters:** `domain/` is pure TypeScript with no React or Zustand imports and is fully
unit-tested. `shared/data/charCalculations.ts` holds the older calculation helpers (AC, HP, initiative,
equipment stats); `domain/rules/*` is the unified engine (attacks, spells, actions, economy, resources).
Both are live during the transitional period — see [domain/README.md](src/renderer/src/domain/README.md).

---

## Character schema (v14)

The `Character` type stores generic `featureState: Record<featureId, FeatureState>` — `{ known, active,
choice, on, locked, uses, data }` — instead of ~20 one-off class fields. A v13→v14 migration folds legacy
fields (rage toggle, fighting style, maneuvers, invocations, wild-shape form, hex-warrior weapon, …) into
`featureState` on load. A transitional compat layer (`domain/character/compat.ts`) bridges reads during
the migration period. Details in [domain/character/README.md](src/renderer/src/domain/character/README.md).

---

## Feature highlights

- **Character creation wizard** — basics, ability scores (Standard Array / Point Buy / Roll), equipment &
  skills filtered by proficiency, spells for casters.
- **Vitals & combat** — HP/temp-HP, AC with STR-requirement warning, speed, death saves, inspiration.
- **Abilities** — click any ability modifier, save, or skill row for a third-column breakdown card
  (base + ASI history + feats + equipment + floors).
- **Equipment** — armor/weapon/accessory slots, attunement (auto-attune on equip, 3-item cap), a full
  shop, and an item editor writing weapons + gear to user CSV. Accessory stats (AC, to-hit dice/flat,
  ability bonuses & floors, saves, skills, advantage, bonus/crit damage) aggregate across the sheet.
- **Attacks** — per-weapon breakdown tables (normal/versatile/thrown), special attacks, maneuvers, arcane
  shots, buff riders, and equipment riders, with crit resume and Norm/Adv/Dis toggles.
- **Casters** — metamagic (real point costs, spell-influence mapping), Font of Magic slot↔point
  conversion, per-domain/oath Channel Divinity catalogs, Portent, Wild Shape tables, and more.
- **Buffs, conditions, summons, resources, rest, XP/leveling** — each its own panel; see
  [features/README.md](src/renderer/src/features/README.md).

---

## Testing & verification

Every change is gated on: `npm run typecheck`, `npm test` (Vitest), `npm run build`, `npm run lint`
(0 errors). Tests live in `src/renderer/src/__tests__/` and exercise the migration chain, the rules
engine (both calculation paths), equipment stats, and caster parity.

## User data location

| Platform | Path |
|----------|------|
| Windows | `%APPDATA%\character-sheet\` |
| macOS | `~/Library/Application Support/character-sheet/` |
| Linux | `~/.config/character-sheet/` |

Character saves (per-character JSON), custom equipment CSVs (`equipment/`), and summon templates live
here and persist across updates. See [INSTALL.md](INSTALL.md) for details.
