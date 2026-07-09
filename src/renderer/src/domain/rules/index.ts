import type { Character, Weapon } from '@/entities/character/types'
import { mod, effectiveAbilityScore, computeEquipmentStats, withLiveWeaponDef } from '@/shared/data/charCalculations'
import { ACTIONS, type ActionDef } from '@/shared/data/actionsData'
export type { ActionDef } from '@/shared/data/actionsData'
import { combineDiceExpr, critDiceExpr } from '@/shared/lib/diceExpr'
import { CLASS_BY_ID, type ClassDef } from '@/shared/data/classData'
import { SUBCLASS_BY_ID } from '@/shared/data/subclassData'
import { WEAPONS } from '@/shared/data/equipment/weapons'
import { defaultSpellSlots } from '@/shared/data/spellSlots'
import { RACE_BY_ID } from '@/shared/data/raceData'
import { FEAT_BY_ID } from '@/shared/data/featsData'
import { computeUpcastDice, type SpellEntry } from '@/shared/data/spellData'
import { fightingStyleOf, hasCrusherCrit, hasPiercerCrit, hexWarriorWeaponIdOf, invocationsOf, isRaging, wildShapeFormOf } from '@/domain/character/compat'

// ── Spellcasting ────────────────────────────────────────────────────────────

export function spellcastingAbilityMod(character: Character): number {
  const subAbility = character.subclass ? SUBCLASS_BY_ID[character.subclass]?.spellcastingAbility : undefined
  const ability = subAbility ?? CLASS_BY_ID[character.classId]?.spellcastingAbility ?? 'int'
  return mod(effectiveAbilityScore(character, ability))
}

export function computeSpellSaveDC(character: Character): number {
  return 8 + character.proficiencyBonus + spellcastingAbilityMod(character)
}

export function computeSpellAttackBonus(character: Character): number {
  return character.proficiencyBonus + spellcastingAbilityMod(character)
}

export type AdvState = 'adv' | 'dis' | 'none'

export interface AttackAdvantage {
  martial: AdvState
  spell: AdvState
  sources: string[]
}

export function computeAttackAdvantage(character: Character): AttackAdvantage {
  const advSources: string[] = []
  const disSources: string[] = []

  for (const condition of character.conditionIds) {
    const id = condition.conditionId.toLowerCase()
    if (id === 'invisible') advSources.push('Advantage: invisible')
    if (['poisoned', 'blinded', 'frightened', 'prone', 'restrained', 'exhaustion'].includes(id)) {
      disSources.push(`Disadvantage: ${id}`)
    }
  }

  const martialAdvSources = [...advSources]
  if (isRaging(character)) martialAdvSources.push('Advantage: Reckless/Rage')

  function resolve(categoryAdvSources: string[]): AdvState {
    if (categoryAdvSources.length > 0 && disSources.length > 0) return 'none'
    if (categoryAdvSources.length > 0) return 'adv'
    if (disSources.length > 0) return 'dis'
    return 'none'
  }

  return {
    martial: resolve(martialAdvSources),
    spell: resolve(advSources),
    sources: [...martialAdvSources, ...disSources],
  }
}

/**
 * DC for the Arcane Archer's Arcane Shot effects (XGtE).
 * Returns null if the character isn't an Arcane Archer (or the subclass field is absent),
 * so callers can hide the DC display unless it applies.
 *
 * Arcane Archer is NOT a spellcaster — its DC uses INT but is computed separately from
 * `computeSpellSaveDC` so the action list and Vitals don't treat AA as a caster.
 */
export function computeArcaneShotDC(character: Character): number | null {
  const subclassDef = character.subclass ? SUBCLASS_BY_ID[character.subclass] : undefined
  const ability = subclassDef?.arcaneShotAbility
  if (!ability) return null
  return 8 + character.proficiencyBonus + mod(effectiveAbilityScore(character, ability))
}

export interface SpellDamageResult {
  hitFormula: string
  missFormula: string
  dmgType: string
  critFormula: string
}

/**
 * Compute the damage formula for a damage spell at a given slot level for a
 * given character, including equipment bonus damage rows that apply to all
 * damage sources. Returns hit/miss formulas and the spell's damage type.
 *
 * MVP: per RAW none of the MVP spells (Fire Bolt, Fireball, Magic Missile,
 * Cone of Cold, Shatter) add the spellcasting ability mod to direct damage,
 * so it is not added here.
 */
