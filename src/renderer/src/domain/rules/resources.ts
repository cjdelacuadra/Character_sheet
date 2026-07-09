/**
 * Resource rest-recovery rules (unified engine, v14).
 *
 * Replaces the hardcoded subclass branches in characterSlice.shortRest
 * (BattleMaster, PsiWarrior, `Rune:` keys) with declarative recovery rules.
 * A resource recovers on short rest if its ResourceDef says `recoverOn:
 * 'short'` — wherever it came from (class, subclass, homebrew) — or if a
 * RECOVERY_RULES entry matches its key. Nothing is gated on class identity.
 */
import type { AbilityScores } from '@/entities/character/types'
import { FEAT_BY_ID } from '@/shared/data/featsData'
import { getResourceDefaults, getResourceDefaultDefinition } from '@/shared/data/resourceDefaults'

export type RestKind = 'short' | 'long'
type ResourcePool = Record<string, { used: number; total: number }>

/**
 * Key-pattern recovery rules for resources that have no ResourceDef entry
 * (dynamic keys) or non-standard recovery amounts. Data, not code branches.
 */
export const RECOVERY_RULES: Array<{
  /** Exact key or prefix match (`endsWith: ':'` style prefixes use `prefix`). */
  key?: string
  prefix?: string
  /** Which rest triggers recovery. */
  recoverOn: RestKind
  /** 'full' resets used to 0; a number recovers that many uses. */
  amount: 'full' | number
}> = [
  // Rune Knight: each rune recharges fully on a short rest.
  { prefix: 'Rune:', recoverOn: 'short', amount: 'full' },
  // Psi Warrior: regain one Psionic Energy die on a short rest (all on long).
  { key: 'Psionic Energy', recoverOn: 'short', amount: 1 },
  // Feat free-casts (Fey Touched, Magic Initiate…): long rest only.
  { prefix: 'Feat:', recoverOn: 'long', amount: 'full' },
]

interface RestInput {
  classId: string
  subclass?: string
  level: number
  abilityScores: AbilityScores
  resources: ResourcePool
  feats?: string[]
}

/**
 * Returns the resource pool after a rest.
 * Long rest: every resource fully recovers; missing class/subclass defaults
 * are seeded. Short rest: totals are refreshed from defaults (level/ability
 * scaling), and resources recover per their def's `recoverOn` or a matching
 * RECOVERY_RULES entry.
 */
export function applyRestToResources(char: RestInput, rest: RestKind): ResourcePool {
  const defaults = getResourceDefaults(char.classId, char.level, char.abilityScores, char.subclass)
  const next: ResourcePool = {}

  if (rest === 'long') {
    for (const key of Object.keys(char.resources)) {
      next[key] = { ...char.resources[key], used: 0 }
    }
    for (const [key, def] of Object.entries(defaults)) {
      if (!next[key]) next[key] = def
    }
    return next
  }

  // Short rest: seed/refresh totals from defaults, then apply recovery.
  for (const [key, value] of Object.entries(char.resources)) {
    next[key] = { ...value }
  }
  for (const [key, def] of Object.entries(defaults)) {
    if (!next[key]) next[key] = def
    else next[key] = { ...next[key], total: def.total }
  }

  for (const key of Object.keys(next)) {
    if (key.startsWith('Feat:')) {
      const spellId = key.slice('Feat:'.length)
      const recoversOnShort = (char.feats ?? []).some(featId => FEAT_BY_ID[featId]?.freeCastRecharge?.[spellId] === 'short')
      if (recoversOnShort) {
        next[key] = { ...next[key], used: 0 }
        continue
      }
    }
    const rule = RECOVERY_RULES.find(r => (r.key ? r.key === key : r.prefix ? key.startsWith(r.prefix) : false))
    if (rule) {
      if (rule.recoverOn === 'short') {
        next[key] = rule.amount === 'full'
          ? { ...next[key], used: 0 }
          : { ...next[key], used: Math.max(0, next[key].used - rule.amount) }
      }
      continue
    }
    const def = getResourceDefaultDefinition(char.classId, char.subclass, key)
    if (def?.recoverOn === 'short') {
      next[key] = { ...next[key], used: 0 }
    }
  }
  return next
}
