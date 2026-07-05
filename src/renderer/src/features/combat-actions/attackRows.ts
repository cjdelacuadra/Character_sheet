/**
 * Attack-table row machinery, extracted from ActionDetailPanel (decomposition
 * step 1): pure row builders, to-hit/damage formatting, consumption metadata.
 * No component state — everything here is a function of the character.
 */
import type { Character, Weapon, Equipment } from '@/entities/character/types'
import { GEAR_BY_ID } from '@/shared/data/equipment/gear'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { computeAttackBonus, computeSpellAttackBonus, isProficientWithWeapon, getSpecialAttacks, getWeaponSpecialAttacks, SPELL_ATTACK_IDS } from '@/domain/rules'
import { mod, effectiveAbilityScore } from '@/shared/data/charCalculations'
import { combineDiceExpr, critDiceExpr } from '@/shared/lib/diceExpr'
import { SPELL_BY_ID } from '@/shared/data/spellData'
import { MANEUVER_BY_ID } from '@/shared/data/maneuversData'
import { ARCANE_SHOT_BY_ID } from '@/shared/data/arcaneShotsData'
import { activeArcaneShotOf, activeManeuverOf, fightingStyleOf } from '@/domain/character/compat'

export function fmtMod(n: number) { return n >= 0 ? `+${n}` : String(n) }

export function spellSniperRange(spell: { id: string; range: string }, enabled?: boolean): string {
  if (!enabled || !SPELL_ATTACK_IDS.has(spell.id)) return spell.range
  const doubled = spell.range.replace(/(\d+)\s*ft/g, (_, n: string) => `${Number(n) * 2}ft`)
  return `${doubled} · Spell Sniper: ignores 1/2 & 3/4 cover`
}

export interface AttackRow {
  id: string
  name: string
  toHit: number | null
  toHitDice?: string | null
  dmg: string | null
  dmgType: string | null
  bonusDmg: string | null
  bonusDmgType: string | null
  disabled?: boolean
  group?: 'melee' | 'ranged' | 'both'
  note?: string
}

export function dmgSubtotals(rows: AttackRow[], isActive: (id: string) => boolean): { expr: string; type: string }[] {
  const byType = new Map<string, string[]>()
  for (const row of rows) {
    if (!isActive(row.id)) continue
    if (row.dmg && row.dmg !== '—' && row.dmgType) {
      byType.set(row.dmgType, [...(byType.get(row.dmgType) ?? []), row.dmg])
    }
    if (row.bonusDmg && row.bonusDmgType && row.bonusDmgType !== 'to hit') {
      byType.set(row.bonusDmgType, [...(byType.get(row.bonusDmgType) ?? []), row.bonusDmg])
    }
  }
  return Array.from(byType.entries()).map(([type, parts]) => ({
    type,
    expr: combineDiceExpr(parts.join('+')),
  }))
}

export function formatToHitParts(toHit: number | null, diceParts: string[]): string {
  const flat =
    toHit !== null && toHit !== 0
      ? toHit > 0 ? `+ ${toHit}` : `- ${Math.abs(toHit)}`
      : null
  const parts = ['1d20', ...diceParts.map(d => `+ ${d}`), flat].filter(Boolean)
  return parts.join(' ') || '\u2014'
}

export function formatToHitRider(toHit: number | null, diceParts: string[]): string {
  const flat =
    toHit !== null && toHit !== 0
      ? toHit > 0 ? `+ ${toHit}` : `- ${Math.abs(toHit)}`
      : null
  const parts = [...diceParts.map(d => `+ ${d}`), flat].filter(Boolean)
  return parts.length ? parts.join(' ') : '—'
}

export const BASE_ATTACK_ROW_IDS = new Set(['normal', 'versatile', 'thrown'])

export type AttackConsumption =
  | { kind: 'economy'; slot: 'action' | 'bonus' | 'reaction'; attacksOverride?: number }
  | { kind: 'resource'; resourceKey: string; cost: number }
  | { kind: 'oncePerTurn'; resourceKey: string }
  | { kind: 'spellSlot' }

export const ATTACK_CONSUMPTION: Record<string, AttackConsumption> = {
  'booming-blade': { kind: 'economy', slot: 'action', attacksOverride: 1 },
  'maneuver-*': { kind: 'resource', resourceKey: 'Superiority Dice', cost: 1 },
  'arcane-*': { kind: 'resource', resourceKey: 'Arcane Shot', cost: 1 },
  'Sneak Attack': { kind: 'oncePerTurn', resourceKey: 'Sneak Attack' },
  'Divine Smite': { kind: 'spellSlot' },
}

