# Connection Audit — Character_sheet

_Generated 2026-07-21. Scope: detect cataloged-but-not-connected features across
subclasses, equipment, feats, spells, summons, wild shape, conditions, buffs,
actions, races, resources. Four checks: referential integrity · reflect-effect-vs-declared ·
orphan · coverage & completeness._

---

**Catalog source of truth:** on-disk data files under `src/renderer/public/equipment_data/`
(`feats.json`, `races.json`, `conditions.json`, `actions.json`, `spells.json`,
`summonTemplates.json`, `wildShapeBeasts.json`, `gear.csv`, `weapons.csv`) seeded from TS
defaults via `shared/data/contentLoader.ts` (disk wins). `subclassData.ts`, `classData.ts`,
`classFeaturesData.ts` and the secondary catalogs (maneuvers/runes/invocations/…) are TS-only.

---

## 1. How "connection" works (the resolver model)

Every mechanical modifier is meant to become an `Effect` (`domain/effects.ts`) and be folded
by `collectActiveEffects` (`domain/collect.ts`), then consumed by the rules modules
(`domain/rules/*`, `shared/data/charCalculations.ts`). The math never checks a class id — the
app's "no class cage" principle.

**Only three sources feed that fold:** buff spells, conditions, equipment (equipment also
absorbs `FeatDef.stats` / `RaceDef.stats` through `computeEquipmentStats`). Everything else —
subclass features, most feats, actions, resources, wild shape, summons — is wired through
separate, mostly **id-hardcoded** paths (`char.subclass === 'X'`, `feats.includes('y')`), or
not wired at all. That gap is where "cataloged but not connected" lives.

Definitions used below:
- **`expects_effect`** — the description promises a mechanical change (not lore/utility). This
  is the key flag separating *flavor* from *forgotten*.
- **`handler=null`** — declared, but no resolver is reached.

---

## 2. Check 1 — Referential integrity ✅ (essentially clean)

Cross-referenced every id pointer against the on-disk catalogs (script over
`public/equipment_data/*` + regex extraction from `subclassData.ts` / `raceData.ts`):

| Reference | Distinct refs | Dangling |
|---|---:|---:|
| `subclassSpells` → `spells.json` | 102 | **0** |
| `racialSpells` → `spells.json` | 13 | **0** |
| feat `grantedSpells` / `freeCastSpells` → `spells.json` | 3 | **0** |
| `action.resourceKey` → resource-name universe | 13 keys | **0** |

- The memory-flagged `contagion` / `aura-of-life` appear **only in TODO comments**, never in a
  live `subclassSpells` block — **not** broken references.
- **Soft gap:** the `action.resourceKey` ↔ `ResourceDef.name` link is a **string match** across
  `classData` resources, feat `grantsResources`, and `channelDivinityData` — no compile-time
  guarantee. A typo (`"Ki "` vs `"Ki"`) would silently create a dead action. **Recommend a
  startup assertion** that every `resourceKey` resolves.

---

## 3. Check 2 — Reflect-effect vs. only-declared (core finding)

### Subclasses — the largest disconnect
- **110 subclasses / 535 `subclassFeatures` entries.** Type is
  `FeatureEntry = {level, name, desc}` — **pure text, no effect field structurally possible.**
- Mechanical wiring exists only via side channels:
  - `char.subclass === 'X'` hardcoding in rules — **only 9 subclasses**:
    `ArcaneArcher, BattleMaster, Bladesinger/Bladesinging, Champion, EchoKnight, Samurai,
    Swashbuckler, WarDomain`.
  - `subclassSpells` (42 subclasses), `channelDivinityDesc` (14 → `channelDivinityData`),
    `unarmoredAC` (1), `extra*Proficiencies` (23), plus caster hooks (Moon wild-shape limit,
    Portent, Song of Rest).
