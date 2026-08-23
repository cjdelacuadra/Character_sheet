# FFXIV Compendium — Transcription Index

> **Status (Phases 1–5):** Races ✅ · Spells ✅ · Role Feats ✅ · Warrior class ✅ (remaining 23
> classes deferred by user) · Cross-connection sweep ✅ **0 dangling refs**. Final gate green:
> typecheck ✓ · vitest 469 pass (1 unrelated pre-existing `realSaves` env failure) · eslint ✓ ·
> build ✓. Sweep script: `E:/ff-extract/ff-sweep.mjs`.


Source: `implementation/ff-source/ffxiv-compendium.txt` (text layer extracted from the 210-page
"5th Edition D&D x Final Fantasy XIV - Classes and Races Compendium" PDF, Dawntrail Edition,
accurate to April 2025). Line numbers reference that file.

Every content phase transcribes from THIS index, not from memory. `source: 'FFXIV'` on races/feats.

---

## Chapter 1 — Races (lines ~169–1152)

Model: each subrace = a **top-level `RaceDef`** with parenthetical label (existing Elf/Genasi
pattern). Base-race traits merge into each subrace entry. Skill proficiencies / advantage-vs-X /
darkvision go in `traits[]` unless a structured field fits (`naturalAC`, `saveAdvantages`,
`racialSpells`, `racialActions`, `bonusWeaponProficiencies`, `bonusHpPerLevel`, `darkvisionRange`).

### Au Ra (base: WIS+2, medium, speed 30; Perception prof; **Scaled Bodies** naturalAC = 11 + DEX)
- **Au Ra (Xaela)** — STR+1. Nomadic Instincts (Survival prof). Savage Attacks (extra weapon damage
  die on melee crit). `abilityBonus {wis:2, str:1}`, `naturalAC {base:11, addDex:true}`.
- **Au Ra (Raen)** — CHA+1. Polite Society (Persuasion prof). Unwavering Loyalty (**adv vs charmed**
  → `saveAdvantages`). `abilityBonus {wis:2, cha:1}`, `naturalAC {base:11, addDex:true}`.

### Elezen (base: INT+2, medium, speed 30; **Superb Hearing** = adv on hearing-based Perception; +1 language)
- **Elezen (Wildwood)** — DEX+1. Hawk Sight (+20ft ranged normal range). Natural Shrewdness (Insight prof).
- **Elezen (Duskwight)** — CON+1. Cave Dweller (adv on Stealth in caves/dim/dark). **Darkvision 60**.
- **Elezen (Ishgardian)** — STR+1. Conscription (shortswords, shortbows, spears prof → `bonusWeaponProficiencies`). Halone's Scriptures (Religion prof).

### Garlean (single race: STR+2/INT+1, medium, speed 30; +1 language Garlean)
- Imperial Education (1 skill + 1 artisan tools of choice). Spatial Insight (Investigation prof).
  Third Eye (Perception prof; +10ft ranged normal range). Optional trait **Magically Inert** (flavor;
  note in `traits[]`). `abilityBonus {str:2, int:1}`.

### Hrothgar (base: STR+2, medium, speed 30; **Powerful Build**)
- **Hrothgar (Helion)** — DEX+1. Lionhearted (**adv vs frightened** → `saveAdvantages`). Aggressive
  (bonus action: move up to speed toward a visible/heard enemy, end closer → `racialActions` cost:'bonus').
- **Hrothgar (The Lost)** — CON+1. Contractor's Life (Persuasion prof). Unbending (**adv vs charmed**).

### Hyur (base: any +1 [omit from abilityBonus — player-choice], medium, speed 30; Spread of Culture [tool/gaming/instrument]; Versatility [2 skills]; +2 languages)
- **Hyur (Midlander)** — INT+2. Variable Education (extra artisan tools). `abilityBonus {int:2}` (+ note the base any-+1).
- **Hyur (Highlander)** — STR+2. Naturally Honed Body (Athletics prof). `abilityBonus {str:2}`.
- **Hyur (Padjal)** — variant. WIS+2. Nature's Blessing (Nature prof). `abilityBonus {wis:2}`.
  (Base "any +1" is a player creation choice; represent as a trait note — not encodable in fixed `abilityBonus`.)

