import type { AbilityScore, AbilityScores } from '@/entities/character/types'

export interface RaceDef {
  id: string
  label: string
  speed: number
  /** bonus applied to ability scores at creation */
  abilityBonus: Partial<AbilityScores>
  /** darkvision, etc. — informational */
  traits: string[]
  /**
   * natural AC formula. null = no natural armor.
   * A function so it can use ability scores.
   */
  naturalAC?: (scores: AbilityScores) => number
  size: 'small' | 'medium'
  /** weapon names granted as bonus proficiencies (e.g. Hill Dwarf, High Elf) */
  bonusWeaponProficiencies?: string[]
  /** extra HP per character level (e.g. Hill Dwarf Dwarven Toughness: 1) */
  bonusHpPerLevel?: number
  /** number of free +1 ability point assignments the player picks (2 for Variant Human) */
  freeAbilityPoints?: number
  /** race grants one free feat at character creation (Variant Human) */
  freeFeat?: boolean
  /** spell IDs granted automatically at each character level */
  racialSpells?: Partial<Record<number, string[]>>
  /** Darkvision range in feet (0 if none) */
  darkvisionRange?: number
}

export const RACES: RaceDef[] = [
  {
    id: 'Human',
    label: 'Human',
    speed: 30,
    abilityBonus: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    traits: ['Extra Language', '+1 to all ability scores'],
    size: 'medium',
    darkvisionRange: 0,
  },
  {
    id: 'VariantHuman',
    label: 'Human (Variant)',
    speed: 30,
    abilityBonus: {},
    freeAbilityPoints: 2,
    freeFeat: true,
    traits: ['+1 to two different ability scores of your choice', 'One skill proficiency of choice', 'One feat of choice'],
    size: 'medium',
    darkvisionRange: 0,
  },
  {
    id: 'Elf',
    label: 'Elf (High)',
    speed: 30,
    abilityBonus: { dex: 2, int: 1 },
    traits: ['Darkvision 60ft', 'Keen Senses (Perception proficiency)', 'Fey Ancestry (advantage vs charm, immune sleep)', 'Trance (4h rest instead of 8h)'],
    size: 'medium',
    bonusWeaponProficiencies: ['Longsword', 'Shortsword', 'Shortbow', 'Longbow'],
    darkvisionRange: 60,
  },
  {
    id: 'WoodElf',
    label: 'Elf (Wood)',
    speed: 35,
    abilityBonus: { dex: 2, wis: 1 },
    traits: ['Darkvision 60ft', 'Keen Senses', 'Fey Ancestry', 'Fleet of Foot (35ft speed)', 'Mask of the Wild'],
    size: 'medium',
    darkvisionRange: 60,
  },
  {
    id: 'Dwarf',
    label: 'Dwarf (Hill)',
    speed: 25,
    abilityBonus: { con: 2, wis: 1 },
    traits: ['Darkvision 60ft', 'Dwarven Resilience (advantage on poison saves, resistance to poison damage)', 'Stonecunning', 'Dwarven Toughness (+1 HP/level)'],
    size: 'medium',
    bonusHpPerLevel: 1,
    bonusWeaponProficiencies: ['Battleaxe', 'Handaxe', 'Light Hammer', 'Warhammer'],
    darkvisionRange: 60,
  },
  {
    id: 'MountainDwarf',
    label: 'Dwarf (Mountain)',
    speed: 25,
    abilityBonus: { str: 2, con: 2 },
    traits: ['Darkvision 60ft', 'Dwarven Resilience', 'Stonecunning', 'Armor proficiency (light, medium)'],
    size: 'medium',
    darkvisionRange: 60,
  },
  {
    id: 'Halfling',
    label: 'Halfling (Lightfoot)',
    speed: 25,
    abilityBonus: { dex: 2, cha: 1 },
    traits: ['Lucky (reroll 1s on attack/check/save)', 'Brave (advantage vs frightened)', 'Halfling Nimbleness (move through larger creatures)', 'Naturally Stealthy'],
    size: 'small',
    darkvisionRange: 0,
  },
  {
    id: 'HalfElf',
    label: 'Half-Elf',
    speed: 30,
    abilityBonus: { cha: 2 },
    freeAbilityPoints: 2,
    traits: ['Darkvision 60ft', 'Fey Ancestry', 'Skill Versatility (+2 skill proficiencies of choice)'],
    size: 'medium',
    darkvisionRange: 60,
  },
  {
    id: 'HalfOrc',
    label: 'Half-Orc',
    speed: 30,
    abilityBonus: { str: 2, con: 1 },
    traits: ['Darkvision 60ft', 'Menacing (Intimidation proficiency)', 'Relentless Endurance (drop to 1 HP instead of 0, 1/LR)', 'Savage Attacks (extra crit die)'],
    size: 'medium',
    darkvisionRange: 60,
  },
  {
    id: 'Gnome',
    label: 'Gnome (Forest)',
    speed: 25,
    abilityBonus: { int: 2, dex: 1 },
    traits: ['Darkvision 60ft', 'Gnome Cunning (advantage INT/WIS/CHA saves vs magic)', 'Natural Illusionist', 'Speak with Small Beasts'],
    size: 'small',
    racialSpells: { 1: ['minor-illusion'] },
    darkvisionRange: 60,
  },
  {
    id: 'Tiefling',
    label: 'Tiefling',
    speed: 30,
    abilityBonus: { int: 1, cha: 2 },
    traits: ['Darkvision 60ft', 'Hellish Resistance (fire resistance)', 'Infernal Legacy (Thaumaturgy cantrip; Hellish Rebuke/Darkness as spell)'],
    size: 'medium',
    racialSpells: { 1: ['thaumaturgy'], 3: ['hellish-rebuke'], 5: ['darkness'] },
    darkvisionRange: 60,
  },
  {
    id: 'Dragonborn',
    label: 'Dragonborn',
    speed: 30,
    abilityBonus: { str: 2, cha: 1 },
    traits: ['Draconic Ancestry (choose element)', 'Breath Weapon (Dex/Con save, 2d6 damage, scales)', 'Damage Resistance (chosen element)'],
    size: 'medium',
    darkvisionRange: 0,
  },
  {
    id: 'StoutHalfling',
    label: 'Halfling (Stout)',
    speed: 25,
    abilityBonus: { dex: 2, con: 1 },
    traits: ['Lucky (reroll 1s on attack/check/save)', 'Brave (advantage vs frightened)', 'Halfling Nimbleness', 'Stout Resilience (advantage vs poison saves, resistance to poison damage)'],
    size: 'small',
    darkvisionRange: 0,
  },
  {
    id: 'RockGnome',
    label: 'Gnome (Rock)',
    speed: 25,
    abilityBonus: { int: 2, con: 1 },
    traits: ['Darkvision 60ft', 'Gnome Cunning (advantage INT/WIS/CHA saves vs magic)', "Artificer's Lore (+2× prof bonus on History checks for magic/alchemical/technological items)", 'Tinker (construct tiny clockwork devices)'],
    size: 'small',
    darkvisionRange: 60,
  },
  {
    id: 'Drow',
    label: 'Elf (Drow)',
    speed: 30,
    abilityBonus: { dex: 2, cha: 1 },
    traits: ['Superior Darkvision 120ft', 'Keen Senses (Perception proficiency)', 'Fey Ancestry', 'Trance', 'Sunlight Sensitivity (disadvantage on attack/Perception in direct sunlight)', 'Drow Magic (Dancing Lights; Faerie Fire; Darkness as spells)'],
    size: 'medium',
    racialSpells: { 1: ['dancing-lights'], 3: ['faerie-fire'], 5: ['darkness'] },
    darkvisionRange: 120,
  },
  {
    id: 'Aasimar',
    label: 'Aasimar',
    speed: 30,
    abilityBonus: { wis: 1, cha: 2 },
    traits: ['Darkvision 60ft', 'Celestial Resistance (necrotic & radiant resistance)', 'Healing Hands (touch to heal HP equal to level, 1/LR)', 'Light Bearer (Light cantrip)'],
    size: 'medium',
    racialSpells: { 1: ['light'] },
    darkvisionRange: 60,
  },
  {
    id: 'Kenku',
    label: 'Kenku',
    speed: 30,
    abilityBonus: { dex: 2, wis: 1 },
    traits: ['Expert Forgery (duplicate written/crafted items with advantage)', 'Kenku Training (proficiency in 2 of: Acrobatics, Deception, Stealth, Sleight of Hand)', 'Mimicry (perfectly copy sounds heard; Insight/Investigation DC 14 to detect)'],
    size: 'medium',
    darkvisionRange: 0,
  },
  {
    id: 'Tabaxi',
    label: 'Tabaxi',
    speed: 30,
    abilityBonus: { dex: 2, cha: 1 },
    traits: ['Darkvision 60ft', "Cat's Claws (climb speed 20ft, 1d4 slashing unarmed strike)", 'Feline Agility (double speed until end of turn, then 0 speed until next turn)', "Cat's Talent (proficiency in Perception & Stealth)"],
    size: 'medium',
    darkvisionRange: 60,
  },
  {
    id: 'Lizardfolk',
    label: 'Lizardfolk',
    speed: 30,
    abilityBonus: { con: 2, wis: 1 },
    traits: ['Swim speed 30ft', 'Bite (1d6 piercing unarmed strike)', 'Cunning Artisan (craft items from creature remains during short rest)', 'Hold Breath (15 minutes)', "Hunter's Lore (proficiency in 2 of: Animal Handling, Nature, Perception, Stealth, Survival)", 'Natural Armor (AC = 13 + DEX mod when unarmored)'],
    naturalAC: (scores) => 13 + Math.floor((scores.dex - 10) / 2),
    size: 'medium',
    darkvisionRange: 0,
  },
  {
    id: 'Tortle',
    label: 'Tortle',
    speed: 30,
    abilityBonus: { str: 2, wis: 1 },
    traits: ['Swim speed 30ft', 'Claws (1d4 slashing unarmed strike)', 'Hold Breath (1 hour)', 'Natural Armor (AC 17, cannot use shields)', 'Shell Defense (withdraw into shell: +4 AC, advantage on STR/CON saves, disadvantage on DEX saves, prone, speed 0, no reactions, no actions except to emerge)'],
    naturalAC: () => 17,
    size: 'medium',
    darkvisionRange: 0,
  },
  {
    id: 'Warforged',
    label: 'Warforged',
    speed: 30,
    abilityBonus: { con: 2 },
    traits: ['Constructed Resilience (advantage vs poison saves, resistance to poison, immune to disease, no need to eat/drink/breathe, no magic sleep)', "Sentry's Rest (inactive but conscious during long rest)", 'Integrated Protection (AC = 11 + DEX mod + armor bonus, cannot be removed)', 'Specialized Design (proficiency in 1 skill & 1 tool of choice)'],
    naturalAC: (scores) => 11 + Math.floor((scores.dex - 10) / 2),
    size: 'medium',
    darkvisionRange: 0,
  },
  {
    id: 'Githyanki',
    label: 'Githyanki',
    speed: 30,
    abilityBonus: { str: 2, int: 1 },
    traits: ['Decadent Mastery (proficiency in 1 language, skill, or tool)', 'Martial Prodigy (light & medium armor proficiency, shortsword & longsword & greatsword proficiency)', 'Githyanki Psionics (Mage Hand cantrip; Jump; Misty Step — using INT)'],
    size: 'medium',
    racialSpells: { 1: ['mage-hand'], 3: ['jump'], 5: ['misty-step'] },
    darkvisionRange: 0,
  },
  {
    id: 'Githzerai',
    label: 'Githzerai',
    speed: 30,
    abilityBonus: { wis: 2, int: 1 },
    traits: ['Mental Discipline (advantage vs charmed & frightened)', 'Githzerai Psionics (Mage Hand cantrip; Shield; Detect Thoughts — using WIS)', 'Psychic Defense (unarmored AC = 10 + DEX mod + WIS mod)'],
    naturalAC: (scores) => 10 + Math.floor((scores.dex - 10) / 2) + Math.floor((scores.wis - 10) / 2),
    size: 'medium',
    racialSpells: { 1: ['mage-hand'], 3: ['shield'], 5: ['detect-thoughts'] },
    darkvisionRange: 0,
  },
]