- **Everything else is declared-only.** Confirmed `expects_effect=true, handler=null` clusters:
  - **Divine Strike** — *confirmed not wired anywhere* (`grep "Divine Strike"` in `attacks.ts` /
    `index.ts` = false). ~10 cleric domains each promise +1d8→+2d8 once-per-turn.
  - Berserker **Frenzy**, Zealot **Divine Fury**, all **Storm Aura** riders, Spores
    **Halo of Spores / Symbiotic Entity** damage, all **Totem Warrior** benefits
    (explicit `// TODO: mechanical wiring`), Twilight **Eyes of Night** darkvision (explicit
    TODO), Forge/Life AC & resist riders.
  - 6 explicit `TODO: mechanical wiring` comments remain in `subclassData.ts`.

### Feats — 53 total
- 24 carry a structured field; 13 are id-special-cased (overlapping) → **~29 effectively wired.**
- **18 prose-only, no handler:** `charger, crossbowExpert, defensiveDuelist, inspiringLeader,
  lightlyArmored, mageSlayer, magicInitiate, mediumArmorMaster, moderatelyArmored, polearmMaster,
  ritualCaster, shieldMaster, skilled, skulker, weaponMaster, artificer-initiate, eldritch-adept,
  poisoner`.
- **Partially wired** (only part of the text resolves):
  - `heavyArmorMaster` → "−3 physical damage" — no damage-reduction system → **null**
  - `observant` → "+5 passive Perception/Investigation" → **null**
  - `sharpshooter` / `greatWeaponMaster` → −5/+10 **is** wired (`attacks.ts`, `index.ts`);
    "ignore cover / long-range disadvantage" is **not**.
  - `sentinel` → reaction note wired (`index.ts:502`); "speed→0 on OA hit" **null**.
- Wired-by-id (contrast): `alert` (+5 init `charCalculations.ts:228`), `tough` (+2 HP/lvl),
  `mobile` (+10 speed), `dualWielder` (+1 AC + enable), `archery`, `piercer`, `crusher`,
  `spellSniper`, `mountedCombatant`; structured: `abilityBonus/abilityChoice` (ASI),
  `grantsResources`, `grantsChoices`, `grantedSpells`, `grantsProficiencies`, `stats`.

### Conditions — 21 total, 9 compute, 12 `flag`-only
- **Computed & reflected:** the app's own combat conditions — `haste`, `slowed`, `grappled`,
  `restrained`, `stunned`, `paralyzed`, `petrified`, `unconscious`, `difficult-terrain` — emit
  `acDelta` / `speedMultiplier` / `flatSaveDelta` via `collectConditionEffects`.
- **Declared-not-reflected (`flag` only):** `blinded, charmed, concentration, deafened,
  exhaustion, frightened, incapacitated, invisible, poisoned, prone, silence, fly`. Several
  imply attack **advantage/disadvantage** per RAW (poisoned, prone, blinded, invisible), and
  `Effect` *has* an `advantage`/`disadvantage` kind — but `collectConditionEffects` only ever
  emits `flag`. So they surface as a UI note, never computed. (Arguably a deliberate
  tracker-not-simulator choice.)

### Races — 38 total
- All core fields wired (ability bonus, `naturalAC`, `saveAdvantages`, `stats`, `racialSpells`,
  `bonusHpPerLevel`, `darkvisionRange`).
- **Gap inside `racialActions`: 16 of 23 are description-only** (no `grantsTempHp`/`selfHeal`) —
  breath weapons, Feywild step, most damage actions fire **no effect on Use**.

---

## 4. Check 3 — Orphans

- **Dead-code catalogs:** none. `maneuversData, runeData, arcaneShotsData, infusionsData,
  invocationsData, psiWarriorData, fightingStylesData, racialActions, resourceEffects,
  channelDivinityData, metamagicData` are all imported by live UI/rules.
- **Attackless summons (4):** `unseen-servant, mage-hand, familiar-owl,
  eldritch-cannon-protector` — **not orphans**, utility stat blocks by design.
- **Orphaned field:** `SubclassDef.extraToolProficiencies` — declared, explicitly
  "Informational v1 — no rules consumer yet."
- **Potential picker orphans:** spells with empty `classes[]` never granted by any
  subclass/feat/race would be unreachable in pickers — but "no class cage" means spells are
  freely attachable, so low severity. Not enumerated here.

---

## 5. Check 4 — Coverage & completeness scoreboard