export function computeSpellDamage(
  spell: SpellEntry,
  slotLevel: number,
  character: Character,
): SpellDamageResult {
  let baseDice: string

  if (spell.id === 'magic-missile') {
    const darts = 3 + Math.max(0, slotLevel - 1)
    baseDice = `${darts}d4 + ${darts}`
  } else if (spell.id === 'fire-bolt') {
    const lvl = character.level
    const tier = lvl >= 17 ? 4 : lvl >= 11 ? 3 : lvl >= 5 ? 2 : 1
    baseDice = `${tier}d10`
  } else if (spell.damageFormula) {
    baseDice = spell.damageFormula
  } else if (spell.scalingDice) {
    baseDice = computeUpcastDice(spell.scalingDice, slotLevel)
  } else {
    baseDice = '—'
  }

  // Agonizing Blast (Eldritch Invocation): add CHA mod to each Eldritch
  // Blast beam. Keyed on the known-invocation list, not the class — any
  // character granted the invocation gets the damage.
  if (spell.id === 'eldritch-blast' && invocationsOf(character).includes('agonizingBlast')) {
    const chaMod = mod(effectiveAbilityScore(character, 'cha'))
    if (chaMod !== 0) baseDice = combineDiceExpr(`${baseDice} + ${chaMod}`)
  }

  const dmgType = spell.damageType ?? ''
  const riders = computeEquipmentStats(character).bonusDamage.filter(b => b.appliesTo === 'all')
  const sameType = riders.filter(b => b.dmgType === dmgType)
  const otherType = riders.filter(b => b.dmgType !== dmgType)

  const sameTypeParts = sameType.flatMap(b => [...b.dice, b.flat ? String(b.flat) : null]).filter(Boolean) as string[]
  const combined = sameTypeParts.length
    ? combineDiceExpr([baseDice, ...sameTypeParts].join('+'))
    : baseDice

  const hitParts: { expr: string; type: string }[] = []
  let hitFormula = dmgType ? `${combined} ${dmgType}` : combined
  if (dmgType && combined !== '—') hitParts.push({ expr: combined, type: dmgType })
  for (const rider of otherType) {
    const parts = [...rider.dice, rider.flat ? String(rider.flat) : null].filter(Boolean) as string[]
    if (!parts.length) continue
    const expr = combineDiceExpr(parts.join('+'))
    hitParts.push({ expr, type: rider.dmgType })
    hitFormula += ` + ${expr} ${rider.dmgType}`
  }

  let missFormula = ''
  if (spell.attackType === 'attack-roll') missFormula = '—'
  else if (spell.attackType === 'save')   missFormula = 'half'
  else if (spell.attackType === 'auto-hit') missFormula = ''

  const critFormula = spell.attackType === 'attack-roll'
    ? hitParts.map(part => `${critDiceExpr(part.expr)} ${part.type}`).join(' + ')
    : ''

  return { hitFormula, missFormula, dmgType, critFormula }
}

// ── Attack bonus ────────────────────────────────────────────────────────────

export function isProficientWithWeapon(character: Character, weapon: Weapon): boolean {
  const classDef = CLASS_BY_ID[character.classId]
  const raceDef = RACE_BY_ID[character.race]
  const subclassDef = character.subclass ? SUBCLASS_BY_ID[character.subclass] : undefined
  const effectiveProfs = [
    ...(classDef?.weaponProficiencies ?? []),
    ...(raceDef?.bonusWeaponProficiencies ?? []),
    ...(subclassDef?.extraWeaponProficiencies ?? []),
    ...character.feats.flatMap(featId => FEAT_BY_ID[featId]?.grantsProficiencies?.weapons ?? []),
  ]
  const weaponDef = WEAPONS.find(wd => wd.name === weapon.name)
  if (!weaponDef) return true  // custom weapon: assume proficient
  // Unarmed and natural attacks are always proficient
  if (weaponDef.proficiencyCategory === 'Unarmed' || weaponDef.proficiencyCategory === 'Natural') return true
  const nameLower = weapon.name.toLowerCase()
  return effectiveProfs.some(prof => {
    const p = prof.toLowerCase()
    if (p === 'simple' || p === 'simple weapons') return weaponDef.proficiencyCategory === 'Simple'
    if (p === 'martial' || p === 'martial weapons') return weaponDef.proficiencyCategory === 'Martial'
    return p === nameLower || p === nameLower + 's'
  })
}

