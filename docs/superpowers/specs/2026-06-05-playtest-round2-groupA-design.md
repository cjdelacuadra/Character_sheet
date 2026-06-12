# Playtest Round 2 — Group A (Quick Wins) Design

**Date:** 2026-06-05
**Scope:** 4 small, low-risk fixes/features from playtest feedback. Group B (prepared-caster
level-up "prepare" step, and the Mage Armor *condition*) is deferred to its own spec.

All paths are under `src/renderer/src/`.

---

## A1 — Starting gold selector + editable gold

**Problem.** Starting gold is hardcoded `Math.max(100 − equipCost, 10)`. Campaigns start with
different amounts, and gold can't be edited after creation.

**Design.**
- **Creation:** add `startingGold: number` to the `Basics` interface/state in
  `features/character-select/CharacterSelectScreen.tsx`. Default = **10 + 10×level** (level 1 → 20).
  When the Level input changes (in `StepBasics`), recompute `startingGold = 10 + 10×level`; the field
  is then freely editable to override (level is normally chosen before gold, so the resync is
  acceptable — document it).
- Render a numeric input directly under the Level field in `StepBasics`.
- **buildCharacter:** `gold: isTestMode ? 10000 : basics.startingGold`. Creation equipment is a
  **free starting kit** — drop the `equipCost` subtraction (the `armorCost`/`shieldCost`/`equipCost`
  locals become unused and are removed).
- **Inventory edit:** make the `💰 {char.gold} gp` display in `features/shop/ShopPanel.tsx`
  click-to-edit (local edit state + number input, commit via `updateCharacter({ gold })`, floored at
  0) — mirror the existing HP/speed inline-edit pattern in `VitalsPanel`.

**Edge cases.** Gold floored at 0 on edit. Test-mode names keep the 10000 override.

---

## A2 — Prepared-spell count: Artificer

**Problem.** `computePreparedSpellCount` (`domain/rules/index.ts`) handles Paladin / Cleric / Druid /
Wizard but returns **0** for Artificer, even though Artificer has `prepareSpells: true`.

**Design.** Add Artificer: `return Math.max(1, level + abilityMod)` (per the provided spec —
Level + INT). Confirm Artificer's `spellcastingAbility` is `'int'` in `classData.ts` so SpellsPanel
passes the INT modifier.

> Note: RAW Artificer is a half-caster (⌊level/2⌋ + INT). This spec implements the stated rule
> (Level + INT); switch to the RAW formula on request.

Everything else is already correct: cantrips are excluded (level-0 guard), and subclass
"always-prepared" spells (`subclassSpells`) are displayed separately and excluded from the cap.

---

## A3 — Lay on Hands & large pools render as a numeric tracker

**Problem.** `ResourcesPanel` renders `Math.min(total, 20)` discrete pips. Lay on Hands (5×level =
20 HP at level 4) shows 20 clickable pips — it's an HP **pool** spent in arbitrary amounts, not 20
uses.

**Design.** In `features/resources/ResourcesPanel.tsx`, branch per resource on `res.total > 12`:
- **Pool (total > 12):** render a compact numeric control — `remaining / total`, a `−` button
  (spend 1), a `+` button (recover 1), and a small number input to **set remaining directly** (so you
  can spend e.g. 7 HP of Lay on Hands at once). All writes go through the existing
  `update({ resources: { …, [name]: { ...res, used } } })`; clamp `used` to `[0, total]`
  (`used = clamp(total − typedRemaining, 0, total)`).
- **Discrete (total ≤ 12):** keep the current pip rendering unchanged (Bardic Inspiration, Action
  Surge, Second Wind, low Ki, etc.).

**Effect.** Lay on Hands, high-level Ki, and high Sorcery Points become numeric; small resources stay
pips. Threshold `12` is a single constant, easy to tune.

---

## A4 — Auto-dismiss short-duration spells on Next Turn

**Problem.** Spells whose effect ends "at the start of your next turn" (e.g. Booming Blade) aren't
cleared when the player advances the turn.

**Design.** The mechanism already exists: `turnSlice.registerEndOfTurnBuff(charId, spellId)` adds to
`endOfTurnBuffIds`, and `confirmNextTurn` clears those ids from `activeBuffSpells`.
- Add a helper `endsAtStartOfNextTurn(spell): boolean` (in `domain/rules` or alongside spell data)
  that normalizes `spell.duration` and returns true for `"1 round"` / `"start of your next turn"` /
  `"until the start of your next turn"` (**auto-detect by duration text**).
- **Data fix:** Booming Blade's duration is wrongly `'Instantaneous'` → set to `'1 round'`; do the
  same for Green-Flame Blade (`green-flame-blade`, present at spellData.ts:253).
- In `SpellsPanel.castSpell`: if `endsAtStartOfNextTurn(spell)`, add `spell.id` to `activeBuffSpells`
  (tracked-active marker; harmless — it carries no `attackBuff`/`setsBaseAC`) and call
  `registerEndOfTurnBuff(char.id, spell.id)` (pull the action from `useAppStore`).
- Next Turn already clears them via `confirmNextTurn`; verify the NextTurnChecklist surfaces/clears
  them.

---

## Verification (Group A)

1. **Gold:** create a level-7 character → gold defaults to **80**, editable at creation; equipment is
   free; the Shop gold field is click-to-edit and persists.
2. **Artificer prepared count:** an Artificer shows Prepared `x/(level + INT mod)`; cantrips and
   subclass always-prepared spells don't count.
3. **Lay on Hands:** a level-4 Paladin shows **`20/20`** with −/＋ and a set-amount field (spend 7 →
   `13/20`); a 1st-level Bard's Bardic Inspiration still shows pips.
4. **Next Turn:** cast Booming Blade → it registers as end-of-turn; hit Next Turn → it's cleared.
5. Run `npm test` + `npm run build`; add unit tests for `endsAtStartOfNextTurn` and the pool
   clamp/threshold logic. No regressions beyond the known pre-existing failures.

---

## Deferred to Group B (separate spec)

- **Prepared-caster level-up "prepare" step** (Cleric/Druid/Paladin/Artificer get a prepare picker up
  to the new limit on level-up; known casters unchanged). Needs a "prepare mode" on the spell-
  selection modal and level-up flow wiring.
- **"Mage Armor" condition** in the Conditions panel that toggles the same `activeBuffSpells`
  ['mage-armor'] state, so it can be applied to anyone as if an ally cast it.