| Category | Total | Connected | Declared-only / partial (`handler=null`) | Flavor/utility |
|---|---:|---|---|---|
| **Subclasses** | 110 / 535 feats | 9 combat-cased + 42 spells + 14 CD + prof/AC | **~450+ feature entries** (Divine Strike, Frenzy, auras, totems…) | narrative traits |
| **Feats** | 53 | ~29 | **18 prose-only + ~6 partial** | keenMind, linguist, actor |
| **Conditions** | 21 | 9 | **12 flag-only** (poisoned/prone/blinded adv-disadv) | charmed, deafened |
| **Races** | 38 | all core fields | **16/23 racialActions desc-only** | `traits[]`, tool prof |
| **Equipment** | CSV | full (`computeEquipmentStats`→effects) | — | — |
| **Spells** | 199 | buff fold (attackBuff 14, setsBaseAC 7, turnResource 13, saveBonusDice 5, speedMultiplier 5) | damage spells manual (by design) | — |
| **Actions** | 39 | 17 resource-backed, all keys resolve | — | 15 generic |
| **Summons** | 55 | 51 w/ attacks | — | 4 attackless |
| **Wild Shape** | 19 | all (attacks + CR gating) | — | — |
| **Resources** | class+feat+racial | scaling + recovery; `RESOURCE_EFFECTS` only 4 (Rage/ActionSurge/CD/Bardic) | most others pip-tracked only | — |

---

## 6. Structured output — `expects_effect=true, handler=null` (representative)

```yaml
# ── SUBCLASSES (535 text-only FeatureEntry; the actionable disconnects) ──
- feature: "Divine Strike"
  subclass_id: [LifeDomain, TrickeryDomain, NatureDomain, TempestDomain, WarDomain,
                DeathDomain, ForgeDomain, OrderDomain, TwilightDomain]   # ~10 domains
  expects_effect: true
  effects:
    - type: damage_rider          # +1d8 → +2d8 @14, typed per domain
      target: enemy
      trigger: on_hit             # once per turn on weapon hit
      handler: null               # NOT in attacks.ts / getWeaponSpecialAttacks / effect fold

- feature: "Frenzy"
  subclass_id: Berserker
  expects_effect: true
  effects:
    - { type: grant_action, target: enemy, trigger: on_bonus, handler: null }  # bonus melee while raging

- feature: "Storm Aura (Desert/Sea/Tundra)"
  subclass_id: StormHerald
  expects_effect: true
  effects:
    - { type: damage | resource_mod, target: area, trigger: on_turn_start, handler: null }

- feature: "Totem Spirit / Totemic Attunement (Bear/Eagle/Wolf)"
  subclass_id: TotemWarrior
  expects_effect: true            # source has explicit `// TODO: mechanical wiring`
  effects:
    - { type: buff, target: self | ally | enemy, trigger: on_condition, handler: null }  # while raging

- feature: "Halo of Spores / Symbiotic Entity"
  subclass_id: CircleOfSpores
  expects_effect: true
  effects:
    - { type: damage_rider, target: enemy, trigger: on_hit | on_reaction, handler: null }

- feature: "Eyes of Night"        # explicit TODO in file
  subclass_id: TwilightDomain
  expects_effect: true
  effects:
    - { type: buff, target: self, trigger: passive, handler: null }   # 300ft darkvision override

# ── CONNECTED subclasses (for contrast) ──
- feature: "Sneak Attack"
  subclass_id: [Rogue subclasses incl. Swashbuckler]
  expects_effect: true
  effects:
    - type: damage_rider
      target: enemy
      trigger: once_per_turn
      handler: "attacks.ts:getWeaponSpecialAttacks + SPECIAL_ATTACK_CONSUMPTION['Sneak Attack']"
- feature: "Combat Superiority (maneuvers)"
  subclass_id: BattleMaster
  expects_effect: true
  effects:
    - { type: damage_rider, trigger: on_hit, handler: "attackRows.ts: activeManeuverOf + MANEUVER_BY_ID" }