export const RACE_BY_ID = Object.fromEntries(RACES.map(r => [r.id, r])) as Record<string, RaceDef>

export const RACE_LABELS = RACES.map(r => ({ id: r.id, label: r.label }))

export interface RaceSaveAdvantage {
  saves: AbilityScore[]
  vs: string
  source: string
}

export const RACE_SAVE_ADVANTAGES: Record<string, RaceSaveAdvantage[]> = {
  Dwarf:         [{ saves: ['con'], vs: 'vs poison', source: 'Dwarven Resilience' }],
  MountainDwarf: [{ saves: ['con'], vs: 'vs poison', source: 'Dwarven Resilience' }],
  Elf:           [{ saves: ['wis'], vs: 'vs charm', source: 'Fey Ancestry' }],
  WoodElf:       [{ saves: ['wis'], vs: 'vs charm', source: 'Fey Ancestry' }],
  Drow:          [{ saves: ['wis'], vs: 'vs charm', source: 'Fey Ancestry' }],
  HalfElf:       [{ saves: ['wis'], vs: 'vs charm', source: 'Fey Ancestry' }],
  Halfling:      [{ saves: ['wis'], vs: 'vs frightened', source: 'Brave' }],
  StoutHalfling: [
    { saves: ['wis'], vs: 'vs frightened', source: 'Brave' },
    { saves: ['con'], vs: 'vs poison', source: 'Stout Resilience' },
  ],
  Gnome:         [{ saves: ['int', 'wis', 'cha'], vs: 'vs magic', source: 'Gnome Cunning' }],
  RockGnome:     [{ saves: ['int', 'wis', 'cha'], vs: 'vs magic', source: 'Gnome Cunning' }],
  Warforged:     [{ saves: ['con'], vs: 'vs poison', source: 'Constructed Resilience' }],
  Githzerai:     [{ saves: ['wis'], vs: 'vs charm & frightened', source: 'Mental Discipline' }],
}
