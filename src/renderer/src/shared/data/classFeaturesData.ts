import type { Effect } from '@/domain/effects'

export interface FeatureEntry {
  level: number
  name: string
  desc: string
  effects?: Effect[]
}

export const CLASS_FEATURES_DATA: Record<string, FeatureEntry[]> = {
  Fighter: [
    { level: 1, name: 'Fighting Style', desc: 'Adopt a particular style of fighting. +2 to a roll type based on style chosen.' },
    { level: 1, name: 'Second Wind', desc: 'Bonus action: regain 1d10 + fighter level HP. Recharges on short or long rest.' },
    { level: 2, name: 'Action Surge', desc: 'Take one additional action this turn. Recharges on short or long rest.' },
    { level: 3, name: 'Martial Archetype', desc: 'Choose your subclass.' },
    { level: 4, name: 'ASI', desc: 'Increase one ability score by 2, or two scores by 1. Max 20.' },
    { level: 5, name: 'Extra Attack', desc: 'Attack twice when you take the Attack action.' },
    { level: 6, name: 'ASI', desc: 'Increase one ability score by 2, or two scores by 1. Max 20.' },
    { level: 9, name: 'Indomitable', desc: 'Reroll a failed saving throw. You must use the new roll. Can use 1/long rest (2 at level 13, 3 at level 17).' },
    { level: 11, name: 'Extra Attack (2)', desc: 'Attack three times when you take the Attack action.' },
  ],
  Wizard: [
    { level: 1, name: 'Arcane Recovery', desc: 'Short rest: recover spell slots with total level ≤ ½ wizard level (rounded up).' },
    { level: 1, name: 'Spellbook', desc: 'Your spellbook contains 6 1st-level spells to start. Copy additional spells by spending 2 hours and 50gp per spell level.' },
    { level: 2, name: 'Arcane Tradition', desc: 'Choose your subclass.' },
    { level: 4, name: 'ASI', desc: 'Increase one ability score by 2, or two scores by 1. Max 20.' },
    { level: 5, name: 'Third-level Spells', desc: 'Access to 3rd-level spell slots.' },
    { level: 18, name: 'Spell Mastery', desc: 'Choose a 1st- and 2nd-level spell. Cast them at their lowest level without using a slot.' },
  ],
  Rogue: [
    { level: 1, name: 'Expertise', desc: 'Double proficiency bonus on 2 chosen skills.' },
    { level: 1, name: 'Sneak Attack', desc: 'Once per turn, deal extra damage when attacking with advantage or an ally is adjacent to target.' },
    { level: 1, name: "Thieves' Cant", desc: 'Secret language and signs used by rogues.' },
    { level: 2, name: 'Cunning Action', desc: 'Bonus action: Dash, Disengage, or Hide.' },
    { level: 3, name: 'Roguish Archetype', desc: 'Choose your subclass.' },
    { level: 5, name: 'Uncanny Dodge', desc: 'Reaction: halve damage from an attack you can see.' },
    { level: 7, name: 'Evasion', desc: 'When you succeed on a Dex save for half damage, you instead take no damage. On a failed save, half damage.' },
    { level: 11, name: 'Reliable Talent', desc: 'Treat any roll of 9 or lower as a 10 on skill checks you are proficient in.' },
  ],
  Barbarian: [
    { level: 1, name: 'Rage', desc: 'Bonus action: rage for 1 min. +damage, advantage on Str checks/saves, resistance to B/P/S damage.' },
    { level: 1, name: 'Unarmored Defense', desc: 'Without armor, AC = 10 + Dex mod + Con mod.' },
    { level: 2, name: 'Reckless Attack', desc: 'Advantage on first Str attack roll this turn, but attacks against you have advantage until next turn.' },
    { level: 2, name: 'Danger Sense', desc: 'Advantage on Dex saving throws against effects you can see (not blinded/deafened/incapacitated).' },
    { level: 3, name: 'Primal Path', desc: 'Choose your subclass.' },
    { level: 5, name: 'Extra Attack', desc: 'Attack twice when you take the Attack action.' },
    { level: 7, name: 'Feral Instinct', desc: 'Advantage on Initiative rolls. If surprised at start of combat, you can act normally on your first turn if you enter rage before doing anything else.' },
    { level: 9, name: 'Brutal Critical', desc: 'Roll one additional weapon damage die when scoring a critical hit. (Two at 13th, three at 17th.)' },
  ],
  Cleric: [
    { level: 1, name: 'Divine Domain', desc: 'Choose your subclass (domain).' },
    { level: 2, name: 'Channel Divinity (1/rest)', desc: 'Use a special divine effect (varies by domain).' },
    { level: 2, name: 'Turn Undead', desc: 'Channel Divinity: Wis save DC 8+Prof+Wis vs undead. On fail, undead flees for 1 min.' },
    { level: 5, name: 'Destroy Undead', desc: 'On a failed Turn Undead, undead of CR ½ or lower is destroyed.' },
    { level: 10, name: 'Divine Intervention', desc: 'Call on your deity for aid once per long rest. Roll d100 ≤ your cleric level to succeed.' },
  ],
  Paladin: [
    { level: 1, name: 'Divine Sense', desc: 'Action: detect celestials, fiends, undead within 60ft. Uses = 1 + Cha mod / LR.' },
    { level: 1, name: 'Lay on Hands', desc: 'Touch: restore HP from pool of 5×paladin level per LR. 5 HP to cure disease/poison.' },
    { level: 2, name: 'Fighting Style', desc: 'Adopt a particular style of fighting.' },
    { level: 2, name: 'Divine Smite', desc: 'On hit: expend spell slot for 2d8 + 1d8/slot level above 1st radiant damage.' },
    { level: 3, name: 'Sacred Oath', desc: 'Choose your subclass.' },
    { level: 5, name: 'Extra Attack', desc: 'Attack twice when you take the Attack action.' },
    { level: 6, name: 'Aura of Protection', desc: 'You and friendly creatures within 10ft add your Cha modifier (min +1) to saving throws.' },
  ],
  Ranger: [
    { level: 1, name: 'Favored Enemy', desc: 'Advantage on Survival to track and Int checks to recall info about your chosen enemy type.' },
    { level: 1, name: 'Natural Explorer', desc: 'Expertise in one terrain type. No difficult terrain penalty. Double foraging yields.' },
    { level: 2, name: 'Fighting Style', desc: 'Adopt a particular style of fighting.' },
    { level: 3, name: 'Ranger Archetype', desc: 'Choose your subclass.' },
    { level: 5, name: 'Extra Attack', desc: 'Attack twice when you take the Attack action.' },
    { level: 8, name: "Land's Stride", desc: 'Moving through nonmagical difficult terrain costs no extra movement.' },
  ],
  Bard: [
    { level: 1, name: 'Bardic Inspiration', desc: 'Bonus action: give ally a d6 inspiration die to add to one roll. Uses = Cha mod / LR.' },
    { level: 2, name: 'Jack of All Trades', desc: 'Add half proficiency bonus (rounded down) to any non-proficient ability check.' },
    { level: 2, name: 'Song of Rest', desc: 'During short rest, ally expending HD regains extra HP (d6 at level 2).' },
    { level: 3, name: 'Bard College', desc: 'Choose your subclass.' },
    { level: 3, name: 'Expertise', desc: 'Double proficiency bonus on 2 chosen skills.' },
    { level: 5, name: 'Font of Inspiration', desc: 'Regain Bardic Inspiration on short or long rest.' },
    { level: 6, name: 'Countercharm', desc: 'Action: start a performance that grants friendly creatures within 30ft advantage on saves against being frightened or charmed.' },
  ],
  Druid: [
    { level: 1, name: 'Druidic', desc: 'Secret language of druids.' },
    { level: 2, name: 'Wild Shape', desc: "Action: transform into a beast you've seen. CR ≤ ¼ at level 2, CR ≤ ½ at level 4. 2 uses / SR." },
    { level: 2, name: 'Druid Circle', desc: 'Choose your subclass.' },
    { level: 18, name: 'Timeless Body', desc: 'For every 10 years that pass, your body ages only 1 year.' },
    { level: 20, name: 'Beast Spells', desc: 'You can cast druid spells while in Wild Shape form.' },
  ],
  Monk: [
    { level: 1, name: 'Unarmored Defense', desc: 'Without armor, AC = 10 + Dex mod + Wis mod.' },
    { level: 1, name: 'Martial Arts', desc: 'Use Dex for unarmed strikes. Use d4 as unarmed damage (scales with level).' },
    { level: 2, name: 'Ki', desc: 'Ki points = monk level. Recover on short rest.' },
    { level: 2, name: 'Flurry of Blows', desc: '1 Ki: After Attack action, make 2 unarmed strikes as bonus action.' },
    { level: 2, name: 'Patient Defense', desc: '1 Ki: Take Dodge as bonus action.' },
    { level: 2, name: 'Step of the Wind', desc: '1 Ki: Disengage or Dash as bonus action. Jump distance doubled.' },
    { level: 3, name: 'Monastic Tradition', desc: 'Choose your subclass.' },
    { level: 5, name: 'Stunning Strike', desc: '1 Ki: Con save DC 8+Prof+Wis on hit. On fail: stunned until your next turn.' },
  ],
  Sorcerer: [
    { level: 1, name: 'Sorcerous Origin', desc: 'Choose your subclass.' },
    { level: 2, name: 'Font of Magic', desc: 'Sorcery points = sorcerer level. Convert to spell slots or spend on Metamagic.' },
    { level: 3, name: 'Metamagic', desc: 'Choose 2 options to modify spells (Careful, Distant, Empowered, Extended, Heightened, Quickened, Subtle, Twinned).' },
  ],
  Warlock: [
    { level: 1, name: 'Otherworldly Patron', desc: 'Choose your subclass.' },
    { level: 2, name: 'Eldritch Invocations', desc: 'Choose 2 invocations to augment your abilities.' },
    { level: 3, name: 'Pact Boon', desc: 'Pact of the Blade / Chain / Tome.' },
    { level: 5, name: '3rd-level Pact Slots', desc: 'Pact magic slots are now 3rd level.' },
    { level: 10, name: 'Mystic Arcanum', desc: 'Choose a 6th-level spell. Cast it once per long rest without using a spell slot.' },
  ],
  Artificer: [
    { level: 1, name: 'Magical Tinkering', desc: 'Imbue a Tiny nonmagical object with one of several minor magical properties (light, message, recorded sound, image). Active objects = INT mod (min 1).' },
    { level: 1, name: 'Spellcasting', desc: 'Cast Artificer spells using INT. You always have your tools available as a spellcasting focus.' },
    { level: 2, name: 'Infuse Item', desc: 'Imbue mundane items with magical infusions. Known infusions and active infusions scale with level. Recharge on a long rest by replacing infusions.' },
    { level: 3, name: 'The Right Tool for the Job', desc: 'Spend 1 hour with tinker’s tools to magically conjure a set of artisan’s tools you don’t possess. The tools last until you use this feature again or until your next long rest.' },
    { level: 3, name: 'Artificer Specialty', desc: 'Choose your subclass: Alchemist, Armorer, Artillerist, or Battle Smith.' },
    { level: 6, name: 'Tool Expertise', desc: 'Your proficiency bonus is doubled for any ability check you make that uses any of the tool proficiencies you have.' },
    { level: 7, name: 'Flash of Genius', desc: 'When a creature you can see within 30 ft (including yourself) makes an ability check or saving throw, use your reaction to add your INT modifier to the roll. Uses = INT mod (min 1) per long rest.' },
    { level: 10, name: 'Magic Item Adept', desc: 'You can attune to up to four magic items at once. Crafting common/uncommon magic items takes a quarter of the normal time and costs half the gold.' },
    { level: 11, name: 'Spell-Storing Item', desc: 'After a long rest, store a 1st- or 2nd-level Artificer spell with a casting time of 1 action into an item. Any creature holding the item can cast that spell using your stats up to 2× INT mod times.' },
    { level: 14, name: 'Magic Item Savant', desc: 'You can attune to up to five magic items at once. Ignore all class, race, spell, and level requirements on attuning to or using magic items.' },
    { level: 18, name: 'Magic Item Master', desc: 'You can attune to up to six magic items at once.' },
    { level: 20, name: 'Soul of Artifice', desc: '+1 to all saving throws per magic item you are attuned to. When reduced to 0 HP, you can use your reaction to end one infusion you’re benefitting from to drop to 1 HP instead.' },
  ],

  // --- Final Fantasy XIV (FFXIV) — Warrior (Chapter 2) ---
  Warrior: [
    { level: 1, name: 'Berserk', desc: 'As a bonus action, enter a berserk trance for 1 minute (if not wearing heavy armor): advantage on STR checks/saves; melee STR attacks deal bonus damage equal to your Brutality Die (d4→d10 by level); resistance to bludgeoning/piercing/slashing. Uses per long rest scale 2→6 (Berserk resource). Berserk DC = 8 + prof + STR mod. Ends if you don\'t attack or take damage on your turn.' },
    { level: 1, name: 'Unarmored Defense', desc: 'While wearing no armor, your AC equals 10 + DEX modifier + CON modifier. You can use a shield and still gain this benefit.' },
    { level: 2, name: 'Fighting Style', desc: 'Adopt a fighting style: Defense (+1 AC in armor), Dueling (+2 damage with a one-handed melee weapon and no other weapons), Great Weapon Fighting (reroll 1s and 2s on two-handed melee damage), or Two-Weapon Fighting (add ability modifier to the second attack\'s damage).' },
    { level: 2, name: 'Reckless Attack', desc: 'On your first attack of your turn, you can attack recklessly: gain advantage on melee STR attack rolls this turn, but attacks against you have advantage until your next turn.' },
    { level: 3, name: 'Bestial Archetype', desc: 'Choose your inner-beast path: Beast of Defiance, Beast of Deliverance, or Unchained Beast. Grants features at 3rd, 6th, 10th, and 14th level.' },
    { level: 5, name: 'Extra Attack', desc: 'You can attack twice, instead of once, whenever you take the Attack action on your turn.' },
    { level: 7, name: 'Onslaught', desc: 'When you take the Dash action, you may make a melee weapon attack as a bonus action. This attack deals bonus damage equal to your CON modifier.' },
    { level: 7, name: 'Tongue of Beasts', desc: 'You can cast Speak with Animals once; the use refreshes when you finish a long rest.' },
    { level: 9, name: 'Raw Intuition', desc: 'When you take damage, as a reaction you may move 5 ft away from the source (no opportunity attacks) and reduce the damage by your Brutality Die + proficiency bonus. Usable once per long rest; twice at 13th, three times at 18th.' },
    { level: 11, name: 'Overpower', desc: 'As an action, slam the ground: each creature within 10 ft makes a STR save vs your Berserk DC or takes thunder damage equal to your Brutality Die + STR mod + CON mod and is knocked prone (half and not prone on a success).' },
    { level: 13, name: 'Vengeance', desc: 'When you take damage from a creature within 5 ft, use your reaction to make a melee weapon attack against it.' },
    { level: 15, name: 'Shake It Off', desc: 'While berserking, when you make a save to resist a status condition (except Exhaustion, Incapacitated, Prone, Restrained, Unconscious) you may end Berserk to automatically succeed — decided after the roll, before the outcome is declared.' },
    { level: 17, name: 'Beastly Reflexes', desc: 'While under the effect of Berserk, you can make two reactions per round.' },
    { level: 18, name: 'Holmgang', desc: 'As a bonus action, or as a reaction when a creature damages you: until the end of your third turn after, you can\'t drop below 1 HP. Used as a bonus action, a 15-ft-radius ring of fire forms between you and a target within 30 ft; crossing it requires a WIS save vs your Berserk DC or take 4d8 fire and stop. Once per long rest.' },
    { level: 20, name: 'Infuriate', desc: 'If you have no uses of Berserk left when you roll initiative, you instantly recover 2 uses of Berserk.' },
  ],

  // --- Final Fantasy XIV (FFXIV) — Scholar (Chapter 2). Full caster (INT, prepared) + pet. ---
  Scholar: [
    { level: 1, name: 'Spellcasting', desc: 'You cast Scholar spells using Intelligence. You have a spellbook of six 1st-level spells to start; prepare INT modifier + Scholar level spells after a long rest. Spell save DC = 8 + prof + INT mod. You use a grimoire as your arcane focus and can cast prepared spells with the ritual tag as rituals.' },
    { level: 1, name: 'Tactics', desc: 'You have battle tactics usable a number of times equal to your proficiency bonus, recovered on a short or long rest (Tactics resource). Memorize a number of tactics equal to your INT modifier (min 1) from the Tactics list; change them on a long rest. Some tactics have level/specialization requirements.' },
    { level: 2, name: 'Scholar Specialization', desc: 'Choose a specialization — Arcanist, Nymian, or Tactician — granting features at 2nd, 6th, 10th, and 14th level.' },
    { level: 2, name: 'Aetherial Ally', desc: 'You summon an aetherial ally (a Carbuncle or a Nymian Fey) after a long rest; it obeys your commands and acts on your turn (Dodge unless you spend a bonus action, or sacrifice an attack, to command another action). If reduced to 0 HP its body lingers 1 minute; touch it and expend a 1st-level+ slot to revive it after 1 minute. You may summon a different ally on a long rest.' },
    { level: 5, name: 'Aetherial Ally Improvement', desc: 'Your aetherial ally scales with your Scholar level (its HP, PB, and attack bonuses use your stats). See the Carbuncle / Nymian Fey stat blocks.' },
    { level: 18, name: 'Quicksilver Summoning', desc: 'As an action, summon an aetherial ally. Usable once; recovers on a long rest.' },
    { level: 20, name: 'Grand Design', desc: 'When you roll initiative, you recover half of your expended Tactics uses.' },
  ],
}

export function getClassFeatures(classId: string, level: number): FeatureEntry[] {
  return (CLASS_FEATURES_DATA[classId] ?? []).filter(f => f.level <= level)
}
