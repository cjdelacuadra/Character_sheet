# Subclass Feature Audit

Status legend:
- ✅ Mechanically implemented — the feature changes computed stats or enables tracked actions
- 🟡 Display only — shown in FeaturesPanel / ActionDetailPanel but not reflected in calculations
- ❌ Missing — feature not surfaced in the UI at all

---

## Barbarian

| Subclass | Key Features | Status |
|---|---|---|
| Path of the Berserker | Frenzy (bonus attack while raging) | 🟡 display only |
| Path of the Totem Warrior | Totem spirit bonuses (Bear/Eagle/Wolf) | 🟡 display only |
| Path of the Ancestral Guardian | Ancestral Protectors (hinder attackers) | ❌ missing |
| Path of the Storm Herald | Elemental aura (Storm Aura) | ❌ missing |
| Path of the Zealot | Divine Fury bonus damage while raging | 🟡 display only |
| Path of the Beast | Natural weapons (claw/bite/tail) while raging | ❌ missing |
| Path of Wild Magic | Wild Magic Surge table on rage | ❌ missing |
| Path of the Battlerager | Spiked armor + bonus action grapple damage | ❌ missing |

---

## Bard

| Subclass | Key Features | Status |
|---|---|---|
| College of Lore | Cutting Words (reaction, Bardic Inspiration die) | 🟡 display only |
| College of Valor | Combat Inspiration (ally uses BI on attack/damage/AC) | 🟡 display only |
| College of Glamour | Mantle of Inspiration (BI grants movement + temp HP) | ❌ missing |
| College of Swords | Blade Flourish (BI powers on weapon attack) | ❌ missing |
| College of Whispers | Psychic Blades (BI die bonus psychic on hit) | ❌ missing |
| College of Creation | Note of Potential (BI die varies by use) | ❌ missing |
| College of Eloquence | Unsettling Words (BI reduces target save) | ❌ missing |

---

## Cleric

| Subclass | Key Features | Status |
|---|---|---|
| Life Domain | Disciple of Life (+bonus healing), Channel: Preserve Life | ✅ Channel Divinity shown; armor prof applied |
| Light Domain | Warding Flare, Channel: Radiance of the Dawn | 🟡 Channel Divinity shown |
| Trickery Domain | Blessing of the Trickster, Channel: Invoke Duplicity | 🟡 Channel Divinity shown |
| Knowledge Domain | Blessings of Knowledge, Channel: Knowledge of the Ages | 🟡 Channel Divinity shown |
| Nature Domain | Acolyte of Nature, Channel: Charm Animals and Plants | ✅ armor prof applied; 🟡 feature display only |
| Tempest Domain | Wrath of the Storm, Channel: Destructive Wrath | ✅ armor prof applied; 🟡 Channel display only |
| War Domain | War Priest (bonus attack action), Channel: Guided Strike | ✅ armor prof applied; 🟡 feature display only |
| Death Domain | Reaper cantrip, Channel: Touch of Death | ✅ armor prof applied; 🟡 feature display only |
| Arcana Domain | Arcane Initiate (Wizard cantrips), Channel: Arcane Abjuration | 🟡 display only |
| Forge Domain | Blessing of the Forge, Channel: Artisan's Blessing | ✅ armor prof applied; 🟡 feature display only |
| Grave Domain | Circle of Mortality, Channel: Path to the Grave | 🟡 display only |
| Order Domain | Voice of Authority, Channel: Order's Demand | ✅ armor prof applied; 🟡 feature display only |
| Peace Domain | Emboldening Bond | ❌ missing |
| Twilight Domain | Eyes of Night, Channel: Twilight Sanctuary | ✅ armor prof applied; 🟡 feature display only |

---

## Druid

| Subclass | Key Features | Status |
|---|---|---|
| Circle of the Land | Natural Recovery (spell slot recovery on short rest) | 🟡 display only |
| Circle of the Moon | Enhanced Wild Shape (higher CR beasts) | 🟡 display only |
| Circle of Dreams | Balm of the Summer Court (bonus action healing) | ❌ missing |
| Circle of the Shepherd | Spirit Totem (bonus action aura) | ❌ missing |
| Circle of Spores | Halo of Spores (reaction necrotic damage) | ❌ missing |
| Circle of Stars | Star Map (bonus spell access), Star Forms for Wild Shape | ❌ missing |
| Circle of Wildfire | Wildfire Spirit (bonus action summon) | ❌ missing |

