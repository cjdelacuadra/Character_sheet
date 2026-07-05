/**
 * Spellcasting rules (unified engine, v14).
 *
 * Ports the legacy DC/attack/prepared math and computeSpellDamage — fixing
 * the mojibake bug where the em-dash guard compared against a corrupted
 * literal ('â€”'), so placeholder formulas leaked into crit/hit parts.
 */
import type { AbilityScores } from '@/entities/character/types'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { SUBCLASS_BY_ID } from '@/shared/data/subclassData'
import { computeUpcastDice, type SpellEntry } from '@/shared/data/spellData'
import { mod } from '@/shared/data/charCalculations'
import { combineDiceExpr, critDiceExpr } from '../dice'
import { collectActiveEffects } from '../collect'
import { abilityBonusTotal, damageRiders, type SourcedEffect } from '../effects'

export interface CasterInput {
  abilityScores: AbilityScores
  equipment: import('@/entities/character/types').Equipment
  classId: string
  subclass?: string
  level: number
  proficiencyBonus: number
  activeBuffSpells?: string[]
  conditionIds?: import('@/entities/character/types').ActiveCondition[]
  /** Legacy (v13) known invocations; v14 uses featureState['invocations'].known. */
  warlockInvocations?: string[]
  featureState?: Record<string, import('@/entities/character/types').FeatureState>
}

/** Known Eldritch Invocations from either schema generation. */
export function knownInvocations(char: Pick<CasterInput, 'warlockInvocations' | 'featureState'>): string[] {
  return char.featureState?.['invocations']?.known ?? char.warlockInvocations ?? []
}

const NO_DAMAGE = '—'

function effectiveAbility(char: CasterInput, ability: keyof AbilityScores): number {
  const effects = collectActiveEffects(char)
  return char.abilityScores[ability] + abilityBonusTotal(effects, ability)
}

/** Spellcasting ability modifier — subclass override first, class, then INT. */
export function spellcastingAbilityMod(char: CasterInput): number {
  const subAbility = char.subclass ? SUBCLASS_BY_ID[char.subclass]?.spellcastingAbility : undefined
  const ability = subAbility ?? CLASS_BY_ID[char.classId]?.spellcastingAbility ?? 'int'
  return mod(effectiveAbility(char, ability))
}

export function computeSpellSaveDC(char: CasterInput): number {
  return 8 + char.proficiencyBonus + spellcastingAbilityMod(char)
}

export function computeSpellAttackBonus(char: CasterInput): number {
  return char.proficiencyBonus + spellcastingAbilityMod(char)
}

/** Arcane Shot DC (Arcane Archer) — separate so AA isn't treated as a caster. */
export function computeArcaneShotDC(char: CasterInput): number | null {
  const ability = char.subclass ? SUBCLASS_BY_ID[char.subclass]?.arcaneShotAbility : undefined
  if (!ability) return null
  return 8 + char.proficiencyBonus + mod(effectiveAbility(char, ability))
}

/** Prepared-spell count for prepared casters (data via class table conventions). */
export function computePreparedSpellCount(classId: string, level: number, abilityScore: number): number {
  const abilityMod = mod(abilityScore)
  if (classId === 'Paladin') return Math.max(1, Math.floor(level / 2) + abilityMod)
  if (classId === 'Cleric' || classId === 'Druid' || classId === 'Wizard' || classId === 'Artificer') {
    return Math.max(1, level + abilityMod)
  }
  return 0
}

export interface SpellDamageResult {
  hitFormula: string
  missFormula: string
  dmgType: string
  critFormula: string
}

/**
 * Damage formula for a spell at a slot level, including gear damage riders
 * that apply to all damage sources. Weapon-attack buffs never leak in here.
 */
export function computeSpellDamage(
  spell: SpellEntry,
  slotLevel: number,
  char: CasterInput,
): SpellDamageResult {
  let baseDice: string

  if (spell.id === 'magic-missile') {
    const darts = 3 + Math.max(0, slotLevel - 1)
    baseDice = `${darts}d4 + ${darts}`
  } else if (spell.id === 'fire-bolt') {
    const lvl = char.level
    const tier = lvl >= 17 ? 4 : lvl >= 11 ? 3 : lvl >= 5 ? 2 : 1
    baseDice = `${tier}d10`
  } else if (spell.damageFormula) {
    baseDice = spell.damageFormula
  } else if (spell.scalingDice) {
    baseDice = computeUpcastDice(spell.scalingDice, slotLevel)
  } else {
    baseDice = NO_DAMAGE
  }

  // Agonizing Blast: +CHA mod per Eldritch Blast beam, keyed on the known
  // invocation (never the class).
  if (spell.id === 'eldritch-blast' && knownInvocations(char).includes('agonizingBlast')) {
    const chaMod = mod(effectiveAbility(char, 'cha'))
    if (chaMod !== 0) baseDice = combineDiceExpr(`${baseDice} + ${chaMod}`)
  }

  const dmgType = spell.damageType ?? ''
  const effects = collectActiveEffects(char)
  const riderEffects = damageRiders(effects, 'spell')
    .map(r => r.effect as Extract<SourcedEffect['effect'], { kind: 'damageRider' }>)
  const sameType = riderEffects.filter(b => b.damageType === dmgType)
  const otherType = riderEffects.filter(b => b.damageType !== dmgType)

  const sameTypeParts = sameType
    .flatMap(b => [b.dice ?? null, b.flat ? String(b.flat) : null])
    .filter(Boolean) as string[]
  const combined = sameTypeParts.length && baseDice !== NO_DAMAGE
    ? combineDiceExpr([baseDice, ...sameTypeParts].join('+'))
    : baseDice

  const hitParts: { expr: string; type: string }[] = []
  let hitFormula = dmgType ? `${combined} ${dmgType}` : combined
  if (dmgType && combined !== NO_DAMAGE) hitParts.push({ expr: combined, type: dmgType })
  for (const rider of otherType) {
    const parts = [rider.dice ?? null, rider.flat ? String(rider.flat) : null].filter(Boolean) as string[]
    if (!parts.length) continue
    const expr = combineDiceExpr(parts.join('+'))
    hitParts.push({ expr, type: rider.damageType })
    hitFormula += ` + ${expr} ${rider.damageType}`
  }

  let missFormula = ''
  if (spell.attackType === 'attack-roll') missFormula = NO_DAMAGE
  else if (spell.attackType === 'save')   missFormula = 'half'
  else if (spell.attackType === 'auto-hit') missFormula = ''

  const critFormula = spell.attackType === 'attack-roll'
    ? hitParts.map(part => `${critDiceExpr(part.expr)} ${part.type}`).join(' + ')
    : ''

  return { hitFormula, missFormula, dmgType, critFormula }
}