export function computeAttackBonus(character: Character, weapon: Weapon, opts?: { forceRanged?: boolean }): number {
  weapon = withLiveWeaponDef(weapon)
  const strMod = mod(effectiveAbilityScore(character, 'str'))
  const dexMod = mod(effectiveAbilityScore(character, 'dex'))
  const chaMod = mod(effectiveAbilityScore(character, 'cha'))
  const props = weapon.properties ?? []
  const isFinesse = props.some(p => p.toLowerCase() === 'finesse')
  const isActuallyRanged = weapon.rangeType === 'Ranged'
  // thrown weapons count as ranged for archery, but still use STR for ability mod
  const isRangedForArchery = isActuallyRanged || opts?.forceRanged === true
  // Hexblade Hex Warrior: bonded weapon uses CHA for attack rolls
  const isHexWarriorWeapon = hexWarriorWeaponIdOf(character) === weapon.id
  const abilityMod = isHexWarriorWeapon
    ? Math.max(strMod, dexMod, chaMod)
    : isFinesse ? Math.max(strMod, dexMod) : isActuallyRanged ? dexMod : strMod
  const proficient = isProficientWithWeapon(character, weapon)
  const hasArchery = fightingStyleOf(character) === 'archery' || character.feats.includes('archery')
  const archeryBonus = hasArchery && isRangedForArchery ? 2 : 0
  // Equipment to-hit bonuses are surfaced on their own attack-table rows, not folded in here.
  return abilityMod + (proficient ? character.proficiencyBonus : 0) + (weapon.atkBonus ?? 0) + (weapon.enchantmentBonus ?? 0) + (weapon.toHitFlat ?? 0) + archeryBonus
}

/**
 * Builds the full damage expression for a weapon: weapon dice (versatile-aware),
 * weapon bonus damage, enchantment, the effective ability modifier, and any
 * equipped accessory damage riders whose `appliesTo` matches the weapon's range
 * type. Riders that share the weapon's damage type fold into the base expression;
 * riders of a different type are appended as separate ` + <expr> <type>` segments.
 */
export function computeWeaponDamage(character: Character, weapon: Weapon): string {
  weapon = withLiveWeaponDef(weapon)
  const strMod = mod(effectiveAbilityScore(character, 'str'))
  const dexMod = mod(effectiveAbilityScore(character, 'dex'))
  const chaMod = mod(effectiveAbilityScore(character, 'cha'))
  const props = (weapon.properties ?? []).map(p => p.toLowerCase())
  const isFinesse = props.some(p => p === 'finesse')
  const isRanged = weapon.rangeType === 'Ranged'
  // Hexblade Hex Warrior: bonded weapon uses CHA for damage rolls
  const isHexWarriorWeapon = hexWarriorWeaponIdOf(character) === weapon.id
  const dmgMod = isHexWarriorWeapon
    ? Math.max(strMod, dexMod, chaMod)
    : isFinesse ? Math.max(strMod, dexMod) : isRanged ? dexMod : strMod

  const versatileDie = props.find(p => p.startsWith('versatile ('))?.match(/versatile \((\d+d\d+)\)/)?.[1]
  const baseDie = (versatileDie && weapon.twoHanded) ? versatileDie : weapon.damage
  const enchBonus = (weapon.enchantmentBonus ?? 0) + (weapon.dmgBonusFlat ?? 0)

  const matchKind = isRanged ? 'ranged' : 'melee'
  const riders = computeEquipmentStats(character).bonusDamage.filter(
    b => b.appliesTo === 'all' || b.appliesTo === matchKind,
  )
  const weaponType = weapon.damageType ?? ''
  const sameType = riders.filter(b => b.dmgType === weaponType)
  const otherType = riders.filter(b => b.dmgType !== weaponType)

  const baseParts = [
    baseDie && baseDie !== '—' ? baseDie : null,
    weapon.bonusDamageDie ?? null,
    weapon.dmgBonusCount && weapon.dmgBonusDieType ? `${weapon.dmgBonusCount}d${weapon.dmgBonusDieType}` : null,
    ...sameType.flatMap(b => [...b.dice, b.flat ? String(b.flat) : null]),
    dmgMod + enchBonus !== 0 ? String(dmgMod + enchBonus) : null,
  ].filter(Boolean) as string[]

  const baseExpr = baseParts.length ? combineDiceExpr(baseParts.join('+')) : '—'
  let result = weaponType ? `${baseExpr} ${weaponType}` : baseExpr

  for (const rider of otherType) {
    const riderParts = [...rider.dice, rider.flat ? String(rider.flat) : null].filter(Boolean) as string[]
    if (!riderParts.length) continue
    result += ` + ${combineDiceExpr(riderParts.join('+'))} ${rider.dmgType}`
  }
  return result
}

