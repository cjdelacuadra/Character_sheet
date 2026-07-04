/**
 * Trackable caster-feature rules that previously existed only as description
 * text: Portent, Song of Rest, Arcane Ward, Wild Shape CR limits, Bardic
 * Inspiration die. Pure level→value functions; state lives in featureState /
 * resources so any character granted the feature can use it.
 */

/** Divination wizard Portent: 2 d20s per long rest, 3 at level 14. */
export function portentDiceCount(level: number): number {
  return level >= 14 ? 3 : 2
}

/** Bard Song of Rest extra healing die on a short rest (level 2+). */
export function songOfRestDie(level: number): string | null {
  if (level >= 17) return '1d12'
  if (level >= 13) return '1d10'
  if (level >= 9) return '1d8'
  if (level >= 2) return '1d6'
  return null
}

/** Bardic Inspiration die by bard level. */
export function bardicInspirationDie(level: number): string {
  if (level >= 15) return '1d12'
  if (level >= 10) return '1d10'
  if (level >= 5) return '1d8'
  return '1d6'
}

/** Abjuration wizard Arcane Ward maximum HP: 2 × level + INT mod. */
export function arcaneWardMax(level: number, intMod: number): number {
  return 2 * level + intMod
}

export interface WildShapeLimit {
  maxCR: number
  canSwim: boolean
  canFly: boolean
  /** Moon druids shape as a bonus action; others use an action. */
  economy: 'action' | 'bonus'
}

/**
 * Wild Shape limits. Standard: CR ¼ (no swim/fly) at 2, CR ½ (+swim) at 4,
 * CR 1 (+fly) at 8. Circle of the Moon: CR 1 at 2 as a bonus action, then
 * max(1, floor(level / 3)) from level 6.
 */
export function wildShapeLimit(level: number, moonDruid: boolean): WildShapeLimit | null {
  if (level < 2) return null
  const canSwim = level >= 4
  const canFly = level >= 8
  if (moonDruid) {
    const maxCR = level >= 6 ? Math.max(1, Math.floor(level / 3)) : 1
    return { maxCR, canSwim, canFly, economy: 'bonus' }
  }
  const maxCR = level >= 8 ? 1 : level >= 4 ? 0.5 : 0.25
  return { maxCR, canSwim, canFly, economy: 'action' }
}

/** Cleric Divine Intervention: succeeds on d100 ≤ cleric level (auto at 20). */
export function divineInterventionSucceeds(level: number, d100Roll: number): boolean {
  if (level >= 20) return true
  return d100Roll <= level
}
