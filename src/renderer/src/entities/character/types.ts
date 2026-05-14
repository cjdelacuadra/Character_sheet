import type { Skill } from '@/shared/data/skills'

export type { Skill }
export type AbilityScore = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export interface AbilityScores {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

export interface HitPoints {
  current: number
  max: number
  temp: number
}

export interface SpellSlots {
  [level: number]: { used: number; total: number }
}

export interface ActiveCondition {
  conditionId: string
  appliedAt?: number
}

export interface Equipment {
  armorId: string | null
  /** @deprecated use shieldId instead */
  hasShield: boolean
  shieldId: string | null
}

export interface Weapon {
  id: string
  name: string
  atkBonus: number
  damage: string
  damageType?: string
  rangeType?: 'Melee' | 'Ranged' | 'Melee or Ranged'
  properties?: string[]
  enchantmentBonus?: number
  bonusDamageDie?: string
  bonusDamageType?: string
}

export interface Character {
  id: string
  schemaVersion: number
  createdAt: string
  updatedAt: string

  name: string
  playerName?: string
  alignment?: string
  race: string
  classId: string
  subclass?: string
  background: string
  level: number
  experiencePoints: number

  abilityScores: AbilityScores
  hitPoints: HitPoints
  armorClass: number
  speed: number
  initiative: number
  proficiencyBonus: number
  bonusHpPerLevel: number

  equipment: Equipment
  savingThrowProficiencies: AbilityScore[]
  skillProficiencies: Partial<Record<Skill, 'proficient' | 'expert'>>

  spellIds: string[]
  preparedSpellIds: string[]
  spellSlots: SpellSlots
  concentrationSpellId: string | null

  weapons: Weapon[]
  conditionIds: ActiveCondition[]
  resources: Record<string, { used: number; total: number }>
  deathSaves: { successes: number; failures: number }
  inspiration: number
  hitDiceUsed: number
  feats: string[]
  notes: string
}