### Lalafell (base: CHA+2, **small**, speed 25; **Cunning** = adv on INT/WIS/CHA saves vs magic; Lalafellin Nimbleness [move through larger creatures' space]; +1 language)
- **Lalafell (Plainsfolk)** — DEX+1. Naturally Stealthy (hide behind larger creature).
- **Lalafell (Dunesfolk)** — INT+1. Dustshield (**adv vs blinded**). Land of Merchants (Deception prof).
- (Spoiler subrace "Dwarf" in Appendix B, line ~11911 — defer / optional.)

### Miqo'te (base: DEX+2, medium, speed 30; **Darkvision 60**; Predation [Perception prof]; +1 language)
- **Miqo'te (Seekers of the Sun)** — CHA+1. Natural Athleticism (Athletics prof). Graceful Speed (**speed 35**).
- **Miqo'te (Keepers of the Moon)** — WIS+1. **Superior Darkvision 120**. Tenacity (drop to 1 HP
  instead of 0, once per long rest → `racialActions` recharge:'long', cost:'reaction'/'passive').

### Roegadyn (base: CON+2, medium, speed 30; **Brave** = adv vs frightened; **Powerful Build**; +1 language Roegadyn)
- **Roegadyn (Seawolf)** — STR+1. Sailor's Swimming (adv on Athletics/swimming). Toughness (+1 HP
  max, +1 per level → `bonusHpPerLevel: 1`).
- **Roegadyn (Hellsguard)** — CHA+1. Magical Knowledge (Arcana prof). **Volcanic Children**: know
  `firebolt` cantrip; L3 `burning-hands` (cast at 2nd once/long rest); L5 `heat-metal` once/long
  rest; CHA is casting ability. → `racialSpells {1:['firebolt'], 3:['burning-hands'], 5:['heat-metal']}`
  **CONNECTION CHECK — RESOLVED:** `fire-bolt` (note the hyphen — NOT `firebolt`) and `burning-hands`
  exist in `spells.json`; **`heat-metal` does NOT exist in the catalog** (checked spells.json = 199
  spells, and spellData.ts). Per plan rule, Heat Metal (L5) is DEFERRED: `racialSpells` ships as
  `{1:['fire-bolt'], 3:['burning-hands']}`, the L5 Heat Metal grant is noted in `traits[]`, and it
  will be re-wired in **Phase 2** once a `heat-metal` spell is added. Once/long-rest limits on
  burning-hands/heat-metal have no exact RaceDef field; `racialSpells` grants them as known and the
  limit is documented in `traits[]`.

### Viera (base: DEX+2, medium, speed 35; Lapine Hop [+10ft jump]; **Lucky** [reroll nat 1]; Mask of the Wild [hide when lightly obscured by nature]; Speak with Small Beasts; +1 language Viera)
- **Viera (Rava)** — WIS+1. Powerful Presence (Intimidation prof).
- **Viera (Veena)** — INT+1. Approachable (Persuasion prof).

**Phase-1 open items to resolve during transcription:**
- Hyur base "any +1": not representable in fixed `abilityBonus`; note in `traits[]`.
- Hellsguard `racialSpells` ids: verify exact catalog ids (`fire-bolt` vs `firebolt`) and whether
  `burning-hands`/`heat-metal` exist; if missing, defer to after Phase 2 or drop from `racialSpells`.
- Structured vs `traits[]`: advantage-vs-charm/frightened/blinded → `saveAdvantages` (needs a `vs`
  string + `source` label); everything else informational → `traits[]`.

---

## Chapter 2 — Classes (lines 1164–9491) — Phase 4 (TS-only, no JSON). IN PROGRESS.
Class summary table lines 1164–1254 lists all 24 classes with hit die / saves / proficiencies:
Astrologian(d8 WIS/CHA), Bard(d8 DEX/CHA), Black Mage(d6 INT/WIS), Blue Mage(d8 DEX/INT),
Dancer(d8 DEX/CHA), Dark Knight(d10 CON/CHA), Dragoon(d10 STR/DEX), Gunbreaker(d10 STR/DEX),
Machinist(d8 DEX/INT), Monk(d10 STR/DEX), Ninja(d8 DEX/INT), Paladin(d10 CON/CHA),
Pictomancer(d8 WIS/CHA), Reaper(d10 STR/WIS), Red Mage(d8 DEX/CHA), Sage(d6 INT/WIS),
Samurai(d10 STR/WIS), Scholar(d6 INT/WIS), Summoner(d6 WIS/CHA), Viper(d8 STR/DEX),
Warrior(d12 STR/CON), White Mage(d6 WIS/CHA).

