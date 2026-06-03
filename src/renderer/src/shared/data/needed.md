# Blocked Features — What's Needed Before Implementation

Items below cannot be implemented yet. Each lists exactly what's missing.

---

## Data files that don't exist yet

### Battle Master maneuver data (`maneuverData.ts`)
Need a data file with each maneuver's id, name, Superiority Die formula, and effect:
- Precision Attack — add die to attack roll
- Disarming Strike — add die to damage; target drops item (Str/Dex save)
- Distracting Strike — add die to damage; next attack on target has advantage
- Evasive Footwork — add die to AC until end of move
- Feinting Attack — advantage on next attack + add die to damage
- Goading Attack — add die to damage; target has disadvantage on attacks vs others (Wis save)
- Lunging Attack — add die to damage, reach +5ft
- Maneuvering Attack — add die to damage, ally can move half speed without OA
- Menacing Attack — add die to damage; target is frightened (Wis save)
- Parry — reduce damage by die + Dex mod (reaction)
- Pushing Attack — add die to damage, push target 15ft (Str save)
- Rally — bonus action, give ally temp HP = die + Cha mod
- Riposte — reaction, attack creature that missed you, add die to damage
- Sweeping Attack — add die to damage on second adjacent creature
- Trip Attack — add die to damage, knock prone (Str save)

### Arcane Shot effect data
Need 8 shot entries with name, effect summary, save type, and on-hit behavior:
- Banishing Arrow, Beguiling Arrow, Bursting Arrow, Enfeebling Arrow,
  Grasping Arrow, Piercing Arrow, Seeking Arrow, Shadow Arrow

### Wild Magic Barbarian — Wild Surge table (`wildSurgeTable.ts`)
Need 8 numbered entries (d8 roll) each with a name and description:
1. Shadowy tendrils — psychic damage aura
2. Surge of vitality — healing
3. Orb of fire — fire damage sphere
4. etc. (all 8 entries from XGtE/PHB)

### Psi Warrior ability data
Need descriptions and dice costs for each psionic ability (unlocked by level):
- Psionic Strike (die to damage, lv 3)
- Protective Field (die to temp HP on ally, lv 3)
- Telekinetic Movement (move object/creature, lv 3)
- Telekinetic Adept (3 new abilities, lv 7)
- Guarded Mind (resistance to psychic + immunity to frightened while psi die in pool, lv 10)
- etc.

### Rune Knight rune data (`runeData.ts`)
Need 6 rune entries each with: name, passive bonus, activated effect, activation type, recharge:
- Cloud Rune, Stone Rune, Hill Rune, Fire Rune, Frost Rune, Storm Rune

### Artificer infusion definitions (`infusionData.ts`)
`char.artificerInfusions` and `char.activeArtificerInfusions` track infusion IDs but no data
file defines each infusion's name, item type requirement, and mechanical effect
(e.g. "Returning Weapon: weapon returns immediately after being thrown; +1 attack/damage").

---

## Character type fields that don't exist yet

### Totem Warrior sub-choice (`char.chosenTotem`)
Totem Warrior needs `chosenTotem?: 'bear' | 'eagle' | 'wolf'` on `Character` plus
a selection UI in character creation or the features panel. The current subclass selection
flow has no mechanism for within-subclass choices.
Once the field exists, conditions while raging become straightforward:
- Bear → "Resistance: all damage except psychic"
- Eagle → "OA attacks against you have disadvantage"
- Wolf → "Your allies have advantage on melee attacks vs. creatures adjacent to you"

### Pact Boon spells/weapon (`pactBoon` field exists, but wiring doesn't)
`char.pactBoon` stores 'blade' | 'chain' | 'tome'. Still needed:
- Blade: summon pact weapon to `char.weapons` with CHA mod handling (hexWarriorWeaponId pattern)
- Tome: add 3 user-chosen cross-class cantrips to `char.spellIds`
- Chain: display familiar type in features panel

---

## Architecture gaps (no turn/encounter state model)

### War Magic — Eldritch Knight (lv 7 / lv 18)
"After casting a cantrip, make a weapon attack as a bonus action" requires tracking
whether a cantrip was cast this turn. The character sheet has no turn-state model.
Until a `turnState` system exists, this can only be shown as a static description.

### Cavalier — Unwavering Mark (lv 3)
Requires tracking which enemy is marked and whether it attacked someone other than you.
Needs encounter/combat state. Not feasible without a combat tracker module.

### Divine Strike — Cleric (lv 8 / lv 14)
"Once per turn" toggle needs turn-state. Can be shown as a Special Attack note
("+1d8 [type] damage once per turn on weapon hit") without turn-enforcement.
Implement as display-only until turn state exists.

### Metamagic — Sorcerer (lv 3)
Wiring Quickened/Twinned/etc. mechanically requires an active-spell-casting flow state.
Currently shown as a Free action with description only. Full wiring blocked.

---

## Display component wiring needed

### Paladin — Aura of Protection (lv 6)
"+CHA mod (min +1) to all saving throws for you and allies within 10ft" needs to appear
next to each saving throw in VitalsPanel or AbilitiesPanel. The saving throw display
component has not been read yet — locate it and add the conditional `+[CHA mod] (Aura)` note.

### Bladesong — concentration saves / Acrobatics advantage
AC (+INT mod) and speed (+10ft) are already wired in `charCalculations.ts`.
Still missing:
- Advantage on Acrobatics checks (no proficiency/advantage system for skills exists in the sheet yet)
- +INT mod to Constitution saves for concentration (saving throw display, same gap as Aura of Protection)
