import type { Character, Weapon } from '@/entities/character/types'
import { mod, effectiveAbilityScore, computeEquipmentStats } from '@/shared/data/charCalculations'
import { combineDiceExpr } from '@/shared/lib/diceExpr'
import { CLASS_BY_ID, type ClassDef } from '@/shared/data/classData'
import { SUBCLASS_BY_ID } from '@/shared/data/subclassData'
import { WEAPONS } from '@/shared/data/equipment/weapons'
import { defaultSpellSlots } from '@/shared/data/spellSlots'
import { RACE_BY_ID } from '@/shared/data/raceData'
import { computeUpcastDice, type SpellEntry } from '@/shared/data/spellData'

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

export interface SpellDamageResult {
  hitFormula: string
  missFormula: string
  dmgType: string
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

  const dmgType = spell.damageType ?? ''
  const riders = computeEquipmentStats(character).bonusDamage.filter(b => b.appliesTo === 'all')
  const sameType = riders.filter(b => b.dmgType === dmgType)
  const otherType = riders.filter(b => b.dmgType !== dmgType)

  const sameTypeParts = sameType.flatMap(b => [...b.dice, b.flat ? String(b.flat) : null]).filter(Boolean) as string[]
  const combined = sameTypeParts.length
    ? combineDiceExpr([baseDice, ...sameTypeParts].join('+'))
    : baseDice

  let hitFormula = dmgType ? `${combined} ${dmgType}` : combined
  for (const rider of otherType) {
    const parts = [...rider.dice, rider.flat ? String(rider.flat) : null].filter(Boolean) as string[]
    if (!parts.length) continue
    hitFormula += ` + ${combineDiceExpr(parts.join('+'))} ${rider.dmgType}`
  }

  let missFormula = ''
  if (spell.attackType === 'attack-roll') missFormula = '—'
  else if (spell.attackType === 'save')   missFormula = 'half'
  else if (spell.attackType === 'auto-hit') missFormula = ''

  return { hitFormula, missFormula, dmgType }
}

// ── Attack bonus ────────────────────────────────────────────────────────────

export function isProficientWithWeapon(character: Character, weapon: Weapon): boolean {
  const classDef = CLASS_BY_ID[character.classId]
  const raceDef = RACE_BY_ID[character.race]
  const effectiveProfs = [
    ...(classDef?.weaponProficiencies ?? []),
    ...(raceDef?.bonusWeaponProficiencies ?? []),
  ]
  const weaponDef = WEAPONS.find(wd => wd.name === weapon.name)
  if (!weaponDef) return true  // custom weapon: assume proficient
  // Unarmed and natural attacks are always proficient
  if (weaponDef.proficiencyCategory === 'Unarmed' || weaponDef.proficiencyCategory === 'Natural') return true
  const nameLower = weapon.name.toLowerCase()
  return effectiveProfs.some(prof => {
    const p = prof.toLowerCase()
    if (p === 'simple weapons') return weaponDef.proficiencyCategory === 'Simple'
    if (p === 'martial weapons') return weaponDef.proficiencyCategory === 'Martial'
    return p === nameLower || p === nameLower + 's'
  })
}