// ── Class-contextual actions ────────────────────────────────────────────────



const CAST_BONUS_SPELL: ActionDef = {
  id: 'cast-a-spell-bonus',
  name: 'Cast a Spell (Bonus)', type: 'Bonus Action',
  short: 'Spells with a casting time of 1 bonus action.',
  full: 'Some spells specify a casting time of 1 bonus action. If you cast a bonus action spell, you can still cast a cantrip (not a leveled spell) with your action this turn.',
}

const CAST_REACTION_SPELL: ActionDef = {
  id: 'cast-a-spell-reaction',
  name: 'Cast a Spell (Reaction)', type: 'Reaction',
  short: 'Some spells (Shield, Counterspell) let you react.',
  full: 'Certain spells specify a casting time of 1 reaction, triggered by a particular circumstance. You can only take one reaction per round.',
}


/**
 * Off-hand (two-weapon fighting) eligibility: a one-handed melee weapon with
 * the Light property — or any one-handed melee weapon with the Dual Wielder
 * feat. Anyone can dual wield; no class involved.
 */
export function canDualWield(character: Pick<Character, 'feats'>, w: Weapon): boolean {
  w = withLiveWeaponDef(w)
  const props = (w.properties ?? []).map(p => p.toLowerCase())
  if (w.rangeType === 'Ranged') return false
  if (props.some(p => p.includes('two-handed'))) return false
  return props.some(p => p === 'light') || character.feats.includes('dualWielder')
}

const CAST_A_SPELL: ActionDef = {
  id: 'cast-a-spell',
  name: 'Cast a Spell',
  type: 'Action',
  short: 'Cast a spell with a casting time of 1 action.',
  full: "Cast any spell with a casting time of 1 action. Choose a spell you know or have prepared, expend the required spell slot (if any), and resolve its effects. Cantrips don't expend spell slots.",
}

function makeOffHandAction(character: Character): ActionDef {
  const hasTWF = fightingStyleOf(character) === 'two-weapon-fighting'
  return {
    id: 'off-hand-attack',
    name: 'Off-Hand Attack',
    type: 'Bonus Action',
    short: hasTWF
      ? 'Attack with your off-hand light weapon (Two-Weapon Fighting: ability mod added).'
      : 'Attack with your off-hand light weapon (no ability mod to damage).',
    full: hasTWF
      ? "When you take the Attack action and attack with a light melee weapon you're holding in one hand, you can use a bonus action to attack with a different light melee weapon in your other hand. Thanks to your Two-Weapon Fighting style, you add your ability modifier to the off-hand damage roll."
      : "When you take the Attack action and attack with a light melee weapon you're holding in one hand, you can use a bonus action to attack with a different light melee weapon in your other hand. You don't add your ability modifier to the damage unless it's negative.",
    requiresAttackThisTurn: true,
  }
}

/** Returns the minimum d20 roll needed to score a critical hit (normally 20; Champion reduces it, weapons/gear may further reduce it). */
export function computeCritThreshold(character: Character, opts?: { weaponCritMod?: number; gearCritMods?: number[] }): number {
  let threshold = 20

  if (character.subclass === 'Champion') {
    if (character.level >= 15) threshold = 18
    else if (character.level >= 3) threshold = 19
  }

  // Apply weapon crit modifier (reduces threshold)
  if (opts?.weaponCritMod && opts.weaponCritMod !== 0) {
    threshold = Math.max(10, threshold - opts.weaponCritMod)
  }

  // Apply gear crit modifiers (stack them, all reduce threshold)
  if (opts?.gearCritMods && opts.gearCritMods.length > 0) {
    const totalGearMod = opts.gearCritMods.reduce((a, b) => a + b, 0)
    threshold = Math.max(10, threshold - totalGearMod)
  }

  return threshold
}

