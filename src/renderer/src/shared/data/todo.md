# Unimplemented Feature Backlog

Each item: **Goal** (mechanic to wire) + **Success** (observable condition).
Features already implemented (Rage, Sneak Attack, Bardic Inspiration, Wild Shape, Second Wind, Action Surge, Ki, Channel Divinity, Hexblade CHA-for-attacks, Fighting Style bonuses) are excluded.

---

## General

**Critical hit display on attack tables**
- Goal: Show crit threshold on melee, ranged, and spell attack rows
- Success: Each attack row has a "Crit 20" badge (or "Crit 19–20" for Champion lv 3, "Crit 18–20" for Champion lv 15); clicking it explains the extra damage roll

**Multiple attacks counter**
- Goal: Display attack count on the Attack action
- Success: Barbarian / Paladin / Fighter / Ranger lv 5 shows ×2; Fighter lv 11 shows ×3; Monk lv 2 shows bonus-action unarmed ×2 (base Martial Arts, not Flurry)

---

## Fighter

**Indomitable** (lv 9 / 13 / 17)
- Goal: Resource-tracked reroll of a failed saving throw
- Success: Reaction in Actions panel with charge counter (1 / 2 / 3 by level); spending a charge marks it used; resets on long rest

### Champion
**Improved Critical / Superior Critical**
- Goal: Extend crit range — 19–20 at lv 3, 18–20 at lv 15
- Success: Attack table badge reads "Crit 19–20" (lv 3–14) or "Crit 18–20" (lv 15+); crit-threshold value flows into any crit-check logic

### Battle Master
**Combat Superiority — maneuver effect formulas**
- Goal: Spending a Superiority Die (d8 → d10 → d12 by tier) adds the die result to the maneuver's effect
- Success: Each maneuver card shows its formula ("Precision Attack: +1d8 to hit"); spending a die deducts from `superiorityDiceUsed`; recharges on short rest

### Eldritch Knight
**War Magic** (lv 7) / **Improved War Magic** (lv 18)
- Goal: After casting a cantrip (or any spell at lv 18), make one weapon attack as a bonus action
- Success: When a cantrip is cast, a "War Magic Attack" bonus action appears; at lv 18, triggers on any spell cast

### Cavalier
**Unwavering Mark** (lv 3)
- Goal: Hitting a creature marks it; if the marked creature attacks someone other than you, you gain a bonus-action melee attack at advantage, plus ½ level bonus damage
- Success: Hit action marks the target (visible indicator); a "Mark Attack (Adv)" bonus action appears when the mark condition would trigger, with correct bonus damage shown

### Arcane Archer
**Arcane Shot** (lv 3)
- Goal: 2 uses / short rest; each shot adds a named magical effect (Banishing, Beguiling, Bursting, Enfeebling, Grasping, Piercing, Seeking, Shadow) on a ranged hit
- Success: "Arcane Shot (2/2)" in Actions; selecting a shot shows its effect in the detail panel; uses decrement and recharge on short rest

### Psi Warrior
**Psionic Power** (lv 3)
- Goal: Psi Energy Dice pool (d6 → d8 → d10 → d12 scaling by level); spent for Psionic Strike, Protective Field, Telekinetic Movement; 2 free dice recharge on short rest, rest on long rest
- Success: "Psi Energy Dice (X/Y)" resource visible in panel; Psionic Strike adds the die roll to a weapon damage once per turn; Protective Field and Telekinetic Movement each cost one die

### Rune Knight
**Rune Carver** (lv 3)
- Goal: Learn runes (Cloud, Stone, Hill, Fire, Frost, Storm); apply one to a weapon or armor after a long rest; each rune grants a passive bonus and a 1/day activated effect
- Success: Rune selector in equipment for Rune Knight; active rune shown as badge on the item; activated effect has a daily use counter that resets on long rest

---

## Barbarian

**Brutal Critical** (lv 9 / 13 / 17)
- Goal: Roll extra weapon damage dice on a crit — 1 extra at lv 9, 2 at lv 13, 3 at lv 17
- Success: Crit damage formula reads `baseWeaponDie × (1 + brutalDiceCount) + mods`

### Totem Warrior
**Totem Spirit** (lv 3)
- Goal: Wire the three animal bonuses while Raging — Bear: resistance to all damage except psychic; Eagle: OA attacks against you have disadvantage; Wolf: adjacent allies have advantage on melee attacks vs. creatures adjacent to you
- Success: Selecting Bear totem shows "Resistance: all (except psychic)" as an active condition while raging; Eagle shows "OA Disadvantage"; Wolf shows the ally-advantage note

### Wild Magic Barbarian
**Wild Surge** (lv 3)
- Goal: On entering Rage, roll d8 on the Wild Surge table; the result produces a distinct magical effect lasting until rage ends
- Success: Entering Rage triggers a d8 roll display with the result named (e.g. "3 — Orb of Fire"); effect description shown as an active condition

---

## Cleric

**Destroy Undead** (lv 5+)
- Goal: On a failed Turn Undead save, undead at or below a CR threshold are destroyed outright; threshold scales ½ → 1 → 2 → 3 → 4 by level
- Success: Turn Undead action description shows the current destroy threshold at the character's level