### Warrior — DONE ✅ (template vertical, martial non-caster; Barbarian analog). Lines 9262–9492.
- `ClassDef` Warrior (d12, STR/CON, light/medium/shields + simple/martial, skills 2 of 5,
  asiLevels [4,8,12,16,19], resource **Berserk** 2→6 by level) in `classData.ts`.
- `CLASS_FEATURES_DATA['Warrior']` — 15 features L1–20 (Berserk, Unarmored Defense, Fighting Style,
  Reckless Attack, Bestial Archetype, Extra Attack, Onslaught, Tongue of Beasts, Raw Intuition,
  Overpower, Vengeance, Shake It Off, Beastly Reflexes, Holmgang, Infuriate).
- 3 subclasses in `subclassData.ts` (unlock L3, features 3/6/10/14): **Beast of Defiance**,
  **Beast of Deliverance**, **Unchained Beast**.
- 3 class actions (`ff-berserk` [resourceKey Berserk], `ff-overpower`, `ff-holmgang`) in
  actionsData.ts + actions.json (classOnly Warrior).
- VERIFY: typecheck ✓ · 24 catalog tests ✓ (assertActionResourceKeys accepts Berserk) · eslint ✓ ·
  no leak to other classes. Prose-only spell mentions (Speak with Animals ✓ exists; Beast Sense —
  not in catalog, referenced only in feature text, NOT a structured ref, so no dangling link).

### Scholar — DONE ✅ (full caster, INT/prepared, pet subsystem). Lines 7714–8310.
- `ClassDef` Scholar (d6, INT/WIS, no armor, dagger/dart/sling/quarterstaff/light-crossbow, skills 2
  of 6, `isSpellcaster`+`prepareSpells`+`spellcastingAbility:'int'`, cantrips 3→5, asiLevels
  [4,8,12,16,19], resource **Tactics** = PB uses, short/long rest) in `classData.ts`.
- **Spellcasting wiring:** added `'Scholar'` to `FULL_CASTERS` (`spellSlots.ts`) and to
  `computePreparedSpellCount` (`spellcasting.ts`, prepares level+INT mod like Cleric/Wizard).
- `CLASS_FEATURES_DATA['Scholar']` — 7 features (Spellcasting, Tactics, Scholar Specialization,
  Aetherial Ally, L5 ally scaling, Quicksilver Summoning, Grand Design).
- 3 subclasses (unlock L2, features 2/6/10/14): **Arcanist**, **Nymian**, **Tactician**.
- 4 summon templates in `summonTemplates.ts` + `summonTemplates.json` (`usesCasterPB:true`,
  level-scaled `maxHpFormula`): **ff-carbuncle**, **ff-nymian-fey**, **ff-proto-carbuncle**,
  **ff-seraph**. (Their `spells` are free-text notes, not id refs — no dangling links.)
- 5 class actions (Aetherial Ally, Quicksilver Summoning, 3 Tactics consuming the Tactics pool) in
  actionsData.ts + actions.json (classOnly Scholar). Full Tactics list (~26) documented in notes.
- VERIFY: typecheck ✓ · 31 catalog/snapshot/role tests ✓ (assertActionResourceKeys accepts Tactics)
  · eslint ✓ (only 2 pre-existing warnings) · build ✓ · sweep 0 dangling (classIds now 15).

#### Scholar spell list — DONE ✅ (full fidelity). Compendium "Scholar Spells" list, lines 10456+.
- Extracted the exact printed list by column-slicing the 4-column PDF layout
  (`E:/ff-extract/scholar-pages.txt` → `scholar-names.txt`, 233 spell names).
- **122 already existed** → added `'Scholar'` to their `classes[]` (both `spells.json` and
  `spellData.ts`, kept in parity).