export function critExtraDice(
  character: Character,
  weapon: Weapon,
  weaponDamageType: string,
): { expr: string; type: string }[] {
  const extras: { expr: string; type: string }[] = []
  const weaponDie = weapon.damage
  const normalizedType = weaponDamageType.toLowerCase()

  if (hasPiercerCrit(character) && normalizedType === 'piercing') {
    extras.push({ expr: weaponDie, type: 'piercing' })
  }

  if (character.classId === 'Barbarian') {
    const extraDice = character.level >= 17 ? 3 : character.level >= 13 ? 2 : character.level >= 9 ? 1 : 0
    if (extraDice > 0) {
      const match = weaponDie.match(/^(\d+)d(\d+)$/)
      const expr = match ? `${Number(match[1]) * extraDice}d${match[2]}` : weaponDie
      extras.push({ expr, type: weaponDamageType })
    }
  }

  if (character.race === 'HalfOrc' && weapon.rangeType !== 'Ranged') {
    extras.push({ expr: weaponDie, type: weaponDamageType })
  }

  // Equipment crit-only damage riders (gear or weapon stat blocks).
  for (const crit of computeEquipmentStats(character).critBonusDamage) {
    const parts = [...crit.dice, crit.flat ? String(crit.flat) : null].filter(Boolean) as string[]
    if (parts.length) extras.push({ expr: parts.join('+'), type: crit.dmgType })
  }

  return extras
}

export function computeAttackCount(character: Character): number {
  let attackCount = 1
  if (character.classId === 'Fighter') {
    if (character.level >= 20) attackCount = 4
    else if (character.level >= 11) attackCount = 3
    else if (character.level >= 5) attackCount = 2
  } else if ((character.classId === 'Barbarian' || character.classId === 'Paladin' || character.classId === 'Ranger' || character.classId === 'Monk') && character.level >= 5) {
    attackCount = 2
  } else if (character.subclass === 'Bladesinger' && character.level >= 6) {
    attackCount = 2
  }
  return attackCount
}

function destroyUndeadCRThreshold(level: number): string | null {
  if (level >= 17) return '4'
  if (level >= 14) return '3'
  if (level >= 11) return '2'
  if (level >= 8)  return '1'
  if (level >= 5)  return '½'
  return null
}