export function getAttackConsumption(rowId: string): AttackConsumption | undefined {
  if (rowId.startsWith('maneuver-')) return ATTACK_CONSUMPTION['maneuver-*']
  if (rowId.startsWith('arcane-')) return ATTACK_CONSUMPTION['arcane-*']
  return ATTACK_CONSUMPTION[rowId]
}

export function criticalSubtotals(
  subtotals: { expr: string; type: string }[],
  extras: { expr: string; type: string }[],
): { expr: string; type: string }[] {
  const byType = new Map<string, string[]>()
  for (const subtotal of subtotals) {
    byType.set(subtotal.type, [...(byType.get(subtotal.type) ?? []), critDiceExpr(subtotal.expr)])
  }
  for (const extra of extras) {
    byType.set(extra.type, [...(byType.get(extra.type) ?? []), extra.expr])
  }
  return Array.from(byType.entries()).map(([type, parts]) => ({
    type,
    expr: combineDiceExpr(parts.join('+')),
  }))
}

export const GEAR_SLOTS: (keyof Equipment)[] = [
  'armorId', 'shieldId',
  'helmetId', 'necklaceId', 'capeId', 'legsId',
  'bootsId', 'glovesId', 'ring1Id', 'ring2Id', 'amuletId',
]

export function buildAttackRows(
  char: Character,
  w: Weapon,
  opts?: { offHand?: boolean; hasTWF?: boolean; smiteSlotLevel?: number | null },
): AttackRow[] {
  const strMod = mod(effectiveAbilityScore(char, 'str'))
  const dexMod = mod(effectiveAbilityScore(char, 'dex'))
  const props = (w.properties ?? []).map(p => p.toLowerCase())
  const isFinesse = props.includes('finesse')
  const isTwoHanded = props.includes('two-handed')
  const isMelee = w.rangeType !== 'Ranged'
  const rawDmgMod = isFinesse ? Math.max(strMod, dexMod) : isMelee ? strMod : dexMod
  const dmgMod = opts?.offHand ? (opts.hasTWF ? rawDmgMod : Math.min(0, rawDmgMod)) : rawDmgMod
  const enchBonus = w.enchantmentBonus ?? 0
  const duelingBonus = fightingStyleOf(char) === 'dueling' && isMelee && !isTwoHanded && !opts?.offHand ? 2 : 0
  const totalDmgMod = dmgMod + enchBonus + duelingBonus
  const versatileProp = props.find(p => p.startsWith('versatile ('))
  const versatileDie = versatileProp?.match(/versatile \((\d+d\d+)\)/)?.[1]
  const canTwoHand = !char.weapons[1] && !char.equipment.shieldId

  // Normal row always uses 1H damage
  const diceParts = [
    w.damage && w.damage !== '—' ? w.damage : null,
    w.bonusDamageDie ?? null,
  ].filter(Boolean).join('+')
  const dmgDice   = diceParts ? combineDiceExpr(diceParts) : '—'
  const flatBonus = totalDmgMod !== 0 ? totalDmgMod : null

  const rows: AttackRow[] = [{
    id: 'normal',
    name: 'Normal',
    toHit:        computeAttackBonus(char, w),
    dmg:          dmgDice,
    dmgType:      w.damageType ?? null,
    bonusDmg:     flatBonus !== null ? String(flatBonus) : null,
    bonusDmgType: flatBonus !== null ? (w.damageType ?? null) : null,
  }]

  // Thrown row — for melee weapons with the Thrown property
  const thrownPropStr = w.properties?.find(p => p.toLowerCase().includes('thrown'))
  const throwRange = thrownPropStr?.match(/range (\d+\/\d+)/i)?.[1] ?? '?'
  if (thrownPropStr && w.rangeType !== 'Ranged' && !opts?.offHand) {
    rows.push({
      id: 'thrown',
      name: 'Normal',
      toHit:        computeAttackBonus(char, w, { forceRanged: true }),
      dmg:          dmgDice,
      dmgType:      w.damageType ?? null,
      bonusDmg:     flatBonus !== null ? String(flatBonus) : null,
      bonusDmgType: flatBonus !== null ? (w.damageType ?? null) : null,
      group:        'ranged',
    })
  }

  // Versatile row — 2H grip option; disabled when off-hand is occupied
  if (versatileDie && !opts?.offHand) {
    const versatileDiceParts = [versatileDie, w.bonusDamageDie ?? null].filter(Boolean).join('+')
    const versatileDmgMod = dmgMod + enchBonus  // no dueling bonus for 2H grip
    const versatileFlatBonus = versatileDmgMod !== 0 ? versatileDmgMod : null
    rows.push({
      id: 'versatile',
      name: 'Versatile',
      toHit:        computeAttackBonus(char, w),
      dmg:          combineDiceExpr(versatileDiceParts),
      dmgType:      w.damageType ?? null,
      bonusDmg:     versatileFlatBonus !== null ? String(versatileFlatBonus) : null,
      bonusDmgType: versatileFlatBonus !== null ? (w.damageType ?? null) : null,
      disabled:     !canTwoHand,
    })
  }

  const SPECIAL_GROUP: Record<string, AttackRow['group']> = {
    'Sharpshooter':    'ranged',
    'GWM Power Attack':'melee',
    'Divine Smite':    'melee',
    'Reckless Attack': 'melee',
    'Sneak Attack':    'both',
  }
  for (const sa of getWeaponSpecialAttacks(char, w)) {
    let toHit: number | null = null
    let bonusDmg: string | null = null
    let bonusDmgType: string | null = null
    if (sa.name === 'GWM Power Attack' || sa.name === 'Sharpshooter') {
      toHit = -5; bonusDmg = '10'; bonusDmgType = w.damageType ?? null
    } else if (sa.name === 'Divine Smite') {
      const slotLevel = opts?.smiteSlotLevel ?? null
      bonusDmg = slotLevel ? `${Math.min(2 + (slotLevel - 1), 5)}d8` : null
      bonusDmgType = slotLevel ? 'radiant' : null
      rows.push({
        id: sa.name,
        name: sa.name,
        toHit,
        dmg: null,
        dmgType: null,
        bonusDmg,
        bonusDmgType,
        disabled: slotLevel === null,
        note: slotLevel
          ? `${sa.note ?? ''} +1d8 vs fiends/undead (max 6d8).`.trim()
          : 'No spell slots available.',
        group: SPECIAL_GROUP[sa.name] ?? 'both',
      })
      continue
    } else if (sa.dice) {
      bonusDmg = sa.dice
      bonusDmgType = sa.name === 'Sneak Attack' ? 'piercing'
        : w.damageType ?? null
    }
    rows.push({ id: sa.name, name: sa.name, toHit, dmg: null, dmgType: null, bonusDmg, bonusDmgType, note: sa.note,
      group: SPECIAL_GROUP[sa.name] ?? 'both' })
  }

  {
    // Maneuver rider: anyone with an armed maneuver (Battle Master OR the
    // Martial Adept feat). Feat-only dice are d6; Battle Master scales.
    const dieSize = char.subclass === 'BattleMaster' ? (char.level >= 10 ? '1d10' : '1d8') : '1d6'
    const mId = activeManeuverOf(char)
    if (mId) {
      const m = MANEUVER_BY_ID[mId]
      if (m?.dmgType === 'weapon') {
        rows.push({
          id: `maneuver-${mId}`,
          name: m.name,
          toHit: null,
          dmg: null,
          dmgType: null,
          bonusDmg: dieSize,
          bonusDmgType: w.damageType ?? null,
          group: 'both',
        })
      } else if (m?.dmgType === 'to hit') {
        rows.push({
          id: `maneuver-${mId}`,
          name: m.name,
          toHit: null,
          toHitDice: dieSize,
          dmg: null,
          dmgType: null,
          bonusDmg: null,
          bonusDmgType: null,
          group: 'both',
        })
      }
    }
  }

  if (char.subclass === 'ArcaneArcher') {
    const shotId = activeArcaneShotOf(char)
    if (shotId) {
      const shot = ARCANE_SHOT_BY_ID[shotId]
      if (shot) rows.push({
        id: `arcane-${shotId}`,
        name: shot.name,
        toHit: null,
        dmg: null,
        dmgType: null,
        bonusDmg: shot.dice,
        bonusDmgType: shot.dmgType,
        group: 'ranged',
      })
    }
  }

  // Equipment rows — one per equipped gear item that contributes to-hit and/or bonus damage
  for (const slotKey of GEAR_SLOTS) {
    const itemId = char.equipment[slotKey]
    if (!itemId || typeof itemId !== 'string') continue
    const stats = GEAR_BY_ID[itemId]?.stats
    if (!stats) continue
    const toHit = stats.toHitBonus ?? 0
    let bonusDmg: string | null = null
    let bonusDmgType: string | null = null
    const bd = stats.bonusDamage
    if (bd && (bd.appliesTo ?? 'all') !== (isMelee ? 'ranged' : 'melee')) {
      const parts = [bd.dice, bd.flat ? String(bd.flat) : null].filter(Boolean).join('+')
      if (parts) { bonusDmg = combineDiceExpr(parts); bonusDmgType = bd.dmgType }
    }
    if (toHit === 0 && !bonusDmg) continue
    const toHitGroup: 'melee' | 'ranged' | 'both' =
      toHit !== 0 ? (stats.toHitBonusAppliesTo ?? 'both') : 'both'
    const dmgAppliesTo = stats.bonusDamage?.appliesTo ?? 'all'
    const dmgGroup: 'melee' | 'ranged' | 'both' | null =
      bonusDmg !== null
        ? (dmgAppliesTo === 'melee' ? 'melee' : dmgAppliesTo === 'ranged' ? 'ranged' : 'both')
        : null
    const appliesMelee =
      (toHit !== 0 && (toHitGroup === 'melee' || toHitGroup === 'both')) ||
      (dmgGroup !== null && (dmgGroup === 'melee' || dmgGroup === 'both'))
    const appliesRanged =
      (toHit !== 0 && (toHitGroup === 'ranged' || toHitGroup === 'both')) ||
      (dmgGroup !== null && (dmgGroup === 'ranged' || dmgGroup === 'both'))
    const eGroup: AttackRow['group'] =
      (appliesMelee && appliesRanged) ? 'both' :
      appliesRanged ? 'ranged' : 'melee'
    rows.push({
      id: `equip-bonus-${slotKey}`,
      name: GEAR_BY_ID[itemId]!.name,
      toHit: toHit !== 0 ? toHit : null,
      dmg: null,
      dmgType: null,
      bonusDmg,
      bonusDmgType,
      group: eGroup,
    })
  }

  // Booming Blade: melee cantrip that adds thunder damage on hit at level 5+
  if (isMelee && char.spellIds.includes('booming-blade') && char.level >= 5) {
    const boomingDice = char.level >= 17 ? '3d8' : char.level >= 11 ? '2d8' : '1d8'
    rows.push({ id: 'booming-blade', name: 'Booming Blade', toHit: null, dmg: null, dmgType: null, bonusDmg: boomingDice, bonusDmgType: 'thunder', group: 'melee' })
  }

  // Concentration attack-buff spells (e.g. Hex, Hunter's Mark, Divine Favor)
  const concSpell = char.concentrationSpellId ? SPELL_BY_ID[char.concentrationSpellId] : null
  if (concSpell?.attackBuff) {
    const { toHit, toHitDice, bonusDmg, bonusDmgType } = concSpell.attackBuff
    rows.push({
      id: `spell-buff-${concSpell.id}`,
      name: concSpell.name,
      toHit: toHit ?? null,
      toHitDice: toHitDice ?? null,
      dmg: null, dmgType: null,
      bonusDmg: bonusDmg ?? null,
      bonusDmgType: bonusDmgType === 'weapon' ? (w.damageType ?? null) : (bonusDmgType ?? null),
      group: 'both',
    })
  }

  for (const spellId of char.activeBuffSpells ?? []) {
    const spell = SPELL_BY_ID[spellId]
    const resource = spell?.turnResource
    const state = char.buffStates?.[spellId]
    if (resource?.kind !== 'onHitRider' || !resource.formula || !resource.damageType || state?.oneShotUsed) continue
    rows.push({
      id: `turn-resource-${spellId}`,
      name: spell.name,
      toHit: null,
      dmg: null,
      dmgType: null,
      bonusDmg: resource.formula,
      bonusDmgType: resource.damageType,
      group: 'both',
      note: resource.label,
    })
  }

  // Active attack-buff spells toggled through + Buff.
  for (const spellId of char.activeBuffSpells ?? []) {
    const spell = SPELL_BY_ID[spellId]
    if (!spell?.attackBuff || spellId === concSpell?.id) continue
    const { toHit, toHitDice, bonusDmg, bonusDmgType } = spell.attackBuff
    rows.push({
      id: `spell-buff-${spellId}`,
      name: spell.name,
      toHit: toHit ?? null,
      toHitDice: toHitDice ?? null,
      dmg: null, dmgType: null,
      bonusDmg: bonusDmg ?? null,
      bonusDmgType: bonusDmgType === 'weapon' ? (w.damageType ?? null) : (bonusDmgType ?? null),
      group: 'both',
    })
  }

  return rows
}

export function rowResource(row: AttackRow): string {
  const id = row.id
  if (id === 'normal' || id === 'versatile' || id === 'Reckless Attack') return '—'
  if (id === 'Sneak Attack') return '1/turn'
  if (id === 'Divine Smite') return 'Spell Slot'
  if (id === 'GWM Power Attack' || id === 'Sharpshooter') return '—'
  if (id === "Hunter's Mark") return 'Concentration'
  if (id.startsWith('maneuver-')) return 'Sup. Die'
  if (id.startsWith('arcane-')) return 'Arcane Shot'
  if (id.startsWith('equip-bonus-')) return 'Equipment'
  if (id === 'booming-blade') return 'Cantrip'
  if (id.startsWith('spell-buff-')) {
    const spell = SPELL_BY_ID[id.replace('spell-buff-', '')]
    return spell?.concentration ? 'Concentration' : 'Active Buff'
  }
  if (id.startsWith('turn-resource-')) return 'One-shot'
  return '—'
}
