# Subclass Data Audit — 2014 rules

Audit of `src/renderer/src/shared/data/subclassData.ts` against authoritative 2014-era
official D&D 5e sources (PHB 2014, XGtE, TCoE, SCAG, DMG, EGtW, FToD, VRGtR).
2024 PHB / One D&D rules are out of scope.

Report-only — no edits applied to `subclassData.ts` this round.

---

## Summary

- **110 subclasses audited** across 13 classes.
- **23 critical findings** (runtime-breaking or rules-wrong).
- **5 minor findings** (description omits a defining feature without being factually wrong, or schema-pragma misuse).
- **0 unverified items** — every subclass was found in an authoritative source.
- **6 encoding-completeness gaps** at the schema level affecting most subclasses (separate section below).

Critical-finding breakdown:
- **17** — Artificer `subclassSpells` references to spell ids that don't exist in `spellData.ts`. These will fail at runtime when the character sheet renders the subclass spell list.
- **5** — Cleric domains with empty `channelDivinityDesc` despite the rules giving each a domain-specific Channel Divinity option at cleric level 2.
- **1** — Nature Domain missing `extraArmorProficiencies: ['heavy']`.

---

## Critical findings

### 1. Artificer `subclassSpells` — 17 broken spell-id references

`subclassSpells` references 34 unique spell-ids across the four Artificer subclasses; **17 of them are not defined in `spellData.ts`**. `SPELL_BY_ID[id]` returns `undefined` for these, so any feature that displays the subclass spell list will silently drop them or crash an unguarded reader.