export function getAvailableActions(character: Character): ActionDef[] {
  const classActions = ACTIONS.filter(a => !a.generic).filter(a => {
    if (a.classOnly && a.classOnly !== character.classId) return false
    if (a.requiresLevel && character.level < a.requiresLevel) return false
    return true
  })
  const subclassCasts = character.subclass ? !!SUBCLASS_BY_ID[character.subclass]?.spellcastingAbility : false
  // RAW: you can't cast spells while in Wild Shape until Beast Spells
  // (druid 18) — the Cast a Spell actions disappear while a form is active.
  const shapedNoCasting = !!wildShapeFormOf(character) && character.level < 18
  const spellAction = (CLASS_BY_ID[character.classId]?.isSpellcaster || subclassCasts) && !shapedNoCasting
    ? [CAST_A_SPELL, CAST_BONUS_SPELL, CAST_REACTION_SPELL]
    : []

  const offHandCapable = (character.weapons ?? []).filter(w => canDualWield(character, w))
  const offHandActions = offHandCapable.length >= 2 ? [makeOffHandAction(character)] : []

  const subclassActions: ActionDef[] = []

  // Cleric: Turn Undead (dynamic so Destroy Undead threshold can be level-aware)
  if (character.classId === 'Cleric' && character.level >= 2) {
    const crThreshold = destroyUndeadCRThreshold(character.level)
    const destroyNote = crThreshold
      ? ` At your level, undead of CR ${crThreshold} or lower are destroyed outright on a failed save.`
      : ''
    subclassActions.push({
      id: 'turn-undead-action',
      name: 'Turn Undead',
      type: 'Action',
      short: 'Wis save DC or undead within 30ft flees for 1 min.',
      full: `As an action, present your holy symbol. Each undead that can see/hear you within 30ft must make a Wisdom saving throw (DC 8 + proficiency + Wis mod). On fail, the undead is turned for 1 minute or until it takes damage.${destroyNote}`,
      resourceKey: 'Channel Divinity',
      resourceCost: 1,
    })
  }

  // Cleric War Domain: War Priest (bonus-action weapon attack after casting a spell)
  if (character.subclass === 'WarDomain' && character.level >= 1) {
    const wisMod = mod(effectiveAbilityScore(character, 'wis'))
    const total = Math.max(1, wisMod)
    const used = character.resources?.['War Priest']?.used ?? 0
    subclassActions.push({
      id: 'war-priest',
      name: 'War Priest',
      type: 'Bonus Action',
      short: `Make a weapon attack after casting a spell. ${total - used}/${total} remaining.`,
      full: `When you cast a spell on your turn, you can use a bonus action to make one weapon attack. Uses = your Wisdom modifier (minimum 1) per long rest.`,
      resourceKey: 'War Priest',
      resourceCost: 1,
    })
  }

  // Fighter: Samurai Fighting Spirit
  if (character.subclass === 'EchoKnight' && character.level >= 3) {
    subclassActions.push({
      id: 'manifest-echo',
      name: 'Manifest Echo',
      type: 'Bonus Action',
      short: 'Manifest a spectral echo in an unoccupied space within 15 ft.',
      full: "As a bonus action, magically manifest an echo of yourself in an unoccupied space you can see within 15 ft. The echo has AC 11 + your proficiency bonus, 1 HP, and uses the summon tracker.",
    })
  }

  if (character.subclass === 'Samurai' && character.level >= 3) {
    const fightingSpiritRes = character.resources?.['Fighting Spirit']
    const used = fightingSpiritRes?.used ?? 0
    const total = 3
    subclassActions.push({
      id: 'fighting-spirit',
      name: 'Fighting Spirit',
      type: 'Bonus Action',
      short: `Advantage on attacks + temp HP until end of turn. ${total - used}/${total} remaining.`,
      full: 'As a bonus action on your turn, you can give yourself advantage on all weapon attack rolls until the end of the current turn. When you do so, you also gain 5 temporary HP at level 3 (10 at level 10, 15 at level 15). Usable 3/long rest.',
    })
  }

  // Warlock: Mystic Arcanum (one free 6th/7th/8th/9th-level spell cast per long rest, per tier)
  if (character.classId === 'Warlock') {
    const arcanumTiers: Array<{ slotLevel: number; requiresLevel: number }> = [
      { slotLevel: 6, requiresLevel: 11 },
      { slotLevel: 7, requiresLevel: 13 },
      { slotLevel: 8, requiresLevel: 15 },
      { slotLevel: 9, requiresLevel: 17 },
    ]
    for (const { slotLevel, requiresLevel } of arcanumTiers) {
      if (character.level >= requiresLevel) {
        const key = `Mystic Arcanum ${slotLevel}`
        const res = character.resources?.[key]
        const used = res?.used ?? 0
        const total = res?.total ?? 1
        subclassActions.push({
          id: `mystic-arcanum-${slotLevel}`,
          name: `Mystic Arcanum (${slotLevel}th)`,
          type: 'Action',
          short: `Cast your ${slotLevel}th-level arcanum spell without expending a slot. ${total - used}/${total} remaining.`,
          full: `Choose a spell of ${slotLevel}th level from your class spell list (decided when you gain this feature). You can cast it once without expending a spell slot. You regain this ability after a long rest.`,
          resourceKey: key,
          resourceCost: 1,
        })
      }
    }
  }

  const featActions: ActionDef[] = []
  if ((character.feats ?? []).includes('sentinel')) {
    featActions.push({
      id: 'opportunity-attack-sentinel',
      name: 'Opportunity Attack (Sentinel)', type: 'Reaction',
      short: 'OA even on Disengage; hit reduces target speed to 0.',
      full: "Sentinel feat: opportunity attacks trigger even when the creature uses Disengage. When you hit with an opportunity attack, the target's speed drops to 0 for the rest of the turn. Also lets you OA when a creature attacks a different target within 5ft.",
    })
  }
  if ((character.feats ?? []).includes('warCaster')) {
    featActions.push({
      id: 'war-caster-reaction-spell',
      name: 'War Caster Reaction Spell', type: 'Reaction',
      short: 'Cast a spell instead of making an opportunity attack.',
      full: 'War Caster feat: when a creature provokes an opportunity attack, you can use your reaction to cast a spell at it. The spell must target only that creature and have a casting time of 1 action.',
    })
  }

  const attackCount = computeAttackCount(character)

  const allActions = [...ACTIONS.filter(a => a.generic), ...offHandActions, ...spellAction, ...classActions, ...subclassActions, ...featActions]

  // Update Attack action short description if extra attacks available
  if (attackCount > 1) {
    const attackActionIndex = allActions.findIndex(a => a.name === 'Attack')
    if (attackActionIndex !== -1) {
      const attackAction = allActions[attackActionIndex]
      allActions[attackActionIndex] = {
        ...attackAction,
        short: `Make ${attackCount === 2 ? 'two' : attackCount === 3 ? 'three' : 'four'} melee or ranged attacks.`,
      }
    }
  }

  return allActions
}

