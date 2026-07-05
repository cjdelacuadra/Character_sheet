/**
 * Character schema v14.
 *
 * v14 replaces the ~20 one-off class-specific optional fields of v13
 * (chosenTotem, hexWarriorWeaponId, chainFamiliarType, maneuver/arcane-shot/
 * infusion/rune field sets, stored feat flags…) with one generic
 * `featureState` map, honouring the app's principle that any feature can be
 * attached to any character. Class/subclass data defines *defaults*; nothing
 * in the schema is gated on a class.
 *
 * Feat flags (piercer crit die, crusher advantage, …) are no longer stored —
 * they are derived from `feats` by the rules engine.
 */
import type {
  AbilityScore, AbilityScores, ActiveCondition, BuffRuntime, Equipment,
  FeatureState, HitPoints, Skill, SpellSlots, Weapon,
} from '@/entities/character/types'
import type { ActiveSummon } from '@/entities/summon/types'

export const CURRENT_SCHEMA_VERSION = 14

/**
 * Generic per-feature runtime/choice state, keyed by a stable feature id
 * (e.g. 'maneuvers', 'invocations', 'totem-spirit', 'rage', 'wild-shape').
 * The interface lives in entities/character/types so v13 code can adopt it
 * incrementally before the flip; re-exported here as the v14 home.
 */
export type { FeatureState } from '@/entities/character/types'

export interface CharacterV14 {
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
  preparedSpellIds: string[]
  spellSlots: SpellSlots
  concentrationSpellId: string | null
  activeBuffSpells?: string[]
  buffStates?: Record<string, BuffRuntime>

  weapons: Weapon[]
  conditionIds: ActiveCondition[]
  resources: Record<string, { used: number; total: number }>
  deathSaves: { successes: number; failures: number }
  inspiration: number
  hitDiceUsed: number
  gold: number
  ownedItemIds: string[]
  attunedItemIds?: string[]
  feats: string[]
  /** Chosen ability for ability-choice feats (Resilient, half-feats…). */
  featChoices?: Record<string, AbilityScore>
  completedAsiLevels: number[]
  completedAsiChoices?: Record<number, string>

  /** All class/subclass/racial feature choices and runtime state, keyed by feature id. */
  featureState: Record<string, FeatureState>

  activeSummons: ActiveSummon[]
  /** User-authored custom features (homebrew, DM grants, notes). */
  customFeatures?: { name: string; desc: string }[]
  notes: string
}

// ── Well-known featureState keys (v13 field mapping lives in migrations) ────

export const FEATURE_KEYS = {
  rage: 'rage',                       // v13 isRaging → on
  bladesong: 'bladesong',             // v13 isBladesinging → on
  totemSpirit: 'totem-spirit',        // v13 chosenTotem → choice
  hexWarrior: 'hex-warrior',          // v13 hexWarriorWeaponId → choice
  pactBoon: 'pact-boon',              // v13 pactBoon → choice, pactBoonLocked → locked
  pactOfTheChain: 'pact-of-the-chain',// v13 chainFamiliarType → choice
  pactOfTheTome: 'pact-of-the-tome',  // v13 tomeCantrips → known
  invocations: 'invocations',         // v13 warlockInvocations → known
  fightingStyle: 'fighting-style',    // v13 fightingStyle → choice, fightingStyleLocked → locked
  maneuvers: 'maneuvers',             // v13 chosenManeuvers → known, activeManeuver → active
  arcaneShots: 'arcane-shots',        // v13 arcaneShots → known, activeArcaneShot → active
  infusions: 'infusions',             // v13 artificerInfusions → known, activeArtificerInfusions → active
  runes: 'runes',                     // v13 knownRunes → known, activeRunes → active
  circleOfTheLand: 'circle-of-the-land', // v13 circleOfLandTerrain → choice
  wildShape: 'wild-shape',            // v13 wildShapeForm → data
  racialActions: 'racial-actions',    // v13 racialActionUses → uses
  spellMastery: 'spell-mastery',      // v13 masterySpells → data { level1, level2 }
  metamagic: 'metamagic',             // new in v14 (Phase 5.5) → known
} as const

// ── Accessors ────────────────────────────────────────────────────────────────

type HasFeatureState = Pick<CharacterV14, 'featureState'>

export function getFeatureState(char: HasFeatureState, key: string): FeatureState {
  return char.featureState[key] ?? {}
}

export function featureKnown(char: HasFeatureState, key: string): string[] {
  return getFeatureState(char, key).known ?? []
}

export function featureActive(char: HasFeatureState, key: string): string[] {
  return getFeatureState(char, key).active ?? []
}

export function featureChoice(char: HasFeatureState, key: string): string | undefined {
  return getFeatureState(char, key).choice
}

export function featureOn(char: HasFeatureState, key: string): boolean {
  return getFeatureState(char, key).on === true
}

/** Returns a new featureState map with `patch` merged into the entry for `key`. */
export function withFeatureState(
  char: HasFeatureState,
  key: string,
  patch: Partial<FeatureState>,
): Record<string, FeatureState> {
  return { ...char.featureState, [key]: { ...getFeatureState(char, key), ...patch } }
}
