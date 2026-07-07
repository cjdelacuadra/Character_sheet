/**
 * Attack rules (unified engine, v14).
 *
 * Ports the legacy domain/rules attack math with these fixes:
 * - Extra Attack progression is data (EXTRA_ATTACK_PROGRESSION), consistent
 *   for both the attack count and the action list (legacy had two sources).
 * - Damage riders (Hunter's Mark, Hex, Divine Favor, smites…) come from the
 *   active-buff effect fold — never from classId checks (no class cage).
 * - One weapon-aware special-attack list (legacy had two near-duplicates).
 * - Feat flags (Piercer…) are derived from `feats`, not stored fields.
 */
import type { AbilityScores, Weapon } from '@/entities/character/types'
import { WEAPONS } from '@/shared/data/equipment/weapons'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { RACE_BY_ID } from '@/shared/data/raceData'
import { SUBCLASS_BY_ID } from '@/shared/data/subclassData'
import { computeEquipmentStats, mod } from '@/shared/data/charCalculations'
import { combineDiceExpr } from '../dice'
import { collectActiveEffects } from '../collect'
import { abilityBonusTotal, damageRiders, type SourcedEffect } from '../effects'
import { featureChoice, FEATURE_KEYS, type FeatureState } from '../character/schema'

export interface AttackInput {
  abilityScores: AbilityScores
  equipment: import('@/entities/character/types').Equipment
  classId: string
  race: string
  subclass?: string
  level: number
  proficiencyBonus: number
  feats: string[]
  weapons: Weapon[]
  activeBuffSpells?: string[]
  buffStates?: Record<string, import('@/entities/character/types').BuffRuntime>
  conditionIds?: import('@/entities/character/types').ActiveCondition[]
  featureState: Record<string, FeatureState>
}

function effectiveMod(char: AttackInput, effects: SourcedEffect[], ability: 'str' | 'dex' | 'cha'): number {
  return mod(char.abilityScores[ability] + abilityBonusTotal(effects, ability))
}

export function isProficientWithWeapon(char: AttackInput, weapon: Weapon): boolean {
  const classDef = CLASS_BY_ID[char.classId]
  const raceDef = RACE_BY_ID[char.race]
  const subclassDef = char.subclass ? SUBCLASS_BY_ID[char.subclass] : undefined
  const effectiveProfs = [
    ...(classDef?.weaponProficiencies ?? []),
    ...(raceDef?.bonusWeaponProficiencies ?? []),
    ...(subclassDef?.extraWeaponProficiencies ?? []),
  ]
  const weaponDef = WEAPONS.find(wd => wd.name === weapon.name)
  if (!weaponDef) return true  // custom weapon: assume proficient
  if (weaponDef.proficiencyCategory === 'Unarmed' || weaponDef.proficiencyCategory === 'Natural') return true
  const nameLower = weapon.name.toLowerCase()
  return effectiveProfs.some(prof => {
    const p = prof.toLowerCase()
    if (p === 'simple weapons') return weaponDef.proficiencyCategory === 'Simple'
    if (p === 'martial weapons') return weaponDef.proficiencyCategory === 'Martial'
    return p === nameLower || p === nameLower + 's'
  })
}

/** The bonded Hex Warrior weapon uses the best of STR/DEX/CHA (featureState, any class). */
function attackAbilityMod(char: AttackInput, effects: SourcedEffect[], weapon: Weapon): number {
  const strMod = effectiveMod(char, effects, 'str')
  const dexMod = effectiveMod(char, effects, 'dex')
  const chaMod = effectiveMod(char, effects, 'cha')
  const isFinesse = (weapon.properties ?? []).some(p => p.toLowerCase() === 'finesse')
  const isRanged = weapon.rangeType === 'Ranged'
  const isHexWarriorWeapon = featureChoice(char, FEATURE_KEYS.hexWarrior) === weapon.id
  return isHexWarriorWeapon
    ? Math.max(strMod, dexMod, chaMod)
    : isFinesse ? Math.max(strMod, dexMod) : isRanged ? dexMod : strMod
}