**Divine Intervention** (lv 10)
- Goal: Once per long rest, roll d100; success if result ≤ cleric level
- Success: "Divine Intervention" in Actions panel with long-rest usage counter; clicking rolls a d100 and shows pass/fail vs. cleric level

**Divine Strike** (all domains, lv 8 / lv 14)
- Goal: Once per turn, a weapon hit adds 1d8 of the domain's damage type (2d8 at lv 14)
- Success: A "Divine Strike" one-use toggle appears after a weapon attack each turn; using it adds `+1d8 [type]` (or +2d8) to the damage display and marks it spent for that turn

### War Domain
**War Priest** (lv 1)
- Goal: Make a bonus-action weapon attack when you cast a spell; uses = WIS mod per long rest
- Success: "War Priest Attack" in Bonus Actions with a WIS-mod usage counter; recharges on long rest

### Twilight Domain
**Eyes of Night** (lv 1)
- Goal: Darkvision 300 ft; action to share it with willing creatures within 10 ft for 1 hour; uses = WIS mod per long rest
- Success: Darkvision range shown as 300 ft; "Eyes of Night" action has a WIS-mod usage counter; activation note lists affected creatures

---

## Paladin

**Aura of Protection** (lv 6 / 18)
- Goal: Friendly creatures within 10 ft (20 ft at lv 18) add CHA mod (min +1) to all saving throws
- Success: Saving throw display notes "+[CHA mod] (Aura)" for every save type; aura range (10 ft / 20 ft) shown on the feature card

---

## Monk

**Stunning Strike** (lv 5)
- Goal: After a hit, spend 1 Ki; target makes CON save DC 8+Prof+WIS or is stunned until your next turn
- Success: "Stunning Strike" on-hit option appears after each melee attack; spending it deducts 1 Ki and shows the save DC; stun condition displayed on target

---

## Rogue

### Swashbuckler
**Rakish Audacity**
- Goal: Sneak Attack applies without an adjacent ally when no other creature is adjacent to you (one-on-one engagement)
- Success: Sneak Attack triggers for Swashbuckler without the "adjacent ally" condition when the one-on-one requirement is met

---

## Wizard

**Arcane Recovery** (lv 1)
- Goal: Once per long rest after a short rest, recover spell slots with combined level ≤ ½ wizard level (rounded up)
- Success: Short rest shows an "Arcane Recovery" option; user picks which slots to recover up to the cap; marks as unavailable until long rest

### Bladesinger
**Bladesong** (lv 2)
- Goal: Bonus action to activate (INT mod uses / long rest); while active: +INT mod to AC, +10 ft speed, advantage on Acrobatics, +INT mod to concentration saves
- Success: Bladesong toggle deducts a use; active state shows "+[INT mod] AC", "+10 speed", "Acrobatics Adv", "Conc +[INT mod]" in conditions; deactivates automatically on wearing shield / medium / heavy armor or wielding two-handed weapon

---

## Sorcerer

**Metamagic** (lv 3)
- Goal: Spend sorcery points to modify spells — Careful (protect allies), Distant (×2 range), Empowered (reroll damage dice), Extended (×2 duration), Heightened (disadv on first save), Quickened (cast as bonus action), Subtle (no V/S components), Twinned (second target)
- Success: When casting a spell, the two chosen Metamagic options appear as toggles; each deducts the correct SP cost; Quickened changes cast time to bonus action; Twinned requires a valid second target

---

## Warlock

**Pact Boon** (lv 3)
- Goal: Pact of the Blade — summon a melee pact weapon (magical, CHA mod to attack/damage); Pact of the Chain — familiar with special stat blocks; Pact of the Tome — gain 3 cantrips from any class
- Success: Pact of the Blade adds a pact weapon entry to the attack list using CHA; Pact of the Tome adds 3 user-selected cross-class cantrips; Pact of the Chain notes the familiar type

**Mystic Arcanum** (lv 11 / 13 / 15 / 17)
- Goal: Free cast of one 6th-, 7th-, 8th-, and 9th-level spell (one per tier); each usable once per long rest independently
- Success: Each Arcanum spell appears in the spell list with its own long-rest counter; casting does not spend a pact slot

---

## Artificer

**Infuse Item — infusion display** (lv 2)
- Goal: Items with active infusions show a badge listing the infusion name and its mechanical effect
- Success: Equipment panel shows infusion badges on affected items; clicking a badge shows the effect summary (e.g. "+1 attack and damage rolls")

**Flash of Genius** (lv 7)
- Goal: Reaction to add INT mod to an ability check or saving throw made by a creature within 30 ft; uses = INT mod per long rest
- Success: "Flash of Genius" reaction in Actions panel with INT-mod usage counter; spending a use shows the +INT mod bonus applied

**Spell-Storing Item** (lv 11)
- Goal: Store a 1st- or 2nd-level Artificer spell in an item after a long rest; the bearer may cast it up to 2×INT mod times
- Success: A "Spell-Storing Item" slot in equipment lets the user choose a stored spell; a charge counter (max 2×INT mod) tracks remaining casts; refreshes after a long rest