export function computePreparedSpellCount(classId: string, level: number, abilityScore: number): number {
  const abilityMod = mod(abilityScore)
  if (classId === 'Paladin') return Math.max(1, Math.floor(level / 2) + abilityMod)
  // Cleric/Druid/Wizard/Artificer prepare (level + spellcasting modifier).
  if (classId === 'Cleric' || classId === 'Druid' || classId === 'Wizard' || classId === 'Artificer') return Math.max(1, level + abilityMod)
  return 0
}

// ── Spell level-up logic ────────────────────────────────────────────────────

export function spellsKnownAt(level: number, table: Partial<Record<number, number>>): number {
  let count = 0
  for (let l = 1; l <= level; l++) {
    if (table[l] !== undefined) count = table[l]!
  }
  return count
}

export interface SpellLevelUpConfig {
  spellsDelta: number
  cantripsDelta: number
  maxSlotLevel: number
}

export function computeSpellLevelUpConfig(classDef: ClassDef, oldLevel: number, newLevel: number, subclassId?: string): SpellLevelUpConfig {
  const subclassDef = subclassId ? SUBCLASS_BY_ID[subclassId] : undefined
  const knownTable = subclassDef?.spellsKnownTable ?? classDef.spellsKnownTable ?? {}
  const spellsDelta = Math.max(0,
    spellsKnownAt(newLevel, knownTable) -
    spellsKnownAt(oldLevel, knownTable)
  )
  const cantripTable = subclassDef?.cantripsKnownTable ?? classDef.cantripsKnownTable ?? {}
  const cantripsDelta = Math.max(0,
    spellsKnownAt(newLevel, cantripTable) -
    spellsKnownAt(oldLevel, cantripTable)
  )
  let maxSlotLevel: number
  if (subclassDef?.spellsKnownTable) {
    const slots = defaultSpellSlots(classDef.id, newLevel, subclassId)
    const levels = Object.keys(slots).map(Number)
    maxSlotLevel = levels.length > 0 ? Math.max(...levels) : 1
  } else {
    maxSlotLevel = Math.min(9, Math.ceil(newLevel / 2))
  }
  return { spellsDelta, cantripsDelta, maxSlotLevel }
}

// ── Special attacks ─────────────────────────────────────────────────────────

export interface SpecialAttack {
  name: string
  dice?: string
  note: string
  condition?: string
}

/** Spell IDs that use an attack roll (ranged or melee spell attack). */
export const SPELL_ATTACK_IDS = new Set([
  'fire-bolt', 'ray-of-frost', 'chill-touch', 'eldritch-blast',
  'guiding-bolt', 'inflict-wounds', 'spiritual-weapon',
  'toll-the-dead', 'booming-blade',
])