---

## Fighter

| Subclass | Key Features | Status |
|---|---|---|
| Champion | Improved Critical (19–20), Remarkable Athlete (+half prof to STR/DEX/CON checks incl. initiative) | ✅ Initiative bonus implemented; 🟡 crit range display only |
| Battle Master | Superiority Dice, 9 maneuvers, Maneuver save DC | ✅ Fully implemented — picker, usage tracking, DC display |
| Eldritch Knight | Spellcasting (Wizard), Weapon Bond | 🟡 display only |
| Arcane Archer | Arcane Shots (2/short rest, 8 options) | ✅ Fully implemented — picker, usage tracking |
| Cavalier | Unwavering Mark (mark enemy, bonus attack on their attack) | ❌ missing |
| Samurai | Fighting Spirit (3/long rest, advantage + temp HP) | ✅ Implemented — bonus action, usage tracking, feature entry |
| Psi Warrior | Psionic Energy Dice (telekinesis, defense) | ❌ missing |
| Rune Knight | Rune Carving (4 rune options, bonus action giant size) | ❌ missing |
| Echo Knight | Manifest Echo (second attack point, swap) | ❌ missing |

---

## Monk

| Subclass | Key Features | Status |
|---|---|---|
| Way of the Open Hand | Open Hand Technique (post-Flurry effects) | 🟡 display only |
| Way of Shadow | Shadow Arts spells (Darkness etc.) | 🟡 display only |
| Way of the Four Elements | Elemental Disciplines (Ki spells) | 🟡 display only |
| Way of the Sun Soul | Radiant Sun Bolt (ranged Ki attack) | ❌ missing |
| Way of the Drunken Master | Drunken Technique (free Disengage on Flurry) | 🟡 display only |
| Way of the Kensei | Kensei's Shot, Agile Parry | ❌ missing |
| Way of Mercy | Hand of Healing / Hand of Harm | ❌ missing |
| Way of the Astral Self | Arms of the Astral Self (Ki-powered manifestation) | ❌ missing |

---

## Paladin

| Subclass | Key Features | Status |
|---|---|---|
| Oath of Devotion | Sacred Weapon (Channel), Turn the Unholy | 🟡 Channel Divinity shown |
| Oath of the Ancients | Nature's Wrath, Turn the Faithless | 🟡 Channel Divinity shown |
| Oath of Vengeance | Vow of Enmity (advantage), Abjure Enemy | 🟡 Channel Divinity shown |
| Oath of Conquest | Conquering Presence, Guided Strike | 🟡 Channel Divinity shown |
| Oath of Redemption | Emissary of Peace, Rebuke the Violent | 🟡 display only |
| Oath of Glory | Inspiring Smite, Peerless Athlete | 🟡 display only |
| Oath of the Watchers | Abjure the Extraplanar | 🟡 display only |
| Oathbreaker | Animate Dead (Channel), Aura of Hate | 🟡 display only |

---

## Ranger

| Subclass | Key Features | Status |
|---|---|---|
| Hunter | Hunter's Prey (Colossus Slayer, etc.) | 🟡 display only |
| Beast Master | Ranger's Companion (beast) | ❌ missing |
| Gloom Stalker | Dread Ambusher (bonus attack on first round), darkvision, initiative bonus | 🟡 display only |
| Horizon Walker | Planar Warrior (bonus radiant damage) | ❌ missing |
| Monster Slayer | Hunter's Sense, Slayer's Prey | ❌ missing |
| Fey Wanderer | Otherworldly Glamour (+CHA to INT/WIS/CHA) | ❌ missing |
| Swarmkeeper | Gathered Swarm (reaction push/pull/damage) | ❌ missing |
| Drakewarden | Drake Companion | ❌ missing |

---

## Rogue