export function computeAttackBonus(char: AttackInput, weapon: Weapon, opts?: { forceRanged?: boolean }): number {
  const effects = collectActiveEffects(char)
  const abilityMod = attackAbilityMod(char, effects, weapon)
  const proficient = isProficientWithWeapon(char, weapon)
  // Thrown weapons count as ranged for Archery, but keep STR for the ability mod.
  const isRangedForArchery = weapon.rangeType === 'Ranged' || opts?.forceRanged === true
  const hasArchery = featureChoice(char, FEATURE_KEYS.fightingStyle) === 'archery' || char.feats.includes('archery')
  const archeryBonus = hasArchery && isRangedForArchery ? 2 : 0
  // Equipment to-hit bonuses surface as their own attack-table rider rows, not folded in here.
  return abilityMod + (proficient ? char.proficiencyBonus : 0) + (weapon.atkBonus ?? 0) + (weapon.enchantmentBonus ?? 0) + (weapon.toHitFlat ?? 0) + archeryBonus
}

/**
 * Full weapon damage expression: weapon dice (versatile-aware), bonus dice,
 * ability mod + enchantment, and every active damage rider whose scope
 * matches (gear via `appliesTo`, buffs like Divine Favor / Hunter's Mark /
 * Elemental Weapon via the effect fold). Same-type riders fold into the base
 * expression; other types append as ` + <expr> <type>` segments.
 */
export function computeWeaponDamage(char: AttackInput, weapon: Weapon): string {
  const effects = collectActiveEffects(char)
  const dmgMod = attackAbilityMod(char, effects, weapon)
  const props = (weapon.properties ?? []).map(p => p.toLowerCase())
  const isRanged = weapon.rangeType === 'Ranged'

  const versatileDie = props.find(p => p.startsWith('versatile ('))?.match(/versatile \((\d+d\d+)\)/)?.[1]
  const baseDie = (versatileDie && weapon.twoHanded) ? versatileDie : weapon.damage
  const enchBonus = (weapon.enchantmentBonus ?? 0) + (weapon.dmgBonusFlat ?? 0)

  // Base damage folds GEAR riders only; buff riders (Divine Favor, Hunter's
  // Mark, smites) surface as their own attack-table rows via getAttackRiders,
  // with source attribution — never double-counted into the base string.
  const riders = damageRiders(effects, isRanged ? 'ranged' : 'melee')
    .filter(r => r.sourceType === 'gear')
  const weaponType = weapon.damageType ?? ''
  const parts = riders.map(r => r.effect as Extract<SourcedEffect['effect'], { kind: 'damageRider' }>)
  const sameType = parts.filter(b => b.damageType === weaponType)
  const otherType = parts.filter(b => b.damageType !== weaponType)

  const baseParts = [
    baseDie && baseDie !== '—' ? baseDie : null,
    weapon.bonusDamageDie ?? null,
    weapon.dmgBonusCount && weapon.dmgBonusDieType ? `${weapon.dmgBonusCount}d${weapon.dmgBonusDieType}` : null,
    ...sameType.flatMap(b => [b.dice ?? null, b.flat ? String(b.flat) : null]),
    dmgMod + enchBonus !== 0 ? String(dmgMod + enchBonus) : null,
  ].filter(Boolean) as string[]

  const baseExpr = baseParts.length ? combineDiceExpr(baseParts.join('+')) : '—'
  let result = weaponType ? `${baseExpr} ${weaponType}` : baseExpr

  for (const rider of otherType) {
    const riderParts = [rider.dice ?? null, rider.flat ? String(rider.flat) : null].filter(Boolean) as string[]
    if (!riderParts.length) continue
    result += ` + ${combineDiceExpr(riderParts.join('+'))} ${rider.damageType}`
  }
  return result
}

/**
 * Buff/feature damage riders for the attack table — one row per source
 * ("+1d4 radiant — Divine Favor", "+1d6 fire — Searing Smite (next hit)").
 * Includes one-shot riders until consumed; excludes gear riders (already
 * folded into the base damage string).
 */
