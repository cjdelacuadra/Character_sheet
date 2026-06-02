import type { Skill } from '@/shared/data/skills'
import type { ActiveSummon } from '@/entities/summon/types'

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
  helmetId: string | null
  necklaceId: string | null
  capeId: string | null
  legsId: string | null
  bootsId: string | null
  glovesId: string | null
  quiverId: string | null
  ring1Id: string | null
  ring2Id: string | null
  amuletId: string | null
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
  enchantment?: string
  bonusDamageDie?: string
  bonusDamageType?: string
  twoHanded?: boolean
  toHitDiceCount?: number
  toHitDieType?: number
  toHitFlat?: number
  dmgBonusCount?: number
  dmgBonusDieType?: number
  dmgBonusFlat?: number
  dmgBonusType?: string
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
  subclassLocked?: boolean
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
  masterySpells?: { level1?: string; level2?: string }
  preparedSpellIds: string[]
  spellSlots: SpellSlots
  concentrationSpellId: string | null
  activeBuffSpells?: string[]

  weapons: Weapon[]
  conditionIds: ActiveCondition[]
  resources: Record<string, { used: number; total: number }>
  deathSaves: { successes: number; failures: number }
  inspiration: number
  hitDiceUsed: number
  gold: number
  ownedItemIds: string[]
  feats: string[]
  attunedItemIds?: string[]
  warlockInvocations?: string[]
  pactBoon?: string
  pactBoonLocked?: boolean
  isRaging?: boolean
  /** Bladesinger (Wizard) — Bladesong active toggle. While active: +INT to AC, +10 ft speed,
   *  advantage on Acrobatics, +INT to Constitution saves for concentration. Only valid while
   *  not in medium/heavy armor, no shield, no two-handed weapon. */
  isBladesinging?: boolean
  /** Hexblade (Warlock) — id of the bonded "pact weapon" for Hex Warrior CHA-for-attacks.
   *  When this matches a weapon in `weapons[]`, attack/damage rolls for that weapon use CHA. */
  hexWarriorWeaponId?: string
  fightingStyle?: string
  fightingStyleLocked?: boolean
  completedAsiLevels: number[]
  completedAsiChoices?: Record<number, string>
  selectedManeuver?: string | null
  chosenManeuvers?: string[]
  activeManeuver?: string | null
  superiorityDiceUsed?: number
  arcaneShots?: string[]
  activeArcaneShot?: string | null
  /** Artificer infusion designs the character knows */
  artificerInfusions?: string[]
  /** Artificer infusions currently active on items */
  activeArtificerInfusions?: string[]
  /** Live summoned creatures/structures owned by this character */
  activeSummons: ActiveSummon[]
  /** Circle of the Land Druid's chosen terrain at level 3 (Circle Spells). */
  circleOfLandTerrain?: 'arctic' | 'coast' | 'desert' | 'forest' | 'grassland' | 'mountain' | 'swamp' | 'underdark'
  notes: string
}
