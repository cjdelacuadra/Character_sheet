# Racial Actions System + Race Expansion — Design

**Date:** 2026-06-06
**Goal:** Make active racial features usable in play (click‑to‑use, action‑economy aware,
once‑per‑rest tracking) and expand the race roster (~40 new races) to match the provided table.
**Phasing:** Build the system + a **first batch of common races**; remaining races follow in a
second pass. All paths under `src/renderer/src/`.

---

## Part 1 — Racial Actions system (the reusable core)

### Data model — extend `RaceDef` (`shared/data/raceData.ts`)
```ts
export type RacialActionCost = 'action' | 'bonus' | 'reaction' | 'free' | 'passive'

export interface RacialAction {
  id: string                       // unique within race, used for use-tracking
  name: string
  cost: RacialActionCost
  minLevel?: number                // unlocks at this level (default 1)
  recharge?: 'short' | 'long'      // present ⇒ limited use; absent ⇒ at-will / passive
  maxUses?: number | 'prof'        // uses per recharge (default 1 when recharge set)
  description: string
  // Optional auto-applied effects on Use (everything else is descriptive + tracked):
  grantsTempHp?: string            // formula w/ tokens: dice, flat, "level", "conmod", "prof"
  selfHeal?: string                // same token grammar
}

// on RaceDef:
racialActions?: RacialAction[]
```
Keep auto-effects minimal (`grantsTempHp`, `selfHeal`). Damage/teleport/AC-reduction effects are
conveyed in `description` and the player applies them — the system's job is **usability + tracking**.

A small token resolver `resolveRacialFormula(formula, char)` expands `level` / `conmod` / `prof`
then rolls dice via `rollDiceExpr`.

### Use-tracking — new character field
- Add `racialActionUses?: Record<string, number>` to `Character` (used counts keyed by `actionId`).
- **Rest recovery** in `characterSlice`: `longRest` clears `racialActionUses` entirely;
  `shortRest` clears only entries whose action has `recharge: 'short'` (look up the race's actions
  to know which). Mirror the existing resource-reset pattern.

### UI — new `RacialActionsPanel` (left column, under Features)
- Lists `raceDef.racialActions` with `minLevel ≤ char.level`.
- Each row: name + **cost badge** (Action/BA/Reaction/Free/Passive), uses remaining (`x/max`) when
  limited, description, and a **Use** button (hidden for `passive`; disabled at 0 uses).
- **Use** handler:
  - If `cost ∈ {action,bonus,reaction}` → `useEconomy(char.id, cost)`.
  - If `recharge` set → increment `racialActionUses[id]` (clamped to max).
  - Apply `grantsTempHp` (non-stacking `Math.max`) / `selfHeal` (cap at max HP) if present.
- Reuse the existing economy store (`useAppStore().useEconomy`) and `update`.

`maxUses: 'prof'` resolves via `profBonus(level)`. This panel is additive; FeaturesPanel still shows
the full trait text.

---

## Part 2 — Race data (stats, traits, spells, AC, HP)

For every race: correct `abilityBonus` per the table, `speed`, `size`, `darkvisionRange`, full
`traits` text, and wire the mechanics the app already supports:
- **Spell features** → `racialSpells` (verify each referenced spell id exists in `spellData.ts`;
  add any missing simple spells, else leave the feature as trait text only).
- **AC features** → `naturalAC` (Loxodon `12+CON`, etc.).
- **HP features** → `bonusHpPerLevel`.
- **Active features** → `racialActions` (Part 1).

Existing 23 races already match the table on ability bonuses (spot-checked) — this is a verify pass
for them, plus retrofitting `racialActions` onto a few (Dragonborn Breath Weapon, Tabaxi Feline
Agility, Tortle Shell Defense, Half‑Orc Relentless Endurance, Lizardfolk Hungry Jaws,
Aasimar Healing Hands).

### First batch (validates every cost/effect/recharge shape)
New races: **Aarakocra** (passive flight), **Goliath** (Stone's Endurance — reaction, `prof`/LR),
**Orc** (Adrenaline Rush — bonus, temp HP = `prof`), **Goblin** (Fury of the Small — free, 1/short;
Nimble Escape — bonus passive), **Bugbear** (Surprise Attack — passive note; Long‑Limbed reach),
**Firbolg** (Hidden Step — bonus, 1/short), **Genasi ×4** (Air/Earth/Fire/Water — racialSpells +
Reach‑to‑the‑Blaze etc.), **Eladrin** (Fey Step — bonus, 1/short), **Shifter ×4** (Beasthide/
Longtooth/Swiftstride/Wildhunt — bonus, temp HP + AC, `prof`/short).
Retrofit `racialActions` onto: **Dragonborn** (Breath Weapon — action, damage in description scaling
by level, `prof`/short), **Tabaxi** (Feline Agility), **Tortle** (Shell Defense), **Half‑Orc**
(Relentless Endurance — free, 1/long), **Lizardfolk** (Hungry Jaws — bonus, selfHeal = `conmod`),
**Aasimar** (Healing Hands — action, selfHeal = `level`, 1/long).

### Remaining races (second pass)
Aasimar subraces, Centaur, Changeling, Duergar, Sea Elf, Shadar‑kai, Fairy, Forest/Deep Gnome,
Ghostwise Halfling, Harengon, Hobgoblin, Kalashtar, Kobold, Leonin, Loxodon, Minotaur, Satyr,
Simic Hybrid, Feral Tiefling, Triton, Vedalken, Verdan, Yuan‑ti, etc.

---

## Verification
1. `RacialActionsPanel` shows for a Dragonborn: **Breath Weapon** with an Action badge, `1/1` uses,
   and a Use button that consumes the action + a use; rest restores it.
2. Goliath **Stone's Endurance** is a Reaction with `prof`/long‑rest uses.
3. Orc **Adrenaline Rush** (bonus) grants temp HP = proficiency bonus on Use.
4. Shifter **Shift** grants temp HP and is limited by `prof`/short rest.
5. Ability bonuses for a few new races match the table at creation.
6. `npm test` + `npm run build` clean; add unit tests for `resolveRacialFormula` and rest recovery
   of `racialActionUses`. No new regressions beyond the known 15 pre-existing failures.
