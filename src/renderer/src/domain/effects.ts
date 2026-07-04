/**
 * The shared mechanical vocabulary of the rules engine.
 *
 * Every source of a mechanical modifier — buff spells, conditions, equipped
 * gear, feats, class/subclass features, racial traits — expresses what it does
 * as `Effect` values. The rules modules (defense, mobility, attacks, …) fold
 * active effects instead of reaching into per-source data shapes, so adding a
 * new buff/feature/item never requires touching the math, and nothing is ever
 * gated on a class — any effect can be active on any character (the app's
 * "no class cage" principle).
 */
import type { AbilityScore } from '@/entities/character/types'
import type { Skill } from '@/shared/data/skills'

export type AttackScope = 'melee' | 'ranged' | 'weapon' | 'spell' | 'all'

export type Effect =
  /** Competes in the "best unarmored AC formula" set (Mage Armor 13+DEX, natural armor…). */
  | { kind: 'acBase'; value: number; addDex?: boolean }
  /** Flat AC bonus that stacks (Shield +5, Shield of Faith +2, ring of protection…). */
  | { kind: 'acBonus'; value: number }
  | { kind: 'speedBonus'; value: number }
  | { kind: 'speedMultiplier'; value: number }
  | { kind: 'abilityBonus'; ability: AbilityScore; value: number }
  | { kind: 'saveBonus'; ability: AbilityScore | 'all'; value: number }
  | { kind: 'saveBonusDice'; ability: AbilityScore | 'all'; dice: string }
  | { kind: 'skillBonus'; skill: Skill; value: number }
  | { kind: 'initiativeBonus'; value: number }
  | { kind: 'toHitBonus'; value: number; appliesTo: AttackScope }
  | { kind: 'toHitDice'; dice: string; appliesTo: AttackScope }
  /** Extra damage on a hit. `oneShot` riders end after one hit (smites, Zephyr Strike). */
  | { kind: 'damageRider'; dice?: string; flat?: number; damageType: string; appliesTo: AttackScope; oneShot?: boolean }
  | { kind: 'advantage'; on: 'attack' | 'save' | 'skill' | 'deathSave'; ability?: AbilityScore; skill?: Skill; appliesTo?: AttackScope }
  | { kind: 'disadvantage'; on: 'attack' | 'save' | 'skill'; ability?: AbilityScore; skill?: Skill; appliesTo?: AttackScope }
  /** Lowers the natural-crit threshold (Champion, gear). value = how much below 20. */
  | { kind: 'critThresholdDelta'; value: number }
  /** Non-computable rule note surfaced in the UI next to the stat it annotates. */
  | { kind: 'flag'; note: string }

/** An Effect together with where it came from, for UI attribution ("+2 AC — Shield of Faith"). */
export interface SourcedEffect {
  effect: Effect
  /** Stable id of the granting entity (spell id, condition id, gear id, feature id). */
  sourceId: string
  /** Human-readable source name for rider rows / tooltips. */
  sourceLabel: string
  sourceType: 'buff' | 'condition' | 'gear' | 'feat' | 'feature' | 'race'
}

// ── Folding helpers ─────────────────────────────────────────────────────────

export function sumOf(effects: SourcedEffect[], kind: 'acBonus' | 'speedBonus' | 'initiativeBonus'): number {
  return effects.reduce((sum, e) => (e.effect.kind === kind ? sum + e.effect.value : sum), 0)
}

export function productOfSpeedMultipliers(effects: SourcedEffect[]): number {
  const product = effects.reduce(
    (p, e) => (e.effect.kind === 'speedMultiplier' ? p * e.effect.value : p), 1)
  return Math.max(0, product)
}

export function abilityBonusTotal(effects: SourcedEffect[], ability: AbilityScore): number {
  return effects.reduce(
    (sum, e) => (e.effect.kind === 'abilityBonus' && e.effect.ability === ability ? sum + e.effect.value : sum), 0)
}

export function saveBonusTotal(effects: SourcedEffect[], ability: AbilityScore): number {
  return effects.reduce(
    (sum, e) =>
      e.effect.kind === 'saveBonus' && (e.effect.ability === ability || e.effect.ability === 'all')
        ? sum + e.effect.value
        : sum,
    0)
}

export function acBaseFormulas(effects: SourcedEffect[]): { value: number; addDex: boolean }[] {
  return effects.flatMap(e =>
    e.effect.kind === 'acBase' ? [{ value: e.effect.value, addDex: e.effect.addDex ?? true }] : [])
}

export function damageRiders(
  effects: SourcedEffect[],
  scope: 'melee' | 'ranged' | 'spell',
): SourcedEffect[] {
  return effects.filter(e => {
    if (e.effect.kind !== 'damageRider') return false
    const a = e.effect.appliesTo
    if (a === 'all') return true
    if (scope === 'spell') return a === 'spell'
    return a === scope || a === 'weapon'
  })
}

export function flagsOf(effects: SourcedEffect[]): { sourceId: string; note: string }[] {
  return effects.flatMap(e => (e.effect.kind === 'flag' ? [{ sourceId: e.sourceId, note: e.effect.note }] : []))
}
