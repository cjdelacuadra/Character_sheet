import type { AbilityScores } from '@/entities/character/types'

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
}

export const RACES: RaceDef[] = [
  {
    id: 'Human',
    label: 'Human',
    speed: 30,
    abilityBonus: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    traits: ['Extra Language', '+1 to all ability scores'],
    size: 'medium',
  },
  {
    id: 'Elf',
    label: 'Elf (High)',
    speed: 30,
    abilityBonus: { dex: 2, int: 1 },
    traits: ['Darkvision 60ft', 'Keen Senses (Perception proficiency)', 'Fey Ancestry (advantage vs charm, immune sleep)', 'Trance (4h rest instead of 8h)'],
    size: 'medium',
  },
  {
    id: 'WoodElf',
    label: 'Elf (Wood)',
    speed: 35,
    abilityBonus: { dex: 2, wis: 1 },
    traits: ['Darkvision 60ft', 'Keen Senses', 'Fey Ancestry', 'Fleet of Foot (35ft speed)', 'Mask of the Wild'],
    size: 'medium',
  },
  {
    id: 'Dwarf',
    label: 'Dwarf (Hill)',
    speed: 25,
    abilityBonus: { con: 2, wis: 1 },
    traits: ['Darkvision 60ft', 'Dwarven Resilience (advantage on poison saves, resistance to poison damage)', 'Stonecunning', 'Dwarven Toughness (+1 HP/level)'],
    size: 'medium',
  },
  {
    id: 'MountainDwarf',
    label: 'Dwarf (Mountain)',
    speed: 25,
    abilityBonus: { str: 2, con: 2 },
    traits: ['Darkvision 60ft', 'Dwarven Resilience', 'Stonecunning', 'Armor proficiency (light, medium)'],
    size: 'medium',
  },
  {
    id: 'Halfling',
    label: 'Halfling (Lightfoot)',
    speed: 25,
    abilityBonus: { dex: 2, cha: 1 },
    traits: ['Lucky (reroll 1s on attack/check/save)', 'Brave (advantage vs frightened)', 'Halfling Nimbleness (move through larger creatures)', 'Naturally Stealthy'],
    size: 'small',
  },
  {
    id: 'HalfElf',
    label: 'Half-Elf',
    speed: 30,
    abilityBonus: { cha: 2 },
    traits: ['Darkvision 60ft', 'Fey Ancestry', 'Skill Versatility (+2 skill proficiencies of choice)'],
    size: 'medium',
  },
  {
    id: 'HalfOrc',
    label: 'Half-Orc',
    speed: 30,
    abilityBonus: { str: 2, con: 1 },
    traits: ['Darkvision 60ft', 'Menacing (Intimidation proficiency)', 'Relentless Endurance (drop to 1 HP instead of 0, 1/LR)', 'Savage Attacks (extra crit die)'],
    size: 'medium',
  },
  {
    id: 'Gnome',
    label: 'Gnome (Forest)',
    speed: 25,
    abilityBonus: { int: 2, dex: 1 },
    traits: ['Darkvision 60ft', 'Gnome Cunning (advantage INT/WIS/CHA saves vs magic)', 'Natural Illusionist', 'Speak with Small Beasts'],
    size: 'small',
  },
  {
    id: 'Tiefling',
    label: 'Tiefling',
    speed: 30,
    abilityBonus: { int: 1, cha: 2 },
    traits: ['Darkvision 60ft', 'Hellish Resistance (fire resistance)', 'Infernal Legacy (Thaumaturgy cantrip; Hellish Rebuke/Darkness as spell)'],
    size: 'medium',
  },
  {
    id: 'Dragonborn',
    label: 'Dragonborn',
    speed: 30,
    abilityBonus: { str: 2, cha: 1 },
    traits: ['Draconic Ancestry (choose element)', 'Breath Weapon (Dex/Con save, 2d6 damage, scales)', 'Damage Resistance (chosen element)'],
    size: 'medium',
  },
]

export const RACE_BY_ID = Object.fromEntries(RACES.map(r => [r.id, r])) as Record<string, RaceDef>

export const RACE_LABELS = RACES.map(r => ({ id: r.id, label: r.label }))
