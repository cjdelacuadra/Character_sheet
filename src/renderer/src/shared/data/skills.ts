import type { AbilityScore } from '@/entities/character/types'

export type Skill =
  | 'acrobatics' | 'animalHandling' | 'arcana' | 'athletics'
  | 'deception' | 'history' | 'insight' | 'intimidation' | 'investigation'
  | 'medicine' | 'nature' | 'perception' | 'performance' | 'persuasion'
  | 'religion' | 'sleightOfHand' | 'stealth' | 'survival'

export interface SkillDef {
  key: Skill
  label: string
  ability: AbilityScore
  description: string
}

export const SKILLS: SkillDef[] = [
  { key: 'acrobatics',     label: 'Acrobatics',      ability: 'dex', description: 'Balance, tumble, and perform acrobatic feats; resist grapples and knockdowns.' },
  { key: 'animalHandling', label: 'Animal Handling',  ability: 'wis', description: 'Calm animals, intuit their behavior, and control mounts in dangerous situations.' },
  { key: 'arcana',         label: 'Arcana',           ability: 'int', description: 'Recall lore about spells, magic items, symbols, traditions, and planar beings.' },
  { key: 'athletics',      label: 'Athletics',        ability: 'str', description: 'Climb, jump, swim, and push through feats of raw physical power.' },
  { key: 'deception',      label: 'Deception',        ability: 'cha', description: 'Mislead others through lies, misdirection, and disguise.' },
  { key: 'history',        label: 'History',          ability: 'int', description: 'Recall lore about historical events, people, kingdoms, and wars.' },
  { key: 'insight',        label: 'Insight',          ability: 'wis', description: 'Determine intentions and detect lies, emotions, and hidden motives.' },
  { key: 'intimidation',   label: 'Intimidation',     ability: 'cha', description: 'Coerce others through threats, hostile actions, and shows of power.' },
  { key: 'investigation',  label: 'Investigation',    ability: 'int', description: 'Search for clues, analyze evidence, and piece together information.' },
  { key: 'medicine',       label: 'Medicine',         ability: 'wis', description: 'Stabilize dying creatures, diagnose illness, and tend wounds.' },
  { key: 'nature',         label: 'Nature',           ability: 'int', description: 'Recall lore about terrain, plants, animals, weather, and natural cycles.' },
  { key: 'perception',     label: 'Perception',       ability: 'wis', description: 'Notice things using your senses — spot hidden creatures or objects.' },
  { key: 'performance',    label: 'Performance',      ability: 'cha', description: 'Delight audiences with music, dance, storytelling, or theater.' },
  { key: 'persuasion',     label: 'Persuasion',       ability: 'cha', description: 'Influence others through tact, social grace, or reasoned argument.' },
  { key: 'religion',       label: 'Religion',         ability: 'int', description: 'Recall lore about deities, rites, prayers, holy symbols, and cults.' },
  { key: 'sleightOfHand',  label: 'Sleight of Hand',  ability: 'dex', description: 'Feats of manual dexterity — pick pockets, plant objects, or palm items.' },
  { key: 'stealth',        label: 'Stealth',          ability: 'dex', description: 'Conceal yourself from enemies; move without being seen or heard.' },
  { key: 'survival',       label: 'Survival',         ability: 'wis', description: 'Track creatures, forage for food, navigate wilderness, and predict weather.' },
]

export const SKILL_BY_KEY = Object.fromEntries(SKILLS.map(s => [s.key, s])) as Record<Skill, SkillDef>

// All skills, for Bard's "any 3" choice
export const ALL_SKILL_KEYS: Skill[] = SKILLS.map(s => s.key)