| Subclass | Key Features | Status |
|---|---|---|
| Thief | Fast Hands, Use Magic Device | 🟡 display only |
| Assassin | Assassinate (auto-crit on surprised) | 🟡 display only |
| Arcane Trickster | Mage Hand Legerdemain + Wizard spells | 🟡 display only |
| Inquisitive | Ear for Deceit, Eye for Detail | 🟡 display only |
| Mastermind | Master of Tactics (Help as bonus at range) | 🟡 display only |
| Scout | Skirmisher, Survivalist | 🟡 display only |
| Swashbuckler | Fancy Footwork, Rakish Audacity | 🟡 display only |
| Phantom | Wails from the Grave (bonus necrotic on Sneak Attack) | ❌ missing |
| Soulknife | Psychic Blades (weapon attacks), Psi-Bolstered Knack | ❌ missing |

---

## Sorcerer

| Subclass | Key Features | Status |
|---|---|---|
| Draconic Bloodline | 13 + DEX unarmored AC, +1 HP/level | ✅ Unarmored AC formula applied |
| Wild Magic | Wild Magic Surge (random spell effects) | 🟡 display only |
| Divine Soul | Cleric spell access | 🟡 display only |
| Shadow Magic | Eyes of the Dark (Darkness with SP), Strength of the Grave | 🟡 display only |
| Storm Sorcery | Wind Speaker, Tempestuous Magic (fly after spell) | 🟡 display only |
| Aberrant Mind | Telepathic Speech, expanded spell list | 🟡 display only |
| Clockwork Soul | Restore Balance (cancel adv/disadv), expanded spells | 🟡 display only |

---

## Warlock

| Subclass | Key Features | Status |
|---|---|---|
| The Archfey | Fey Presence (charm/frighten), Misty Escape (reaction teleport) | 🟡 display only |
| The Fiend | Dark One's Blessing (temp HP on kill), expanded spells | 🟡 display only |
| The Great Old One | Telepathy, Awakened Mind | 🟡 display only |
| The Celestial | Healing Light (bonus action heal dice) | 🟡 display only |
| The Hexblade | Hexblade's Curse, Hex Warrior (CHA to weapon attacks) | 🟡 display only |
| The Fathomless | Tentacle of the Deeps, Gift of the Sea | ❌ missing |
| The Genie | Genie's Vessel (extra-dimensional space) | ❌ missing |
| The Undead | Form of Dread (frighten + temp HP) | ❌ missing |

---

## Wizard

| Subclass | Key Features | Status |
|---|---|---|
| School of Abjuration | Arcane Ward (damage shield) | ❌ missing |
| School of Conjuration | Benign Transposition (teleport summons) | 🟡 display only |
| School of Divination | Portent (replace d20 rolls with rolled dice) | ❌ missing |
| School of Enchantment | Hypnotic Gaze (incapacitate adjacent) | 🟡 display only |
| School of Evocation | Sculpt Spells (protect allies in AoE) | 🟡 display only |
| School of Illusion | Improved Minor Illusion (image + sound) | 🟡 display only |
| School of Necromancy | Grim Harvest (HP on spell kill) | ❌ missing |
| School of Transmutation | Transmuter's Stone (passive benefits) | ❌ missing |
| Bladesinging | Bladesong (AC = INT mod + 10, +speed) | ❌ missing |
| Order of Scribes | Awakened Spellbook (change damage type) | ❌ missing |
| Chronurgy Magic | Chronal Shift (reroll d20) | ❌ missing |
| Graviturgy Magic | Adjust Density (speed/weight effects) | ❌ missing |
| War Magic | Arcane Deflection (+reaction to AC/saves) | ❌ missing |

---

## Artificer

| Subclass | Key Features | Status |
|---|---|---|
| Alchemist | Experimental Elixir (random beneficial potion) | ❌ missing |
| Armorer | Armor Model (Guardian / Infiltrator modes) | ❌ missing |
| Artillerist | Eldritch Cannon (force/fire/necrotic) | ❌ missing |
| Battle Smith | Steel Defender (construct companion), INT weapon attacks | ❌ missing |

---

## Summary

| Status | Count |
|---|---|
| ✅ Mechanically implemented | ~12 |
| 🟡 Display only | ~55 |
| ❌ Missing | ~40 |

Priority for next implementation pass: Fighter subclasses with tracked actions (Cavalier mark, Psi Warrior dice), then high-impact Cleric/Paladin Channel Divinity mechanical effects.
