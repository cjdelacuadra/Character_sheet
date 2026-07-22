# Wiring Plan — connecting declared-only features

_Plan only. No source was edited. Companion to `implementation/audit.md`. Generated 2026-07-21._

This plan operationalises the **ownership rule**: the app **computes** what it owns a surface/event for
(outgoing attack rolls, ability checks, static self-state — AC/speed/saves/action list) and **flags**
(a note, never a number) everything it does not own (incoming/intake damage, aura/area damage to
enemies, anything triggered by an event the sheet does not simulate).

## Verification pass (live code — do not trust the audit blindly)

Every template/claim below was checked against source. `file:line` cited.

| Claim | Verdict | Evidence |
|---|---|---|
| Divine Strike is genuinely unwired | **REFUTED (partially wired, class-caged)** | Not in `getWeaponSpecialAttacks`/`attacks.ts` ✓, but a bespoke `DivineStrikeTurnToggle` fire-button exists — `ActionDetailPanel.tsx:82` (def), rendered `:688,:1272,:1367` gated `classId==='Cleric' && level>=8`; store action `fireDivineStrike` `turnSlice.ts:121`; flag `economy.ts:27`. So it computes damage, but is **hardcoded to Cleric** (class cage) and uses a one-off toggle, not the R2 path. |
| Ability detail panel reads NO adv/disadv Effect (R5b needs new consumer) | **CONFIRMED** | `SkillSaveDetailPanel.tsx` reads advantage **only** from equipment blocks (`b.stats.advantage.savingThrows` :159, `.skills` :195). No condition/feat adv/disadv consumer. |
| Attack table DOES read adv/disadv (R5a template) | **CONFIRMED — consumer EXISTS** | `computeAttackAdvantage` `domain/rules/index.ts:39`; consumed `ActionDetailPanel.tsx:128` and `SpellsPanel.tsx:82`. BUT it is **hardcoded by condition id** (`invisible`→adv :45; `poisoned/blinded/frightened/prone/restrained/exhaustion`→disadv :46) — it does **not** read the condition catalog `effects[]` nor any `Effect` of kind `advantage`/`disadvantage`. |
| Audit: "condition→attack adv/disadv not computed" | **REFUTED** | See above — it IS computed (hardcoded). Tests prove it: `rules.test.ts:180` poisoned→disadv, `:186` invisible→adv, `:198` rage→adv. R5a work = make it **data-driven**, not build-from-zero. |
| `action.resourceKey` ↔ `ResourceDef` has no startup assertion | **CONFIRMED** | No `assert`/`throw` linking them in `contentLoader.ts` or `domain/rules/resources.ts`; `resourceKey` is matched only by string at read time. |

### Confirmed template locations (copy these)

| Bucket | Template (verified path) |
|---|---|
| **R1** static self-mod | Emit an `Effect` in a `collect.ts` adapter → folded by `defense.ts:74/90` (AC) & `mobility.ts:36` (speed) via `sumOf`. Semantic exemplar `alert` +5 init — but note it is currently **hardcoded** at `charCalculations.ts:228` (`feats.includes('alert')`), NOT yet through the fold; wiring a new R1 feature means adding the emit + confirming the consumer folds it. |
| **R2** outgoing on-hit rider | `getWeaponSpecialAttacks` `domain/rules/index.ts:677` (Sneak Attack `:688`), consumed `attackRows.ts:232`; consumption map `attackRows.ts:95` (`Sneak Attack: oncePerTurn`). |
| **R3** granted action | `getAvailableActions` `domain/rules/index.ts:398` + `ACTIONS` data in `shared/data/actionsData.ts` (e.g. `war-priest`, `second-wind`). |
| **R5a** condition→attack adv/disadv | `computeAttackAdvantage` `index.ts:39` (make data-driven). |
| **R5b** condition/feat→ability adv/disadv | **No consumer** — build one in `SkillSaveDetailPanel.tsx` (mirror the equipment-advantage display at `:159/:195`, feed it a new `computeAbilityAdvantage(char)` modelled on `computeAttackAdvantage`). |
| **FLAG** | note only; render next to the stat (existing `flag` Effect → `flagsOf` in `effects.ts:94`). |

## A. Count table (COMPUTE vs FLAG is the headline)

Subclass feature entries parsed from `subclassData.ts`: **535** — the full set (matches the audit count; 0 unparsed).

| Bucket | Subclass entries |
|---|---:|
| R1 | 13 |
| R2 | 16 |
| R3 | 10 |
| R5b | 10 |
| FLAG | 241 |
| WIRED | 35 |
| ESCALATE | 210 |

> **HEADLINE — COMPUTE 49 vs FLAG 241** (WIRED 35 already connected; ESCALATE 210 need human triage).
>
> Of the entries that need *any* work (excluding WIRED), roughly **10% COMPUTE / 90% FLAG-or-unclear**. This ratio is the tracker-vs-simulator verdict: **the app stays a tracker** — the large majority of subclass features are events/areas/incoming effects it does not own, and get a note, not an engine.

_(Heuristic first pass. The ratio is robust; individual COMPUTE and ESCALATE rows are ratified by a human in Phase 1 — that is what P1 is for.)_

## B1. COMPUTE features — subclasses (the actionable rows)