export function getAttackRiders(char: AttackInput, weapon: Weapon): SourcedEffect[] {
  const effects = collectActiveEffects(char)
  const isRanged = weapon.rangeType === 'Ranged'
  return damageRiders(effects, isRanged ? 'ranged' : 'melee').filter(r => r.sourceType !== 'gear')
}

// ── Extra Attack (single data source for count AND action text) ─────────────

/** Attacks per Attack action, by class/subclass level thresholds (RAW defaults). */
export const EXTRA_ATTACK_PROGRESSION: {
  classes: Record<string, { level: number; attacks: number }[]>
  subclasses: Record<string, { level: number; attacks: number }[]>
} = {
  classes: {
    Fighter:   [{ level: 5, attacks: 2 }, { level: 11, attacks: 3 }, { level: 20, attacks: 4 }],
    Barbarian: [{ level: 5, attacks: 2 }],
    Paladin:   [{ level: 5, attacks: 2 }],
    Ranger:    [{ level: 5, attacks: 2 }],
    Monk:      [{ level: 5, attacks: 2 }],
  },
  subclasses: {
    Bladesinger:    [{ level: 6, attacks: 2 }],
    Bladesinging:   [{ level: 6, attacks: 2 }],
    EldritchKnight: [],  // uses the Fighter class row
  },
}

export function computeAttackCount(char: Pick<AttackInput, 'classId' | 'subclass' | 'level'>): number {
  let count = 1
  for (const row of EXTRA_ATTACK_PROGRESSION.classes[char.classId] ?? []) {
    if (char.level >= row.level) count = Math.max(count, row.attacks)
  }
  for (const row of (char.subclass && EXTRA_ATTACK_PROGRESSION.subclasses[char.subclass]) || []) {
    if (char.level >= row.level) count = Math.max(count, row.attacks)
  }
  return count
}

// ── Crits ────────────────────────────────────────────────────────────────────

/** Minimum d20 roll for a crit (20 default; Champion and gear lower it, floor 10). */
export function computeCritThreshold(
  char: Pick<AttackInput, 'subclass' | 'level'>,
  opts?: { weaponCritMod?: number; gearCritMods?: number[] },
): number {
  let threshold = 20
  if (char.subclass === 'Champion') {
    if (char.level >= 15) threshold = 18
    else if (char.level >= 3) threshold = 19
  }
  if (opts?.weaponCritMod) threshold = Math.max(10, threshold - opts.weaponCritMod)
  if (opts?.gearCritMods?.length) {
    threshold = Math.max(10, threshold - opts.gearCritMods.reduce((a, b) => a + b, 0))
  }
  return threshold
}

/** Extra dice added on a critical hit (Piercer feat — derived, Brutal Critical, Savage Attacks). */
export function critExtraDice(
  char: Pick<AttackInput, 'classId' | 'race' | 'level' | 'feats'> & Partial<Pick<AttackInput, 'equipment' | 'weapons'>>,
  weapon: Weapon,
  weaponDamageType: string,
): { expr: string; type: string }[] {
  const extras: { expr: string; type: string }[] = []
  const weaponDie = weapon.damage
  const normalizedType = weaponDamageType.toLowerCase()

  if (char.feats.includes('piercer') && normalizedType === 'piercing') {
    extras.push({ expr: weaponDie, type: 'piercing' })
  }

  if (char.classId === 'Barbarian') {
    const extraDice = char.level >= 17 ? 3 : char.level >= 13 ? 2 : char.level >= 9 ? 1 : 0
    if (extraDice > 0) {
      const match = weaponDie.match(/^(\d+)d(\d+)$/)
      const expr = match ? `${Number(match[1]) * extraDice}d${match[2]}` : weaponDie
      extras.push({ expr, type: weaponDamageType })
    }
  }

  if (char.race === 'HalfOrc' && weapon.rangeType !== 'Ranged') {
    extras.push({ expr: weaponDie, type: weaponDamageType })
  }

  // Equipment crit-only damage riders (gear or weapon stat blocks).
  if ('equipment' in char) {
    for (const crit of computeEquipmentStats(char as Pick<import('@/entities/character/types').Character, 'equipment'> & { weapons?: import('@/entities/character/types').Character['weapons'] }).critBonusDamage) {
      const parts = [...crit.dice, crit.flat ? String(crit.flat) : null].filter(Boolean) as string[]
      if (parts.length) extras.push({ expr: parts.join('+'), type: crit.dmgType })
    }
  }

  return extras
}

