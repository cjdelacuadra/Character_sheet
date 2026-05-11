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
  /** Round or timestamp when applied, for tracking */
  appliedAt?: number
}

export interface Character {
  id: string
  name: string
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

  spellIds: string[]
  spellSlots: SpellSlots
  concentrationSpellId?: string

  conditionIds: ActiveCondition[]

  resources: Record<string, { used: number; total: number }>

  deathSaves: { successes: number; failures: number }

  inspiration: boolean
}