- **112 were missing** → authored full PHB/sourcebook entries (level/school/casting/range/components/
  duration/description + damage/save/aoe/scaling wiring), each tagged `'Scholar'` + its real 5e class
  lists (so Wizard/Cleric/etc. benefit too). Exotic ones flagged in-description: Blade of Disaster,
  Reality Break, Pulse Wave, Temporal Shunt, Ashardalon's Stride, Enemies Abound, Frost Fingers,
  Motivational Speech, Mental Prison, Soul Cage (Xanathar's/Tasha's/EGtW/Fizban's/IDRotF/AI).
  Generator: `E:/ff-extract/ff-phb-spells.mjs`.
- **Result: 233/233 Scholar spells present & tagged.** Catalog grew 296 → 408 spells; 234 list Scholar.
- **Review pass:** fixed `power-word-kill` (save→auto-hit; it has no save); removed invalid
  `vizCategory:'utility'` from 37 entries (not a valid enum value — utility spells omit vizCategory);
  spot-checked 58 spell levels vs canonical 5e (all correct); cantrips correctly omit scalingDice
  (they scale by character level, like fire-bolt). All summons.templateId refs resolve.
- VERIFY: typecheck ✓ · 31 catalog tests ✓ · eslint ✓ · full suite 469 pass · build ✓ · sweep 0 dangling.

#### Prepared-spell logic review — FIXED ✅
The Scholar is a **spellbook-prepare** caster per the compendium (spellbook of 6 + 2/level; prepare
INT mod + level from the book). Two real bugs found & fixed:
1. **Scholar had no spellbook** — it was configured `prepareSpells: true` with NO `spellsKnownTable`,
   making it a Cleric-style "prepare from the ENTIRE 234-spell list" caster. Added the Wizard's
   `spellsKnownTable` (6 at L1, +2/level) to `classData.ts` → now learns into a spellbook and
   prepares a subset (the CharacterView `prepareSpells && spellsKnownTable` branch).
2. **Spellbook UI was gated on `isWizard = classId==='Wizard'`** in `SpellsPanel.tsx`, so the Scholar
   fell into the wrong branch (prepare-from-all, no learn-into-book UI, "Known" not "Spellbook"
   label). Generalized to `usesSpellbook = Wizard || (prepareSpells && spellsKnownTable)`. The
   Wizard-only savant copy-cost discount stays keyed to `classId==='Wizard'`.
3. **Latent trap:** `computePreparedSpellCount` is defined TWICE — the live one in
   `domain/rules/index.ts` (exported to consumers) and a shadowed dead copy in `spellcasting.ts`.
   My prior session edited only the dead copy, so the Scholar was silently getting 0 prepared spells;
   the new `rules.test.ts` Scholar case caught it. Fixed the live copy in index.ts.
Math verified vs the book's own example (L3 Scholar, INT 16 → 6 prepared; spellbook 6→14→+2/level).
Added regression test `rules.test.ts` "Scholar level 3, INT 16 = 6". Full suite 472 pass, build ✓.

### Remaining 22 classes — TODO. Detail sections span lines ~1336 (Astrologian) → 9491.
Each needs: ClassDef + CLASS_FEATURES_DATA[id] (L1–20) + ≥1 SubclassDef + class ActionDefs +
(casters) spellcasting wiring in spellSlots.ts / spellcasting.ts / progression.ts. Casters' spell
lists should reference the FF spells added in Phase 2 (classes[] already tag Black/White/Red Mage).

## Chapter 3 — Spells / Created Spells (lines ~10659–11651) — Phase 2 DONE ✅
**97 spells** transcribed into `spellData.ts` + `spells.json` via `E:/ff-extract/ff-spells.mjs`
(single source of truth; `ff-` id prefix, plus PHB `heat-metal`). Full mechanical wiring
(saveAbility/scalingDice/aoeShape/aoeSize/attackType/damageType/buffCategory/vizCategory).
`classes[]` = PHB analog (usable now) + FF job (Black/White/Red Mage — future-correct for Phase 4),
per the book's "Classes Receiving Spells" tables (lines 11656–11750).
Families: Aero/Aerora/Aeroga/Aeroja · Banish I–IV · Bar-Element(-ra) · Bio/Biora/Bioga/Bioja/Biolysis ·
Blizzard I–IV · Fire I–IV/Flare · Thunder I–IV · Stone I–IV · Water I–IV · Dark(-ra/-ga/-ja) ·
Ruin I–IV · Ver-line (Veraero/Veraeroga/Verfire/Verflare/Verholy/Verstone/Verthunder/Verthundaga) ·
Cure line (Cure/Cura/Curada/Curaga/Curaja) + Lustrate/Tetragammaton/Assize/Asylum/Collective
Unconscious · buffs (Bravery/Faith/Protection/Shell/Sacred Soil/Regen/En-Element) · uniques
(Jolt/Malefic/Scathe/Gravity/Comet/Meteor/Demi/Demira/Demi Ultima/Holy/Foul/Freeze/Flood/Quake/
Tornado/Electron/Celestial Opposition/Break/Drain/Doom/Doomsday/Osmose/Xenoglossy/De-Element/
Imperil/Esuna/Refresh) · **heat-metal** (PHB) added → Hellsguard L5 racialSpells restored.
VERIFY: typecheck ✓ · 24 catalog tests ✓ · eslint ✓ · 0 dangling refs · 296 total spells.
Multi-type damage spells (e.g. "4d8 poison + 4d8 necrotic") store the primary type in `damageType`;
the full breakdown lives in `description` (schema has one damageType field).

## Chapter 4 — Role Action Feats (lines 11755–11858) — Phase 3 DONE ✅
**10 feats** (5 roles + 5 Hearts) → `featsData.ts`/`feats.json`; **17 role actions** →
`actionsData.ts`/`actions.json` (via `E:/ff-extract/ff-feats.mjs`). Each per-rest ability = a
feat-granted resource pool + a consuming `ActionDef` (resourceKey = pool name).

**Model change (per user):** `FeatDef.grantsResources` value is now
`number | { flat?, profFactor? }`; `resolveGrantedResourceAmount(v, pb) = flat + profFactor*pb`
(min 0) — wired into `addFeat`/`removeFeat` (`characterSlice.ts`) using `profBonus(char.level)`.
"Prof-bonus times/long rest" abilities use `{ profFactor: 1 }`; "once/rest" uses `1`. The **feat
editor** now shows `[flat] + [factor] × PB` inputs (`FeatEditorForm.tsx`), storing a plain number
when factor is 0 (back-compat) else the formula object.

**Gating fix:** `getAvailableActions` (`domain/rules/index.ts`) now hides an action whose
`resourceKey` is a **feat-only** pool (not seeded by any class) unless the character has a granting
feat — otherwise a bare `resourceKey` with no `classOnly` leaked the action to everyone. Class pools
(e.g. Sorcery Points ↔ Metamagic) are excluded so class actions keep their gating.

Tests: `__tests__/ffRoleActions.test.ts` (7) — resolver math/clamp, PB-scaling, feat-only gating.
VERIFY: typecheck ✓ · 24 catalog + 7 new tests ✓ · eslint ✓ · assertActionResourceKeys ✓ ·
0 dangling (feat prereqs, action resourceKeys, spell refs).
5 role feats + 5 "Heart of …" upgrades, each = `abilityBonus`/`abilityChoice` +1 plus several
per-rest actions. Map to `FeatDef` (abilityChoice, prerequisites for the Hearts) + `ActionDef`s
(the per-rest role actions: Provoke, Rampart, Interject, Reprisal, Cleric Stance, Surecast, Rescue,
Swiftcast, Arm's Length, Recuperate, Feint, True North, Addle, Lucid Dreaming, Peloton, Blunt Shot,
Maiming Shot). Uses proficiency-bonus / long-rest recharge — needs a granted resource pool or
racialAction-style tracking; watch `assertActionResourceKeys()`.
- **Role of the Vanguard** (STR/CON): Provoke (bonus, prof/long), Rampart (reaction, 1/short).
  Heart of the Vanguard (prereq): Interject (reaction), Reprisal (bonus, prof/long).
- **Role of the Soothesayer** (INT/WIS/CHA): Cleric Stance (prof/long), Surecast (reaction, 1/long).
  Heart of the Soothesayer (prereq): Rescue (action, 1/long), Swiftcast (1/long).
- **Role of the Destroyer** (STR/DEX): Arm's Length (reaction, prof/long), Recuperate (bonus, 2d4+level, 1/long).
  Heart of the Destroyer (prereq): Feint (prof/long), True North (bonus, 1/long).
- **Role of the Magus** (INT/WIS/CHA): Swiftcast (1/long), Lucid Dreaming (1/long).
  Heart of the Magus (prereq): Addle (bonus, prof/long).
- **Role of the Sniper** (DEX): Arm's Length (reaction, prof/long), Peloton (bonus, prof/long).
  Heart of the Sniper (prereq): Blunt Shot (reaction, prof/long), Maiming Shot (prof/long).

## Appendix A — Machinist firearms (lines 11863+) — equipment, out of scope for P1–P4.

## Appendix B — Spoiler Races (line ~11911: Lalafell Dwarf subrace, etc.) — optional/deferred.