export function getSpecialAttacks(character: Character): SpecialAttack[] {
  const attacks: SpecialAttack[] = []
  const { level, classId, feats = [], spellIds = [] } = character

  if (classId === 'Rogue') {
    const diceCount = Math.ceil(level / 2)
    const isSwashbuckler = character.subclass === 'Swashbuckler'
    attacks.push({
      name: 'Sneak Attack',
      dice: `${diceCount}d6`,
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

  if (classId === 'Paladin' && level >= 2) {
    attacks.push({
      name: 'Divine Smite',
      dice: '2d8',
      note: 'On hit: expend spell slot for extra radiant damage',
      condition: '+1d8 per slot level above 1st (max 5d8); +1d8 vs undead/fiends',
    })
  }

  if (classId === 'Monk') {
    const die = level >= 17 ? 'd10' : level >= 11 ? 'd8' : level >= 5 ? 'd6' : 'd4'
    attacks.push({
      name: 'Unarmed Strike',
      dice: `1${die}`,
      note: 'Uses Dex for attack/damage; no weapon required',
    })
  }

  if (feats.includes('greatWeaponMaster')) {
    attacks.push({
      name: 'GWM Power Attack',
      note: '−5 to hit / +10 damage with heavy melee weapons',
    })
  }

  if (feats.includes('sharpshooter')) {
    attacks.push({
      name: 'Sharpshooter Power Attack',
      note: '−5 to hit / +10 damage with ranged weapons',
    })
  }

  if (classId === 'Ranger' && spellIds.includes('hunter-s-mark')) {
    attacks.push({
      name: "Hunter's Mark",
      dice: '+1d6',
      note: 'Extra damage each hit against your marked target',
    })
  }

  return attacks
}

export function getWeaponSpecialAttacks(character: Character, weapon: Weapon): SpecialAttack[] {
  const attacks: SpecialAttack[] = []
  const { level, classId, feats = [], spellIds = [] } = character
  const props = (weapon.properties ?? []).map(p => p.toLowerCase())
  const isHeavy = props.includes('heavy')
  const isFinesse = props.includes('finesse')
  const isMelee = weapon.rangeType !== 'Ranged'
  const isRanged = weapon.rangeType === 'Ranged'

  if (classId === 'Rogue' && (isFinesse || isRanged)) {
    const isSwashbuckler = character.subclass === 'Swashbuckler'
    attacks.push({ name: 'Sneak Attack', dice: `${Math.ceil(level / 2)}d6`,
      note: isSwashbuckler
        ? 'Once per turn — advantage, ally adjacent, or one-on-one (Rakish Audacity)'
        : 'Once per turn — advantage or ally adjacent to target' })
  }
  if (classId === 'Barbarian' && level >= 2) {
    attacks.push({ name: 'Reckless Attack',
      note: 'Adv on first STR attack; attackers gain adv vs you' })
  }
  if (classId === 'Paladin' && level >= 2 && isMelee) {
    attacks.push({ name: 'Divine Smite', dice: '2d8',
      note: 'Expend a spell slot on hit (+1d8/level above 1st, max 5d8)' })
  }
  if (feats.includes('greatWeaponMaster') && isHeavy && isMelee) {
    attacks.push({ name: 'GWM Power Attack', note: '−5 to hit / +10 damage' })
  }
  if (feats.includes('sharpshooter') && isRanged) {
    attacks.push({ name: 'Sharpshooter', note: '−5 to hit / +10 damage' })
  }
  if (hasPiercerCrit(character) && (weapon.damageType ?? '').toLowerCase() === 'piercing') {
    attacks.push({ name: 'Piercer Critical', note: 'On a piercing critical hit, roll one additional weapon damage die.' })
  }
  if (hasCrusherCrit(character) && (weapon.damageType ?? '').toLowerCase() === 'bludgeoning') {
    attacks.push({ name: 'Crusher Critical', note: 'On a bludgeoning critical hit, attacks against the target have advantage until your next turn.' })
  }
  if (classId === 'Ranger' && spellIds.includes('hunter-s-mark')) {
    attacks.push({ name: "Hunter's Mark", dice: '+1d6', note: 'Per attack on marked target' })
  }
  return attacks
}

// ── XP thresholds ────────────────────────────────────────────────────────────

const XP_THRESHOLDS: Record<number, number> = {
  1: 0, 2: 300, 3: 900, 4: 2700, 5: 6500, 6: 14000, 7: 23000, 8: 34000,
  9: 48000, 10: 64000, 11: 85000, 12: 100000, 13: 120000, 14: 140000,
  15: 165000, 16: 195000, 17: 225000, 18: 265000, 19: 305000, 20: 355000,
}

export function xpForLevel(level: number): number {
  return XP_THRESHOLDS[Math.min(20, Math.max(1, level))] ?? 0
}

export function xpForNextLevel(level: number): number | null {
  if (level >= 20) return null
  return XP_THRESHOLDS[level + 1] ?? null
}

// ── Weapon-derived attack actions ───────────────────────────────────────────

export function getWeaponAttackActions(char: Character): ActionDef[] {
  const actions: ActionDef[] = []
  const main = char.weapons[0]
  const offHand = char.weapons[1]

  if (!main) {
    actions.push({
      id: 'unarmed-strike',
      name: 'Unarmed Strike',
      type: 'Action',
      short: '1 bludgeoning',
      full: 'Instead of using a weapon to make a melee weapon attack, you can use an unarmed strike: a punch, kick, head-butt, or similar forceful blow. On a hit, deal bludgeoning damage equal to 1 + your Strength modifier.',
    })
  } else {
    const dmgLabel = [main.damage, main.damageType].filter(Boolean).join(' ')
    actions.push({
      id: `weapon-${main.id}`,
      name: main.name,
      type: 'Action',
      short: dmgLabel,
      full: `Attack with ${main.name}.`,
    })
  }

  if (offHand) {
    const isLight = canDualWield(char, offHand)
    if (isLight) {
      const dmgLabel = [offHand.damage, offHand.damageType].filter(Boolean).join(' ')
      actions.push({
        id: `weapon-offhand-${offHand.id}`,
        name: `${offHand.name} (off-hand)`,
        type: 'Bonus Action',
        short: dmgLabel,
        full: `When you take the Attack action and attack with a light weapon, you can use a bonus action to attack with a different light weapon in your off-hand. You don't add your ability modifier to the off-hand damage unless the modifier is negative.`,
      })
    }
  }

  return actions
}
