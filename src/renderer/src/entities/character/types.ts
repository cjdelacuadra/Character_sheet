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

export interface BuffRuntime {
  trackedTargetLabel?: string
  oneShotUsed?: boolean
  perTurnUsed?: boolean
}

/**
 * Generic per-feature choice/runtime state, keyed by feature id (the v14
 * schema's replacement for one-off class fields). Optional on v13 so new
 * features (metamagic, portent…) can adopt it before the full flip; the
 * v13→v14 migration preserves existing entries.
 */
export interface FeatureState {
  known?: string[]
  active?: string[]
  choice?: string
  on?: boolean
  locked?: boolean
  uses?: Record<string, number>
  data?: Record<string, unknown>
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
  requiresAttunement?: boolean
  attuned?: boolean
  critModifier?: Partial<Record<'melee' | 'ranged' | 'spells' | 'martial' | 'all', number>>
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
  buffStates?: Record<string, BuffRuntime>
  /** v14-style feature state, adopted incrementally (see FeatureState). */
  featureState?: Record<string, FeatureState>

  weapons: Weapon[]
  conditionIds: ActiveCondition[]
  resources: Record<string, { used: number; total: number }>
  deathSaves: { successes: number; failures: number }
  inspiration: number
  hitDiceUsed: number
  gold: number
  ownedItemIds: string[]
  feats: string[]
  /** NEW: Piercer feat flag — +1 die on a piercing critical hit. */
  piercerCritExtraDie?: boolean
  /** NEW: Crusher feat flag — bludgeoning critical hit grants advantage vs target. */
  crusherCritAdvantage?: boolean
  /** NEW: Spell Sniper feat flag — doubles attack-spell range and ignores half/three-quarters cover. */
  spellSniperDoubleRange?: boolean
  /** NEW: Mounted Combatant feat flag — mounted combat riders. */
  mountedCombatantFlags?: boolean
  /** NEW: chosen ability for ability-choice feats added through the Features panel. */
  featChoices?: Record<string, AbilityScore>
  attunedItemIds?: string[]
  warlockInvocations?: string[]
  pactBoon?: string
  pactBoonLocked?: boolean
  tomeCantrips?: string[]
  chainFamiliarType?: 'imp' | 'pseudodragon' | 'quasit' | 'sprite'
  isRaging?: boolean
  chosenTotem?: 'bear' | 'eagle' | 'wolf'
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
  arcaneShots?: string[]
  activeArcaneShot?: string | null
  /** Artificer infusion designs the character knows */
  artificerInfusions?: string[]
  /** Artificer infusions currently active on items */
  activeArtificerInfusions?: string[]
  knownRunes?: string[]
  activeRunes?: string[]
  /** Live summoned creatures/structures owned by this character */
  activeSummons: ActiveSummon[]
  /** User-authored custom features shown in the Features panel (homebrew, DM grants, notes). */
  customFeatures?: { name: string; desc: string }[]
  /** Used-count of limited-use racial actions, keyed by RacialAction.id; reset on rest by recharge. */
  racialActionUses?: Record<string, number>
  /** Circle of the Land Druid's chosen terrain at level 3 (Circle Spells). */
  circleOfLandTerrain?: 'arctic' | 'coast' | 'desert' | 'forest' | 'grassland' | 'mountain' | 'swamp' | 'underdark'
  wildShapeForm?: { name: string; hp: { current: number; max: number }; ac: number; cr: number; speed: string; attack?: string; attacks?: { name: string; toHit: number; dmg: string; dmgType: string; note?: string }[]; multiattack?: string }
  notes: string
}