| Name | Subclass id | Bucket | Template / consumer | Effect (from desc) |
|---|---|---|---|---|
| Bladesong | Bladesinging | R1 | static self AC — collect.ts fold (consumer defense.ts:74/90) | As a bonus action, enter Bladesong (1 min, ends if you wear medium/heavy armor, shield, or incapacitated). Gain +INT mod (min +1) AC, +10 ft |
| Fungal Body | CircleOfSpores | R1 | static self save-advantage/immunity — collect.ts fold (saveBonus/flag) | Immune to being blinded, deafened, frightened, and poisoned. Critical hits against you don't deal extra damage. |
| Blade Flourish | CollegeOfSwords | R1 | static self AC — collect.ts fold (consumer defense.ts:74/90) | Once per turn, +10 ft speed when you take the Attack action. Spend one Bardic Inspiration die on a flourish: Defensive (+die to AC), Slashin |
| Draconic Resilience | DraconicBloodline | R1 | static self AC — collect.ts fold (consumer defense.ts:74/90) | Max HP increases by 1 and increases by 1 again whenever you gain a sorcerer level. AC = 13 + DEX mod when not wearing armor. |
| Dragon Wings | DraconicBloodline | R1 | static self speed — collect.ts fold (consumer mobility.ts:36) | As a bonus action, manifest dragon wings: gain a flying speed = walking speed for 1 hour or until you dismiss. |
| Drunken Technique | DrunkenMaster | R1 | static self speed — collect.ts fold (consumer mobility.ts:36) | When you use Flurry of Blows, gain Disengage benefits and +10 ft to walking speed until end of turn. |
| Defensive Tactics | Hunter | R1 | static self AC — collect.ts fold (consumer defense.ts:74/90) | Choose: Escape the Horde (OAs against you have disadvantage), Multiattack Defense (when a creature hits you, +4 AC vs its further attacks th |
| Ghost Walk | Phantom | R1 | static self speed — collect.ts fold (consumer mobility.ts:36) | As a bonus action, assume a spectral form for 10 min (or expend a Soul Trinket): flying speed of 10 ft, hover, attacks against you have disa |
| Superior Mobility | Scout | R1 | static self speed — collect.ts fold (consumer mobility.ts:36) | Walking speed +10 ft. If you have a climb or swim speed, it also increases by 10 ft. |
| Writhing Tide | Swarmkeeper | R1 | static self speed — collect.ts fold (consumer mobility.ts:36) | As a bonus action, gain a flying speed of 10 ft and the ability to hover for 1 minute. Uses = PB per long rest. |
| Stormborn | TempestDomain | R1 | static self speed — collect.ts fold (consumer mobility.ts:36) | You have a flying speed = your walking speed whenever you aren't underground or indoors. |
| Steps of Night | TwilightDomain | R1 | static self speed — collect.ts fold (consumer mobility.ts:36) | Magically gain a flying speed = walking speed for 1 minute. Uses = PB per long rest. |
| Arcane Deflection | WarMagic | R1 | static self AC — collect.ts fold (consumer defense.ts:74/90) | When you are hit by an attack OR fail a save, use your reaction to gain +2 AC against that attack OR +4 to that save. After use, you can onl |
| Psychic Blades | CollegeOfWhispers | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | When you hit with a weapon attack, expend one Bardic Inspiration die to deal extra psychic damage = die + 1d6 per 4 bard levels above 3rd. 1 |
| Divine Strike | DeathDomain | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | Once per turn, when you hit with a weapon, add 1d8 (2d8 at lv 14) necrotic damage. |
| Dreadful Strikes | FeyWanderer | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | Once per turn when you hit a creature with a weapon attack, deal extra 1d4 psychic damage (1d6 at lv 11). |
| Divine Strike | ForgeDomain | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | Once per turn, when you hit with a weapon, add 1d8 (2d8 at lv 14) fire damage. |
| One with the Blade | Kensei | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | Kensei weapons count as magical. Spend 1 ki when you hit with a melee kensei weapon to deal extra damage = your martial arts die. |
| Divine Strike | LifeDomain | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | Once on each of your turns, when you hit a creature with a weapon attack, deal extra 1d8 radiant damage (2d8 at lv 14). |
| Hand of Harm | Mercy | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | When you hit with an unarmed strike, spend 1 ki to deal extra necrotic damage = your martial arts die + WIS mod. 1/turn. |
| Divine Strike | NatureDomain | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | Once per turn, when you hit with a weapon, add 1d8 (2d8 at lv 14) damage of your choice: cold, fire, or lightning. |
| Divine Strike | OrderDomain | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | Once per turn, when you hit with a weapon, add 1d8 (2d8 at lv 14) psychic damage. |
| Psionic Strike | PsiWarrior | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | When you hit a creature within 30 ft with a weapon attack, spend one die to deal extra force damage = 1d6 + INT mod. 1/turn. |
| Gathered Swarm | Swarmkeeper | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | A swarm of spirits assists you. Once per turn when you hit a creature with a weapon attack, choose: +1d6 piercing damage, move the target up |
| Divine Strike | TempestDomain | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | Once per turn, when you hit with a weapon, add 1d8 (2d8 at lv 14) thunder damage. |
| Divine Strike | TrickeryDomain | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | Once on each of your turns, when you hit with a weapon, deal extra 1d8 poison damage (2d8 at lv 14). |
| Divine Strike | TwilightDomain | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | Once per turn, when you hit with a weapon, add 1d8 (2d8 at lv 14) radiant damage. |
| Grave Touched | Undead | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | No need to eat, drink, or breathe. When you hit with a weapon attack, deal extra necrotic damage = your CHA mod (min 1). 1/turn. |
| Divine Strike | WarDomain | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | Once per turn, when you hit with a weapon, add 1d8 (2d8 at lv 14) damage of the weapon's type. |
| Battlerager Armor | Battlerager | R3 | granted action/bonus/reaction attack (template: getAvailableActions index.ts:398 + ACTIONS data) | While wearing spiked armor and raging, use a bonus action to make one melee weapon attack with your armor spikes (1d4 piercing, STR mod for  |
| Battlerager Charge | Battlerager | R3 | granted action/bonus/reaction attack (template: getAvailableActions index.ts:398 + ACTIONS data) | While raging, take the Dash action as a bonus action on your turn. |
| Frenzy | Berserker | R3 | granted action/bonus/reaction attack (template: getAvailableActions index.ts:398 + ACTIONS data) | While raging, you can make a single melee weapon attack as a bonus action on each of your turns. When your rage ends, you suffer one level o |
| Retaliation | Berserker | R3 | granted action/bonus/reaction attack (template: getAvailableActions index.ts:398 + ACTIONS data) | When you take damage from a creature within 5 ft, you can use your reaction to make a melee weapon attack against that creature. |
| War Magic | EldritchKnight | R3 | granted action/bonus/reaction attack (template: getAvailableActions index.ts:398 + ACTIONS data) | When you take the Attack action and cast a cantrip, you can make one weapon attack as a bonus action. |
| Improved War Magic | EldritchKnight | R3 | granted action/bonus/reaction attack (template: getAvailableActions index.ts:398 + ACTIONS data) | When you take the Attack action and cast a 1st-level+ spell, you can make one weapon attack as a bonus action. |
| Soul of Vengeance | OathOfVengeance | R3 | granted action/bonus/reaction attack (template: getAvailableActions index.ts:398 + ACTIONS data) | When a creature affected by your Vow of Enmity makes an attack, use your reaction to make one melee attack against that creature. |
| Voice of Authority | OrderDomain | R3 | granted action/bonus/reaction attack (template: getAvailableActions index.ts:398 + ACTIONS data) | When you cast a 1st-level+ spell targeting an ally, that ally can use their reaction to make one weapon attack against a creature of your ch |
| Opportunist | Shadow | R3 | granted action/bonus/reaction attack (template: getAvailableActions index.ts:398 + ACTIONS data) | When a creature within 5 ft is hit by an attack from another creature, use your reaction to make a melee attack against that creature. |
| War Priest | WarDomain | R3 | granted action/bonus/reaction attack (template: getAvailableActions index.ts:398 + ACTIONS data) | When you use the Attack action, make one weapon attack as a bonus action. Uses = WIS mod (min 1) per long rest; recover all on a short or lo |
| Silver Tongue | CollegeOfEloquence | R5b | advantage/floor on ability check — ability detail panel (BUILD consumer; ref: computeAttackAdvantage index.ts:39) | When you make a CHA (Persuasion or Deception) check, treat any d20 roll of 9 or lower as a 10. |
| Drunkard's Luck | DrunkenMaster | R5b | advantage/floor on ability check — ability detail panel (BUILD consumer; ref: computeAttackAdvantage index.ts:39) | Spend 2 ki to cancel disadvantage on an ability check, attack roll, or save you're about to make. |
| Ear for Deceit | Inquisitive | R5b | advantage/floor on ability check — ability detail panel (BUILD consumer; ref: computeAttackAdvantage index.ts:39) | When you make a WIS (Insight) check to determine if a creature is lying, treat any d20 roll of 7 or lower as an 8. |
| Steady Eye | Inquisitive | R5b | advantage/floor on ability check — ability detail panel (BUILD consumer; ref: computeAttackAdvantage index.ts:39) | Advantage on Perception and Investigation checks if you move no more than half your speed on the same turn. |
| Channel Divinity: Peerless Athlete | OathOfGlory | R5b | advantage/floor on ability check — ability detail panel (BUILD consumer; ref: computeAttackAdvantage index.ts:39) | As a bonus action, advantage on STR (Athletics) and DEX (Acrobatics) checks for 10 minutes. Carry/push/drag double weight, +10 ft jumps. |
| Giant's Might | RuneKnight | R5b | advantage/floor on ability check — ability detail panel (BUILD consumer; ref: computeAttackAdvantage index.ts:39) | As a bonus action, grow Large for 1 minute: advantage on STR checks/saves, +1d6 to weapon damage, your weapons grow with you. Uses = PB per  |
| Elegant Maneuver | Swashbuckler | R5b | advantage/floor on ability check — ability detail panel (BUILD consumer; ref: computeAttackAdvantage index.ts:39) | Use a bonus action to gain advantage on the next DEX (Acrobatics) or STR (Athletics) check you make this turn. |
| Supreme Sneak | Thief | R5b | advantage/floor on ability check — ability detail panel (BUILD consumer; ref: computeAttackAdvantage index.ts:39) | Advantage on Stealth checks if you move no more than half your speed on the same turn. |
| Blessing of the Trickster | TrickeryDomain | R5b | advantage/floor on ability check — ability detail panel (BUILD consumer; ref: computeAttackAdvantage index.ts:39) | As an action, touch one willing creature (not yourself); it has advantage on Stealth checks for 1 hour. |
| Tides of Chaos | WildMagicSorcerer | R5b | advantage/floor on ability check — ability detail panel (BUILD consumer; ref: computeAttackAdvantage index.ts:39) | Once per long rest, give yourself advantage on one attack roll, ability check, or save. After use, the DM may trigger a Wild Magic Surge bef |

## B2. Feats — declared-only (18)

| Feat id | Bucket | Template / note | Effect (from desc) |
|---|---|---|---|
| charger | R3 | bonus-action attack on Dash — getAvailableActions + ACTIONS | When you Dash as an action, you can use a bonus action to make one melee weapon attack or shove (+5 damage or 10 ft push |
| crossbowExpert | R3 | bonus-action hand-crossbow attack — action system (ignore-loading/no-disadv = FLAG note) | Ignore the loading property of crossbows. Being within 5 ft of a hostile creature doesn't impose disadvantage on ranged  |
| defensiveDuelist | FLAG | reaction +PB AC vs one attack — incoming, event not owned | Prerequisite: DEX 13. When wielding a finesse weapon and hit by a melee attack, use your reaction to add your proficienc |
| inspiringLeader | FLAG | temp HP to allies — party, not owned | Prerequisite: CHA 13. Spend 10 minutes inspiring up to 6 allies (including yourself) within 30 ft; each gains temporary  |
| lightlyArmored | WIRED-able | armor proficiency — route to grantsProficiencies (existing path) | Gain proficiency with light armor. |
| mageSlayer | FLAG | reaction vs casters / save-vs-spell — event not owned | When a creature within 5 ft casts a spell, you can use your reaction to attack it. When you damage a concentrating creat |
| magicInitiate | WIRED-able | spell grant — grantedSpells/freeCastSpells (existing path) | Choose a class. Learn 2 cantrips and one 1st-level spell from that class's list. Cast the 1st-level spell once per long  |
| mediumArmorMaster | R1 | DEX-to-AC cap +3 in medium armor — static self AC (defense.ts) | Prerequisite: medium armor proficiency. Wearing medium armor imposes no disadvantage on Stealth checks. DEX bonus to AC  |
| moderatelyArmored | WIRED-able | armor+shield proficiency — grantsProficiencies | Prerequisite: light armor proficiency. Gain proficiency with medium armor and shields. |
| polearmMaster | R3 | bonus-action butt-end attack + reach OA — action system | As a bonus action, make a melee attack with the butt end of a glaive, halberd, quarterstaff, or spear (1d4 bludgeoning). |
| ritualCaster | WIRED-able | ritual spell book — spell grant path | Prerequisite: INT or WIS 13. Acquire a ritual book with two 1st-level ritual spells from your chosen class. You can cast |
| shieldMaster | FLAG/R3 | bonus-action shove = R3; +shield to DEX saves / reaction = FLAG | As a bonus action after attacking, you can shove a creature within 5 ft. Add your shield's AC bonus to DEX saves. Use yo |
| skilled | WIRED-able | skill/tool proficiency — grantsProficiencies | Gain proficiency in any combination of three skills or tools of your choice. |
| skulker | R5b | no-disadv Perception in dim light — ability check (BUILD consumer) + FLAG parts | Prerequisite: DEX 13. Hide when lightly obscured. Missing a ranged attack while hidden doesn't reveal your position. Dim |
| weaponMaster | WIRED-able | weapon proficiency — grantsProficiencies | Gain proficiency with four weapons of your choice. |
| artificer-initiate | WIRED-able | spell + tool grant — existing paths | Learn one cantrip and one 1st-level spell from the Artificer list (INT is your spellcasting ability). Cast the 1st-level |
| eldritch-adept | ESCALATE | grants one invocation — needs invocation-effect owner decision | Prerequisite: Spellcasting or Pact Magic feature. Learn one Eldritch Invocation option from the Warlock class. If the in |
| poisoner | R2 | coated-weapon +2d8 poison on hit — outgoing on-hit rider (Sneak Attack path); ignore-poison-resist = FLAG | Ignore resistance to poison damage. As a bonus action, coat one piercing or slashing weapon with a poison that lasts for |

## B3. Conditions — flag-only (12)

| Condition id | Bucket | Template / note | Effect (from desc) |
|---|---|---|---|
| blinded | R5a+R5b | attack: handled (index.ts:46); ability-check disadv = R5b (BUILD) | Auto-fail sight checks; attacks vs you ADV, your attacks DIS. |
| charmed | FLAG | can't attack charmer — event not simulated | Can't attack the charmer; charmer has ADV on social checks vs you. |
| concentration | FLAG | tracker note only | Tracks an active concentration spell (see spell panel). |
| deafened | FLAG | narrative — no owned number | Auto-fail hearing checks. |
| exhaustion | R5a+R5b | attack: handled; ability-check disadv (lvl1) + speed (lvl2) = R5b/R1 | Level-based penalties (DIS checks @1, half speed @2, …). Track level manually. |
| frightened | R5a+R5b | attack: handled while source in sight; ability-check disadv = R5b | DIS on checks/attacks while source in sight; can't move closer. |
| incapacitated | FLAG | no actions/reactions — action-economy note only | No actions or reactions. |
| invisible | R5a | attack advantage: already handled (index.ts:45) | Attacks vs you DIS; your attacks ADV; heavily obscured. |
| poisoned | R5a+R5b | attack disadv: handled (index.ts:46); ability-check disadv = R5b (BUILD) | DIS on attack rolls and ability checks. |
| prone | R5a | attack disadv (self): handled; adv/disadv vs you by range = FLAG | DIS on attacks; melee vs you ADV, ranged vs you DIS; half movement to stand. |
| silence | FLAG | blocks V spells — caster note only | Can't cast spells with a Verbal (V) component. |
| fly | R1 | grants fly speed — static self speed (mobility.ts) if modeled; else FLAG | Gain a flying speed (e.g. 60 ft). |

## B4. ESCALATE — subclass entries that fit no bucket (human triage in P1)

These matched no clean bucket automatically. Do **not** force them — a human assigns bucket or "won't-wire" in P1.

| Name | Subclass id | Effect (from desc) |
|---|---|---|
| Psionic Spells | AberrantMind | Learn additional spells. On long rest, replace one with a divination or enchantment spell of the same level. Cast these without verbal or material com |
| Psionic Sorcery | AberrantMind | When you cast a Psionic Spell, you can spend sorcery points equal to the slot level instead of using a slot (and cast it without V/M components). |
| Abjuration Savant | Abjuration | Halve the gold and time cost to copy abjuration spells into your spellbook. |
| Arcane Ward | Abjuration | When you cast an abjuration spell of 1st level+, create an Arcane Ward (HP = 2× wizard level + INT mod). It absorbs damage you take; restored when you |
| Improved Abjuration | Abjuration | When you cast an abjuration spell that requires an ability check (counterspell, dispel magic), add your PB to the check. |
| Vengeful Ancestors | AncestralGuardian | When you use Spirit Shield, the attacker takes force damage equal to the amount of damage prevented. |
| Potent Spellcasting | ArcanaDomain | Add your WIS mod to cleric cantrip damage. |
| Arcane Mastery | ArcanaDomain | Choose four spells (one each from 6th/7th/8th/9th level) from the wizard list. They become cleric spells for you, prepared without counting against yo |
| Arcane Shot | ArcaneArcher | Learn 2 Arcane Shot options. Once per turn when you fire an arrow from a shortbow or longbow as part of the Attack action, apply one Arcane Shot effec |
| Curving Shot | ArcaneArcher | When you make a magic arrow attack roll that misses, use a bonus action to reroll the attack against a different target within 60 ft of the original. |
| Magic Arrow | ArcaneArcher | Whenever you fire a non-magical arrow from a shortbow or longbow, you can make it magical for the purpose of overcoming resistance and immunity. |
| Arcane Shot Options | ArcaneArcher | Learn 2 more Arcane Shot options. Damage of each option increases. |
| Ever-Ready Shot | ArcaneArcher | If you roll initiative with no Arcane Shot uses remaining, you regain 1. |
| Arcane Shot Mastery | ArcaneArcher | Learn 2 final Arcane Shot options; damage of each option increases further. |
| Spellcasting | ArcaneTrickster | Cast wizard spells (Illusion and Enchantment; other schools at levels 8/14/20). Use INT as your spellcasting ability. |
| Magical Ambush | ArcaneTrickster | If you are hidden from a creature when you cast a spell on it, the creature has disadvantage on any save against the spell. |
| Spell Thief | ArcaneTrickster | When a creature casts a spell that targets you, use your reaction to force a save vs your spell DC. On failure, you steal the spell (it can't cast it  |
| Arcane Armor | Armorer | Your armor becomes a magical suit. It includes integrated weapons (Thunder Gauntlets for Guardian; Lightning Launcher for Infiltrator), grants benefit |
| Armor Modifications | Armorer | You can apply up to 2 infusions at once to your Arcane Armor (it counts as 2 separate items for infusion purposes). |
| Extra Attack | Armorer | You can attack twice, instead of once, whenever you take the Attack action on your turn. |
| Armor Modifications (improved) | Armorer | You can apply up to 4 infusions at once to your Arcane Armor (helmet, boots, breastplate, gauntlets — each treated separately). |
| Arcane Firearm | Artillerist | After a long rest, magically modify a wand/staff/rod into your Arcane Firearm. When you cast a spell through it, roll a d8 and add the result to one d |
| Assassinate | Assassin | Advantage on attacks against creatures that haven't taken a turn in combat yet. Any hit you score against a surprised creature is a critical hit. |
| Infiltration Expertise | Assassin | Spend 7 days and 25 gp to establish a false identity. The identity is supported by paperwork, contacts, and reputation. |
| Impostor | Assassin | Mimic another creature's speech, writing, and behavior (after spending at least 3 hours studying). DC = 8 + their PB on the Insight check vs your Dece |
| Death Strike | Assassin | When you hit a surprised creature, double the damage dealt. Target makes CON save (DC = 8 + PB + DEX) or takes double damage. |
| Arms of the Astral Self | AstralSelf | As a bonus action, spend 1 ki to manifest spectral arms for 10 minutes. They reach 5 ft beyond your normal reach, use WIS for STR/DEX checks (your cho |
| Awakened Astral Self | AstralSelf | Spend 5 ki as bonus action to manifest full Astral Self for 10 min: +2 AC, extra arm attacks count as one additional Attack, gain magical resistance. |
| Combat Superiority | BattleMaster | Gain 4 Superiority Dice (d8) and learn 3 maneuvers. Maneuver save DC = 8 + Prof + STR or DEX (your choice). |
| Improved Combat Superiority | BattleMaster | Superiority Dice become d10s (d12s at level 18). Learn 2 more maneuvers and gain 1 additional die (5 total). |
| Relentless | BattleMaster | When you roll initiative and have no superiority dice, regain 1. |
| Improved Combat Superiority | BattleMaster | Superiority Dice become d12s. |
| Battle Ready | BattleSmith | When you attack with a magic weapon you can use INT instead of STR or DEX for attack and damage rolls. |
| Extra Attack | BattleSmith | You can attack twice, instead of once, whenever you take the Attack action on your turn. |
| Bestial Soul | Beast | Your natural weapons count as magical. Choose a benefit when you finish a long rest: swim + breathe water, climb without checks, or +Long-jump = STR m |
| Exceptional Training | BeastMaster | On any turn your beast doesn't attack, command it to take Dash/Disengage/Dodge/Help as a bonus action. Its attacks count as magical. |
| Bestial Fury | BeastMaster | When you command your beast to take the Attack action, it can make 2 attacks. |
| Share Spells | BeastMaster | When you cast a spell targeting yourself, you can also affect your beast if within 30 ft. |
| Extra Attack | Bladesinging | You can attack twice when you take the Attack action. One of these can be replaced with a cantrip (1 action casting time). |
| Song of Victory | Bladesinging | While Bladesong is active, add your INT mod (min +1) to melee weapon damage rolls. |
| Born to the Saddle | Cavalier | Advantage on saves to avoid falling off your mount. Mounting/dismounting costs 5 ft of movement (instead of half your speed). Land safely from a fall  |
| Hold the Line | Cavalier | Creatures provoke an OA from you when they move 5 ft or more while within your reach. Hitting a creature with an OA reduces its speed to 0 for the res |
| Vigilant Defender | Cavalier | You can make an OA on every creature's turn (except yours) when an opportunity is triggered, instead of being limited to your reaction. |
| Bonus Cantrips | Celestial | Learn Light and Sacred Flame cantrips. |
| Radiant Soul | Celestial | When you cast a spell or use a magical effect that deals radiant or fire damage, add CHA mod (min 1) to one damage roll. |
| Improved Critical | Champion | Your weapon attacks score a critical hit on a roll of 19 or 20. |
| Remarkable Athlete | Champion | Add half your proficiency bonus (round up) to any STR, DEX, or CON check that doesn't already include your proficiency bonus. Long jump distance incre |
| Additional Fighting Style | Champion | Choose a second option from the Fighting Style class feature. |
| Superior Critical | Champion | Your weapon attacks score a critical hit on a roll of 18, 19, or 20. |
| Temporal Awareness | Chronurgy | Add INT mod to your initiative rolls. |
| Convergent Future | Chronurgy | When a creature you can see within 60 ft makes a roll, choose to have it auto-succeed or auto-fail. After each use, gain one level of exhaustion until |
| Hearth of Moonlight and Shadow | CircleOfDreams | During a short or long rest, surround your campsite with a 30-ft sphere of magical concealment (heavy obscurity, +5 to Stealth/Perception checks withi |
| Hidden Paths | CircleOfDreams | Teleport up to 60 ft to a space you can see as a bonus action, or teleport one willing creature within 30 ft up to 60 ft. Uses = PB per long rest. |
| Natural Recovery | CircleOfTheLand | During a short rest, recover spell slots whose total level ≤ half your druid level (round up). No slot can be 6th level or higher. 1/long rest. |
| Land's Stride | CircleOfTheLand | Move through non-magical difficult terrain without extra movement. You can pass through non-magical plants without taking damage. Advantage on saves v |
| Circle Forms | CircleOfTheMoon | Wild Shape into beasts with CR up to your druid level / 3 (round down), minimum 1. At level 6, CR limit becomes your druid level / 3. |
| Primal Strike | CircleOfTheMoon | Your attacks in beast form count as magical for overcoming resistance and immunity. |
| Elemental Wild Shape | CircleOfTheMoon | Expend 2 uses of Wild Shape (instead of 1) to transform into an Air, Earth, Fire, or Water elemental. |
| Mighty Summoner | CircleOfTheShepherd | Beasts and fey you summon gain +2 HP per HD, and their attacks count as magical. |
| Faithful Summons | CircleOfTheShepherd | When you are reduced to 0 HP or incapacitated against your will, four spirit beasts (CR 2 or lower) appear within 20 ft to defend you. They obey your  |
| Summon Wildfire Spirit | CircleOfWildfire | Expend a Wild Shape use to summon a Wildfire Spirit (small elemental, scales with druid level). 1-hour duration. Wildfire Teleport: spirit can telepor |
| Clockwork Magic | ClockworkSoul | Learn additional spells from the Order list. On long rest, replace one with an abjuration or transmutation spell of the same level. |
| Trance of Order | ClockworkSoul | As a bonus action, enter a trance for 1 minute. Treat any d20 of 9 or lower on attack rolls, ability checks, and saves as a 10. You can't be affected  |
| Mote of Potential | CollegeOfCreation | When you give a Bardic Inspiration die, also create a mote of dancing light next to the recipient. Adds a small bonus effect when the die is used (ext |
| Performance of Creation | CollegeOfCreation | As an action, conjure a non-magical item of your choice. Size up to medium; max value 20gp × bard level; lasts up to bard level hours. 1/long rest (or |
| Creative Crescendo | CollegeOfCreation | Performance of Creation lets you make up to PB items at once; one item can be Large or smaller; the item value cap is removed. |
| Unfailing Inspiration | CollegeOfEloquence | When a creature adds your Bardic Inspiration die to a roll that fails, the creature keeps the die. |
| Universal Speech | CollegeOfEloquence | As an action, any number of creatures within 60 ft can understand your speech for 1 hour. CHA mod uses per long rest. |
| Infectious Inspiration | CollegeOfEloquence | When a creature within 60 ft adds your Bardic Inspiration die to its roll and it succeeds, use your reaction to grant another inspiration die (free, d |
| Peerless Skill | CollegeOfLore | When you make an ability check, expend one Bardic Inspiration die and add it to your roll. You can do so after the d20 roll but before the outcome is  |
| Fighting Style | CollegeOfSwords | Choose Dueling or Two-Weapon Fighting. |
| Extra Attack | CollegeOfSwords | You can attack twice, instead of once, whenever you take the Attack action on your turn. |
| Master's Flourish | CollegeOfSwords | When you use a Blade Flourish, you can roll a d6 instead of expending a Bardic Inspiration die. |
| Combat Inspiration | CollegeOfValor | A creature holding one of your Bardic Inspiration dice can spend it: as a reaction when hit by an attack to add the die to their AC, or to add the die |
| Extra Attack | CollegeOfValor | You can attack twice, instead of once, whenever you take the Attack action on your turn. |
| Battle Magic | CollegeOfValor | When you take the Attack action on your turn, you can use a bonus action to cast a bard cantrip or 1st-level+ bard spell. |
| Shadow Lore | CollegeOfWhispers | Whisper a magical secret as an action. Target makes a WIS save (advantage if not understanding you) or is charmed for 8 hours and follows your verbal  |
| Conjuration Savant | Conjuration | Halve the gold and time cost to copy conjuration spells into your spellbook. |
| Benign Transposition | Conjuration | As an action, teleport up to 30 ft to a space you can see. Or swap places with a willing creature of Medium or smaller within range. 1/long rest, or r |
| Focused Conjuration | Conjuration | While concentrating on a conjuration spell, your concentration can't be broken by taking damage. |
| Improved Reaper | DeathDomain | When you cast a 1st-5th level necromancy spell that targets one creature, you can target two creatures within 5 ft of each other. |
| Divination Savant | Divination | Halve the gold and time cost to copy divination spells. |
| Portent | Divination | After a long rest, roll 2 d20s and record them. You can replace any attack roll, save, or ability check (made by you or another) with one of these for |
| Expert Divination | Divination | When you cast a divination spell of 2nd level+, regain one expended spell slot (level ≤ spell's level - 1, max 5th). |
| Greater Portent | Divination | Roll 3 dice for Portent after each long rest. |
| Divine Magic | DivineSoul | Choose an alignment-themed affinity (Good/Evil/Lawful/Chaotic/Neutral). Learn a bonus spell at sorcerer level 1 (e.g., Cure Wounds, Inflict Wounds, Bl |
| Otherworldly Wings | DivineSoul | As a bonus action, manifest spectral wings of celestial or fiendish power. Flying speed of 30 ft, indefinitely until dismissed. |
| Draconic Ancestry | DraconicBloodline | Choose a dragon type (Black/Acid, Blue/Lightning, Brass/Fire, Bronze/Lightning, Copper/Acid, Gold/Fire, Green/Poison, Red/Fire, Silver/Cold, White/Col |
| Intoxicated Frenzy | DrunkenMaster | When you Flurry of Blows, make 3 additional attacks (5 total) if each hits a different creature. |
| Unleash Incarnation | EchoKnight | Once per turn, when you take the Attack action, make an additional melee attack from your echo's space. Uses = CON mod per long rest. |
| Echo Avatar | EchoKnight | As an action, see through your echo's senses for up to 10 minutes. The echo can travel up to 1,000 ft from you during this time. |
| Shadow Martyr | EchoKnight | Before an attack roll is made against a target within 5 ft of your echo, use a reaction to make the echo intercept — your echo is targeted instead and |
| Legion of One | EchoKnight | Manifest two echoes at a time (each as the standard echo). Also, if you start your turn with no remaining Unleash Incarnation uses, regain 1. |
| Spellcasting | EldritchKnight | Cast wizard spells (Abjuration and Evocation; other schools at levels 8/14/20). Use INT as your spellcasting ability. |
| Weapon Bond | EldritchKnight | After a 1-hour ritual, bond up to 2 weapons. You can summon a bonded weapon as a bonus action; can't be disarmed of it unless incapacitated. |
| Eldritch Strike | EldritchKnight | When you hit a creature with a weapon attack, it has disadvantage on the next saving throw it makes against a spell you cast before the end of your ne |
| Arcane Charge | EldritchKnight | When you use Action Surge, you can also teleport up to 30 ft to an unoccupied space you can see. |
| Enchantment Savant | Enchantment | Halve the gold and time cost to copy enchantment spells. |
| Split Enchantment | Enchantment | When you cast an enchantment spell of 1st+ that targets only one creature, you can target a second creature. |
| Alter Memories | Enchantment | When you cast an enchantment spell that charms one or more creatures, you can make the target unaware of being charmed. While charmed, you can also ca |
| Evocation Savant | Evocation | Halve the gold and time cost to copy evocation spells. |
| Empowered Evocation | Evocation | Add your INT mod to one damage roll of any wizard evocation spell. |
| Overchannel | Evocation | When you cast a wizard spell of 1st-5th level that deals damage, you can deal max damage instead of rolling. First use after each long rest is free; s |
| Gift of the Sea | Fathomless | Swim speed = walking speed. Breathe underwater. |
| Dark One's Own Luck | Fiend | When you make an ability check or save, add 1d10 to the roll. Use after seeing the roll but before knowing the outcome. 1/short rest. |
| Hurl Through Hell | Fiend | When you hit a creature with an attack, instantly send it on a hellish journey. The creature disappears, returns at end of next turn taking 10d10 psyc |
| Blessing of the Forge | ForgeDomain | After a long rest, touch one nonmagical weapon or suit of armor; it becomes a magic item (+1) until you use this feature again or it leaves your posse |
| Disciple of the Elements | FourElements | Learn Elemental Attunement cantrip-equivalent and one elemental discipline. Spend ki to cast elemental spells. Learn additional disciplines at levels  |
| Additional Discipline | FourElements | Learn one more elemental discipline. |
| Additional Discipline | FourElements | Learn one more elemental discipline. |
| Additional Discipline | FourElements | Learn one more elemental discipline. Ki cost cap reaches the slot level of an effective 5th-level spell. |
| Genie's Vessel | Genie | You possess a magical vessel (tiny). Bonus action to channel: deal +PB damage of your genie type (dao=bludgeoning, djinni=thunder, efreeti=fire, marid |
| Genie's Wrath | Genie | Once per turn when you hit with an attack, deal additional damage of your genie type equal to your PB. |
| Limited Wish | Genie | Cast any 6th-level or lower spell as an action — once. 1d4 + 1 long rests must pass before you can use this again. 1/long rest cooldown does NOT apply |
| Dread Ambusher | GloomStalker | +10 ft speed on first turn of combat, and an additional attack on the first round dealing +1d8 weapon damage. +WIS mod to initiative. |
| Stalker's Flurry | GloomStalker | Once per turn when you miss with a weapon attack, you can make another weapon attack as part of the same action. |
| Shadowy Dodge | GloomStalker | When a creature you can see attacks you, use your reaction to impose disadvantage on the attack. |
| Sentinel at Death's Door | GraveDomain | When a creature within 30 ft would suffer a critical hit, use your reaction to make it a normal hit instead. Uses = WIS mod (min 1) per long rest. |
| Potent Spellcasting | GraveDomain | Add your WIS mod to cleric cantrip damage. |
| Gravity Well | Graviturgy | When you hit a creature with a spell, you can move it 5 ft to an unoccupied space. |
| Entropic Ward | GreatOldOne | When a creature makes an attack roll against you, use your reaction to impose disadvantage. If miss, your next attack against it has advantage (before |
| Create Thrall | GreatOldOne | After 1 minute touching an incapacitated humanoid, charm it indefinitely (no save). Telepathy 30 ft works on it. Ends if it takes damage from you/anyo |
| Accursed Specter | Hexblade | When you kill a humanoid, raise its spirit as a specter under your control for 1 hour (or short rest). 1/long rest. |
| Armor of Hexes | Hexblade | When a creature affected by your Hexblade's Curse hits you, roll a d6: on 4+, the hit misses you instead. |
| Master of Hexes | Hexblade | When the target of your Hexblade's Curse dies, transfer the curse to a different creature within 30 ft (no action needed). Doesn't restore the HP refu |
| Ethereal Step | HorizonWalker | Cast Etherealness as a bonus action, but only for the end of your current turn. 1/short rest. |
| Distant Strike | HorizonWalker | When you take the Attack action, teleport up to 10 ft before each attack to an unoccupied space you can see. If you attack at least two different crea |
| Multiattack | Hunter | Choose: Volley (ranged attack against any number of creatures in a 10-ft cube within range) or Whirlwind Attack (melee attack vs any number of creatur |
| Illusion Savant | Illusion | Halve the gold and time cost to copy illusion spells. |
| Improved Minor Illusion | Illusion | Learn Minor Illusion (if you don't already) and can create both sound and image with a single casting. |
| Malleable Illusions | Illusion | When you cast an illusion spell with a duration of 1 minute+, use an action to change the nature of that illusion (within the spell's normal parameter |
| Eye for Detail | Inquisitive | Use a bonus action to make a WIS (Perception) check to spot a hidden creature or object, or an INT (Investigation) check to uncover or decipher clues. |
| Insightful Fighting | Inquisitive | As a bonus action, make a WIS (Insight) check vs target's CHA (Deception) — if you win, you can deal Sneak Attack damage against the target this turn  |
| Eye for Weakness | Inquisitive | While Insightful Fighting is active against a target, your Sneak Attack against it deals +3d6 damage. |
| Path of the Kensei | Kensei | Choose 2 weapons (martial melee or ranged) as kensei weapons. They count as monk weapons. Gain Agile Parry (+2 AC vs melee until next turn after unarm |
| Sharpen the Blade | Kensei | As a bonus action, spend up to 3 ki to grant a kensei weapon a magical bonus to attack and damage rolls = ki spent. Lasts 1 minute. |
| Unerring Accuracy | Kensei | If you miss with a monk weapon attack on your turn, reroll the attack once. 1/turn. |
| Potent Spellcasting | KnowledgeDomain | Add your WIS mod to cleric cantrip damage. |
| Potent Spellcasting | LightDomain | Add your WIS mod to the damage of cleric cantrips you cast. |
| Master of Tactics | Mastermind | Use Help action as a bonus action; can target a creature up to 30 ft away. |
| Misdirection | Mastermind | When you are targeted by an attack while a creature within 5 ft is providing you cover, use a reaction to have the attack target that creature instead |
| Hand of Mercy | Mercy | As an action, spend 5 ki to touch a creature (CON save) and reduce it to 0 HP (or 1 HP on success). Doesn't work on constructs/undead. |
| Slayer's Counter | MonsterSlayer | When the target of your Slayer's Prey forces you to make a save, use your reaction to attack it (before the save). If you hit, you auto-succeed on the |
| Master of Nature | NatureDomain | You can use your action to verbally command any creature you charmed with Charm Animals and Plants (Channel Divinity). |
| Necromancy Savant | Necromancy | Halve the gold and time cost to copy necromancy spells. |
| Channel Divinity: Guided Strike | OathOfConquest | When you make an attack roll, use Channel Divinity to gain +10 to the roll (before or after roll, but before outcome). |
| Scornful Rebuke | OathOfConquest | Creatures take psychic damage = your CHA mod (min 1) whenever they hit you with an attack. |
| Channel Divinity: Sacred Weapon | OathOfDevotion | As an action, imbue one weapon you hold with positive energy for 1 minute: add CHA mod (min +1) to attack rolls, weapon sheds bright light in 20 ft +  |
| Purity of Spirit | OathOfDevotion | Always under the effects of a Protection from Evil and Good spell. |
| Living Legend | OathOfGlory | For 1 minute: charisma (Persuasion/Deception/etc.) become your strongest features (advantage). Smite as automatic (reroll once if 1). Once per turn, i |
| Channel Divinity: Emissary of Peace | OathOfRedemption | As a bonus action, grant yourself +5 to CHA (Persuasion) checks for 10 minutes. |
| Undying Sentinel | OathOfTheAncients | When reduced to 0 HP (and not killed outright), drop to 1 HP instead. 1/long rest. Also: you no longer age. |
| Relentless Avenger | OathOfVengeance | When you hit with an opportunity attack, move up to half your speed (doesn't provoke OAs) as part of the same reaction. |
| Tranquility | OpenHand | At the end of a long rest, gain a Sanctuary-like effect (hostile creatures must WIS save to target you). Lasts until you make an attack or cast a dama |
| Embodiment of the Law | OrderDomain | If you cast an Enchantment spell of 1st level+, you can use a bonus action (instead of the spell's normal casting time) WIS mod uses per long rest. |
| Wizardly Quill | OrderOfScribes | Conjure a magical quill in your hand as a bonus action. Uses no ink; doubles your writing speed; can erase text with a swipe. |
| Awakened Spellbook | OrderOfScribes | Your spellbook is sentient. When you cast a wizard spell with a slot, you can change the spell's damage type to match another damage type appearing in |
| Master Scrivener | OrderOfScribes | After a long rest, you can scribe a spell scroll of a 1st or 2nd level wizard spell from your spellbook for free. |
| One With the Word | OrderOfScribes | When you fail a save vs an attack/spell that would reduce you to 0 HP, sacrifice your spellbook (or your inner self if without it) to drop to 1 HP and |
| Potent Spellcasting | PeaceDomain | Add your WIS mod to cleric cantrip damage. |
| Death's Friend | Phantom | Use Wails from the Grave both before AND after the Sneak Attack damage. At the end of a long rest, if you have fewer than 4 Soul Trinkets, gain enough |
| Psionic Power | PsiWarrior | Gain a pool of Psionic Energy Dice (PB+2 dice, starting d6). Regain all on a long rest, or one on a short rest. |
| Telekinetic Movement | PsiWarrior | As an action, telekinetically move a Large or smaller object or willing creature within 30 ft up to 30 ft. Recharges after a short or long rest. |
| Telekinetic Adept | PsiWarrior | Psionic Strike die becomes d8. Learn Psi-Powered Leap (bonus action, flying speed twice walking until end of turn) and Telekinetic Thrust (force STR s |
| Rune Carver | RuneKnight | Learn 2 runes (Cloud, Fire, Frost, Stone, Hill, or Storm). Inscribe runes on weapons/armor/jewelry; each grants a passive bonus and a once-per-rest in |
| Runic Shield | RuneKnight | When another creature you can see within 60 ft is hit by an attack, use a reaction to force the attacker to reroll the d20. Uses = PB per long rest. |
| Great Stature | RuneKnight | Giant's Might damage bonus increases to 1d8. Permanently grow by 3d4 inches. |
| Master of Runes | RuneKnight | Invoke each rune twice between rests. |
| Runic Juggernaut | RuneKnight | Giant's Might damage bonus is 1d10 and you grow to Huge size. Reach increases by 5 ft. |
| Tireless Spirit | Samurai | When you roll initiative with no Fighting Spirit uses remaining, regain 1. |
| Rapid Strike | Samurai | If you have advantage on a weapon attack against a creature on your turn, forgo the advantage to make one additional weapon attack against that creatu |
| Skirmisher | Scout | When a creature ends its turn within 5 ft of you, use your reaction to move up to half your speed (no OAs). |
| Sudden Strike | Scout | Once per turn, take an additional attack action as a bonus action. Can apply Sneak Attack to one of those attacks. |
| Shadow Step | Shadow | When in dim light or darkness, use a bonus action to teleport up to 60 ft to another dim/dark space. Advantage on the first melee attack you make befo |
| Strength of the Grave | ShadowMagic | When damage reduces you to 0 HP, make a CHA save (DC = 5 + damage). On success, drop to 1 HP instead. 1/long rest. |
| Shadow Walk | ShadowMagic | When in dim light or darkness, use a bonus action to teleport up to 120 ft to a space you can see in dim light/darkness. |
| Psionic Power | Soulknife | Gain a pool of Psionic Energy Dice (PB+2 starting at d6). Spend dice on options below. Recover all on a long rest, or one on a short rest. |
| Psychic Blades | Soulknife | Manifest a psychic blade in each hand (martial finesse, 1d6 psychic, thrown 60/120). Can be off-hand without consuming bonus action damage rules — sec |
| Soul Blades: Homing Strikes & Psychic Teleportation | Soulknife | Spend one Energy Die when you miss with a Psychic Blade to add the die to the attack roll. Spend one die as a bonus action to teleport 30 ft to an uno |
| Rend Mind | Soulknife | When you deal Sneak Attack with a Psychic Blade, spend 3 dice to stun the target (WIS save) until end of your next long rest (target repeats every 24  |
| Tempestuous Magic | StormSorcery | When you cast a 1st-level+ spell, fly up to 10 ft (no OAs) as part of the casting. |
| Storm Guide | StormSorcery | Above-ground at-will: stop rain in 20 ft around you, or direct light winds to bring something to you. |
| Radiant Sun Bolt | SunSoul | Make a ranged spell attack (30 ft) as your action — deals 1d4 + DEX radiant damage (uses martial-arts die). Counts as monk weapon attacks; use bonus a |
| Searing Arc Strike | SunSoul | Immediately after Attack action, spend 2+ ki to cast Burning Hands as a bonus action (increases by 1 die per additional ki spent, max monk level / 2). |
| Fancy Footwork | Swashbuckler | When you make a melee attack against a creature, it can't make OAs against you for the rest of the turn. |
| Panache | Swashbuckler | Make CHA (Persuasion) vs WIS (Insight). On win: hostile creatures have disadvantage on attacks vs anyone but you (and have OA disadvantage vs you); no |
| Master Duelist | Swashbuckler | When you miss with an attack, give yourself advantage on a reroll. 1/short rest. |
| Fast Hands | Thief | Use your bonus action (Cunning Action) to make a DEX (Sleight of Hand) check, use thieves' tools to disarm a trap or open a lock, or take the Use an O |
| Second-Story Work | Thief | Climbing no longer costs extra movement. When you make a running jump, the distance increases by DEX mod (feet). |
| Use Magic Device | Thief | Ignore all class, race, and level requirements on magic items. |
| Thief's Reflexes | Thief | Take two turns in the first round of combat (first at your normal initiative, second at your initiative - 10). Only on first round, and only if not su |
| Transmutation Savant | Transmutation | Halve the gold and time cost to copy transmutation spells. |
| Minor Alchemy | Transmutation | After 10 minutes, transmute a single non-magical object of one substance into another (wood→steel, stone→gold, etc.). Up to 1 cubic foot per 10 minute |
| Master Transmuter | Transmutation | Destroy your Transmuter's Stone (action) and target one creature/object within 5 ft: major transmutation (Restore Youth, Panacea, Restore Life as Rais |
| Eyes of Night | TwilightDomain | 300-ft darkvision (sees through magical darkness). As an action, share this darkvision with up to PB willing creatures for 1 hour (must be within 10 f |
| Vigilant Blessing | TwilightDomain | Touch a creature (including yourself) and grant advantage on the next initiative roll, until you use this feature again. |
| Twilight Shroud | TwilightDomain | Creatures of your choice in your Twilight Sanctuary have half cover. |
| War God's Blessing | WarDomain | When a creature within 30 ft makes an attack roll, use your reaction to grant a +10 bonus to the roll (using Channel Divinity). |
| Tactical Wit | WarMagic | Add INT mod to your initiative rolls. |
| Power Surge | WarMagic | When you successfully Counterspell or Dispel Magic, gain a Power Surge. Store up to INT mod / 2 (min 1). Spend one when casting a damage spell to add  |
| Durable Magic | WarMagic | While concentrating on a spell, +2 AC and +2 to all saves. |
| Bolstering Magic | WildMagicBarbarian | Touch a creature as an action and confer either: a d3 bonus to attack rolls and ability checks for 10 minutes, or roll a d6 — the creature recovers an |
| Controlled Surge | WildMagicBarbarian | Roll on the Wild Magic table twice and choose which effect to use. If you roll doubles, pick any effect. |
| Wild Magic Surge | WildMagicSorcerer | When you cast a 1st-level+ sorcerer spell, the DM may have you roll a d20. On 1, roll on the Wild Magic Surge table (d100) to determine the effect. |
| Bend Luck | WildMagicSorcerer | When another creature you can see makes an attack, ability check, or save, spend 2 sorcery points (reaction) to roll a d4 and add or subtract from the |
| Controlled Chaos | WildMagicSorcerer | When you roll on the Wild Magic Surge table, roll twice and use either result. |
| Spell Bombardment | WildMagicSorcerer | When you roll damage for a spell and roll the highest possible number on any of the dice, choose one die, roll it again, and add to the damage. 1/turn |
| Divine Fury | Zealot | While raging, the first creature you hit with a melee weapon attack on each of your turns takes extra damage = 1d6 + half your barbarian level (necrot |
| Fanatical Focus | Zealot | While raging, if you fail a saving throw, you can reroll it; you must use the new roll. Once per rage. |
| Rage Beyond Death | Zealot | While raging, having 0 HP doesn't knock you unconscious. You can continue to act and only die if your rage ends. |

## B5. FULL triage table — all parsed subclass entries

Complete machine-generated pass (name | subclass id | class | bucket | template/consumer | effect-from-desc). FLAG/WIRED rows collapsed in prose above; here in full for completeness.

| Name | Subclass id | Cls | Bucket | Template / consumer | Effect (from desc) |
|---|---|---|---|---|---|
| Telepathic Speech | AberrantMind | Sorcerer | FLAG | narrative/utility — no owned number | Telepathically communicate with one creature within 30 ft for 10 min × CHA mod (you both must share a language). |
| Psionic Spells | AberrantMind | Sorcerer | ESCALATE | no clean bucket — human triage in P1 | Learn additional spells. On long rest, replace one with a divination or enchantment spell of the same level. Cast these  |
| Psionic Sorcery | AberrantMind | Sorcerer | ESCALATE | no clean bucket — human triage in P1 | When you cast a Psionic Spell, you can spend sorcery points equal to the slot level instead of using a slot (and cast it |
| Psychic Defenses | AberrantMind | Sorcerer | FLAG | incoming/intake damage modifier — not owned | Resistance to psychic damage. Advantage on saves against being charmed or frightened. |
| Revelation in Flesh | AberrantMind | Sorcerer | FLAG | narrative/utility — no owned number | Spend 1+ sorcery points to manifest aberrant features for 10 min. Each point chooses a benefit (swim/climb, see invisibl |
| Warping Implosion | AberrantMind | Sorcerer | FLAG | aura/area effect on others — sheet owns no surface/event | Teleport up to 120 ft, then unleash a 30-ft aura. Each creature in the aura (other than you) takes 8d10 force damage and |
| Abjuration Savant | Abjuration | Wizard | ESCALATE | no clean bucket — human triage in P1 | Halve the gold and time cost to copy abjuration spells into your spellbook. |
| Arcane Ward | Abjuration | Wizard | ESCALATE | no clean bucket — human triage in P1 | When you cast an abjuration spell of 1st level+, create an Arcane Ward (HP = 2× wizard level + INT mod). It absorbs dama |
| Projected Ward | Abjuration | Wizard | FLAG | aura/area effect on others — sheet owns no surface/event | When a creature within 30 ft takes damage, use your reaction to have your Arcane Ward absorb that damage. |
| Improved Abjuration | Abjuration | Wizard | ESCALATE | no clean bucket — human triage in P1 | When you cast an abjuration spell that requires an ability check (counterspell, dispel magic), add your PB to the check. |
| Spell Resistance | Abjuration | Wizard | FLAG | incoming/intake damage modifier — not owned | Advantage on saves against spells. Resistance to damage from spells. |
| Tool Proficiency (Alchemist's Supplies) | Alchemist | Artificer | WIRED | proficiency / spell-list / language grant (existing grant paths) | You gain proficiency with alchemist's supplies. If you already have it, you learn one other tool proficiency of your cho |
| Experimental Elixir | Alchemist | Artificer | FLAG | healing / temp-HP / party buff — not an owned surface | After a long rest, magically create elixirs. Roll on the Experimental Elixir table (Healing, Swiftness, Resilience, Bold |
| Alchemical Savant | Alchemist | Artificer | FLAG | healing / temp-HP / party buff — not an owned surface | When you cast a spell using alchemist's supplies as a focus, add INT mod (min +1) to one healing or acid/fire/necrotic/p |
| Restorative Reagents | Alchemist | Artificer | FLAG | healing / temp-HP / party buff — not an owned surface | When a creature drinks an experimental elixir, it gains temp HP equal to 2d6 + INT mod. You can also cast Lesser Restora |
| Chemical Mastery | Alchemist | Artificer | FLAG | incoming/intake damage modifier — not owned | Resistance to acid and poison damage; immunity to the poisoned condition. You can cast Greater Restoration and Heal once |
| Ancestral Protectors | AncestralGuardian | Barbarian | FLAG | forces enemy save / imposes condition on others — event not simulated | While raging, the first creature you hit with an attack is hindered: it has disadvantage on attacks against anyone but y |
| Spirit Shield | AncestralGuardian | Barbarian | FLAG | aura/area effect on others — sheet owns no surface/event | While raging, you can use your reaction when another creature you can see within 30 ft takes damage to reduce that damag |
| Consult the Spirits | AncestralGuardian | Barbarian | FLAG | narrative/utility — no owned number | Cast Augury or Clairvoyance once per short or long rest without a spell slot, using WIS for spellcasting. |
| Vengeful Ancestors | AncestralGuardian | Barbarian | ESCALATE | no clean bucket — human triage in P1 | When you use Spirit Shield, the attacker takes force damage equal to the amount of damage prevented. |
| Arcane Initiate | ArcanaDomain | Cleric | WIRED | proficiency / spell-list / language grant (existing grant paths) | Gain proficiency in the Arcana skill and learn two wizard cantrips. |
| Spell Breaker | ArcanaDomain | Cleric | FLAG | healing / temp-HP / party buff — not an owned surface | When you restore HP with a 1st-level+ spell, you can also end one spell on the creature whose level is ≤ the slot used. |
| Potent Spellcasting | ArcanaDomain | Cleric | ESCALATE | no clean bucket — human triage in P1 | Add your WIS mod to cleric cantrip damage. |
| Arcane Mastery | ArcanaDomain | Cleric | ESCALATE | no clean bucket — human triage in P1 | Choose four spells (one each from 6th/7th/8th/9th level) from the wizard list. They become cleric spells for you, prepar |
| Arcane Archer Lore | ArcaneArcher | Fighter | WIRED | proficiency / spell-list / language grant (existing grant paths) | Gain proficiency in Arcana or Nature, and learn the Prestidigitation or Druidcraft cantrip. |
| Arcane Shot | ArcaneArcher | Fighter | ESCALATE | no clean bucket — human triage in P1 | Learn 2 Arcane Shot options. Once per turn when you fire an arrow from a shortbow or longbow as part of the Attack actio |
| Curving Shot | ArcaneArcher | Fighter | ESCALATE | no clean bucket — human triage in P1 | When you make a magic arrow attack roll that misses, use a bonus action to reroll the attack against a different target  |
| Magic Arrow | ArcaneArcher | Fighter | ESCALATE | no clean bucket — human triage in P1 | Whenever you fire a non-magical arrow from a shortbow or longbow, you can make it magical for the purpose of overcoming  |
| Arcane Shot Options | ArcaneArcher | Fighter | ESCALATE | no clean bucket — human triage in P1 | Learn 2 more Arcane Shot options. Damage of each option increases. |
| Ever-Ready Shot | ArcaneArcher | Fighter | ESCALATE | no clean bucket — human triage in P1 | If you roll initiative with no Arcane Shot uses remaining, you regain 1. |
| Arcane Shot Mastery | ArcaneArcher | Fighter | ESCALATE | no clean bucket — human triage in P1 | Learn 2 final Arcane Shot options; damage of each option increases further. |
| Spellcasting | ArcaneTrickster | Rogue | ESCALATE | no clean bucket — human triage in P1 | Cast wizard spells (Illusion and Enchantment; other schools at levels 8/14/20). Use INT as your spellcasting ability. |
| Mage Hand Legerdemain | ArcaneTrickster | Rogue | FLAG | narrative/utility — no owned number | You always know Mage Hand and can make the hand invisible. Use it to stow/retrieve from another creature's container, us |
| Magical Ambush | ArcaneTrickster | Rogue | ESCALATE | no clean bucket — human triage in P1 | If you are hidden from a creature when you cast a spell on it, the creature has disadvantage on any save against the spe |
| Versatile Trickster | ArcaneTrickster | Rogue | FLAG | aura/area effect on others — sheet owns no surface/event | As a bonus action, use Mage Hand to distract a creature within 5 ft of the hand. You have advantage on attack rolls agai |
| Spell Thief | ArcaneTrickster | Rogue | ESCALATE | no clean bucket — human triage in P1 | When a creature casts a spell that targets you, use your reaction to force a save vs your spell DC. On failure, you stea |
| Fey Presence | Archfey | Warlock | FLAG | aura/area effect on others — sheet owns no surface/event | As an action, each creature in a 10-ft cube originating from you makes a WIS save or is charmed or frightened (your choi |
| Misty Escape | Archfey | Warlock | FLAG | incoming/intake damage modifier — not owned | When you take damage, use your reaction to teleport up to 60 ft and become invisible until end of next turn or until you |
| Beguiling Defenses | Archfey | Warlock | FLAG | forces enemy save / imposes condition on others — event not simulated | Immune to being charmed. When a creature tries to charm you, use your reaction to redirect the charm to them (WIS save o |
| Dark Delirium | Archfey | Warlock | FLAG | aura/area effect on others — sheet owns no surface/event | As an action, charm or frighten one creature within 60 ft (WIS save) for 1 minute. Target perceives illusory landscape.  |
| Tools of the Trade | Armorer | Artificer | WIRED | proficiency / spell-list / language grant (existing grant paths) | You gain proficiency with heavy armor and smith's tools. If you already have smith's tools, you gain one other tool prof |
| Arcane Armor | Armorer | Artificer | ESCALATE | no clean bucket — human triage in P1 | Your armor becomes a magical suit. It includes integrated weapons (Thunder Gauntlets for Guardian; Lightning Launcher fo |
| Armor Model (Guardian / Infiltrator) | Armorer | Artificer | FLAG | healing / temp-HP / party buff — not an owned surface | Guardian: Thunder Gauntlets (1d8 thunder, disadvantage on attacks not targeting you), Defensive Field (bonus action: tem |
| Armor Modifications | Armorer | Artificer | ESCALATE | no clean bucket — human triage in P1 | You can apply up to 2 infusions at once to your Arcane Armor (it counts as 2 separate items for infusion purposes). |
| Extra Attack | Armorer | Artificer | ESCALATE | no clean bucket — human triage in P1 | You can attack twice, instead of once, whenever you take the Attack action on your turn. |
| Armor Modifications (improved) | Armorer | Artificer | ESCALATE | no clean bucket — human triage in P1 | You can apply up to 4 infusions at once to your Arcane Armor (helmet, boots, breastplate, gauntlets — each treated separ |
| Perfected Armor | Armorer | Artificer | FLAG | aura/area effect on others — sheet owns no surface/event | Guardian: when a creature within 30 ft you can see hits a target other than you with an attack, use a reaction to magnet |
| Tools of the Trade | Artillerist | Artificer | WIRED | proficiency / spell-list / language grant (existing grant paths) | You gain proficiency with martial weapons and woodcarver's tools. |
| Eldritch Cannon | Artillerist | Artificer | FLAG | healing / temp-HP / party buff — not an owned surface | As an action, magically conjure a Tiny or Small cannon (AC 18, HP = 5×Artificer level). Choose Flamethrower (15 ft cone, |
| Arcane Firearm | Artillerist | Artificer | ESCALATE | no clean bucket — human triage in P1 | After a long rest, magically modify a wand/staff/rod into your Arcane Firearm. When you cast a spell through it, roll a  |
| Explosive Cannon | Artillerist | Artificer | FLAG | aura/area effect on others — sheet owns no surface/event | Eldritch Cannon damage dice increase from d8 to d10. You can also command the cannon to detonate as an action (forfeitin |
| Fortified Position | Artillerist | Artificer | FLAG | healing / temp-HP / party buff — not an owned surface | You and allies have half cover while within 10 ft of an Eldritch Cannon you can see. You can have two Eldritch Cannons a |
| Bonus Proficiencies | Assassin | Rogue | WIRED | proficiency / spell-list / language grant (existing grant paths) | Gain proficiency with the disguise kit and the poisoner's kit. |
| Assassinate | Assassin | Rogue | ESCALATE | no clean bucket — human triage in P1 | Advantage on attacks against creatures that haven't taken a turn in combat yet. Any hit you score against a surprised cr |
| Infiltration Expertise | Assassin | Rogue | ESCALATE | no clean bucket — human triage in P1 | Spend 7 days and 25 gp to establish a false identity. The identity is supported by paperwork, contacts, and reputation. |
| Impostor | Assassin | Rogue | ESCALATE | no clean bucket — human triage in P1 | Mimic another creature's speech, writing, and behavior (after spending at least 3 hours studying). DC = 8 + their PB on  |
| Death Strike | Assassin | Rogue | ESCALATE | no clean bucket — human triage in P1 | When you hit a surprised creature, double the damage dealt. Target makes CON save (DC = 8 + PB + DEX) or takes double da |
| Arms of the Astral Self | AstralSelf | Monk | ESCALATE | no clean bucket — human triage in P1 | As a bonus action, spend 1 ki to manifest spectral arms for 10 minutes. They reach 5 ft beyond your normal reach, use WI |
| Visage of the Astral Self | AstralSelf | Monk | FLAG | companion/summon/echo stat-block — belongs to the summon system, not self-state | As a bonus action, spend 1 ki to manifest your astral visage for 10 min (or part of Astral Self manifestation). Astral S |
| Body of the Astral Self | AstralSelf | Monk | FLAG | companion/summon/echo stat-block — belongs to the summon system, not self-state | Spend 1 ki to manifest your astral body. Deflective Power (reduce attack damage), Empowered Arms (extra force damage 1/t |
| Awakened Astral Self | AstralSelf | Monk | ESCALATE | no clean bucket — human triage in P1 | Spend 5 ki as bonus action to manifest full Astral Self for 10 min: +2 AC, extra arm attacks count as one additional Att |
| Combat Superiority | BattleMaster | Fighter | ESCALATE | no clean bucket — human triage in P1 | Gain 4 Superiority Dice (d8) and learn 3 maneuvers. Maneuver save DC = 8 + Prof + STR or DEX (your choice). |
| Student of War | BattleMaster | Fighter | WIRED | proficiency / spell-list / language grant (existing grant paths) | Gain proficiency with one type of artisan's tools of your choice. |
| Know Your Enemy | BattleMaster | Fighter | FLAG | information/utility — no owned number | Study a creature for 1 minute outside combat: learn how its STR, DEX, CON, AC, current HP, total class levels (if any),  |
| Improved Combat Superiority | BattleMaster | Fighter | ESCALATE | no clean bucket — human triage in P1 | Superiority Dice become d10s (d12s at level 18). Learn 2 more maneuvers and gain 1 additional die (5 total). |
| Relentless | BattleMaster | Fighter | ESCALATE | no clean bucket — human triage in P1 | When you roll initiative and have no superiority dice, regain 1. |
| Improved Combat Superiority | BattleMaster | Fighter | ESCALATE | no clean bucket — human triage in P1 | Superiority Dice become d12s. |
| Battlerager Armor | Battlerager | Barbarian | R3 | granted action/bonus/reaction attack (template: getAvailableActions index.ts:398 + ACTIONS data) | While wearing spiked armor and raging, use a bonus action to make one melee weapon attack with your armor spikes (1d4 pi |
| Reckless Abandon | Battlerager | Barbarian | FLAG | healing / temp-HP / party buff — not an owned surface | When you use Reckless Attack while raging, you also gain temp HP = your CON mod (minimum 1). |
| Battlerager Charge | Battlerager | Barbarian | R3 | granted action/bonus/reaction attack (template: getAvailableActions index.ts:398 + ACTIONS data) | While raging, take the Dash action as a bonus action on your turn. |
| Spiked Retribution | Battlerager | Barbarian | FLAG | aura/area effect on others — sheet owns no surface/event | While raging, wearing spiked armor, and not incapacitated, any creature within 5 ft that hits you with a melee attack ta |
| Tools of the Trade | BattleSmith | Artificer | WIRED | proficiency / spell-list / language grant (existing grant paths) | You gain proficiency with martial weapons and smith's tools. |
| Battle Ready | BattleSmith | Artificer | ESCALATE | no clean bucket — human triage in P1 | When you attack with a magic weapon you can use INT instead of STR or DEX for attack and damage rolls. |
| Steel Defender | BattleSmith | Artificer | FLAG | companion/summon/echo stat-block — belongs to the summon system, not self-state | Construct an iron defender (AC 15, HP = 2 + INT mod + 5×Artificer level, speed 40 ft). It obeys your commands. Use your  |
| Extra Attack | BattleSmith | Artificer | ESCALATE | no clean bucket — human triage in P1 | You can attack twice, instead of once, whenever you take the Attack action on your turn. |
| Arcane Jolt | BattleSmith | Artificer | FLAG | companion/summon/echo stat-block — belongs to the summon system, not self-state | When you hit a target with a magic weapon attack or your Steel Defender hits, deal extra 2d6 force damage OR distribute  |
| Improved Defender | BattleSmith | Artificer | FLAG | companion/summon/echo stat-block — belongs to the summon system, not self-state | Steel Defender gets +2 AC and Arcane Jolt extra is 4d6. Whenever the defender uses Deflect Attack, the attacker takes 1d |
| Form of the Beast | Beast | Barbarian | FLAG | healing / temp-HP / party buff — not an owned surface | When you rage, choose a natural weapon: Bite (1d8 piercing + heal yourself), Claws (1d6 slashing + extra attack), or Tai |
| Bestial Soul | Beast | Barbarian | ESCALATE | no clean bucket — human triage in P1 | Your natural weapons count as magical. Choose a benefit when you finish a long rest: swim + breathe water, climb without |
| Infectious Fury | Beast | Barbarian | FLAG | healing / temp-HP / party buff — not an owned surface | When you hit a creature with your natural weapons while raging, you can force it to make a WIS save. Failure: use reacti |
| Call the Hunt | Beast | Barbarian | FLAG | aura/area effect on others — sheet owns no surface/event | When you enter your rage, choose up to PB creatures within 30 ft. They gain 5 + barbarian level temp HP and advantage on |
| Ranger's Companion | BeastMaster | Ranger | FLAG | companion/summon/echo stat-block — belongs to the summon system, not self-state | Bond with a beast (CR 1/4 or lower, no flying speed >30 ft). It acts on your initiative, adds your PB to its AC/attacks/ |
| Exceptional Training | BeastMaster | Ranger | ESCALATE | no clean bucket — human triage in P1 | On any turn your beast doesn't attack, command it to take Dash/Disengage/Dodge/Help as a bonus action. Its attacks count |
| Bestial Fury | BeastMaster | Ranger | ESCALATE | no clean bucket — human triage in P1 | When you command your beast to take the Attack action, it can make 2 attacks. |
| Share Spells | BeastMaster | Ranger | ESCALATE | no clean bucket — human triage in P1 | When you cast a spell targeting yourself, you can also affect your beast if within 30 ft. |
| Frenzy | Berserker | Barbarian | R3 | granted action/bonus/reaction attack (template: getAvailableActions index.ts:398 + ACTIONS data) | While raging, you can make a single melee weapon attack as a bonus action on each of your turns. When your rage ends, yo |
| Mindless Rage | Berserker | Barbarian | FLAG | forces enemy save / imposes condition on others — event not simulated | You can't be charmed or frightened while raging. If you are charmed or frightened when you enter your rage, the effect i |
| Intimidating Presence | Berserker | Barbarian | FLAG | aura/area effect on others — sheet owns no surface/event | As an action, choose one creature you can see within 30 ft. It must succeed on a WIS save (DC = 8 + Prof + STR mod) or b |
| Retaliation | Berserker | Barbarian | R3 | granted action/bonus/reaction attack (template: getAvailableActions index.ts:398 + ACTIONS data) | When you take damage from a creature within 5 ft, you can use your reaction to make a melee weapon attack against that c |
| Training in War and Song | Bladesinging | Wizard | WIRED | proficiency / spell-list / language grant (existing grant paths) | Gain proficiency with light armor and one one-handed melee weapon. |
| Bladesong | Bladesinging | Wizard | R1 | static self AC — collect.ts fold (consumer defense.ts:74/90) | As a bonus action, enter Bladesong (1 min, ends if you wear medium/heavy armor, shield, or incapacitated). Gain +INT mod |
| Extra Attack | Bladesinging | Wizard | ESCALATE | no clean bucket — human triage in P1 | You can attack twice when you take the Attack action. One of these can be replaced with a cantrip (1 action casting time |
| Song of Defense | Bladesinging | Wizard | FLAG | incoming/intake damage modifier — not owned | While Bladesong is active, when you take damage, expend a slot as a reaction to reduce the damage by 5 × slot level. |
| Song of Victory | Bladesinging | Wizard | ESCALATE | no clean bucket — human triage in P1 | While Bladesong is active, add your INT mod (min +1) to melee weapon damage rolls. |
| Bonus Proficiency | Cavalier | Fighter | WIRED | proficiency / spell-list / language grant (existing grant paths) | Gain proficiency in one of: Animal Handling, History, Insight, Performance, Persuasion — or one language of your choice. |
| Born to the Saddle | Cavalier | Fighter | ESCALATE | no clean bucket — human triage in P1 | Advantage on saves to avoid falling off your mount. Mounting/dismounting costs 5 ft of movement (instead of half your sp |
| Unwavering Mark | Cavalier | Fighter | FLAG | forces enemy save / imposes condition on others — event not simulated | When you hit a creature with a melee weapon attack, mark it until the end of your next turn. The marked creature has dis |
| Warding Maneuver | Cavalier | Fighter | FLAG | healing / temp-HP / party buff — not an owned surface | When a creature you can see attacks an ally within 5 ft of you, use your reaction to add 1d8 to the target's AC against  |
| Hold the Line | Cavalier | Fighter | ESCALATE | no clean bucket — human triage in P1 | Creatures provoke an OA from you when they move 5 ft or more while within your reach. Hitting a creature with an OA redu |
| Ferocious Charger | Cavalier | Fighter | FLAG | forces enemy save / imposes condition on others — event not simulated | If you move at least 10 ft straight toward a target and hit it with a melee attack on the same turn, the target makes a  |
| Vigilant Defender | Cavalier | Fighter | ESCALATE | no clean bucket — human triage in P1 | You can make an OA on every creature's turn (except yours) when an opportunity is triggered, instead of being limited to |
| Bonus Cantrips | Celestial | Warlock | ESCALATE | no clean bucket — human triage in P1 | Learn Light and Sacred Flame cantrips. |
| Healing Light | Celestial | Warlock | FLAG | aura/area effect on others — sheet owns no surface/event | Bonus action pool of d6s = 1 + warlock level. Spend up to CHA mod (min 1) dice to heal a creature within 60 ft. Pool ref |
| Radiant Soul | Celestial | Warlock | ESCALATE | no clean bucket — human triage in P1 | When you cast a spell or use a magical effect that deals radiant or fire damage, add CHA mod (min 1) to one damage roll. |
| Celestial Resilience | Celestial | Warlock | FLAG | aura/area effect on others — sheet owns no surface/event | After a short or long rest, gain temp HP = warlock level + CHA mod, and 5 + half level temp HP for up to 5 other creatur |
| Searing Vengeance | Celestial | Warlock | FLAG | aura/area effect on others — sheet owns no surface/event | When you or an ally within 60 ft is reduced to 0 HP, you can use your reaction to stand up (1 HP), regain HP = 2d8 + CHA |
| Improved Critical | Champion | Fighter | ESCALATE | no clean bucket — human triage in P1 | Your weapon attacks score a critical hit on a roll of 19 or 20. |
| Remarkable Athlete | Champion | Fighter | ESCALATE | no clean bucket — human triage in P1 | Add half your proficiency bonus (round up) to any STR, DEX, or CON check that doesn't already include your proficiency b |
| Additional Fighting Style | Champion | Fighter | ESCALATE | no clean bucket — human triage in P1 | Choose a second option from the Fighting Style class feature. |
| Superior Critical | Champion | Fighter | ESCALATE | no clean bucket — human triage in P1 | Your weapon attacks score a critical hit on a roll of 18, 19, or 20. |
| Survivor | Champion | Fighter | FLAG | healing / temp-HP / party buff — not an owned surface | At the start of each of your turns, regain HP = 5 + your CON mod if you have no more than half your HP left. No effect i |
| Chronal Shift | Chronurgy | Wizard | FLAG | aura/area effect on others — sheet owns no surface/event | When a creature you can see within 30 ft (including you) makes an attack, ability check, or save, use your reaction to f |
| Temporal Awareness | Chronurgy | Wizard | ESCALATE | no clean bucket — human triage in P1 | Add INT mod to your initiative rolls. |
| Momentary Stasis | Chronurgy | Wizard | FLAG | aura/area effect on others — sheet owns no surface/event | As an action, force a Large or smaller creature within 60 ft to make a CON save or be incapacitated (and speed 0) until  |
| Arcane Abeyance | Chronurgy | Wizard | FLAG | narrative/utility — no owned number | When you cast a 4th-level or lower spell with a slot, store it in a temporal mote (lasts 1 hour). Any creature can use a |
| Convergent Future | Chronurgy | Wizard | ESCALATE | no clean bucket — human triage in P1 | When a creature you can see within 60 ft makes a roll, choose to have it auto-succeed or auto-fail. After each use, gain |
| Balm of the Summer Court | CircleOfDreams | Druid | FLAG | aura/area effect on others — sheet owns no surface/event | Have a pool of d6s = your druid level. As a bonus action, choose one creature within 120 ft; spend up to PB dice to rest |
| Hearth of Moonlight and Shadow | CircleOfDreams | Druid | ESCALATE | no clean bucket — human triage in P1 | During a short or long rest, surround your campsite with a 30-ft sphere of magical concealment (heavy obscurity, +5 to S |
| Hidden Paths | CircleOfDreams | Druid | ESCALATE | no clean bucket — human triage in P1 | Teleport up to 60 ft to a space you can see as a bonus action, or teleport one willing creature within 30 ft up to 60 ft |
| Walker in Dreams | CircleOfDreams | Druid | FLAG | narrative/utility — no owned number | After a short rest, cast Dream (targeting yourself), Scrying, or Teleportation Circle without a slot — but Teleportation |
| Halo of Spores | CircleOfSpores | Druid | FLAG | aura/area effect on others — sheet owns no surface/event | A 10-ft aura of spores surrounds you. When a creature you can see moves into or starts its turn within 10 ft, use your r |
| Symbiotic Entity | CircleOfSpores | Druid | FLAG | aura/area effect on others — sheet owns no surface/event | Activate symbiotic spores (1/long rest, expend a use of Wild Shape): gain 4× druid level temp HP, melee weapon attacks d |
| Fungal Infestation | CircleOfSpores | Druid | FLAG | companion/summon/echo stat-block — belongs to the summon system, not self-state | When a Small or Medium beast or humanoid dies within 10 ft, use your reaction to animate it as a zombie (CR 1/4). It act |
| Spreading Spores | CircleOfSpores | Druid | FLAG | aura/area effect on others — sheet owns no surface/event | As a bonus action, throw spores up to 30 ft. They create a 10-ft cube halo effect for 1 minute (deals damage as Halo of  |
| Fungal Body | CircleOfSpores | Druid | R1 | static self save-advantage/immunity — collect.ts fold (saveBonus/flag) | Immune to being blinded, deafened, frightened, and poisoned. Critical hits against you don't deal extra damage. |
| Star Map | CircleOfStars | Druid | FLAG | narrative/utility — no owned number | Create a star chart. Learn Guidance cantrip (counts as a druid cantrip), and cast Guiding Bolt without a slot PB times p |
| Starry Form | CircleOfStars | Druid | FLAG | companion/summon/echo stat-block — belongs to the summon system, not self-state | Use Wild Shape (no transformation) to assume a starry form for 10 min. Choose Archer (bonus action ranged spell attack,  |
| Cosmic Omen | CircleOfStars | Druid | FLAG | healing / temp-HP / party buff — not an owned surface | After a long rest, roll a d6 (or omen die). On even: Weal — use reaction to add 1d6 to nearby ally's rolls. On odd: Woe  |
| Twinkling Constellations | CircleOfStars | Druid | FLAG | companion/summon/echo stat-block — belongs to the summon system, not self-state | Archer/Chalice/Dragon improve. You can change starry form choice at the start of each turn. Also gain a flying speed of  |
| Full of Stars | CircleOfStars | Druid | FLAG | companion/summon/echo stat-block — belongs to the summon system, not self-state | While in starry form, gain resistance to bludgeoning, piercing, and slashing damage. |
| Bonus Cantrip | CircleOfTheLand | Druid | WIRED | proficiency / spell-list / language grant (existing grant paths) | Learn one additional druid cantrip. |
| Natural Recovery | CircleOfTheLand | Druid | ESCALATE | no clean bucket — human triage in P1 | During a short rest, recover spell slots whose total level ≤ half your druid level (round up). No slot can be 6th level  |
| Land's Stride | CircleOfTheLand | Druid | ESCALATE | no clean bucket — human triage in P1 | Move through non-magical difficult terrain without extra movement. You can pass through non-magical plants without takin |
| Nature's Ward | CircleOfTheLand | Druid | FLAG | forces enemy save / imposes condition on others — event not simulated | Can't be charmed or frightened by elementals or fey. Immune to poison and disease. |
| Nature's Sanctuary | CircleOfTheLand | Druid | FLAG | forces enemy save / imposes condition on others — event not simulated | When a beast or plant creature attacks you, it must succeed on a WIS save (DC 8 + Prof + WIS) or choose a different targ |
| Combat Wild Shape | CircleOfTheMoon | Druid | FLAG | healing / temp-HP / party buff — not an owned surface | Wild Shape as a bonus action. Spend a bonus action while transformed to regain HP = 1d8 per spell slot expended. |
| Circle Forms | CircleOfTheMoon | Druid | ESCALATE | no clean bucket — human triage in P1 | Wild Shape into beasts with CR up to your druid level / 3 (round down), minimum 1. At level 6, CR limit becomes your dru |
| Primal Strike | CircleOfTheMoon | Druid | ESCALATE | no clean bucket — human triage in P1 | Your attacks in beast form count as magical for overcoming resistance and immunity. |
| Elemental Wild Shape | CircleOfTheMoon | Druid | ESCALATE | no clean bucket — human triage in P1 | Expend 2 uses of Wild Shape (instead of 1) to transform into an Air, Earth, Fire, or Water elemental. |
| Thousand Forms | CircleOfTheMoon | Druid | FLAG | narrative/utility — no owned number | Cast Alter Self at will. |
| Speech of the Woods | CircleOfTheShepherd | Druid | FLAG | narrative/utility — no owned number | Speak Sylvan and converse with beasts (limited intelligence but they can convey meanings). |
| Spirit Totem | CircleOfTheShepherd | Druid | FLAG | aura/area effect on others — sheet owns no surface/event | As a bonus action, create a 30-ft aura totem (Bear: temp HP and advantage on STR; Hawk: use reaction to grant advantage  |
| Mighty Summoner | CircleOfTheShepherd | Druid | ESCALATE | no clean bucket — human triage in P1 | Beasts and fey you summon gain +2 HP per HD, and their attacks count as magical. |
| Guardian Spirit | CircleOfTheShepherd | Druid | FLAG | healing / temp-HP / party buff — not an owned surface | Beasts/fey summoned by your spells that end their turn in your Spirit Totem aura regain HP = half your druid level. |
| Faithful Summons | CircleOfTheShepherd | Druid | ESCALATE | no clean bucket — human triage in P1 | When you are reduced to 0 HP or incapacitated against your will, four spirit beasts (CR 2 or lower) appear within 20 ft  |
| Summon Wildfire Spirit | CircleOfWildfire | Druid | ESCALATE | no clean bucket — human triage in P1 | Expend a Wild Shape use to summon a Wildfire Spirit (small elemental, scales with druid level). 1-hour duration. Wildfir |
| Enhanced Bond | CircleOfWildfire | Druid | FLAG | aura/area effect on others — sheet owns no surface/event | When you cast a fire or healing spell, you can target through your Wildfire Spirit (within 30 ft). Spell damage rolls ad |
| Cauterizing Flames | CircleOfWildfire | Druid | FLAG | healing / temp-HP / party buff — not an owned surface | When a Small+ creature dies within 30 ft of you or your spirit, a harmless flame appears for 1 minute. Use a bonus actio |
| Blazing Revival | CircleOfWildfire | Druid | FLAG | healing / temp-HP / party buff — not an owned surface | When you drop to 0 HP while your Wildfire Spirit is present, the spirit perishes and you regain HP equal to half your ma |
| Clockwork Magic | ClockworkSoul | Sorcerer | ESCALATE | no clean bucket — human triage in P1 | Learn additional spells from the Order list. On long rest, replace one with an abjuration or transmutation spell of the  |
| Restore Balance | ClockworkSoul | Sorcerer | FLAG | aura/area effect on others — sheet owns no surface/event | When a creature within 60 ft is about to roll a d20 with advantage or disadvantage, use your reaction to cancel the adva |
| Bastion of Law | ClockworkSoul | Sorcerer | FLAG | aura/area effect on others — sheet owns no surface/event | As an action, spend 1-5 sorcery points to create a magical ward on a creature you can see within 30 ft. The ward has 5 d |
| Trance of Order | ClockworkSoul | Sorcerer | ESCALATE | no clean bucket — human triage in P1 | As a bonus action, enter a trance for 1 minute. Treat any d20 of 9 or lower on attack rolls, ability checks, and saves a |
| Clockwork Cavalcade | ClockworkSoul | Sorcerer | FLAG | aura/area effect on others — sheet owns no surface/event | As an action, summon a manifestation of clockwork spirits in a 30-ft cube. Restores 100 HP distributed among creatures,  |
| Mote of Potential | CollegeOfCreation | Bard | ESCALATE | no clean bucket — human triage in P1 | When you give a Bardic Inspiration die, also create a mote of dancing light next to the recipient. Adds a small bonus ef |
| Performance of Creation | CollegeOfCreation | Bard | ESCALATE | no clean bucket — human triage in P1 | As an action, conjure a non-magical item of your choice. Size up to medium; max value 20gp × bard level; lasts up to bar |
| Animating Performance | CollegeOfCreation | Bard | FLAG | companion/summon/echo stat-block — belongs to the summon system, not self-state | After 1 minute of performance, animate a Large or smaller non-magical object as an action. It acts on your initiative co |
| Creative Crescendo | CollegeOfCreation | Bard | ESCALATE | no clean bucket — human triage in P1 | Performance of Creation lets you make up to PB items at once; one item can be Large or smaller; the item value cap is re |
| Silver Tongue | CollegeOfEloquence | Bard | R5b | advantage/floor on ability check — ability detail panel (BUILD consumer; ref: computeAttackAdvantage index.ts:39) | When you make a CHA (Persuasion or Deception) check, treat any d20 roll of 9 or lower as a 10. |
| Unsettling Words | CollegeOfEloquence | Bard | FLAG | aura/area effect on others — sheet owns no surface/event | As a bonus action, expend one Bardic Inspiration die. Choose a creature within 60 ft; it subtracts the die from its next |
| Unfailing Inspiration | CollegeOfEloquence | Bard | ESCALATE | no clean bucket — human triage in P1 | When a creature adds your Bardic Inspiration die to a roll that fails, the creature keeps the die. |
| Universal Speech | CollegeOfEloquence | Bard | ESCALATE | no clean bucket — human triage in P1 | As an action, any number of creatures within 60 ft can understand your speech for 1 hour. CHA mod uses per long rest. |
| Infectious Inspiration | CollegeOfEloquence | Bard | ESCALATE | no clean bucket — human triage in P1 | When a creature within 60 ft adds your Bardic Inspiration die to its roll and it succeeds, use your reaction to grant an |
| Mantle of Inspiration | CollegeOfGlamour | Bard | FLAG | healing / temp-HP / party buff — not an owned surface | As a bonus action, expend one Bardic Inspiration die to give CHA mod (min 1) creatures temp HP = inspiration die + your  |
| Enthralling Performance | CollegeOfGlamour | Bard | FLAG | aura/area effect on others — sheet owns no surface/event | After a 1-minute performance, up to CHA mod humanoids within 60 ft must WIS save or be charmed for 1 hour. 1/short rest. |
| Mantle of Majesty | CollegeOfGlamour | Bard | FLAG | narrative/utility — no owned number | As a bonus action, cast Command without a slot. As a bonus action on each subsequent turn, command another target for 1  |
| Unbreakable Majesty | CollegeOfGlamour | Bard | FLAG | forces enemy save / imposes condition on others — event not simulated | As a bonus action, assume a majestic presence for 1 minute. Creatures must succeed on a CHA save to target you. If a tar |
| Bonus Proficiencies | CollegeOfLore | Bard | WIRED | proficiency / spell-list / language grant (existing grant paths) | Gain proficiency with three skills of your choice. |
| Cutting Words | CollegeOfLore | Bard | FLAG | aura/area effect on others — sheet owns no surface/event | When a creature you can see within 60 ft makes an attack roll, ability check, or damage roll, use your reaction to expen |
| Additional Magical Secrets | CollegeOfLore | Bard | WIRED | proficiency / spell-list / language grant (existing grant paths) | Learn two spells of your choice from any class. They count as bard spells for you but don't count against your spells kn |
| Peerless Skill | CollegeOfLore | Bard | ESCALATE | no clean bucket — human triage in P1 | When you make an ability check, expend one Bardic Inspiration die and add it to your roll. You can do so after the d20 r |
| Bonus Proficiencies | CollegeOfSwords | Bard | WIRED | proficiency / spell-list / language grant (existing grant paths) | Gain proficiency with medium armor and scimitars. |
| Fighting Style | CollegeOfSwords | Bard | ESCALATE | no clean bucket — human triage in P1 | Choose Dueling or Two-Weapon Fighting. |
| Blade Flourish | CollegeOfSwords | Bard | R1 | static self AC — collect.ts fold (consumer defense.ts:74/90) | Once per turn, +10 ft speed when you take the Attack action. Spend one Bardic Inspiration die on a flourish: Defensive ( |
| Extra Attack | CollegeOfSwords | Bard | ESCALATE | no clean bucket — human triage in P1 | You can attack twice, instead of once, whenever you take the Attack action on your turn. |
| Master's Flourish | CollegeOfSwords | Bard | ESCALATE | no clean bucket — human triage in P1 | When you use a Blade Flourish, you can roll a d6 instead of expending a Bardic Inspiration die. |
| Bonus Proficiencies | CollegeOfValor | Bard | WIRED | proficiency / spell-list / language grant (existing grant paths) | Gain proficiency with medium armor, shields, and martial weapons. |
| Combat Inspiration | CollegeOfValor | Bard | ESCALATE | no clean bucket — human triage in P1 | A creature holding one of your Bardic Inspiration dice can spend it: as a reaction when hit by an attack to add the die  |
| Extra Attack | CollegeOfValor | Bard | ESCALATE | no clean bucket — human triage in P1 | You can attack twice, instead of once, whenever you take the Attack action on your turn. |
| Battle Magic | CollegeOfValor | Bard | ESCALATE | no clean bucket — human triage in P1 | When you take the Attack action on your turn, you can use a bonus action to cast a bard cantrip or 1st-level+ bard spell |
| Psychic Blades | CollegeOfWhispers | Bard | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | When you hit with a weapon attack, expend one Bardic Inspiration die to deal extra psychic damage = die + 1d6 per 4 bard |
| Words of Terror | CollegeOfWhispers | Bard | FLAG | forces enemy save / imposes condition on others — event not simulated | After 1 minute of conversation with one humanoid, force a WIS save or it is frightened of you/another for 1 hour. 1/shor |
| Mantle of Whispers | CollegeOfWhispers | Bard | FLAG | narrative/utility — no owned number | When a humanoid dies within 30 ft, capture its shadow as a reaction. As an action, become an impostor of that creature f |
| Shadow Lore | CollegeOfWhispers | Bard | ESCALATE | no clean bucket — human triage in P1 | Whisper a magical secret as an action. Target makes a WIS save (advantage if not understanding you) or is charmed for 8  |
| Conjuration Savant | Conjuration | Wizard | ESCALATE | no clean bucket — human triage in P1 | Halve the gold and time cost to copy conjuration spells into your spellbook. |
| Minor Conjuration | Conjuration | Wizard | FLAG | narrative/utility — no owned number | As an action, conjure an inanimate object of your choice (≤ 3 ft each side, ≤ 10 lbs) in an unoccupied space you can see |
| Benign Transposition | Conjuration | Wizard | ESCALATE | no clean bucket — human triage in P1 | As an action, teleport up to 30 ft to a space you can see. Or swap places with a willing creature of Medium or smaller w |
| Focused Conjuration | Conjuration | Wizard | ESCALATE | no clean bucket — human triage in P1 | While concentrating on a conjuration spell, your concentration can't be broken by taking damage. |
| Durable Summons | Conjuration | Wizard | FLAG | healing / temp-HP / party buff — not an owned surface | Any creature you summon or create with a conjuration spell has 30 temp HP. |
| Reaper | DeathDomain | Cleric | WIRED | proficiency / spell-list / language grant (existing grant paths) | Learn one necromancy cantrip from any class's spell list. Necromancy cantrips that target a single creature can target t |
| Inescapable Destruction | DeathDomain | Cleric | FLAG | incoming/intake damage modifier — not owned | Your necrotic spell/Channel Divinity damage ignores resistance to necrotic damage. |
| Divine Strike | DeathDomain | Cleric | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | Once per turn, when you hit with a weapon, add 1d8 (2d8 at lv 14) necrotic damage. |
| Improved Reaper | DeathDomain | Cleric | ESCALATE | no clean bucket — human triage in P1 | When you cast a 1st-5th level necromancy spell that targets one creature, you can target two creatures within 5 ft of ea |
| Divination Savant | Divination | Wizard | ESCALATE | no clean bucket — human triage in P1 | Halve the gold and time cost to copy divination spells. |
| Portent | Divination | Wizard | ESCALATE | no clean bucket — human triage in P1 | After a long rest, roll 2 d20s and record them. You can replace any attack roll, save, or ability check (made by you or  |
| Expert Divination | Divination | Wizard | ESCALATE | no clean bucket — human triage in P1 | When you cast a divination spell of 2nd level+, regain one expended spell slot (level ≤ spell's level - 1, max 5th). |
| The Third Eye | Divination | Wizard | FLAG | narrative/utility — no owned number | As an action, magnify a sense for 24 hours: Darkvision (60 ft), Ethereal Sight (60 ft), Greater Comprehension (read any  |
| Greater Portent | Divination | Wizard | ESCALATE | no clean bucket — human triage in P1 | Roll 3 dice for Portent after each long rest. |
| Divine Magic | DivineSoul | Sorcerer | ESCALATE | no clean bucket — human triage in P1 | Choose an alignment-themed affinity (Good/Evil/Lawful/Chaotic/Neutral). Learn a bonus spell at sorcerer level 1 (e.g., C |
| Favored by the Gods | DivineSoul | Sorcerer | FLAG | forces enemy save / imposes condition on others — event not simulated | When you fail a save or miss with an attack, roll 2d4 and add to the roll. Must use before knowing if you succeed. 1/sho |
| Empowered Healing | DivineSoul | Sorcerer | FLAG | healing / temp-HP / party buff — not an owned surface | When you or an ally within 5 ft rolls dice to determine HP restored by a spell, spend 1 sorcery point to reroll any numb |
| Otherworldly Wings | DivineSoul | Sorcerer | ESCALATE | no clean bucket — human triage in P1 | As a bonus action, manifest spectral wings of celestial or fiendish power. Flying speed of 30 ft, indefinitely until dis |
| Unearthly Recovery | DivineSoul | Sorcerer | FLAG | healing / temp-HP / party buff — not an owned surface | As a bonus action when you are below half HP, regain HP = half your max. 1/long rest. |
| Draconic Ancestry | DraconicBloodline | Sorcerer | ESCALATE | no clean bucket — human triage in P1 | Choose a dragon type (Black/Acid, Blue/Lightning, Brass/Fire, Bronze/Lightning, Copper/Acid, Gold/Fire, Green/Poison, Re |
| Draconic Resilience | DraconicBloodline | Sorcerer | R1 | static self AC — collect.ts fold (consumer defense.ts:74/90) | Max HP increases by 1 and increases by 1 again whenever you gain a sorcerer level. AC = 13 + DEX mod when not wearing ar |
| Elemental Affinity | DraconicBloodline | Sorcerer | FLAG | incoming/intake damage modifier — not owned | Add your CHA mod to one damage roll of a spell that matches your draconic ancestry damage type. Spend 1 sorcery point to |
| Dragon Wings | DraconicBloodline | Sorcerer | R1 | static self speed — collect.ts fold (consumer mobility.ts:36) | As a bonus action, manifest dragon wings: gain a flying speed = walking speed for 1 hour or until you dismiss. |
| Draconic Presence | DraconicBloodline | Sorcerer | FLAG | aura/area effect on others — sheet owns no surface/event | Spend 5 sorcery points to exude a 60-ft aura of awe or fear for 1 minute (concentration). Each hostile creature in the a |
| Draconic Gift | Drakewarden | Ranger | FLAG | narrative/utility — no owned number | Learn Druidcraft cantrip and Draconic language. Speak with dragons and dragon-related creatures (limited understanding). |
| Drake Companion | Drakewarden | Ranger | FLAG | companion/summon/echo stat-block — belongs to the summon system, not self-state | Summon a Tiny drake companion (chromatic-flavored, your damage type choice). It acts on your initiative, adds your PB to |
| Bond of Fang and Scale | Drakewarden | Ranger | FLAG | companion/summon/echo stat-block — belongs to the summon system, not self-state | Drake grows to Medium and gains additional features (flying speed 80 ft, +damage type matching your choice). |
| Drake's Breath | Drakewarden | Ranger | FLAG | companion/summon/echo stat-block — belongs to the summon system, not self-state | Spend a spell slot during the drake's turn to expel a 30-ft cone of breath (DEX save, damage = slot level + 2d6 of your  |
| Perfected Bond | Drakewarden | Ranger | FLAG | companion/summon/echo stat-block — belongs to the summon system, not self-state | Drake becomes Large and gains: +PB temp HP, attacks deal +1d6 of your chosen type, and you can ride it (it can carry one |
| Bonus Proficiencies | DrunkenMaster | Monk | WIRED | proficiency / spell-list / language grant (existing grant paths) | Gain proficiency in Performance and brewer's supplies. |
| Drunken Technique | DrunkenMaster | Monk | R1 | static self speed — collect.ts fold (consumer mobility.ts:36) | When you use Flurry of Blows, gain Disengage benefits and +10 ft to walking speed until end of turn. |
| Tipsy Sway | DrunkenMaster | Monk | FLAG | aura/area effect on others — sheet owns no surface/event | Leap to Your Feet (stand from prone with 5 ft of movement). Redirect Attack: when a creature misses you with a melee att |
| Drunkard's Luck | DrunkenMaster | Monk | R5b | advantage/floor on ability check — ability detail panel (BUILD consumer; ref: computeAttackAdvantage index.ts:39) | Spend 2 ki to cancel disadvantage on an ability check, attack roll, or save you're about to make. |
| Intoxicated Frenzy | DrunkenMaster | Monk | ESCALATE | no clean bucket — human triage in P1 | When you Flurry of Blows, make 3 additional attacks (5 total) if each hits a different creature. |
| Manifest Echo | EchoKnight | Fighter | FLAG | companion/summon/echo stat-block — belongs to the summon system, not self-state | As a bonus action, manifest a translucent duplicate within 15 ft (AC 14 + Prof, 1 HP). You can swap places, attack throu |
| Unleash Incarnation | EchoKnight | Fighter | ESCALATE | no clean bucket — human triage in P1 | Once per turn, when you take the Attack action, make an additional melee attack from your echo's space. Uses = CON mod p |
| Echo Avatar | EchoKnight | Fighter | ESCALATE | no clean bucket — human triage in P1 | As an action, see through your echo's senses for up to 10 minutes. The echo can travel up to 1,000 ft from you during th |
| Shadow Martyr | EchoKnight | Fighter | ESCALATE | no clean bucket — human triage in P1 | Before an attack roll is made against a target within 5 ft of your echo, use a reaction to make the echo intercept — you |
| Reclaim Potential | EchoKnight | Fighter | FLAG | healing / temp-HP / party buff — not an owned surface | When your echo is destroyed by taking damage, gain 2d6 + CON mod temp HP. PB times per long rest. |
| Legion of One | EchoKnight | Fighter | ESCALATE | no clean bucket — human triage in P1 | Manifest two echoes at a time (each as the standard echo). Also, if you start your turn with no remaining Unleash Incarn |
| Spellcasting | EldritchKnight | Fighter | ESCALATE | no clean bucket — human triage in P1 | Cast wizard spells (Abjuration and Evocation; other schools at levels 8/14/20). Use INT as your spellcasting ability. |
| Weapon Bond | EldritchKnight | Fighter | ESCALATE | no clean bucket — human triage in P1 | After a 1-hour ritual, bond up to 2 weapons. You can summon a bonded weapon as a bonus action; can't be disarmed of it u |
| War Magic | EldritchKnight | Fighter | R3 | granted action/bonus/reaction attack (template: getAvailableActions index.ts:398 + ACTIONS data) | When you take the Attack action and cast a cantrip, you can make one weapon attack as a bonus action. |
| Eldritch Strike | EldritchKnight | Fighter | ESCALATE | no clean bucket — human triage in P1 | When you hit a creature with a weapon attack, it has disadvantage on the next saving throw it makes against a spell you  |
| Arcane Charge | EldritchKnight | Fighter | ESCALATE | no clean bucket — human triage in P1 | When you use Action Surge, you can also teleport up to 30 ft to an unoccupied space you can see. |
| Improved War Magic | EldritchKnight | Fighter | R3 | granted action/bonus/reaction attack (template: getAvailableActions index.ts:398 + ACTIONS data) | When you take the Attack action and cast a 1st-level+ spell, you can make one weapon attack as a bonus action. |
| Enchantment Savant | Enchantment | Wizard | ESCALATE | no clean bucket — human triage in P1 | Halve the gold and time cost to copy enchantment spells. |
| Hypnotic Gaze | Enchantment | Wizard | FLAG | aura/area effect on others — sheet owns no surface/event | As an action, target one creature within 5 ft. WIS save or charmed + incapacitated + speed 0 until end of next turn. Use |
| Instinctive Charm | Enchantment | Wizard | FLAG | aura/area effect on others — sheet owns no surface/event | When a creature within 30 ft makes an attack roll against you, use your reaction to force a WIS save or it must instead  |
| Split Enchantment | Enchantment | Wizard | ESCALATE | no clean bucket — human triage in P1 | When you cast an enchantment spell of 1st+ that targets only one creature, you can target a second creature. |
| Alter Memories | Enchantment | Wizard | ESCALATE | no clean bucket — human triage in P1 | When you cast an enchantment spell that charms one or more creatures, you can make the target unaware of being charmed.  |
| Evocation Savant | Evocation | Wizard | ESCALATE | no clean bucket — human triage in P1 | Halve the gold and time cost to copy evocation spells. |
| Sculpt Spells | Evocation | Wizard | FLAG | incoming/intake damage modifier — not owned | When you cast an evocation spell affecting other creatures, choose up to 1 + spell level creatures. The chosen creatures |
| Potent Cantrip | Evocation | Wizard | FLAG | incoming/intake damage modifier — not owned | When a creature succeeds on a save against your cantrip, it takes half damage (where it would normally take none). |
| Empowered Evocation | Evocation | Wizard | ESCALATE | no clean bucket — human triage in P1 | Add your INT mod to one damage roll of any wizard evocation spell. |
| Overchannel | Evocation | Wizard | ESCALATE | no clean bucket — human triage in P1 | When you cast a wizard spell of 1st-5th level that deals damage, you can deal max damage instead of rolling. First use a |
| Tentacle of the Deeps | Fathomless | Warlock | FLAG | aura/area effect on others — sheet owns no surface/event | As a bonus action, create a 10-ft spectral tentacle at a point within 60 ft. It deals 1d8 cold damage (CON save halves)  |
| Gift of the Sea | Fathomless | Warlock | ESCALATE | no clean bucket — human triage in P1 | Swim speed = walking speed. Breathe underwater. |
| Oceanic Soul | Fathomless | Warlock | FLAG | incoming/intake damage modifier — not owned | Resistance to cold damage. While underwater, you can communicate telepathically with any creature. |
| Guardian Coil | Fathomless | Warlock | FLAG | aura/area effect on others — sheet owns no surface/event | Tentacle of the Deeps' damage becomes 2d8. When you or an ally within 10 ft of the tentacle takes damage, use your react |
| Grasping Tentacles | Fathomless | Warlock | FLAG | healing / temp-HP / party buff — not an owned surface | Learn Evard's Black Tentacles spell (counts as warlock spell). Cast it once per long rest without a slot, or expend a sl |
| Fathomless Plunge | Fathomless | Warlock | FLAG | narrative/utility — no owned number | As an action, summon a wave and teleport you + up to 5 willing creatures within 30 ft up to 1 mile to a body of water yo |
| Dreadful Strikes | FeyWanderer | Ranger | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | Once per turn when you hit a creature with a weapon attack, deal extra 1d4 psychic damage (1d6 at lv 11). |
| Otherworldly Glamour | FeyWanderer | Ranger | WIRED | proficiency / spell-list / language grant (existing grant paths) | Add your WIS mod (min +1) to any CHA check you make. Gain proficiency in one of: Deception, Performance, or Persuasion. |
| Beguiling Twist | FeyWanderer | Ranger | FLAG | aura/area effect on others — sheet owns no surface/event | Advantage on saves vs being charmed/frightened. When a creature within 120 ft fails such a save, use reaction to redirec |
| Fey Reinforcements | FeyWanderer | Ranger | FLAG | narrative/utility — no owned number | Always have Summon Fey prepared (it doesn't count against your prepared spells). Cast it once per long rest without a sl |
| Misty Wanderer | FeyWanderer | Ranger | FLAG | narrative/utility — no owned number | Cast Misty Step without a slot WIS mod times per long rest. Bring an additional willing creature within 5 ft along. |
| Dark One's Blessing | Fiend | Warlock | FLAG | healing / temp-HP / party buff — not an owned surface | When you reduce a hostile creature to 0 HP, gain temp HP = CHA mod + warlock level (min 1). |
| Dark One's Own Luck | Fiend | Warlock | ESCALATE | no clean bucket — human triage in P1 | When you make an ability check or save, add 1d10 to the roll. Use after seeing the roll but before knowing the outcome.  |
| Fiendish Resilience | Fiend | Warlock | FLAG | incoming/intake damage modifier — not owned | After a short or long rest, choose one damage type (B/P/S, fire, cold, etc.). Resistance to that damage type until you c |
| Hurl Through Hell | Fiend | Warlock | ESCALATE | no clean bucket — human triage in P1 | When you hit a creature with an attack, instantly send it on a hellish journey. The creature disappears, returns at end  |
| Blessing of the Forge | ForgeDomain | Cleric | ESCALATE | no clean bucket — human triage in P1 | After a long rest, touch one nonmagical weapon or suit of armor; it becomes a magic item (+1) until you use this feature |
| Soul of the Forge | ForgeDomain | Cleric | FLAG | incoming/intake damage modifier — not owned | Resistance to fire damage. While wearing heavy armor, +1 AC. |
| Divine Strike | ForgeDomain | Cleric | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | Once per turn, when you hit with a weapon, add 1d8 (2d8 at lv 14) fire damage. |
| Saint of Forge and Fire | ForgeDomain | Cleric | FLAG | incoming/intake damage modifier — not owned | Immunity to fire damage. While wearing heavy armor, resistance to bludgeoning, piercing, and slashing from nonmagical at |
| Disciple of the Elements | FourElements | Monk | ESCALATE | no clean bucket — human triage in P1 | Learn Elemental Attunement cantrip-equivalent and one elemental discipline. Spend ki to cast elemental spells. Learn add |
| Additional Discipline | FourElements | Monk | ESCALATE | no clean bucket — human triage in P1 | Learn one more elemental discipline. |
| Additional Discipline | FourElements | Monk | ESCALATE | no clean bucket — human triage in P1 | Learn one more elemental discipline. |
| Additional Discipline | FourElements | Monk | ESCALATE | no clean bucket — human triage in P1 | Learn one more elemental discipline. Ki cost cap reaches the slot level of an effective 5th-level spell. |
| Genie's Vessel | Genie | Warlock | ESCALATE | no clean bucket — human triage in P1 | You possess a magical vessel (tiny). Bonus action to channel: deal +PB damage of your genie type (dao=bludgeoning, djinn |
| Genie's Wrath | Genie | Warlock | ESCALATE | no clean bucket — human triage in P1 | Once per turn when you hit with an attack, deal additional damage of your genie type equal to your PB. |
| Elemental Gift | Genie | Warlock | FLAG | incoming/intake damage modifier — not owned | Resistance to your genie's damage type. As a bonus action, gain flying speed of 30 ft for 10 min. Uses = PB per long res |
| Sanctuary Vessel | Genie | Warlock | FLAG | healing / temp-HP / party buff — not an owned surface | When you take a short rest inside your Genie's Vessel, you can take it as a long rest instead (1/long rest). Allies with |
| Limited Wish | Genie | Warlock | ESCALATE | no clean bucket — human triage in P1 | Cast any 6th-level or lower spell as an action — once. 1d4 + 1 long rests must pass before you can use this again. 1/lon |
| Dread Ambusher | GloomStalker | Ranger | ESCALATE | no clean bucket — human triage in P1 | +10 ft speed on first turn of combat, and an additional attack on the first round dealing +1d8 weapon damage. +WIS mod t |
| Umbral Sight | GloomStalker | Ranger | FLAG | narrative/utility — no owned number | Darkvision 60 ft (or +30 ft if you already have it). While in darkness, invisible to creatures relying on darkvision to  |
| Iron Mind | GloomStalker | Ranger | WIRED | proficiency / spell-list / language grant (existing grant paths) | Gain proficiency in WIS saves (or INT/CHA if you already have it). |
| Stalker's Flurry | GloomStalker | Ranger | ESCALATE | no clean bucket — human triage in P1 | Once per turn when you miss with a weapon attack, you can make another weapon attack as part of the same action. |
| Shadowy Dodge | GloomStalker | Ranger | ESCALATE | no clean bucket — human triage in P1 | When a creature you can see attacks you, use your reaction to impose disadvantage on the attack. |
| Circle of Mortality | GraveDomain | Cleric | WIRED | proficiency / spell-list / language grant (existing grant paths) | Healing spells you cast on a creature at 0 HP use the maximum dice roll. Also learn the Spare the Dying cantrip and cast |
| Eyes of the Grave | GraveDomain | Cleric | FLAG | narrative/utility — no owned number | As an action, detect undead within 60 ft (knows the location and type but not exact identity). Uses = PB per long rest. |
| Sentinel at Death's Door | GraveDomain | Cleric | ESCALATE | no clean bucket — human triage in P1 | When a creature within 30 ft would suffer a critical hit, use your reaction to make it a normal hit instead. Uses = WIS  |
| Potent Spellcasting | GraveDomain | Cleric | ESCALATE | no clean bucket — human triage in P1 | Add your WIS mod to cleric cantrip damage. |
| Keeper of Souls | GraveDomain | Cleric | FLAG | healing / temp-HP / party buff — not an owned surface | When a hostile creature dies within 60 ft, one creature you can see (not a construct or undead) regains HP = the dead cr |
| Adjust Density | Graviturgy | Wizard | FLAG | aura/area effect on others — sheet owns no surface/event | As an action, choose one Large or smaller creature within 30 ft. For 1 minute (concentration), it has its weight doubled |
| Gravity Well | Graviturgy | Wizard | ESCALATE | no clean bucket — human triage in P1 | When you hit a creature with a spell, you can move it 5 ft to an unoccupied space. |
| Violent Attraction | Graviturgy | Wizard | FLAG | aura/area effect on others — sheet owns no surface/event | When a creature you can see within 60 ft hits with a weapon attack, use your reaction to add 1d10 to the damage. When su |
| Event Horizon | Graviturgy | Wizard | FLAG | aura/area effect on others — sheet owns no surface/event | As an action, become the center of a 30-ft pull. Creatures of your choice in range make STR saves: failure = 2d10 force  |
| Awakened Mind | GreatOldOne | Warlock | FLAG | narrative/utility — no owned number | Speak telepathically to any creature within 30 ft (you share a language). |
| Entropic Ward | GreatOldOne | Warlock | ESCALATE | no clean bucket — human triage in P1 | When a creature makes an attack roll against you, use your reaction to impose disadvantage. If miss, your next attack ag |
| Thought Shield | GreatOldOne | Warlock | FLAG | incoming/intake damage modifier — not owned | Thoughts can't be read by telepathy or other magic unless you allow. Resistance to psychic damage. When a creature deals |
| Create Thrall | GreatOldOne | Warlock | ESCALATE | no clean bucket — human triage in P1 | After 1 minute touching an incapacitated humanoid, charm it indefinitely (no save). Telepathy 30 ft works on it. Ends if |
| Hex Warrior | Hexblade | Warlock | WIRED | proficiency / spell-list / language grant (existing grant paths) | After a long rest, touch one weapon you're proficient with (no two-handed). You can use CHA instead of STR/DEX for attac |
| Hexblade's Curse | Hexblade | Warlock | FLAG | aura/area effect on others — sheet owns no surface/event | As a bonus action, curse one creature within 30 ft for 1 minute. Bonus to damage rolls vs the target = your PB; crit on  |
| Accursed Specter | Hexblade | Warlock | ESCALATE | no clean bucket — human triage in P1 | When you kill a humanoid, raise its spirit as a specter under your control for 1 hour (or short rest). 1/long rest. |
| Armor of Hexes | Hexblade | Warlock | ESCALATE | no clean bucket — human triage in P1 | When a creature affected by your Hexblade's Curse hits you, roll a d6: on 4+, the hit misses you instead. |
| Master of Hexes | Hexblade | Warlock | ESCALATE | no clean bucket — human triage in P1 | When the target of your Hexblade's Curse dies, transfer the curse to a different creature within 30 ft (no action needed |
| Detect Portal | HorizonWalker | Ranger | FLAG | narrative/utility — no owned number | As an action, detect the location and direction of the nearest planar portal within 1 mile. 1/short rest. |
| Planar Warrior | HorizonWalker | Ranger | FLAG | aura/area effect on others — sheet owns no surface/event | As a bonus action, mark one creature within 30 ft. Until end of turn, next weapon hit against it deals +1d8 force damage |
| Ethereal Step | HorizonWalker | Ranger | ESCALATE | no clean bucket — human triage in P1 | Cast Etherealness as a bonus action, but only for the end of your current turn. 1/short rest. |
| Distant Strike | HorizonWalker | Ranger | ESCALATE | no clean bucket — human triage in P1 | When you take the Attack action, teleport up to 10 ft before each attack to an unoccupied space you can see. If you atta |
| Spectral Defense | HorizonWalker | Ranger | FLAG | incoming/intake damage modifier — not owned | When you take damage from an attack, use your reaction to gain resistance to that attack's damage. |
| Hunter's Prey | Hunter | Ranger | FLAG | aura/area effect on others — sheet owns no surface/event | Choose: Colossus Slayer (1/turn +1d8 to damage on a creature below max HP), Giant Killer (reaction attack on Large+ crea |
| Defensive Tactics | Hunter | Ranger | R1 | static self AC — collect.ts fold (consumer defense.ts:74/90) | Choose: Escape the Horde (OAs against you have disadvantage), Multiattack Defense (when a creature hits you, +4 AC vs it |
| Multiattack | Hunter | Ranger | ESCALATE | no clean bucket — human triage in P1 | Choose: Volley (ranged attack against any number of creatures in a 10-ft cube within range) or Whirlwind Attack (melee a |
| Superior Hunter's Defense | Hunter | Ranger | FLAG | incoming/intake damage modifier — not owned | Choose: Evasion (DEX save for half damage becomes no damage on success), Stand Against the Tide (when a creature within  |
| Illusion Savant | Illusion | Wizard | ESCALATE | no clean bucket — human triage in P1 | Halve the gold and time cost to copy illusion spells. |
| Improved Minor Illusion | Illusion | Wizard | ESCALATE | no clean bucket — human triage in P1 | Learn Minor Illusion (if you don't already) and can create both sound and image with a single casting. |
| Malleable Illusions | Illusion | Wizard | ESCALATE | no clean bucket — human triage in P1 | When you cast an illusion spell with a duration of 1 minute+, use an action to change the nature of that illusion (withi |
| Illusory Self | Illusion | Wizard | FLAG | narrative/utility — no owned number | When a creature makes an attack roll against you, use your reaction to interpose an illusory duplicate — the attack miss |
| Illusory Reality | Illusion | Wizard | FLAG | narrative/utility — no owned number | When you cast a 1st-level+ illusion spell, choose one inanimate, non-magical object that is part of the illusion. Make i |
| Ear for Deceit | Inquisitive | Rogue | R5b | advantage/floor on ability check — ability detail panel (BUILD consumer; ref: computeAttackAdvantage index.ts:39) | When you make a WIS (Insight) check to determine if a creature is lying, treat any d20 roll of 7 or lower as an 8. |
| Eye for Detail | Inquisitive | Rogue | ESCALATE | no clean bucket — human triage in P1 | Use a bonus action to make a WIS (Perception) check to spot a hidden creature or object, or an INT (Investigation) check |
| Insightful Fighting | Inquisitive | Rogue | ESCALATE | no clean bucket — human triage in P1 | As a bonus action, make a WIS (Insight) check vs target's CHA (Deception) — if you win, you can deal Sneak Attack damage |
| Steady Eye | Inquisitive | Rogue | R5b | advantage/floor on ability check — ability detail panel (BUILD consumer; ref: computeAttackAdvantage index.ts:39) | Advantage on Perception and Investigation checks if you move no more than half your speed on the same turn. |
| Unerring Eye | Inquisitive | Rogue | FLAG | narrative/utility — no owned number | As an action, sense magical and supernatural deception within 30 ft (illusions, transmutations, disguises). Uses = WIS m |
| Eye for Weakness | Inquisitive | Rogue | ESCALATE | no clean bucket — human triage in P1 | While Insightful Fighting is active against a target, your Sneak Attack against it deals +3d6 damage. |
| Path of the Kensei | Kensei | Monk | ESCALATE | no clean bucket — human triage in P1 | Choose 2 weapons (martial melee or ranged) as kensei weapons. They count as monk weapons. Gain Agile Parry (+2 AC vs mel |
| One with the Blade | Kensei | Monk | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | Kensei weapons count as magical. Spend 1 ki when you hit with a melee kensei weapon to deal extra damage = your martial  |
| Sharpen the Blade | Kensei | Monk | ESCALATE | no clean bucket — human triage in P1 | As a bonus action, spend up to 3 ki to grant a kensei weapon a magical bonus to attack and damage rolls = ki spent. Last |
| Unerring Accuracy | Kensei | Monk | ESCALATE | no clean bucket — human triage in P1 | If you miss with a monk weapon attack on your turn, reroll the attack once. 1/turn. |
| Blessings of Knowledge | KnowledgeDomain | Cleric | WIRED | proficiency / spell-list / language grant (existing grant paths) | Learn two languages and gain proficiency in two skills from Arcana/History/Nature/Religion. Your proficiency bonus is do |
| Read Thoughts | KnowledgeDomain | Cleric | FLAG | narrative/utility — no owned number | Use Channel Divinity to read a creature's thoughts (WIS save negates) and cast Suggestion against the target without exp |
| Potent Spellcasting | KnowledgeDomain | Cleric | ESCALATE | no clean bucket — human triage in P1 | Add your WIS mod to cleric cantrip damage. |
| Visions of the Past | KnowledgeDomain | Cleric | FLAG | narrative/utility — no owned number | After 1 minute of meditation, learn the recent history of an object or location. |
| Disciple of Life | LifeDomain | Cleric | FLAG | healing / temp-HP / party buff — not an owned surface | Whenever you use a 1st-level+ spell to restore HP, the creature regains additional HP = 2 + the spell's level. |
| Blessed Healer | LifeDomain | Cleric | FLAG | healing / temp-HP / party buff — not an owned surface | When you cast a 1st-level+ spell that restores HP to a creature other than you, you regain HP = 2 + the spell's level. |
| Divine Strike | LifeDomain | Cleric | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | Once on each of your turns, when you hit a creature with a weapon attack, deal extra 1d8 radiant damage (2d8 at lv 14). |
| Supreme Healing | LifeDomain | Cleric | FLAG | healing / temp-HP / party buff — not an owned surface | Whenever you would roll dice to restore HP with a spell, treat each die as if it rolled its maximum value. |
| Bonus Cantrip + Warding Flare | LightDomain | Cleric | WIRED | proficiency / spell-list / language grant (existing grant paths) | Learn the Light cantrip. Warding Flare: as a reaction when a creature within 30 ft attacks you, impose disadvantage on t |
| Improved Flare | LightDomain | Cleric | FLAG | healing / temp-HP / party buff — not an owned surface | Use Warding Flare when a creature you can see within 30 ft attacks an ally. |
| Potent Spellcasting | LightDomain | Cleric | ESCALATE | no clean bucket — human triage in P1 | Add your WIS mod to the damage of cleric cantrips you cast. |
| Corona of Light | LightDomain | Cleric | FLAG | aura/area effect on others — sheet owns no surface/event | As an action, emanate a 60-ft sun-aura for 1 minute. Each enemy in the aura has disadvantage on saves vs fire/radiant sp |
| Master of Intrigue | Mastermind | Rogue | WIRED | proficiency / spell-list / language grant (existing grant paths) | Gain proficiency with disguise kit, forgery kit, and one gaming set. Learn two languages. Can mimic speech of others. |
| Master of Tactics | Mastermind | Rogue | ESCALATE | no clean bucket — human triage in P1 | Use Help action as a bonus action; can target a creature up to 30 ft away. |
| Insightful Manipulator | Mastermind | Rogue | FLAG | narrative/utility — no owned number | After 1 minute of observing or interacting with a humanoid, learn 2 of the following about it: INT, WIS, CHA, class leve |
| Misdirection | Mastermind | Rogue | ESCALATE | no clean bucket — human triage in P1 | When you are targeted by an attack while a creature within 5 ft is providing you cover, use a reaction to have the attac |
| Soul of Deceit | Mastermind | Rogue | FLAG | narrative/utility — no owned number | Thoughts can't be read by telepathy or magical means without your consent. Magical truth-detection treats your lies as t |
| Implements of Mercy | Mercy | Monk | WIRED | proficiency / spell-list / language grant (existing grant paths) | Gain proficiency in Insight, Medicine, and the herbalism kit. |
| Hand of Healing | Mercy | Monk | FLAG | healing / temp-HP / party buff — not an owned surface | As an action, spend 1 ki to restore HP = your martial arts die + WIS mod. As part of Flurry of Blows, replace one attack |
| Hand of Harm | Mercy | Monk | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | When you hit with an unarmed strike, spend 1 ki to deal extra necrotic damage = your martial arts die + WIS mod. 1/turn. |
| Physician's Touch | Mercy | Monk | FLAG | forces enemy save / imposes condition on others — event not simulated | When using Hand of Healing, also end one disease or condition (blinded, deafened, paralyzed, poisoned, stunned). When us |
| Flurry of Healing and Harm | Mercy | Monk | FLAG | healing / temp-HP / party buff — not an owned surface | During Flurry of Blows, replace each attack with Hand of Healing without spending ki for the Healing component. |
| Hand of Mercy | Mercy | Monk | ESCALATE | no clean bucket — human triage in P1 | As an action, spend 5 ki to touch a creature (CON save) and reduce it to 0 HP (or 1 HP on success). Doesn't work on cons |
| Hunter's Sense | MonsterSlayer | Ranger | FLAG | aura/area effect on others — sheet owns no surface/event | As an action, choose a creature within 60 ft and learn its damage immunities, resistances, and vulnerabilities. Uses = W |
| Slayer's Prey | MonsterSlayer | Ranger | FLAG | aura/area effect on others — sheet owns no surface/event | As a bonus action, designate a creature within 60 ft. First weapon hit per turn against it deals +1d6 damage until you u |
| Supernatural Defense | MonsterSlayer | Ranger | FLAG | forces enemy save / imposes condition on others — event not simulated | When the target of your Slayer's Prey forces you to make a save or you make a check to escape from it, add 1d6 to your r |
| Magic-User's Nemesis | MonsterSlayer | Ranger | FLAG | aura/area effect on others — sheet owns no surface/event | When a creature within 60 ft casts a spell or teleports, use your reaction to force a WIS save or the casting/teleport f |
| Slayer's Counter | MonsterSlayer | Ranger | ESCALATE | no clean bucket — human triage in P1 | When the target of your Slayer's Prey forces you to make a save, use your reaction to attack it (before the save). If yo |
| Acolyte of Nature | NatureDomain | Cleric | WIRED | proficiency / spell-list / language grant (existing grant paths) | Learn one druid cantrip and gain proficiency in one skill of your choice from Animal Handling, Nature, or Survival. |
| Dampen Elements | NatureDomain | Cleric | FLAG | aura/area effect on others — sheet owns no surface/event | When you or a creature within 30 ft takes acid, cold, fire, lightning, or thunder damage, use your reaction to grant res |
| Divine Strike | NatureDomain | Cleric | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | Once per turn, when you hit with a weapon, add 1d8 (2d8 at lv 14) damage of your choice: cold, fire, or lightning. |
| Master of Nature | NatureDomain | Cleric | ESCALATE | no clean bucket — human triage in P1 | You can use your action to verbally command any creature you charmed with Charm Animals and Plants (Channel Divinity). |
| Necromancy Savant | Necromancy | Wizard | ESCALATE | no clean bucket — human triage in P1 | Halve the gold and time cost to copy necromancy spells. |
| Grim Harvest | Necromancy | Wizard | FLAG | healing / temp-HP / party buff — not an owned surface | When you kill a creature (not construct/undead) with a 1st-level+ spell, regain HP = 2× the spell's level (3× for necrom |
| Undead Thralls | Necromancy | Wizard | FLAG | narrative/utility — no owned number | Add Animate Dead to your spellbook for free. Animate Dead creates an additional zombie/skeleton, and they have extra HP  |
| Inured to Undeath | Necromancy | Wizard | FLAG | incoming/intake damage modifier — not owned | Resistance to necrotic damage; your HP max can't be reduced. |
| Command Undead | Necromancy | Wizard | FLAG | aura/area effect on others — sheet owns no surface/event | As an action, control any undead within 60 ft (CHA save — disadvantage for intelligent undead; auto-fail for mindless un |
| Channel Divinity: Control Undead | Oathbreaker | Paladin | FLAG | aura/area effect on others — sheet owns no surface/event | As an action, target an undead creature within 30 ft (CHA or CR ≤ your paladin level / 3, rounds down). WIS save or char |
| Channel Divinity: Dreadful Aspect | Oathbreaker | Paladin | FLAG | aura/area effect on others — sheet owns no surface/event | As an action, each creature of your choice within 30 ft makes a WIS save or is frightened for 1 minute. |
| Aura of Hate | Oathbreaker | Paladin | FLAG | aura/area effect on others — sheet owns no surface/event | You, fiends, and undead within 10 ft (30 ft at level 18) add your CHA mod to the damage of melee weapon attacks. |
| Supernatural Resistance | Oathbreaker | Paladin | FLAG | incoming/intake damage modifier — not owned | Resistance to bludgeoning, piercing, and slashing damage from non-magical attacks. |
| Dread Lord | Oathbreaker | Paladin | FLAG | aura/area effect on others — sheet owns no surface/event | As an action, become a beacon of hatred for 1 minute. 30-ft shadow aura: enemies in dim light, take 4d10 psychic on hit, |
| Channel Divinity: Conquering Presence | OathOfConquest | Paladin | FLAG | aura/area effect on others — sheet owns no surface/event | As an action, each creature of your choice within 30 ft makes a WIS save or is frightened for 1 minute. |
| Channel Divinity: Guided Strike | OathOfConquest | Paladin | ESCALATE | no clean bucket — human triage in P1 | When you make an attack roll, use Channel Divinity to gain +10 to the roll (before or after roll, but before outcome). |
| Aura of Conquest | OathOfConquest | Paladin | FLAG | aura/area effect on others — sheet owns no surface/event | Frightened creatures within 10 ft (30 ft at level 18) have speed 0 and take psychic damage = half paladin level when the |
| Scornful Rebuke | OathOfConquest | Paladin | ESCALATE | no clean bucket — human triage in P1 | Creatures take psychic damage = your CHA mod (min 1) whenever they hit you with an attack. |
| Invincible Conqueror | OathOfConquest | Paladin | FLAG | incoming/intake damage modifier — not owned | As an action for 1 minute: resistance to all damage, one additional attack on Attack action, and crits on 19-20. 1/long  |
| Channel Divinity: Sacred Weapon | OathOfDevotion | Paladin | ESCALATE | no clean bucket — human triage in P1 | As an action, imbue one weapon you hold with positive energy for 1 minute: add CHA mod (min +1) to attack rolls, weapon  |
| Channel Divinity: Turn the Unholy | OathOfDevotion | Paladin | FLAG | aura/area effect on others — sheet owns no surface/event | As an action, force each fiend or undead within 30 ft to make a WIS save (DC = your spell save) or be turned for 1 minut |
| Aura of Devotion | OathOfDevotion | Paladin | FLAG | aura/area effect on others — sheet owns no surface/event | You and friendly creatures within 10 ft can't be charmed while you're conscious (30 ft at level 18). |
| Purity of Spirit | OathOfDevotion | Paladin | ESCALATE | no clean bucket — human triage in P1 | Always under the effects of a Protection from Evil and Good spell. |
| Holy Nimbus | OathOfDevotion | Paladin | FLAG | aura/area effect on others — sheet owns no surface/event | As an action, emanate aura of sunlight (30 ft, bright) for 1 minute. Enemies in the aura take 10 radiant damage at the e |
| Channel Divinity: Peerless Athlete | OathOfGlory | Paladin | R5b | advantage/floor on ability check — ability detail panel (BUILD consumer; ref: computeAttackAdvantage index.ts:39) | As a bonus action, advantage on STR (Athletics) and DEX (Acrobatics) checks for 10 minutes. Carry/push/drag double weigh |
| Channel Divinity: Inspiring Smite | OathOfGlory | Paladin | FLAG | aura/area effect on others — sheet owns no surface/event | After you deal damage with Divine Smite, distribute 2d8 + half paladin level temp HP among creatures of your choice with |
| Aura of Alacrity | OathOfGlory | Paladin | FLAG | healing / temp-HP / party buff — not an owned surface | Your speed +10 ft. When an ally enters your 5-ft aura (10-ft at level 18), their speed +10 ft until end of their next tu |
| Glorious Defense | OathOfGlory | Paladin | FLAG | aura/area effect on others — sheet owns no surface/event | When you or an ally within 10 ft is hit by an attack, use your reaction to add CHA mod (min +1) to AC vs that attack; if |
| Living Legend | OathOfGlory | Paladin | ESCALATE | no clean bucket — human triage in P1 | For 1 minute: charisma (Persuasion/Deception/etc.) become your strongest features (advantage). Smite as automatic (rerol |
| Channel Divinity: Emissary of Peace | OathOfRedemption | Paladin | ESCALATE | no clean bucket — human triage in P1 | As a bonus action, grant yourself +5 to CHA (Persuasion) checks for 10 minutes. |
| Channel Divinity: Rebuke the Violent | OathOfRedemption | Paladin | FLAG | aura/area effect on others — sheet owns no surface/event | When an attacker within 30 ft deals damage to a creature other than you, use your reaction to force CON save: damage reb |
| Aura of the Guardian | OathOfRedemption | Paladin | FLAG | aura/area effect on others — sheet owns no surface/event | When a creature within 10 ft (30 ft at level 18) takes damage, use your reaction to take the damage instead. |
| Protective Spirit | OathOfRedemption | Paladin | FLAG | healing / temp-HP / party buff — not an owned surface | Regain HP = 1d6 + half paladin level at the start of your turn if below half HP and not incapacitated. |
| Emissary of Redemption | OathOfRedemption | Paladin | FLAG | incoming/intake damage modifier — not owned | Permanent resistance to damage from creatures and immunity to charm. When a creature damages you, it takes equal radiant |
| Channel Divinity: Nature's Wrath | OathOfTheAncients | Paladin | FLAG | aura/area effect on others — sheet owns no surface/event | As an action, spectral vines erupt around one creature within 10 ft (STR or DEX save) — the target is restrained until i |
| Channel Divinity: Turn the Faithless | OathOfTheAncients | Paladin | FLAG | aura/area effect on others — sheet owns no surface/event | As an action, force each fey and fiend within 30 ft to make a WIS save or be turned for 1 minute. |
| Aura of Warding | OathOfTheAncients | Paladin | FLAG | aura/area effect on others — sheet owns no surface/event | You and friendly creatures within 10 ft have resistance to spell damage (30 ft at level 18). |
| Undying Sentinel | OathOfTheAncients | Paladin | ESCALATE | no clean bucket — human triage in P1 | When reduced to 0 HP (and not killed outright), drop to 1 HP instead. 1/long rest. Also: you no longer age. |
| Elder Champion | OathOfTheAncients | Paladin | FLAG | aura/area effect on others — sheet owns no surface/event | As an action, assume a primal form for 1 minute: regenerate 10 HP/turn, cast paladin spells as bonus actions, and enemie |
| Channel Divinity: Watcher's Will | OathOfTheWatchers | Paladin | FLAG | aura/area effect on others — sheet owns no surface/event | As an action, choose up to CHA mod (min 1) creatures within 30 ft. Each has advantage on INT/WIS/CHA saves for 1 minute. |
| Channel Divinity: Abjure the Extraplanar | OathOfTheWatchers | Paladin | FLAG | aura/area effect on others — sheet owns no surface/event | As an action, force each aberration, celestial, elemental, fey, or fiend within 30 ft to make a WIS save or be turned fo |
| Aura of the Sentinel | OathOfTheWatchers | Paladin | FLAG | healing / temp-HP / party buff — not an owned surface | You and allies within 10 ft (30 ft at level 18) gain a bonus to initiative equal to your PB. |
| Vigilant Rebuke | OathOfTheWatchers | Paladin | FLAG | aura/area effect on others — sheet owns no surface/event | When you or a creature within 30 ft succeeds on an INT/WIS/CHA save, use your reaction to deal 2d8 + CHA force damage to |
| Mortal Bulwark | OathOfTheWatchers | Paladin | FLAG | forces enemy save / imposes condition on others — event not simulated | As a bonus action for 1 minute: truesight 120 ft, advantage on attack vs aberrations/celestials/elementals/fey/fiends, a |
| Channel Divinity: Abjure Enemy | OathOfVengeance | Paladin | FLAG | aura/area effect on others — sheet owns no surface/event | As an action, choose a creature within 60 ft. WIS save or frightened for 1 minute, speed 0. On success: speed halved (no |
| Channel Divinity: Vow of Enmity | OathOfVengeance | Paladin | FLAG | aura/area effect on others — sheet owns no surface/event | As a bonus action, target a creature within 10 ft. You have advantage on attack rolls against it for 1 minute (or until  |
| Relentless Avenger | OathOfVengeance | Paladin | ESCALATE | no clean bucket — human triage in P1 | When you hit with an opportunity attack, move up to half your speed (doesn't provoke OAs) as part of the same reaction. |
| Soul of Vengeance | OathOfVengeance | Paladin | R3 | granted action/bonus/reaction attack (template: getAvailableActions index.ts:398 + ACTIONS data) | When a creature affected by your Vow of Enmity makes an attack, use your reaction to make one melee attack against that  |
| Avenging Angel | OathOfVengeance | Paladin | FLAG | aura/area effect on others — sheet owns no surface/event | As an action, sprout 10-ft glowing wings; gain a flying speed of 60 ft, an aura of menace (30 ft, WIS save vs frightened |
| Open Hand Technique | OpenHand | Monk | FLAG | forces enemy save / imposes condition on others — event not simulated | When you hit with a Flurry of Blows attack, impose one effect: target makes DEX save or knocked prone; STR save or pushe |
| Wholeness of Body | OpenHand | Monk | FLAG | healing / temp-HP / party buff — not an owned surface | As an action, regain HP = 3× your monk level. 1/long rest. |
| Tranquility | OpenHand | Monk | ESCALATE | no clean bucket — human triage in P1 | At the end of a long rest, gain a Sanctuary-like effect (hostile creatures must WIS save to target you). Lasts until you |
| Quivering Palm | OpenHand | Monk | FLAG | forces enemy save / imposes condition on others — event not simulated | When you hit with an unarmed strike, spend 3 ki to start vibrations. Use an action later to end them: target makes CON s |
| Voice of Authority | OrderDomain | Cleric | R3 | granted action/bonus/reaction attack (template: getAvailableActions index.ts:398 + ACTIONS data) | When you cast a 1st-level+ spell targeting an ally, that ally can use their reaction to make one weapon attack against a |
| Embodiment of the Law | OrderDomain | Cleric | ESCALATE | no clean bucket — human triage in P1 | If you cast an Enchantment spell of 1st level+, you can use a bonus action (instead of the spell's normal casting time)  |
| Divine Strike | OrderDomain | Cleric | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | Once per turn, when you hit with a weapon, add 1d8 (2d8 at lv 14) psychic damage. |
| Order's Wrath | OrderDomain | Cleric | FLAG | healing / temp-HP / party buff — not an owned surface | When you use Divine Strike, mark the target. Until the start of your next turn, the next ally who hits it adds 2d8 psych |
| Wizardly Quill | OrderOfScribes | Wizard | ESCALATE | no clean bucket — human triage in P1 | Conjure a magical quill in your hand as a bonus action. Uses no ink; doubles your writing speed; can erase text with a s |
| Awakened Spellbook | OrderOfScribes | Wizard | ESCALATE | no clean bucket — human triage in P1 | Your spellbook is sentient. When you cast a wizard spell with a slot, you can change the spell's damage type to match an |
| Manifest Mind | OrderOfScribes | Wizard | FLAG | companion/summon/echo stat-block — belongs to the summon system, not self-state | As a bonus action, the spirit of your spellbook flies out (Tiny, fly 30 ft, AC 11, immune to most damage). Cast spells t |
| Master Scrivener | OrderOfScribes | Wizard | ESCALATE | no clean bucket — human triage in P1 | After a long rest, you can scribe a spell scroll of a 1st or 2nd level wizard spell from your spellbook for free. |
| One With the Word | OrderOfScribes | Wizard | ESCALATE | no clean bucket — human triage in P1 | When you fail a save vs an attack/spell that would reduce you to 0 HP, sacrifice your spellbook (or your inner self if w |
| Implement of Peace | PeaceDomain | Cleric | WIRED | proficiency / spell-list / language grant (existing grant paths) | Gain proficiency in the Insight, Performance, or Persuasion skill (your choice). |
| Emboldening Bond | PeaceDomain | Cleric | FLAG | aura/area effect on others — sheet owns no surface/event | After a 1-minute rite, bond up to PB willing creatures (you can be one) for 10 minutes. While bonded creatures are withi |
| Protective Bond | PeaceDomain | Cleric | FLAG | aura/area effect on others — sheet owns no surface/event | When a bonded creature is about to take damage, another bonded creature within 30 ft can use its reaction to teleport to |
| Potent Spellcasting | PeaceDomain | Cleric | ESCALATE | no clean bucket — human triage in P1 | Add your WIS mod to cleric cantrip damage. |
| Expansive Bond | PeaceDomain | Cleric | FLAG | incoming/intake damage modifier — not owned | Emboldening Bond range increases to 60 ft. Bonded creatures also have resistance to damage taken via Protective Bond. |
| Whispers of the Dead | Phantom | Rogue | WIRED | proficiency / spell-list / language grant (existing grant paths) | Each time you finish a short or long rest, gain proficiency in one skill or tool of your choice (replaces the previous o |
| Wails from the Grave | Phantom | Rogue | FLAG | aura/area effect on others — sheet owns no surface/event | Right after dealing Sneak Attack damage, deal half that damage as necrotic to a second creature within 30 ft of the firs |
| Tokens of the Departed | Phantom | Rogue | FLAG | aura/area effect on others — sheet owns no surface/event | When a creature dies within 30 ft, create a Soul Trinket (carry up to PB). Use one to roll a d6 to add to a save, or to  |
| Ghost Walk | Phantom | Rogue | R1 | static self speed — collect.ts fold (consumer mobility.ts:36) | As a bonus action, assume a spectral form for 10 min (or expend a Soul Trinket): flying speed of 10 ft, hover, attacks a |
| Death's Friend | Phantom | Rogue | ESCALATE | no clean bucket — human triage in P1 | Use Wails from the Grave both before AND after the Sneak Attack damage. At the end of a long rest, if you have fewer tha |
| Psionic Power | PsiWarrior | Fighter | ESCALATE | no clean bucket — human triage in P1 | Gain a pool of Psionic Energy Dice (PB+2 dice, starting d6). Regain all on a long rest, or one on a short rest. |
| Protective Field | PsiWarrior | Fighter | FLAG | aura/area effect on others — sheet owns no surface/event | When you or a creature you can see within 30 ft takes damage, use your reaction to spend one die to reduce the damage by |
| Psionic Strike | PsiWarrior | Fighter | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | When you hit a creature within 30 ft with a weapon attack, spend one die to deal extra force damage = 1d6 + INT mod. 1/t |
| Telekinetic Movement | PsiWarrior | Fighter | ESCALATE | no clean bucket — human triage in P1 | As an action, telekinetically move a Large or smaller object or willing creature within 30 ft up to 30 ft. Recharges aft |
| Telekinetic Adept | PsiWarrior | Fighter | ESCALATE | no clean bucket — human triage in P1 | Psionic Strike die becomes d8. Learn Psi-Powered Leap (bonus action, flying speed twice walking until end of turn) and T |
| Guarded Mind | PsiWarrior | Fighter | FLAG | incoming/intake damage modifier — not owned | Resistance to psychic damage. If you start your turn charmed or frightened, spend one die to end all such effects on you |
| Bulwark of Force | PsiWarrior | Fighter | FLAG | healing / temp-HP / party buff — not an owned surface | As a bonus action, choose up to PB creatures within 30 ft (including you). Each gains half cover for 1 minute (concentra |
| Telekinetic Master | PsiWarrior | Fighter | FLAG | narrative/utility — no owned number | Cast Telekinesis without expending a slot, concentrating on it for up to 10 minutes. Psionic Strike die becomes d12. |
| Bonus Proficiencies | RuneKnight | Fighter | WIRED | proficiency / spell-list / language grant (existing grant paths) | Gain proficiency with smith's tools and learn Giant language. |
| Rune Carver | RuneKnight | Fighter | ESCALATE | no clean bucket — human triage in P1 | Learn 2 runes (Cloud, Fire, Frost, Stone, Hill, or Storm). Inscribe runes on weapons/armor/jewelry; each grants a passiv |
| Giant's Might | RuneKnight | Fighter | R5b | advantage/floor on ability check — ability detail panel (BUILD consumer; ref: computeAttackAdvantage index.ts:39) | As a bonus action, grow Large for 1 minute: advantage on STR checks/saves, +1d6 to weapon damage, your weapons grow with |
| Runic Shield | RuneKnight | Fighter | ESCALATE | no clean bucket — human triage in P1 | When another creature you can see within 60 ft is hit by an attack, use a reaction to force the attacker to reroll the d |
| Great Stature | RuneKnight | Fighter | ESCALATE | no clean bucket — human triage in P1 | Giant's Might damage bonus increases to 1d8. Permanently grow by 3d4 inches. |
| Master of Runes | RuneKnight | Fighter | ESCALATE | no clean bucket — human triage in P1 | Invoke each rune twice between rests. |
| Runic Juggernaut | RuneKnight | Fighter | ESCALATE | no clean bucket — human triage in P1 | Giant's Might damage bonus is 1d10 and you grow to Huge size. Reach increases by 5 ft. |
| Bonus Proficiency | Samurai | Fighter | WIRED | proficiency / spell-list / language grant (existing grant paths) | Gain proficiency in one of: History, Insight, Performance, Persuasion — or one language of your choice. |
| Fighting Spirit | Samurai | Fighter | FLAG | healing / temp-HP / party buff — not an owned surface | As a bonus action, gain advantage on weapon attack rolls until the end of your current turn, plus 5 temp HP (10 at lv 10 |
| Elegant Courtier | Samurai | Fighter | WIRED | proficiency / spell-list / language grant (existing grant paths) | Add your WIS mod to CHA (Persuasion) checks. Also gain proficiency in WIS saving throws (or one of INT/CHA if you alread |
| Tireless Spirit | Samurai | Fighter | ESCALATE | no clean bucket — human triage in P1 | When you roll initiative with no Fighting Spirit uses remaining, regain 1. |
| Rapid Strike | Samurai | Fighter | ESCALATE | no clean bucket — human triage in P1 | If you have advantage on a weapon attack against a creature on your turn, forgo the advantage to make one additional wea |
| Strength Before Death | Samurai | Fighter | FLAG | incoming/intake damage modifier — not owned | When you take damage that would reduce you to 0 HP, use your reaction to delay falling unconscious and take an extra tur |
| Skirmisher | Scout | Rogue | ESCALATE | no clean bucket — human triage in P1 | When a creature ends its turn within 5 ft of you, use your reaction to move up to half your speed (no OAs). |
| Survivalist | Scout | Rogue | WIRED | proficiency / spell-list / language grant (existing grant paths) | Gain proficiency in Nature and Survival (or expertise if already proficient). |
| Superior Mobility | Scout | Rogue | R1 | static self speed — collect.ts fold (consumer mobility.ts:36) | Walking speed +10 ft. If you have a climb or swim speed, it also increases by 10 ft. |
| Ambush Master | Scout | Rogue | FLAG | healing / temp-HP / party buff — not an owned surface | Advantage on initiative. On the first turn of combat, you treat any creature you hit as if you have advantage on the att |
| Sudden Strike | Scout | Rogue | ESCALATE | no clean bucket — human triage in P1 | Once per turn, take an additional attack action as a bonus action. Can apply Sneak Attack to one of those attacks. |
| Shadow Arts | Shadow | Monk | WIRED | proficiency / spell-list / language grant (existing grant paths) | Spend 2 ki to cast: Darkness, Darkvision, Pass Without Trace, or Silence (no material components). Also learn the Minor  |
| Shadow Step | Shadow | Monk | ESCALATE | no clean bucket — human triage in P1 | When in dim light or darkness, use a bonus action to teleport up to 60 ft to another dim/dark space. Advantage on the fi |
| Cloak of Shadows | Shadow | Monk | FLAG | narrative/utility — no owned number | In dim light or darkness, use an action to become invisible until you attack, cast a spell, or are in bright light. |
| Opportunist | Shadow | Monk | R3 | granted action/bonus/reaction attack (template: getAvailableActions index.ts:398 + ACTIONS data) | When a creature within 5 ft is hit by an attack from another creature, use your reaction to make a melee attack against  |
| Eyes of the Dark | ShadowMagic | Sorcerer | FLAG | narrative/utility — no owned number | Darkvision 120 ft. Also, when you cast the Darkness spell, see through magical darkness; spend 2 sorcery points to cast  |
| Strength of the Grave | ShadowMagic | Sorcerer | ESCALATE | no clean bucket — human triage in P1 | When damage reduces you to 0 HP, make a CHA save (DC = 5 + damage). On success, drop to 1 HP instead. 1/long rest. |
| Hound of Ill Omen | ShadowMagic | Sorcerer | FLAG | aura/area effect on others — sheet owns no surface/event | Spend 3 sorcery points to summon a shadowy hound (large dire wolf stat block) targeting a creature within 120 ft. Lasts  |
| Shadow Walk | ShadowMagic | Sorcerer | ESCALATE | no clean bucket — human triage in P1 | When in dim light or darkness, use a bonus action to teleport up to 120 ft to a space you can see in dim light/darkness. |
| Umbral Form | ShadowMagic | Sorcerer | FLAG | incoming/intake damage modifier — not owned | Spend 6 sorcery points to assume a shadow form for 1 minute. Resistance to all damage except force and radiant; can move |
| Psionic Power | Soulknife | Rogue | ESCALATE | no clean bucket — human triage in P1 | Gain a pool of Psionic Energy Dice (PB+2 starting at d6). Spend dice on options below. Recover all on a long rest, or on |
| Psychic Blades | Soulknife | Rogue | ESCALATE | no clean bucket — human triage in P1 | Manifest a psychic blade in each hand (martial finesse, 1d6 psychic, thrown 60/120). Can be off-hand without consuming b |
| Soul Blades: Homing Strikes & Psychic Teleportation | Soulknife | Rogue | ESCALATE | no clean bucket — human triage in P1 | Spend one Energy Die when you miss with a Psychic Blade to add the die to the attack roll. Spend one die as a bonus acti |
| Psychic Veil | Soulknife | Rogue | FLAG | narrative/utility — no owned number | As an action, become invisible for 1 hour (ends if you deal damage or force a save). Spend 1 die to do this without usin |
| Rend Mind | Soulknife | Rogue | ESCALATE | no clean bucket — human triage in P1 | When you deal Sneak Attack with a Psychic Blade, spend 3 dice to stun the target (WIS save) until end of your next long  |
| Storm Aura | StormHerald | Barbarian | FLAG | aura/area effect on others — sheet owns no surface/event | While raging, you emit a 10-ft aura. Choose Desert (fire damage to creatures within), Sea (lightning damage to one creat |
| Storm Soul | StormHerald | Barbarian | FLAG | incoming/intake damage modifier — not owned | Gain resistance to your storm's damage type and a benefit (Desert: resist fire, walk on lava; Sea: swim speed, resist li |
| Shielding Storm | StormHerald | Barbarian | FLAG | aura/area effect on others — sheet owns no surface/event | Allies in your aura also gain the Storm Soul resistance benefit while you rage. |
| Raging Storm | StormHerald | Barbarian | FLAG | aura/area effect on others — sheet owns no surface/event | Each storm gains a powerful additional rider (Desert: enemies within aura must STR save or take 1d6 fire when hitting yo |
| Wind Speaker | StormSorcery | Sorcerer | FLAG | narrative/utility — no owned number | Speak, read, and write Primordial (and the four elemental dialects). |
| Tempestuous Magic | StormSorcery | Sorcerer | ESCALATE | no clean bucket — human triage in P1 | When you cast a 1st-level+ spell, fly up to 10 ft (no OAs) as part of the casting. |
| Heart of the Storm | StormSorcery | Sorcerer | FLAG | aura/area effect on others — sheet owns no surface/event | Resistance to lightning and thunder damage. When you cast a 1st-level+ spell that deals lightning or thunder, creatures  |
| Storm Guide | StormSorcery | Sorcerer | ESCALATE | no clean bucket — human triage in P1 | Above-ground at-will: stop rain in 20 ft around you, or direct light winds to bring something to you. |
| Storm's Fury | StormSorcery | Sorcerer | FLAG | incoming/intake damage modifier — not owned | When you take damage from a melee attack, use your reaction to deal lightning damage to the attacker = sorcerer level. T |
| Wind Soul | StormSorcery | Sorcerer | FLAG | aura/area effect on others — sheet owns no surface/event | Immune to lightning and thunder damage. Permanent flying speed of 60 ft. Reduce flying speed to 30 ft to grant 6 willing |
| Radiant Sun Bolt | SunSoul | Monk | ESCALATE | no clean bucket — human triage in P1 | Make a ranged spell attack (30 ft) as your action — deals 1d4 + DEX radiant damage (uses martial-arts die). Counts as mo |
| Searing Arc Strike | SunSoul | Monk | ESCALATE | no clean bucket — human triage in P1 | Immediately after Attack action, spend 2+ ki to cast Burning Hands as a bonus action (increases by 1 die per additional  |
| Searing Sunburst | SunSoul | Monk | FLAG | aura/area effect on others — sheet owns no surface/event | As an action, create a 20-ft radius sphere of radiant light within 150 ft. CON save or 2d6 radiant damage. Spend up to 3 |
| Sun Shield | SunSoul | Monk | FLAG | aura/area effect on others — sheet owns no surface/event | Glow with sunlight (10 ft bright, 10 ft dim). Add WIS mod (min 1) radiant damage to melee weapon attacks. When a creatur |
| Gathered Swarm | Swarmkeeper | Ranger | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | A swarm of spirits assists you. Once per turn when you hit a creature with a weapon attack, choose: +1d6 piercing damage |
| Bonus Cantrip | Swarmkeeper | Ranger | WIRED | proficiency / spell-list / language grant (existing grant paths) | Learn the Mage Hand cantrip. You can make it invisible (and an action to deal 1d6 damage at range or push prone — your c |
| Writhing Tide | Swarmkeeper | Ranger | R1 | static self speed — collect.ts fold (consumer mobility.ts:36) | As a bonus action, gain a flying speed of 10 ft and the ability to hover for 1 minute. Uses = PB per long rest. |
| Mighty Swarm | Swarmkeeper | Ranger | FLAG | forces enemy save / imposes condition on others — event not simulated | Gathered Swarm damage die becomes d8. Movement options now also knock prone or grant cover. |
| Swarming Dispersal | Swarmkeeper | Ranger | FLAG | incoming/intake damage modifier — not owned | When you take damage, use your reaction to gain resistance and teleport up to 30 ft to a space you can see. Uses = PB pe |
| Fancy Footwork | Swashbuckler | Rogue | ESCALATE | no clean bucket — human triage in P1 | When you make a melee attack against a creature, it can't make OAs against you for the rest of the turn. |
| Rakish Audacity | Swashbuckler | Rogue | FLAG | healing / temp-HP / party buff — not an owned surface | +CHA mod to initiative. You can use Sneak Attack without an ally next to the target as long as no other enemy is within  |
| Panache | Swashbuckler | Rogue | ESCALATE | no clean bucket — human triage in P1 | Make CHA (Persuasion) vs WIS (Insight). On win: hostile creatures have disadvantage on attacks vs anyone but you (and ha |
| Elegant Maneuver | Swashbuckler | Rogue | R5b | advantage/floor on ability check — ability detail panel (BUILD consumer; ref: computeAttackAdvantage index.ts:39) | Use a bonus action to gain advantage on the next DEX (Acrobatics) or STR (Athletics) check you make this turn. |
| Master Duelist | Swashbuckler | Rogue | ESCALATE | no clean bucket — human triage in P1 | When you miss with an attack, give yourself advantage on a reroll. 1/short rest. |
| Wrath of the Storm | TempestDomain | Cleric | FLAG | aura/area effect on others — sheet owns no surface/event | When a creature within 5 ft hits you with an attack, use your reaction to force a DEX save (DC = 8 + Prof + WIS) or take |
| Thunderbolt Strike | TempestDomain | Cleric | FLAG | forces enemy save / imposes condition on others — event not simulated | When you deal lightning damage to a Large or smaller creature, push it up to 10 ft. |
| Divine Strike | TempestDomain | Cleric | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | Once per turn, when you hit with a weapon, add 1d8 (2d8 at lv 14) thunder damage. |
| Stormborn | TempestDomain | Cleric | R1 | static self speed — collect.ts fold (consumer mobility.ts:36) | You have a flying speed = your walking speed whenever you aren't underground or indoors. |
| Fast Hands | Thief | Rogue | ESCALATE | no clean bucket — human triage in P1 | Use your bonus action (Cunning Action) to make a DEX (Sleight of Hand) check, use thieves' tools to disarm a trap or ope |
| Second-Story Work | Thief | Rogue | ESCALATE | no clean bucket — human triage in P1 | Climbing no longer costs extra movement. When you make a running jump, the distance increases by DEX mod (feet). |
| Supreme Sneak | Thief | Rogue | R5b | advantage/floor on ability check — ability detail panel (BUILD consumer; ref: computeAttackAdvantage index.ts:39) | Advantage on Stealth checks if you move no more than half your speed on the same turn. |
| Use Magic Device | Thief | Rogue | ESCALATE | no clean bucket — human triage in P1 | Ignore all class, race, and level requirements on magic items. |
| Thief's Reflexes | Thief | Rogue | ESCALATE | no clean bucket — human triage in P1 | Take two turns in the first round of combat (first at your normal initiative, second at your initiative - 10). Only on f |
| Spirit Seeker | TotemWarrior | Barbarian | FLAG | narrative/utility — no owned number | Gain the ability to cast Beast Sense and Speak with Animals as rituals. |
| Totem Spirit | TotemWarrior | Barbarian | FLAG | aura/area effect on others — sheet owns no surface/event | Choose Bear (resistance to all damage but psychic while raging), Eagle (Dash as bonus action, OAs vs you have disadvanta |
| Aspect of the Beast | TotemWarrior | Barbarian | FLAG | narrative/utility — no owned number | Gain a magical benefit based on your totem (Bear: carry 2× weight; Eagle: see clearly at 1 mile; Wolf: track at fast pac |
| Spirit Walker | TotemWarrior | Barbarian | FLAG | narrative/utility — no owned number | Cast the Commune with Nature spell as a ritual. |
| Totemic Attunement | TotemWarrior | Barbarian | FLAG | aura/area effect on others — sheet owns no surface/event | Choose a totem benefit: Bear (creatures within 5 ft have disadvantage on attacks against targets other than you while ra |
| Transmutation Savant | Transmutation | Wizard | ESCALATE | no clean bucket — human triage in P1 | Halve the gold and time cost to copy transmutation spells. |
| Minor Alchemy | Transmutation | Wizard | ESCALATE | no clean bucket — human triage in P1 | After 10 minutes, transmute a single non-magical object of one substance into another (wood→steel, stone→gold, etc.). Up |
| Transmuter's Stone | Transmutation | Wizard | FLAG | incoming/intake damage modifier — not owned | After 8 hours, create a stone holding transmutation magic. While carried, gain one benefit (darkvision 60 ft, +10 speed, |
| Shapechanger | Transmutation | Wizard | FLAG | narrative/utility — no owned number | Add Polymorph to your spellbook for free. Cast Polymorph on yourself without a slot to become a beast (CR ≤ 1). 1/short  |
| Master Transmuter | Transmutation | Wizard | ESCALATE | no clean bucket — human triage in P1 | Destroy your Transmuter's Stone (action) and target one creature/object within 5 ft: major transmutation (Restore Youth, |
| Blessing of the Trickster | TrickeryDomain | Cleric | R5b | advantage/floor on ability check — ability detail panel (BUILD consumer; ref: computeAttackAdvantage index.ts:39) | As an action, touch one willing creature (not yourself); it has advantage on Stealth checks for 1 hour. |
| Cloak of Shadows | TrickeryDomain | Cleric | FLAG | narrative/utility — no owned number | Use Channel Divinity to become invisible until the end of your next turn. Ends early if you attack or cast a spell. |
| Divine Strike | TrickeryDomain | Cleric | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | Once on each of your turns, when you hit with a weapon, deal extra 1d8 poison damage (2d8 at lv 14). |
| Improved Duplicity | TrickeryDomain | Cleric | FLAG | narrative/utility — no owned number | Create up to 4 illusory duplicates with Invoke Duplicity. As a bonus action, you can move any number of them up to 30 ft |
| Eyes of Night | TwilightDomain | Cleric | ESCALATE | no clean bucket — human triage in P1 | 300-ft darkvision (sees through magical darkness). As an action, share this darkvision with up to PB willing creatures f |
| Vigilant Blessing | TwilightDomain | Cleric | ESCALATE | no clean bucket — human triage in P1 | Touch a creature (including yourself) and grant advantage on the next initiative roll, until you use this feature again. |
| Steps of Night | TwilightDomain | Cleric | R1 | static self speed — collect.ts fold (consumer mobility.ts:36) | Magically gain a flying speed = walking speed for 1 minute. Uses = PB per long rest. |
| Divine Strike | TwilightDomain | Cleric | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | Once per turn, when you hit with a weapon, add 1d8 (2d8 at lv 14) radiant damage. |
| Twilight Shroud | TwilightDomain | Cleric | ESCALATE | no clean bucket — human triage in P1 | Creatures of your choice in your Twilight Sanctuary have half cover. |
| Form of Dread | Undead | Warlock | FLAG | incoming/intake damage modifier — not owned | As a bonus action, assume a dreadful form for 1 minute: temp HP = warlock level + CHA mod, immunity to frightened, and o |
| Grave Touched | Undead | Warlock | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | No need to eat, drink, or breathe. When you hit with a weapon attack, deal extra necrotic damage = your CHA mod (min 1). |
| Necrotic Husk | Undead | Warlock | FLAG | aura/area effect on others — sheet owns no surface/event | Resistance to necrotic damage. When reduced to 0 HP (and not killed outright), each creature within 30 ft takes necrotic |
| Spirit Projection | Undead | Warlock | FLAG | incoming/intake damage modifier — not owned | As an action, project your spirit from your body (which falls unconscious) for 1 hour. Spirit form: resistance to non-ra |
| War Priest | WarDomain | Cleric | R3 | granted action/bonus/reaction attack (template: getAvailableActions index.ts:398 + ACTIONS data) | When you use the Attack action, make one weapon attack as a bonus action. Uses = WIS mod (min 1) per long rest; recover  |
| War God's Blessing | WarDomain | Cleric | ESCALATE | no clean bucket — human triage in P1 | When a creature within 30 ft makes an attack roll, use your reaction to grant a +10 bonus to the roll (using Channel Div |
| Divine Strike | WarDomain | Cleric | R2 | outgoing on-hit extra damage (template: Sneak Attack, index.ts:688 / getWeaponSpecialAttacks) | Once per turn, when you hit with a weapon, add 1d8 (2d8 at lv 14) damage of the weapon's type. |
| Avatar of Battle | WarDomain | Cleric | FLAG | incoming/intake damage modifier — not owned | Gain resistance to bludgeoning, piercing, and slashing damage from non-magical attacks. |
| Arcane Deflection | WarMagic | Wizard | R1 | static self AC — collect.ts fold (consumer defense.ts:74/90) | When you are hit by an attack OR fail a save, use your reaction to gain +2 AC against that attack OR +4 to that save. Af |
| Tactical Wit | WarMagic | Wizard | ESCALATE | no clean bucket — human triage in P1 | Add INT mod to your initiative rolls. |
| Power Surge | WarMagic | Wizard | ESCALATE | no clean bucket — human triage in P1 | When you successfully Counterspell or Dispel Magic, gain a Power Surge. Store up to INT mod / 2 (min 1). Spend one when  |
| Durable Magic | WarMagic | Wizard | ESCALATE | no clean bucket — human triage in P1 | While concentrating on a spell, +2 AC and +2 to all saves. |
| Deflecting Shroud | WarMagic | Wizard | FLAG | aura/area effect on others — sheet owns no surface/event | When you use Arcane Deflection, up to 3 creatures of your choice within 60 ft take force damage = half wizard level. |
| Magic Awareness | WildMagicBarbarian | Barbarian | FLAG | narrative/utility — no owned number | As an action, describe the location of magical influences within 1 mile. Uses = PB per long rest. |
| Wild Surge | WildMagicBarbarian | Barbarian | WIRED | already wired via side-channel | When you enter your rage, roll on the Wild Magic table (d8) — effects include force-shielding allies, teleport-on-hit, s |
| Bolstering Magic | WildMagicBarbarian | Barbarian | ESCALATE | no clean bucket — human triage in P1 | Touch a creature as an action and confer either: a d3 bonus to attack rolls and ability checks for 10 minutes, or roll a |
| Unstable Backlash | WildMagicBarbarian | Barbarian | FLAG | incoming/intake damage modifier — not owned | When you take damage or fail a saving throw while raging, use your reaction to roll on the Wild Magic table again and im |
| Controlled Surge | WildMagicBarbarian | Barbarian | ESCALATE | no clean bucket — human triage in P1 | Roll on the Wild Magic table twice and choose which effect to use. If you roll doubles, pick any effect. |
| Wild Magic Surge | WildMagicSorcerer | Sorcerer | ESCALATE | no clean bucket — human triage in P1 | When you cast a 1st-level+ sorcerer spell, the DM may have you roll a d20. On 1, roll on the Wild Magic Surge table (d10 |
| Tides of Chaos | WildMagicSorcerer | Sorcerer | R5b | advantage/floor on ability check — ability detail panel (BUILD consumer; ref: computeAttackAdvantage index.ts:39) | Once per long rest, give yourself advantage on one attack roll, ability check, or save. After use, the DM may trigger a  |
| Bend Luck | WildMagicSorcerer | Sorcerer | ESCALATE | no clean bucket — human triage in P1 | When another creature you can see makes an attack, ability check, or save, spend 2 sorcery points (reaction) to roll a d |
| Controlled Chaos | WildMagicSorcerer | Sorcerer | ESCALATE | no clean bucket — human triage in P1 | When you roll on the Wild Magic Surge table, roll twice and use either result. |
| Spell Bombardment | WildMagicSorcerer | Sorcerer | ESCALATE | no clean bucket — human triage in P1 | When you roll damage for a spell and roll the highest possible number on any of the dice, choose one die, roll it again, |
| Divine Fury | Zealot | Barbarian | ESCALATE | no clean bucket — human triage in P1 | While raging, the first creature you hit with a melee weapon attack on each of your turns takes extra damage = 1d6 + hal |
| Warrior of the Gods | Zealot | Barbarian | FLAG | healing / temp-HP / party buff — not an owned surface | Spells used to revive you don't require material components. |
| Fanatical Focus | Zealot | Barbarian | ESCALATE | no clean bucket — human triage in P1 | While raging, if you fail a saving throw, you can reroll it; you must use the new roll. Once per rage. |
| Zealous Presence | Zealot | Barbarian | FLAG | aura/area effect on others — sheet owns no surface/event | As a bonus action, give up to 10 creatures within 60 ft advantage on attack rolls and saving throws until the start of y |
| Rage Beyond Death | Zealot | Barbarian | ESCALATE | no clean bucket — human triage in P1 | While raging, having 0 HP doesn't knock you unconscious. You can continue to act and only die if your rage ends. |

## C. Phased PR sequence (HARD RULES)

**Hard rules for every PR in this sequence:**

1. **One bucket per PR.** Never mix R1/R2/R3/R5a/R5b/FLAG in a single PR.
2. **Every handler ships a Vitest test** asserting the concrete number/behaviour (e.g. "Divine Strike on a Cleric-8 non-Cleric adds +1d8 radiant to the attack table").
3. **Each PR cites the template it copied** (file:line from the Verification table).
4. **Effect semantics come only from the on-disk desc/catalog** — never invent 5e numbers from memory.
5. **`FeatureEntry` gains `effects?: Effect[]`** (optional + computed ⇒ **no save migration**). FLAG entries get an `effects: [{kind:'flag', note}]`; they render, they never compute a number.

| Phase | Scope | Exit criteria |
|---|---|---|
| **P0** | `resourceKey` startup assertion: on catalog load, assert every `ActionDef.resourceKey` resolves to a known `ResourceDef`/grant name; fail loud in dev. | Assertion + Vitest that a bad key throws. No behaviour change. |
| **P1** | Ratify **this triage doc**: a human walks B1–B4, confirms/creates the COMPUTE rows, and empties ESCALATE (assign each a bucket or mark won't-wire). Add `effects?: Effect[]` to `FeatureEntry` (type only, no data). | Triage table signed off; type compiles; zero data change; no migration. |
| **P2** | **One reference handler per unblocked path**, each with a test copying its template: (a) R1 via collect fold; (b) R2 via `getWeaponSpecialAttacks` — pick **Divine Strike**, de-cage it from Cleric-only; (c) R3 via `getAvailableActions`; (d) R5a make `computeAttackAdvantage` data-driven; (e) **R5b BUILD the ability-panel consumer** `computeAbilityAdvantage` + wire `SkillSaveDetailPanel`. | 5 reference handlers merged, each green-tested, each citing its template. |
| **P3+** | Per-bucket batches, one bucket per PR, working down B1/B2/B3 by class. FLAG batch = notes only (bulk, low risk). | Each batch green; coverage tracked against this doc. |

## D. Open questions for the human (do not self-answer)

1. **Divine Strike de-caging:** the existing toggle is Cleric-gated (`ActionDetailPanel.tsx:688`). Per "no class cage", should R2 Divine Strike surface for any character with the feature — and if so, do we **retire** the bespoke `DivineStrikeTurnToggle` in favour of the `getWeaponSpecialAttacks` rider path, or keep both?
2. **R2 delivery mechanism:** on-hit riders — attack-table rider row (Sneak Attack style, passive display) vs a manual "fire" toggle (Divine Strike style, once-per-turn spend)? Pick one canonical pattern before P2.
3. **`alert`/R1 fold vs hardcode:** do we migrate `alert` (and initiative generally) onto the `collect.ts` fold as the true R1 template, or keep the hardcoded `charCalculations.ts:228` and treat R1 features case-by-case?
4. **R5a scope:** `computeAttackAdvantage` hardcodes a condition id list. Make it read `condition.effects[].mechanic` (needs a new `advantage`/`disadvantage` condition mechanic kind) — or keep hardcoded and just extend the list? Data-driven is more work but kills the class/id cage.
5. **R5b ability-advantage semantics:** many features grant "advantage on X checks" or a floor ("treat d20 ≤ 9 as 10"). Does the ability panel just badge Adv/Disadv (like the attack table), or also model floors/rerolls? Scope the consumer before building.
6. **"Potent Spellcasting"-type outgoing spell-damage mods** (add WIS to cantrip damage) fit no bucket cleanly — they are outgoing but via `computeSpellDamage`, not the weapon special-attack path. New R2-spell sub-bucket, or ESCALATE→FLAG?
7. **FLAG granularity:** should FLAG notes be per-feature free text, or a small enum of note-types (aura / incoming / party / narrative) so the UI can group them?
8. **Companion/summon features** (Steel Defender, Ranger's Companion, Manifest Echo, drakes): routed to FLAG here as separate stat-blocks — but a few (e.g. Arcane Jolt) are genuinely self on-hit riders. Confirm the summon-system boundary in P1.

---
_Buckets: R1 static self-mod · R2 outgoing on-hit rider · R3 granted action · R5a condition→attack adv/disadv · R5b condition/feat→ability adv/disadv · FLAG non-owned · WIRED already connected · ESCALATE unclassified._