export function computeAttackBonus(character: Character, weapon: Weapon, opts?: { forceRanged?: boolean }): number {
  const strMod = mod(effectiveAbilityScore(character, 'str'))
  const dexMod = mod(effectiveAbilityScore(character, 'dex'))
  const props = weapon.properties ?? []
  const isFinesse = props.some(p => p.toLowerCase() === 'finesse')
  const isActuallyRanged = weapon.rangeType === 'Ranged'
  // thrown weapons count as ranged for archery, but still use STR for ability mod
  const isRangedForArchery = isActuallyRanged || opts?.forceRanged === true
  const abilityMod = isFinesse ? Math.max(strMod, dexMod) : isActuallyRanged ? dexMod : strMod
  const proficient = isProficientWithWeapon(character, weapon)
  const hasArchery = character.fightingStyle === 'archery' || character.feats.includes('archery')
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
  const strMod = mod(effectiveAbilityScore(character, 'str'))
  const dexMod = mod(effectiveAbilityScore(character, 'dex'))
  const props = (weapon.properties ?? []).map(p => p.toLowerCase())
  const isFinesse = props.some(p => p === 'finesse')
  const isRanged = weapon.rangeType === 'Ranged'
  const dmgMod = isFinesse ? Math.max(strMod, dexMod) : isRanged ? dexMod : strMod

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

export interface ActionDef {
  name: string
  type: 'Action' | 'Bonus Action' | 'Reaction' | 'Free'
  short: string
  full: string
  resourceKey?: string
  resourceCost?: number
  requiresLevel?: number
  classOnly?: string
}

const GENERIC_ACTIONS: ActionDef[] = [
  { name: 'Attack',            type: 'Action',       short: 'Make one melee or ranged attack.',                         full: 'Make one melee weapon attack, ranged weapon attack, or unarmed strike. When you have Extra Attack, you can attack multiple times instead.' },
  { name: 'Dash',              type: 'Action',       short: 'Gain extra movement equal to your speed.',                 full: 'You gain extra movement for the current turn equal to your speed (after modifiers). With 30ft speed and Dash, you can move up to 60ft this turn.' },
  { name: 'Dodge',             type: 'Action',       short: 'Attackers have disadvantage; Dex saves at advantage.',     full: 'Until the start of your next turn, any attack roll made against you has disadvantage if you can see the attacker, and you make Dexterity saving throws with advantage. Lost if incapacitated or speed drops to 0.' },
  { name: 'Help',              type: 'Action',       short: 'Ally gains advantage on next ability check or attack.',    full: 'Lend your aid to another creature. The creature you help gains advantage on the next ability check for the task you assist with, or you can aid a friendly creature attacking an enemy within 5ft of you.' },
  { name: 'Hide',              type: 'Action',       short: 'Attempt to hide (Stealth vs passive Perception).',         full: "Make a Dexterity (Stealth) check in an attempt to hide. You can't hide from a creature that can see you clearly. If successful, you gain the benefits of being hidden until you give away your position." },
  { name: 'Ready',             type: 'Action',       short: 'Choose a trigger and reaction to take when it occurs.',    full: 'Decide what perceivable circumstance will trigger your reaction, then choose the action you will take in response. When the trigger occurs, take your reaction immediately after, or ignore it.' },
  { name: 'Search',            type: 'Action',       short: 'Devote attention to finding something.',                   full: 'Devote your attention to finding something. The DM might have you make a Wisdom (Perception) or Intelligence (Investigation) check depending on the search.' },
  { name: 'Use Object',        type: 'Action',       short: 'Use an object that requires your action.',                 full: 'When an object requires your action for its use, you take the Use an Object action. Normally you interact with one object for free as part of your move or action.' },
  { name: 'Grapple',           type: 'Action',       short: 'Str (Athletics) vs Str (Athletics) or Dex (Acrobatics).',  full: "Make a Strength (Athletics) check contested by the target's Strength (Athletics) or Dexterity (Acrobatics). If you succeed, the target is grappled — its speed becomes 0." },
  { name: 'Shove',             type: 'Action',       short: 'Push 5ft away or knock prone.',                            full: "Using the Attack action, make a Str (Athletics) check contested by the target's Str (Athletics) or Dex (Acrobatics). On success, push the target 5ft away or knock it prone." },
  { name: 'Disengage',         type: 'Action',       short: 'Your movement does not provoke opportunity attacks.',      full: 'Until the end of your turn, your movement does not provoke opportunity attacks. You can still move and take other actions normally.' },
  { name: 'Escape Grapple',    type: 'Action',       short: "Str/Dex check vs grappler's Str (Athletics).",            full: "Make a Strength (Athletics) or Dexterity (Acrobatics) check contested by the grappler's Strength (Athletics). On a success you escape the grappled condition." },
  { name: 'Mount / Dismount',  type: 'Bonus Action', short: 'Climb onto or off a willing creature (costs half speed).', full: "Once during your move, you can mount a creature within 5ft of you, or dismount from it. Doing so costs an amount of movement equal to half your speed." },
  { name: 'Opportunity Attack',   type: 'Reaction', short: 'When a hostile creature moves out of your reach.',         full: 'When a hostile creature that you can see moves out of your reach, you can use your reaction to make one melee attack against that creature. The attack occurs right before it leaves your reach.' },
  { name: 'Readied Action',       type: 'Reaction', short: 'When your Ready trigger occurs, take your prepared action.', full: "When the trigger condition you declared with Ready occurs, you can take your reaction to perform the readied action — or choose to ignore it. If you readied a spell, it is released." },
]

const CAST_BONUS_SPELL: ActionDef = {
  name: 'Cast a Spell (Bonus)', type: 'Bonus Action',
  short: 'Spells with a casting time of 1 bonus action.',
  full: 'Some spells specify a casting time of 1 bonus action. If you cast a bonus action spell, you can still cast a cantrip (not a leveled spell) with your action this turn.',
}

const CAST_REACTION_SPELL: ActionDef = {
  name: 'Cast a Spell (Reaction)', type: 'Reaction',
  short: 'Some spells (Shield, Counterspell) let you react.',
  full: 'Certain spells specify a casting time of 1 reaction, triggered by a particular circumstance. You can only take one reaction per round.',
}

const CLASS_ACTIONS: ActionDef[] = [
  // Fighter
  { name: 'Second Wind',      type: 'Bonus Action', classOnly: 'Fighter', requiresLevel: 1, resourceKey: 'Second Wind', resourceCost: 1,
    short: 'Regain 1d10 + fighter level HP.',
    full: 'On your turn, as a bonus action, regain HP equal to 1d10 + your fighter level. Recharges on short or long rest.' },
  { name: 'Action Surge',     type: 'Action',       classOnly: 'Fighter', requiresLevel: 2, resourceKey: 'Action Surge', resourceCost: 1,
    short: 'Take one additional action this turn.',
    full: 'On your turn, take one additional action on top of your regular action and a possible bonus action. Recharges on short or long rest.' },
  { name: 'Extra Attack',     type: 'Free',         classOnly: 'Fighter', requiresLevel: 5,
    short: 'Attack twice when you take the Attack action.',
    full: 'Beginning at 5th level, when you take the Attack action on your turn, you can attack twice instead of once. This increases to three attacks at level 11 and four at level 20.' },
  // Barbarian
  { name: 'Rage',             type: 'Bonus Action', classOnly: 'Barbarian', requiresLevel: 1, resourceKey: 'Rage', resourceCost: 1,
    short: 'Enter a rage for 1 min (+damage, resistance to B/P/S, Str advantage).',
    full: 'On your turn, enter a rage as a bonus action. While raging: advantage on Str checks/saves, +2 damage on Str attacks (scales with level), resistance to bludgeoning/piercing/slashing. Lasts 1 minute. Recharges on long rest.' },
  // Bard
  { name: 'Bardic Inspiration', type: 'Bonus Action', classOnly: 'Bard', requiresLevel: 1, resourceKey: 'Bardic Inspiration', resourceCost: 1,
    short: 'Grant an ally a d6 inspiration die (scales with level).',
    full: 'As a bonus action, choose a creature other than yourself within 60ft who can hear you. That creature gains a Bardic Inspiration die (d6 → d8 → d10 → d12) they can add to one ability check, attack roll, or saving throw within 10 minutes.' },
  // Cleric
  { name: 'Channel Divinity', type: 'Action', classOnly: 'Cleric', requiresLevel: 2, resourceKey: 'Channel Divinity', resourceCost: 1,
    short: 'Use a divine power (varies by domain).',
    full: 'Choose a Channel Divinity option available to you based on your divine domain. All clerics have Turn Undead; your domain grants additional options. Recharges on short rest.' },
  { name: 'Turn Undead',      type: 'Action', classOnly: 'Cleric', requiresLevel: 2, resourceKey: 'Channel Divinity', resourceCost: 1,
    short: 'Wis save DC or undead within 30ft flees for 1 min.',
    full: 'As an action, present your holy symbol. Each undead that can see/hear you within 30ft must make a Wisdom saving throw (DC 8 + proficiency + Wis mod). On fail, the undead is turned for 1 minute or until it takes damage.' },
  // Druid
  { name: 'Wild Shape',       type: 'Action', classOnly: 'Druid', requiresLevel: 2, resourceKey: 'Wild Shape', resourceCost: 1,
    short: "Transform into a beast you've seen (CR ≤ ¼ at level 2).",
    full: "Magically assume the shape of a beast you've seen before. At level 2: CR ≤ ¼, no flying/swimming speed. At level 4: CR ≤ ½. You retain mental stats, class features, and languages. Lasts 1 hr per 2 druid levels. Recharges on short or long rest." },
  // Monk
  { name: 'Flurry of Blows',  type: 'Bonus Action', classOnly: 'Monk', requiresLevel: 2, resourceKey: 'Ki', resourceCost: 1,
    short: 'After Attack action: make 2 unarmed strikes. (1 Ki)',
    full: 'Immediately after you take the Attack action on your turn, spend 1 ki point to make two unarmed strikes as a bonus action.' },
  { name: 'Patient Defense',  type: 'Bonus Action', classOnly: 'Monk', requiresLevel: 2, resourceKey: 'Ki', resourceCost: 1,
    short: 'Take the Dodge action as a bonus action. (1 Ki)',
    full: 'Spend 1 ki point to take the Dodge action as a bonus action on your turn.' },
  { name: 'Step of the Wind', type: 'Bonus Action', classOnly: 'Monk', requiresLevel: 2, resourceKey: 'Ki', resourceCost: 1,
    short: 'Disengage or Dash as bonus action; jump distance doubled. (1 Ki)',
    full: 'Spend 1 ki point to take the Disengage or Dash action as a bonus action on your turn, and your jump distance is doubled until the end of the turn.' },
  { name: 'Stunning Strike',  type: 'Free', classOnly: 'Monk', requiresLevel: 5, resourceKey: 'Ki', resourceCost: 1,
    short: 'On hit: target Con save or stunned until next turn. (1 Ki)',
    full: 'When you hit a creature with a melee weapon attack, spend 1 ki point to attempt a stunning strike. The target must succeed on a Constitution saving throw (DC 8 + Prof + Wis mod) or be stunned until the start of your next turn.' },
  // Paladin
  { name: 'Divine Smite',     type: 'Free', classOnly: 'Paladin', requiresLevel: 2,
    short: 'On hit: expend spell slot → 2d8 + 1d8/slot level radiant dmg.',
    full: 'When you hit a creature with a melee weapon attack, you can expend one spell slot to deal radiant damage. The extra damage is 2d8 for a 1st-level slot, +1d8 for each slot level above 1st (max 5d8). Undead/fiends take an extra 1d8.' },
  { name: 'Lay on Hands',     type: 'Action', classOnly: 'Paladin', requiresLevel: 1, resourceKey: 'Lay on Hands', resourceCost: 5,
    short: 'Restore HP from your healing pool (5 per resource unit).',
    full: 'Touch a creature to restore any number of HP from your Lay on Hands pool (5 × paladin level total per long rest). Alternatively, spend 5 HP worth to cure one disease or neutralize one poison affecting the creature.' },
  // Rogue
  { name: 'Sneak Attack',     type: 'Free', classOnly: 'Rogue', requiresLevel: 1,
    short: 'Once per turn: +Xd6 dmg when you have advantage or an ally is adjacent.',
    full: "Once per turn, deal extra damage equal to your Sneak Attack dice (scales per 2 levels) when you have advantage OR when an ally is adjacent to the target and you don't have disadvantage. Requires a finesse or ranged weapon." },
  { name: 'Cunning Action',   type: 'Bonus Action', classOnly: 'Rogue', requiresLevel: 2,
    short: 'Dash, Disengage, or Hide as a bonus action.',
    full: 'Your quick thinking allows you to take the Dash, Disengage, or Hide action as a bonus action on each of your turns.' },
  { name: 'Uncanny Dodge',    type: 'Reaction', classOnly: 'Rogue', requiresLevel: 5,
    short: 'Halve damage from one attack you can see.',
    full: "When an attacker you can see hits you with an attack, use your reaction to halve the attack's damage against you." },
  // Sorcerer
  { name: 'Metamagic',        type: 'Free', classOnly: 'Sorcerer', requiresLevel: 3, resourceKey: 'Sorcery Points', resourceCost: 1,
    short: 'Modify a spell with Sorcery Points (1–3 pts depending on option).',
    full: 'When you cast a spell, spend sorcery points to apply a metamagic option. Careful (1pt), Distant (1pt), Empowered (1pt), Extended (1pt), Heightened (3pt), Quickened (2pt), Subtle (1pt), Twinned (spell level in pts). You chose 2 options at level 3.' },
  // Wizard
  { name: 'Arcane Recovery', type: 'Action', classOnly: 'Wizard', requiresLevel: 1,
    resourceKey: 'Arcane Recovery', resourceCost: 1,
    short: 'Short rest: recover spell slots (total levels ≤ ½ wizard level).',
    full: 'Once per day after a short rest, choose expended spell slots to recover. The combined level of the recovered slots must be equal to or lower than half your wizard level (rounded up). No slot of 6th level or higher can be recovered.' },
  // Warlock
  { name: 'Eldritch Blast',   type: 'Action', classOnly: 'Warlock', requiresLevel: 1,
    short: 'Cantrip: 1d10 force dmg. Beams scale: 1 at level 1 → 4 at level 17.',
    full: 'A beam of crackling energy streaks toward a creature within 120ft. Make a ranged spell attack. On a hit: 1d10 force damage. Creates additional beams at 5th (×2), 11th (×3), and 17th (×4) level. Each beam can target the same or different creatures.' },
]

const CAST_A_SPELL: ActionDef = {
  name: 'Cast a Spell',
  type: 'Action',
  short: 'Cast a spell with a casting time of 1 action.',
  full: "Cast any spell with a casting time of 1 action. Choose a spell you know or have prepared, expend the required spell slot (if any), and resolve its effects. Cantrips don't expend spell slots.",
}

const OFF_HAND_ACTION: ActionDef = {
  name: 'Off-Hand Attack',
  type: 'Bonus Action',
  short: 'Attack with your off-hand light weapon (no ability mod to damage).',
  full: "When you take the Attack action and attack with a light melee weapon you're holding in one hand, you can use a bonus action to attack with a different light melee weapon in your other hand. You don't add your ability modifier to the damage unless it's negative.",
}

export function getAvailableActions(character: Character): ActionDef[] {
  const classActions = CLASS_ACTIONS.filter(a => {
    if (a.classOnly && a.classOnly !== character.classId) return false
    if (a.requiresLevel && character.level < a.requiresLevel) return false
    return true
  })
  const subclassCasts = character.subclass ? !!SUBCLASS_BY_ID[character.subclass]?.spellcastingAbility : false
  const spellAction = (CLASS_BY_ID[character.classId]?.isSpellcaster || subclassCasts)
    ? [CAST_A_SPELL, CAST_BONUS_SPELL, CAST_REACTION_SPELL]
    : []

  const lightMelee = (character.weapons ?? []).filter(w =>
    w.rangeType !== 'Ranged' && (w.properties ?? []).some(p => p.toLowerCase() === 'light')
  )
  const offHandActions = lightMelee.length >= 2 ? [OFF_HAND_ACTION] : []

  const subclassActions: ActionDef[] = []
  if (character.subclass === 'Samurai' && character.level >= 3) {
    const fightingSpiritRes = character.resources?.['Fighting Spirit']
    const used = fightingSpiritRes?.used ?? 0
    const total = 3
    subclassActions.push({
      name: 'Fighting Spirit',
      type: 'Bonus Action',
      short: `Advantage on attacks + temp HP until end of turn. ${total - used}/${total} remaining.`,
      full: 'As a bonus action on your turn, you can give yourself advantage on all weapon attack rolls until the end of the current turn. When you do so, you also gain 5 temporary HP at level 3 (10 at level 10, 15 at level 15). Usable 3/long rest.',
    })
  }

  const featActions: ActionDef[] = []
  if ((character.feats ?? []).includes('sentinel')) {
    featActions.push({
      name: 'Opportunity Attack (Sentinel)', type: 'Reaction',
      short: 'OA even on Disengage; hit reduces target speed to 0.',
      full: "Sentinel feat: opportunity attacks trigger even when the creature uses Disengage. When you hit with an opportunity attack, the target's speed drops to 0 for the rest of the turn. Also lets you OA when a creature attacks a different target within 5ft.",
    })
  }
  if ((character.feats ?? []).includes('warCaster')) {
    featActions.push({
      name: 'War Caster Reaction Spell', type: 'Reaction',
      short: 'Cast a spell instead of making an opportunity attack.',
      full: 'War Caster feat: when a creature provokes an opportunity attack, you can use your reaction to cast a spell at it. The spell must target only that creature and have a casting time of 1 action.',
    })
  }

  return [...GENERIC_ACTIONS, ...offHandActions, ...spellAction, ...classActions, ...subclassActions, ...featActions]
}

export function computePreparedSpellCount(classId: string, level: number, abilityScore: number): number {
  const abilityMod = mod(abilityScore)
  if (classId === 'Paladin') return Math.max(1, Math.floor(level / 2) + abilityMod)
  if (classId === 'Cleric' || classId === 'Druid' || classId === 'Wizard') return Math.max(1, level + abilityMod)
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
    attacks.push({
      name: 'Sneak Attack',
      dice: `${diceCount}d6`,
      note: 'Extra damage once per turn',
      condition: 'Requires advantage or adjacent ally, finesse/ranged weapon',
    })
  }

  if (classId === 'Barbarian' && level >= 2) {
    attacks.push({
      name: 'Reckless Attack',
      note: 'Advantage on first Str attack, attackers gain advantage vs you until next turn',
    })
  }

  if (classId === 'Paladin' && level >= 2) {
    attacks.push({
      name: 'Divine Smite',
      dice: '2d8 radiant',
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
    attacks.push({ name: 'Sneak Attack', dice: `${Math.ceil(level / 2)}d6`,
      note: 'Once per turn — advantage or ally adjacent to target' })
  }
  if (classId === 'Barbarian' && level >= 2) {
    attacks.push({ name: 'Reckless Attack',
      note: 'Adv on first STR attack; attackers gain adv vs you' })
  }
  if (classId === 'Paladin' && level >= 2 && isMelee) {
    attacks.push({ name: 'Divine Smite', dice: '2d8 radiant',
      note: 'Expend a spell slot on hit (+1d8/level above 1st, max 5d8)' })
  }
  if (feats.includes('greatWeaponMaster') && isHeavy && isMelee) {
    attacks.push({ name: 'GWM Power Attack', note: '−5 to hit / +10 damage' })
  }
  if (feats.includes('sharpshooter') && isRanged) {
    attacks.push({ name: 'Sharpshooter', note: '−5 to hit / +10 damage' })
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
      name: 'Unarmed Strike',
      type: 'Action',
      short: '1 bludgeoning',
      full: 'Instead of using a weapon to make a melee weapon attack, you can use an unarmed strike: a punch, kick, head-butt, or similar forceful blow. On a hit, deal bludgeoning damage equal to 1 + your Strength modifier.',
    })
  } else {
    const dmgLabel = [main.damage, main.damageType].filter(Boolean).join(' ')
    actions.push({
      name: main.name,
      type: 'Action',
      short: dmgLabel,
      full: `Attack with ${main.name}.`,
    })
  }

  if (offHand) {
    const isLight = offHand.properties?.some(p => p.toLowerCase() === 'light') ?? false
    if (isLight) {
      const dmgLabel = [offHand.damage, offHand.damageType].filter(Boolean).join(' ')
      actions.push({
        name: `${offHand.name} (off-hand)`,
        type: 'Bonus Action',
        short: dmgLabel,
        full: `When you take the Attack action and attack with a light weapon, you can use a bonus action to attack with a different light weapon in your off-hand. You don't add your ability modifier to the off-hand damage unless the modifier is negative.`,
      })
    }
  }

  return actions
}