// ── Special attacks (single weapon-aware list) ───────────────────────────────

export interface SpecialAttack {
  name: string
  dice?: string
  note: string
  condition?: string
}

/**
 * Class/feat special attacks that apply to the given weapon (pass no weapon
 * for the class-level summary). Buff-driven riders (Hunter's Mark, Hex,
 * smites…) are NOT listed here — they come from the effect fold and render
 * as attack-table rider rows with source attribution.
 */
export function getSpecialAttacks(
  char: Pick<AttackInput, 'classId' | 'subclass' | 'level' | 'feats'>,
  weapon?: Weapon,
): SpecialAttack[] {
  const attacks: SpecialAttack[] = []
  const { level, classId, feats } = char
  const props = (weapon?.properties ?? []).map(p => p.toLowerCase())
  const isHeavy = props.includes('heavy')
  const isFinesse = props.includes('finesse')
  const isMelee = !weapon || weapon.rangeType !== 'Ranged'
  const isRanged = !weapon || weapon.rangeType === 'Ranged'

  if (classId === 'Rogue' && (!weapon || isFinesse || weapon.rangeType === 'Ranged')) {
    const isSwashbuckler = char.subclass === 'Swashbuckler'
    attacks.push({
      name: 'Sneak Attack',
      dice: `${Math.ceil(level / 2)}d6`,
      note: 'Extra damage once per turn',
      condition: isSwashbuckler
        ? 'Requires finesse/ranged weapon; advantage OR no other creature adjacent to you (Rakish Audacity)'
        : 'Requires advantage or adjacent ally, finesse/ranged weapon',
    })
  }

  if (classId === 'Barbarian' && level >= 2) {
    attacks.push({
      name: 'Reckless Attack',
      note: 'Advantage on first Str attack, attackers gain advantage vs you until next turn',
    })
  }

  if (classId === 'Barbarian' && level >= 9) {
    const extraDice = level >= 17 ? 3 : level >= 13 ? 2 : 1
    attacks.push({
      name: 'Brutal Critical',
      dice: `+${extraDice}[weapon die]`,
      note: `On a critical hit, roll ${extraDice} extra weapon damage ${extraDice === 1 ? 'die' : 'dice'}`,
    })
  }

  if (classId === 'Paladin' && level >= 2 && isMelee) {
    attacks.push({
      name: 'Divine Smite',
      dice: '2d8',
      note: 'On hit: expend spell slot for extra radiant damage',
      condition: '+1d8 per slot level above 1st (max 5d8); +1d8 vs undead/fiends',
    })
  }

  if (classId === 'Monk' && !weapon) {
    const die = level >= 17 ? 'd10' : level >= 11 ? 'd8' : level >= 5 ? 'd6' : 'd4'
    attacks.push({
      name: 'Unarmed Strike',
      dice: `1${die}`,
      note: 'Uses Dex for attack/damage; no weapon required',
    })
  }

  if (feats.includes('greatWeaponMaster') && (!weapon || (isHeavy && isMelee))) {
    attacks.push({ name: 'GWM Power Attack', note: '−5 to hit / +10 damage with heavy melee weapons' })
  }
  if (feats.includes('sharpshooter') && isRanged) {
    attacks.push({ name: 'Sharpshooter Power Attack', note: '−5 to hit / +10 damage with ranged weapons' })
  }
  if (weapon && feats.includes('piercer') && (weapon.damageType ?? '').toLowerCase() === 'piercing') {
    attacks.push({ name: 'Piercer Critical', note: 'On a piercing critical hit, roll one additional weapon damage die.' })
  }
  if (weapon && feats.includes('crusher') && (weapon.damageType ?? '').toLowerCase() === 'bludgeoning') {
    attacks.push({ name: 'Crusher Critical', note: 'On a bludgeoning critical hit, attacks against the target have advantage until your next turn.' })
  }

  return attacks
}