# ── FEATS ──
- feature: heavyArmorMaster
  expects_effect: true
  effects: [{ type: damage_reduction, target: self, trigger: on_damaged, handler: null }]  # "-3 phys" unmodeled
- feature: observant
  expects_effect: true
  effects: [{ type: skillBonus, target: self, trigger: passive, handler: null }]           # "+5 passive" unmodeled
- feature: polearmMaster
  expects_effect: true
  effects: [{ type: grant_action, target: enemy, trigger: on_bonus | on_reaction, handler: null }]
- feature: sentinel
  expects_effect: true
  effects:
    - { type: flag,      target: self,  trigger: on_reaction, handler: "rules/index.ts:502" }  # note only
    - { type: condition, target: enemy, trigger: on_hit,      handler: null }                  # speed→0 unmodeled
- feature: alert                 # CONNECTED (contrast)
  expects_effect: true
  effects: [{ type: initiativeBonus, value: 5, target: self, trigger: passive,
              handler: "charCalculations.ts:228" }]

# ── CONDITIONS (flag-only that RAW expects to compute) ──
- feature: poisoned
  expects_effect: true
  effects: [{ type: disadvantage, on: attack + ability_check, target: self, trigger: passive, handler: null }]
- feature: prone
  expects_effect: true
  effects:
    - { type: disadvantage, on: attack,          target: self,  handler: null }
    - { type: advantage/disadvantage, on: incoming_attack, target: enemy, handler: null }
- feature: haste               # CONNECTED (contrast)
  expects_effect: true
  effects: [{ type: acBonus:+2 & speedMultiplier:2, target: self, trigger: on_condition,
              handler: "collect.ts:collectConditionEffects → acDelta/speedMultiplier" }]

# ── RACES (racialActions with no on-Use effect: 16/23) ──
- feature: "<breath weapon / damage racial action>"
  expects_effect: true
  effects: [{ type: damage, target: area, trigger: on_action, handler: null }]  # no grantsTempHp/selfHeal → fires nothing
```

---

## 7. Bottom line & recommended next moves

1. **Referential integrity is solid** — no dangling ids anywhere. Only risk: the un-asserted
   `resourceKey` ↔ `ResourceDef` string link (add a startup assertion).
2. **The real debt is "declared-not-reflected," concentrated in `subclassFeatures`** — 535 text
   entries with a type (`FeatureEntry`) that *structurally cannot* carry an effect. Highest-value
   fix: add optional `effects?: Effect[]` to `FeatureEntry`, then fold subclass/feat features into
   `collectActiveEffects` (the way equipment already folds `stats`). Port the most-impactful riders
   first: **Divine Strike, Frenzy, Storm Aura, Spores, Divine Fury.**
3. **Feats:** promote the ~6 partial / 18 prose-only into structured `stats` / new effect kinds
   where a RAW-computable number exists (`observant` +5 passive, `heavyArmorMaster` −3; dual-wield
   is the working template).
4. **Conditions:** have `collectConditionEffects` emit real `advantage`/`disadvantage` effects for
   `poisoned`/`prone`/`blinded`/etc. instead of `flag`, *if* the tracker should compute them
   (currently a deliberate note-only choice).

---

## Appendix — method / reproducibility

- On-disk catalog counts: `spells.json` 199 · `feats.json` 53 · `conditions.json` 21 ·
  `actions.json` 39 · `races.json` 38 · `summonTemplates.json` 55 · `wildShapeBeasts.json` 19.
- Effect vocabulary: `src/renderer/src/domain/effects.ts`; fold: `domain/collect.ts`.
- Feat id special-casing verified in: `domain/rules/attacks.ts`, `domain/rules/index.ts`,
  `domain/migrations/index.ts`, `shared/data/charCalculations.ts`, `app/store/characterSlice.ts`,
  `domain/rules/progression.ts`.
- Subclass counts (110 / 535 / 42 / 14 / 9-cased) and spell-ref integrity extracted by script
  over `subclassData.ts` / `raceData.ts` vs `spells.json`.
- Code-review-graph MCP tools referenced in `CLAUDE.md` were **not loaded** in this session;
  fell back to Grep/Glob/Read per the documented fallback.