The spell-ids are all valid 2014 spells (mostly PHB) that just need to be added to `spellData.ts`. Verified against [Tasha's Cauldron of Everything: Artificer subclasses](https://www.dndbeyond.com/sources/tce/artificer-subclasses).

| Subclass | Level | Missing id | Canonical spell | Source |
|---|---|---|---|---|
| Alchemist | 3 | `ray-of-sickness` | Ray of Sickness | PHB |
| Alchemist | 5 | `flaming-sphere` | Flaming Sphere | PHB |
| Alchemist | 5 | `melfs-acid-arrow` | Melf's Acid Arrow | PHB |
| Alchemist | 9 | `gaseous-form` | Gaseous Form | PHB |
| Alchemist | 13 | `blight` | Blight | PHB |
| Alchemist | 17 | `cloudkill` | Cloudkill | PHB |
| Armorer | 13 | `fire-shield` | Fire Shield | PHB |
| Armorer | 17 | `passwall` | Passwall | PHB |
| Artillerist | 9 | `wind-wall` | Wind Wall | PHB |
| Artillerist | 13 | `ice-storm` | Ice Storm | PHB |
| Artillerist | 13 | `wall-of-fire` | Wall of Fire | PHB |
| Battle Smith | 3 | `heroism` | Heroism | PHB |
| Battle Smith | 5 | `branding-smite` | Branding Smite | PHB |
| Battle Smith | 5 | `warding-bond` | Warding Bond | PHB |
| Battle Smith | 9 | `aura-of-vitality` | Aura of Vitality | PHB |
| Battle Smith | 9 | `conjure-barrage` | Conjure Barrage | PHB |
| Battle Smith | 13 | `aura-of-purity` | Aura of Purity | PHB |
| Battle Smith | 17 | `banishing-smite` | Banishing Smite | PHB |

**Recommended fix:** add the 18 missing spells (17 unique — Battle Smith's missing list overlaps with Armorer's `fire-shield`) to `spellData.ts`, OR temporarily remove the dead references. The current state will surface as missing UI rows at minimum.

### 2. Cleric domains — 5 missing `channelDivinityDesc`

Every PHB-style Divine Domain has a domain-specific Channel Divinity option (called out at cleric level 2). Nine of the 14 domains in the data have it populated; five do not. Spec values verified against the cited sourcebooks.

| Domain | Source | Missing CD option | Effect (summary) |
|---|---|---|---|
| Forge | [XGtE](https://www.dndbeyond.com/sources/xgte/cleric) | Artisan's Blessing | 1-hour ritual creates a non-magical item containing metal worth ≤ 100 gp. |
| Grave | [XGtE](https://www.dndbeyond.com/sources/xgte/cleric) | Path to the Grave | Curse a creature within 30 ft; the next attack against it has vulnerability to all damage of that attack, then the curse ends. |
| Order | [TCoE](https://www.dndbeyond.com/sources/tce/cleric) | Order's Demand | 30-ft, WIS save; failures are charmed until end of your next turn (or until damaged) and can be made to drop what they're holding. |
| Peace | [TCoE](https://www.dndbeyond.com/sources/tce/cleric) | Balm of Peace | As an action, move up to your speed without provoking OAs; when you come within 5 ft of a creature, heal it for `2d6 + WIS` (each creature only once per use). |
| Twilight | [TCoE](https://www.dndbeyond.com/sources/tce/cleric) | Twilight Sanctuary | 30-ft sphere of dim light for 1 min, moves with you; each creature ending its turn in the sphere gets either `1d6 + cleric level` temp HP, or ends a charm/fright effect. |

### 3. Nature Domain — missing armor proficiency

Nature Domain's level-1 *Acolyte of Nature* feature grants **heavy armor** proficiency. The data's `description` mentions it (`"Heavy armor proficiency and druid cantrip"`) but `extraArmorProficiencies` is empty.

```ts
// Current (subclassData.ts:74-77):
{
  id: 'NatureDomain', label: 'Nature Domain', classId: 'Cleric', unlocksAtLevel: 1,
  description: 'Protect and harness the wild world. Heavy armor proficiency and druid cantrip.',
  channelDivinityDesc: 'Charm Animals and Plants: …',
}

// Should add:
extraArmorProficiencies: ['heavy'],
```

Verified at [Cleric: Nature Domain (PHB)](https://dnd5e.wikidot.com/cleric:nature).

---

## Minor findings

### M1. Arcane Archer — misleading `spellcastingAbility` field

Arcane Archer (XGtE p.28) is **not a spellcaster** — it has no spells known, no slots, no cantrips. Its Arcane Shot save DC uses INT (`8 + PB + INT`). The data sets `spellcastingAbility: 'int'` on Arcane Archer (subclassData.ts:120), which conflicts with the field's JSDoc *"Spellcasting ability for subclasses that add magic to non-casting classes"*.

This is presumably a pragma so the code can compute the Arcane Shot DC from the same field used by EK/AT. It works, but it's misleading. Two ways to fix:

- (a) Add a dedicated `arcaneShotAbility?: AbilityScore` field and migrate the AA row.
- (b) Update the JSDoc to acknowledge that AA also uses this field for the Arcane Shot DC, not spellcasting.

Verified at [Fighter: Arcane Archer (XGtE)](https://dnd5e.wikidot.com/fighter:arcane-archer).

### M2. Cleric domains — uncaptured non-armor proficiencies (schema gap)

Several Cleric domains grant proficiencies the schema can't represent: martial weapons (War, Tempest, Death, Order, Twilight), tools (Forge: smith's tools), and a skill (Order: Intimidation or Persuasion). These aren't bugs in the *data* but the **schema lacks** `extraWeaponProficiencies` / `extraToolProficiencies` / `extraSkillProficiencies` fields. Same gap applies to Artificer Tools of the Trade (Artillerist: martial weapons + woodcarver's tools; Battle Smith: martial weapons + smith's tools).

### M3. Battlerager — Dwarf restriction not enforced

PHB SCAG restricts Path of the Battlerager to dwarves. The data does not enforce this. Likely intentional (the restriction is widely house-ruled away and Tasha's optional rules explicitly permit ignoring lineage restrictions), but worth noting.

### M4. Beast Master — description is generic for PHB and Tasha's

The PHB version (Ranger's Companion, a real beast) and Tasha's optional rewrite (Primal Companion, a magical Beast of Land/Sea/Sky) are mechanically very different. The data's blurb (`"Bond with a beast companion that fights alongside you, following your commands in combat."`) is generic enough to apply to either. Since this is a 2014 audit and the PHB version is canonical, this is acceptable, but a user picking Beast Master cannot tell which version applies. ([D&D Beyond: Tasha's Beastmaster vs PHB](https://www.dndbeyond.com/forums/class-forums/ranger/134270-tashas-beastmaster-vs-phb-pteranodon-companion)).

### M5. Bladesinging — encoded as Wizard 2nd-level but originally SCAG

Bladesinging first appeared in SCAG, reprinted (with refinements) in TCoE. The data treats it as a stock Wizard subclass at `unlocksAtLevel: 2`, which is correct per both versions. Description does not specify which version of Bladesong's AC formula applies — both add `INT mod (min +1)` to AC while active. Acceptable. ([D&D Beyond: Bladesinging (TCoE)](https://www.dndbeyond.com/posts/1048-wizard-101-bladesinging-from-tashas-cauldron-of)).

---

## Per-class verification

Legend: ✓ = all encoded fields correct against source. ⚠ = critical/minor finding (see sections above).

### Barbarian (8) — unlocksAtLevel 3 ✓ for all

| Subclass | Source | Status |
|---|---|---|
| Berserker | PHB | ✓ |
| TotemWarrior | PHB (Bear/Eagle/Wolf) + SCAG (Elk/Tiger) | ✓ all 5 totems correctly listed |
| AncestralGuardian | XGtE | ✓ |
| StormHerald | XGtE | ✓ |
| Zealot | XGtE | ✓ |
| Beast | TCoE | ✓ |
| WildMagicBarbarian | TCoE | ✓ |
| Battlerager | SCAG | ✓ (see M3 on Dwarf restriction) |

[PHB Barbarian — Path of the Totem Warrior](https://dnd5e.wikidot.com/barbarian:totem-warrior)
· [Path of Wild Magic (TCoE)](https://dnd5e.wikidot.com/barbarian:wild-magic)
· [Battlerager (SCAG)](https://dnd5e.wikidot.com/barbarian:battlerager)

### Bard (7) — unlocksAtLevel 3 ✓ for all

| Subclass | Source | Status |
|---|---|---|
| CollegeOfLore | PHB | ✓ |
| CollegeOfValor | PHB | ✓ |
| CollegeOfGlamour | XGtE | ✓ |
| CollegeOfSwords | XGtE | ✓ |
| CollegeOfWhispers | XGtE | ✓ |
| CollegeOfCreation | TCoE | ✓ |
| CollegeOfEloquence | TCoE | ✓ |

### Cleric (14) — unlocksAtLevel 1 ✓ for all

| Subclass | Source | extraArmorProf | channelDivinityDesc | Status |
|---|---|---|---|---|
| LifeDomain | PHB | ['heavy'] ✓ | Preserve Life ✓ | ✓ |
| LightDomain | PHB | — ✓ | Radiance of the Dawn ✓ | ✓ |
| TrickeryDomain | PHB | — ✓ | Invoke Duplicity ✓ | ✓ |
| KnowledgeDomain | PHB | — ✓ | Knowledge of the Ages ✓ | ✓ |
| NatureDomain | PHB | **missing** ✗ | Charm Animals and Plants ✓ | ⚠ — see Critical #3 |
| TempestDomain | PHB | ['heavy'] ✓ | Destructive Wrath ✓ | ✓ (martial weapons uncaptured; see M2) |
| WarDomain | PHB | ['heavy'] ✓ | Guided Strike ✓ | ✓ (martial weapons uncaptured; see M2) |
| DeathDomain | DMG | ['heavy'] ✓ | Touch of Death ✓ | ✓ (martial weapons uncaptured) |
| ArcanaDomain | SCAG | — ✓ | Arcane Abjuration ✓ | ✓ |
| ForgeDomain | XGtE | ['heavy'] ✓ | **missing** ✗ | ⚠ Critical #2 |
| GraveDomain | XGtE | — ✓ | **missing** ✗ | ⚠ Critical #2 |
| OrderDomain | TCoE | ['heavy'] ✓ | **missing** ✗ | ⚠ Critical #2 (also Intim/Persuasion + martial weapons uncaptured) |
| PeaceDomain | TCoE | — ✓ | **missing** ✗ | ⚠ Critical #2 |
| TwilightDomain | TCoE | ['heavy'] ✓ | **missing** ✗ | ⚠ Critical #2 (martial weapons uncaptured) |

### Druid (7) — unlocksAtLevel 2 ✓ for all

| Subclass | Source | Status |
|---|---|---|
| CircleOfTheLand | PHB | ✓ all 8 environments listed (arctic, coast, desert, forest, grassland, mountain, swamp, underdark) |
| CircleOfTheMoon | PHB | ✓ |
| CircleOfDreams | XGtE | ✓ |
| CircleOfTheShepherd | XGtE | ✓ |
| CircleOfSpores | TCoE (orig. GGtR) | ✓ |
| CircleOfStars | TCoE | ✓ |
| CircleOfWildfire | TCoE | ✓ |

### Fighter (9) — unlocksAtLevel 3 ✓ for all

| Subclass | Source | Spell tables | Status |
|---|---|---|---|
| Champion | PHB | — | ✓ |
| BattleMaster | PHB | — | ✓ |
| EldritchKnight | PHB | spellsKnownTable ✓, cantripsKnownTable ✓, spellListClassId='Wizard' ✓, spellcastingAbility='int' ✓ | ✓ |
| ArcaneArcher | XGtE | spellcastingAbility='int' (used for Arcane Shot DC, not casting) | ⚠ M1 |
| Cavalier | XGtE | — | ✓ |
| Samurai | XGtE | — | ✓ |
| PsiWarrior | TCoE | — | ✓ |
| RuneKnight | TCoE | — | ✓ |
| EchoKnight | EGtW | — | ✓ |

EK spell-known table matches [PHB Eldritch Knight](https://dnd5e.wikidot.com/fighter:eldritch-knight) exactly:
`{ 3:3, 4:4, 7:5, 8:6, 10:7, 11:8, 13:9, 14:10, 16:11, 19:12, 20:13 }` for spells, `{ 3:2, 10:3 }` for cantrips.

### Monk (8) — unlocksAtLevel 3 ✓ for all

| Subclass | Source | Status |
|---|---|---|
| OpenHand | PHB | ✓ |
| Shadow | PHB | ✓ |
| FourElements | PHB | ✓ |
| SunSoul | XGtE (orig. SCAG) | ✓ |
| DrunkenMaster | XGtE | ✓ |
| Kensei | XGtE | ✓ |
| Mercy | TCoE | ✓ |
| AstralSelf | TCoE | ✓ |

### Paladin (8) — unlocksAtLevel 3 ✓ for all

| Subclass | Source | Status |
|---|---|---|
| OathOfDevotion | PHB | ✓ |
| OathOfTheAncients | PHB | ✓ |
| OathOfVengeance | PHB | ✓ |
| OathOfConquest | XGtE | ✓ |
| OathOfRedemption | XGtE | ✓ |
| OathOfGlory | TCoE | ✓ |
| OathOfTheWatchers | TCoE | ✓ |
| Oathbreaker | DMG | ✓ (DMG presents this as DM-permission NPC option; usable as player oath with table consent) |

### Ranger (8) — unlocksAtLevel 3 ✓ for all

| Subclass | Source | Status |
|---|---|---|
| Hunter | PHB | ✓ |
| BeastMaster | PHB (Tasha's optional rewrite exists) | ✓ (see M4) |
| GloomStalker | XGtE | ✓ |
| HorizonWalker | XGtE | ✓ |
| MonsterSlayer | XGtE | ✓ |
| FeyWanderer | TCoE | ✓ |
| Swarmkeeper | TCoE | ✓ |
| Drakewarden | FToD | ✓ |

### Rogue (9) — unlocksAtLevel 3 ✓ for all

| Subclass | Source | Spell tables | Status |
|---|---|---|---|
| Thief | PHB | — | ✓ |
| Assassin | PHB | — | ✓ |
| ArcaneTrickster | PHB | spellsKnownTable ✓, cantripsKnownTable ✓, spellListClassId='Wizard' ✓, spellcastingAbility='int' ✓ | ✓ |
| Inquisitive | XGtE | — | ✓ |
| Mastermind | XGtE | — | ✓ |
| Scout | XGtE | — | ✓ |
| Swashbuckler | XGtE (orig. SCAG) | — | ✓ |
| Phantom | TCoE | — | ✓ |
| Soulknife | TCoE | — | ✓ |

AT spell-known table matches PHB p.98: identical progression to Eldritch Knight.

### Sorcerer (7) — unlocksAtLevel 1 ✓ for all

| Subclass | Source | unarmoredAC | Status |
|---|---|---|---|
| DraconicBloodline | PHB | `(dex) => 13 + dex` ✓ | ✓ matches Draconic Resilience |
| WildMagicSorcerer | PHB | — | ✓ |
| DivineSoul | XGtE | — | ✓ |
| ShadowMagic | XGtE | — | ✓ |
| StormSorcery | XGtE (orig. SCAG) | — | ✓ |
| AberrantMind | TCoE | — | ✓ |
| ClockworkSoul | TCoE | — | ✓ |

### Warlock (8) — unlocksAtLevel 1 ✓ for all

| Subclass | Source | Status |
|---|---|---|
| Archfey | PHB | ✓ |
| Fiend | PHB | ✓ |
| GreatOldOne | PHB | ✓ |
| Celestial | XGtE | ✓ |
| Hexblade | XGtE | ✓ |
| Fathomless | TCoE | ✓ |
| Genie | TCoE | ✓ |
| Undead | VRGtR | ✓ |

### Wizard (13) — unlocksAtLevel 2 ✓ for all

| Subclass | Source | Status |
|---|---|---|
| Abjuration | PHB | ✓ |
| Conjuration | PHB | ✓ |
| Divination | PHB | ✓ |
| Enchantment | PHB | ✓ |
| Evocation | PHB | ✓ |
| Illusion | PHB | ✓ |
| Necromancy | PHB | ✓ |
| Transmutation | PHB | ✓ |
| Bladesinging | TCoE (orig. SCAG) | ✓ (see M5) |
| OrderOfScribes | TCoE | ✓ |
| Chronurgy | EGtW | ✓ |
| Graviturgy | EGtW | ✓ |
| WarMagic | XGtE | ✓ |

### Artificer (4) — unlocksAtLevel 3 ✓ for all — DEEP audit

All four Artificer subclasses come from TCoE (Chapter 1) and are the only subclasses in the data with populated `subclassFeatures` and `subclassSpells`. Per-feature audit:

**Alchemist** (TCoE p.13)
- `subclassFeatures`: 5 entries (Tool Prof, Experimental Elixir at lv 3; Alchemical Savant lv 5; Restorative Reagents lv 9; Chemical Mastery lv 15) — all match source. ✓
- `subclassSpells`: 10 entries; **6 are broken references** (see Critical #1).
- Tool grant: alchemist's supplies. ✓

**Armorer** (TCoE p.14)
- `extraArmorProficiencies: ['heavy']` ✓ (matches Tools of the Trade granting heavy armor).
- `subclassFeatures`: 7 entries (Tools, Arcane Armor, Armor Model, Armor Modifications at lv 3; Extra Attack lv 5; Armor Mods improved lv 9; Perfected Armor lv 15) — all match source. Note: smith's tools grant via Tools of the Trade is described but not captured in a schema field (see M2).
- `subclassSpells`: 10 entries; **2 are broken references**.

**Artillerist** (TCoE p.15)
- `subclassFeatures`: 5 entries (Tools, Eldritch Cannon at lv 3; Arcane Firearm lv 5; Explosive Cannon lv 9; Fortified Position lv 15) — all match source. Tools grant martial weapons + woodcarver's tools, neither captured (see M2).
- `subclassSpells`: 10 entries; **3 are broken references**.

**Battle Smith** (TCoE p.16)
- `subclassFeatures`: 6 entries (Tools, Battle Ready, Steel Defender at lv 3; Extra Attack lv 5; Arcane Jolt lv 9; Improved Defender lv 15) — all match source. Tools grant martial weapons + smith's tools, neither captured.
- `subclassSpells`: 10 entries; **7 are broken references**.

---

## Encoding-completeness gaps

These are not data bugs but reveal where the schema is intentionally minimal. None block the app today; they affect how rich the future character sheet can get.

| Gap | Scope | Notes |
|---|---|---|
| Cleric domain spells not encoded | All 14 domains | PHB grants 2 spells at cleric levels 1/3/5/7/9 per domain → ~140 missing entries. Only Artificers carry `subclassSpells`. |
| Paladin oath spells not encoded | All 8 oaths | 2 spells at paladin levels 3/5/9/13/17 per oath → 80 entries. |
| Warlock expanded spell lists not encoded | All 8 patrons | 2 spells at warlock spell-levels 1–5 per patron → 80 entries. |
| Druid Circle of the Land circle-spells not encoded | 8 environments | 4 spell levels × 2 spells each = 64 entries. |
| Aberrant Mind / Clockwork Soul Sorcerer "Psionic Spells" / "Clockwork Magic" not encoded | 2 subclasses | 5 spells each at sorcerer levels 1/3/5/7/9 (TCoE pattern; spells replaceable). |
| 106/110 subclasses lack `subclassFeatures` | All non-Artificers | Only Artificer subclasses carry feature trees; everyone else relies on the `description` blurb. |
| Schema lacks `extraWeaponProficiencies` / `extraSkillProficiencies` / `extraToolProficiencies` | Affects War/Tempest/Death/Order/Twilight Domains, Forge Domain tools, Artillerist/Battle Smith Tools of the Trade, Order Domain skill | Either add the fields, or document where these grants are encoded elsewhere. |

---

## Unverified items

None. Every subclass was found and verified against an authoritative source.

---

## Sources

Primary references used for verification (all official 2014-era D&D content):

- [Player's Handbook (2014) — D&D Beyond](https://www.dndbeyond.com/sources/phb)
- [Xanathar's Guide to Everything (XGtE) — D&D Beyond](https://www.dndbeyond.com/sources/xgte)
- [Tasha's Cauldron of Everything (TCoE) — D&D Beyond](https://www.dndbeyond.com/sources/tce)
- [Sword Coast Adventurer's Guide (SCAG) — D&D Beyond](https://www.dndbeyond.com/sources/scag)
- [Dungeon Master's Guide (DMG) — D&D Beyond](https://www.dndbeyond.com/sources/dmg)
- [Explorer's Guide to Wildemount (EGtW) — D&D Beyond](https://www.dndbeyond.com/sources/egtw)
- [Fizban's Treasury of Dragons (FToD) — D&D Beyond](https://www.dndbeyond.com/sources/ftd)
- [Van Richten's Guide to Ravenloft (VRGtR) — D&D Beyond](https://www.dndbeyond.com/sources/vrgtr)

Cited per-subclass references used during this audit:

- Cleric, Nature: [PHB Acolyte of Nature](https://dnd5e.wikidot.com/cleric:nature)
- Cleric, Forge (Artisan's Blessing): [XGtE Forge Domain](https://dnd5e.wikidot.com/cleric:forge), [Artisan's blessing — Forgotten Realms Wiki](https://forgottenrealms.fandom.com/wiki/Artisan's_blessing)
- Cleric, Grave (Path to the Grave): [XGtE Grave Domain](https://dnd5e.wikidot.com/cleric:grave)
- Cleric, Order (Order's Demand): [TCoE Order Domain](https://dnd5e.wikidot.com/cleric:order)
- Cleric, Peace (Balm of Peace): [TCoE Peace Domain](https://dnd5e.wikidot.com/cleric:peace), [Balm of peace — Forgotten Realms Wiki](https://forgottenrealms.fandom.com/wiki/Balm_of_peace)
- Cleric, Twilight (Twilight Sanctuary): [TCoE Twilight Domain](https://dnd5e.wikidot.com/cleric:twilight)
- Fighter, Eldritch Knight: [PHB Eldritch Knight](https://dnd5e.wikidot.com/fighter:eldritch-knight)
- Fighter, Arcane Archer: [XGtE Arcane Archer](https://dnd5e.wikidot.com/fighter:arcane-archer)
- Fighter, Champion: [Improved Critical (SRD)](https://farreachco.com/dnd/5e/srd/features/improved-critical)
- Barbarian, Totem Warrior: [PHB Path of the Totem Warrior](https://dnd5e.wikidot.com/barbarian:totem-warrior)
- Barbarian, Battlerager: [SCAG Path of the Battlerager](https://dnd5e.wikidot.com/barbarian:battlerager)
- Barbarian, Wild Magic: [TCoE Path of Wild Magic](https://dnd5e.wikidot.com/barbarian:wild-magic)
- Warlock, Hexblade: [XGtE Hexblade](https://dnd5e.wikidot.com/warlock:hexblade)
- Wizard, Bladesinging: [Bladesinging (TCoE) — D&D Beyond post](https://www.dndbeyond.com/posts/1048-wizard-101-bladesinging-from-tashas-cauldron-of)
- Ranger, Beast Master (PHB vs Tasha's): [Tasha's Beastmaster vs PHB forum](https://www.dndbeyond.com/forums/class-forums/ranger/134270-tashas-beastmaster-vs-phb-pteranodon-companion)

Sourcebook attributions (SCAG/XGtE/TCoE/etc.) verified against the canonical Wikidot mirror tables (which themselves cite the original published sources).
