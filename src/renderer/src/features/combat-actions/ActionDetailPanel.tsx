import React, { useState, type ReactNode } from 'react'
import type { Character, Weapon } from '@/entities/character/types'
import { WEAPONS, type WeaponDef } from '@/shared/data/equipment/weapons'
import { GEAR_BY_ID } from '@/shared/data/equipment/gear'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { computeAttackAdvantage, computeAttackBonus, computeSpellAttackBonus, isProficientWithWeapon, getAvailableActions, getSpecialAttacks, getWeaponSpecialAttacks, computeCritThreshold, critExtraDice, computeAttackCount, SPELL_ATTACK_IDS } from '@/domain/rules'
import { channelDivinityOptionsFor } from '@/domain/data/channelDivinityData'
import { METAMAGIC_OPTIONS, metamagicKnownCount } from '@/domain/data/metamagicData'
import { portentDiceCount } from '@/domain/rules/casterFeatures'
import { rollDie } from '@/domain/dice'
import { mod, effectiveAbilityScore, computeSpeedFull } from '@/shared/data/charCalculations'
import { consumeOneShotBuff } from '@/features/buffs/buffRuntime'
import type { Equipment } from '@/entities/character/types'
import { combineDiceExpr, critDiceExpr, formatToHit } from '@/shared/lib/diceExpr'
import { SPELL_BY_ID } from '@/shared/data/spellData'
import { DiceIcon, parseDieType } from '@/shared/components/DiceIcon'
import { FEATS } from '@/shared/data/featsData'
import { FIGHTING_STYLES, FIGHTING_STYLE_BY_ID } from '@/shared/data/fightingStylesData'
import { SUBCLASSES, SUBCLASS_BY_ID } from '@/shared/data/subclassData'
import { INVOCATIONS, maxInvocations } from '@/shared/data/invocationsData'
import { INFUSIONS, maxInfusionsKnown, maxInfusionsActive } from '@/shared/data/infusionsData'
import { MANEUVERS, MANEUVER_BY_ID, MANEUVER_PROGRESSION, maneuversKnown } from '@/shared/data/maneuversData'
import { ARCANE_SHOTS, ARCANE_SHOT_BY_ID, ARCANE_SHOT_PROGRESSION, arcaneShotsKnown } from '@/shared/data/arcaneShotsData'
import { psiWarriorAbilities } from '@/shared/data/psiWarriorData'
import { runes } from '@/shared/data/runeData'
import { wildSurgeTable } from '@/shared/data/wildSurgeTable'
import { WILD_MAGIC_SURGE_TABLE } from '@/shared/data/wildMagicSurgeTable'
import { WILD_SHAPE_BEASTS } from '@/shared/data/wildShapeBeasts'
import { SKILLS } from '@/shared/data/skills'
import { ResourcesPanel } from '@/features/resources/ResourcesPanel'
import { useAppStore } from '@/app/store'
import { SpellsPanel } from '@/features/spells/SpellsPanel'
import type { FeatureEntry } from '@/shared/data/classFeaturesData'
import styles from './ActionDetailPanel.module.css'

const CAST_SPELL_NAMES = new Set(['Cast a Spell', 'Cast a Spell (Bonus)', 'Cast a Spell (Reaction)'])

const SUBCLASS_FEATURE_NAMES = new Set([
  'Arcane Tradition', 'Otherworldly Patron', 'Divine Domain',
  'Martial Archetype', 'Primal Path', 'Bard College', 'Druid Circle',
  'Monastic Tradition', 'Sacred Oath', 'Ranger Archetype',
  'Roguish Archetype', 'Sorcerous Origin',
])

function fmtMod(n: number) { return n >= 0 ? `+${n}` : String(n) }

function spellSniperRange(spell: { id: string; range: string }, enabled?: boolean): string {
  if (!enabled || !SPELL_ATTACK_IDS.has(spell.id)) return spell.range
  const doubled = spell.range.replace(/(\d+)\s*ft/g, (_, n: string) => `${Number(n) * 2}ft`)
  return `${doubled} · Spell Sniper: ignores 1/2 & 3/4 cover`
}

interface AttackRow {
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

function dmgSubtotals(rows: AttackRow[], isActive: (id: string) => boolean): { expr: string; type: string }[] {
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

const BASE_ATTACK_ROW_IDS = new Set(['normal', 'versatile', 'thrown'])

type AttackConsumption =
  | { kind: 'economy'; slot: 'action' | 'bonus' | 'reaction'; attacksOverride?: number }
  | { kind: 'resource'; resourceKey: string; cost: number }
  | { kind: 'oncePerTurn'; resourceKey: string }
  | { kind: 'spellSlot' }

const ATTACK_CONSUMPTION: Record<string, AttackConsumption> = {
  'booming-blade': { kind: 'economy', slot: 'action', attacksOverride: 1 },
  'maneuver-*': { kind: 'resource', resourceKey: 'Superiority Dice', cost: 1 },
  'arcane-*': { kind: 'resource', resourceKey: 'Arcane Shot', cost: 1 },
  'Sneak Attack': { kind: 'oncePerTurn', resourceKey: 'Sneak Attack' },
  'Divine Smite': { kind: 'spellSlot' },
}

function getAttackConsumption(rowId: string): AttackConsumption | undefined {
  if (rowId.startsWith('maneuver-')) return ATTACK_CONSUMPTION['maneuver-*']
  if (rowId.startsWith('arcane-')) return ATTACK_CONSUMPTION['arcane-*']
  return ATTACK_CONSUMPTION[rowId]
}

function criticalSubtotals(
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

const GEAR_SLOTS: (keyof Equipment)[] = [
  'armorId', 'shieldId',
  'helmetId', 'necklaceId', 'capeId', 'legsId',
  'bootsId', 'glovesId', 'ring1Id', 'ring2Id', 'amuletId',
]

function buildAttackRows(
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
  const duelingBonus = char.fightingStyle === 'dueling' && isMelee && !isTwoHanded && !opts?.offHand ? 2 : 0
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

  if (char.subclass === 'BattleMaster') {
    const dieSize = char.level >= 10 ? '1d10' : '1d8'
    const mId = char.activeManeuver ?? null
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
    const shotId = char.activeArcaneShot ?? null
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

function rowResource(row: AttackRow): string {
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

interface Props {
  character: Character
  update: (patch: Partial<Character>) => void
  selectedAction: string | null
  onSelectAction: (name: string | null) => void
  selectedFeature: FeatureEntry | null
  onSummon?: (templateId: string, count?: number, source?: { spellId?: string }) => void
  onConcentrationBroken?: () => void
}

const ORDINAL: Record<number, string> = { 1:'1st',2:'2nd',3:'3rd',4:'4th',5:'5th',6:'6th',7:'7th',8:'8th',9:'9th' }

function BoomingBladeTurnToggle({ charId }: { charId: string }) {
  const ts = useAppStore(s => s.turnStates[charId])
  const useEconomy = useAppStore(s => s.useEconomy)
  const recoverEconomy = useAppStore(s => s.recoverEconomy)
  const registerEndOfTurnSpell = useAppStore(s => s.registerEndOfTurnSpell)
  const unregisterEndOfTurnSpell = useAppStore(s => s.unregisterEndOfTurnSpell)
  const armed = !!ts?.endOfTurnSpellIds.includes('booming-blade')
  const consumption = ATTACK_CONSUMPTION['booming-blade']
  return (
    <button
      onClick={() => {
        if (consumption.kind !== 'economy') return
        if (armed) {
          unregisterEndOfTurnSpell(charId, 'booming-blade')
          recoverEconomy(charId, consumption.slot)
        } else {
          registerEndOfTurnSpell(charId, 'booming-blade')
          useEconomy(charId, consumption.slot)
        }
      }}
      title={armed ? 'Uncast Booming Blade and refund action' : 'Cast Booming Blade'}
      style={{
        fontSize: 9,
        padding: '2px 5px',
        marginLeft: 4,
        border: '1px solid var(--border)',
        borderRadius: 3,
        background: armed ? 'rgba(216, 162, 61, 0.25)' : 'transparent',
        color: armed ? '#d8a23d' : 'var(--text-muted)',
        cursor: 'pointer',
      }}
    >
      {armed ? '● Cast' : '○ Cast'}
    </button>
  )
}

const DIVINE_STRIKE_DAMAGE_TYPE: Partial<Record<string, string>> = {
  LifeDomain: 'radiant', TrickeryDomain: 'poison', TempestDomain: 'thunder',
  WarDomain: "weapon's damage type", DeathDomain: 'necrotic', ForgeDomain: 'fire',
  OrderDomain: 'psychic', TwilightDomain: 'radiant', NatureDomain: 'cold/fire/lightning',
}

function DivineStrikeTurnToggle({ charId, subclass, level }: { charId: string; subclass?: string; level: number }) {
  const ts = useAppStore(s => s.turnStates[charId])
  const fireDivineStrike = useAppStore(s => s.fireDivineStrike)
  const fired = !!ts?.divineStrikeFired
  const damage = level >= 14 ? '2d8' : '1d8'
  const dmgType = (subclass && DIVINE_STRIKE_DAMAGE_TYPE[subclass]) || 'radiant'
  return (
    <button
      onClick={() => !fired && fireDivineStrike(charId)}
      title={fired ? 'Already used this turn' : `Fire Divine Strike (+${damage} ${dmgType})`}
      disabled={fired}
      style={{
        fontSize: 9,
        padding: '2px 5px',
        marginLeft: 4,
        border: '1px solid var(--border)',
        borderRadius: 3,
        background: fired ? 'rgba(200, 100, 100, 0.25)' : 'transparent',
        color: fired ? '#c86464' : 'var(--text-muted)',
        cursor: fired ? 'default' : 'pointer',
        opacity: fired ? 0.6 : 1,
      }}
    >
      {fired ? '● Used' : '○ Divine Strike'}
    </button>
  )
}

export function ActionDetailPanel({ character: char, update, selectedAction, onSelectAction, selectedFeature, onSummon, onConcentrationBroken }: Props) {
  const [customWeapon, setCustomWeapon] = useState({ name: '', atkBonus: '0', damage: '', damageType: '' })
  const [arcanePickedLevels, setArcanePickedLevels] = useState<number[]>([])
  const [spellDetailId, setSpellDetailId] = useState<string | null>(null)
  const [pendingStyle, setPendingStyle] = useState<string | null>(null)
  const [pendingSubclass, setPendingSubclass] = useState<string | null>(null)
  const [pendingBoon, setPendingBoon] = useState<string | null>(null)
  const [maneuverPickerOpen, setManeuverPickerOpen] = useState(false)
  const [arcanePickerOpen, setArcanePickerOpen] = useState(false)
  const [activeRows, setActiveRows] = useState<Record<string, Record<string, boolean>>>({})
  const [smiteSlotLevel, setSmiteSlotLevel] = useState<number | null>(null)
  const [wildMagicRoll, setWildMagicRoll] = useState<number | null>(null)
  const [barbarianWildSurgeRoll, setBarbarianWildSurgeRoll] = useState<number | null>(null)
  const [selectedWildShapeBeastId, setSelectedWildShapeBeastId] = useState('wolf')
  const turnState = useAppStore(s => s.turnStates[char.id])
  const useEconomy = useAppStore(s => s.useEconomy)
  const recoverEconomy = useAppStore(s => s.recoverEconomy)
  const useAttack = useAppStore(s => s.useAttack)
  const recoverAttack = useAppStore(s => s.recoverAttack)
  const markActionUsed = useAppStore(s => s.markActionUsed)
  const unmarkActionUsed = useAppStore(s => s.unmarkActionUsed)
  const setAttacked = useAppStore(s => s.setAttacked)
  const setDashed = useAppStore(s => s.setDashed)
  const setAdvantageNextAttack = useAppStore(s => s.setAdvantageNextAttack)
  const setSpeedZero = useAppStore(s => s.setSpeedZero)
  const baseAttackAdvantage = computeAttackAdvantage(char)
  const steadyAimSource = turnState?.advantageNextAttack === 'adv' ? 'Advantage: Steady Aim (next attack)' : null
  const attackAdvantage = (() => {
    if (!steadyAimSource) return baseAttackAdvantage
    const hasDisadvantage = baseAttackAdvantage.sources.some(source => source.startsWith('Disadvantage:'))
    return {
      martial: hasDisadvantage ? 'none' as const : 'adv' as const,
      spell: baseAttackAdvantage.spell,
      sources: [...baseAttackAdvantage.sources, steadyAimSource],
    }
  })()

  const boomingBladeActive = !!turnState?.endOfTurnSpellIds.includes('booming-blade')
  const smiteSlotLevels = Object.keys(char.spellSlots)
    .map(Number)
    .filter(level => char.spellSlots[level]?.total > 0)
    .sort((a, b) => a - b)
  const smiteRemaining = (level: number) => {
    const slot = char.spellSlots[level]
    return slot ? Math.max(0, slot.total - slot.used) : 0
  }
  const lowestAvailableSmiteSlotLevel = smiteSlotLevels.find(level => smiteRemaining(level) > 0) ?? null
  const selectedSmiteSlotLevel =
    smiteSlotLevel !== null && smiteRemaining(smiteSlotLevel) > 0
      ? smiteSlotLevel
      : lowestAvailableSmiteSlotLevel
  const basePerAction = computeAttackCount(char)
  const perAction = boomingBladeActive ? 1 : basePerAction
  const totalActions = boomingBladeActive ? 1 : 1 + (turnState?.bonusActions ?? 0)
  const attacksMax = boomingBladeActive ? 1 : perAction * totalActions
  const attacksUsed = turnState?.attacksUsed ?? 0
  const attacksRemaining = Math.max(0, attacksMax - attacksUsed)

  function adjustAttackConsumption(rows: AttackRow[], direction: 'spend' | 'recover') {
    let resources = char.resources
    let spellSlots = char.spellSlots
    let resourcesChanged = false
    let spellSlotsChanged = false

    for (const row of rows) {
      const consumption = getAttackConsumption(row.id)
      if (!consumption || row.disabled) continue
      if (consumption.kind === 'economy') continue
      if (consumption.kind === 'resource' || consumption.kind === 'oncePerTurn') {
        const cost = consumption.kind === 'resource' ? consumption.cost : 1
        const current = resources[consumption.resourceKey] ?? (consumption.kind === 'oncePerTurn' ? { used: 0, total: 1 } : null)
        if (!current) continue
        const used = direction === 'spend'
          ? Math.min(current.total, current.used + cost)
          : Math.max(0, current.used - cost)
        resources = {
          ...resources,
          [consumption.resourceKey]: { ...current, used },
        }
        resourcesChanged = true
      }
      if (consumption.kind === 'spellSlot') {
        const level = selectedSmiteSlotLevel
        if (level === null) continue
        const slot = spellSlots[level]
        if (!slot) continue
        if (direction === 'spend' && slot.used >= slot.total) continue
        const used = direction === 'spend'
          ? Math.min(slot.total, slot.used + 1)
          : Math.max(0, slot.used - 1)
        spellSlots = {
          ...spellSlots,
          [level]: { ...slot, used },
        }
        spellSlotsChanged = true
      }
    }

    if (resourcesChanged || spellSlotsChanged) {
      update({
        ...(resourcesChanged ? { resources } : {}),
        ...(spellSlotsChanged ? { spellSlots } : {}),
      })
    }
  }

  function dropBuff(spellId: string) {
    update(consumeOneShotBuff(char, spellId))
  }

  function consumeOneShotRows(rows: AttackRow[]) {
    const spellIds = rows
      .map(row => row.id.startsWith('turn-resource-') ? row.id.replace('turn-resource-', '') : null)
      .filter((id): id is string => !!id)
    if (spellIds.length === 0) return
    const nextBuffs = (char.activeBuffSpells ?? []).filter(id => !spellIds.includes(id))
    const nextStates = { ...(char.buffStates ?? {}) }
    for (const id of spellIds) {
      nextStates[id] = { ...(nextStates[id] ?? {}), oneShotUsed: true }
      delete nextStates[id]
    }
    update({ activeBuffSpells: nextBuffs, buffStates: nextStates })
  }

  function renderOneShotUsedButton(row: AttackRow) {
    if (!row.id.startsWith('turn-resource-')) return null
    const spellId = row.id.replace('turn-resource-', '')
    return (
      <button
        type="button"
        className={styles.resourceChip}
        onClick={event => {
          event.stopPropagation()
          dropBuff(spellId)
        }}
      >
        Used this hit
      </button>
    )
  }

  function spendAttack(rows: AttackRow[] = []) {
    if (attacksUsed >= attacksMax) return
    if (!boomingBladeActive) {
      const before = Math.ceil(attacksUsed / perAction)
      const after = Math.ceil((attacksUsed + 1) / perAction)
      if (after > before) {
        useEconomy(char.id, 'action')
        setAttacked(char.id, true)
      }
    } else {
      setAttacked(char.id, true)
    }
    adjustAttackConsumption(rows, 'spend')
    consumeOneShotRows(rows)
    useAttack(char.id)
  }

  function recoverSpentAttack(rows: AttackRow[] = []) {
    if (attacksUsed <= 0) return
    if (!boomingBladeActive) {
      const before = Math.ceil(attacksUsed / perAction)
      const after = Math.ceil((attacksUsed - 1) / perAction)
      if (after < before) {
        recoverEconomy(char.id, 'action')
        if (attacksUsed - 1 === 0) setAttacked(char.id, false)
      }
    } else if (attacksUsed - 1 === 0) {
      setAttacked(char.id, false)
    }
    adjustAttackConsumption(rows, 'recover')
    recoverAttack(char.id)
  }

  function renderAttackControls(rows: AttackRow[] = [], extra?: ReactNode) {
  return (
    <div className={styles.attackHeadActions}>
      <button 
        className={styles.attackUseBtn} 
        onClick={() => spendAttack(rows)} 
        disabled={attacksUsed >= attacksMax}
      >
        Attack
      </button>
      
      <div className={styles.attackPips} aria-label={`${attacksRemaining} of ${attacksMax} attacks remaining`}>
        {Array.from({ length: attacksMax }).map((_, i) => {
          const filled = i >= attacksUsed;
          return (
            <React.Fragment key={i}>
              {i > 0 && i % perAction === 0 && (
                <span className={styles.attackPipSeparator} aria-hidden="true">
                  |
                </span>
              )}
              <button
                type="button"
                className={`${styles.attackPip} ${filled ? styles.attackPipFull : styles.attackPipSpent}`}
                onClick={() => filled ? spendAttack(rows) : recoverSpentAttack(rows)}
                title={filled ? 'Use attack' : 'Recover attack'}
              />
            </React.Fragment>
          );
        })}
      </div>
      {extra}
    </div>
  );
}

  function renderDivineSmiteSlotPicker() {
    const hasRemaining = smiteSlotLevels.some(level => smiteRemaining(level) > 0)
    if (!hasRemaining) {
      return <span className={styles.smiteNoSlots}>no slots</span>
    }
    return (
      <div className={styles.smiteSlotPicker}>
        {smiteSlotLevels.map(level => {
          const remaining = smiteRemaining(level)
          const active = selectedSmiteSlotLevel === level
          return (
            <button
              key={level}
              type="button"
              className={`${styles.smiteSlotBtn} ${active ? styles.smiteSlotBtnActive : ''}`}
              disabled={remaining <= 0}
              onClick={(event) => {
                event.stopPropagation()
                setSmiteSlotLevel(level)
              }}
              title={`${remaining}/${char.spellSlots[level]?.total ?? 0} level ${level} slots`}
            >
              {level}
            </button>
          )
        })}
      </div>
    )
  }

  function renderMartialAdvLabel() {
    if (attackAdvantage.martial === 'none') return null
    return (
      <span
        className={`${styles.advBadge} ${attackAdvantage.martial === 'adv' ? styles.advBadgeAdv : styles.advBadgeDis}`}
        title={attackAdvantage.sources.join('; ')}
      >
        {attackAdvantage.martial === 'adv' ? 'Adv' : 'Disadv'}
      </span>
    )
  }

  const availableActions = getAvailableActions(char)
  const selectedActionDef = selectedAction ? availableActions.find(a => a.name === selectedAction) : null
  const specialAttacks = getSpecialAttacks(char)
  function badgeClass(type: string) {
    if (type === 'Action') return styles.badgeAction
    if (type === 'Bonus Action') return styles.badgeBonusAction
    if (type === 'Reaction') return styles.badgeReaction
    return styles.badgeFree
  }

  function actionTypeToEconomy(type?: string): 'action' | 'bonus' | 'reaction' | null {
    if (type === 'Action') return 'action'
    if (type === 'Bonus Action') return 'bonus'
    if (type === 'Reaction') return 'reaction'
    return null
  }

  function renderActionUseButton(action = selectedActionDef) {
    if (!action) return null
    if (action.name === 'Attack' || action.name === 'Off-Hand Attack') return null
    if (action.name.startsWith('Cast a Spell')) return null
    if (action.resourceKey) return null
    if (action.name === 'Steady Aim') return null
    const economy = actionTypeToEconomy(action.type)
    if (!economy) return null
    const used = turnState?.usedActionNames?.includes(action.name) ?? false
    const total =
      economy === 'action' ? 1 + (turnState?.bonusActions ?? 0) :
      economy === 'bonus' ? 1 + (turnState?.bonusBonusActions ?? 0) :
      1 + (turnState?.bonusReactions ?? 0)
    const usedCount =
      economy === 'action' ? (turnState?.actionsUsed ?? 0) :
      economy === 'bonus' ? (turnState?.bonusActionsUsed ?? 0) :
      (turnState?.reactionsUsed ?? 0)
    const atCapacity = usedCount >= total
    const label =
      economy === 'action' ? 'Use Action' :
      economy === 'bonus' ? 'Use Bonus Action' :
      'Use Reaction'
    return (
      <button
        type="button"
        className={`${styles.actionUseBtn} ${used ? styles.actionUseBtnUsed : ''}`}
        disabled={!used && atCapacity}
        onClick={() => {
          if (used) {
            recoverEconomy(char.id, economy)
            unmarkActionUsed(char.id, action.name)
            if (action.name === 'Dash') setDashed(char.id, false)
          } else {
            useEconomy(char.id, economy)
            markActionUsed(char.id, action.name)
            if (action.name === 'Dash') setDashed(char.id, true)
          }
        }}
      >
        {used ? 'Undo' : label}
      </button>
    )
  }

  function addWeaponFromCatalog(w: WeaponDef) {
    const weapon: Weapon = {
      id: crypto.randomUUID(),
      name: w.name,
      atkBonus: 0,
      damage: w.damageDie,
      damageType: w.damageType,
      rangeType: w.rangeType,
      properties: w.properties,
      enchantmentBonus: w.enchantmentBonus || undefined,
      enchantment: w.enchantment,
      bonusDamageDie: w.bonusDamageDie ?? (w.enchantment ? '1d6' : undefined),
      bonusDamageType: w.bonusDamageType ?? w.enchantment ?? undefined,
    }
    update({ weapons: [...char.weapons, weapon] })
  }

  const DAMAGE_PATTERN = /^\d+d\d+([+-]\d+)?$|^\d+$|^—$/

  // ── Arcane Recovery (shared between action + feature) ────────────────────
  const maxArcaneRecovery = Math.ceil(char.level / 2)
  const totalArcanePickedLevels = arcanePickedLevels.reduce((s, l) => s + l, 0)
  const arcaneRes = char.resources['Arcane Recovery']
  const arcaneAlreadyUsed = arcaneRes ? arcaneRes.used >= arcaneRes.total : false
  const arcaneRecoverableSlots = (Object.entries(char.spellSlots) as [string, { used: number; total: number }][])
    .filter(([lvl, slot]) => Number(lvl) <= 5 && slot.used > 0)
    .sort(([a], [b]) => Number(a) - Number(b))

  function toggleArcaneSlot(level: number, isPicked: boolean) {
    if (isPicked) {
      const idx = arcanePickedLevels.lastIndexOf(level)
      setArcanePickedLevels(arcanePickedLevels.filter((_, i) => i !== idx))
    } else if (totalArcanePickedLevels + level <= maxArcaneRecovery) {
      setArcanePickedLevels([...arcanePickedLevels, level])
    }
  }

  function applyArcaneRecovery() {
    const newSlots = { ...char.spellSlots }
    const levelCounts: Record<number, number> = {}
    for (const l of arcanePickedLevels) levelCounts[l] = (levelCounts[l] ?? 0) + 1
    for (const [lvl, count] of Object.entries(levelCounts)) {
      const slot = newSlots[Number(lvl)]
      if (slot) newSlots[Number(lvl)] = { ...slot, used: Math.max(0, slot.used - count) }
    }
    const newResources = { ...char.resources }
    if (newResources['Arcane Recovery']) {
      newResources['Arcane Recovery'] = { ...newResources['Arcane Recovery'], used: newResources['Arcane Recovery'].used + 1 }
    }
    update({ spellSlots: newSlots, resources: newResources })
    setArcanePickedLevels([])
  }

  function renderArcaneRecovery(desc: string) {
    return (
      <>
        <ResourcesPanel character={char} update={update} />
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>Arcane Recovery</span>
            <span className={`${styles.detailBadge} ${styles.badgeAction}`}>Short Rest</span>
            {renderActionUseButton()}
          </div>
          <p className={styles.detailFull}>{desc}</p>
          {arcaneAlreadyUsed ? (
            <p className={styles.detailFull} style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Already used today — recovers on long rest.
            </p>
          ) : (
            <>
              <div className={styles.detailResource}>
                Recover slots: {totalArcanePickedLevels}/{maxArcaneRecovery} combined levels
              </div>
              {arcaneRecoverableSlots.length === 0 ? (
                <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>No expended slots of 5th level or lower.</p>
              ) : (
                <div className={styles.arcaneSlotGrid}>
                  {arcaneRecoverableSlots.map(([lvl, slot]) => {
                    const level = Number(lvl)
                    const alreadyPickedCount = arcanePickedLevels.filter(l => l === level).length
                    return Array.from({ length: slot.used }).map((_, i) => {
                      const isPicked = i < alreadyPickedCount
                      const wouldExceed = !isPicked && totalArcanePickedLevels + level > maxArcaneRecovery
                      return (
                        <button
                          key={`${lvl}-${i}`}
                          className={`${styles.arcaneSlotBtn} ${isPicked ? styles.arcaneSlotBtnPicked : ''}`}
                          disabled={wouldExceed}
                          onClick={() => toggleArcaneSlot(level, isPicked)}
                        >
                          {ORDINAL[level] ?? `${level}th`}
                        </button>
                      )
                    })
                  })}
                </div>
              )}
              <button
                className={styles.armoryAddBtn}
                disabled={arcanePickedLevels.length === 0}
                onClick={applyArcaneRecovery}
                style={{ marginTop: 8 }}
              >
                Recover Slots
              </button>
            </>
          )}
        </div>
      </>
    )
  }

  // FEATURE SELECTED — show feature detail in right panel
  if (selectedFeature && !selectedAction) {
    const isAsi = selectedFeature.name === 'ASI'
    const isSpellbook = selectedFeature.name === 'Spellbook'
    const isFightingStyle = selectedFeature.name === 'Fighting Style'
    const asiChoiceLabel = isAsi ? char.completedAsiChoices?.[selectedFeature.level] : undefined
    const asiDone = isAsi ? (char.completedAsiLevels ?? []).includes(selectedFeature.level) : false

    if (isFightingStyle) {
      const classDef = CLASS_BY_ID[char.classId]
      const hasPendingAsi = (classDef?.asiLevels ?? []).includes(char.level) &&
        !(char.completedAsiLevels ?? []).includes(char.level)
      const isLocked = (char.fightingStyleLocked ?? false) && !hasPendingAsi
      const chosen = char.fightingStyle ? FIGHTING_STYLE_BY_ID[char.fightingStyle] : null
      return (
        <>
          <ResourcesPanel character={char} update={update} />
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>Fighting Style</span>
              <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Level {selectedFeature.level}</span>
              {renderActionUseButton()}
            </div>
            {isLocked ? (
              <>
                {chosen && (
                  <>
                    <p className={styles.detailFull}><strong>{chosen.name}</strong></p>
                    <p className={styles.detailFull} style={{ color: 'var(--text-muted)', marginTop: 4 }}>{chosen.description}</p>
                  </>
                )}
                <p className={styles.detailFull} style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 8, fontStyle: 'italic' }}>
                  Style locked — can retrain at next ASI level.
                </p>
              </>
            ) : (
              <>
                {hasPendingAsi && chosen && (
                  <p className={styles.detailFull} style={{ color: 'var(--accent)', fontSize: 11, marginBottom: 6 }}>
                    Retraining available at this level.
                  </p>
                )}
                {!chosen && !pendingStyle && (
                  <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>Choose your fighting style:</p>
                )}
                <div className={styles.fightingStyleList}>
                  {FIGHTING_STYLES.map(s => (
                    <button
                      key={s.id}
                      className={`${styles.fightingStyleOption} ${(pendingStyle ?? char.fightingStyle) === s.id ? styles.fightingStyleOptionActive : ''}`}
                      onClick={() => setPendingStyle(s.id)}
                    >
                      <span className={styles.fightingStyleName}>{s.name}</span>
                      <span className={styles.fightingStyleDesc}>{s.description}</span>
                    </button>
                  ))}
                </div>
                {(pendingStyle || char.fightingStyle) && (
                  <button
                    className={styles.armoryAddBtn}
                    style={{ marginTop: 8 }}
                    onClick={() => {
                      update({ fightingStyle: pendingStyle ?? char.fightingStyle ?? undefined, fightingStyleLocked: true })
                      setPendingStyle(null)
                    }}
                  >
                    Confirm Style
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )
    }

    if (isSpellbook) {
      return (
        <>
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>{selectedFeature.name}</span>
              <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Level {selectedFeature.level}</span>
              {renderActionUseButton()}
            </div>
            <p className={styles.detailFull}>{selectedFeature.desc}</p>
          </div>
          <div className={styles.spellsWrapper}>
            <SpellsPanel
              character={char}
              update={update}
              onLearnSpell={(id) => update({ spellIds: [...new Set([...char.spellIds, id])] })}
              onSummon={onSummon}
              onConcentrationBroken={onConcentrationBroken}
            />
          </div>
        </>
      )
    }

    if (isAsi && asiChoiceLabel) {
      const isFeat = asiChoiceLabel.startsWith('Feat: ')
      if (isFeat) {
        const raw = asiChoiceLabel.slice(6)
        const featName = raw.replace(/\s*\([^)]*\)$/, '')
        const abilitySuffix = raw.match(/\(([^)]+)\)$/)?.[1] ?? null
        const featDef = FEATS.find(f => f.name === featName)
        return (
          <>
            <ResourcesPanel character={char} update={update} />
            <div className={styles.detailPane}>
              <div className={styles.detailHeader}>
                <span className={styles.detailName}>{selectedFeature.name}</span>
                <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Level {selectedFeature.level}</span>
                {renderActionUseButton()}
              </div>
              <p className={styles.detailFull}>
                <strong>Feat — {featName}</strong>{abilitySuffix ? ` · ${abilitySuffix}` : ''}
              </p>
              {featDef && <p className={styles.detailFull} style={{ color: 'var(--text-muted)', marginTop: 4 }}>{featDef.description}</p>}
            </div>
          </>
        )
      }
      return (
        <>
          <ResourcesPanel character={char} update={update} />
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>{selectedFeature.name}</span>
              <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Level {selectedFeature.level}</span>
              {renderActionUseButton()}
            </div>
            <p className={styles.detailFull}><strong>{asiChoiceLabel}</strong></p>
          </div>
        </>
      )
    }

    const isSpellMastery = selectedFeature.name === 'Spell Mastery'
    if (isSpellMastery) {
      const level1Spells = char.spellIds.filter(id => SPELL_BY_ID[id]?.level === 1)
      const level2Spells = char.spellIds.filter(id => SPELL_BY_ID[id]?.level === 2)
      return (
        <>
          <ResourcesPanel character={char} update={update} />
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>Spell Mastery</span>
              <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Level {selectedFeature.level}</span>
              {renderActionUseButton()}
            </div>
            <p className={styles.detailFull}>{selectedFeature.desc}</p>
            <div className={styles.masterySlotPicker}>
              <span className={styles.masterySpellLabel}>1st-level mastered spell</span>
              <div className={styles.masterySpellGrid}>
                {level1Spells.map(id => (
                  <button
                    key={id}
                    className={`${styles.masterySpellChip} ${char.masterySpells?.level1 === id ? styles.masterySpellChipActive : ''}`}
                    onClick={() => update({ masterySpells: { ...char.masterySpells, level1: id } })}
                  >
                    {SPELL_BY_ID[id]?.name ?? id}
                  </button>
                ))}
                {level1Spells.length === 0 && <span className={styles.masterySpellEmpty}>No 1st-level spells in spellbook.</span>}
              </div>
              <span className={styles.masterySpellLabel}>2nd-level mastered spell</span>
              <div className={styles.masterySpellGrid}>
                {level2Spells.map(id => (
                  <button
                    key={id}
                    className={`${styles.masterySpellChip} ${char.masterySpells?.level2 === id ? styles.masterySpellChipActive : ''}`}
                    onClick={() => update({ masterySpells: { ...char.masterySpells, level2: id } })}
                  >
                    {SPELL_BY_ID[id]?.name ?? id}
                  </button>
                ))}
                {level2Spells.length === 0 && <span className={styles.masterySpellEmpty}>No 2nd-level spells in spellbook.</span>}
              </div>
            </div>
          </div>
        </>
      )
    }

    // ── Generic subclass picker (Arcane Tradition, Otherworldly Patron, Divine Domain, etc.) ──
    const isSubclassPicker = SUBCLASS_FEATURE_NAMES.has(selectedFeature.name)
    if (isSubclassPicker) {
      const candidates = SUBCLASSES.filter(s => s.classId === char.classId)
      const chosen = char.subclass ? SUBCLASS_BY_ID[char.subclass] : null
      const isLocked = char.subclassLocked ?? false
      const featureName = selectedFeature.name
      return (
        <>
          <ResourcesPanel character={char} update={update} />
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>{featureName}</span>
              <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Level {selectedFeature.level}</span>
              {renderActionUseButton()}
            </div>
            {isLocked ? (
              <>
                {chosen && (
                  <>
                    <p className={styles.detailFull}><strong>{chosen.label}</strong></p>
                    {chosen.description && <p className={styles.detailFull} style={{ color: 'var(--text-muted)', marginTop: 4 }}>{chosen.description}</p>}
                  </>
                )}
                <p className={styles.detailFull} style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 8, fontStyle: 'italic' }}>
                  Subclass locked — this choice is permanent.
                </p>
              </>
            ) : (
              <>
                {!chosen && !pendingSubclass && (
                  <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>Choose your {featureName.toLowerCase()}:</p>
                )}
                <div className={styles.fightingStyleList}>
                  {candidates.map(s => (
                    <button
                      key={s.id}
                      className={`${styles.fightingStyleOption} ${(pendingSubclass ?? char.subclass) === s.id ? styles.fightingStyleOptionActive : ''}`}
                      onClick={() => setPendingSubclass(s.id)}
                    >
                      <span className={styles.fightingStyleName}>{s.label}</span>
                      {s.description && <span className={styles.fightingStyleDesc}>{s.description}</span>}
                    </button>
                  ))}
                </div>
                {(pendingSubclass || char.subclass) && (
                  <button
                    className={styles.armoryAddBtn}
                    style={{ marginTop: 8 }}
                    onClick={() => {
                      update({ subclass: pendingSubclass ?? char.subclass ?? undefined, subclassLocked: true })
                      setPendingSubclass(null)
                    }}
                  >
                    Confirm {featureName}
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )
    }

    // ── Eldritch Invocations ──────────────────────────────────────────
    const isEldritchInvocations = selectedFeature.name === 'Eldritch Invocations'
    if (isEldritchInvocations) {
      const known = char.warlockInvocations ?? []
      const maxKnown = maxInvocations(char.level)
      const eligible = INVOCATIONS.filter(inv =>
        (inv.prerequisiteLevel ?? 2) <= char.level &&
        (!inv.prerequisite || inv.prerequisite === 'Pact of the Blade' ? char.pactBoon === 'blade' :
          inv.prerequisite === 'Pact of the Tome' ? char.pactBoon === 'tome' : true)
      )
      return (
        <>
          <ResourcesPanel character={char} update={update} />
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>Eldritch Invocations</span>
              <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Level {selectedFeature.level}</span>
              {renderActionUseButton()}
            </div>
            <div className={styles.detailResource}>{known.length} / {maxKnown} invocations known</div>
            <div className={styles.fightingStyleList}>
              {INVOCATIONS.map(inv => {
                const isKnown = known.includes(inv.id)
                const levelOk = (inv.prerequisiteLevel ?? 2) <= char.level
                const prereqOk = !inv.prerequisite ||
                  (inv.prerequisite === 'Pact of the Blade' && char.pactBoon === 'blade') ||
                  (inv.prerequisite === 'Pact of the Tome' && char.pactBoon === 'tome')
                const canAdd = !isKnown && known.length < maxKnown && levelOk && prereqOk
                const isDisabled = !isKnown && !canAdd
                return (
                  <button
                    key={inv.id}
                    className={`${styles.fightingStyleOption} ${isKnown ? styles.fightingStyleOptionActive : ''}`}
                    style={isDisabled ? { opacity: 0.4 } : undefined}
                    disabled={isDisabled && !isKnown}
                    onClick={() => {
                      if (!levelOk || !prereqOk) return
                      const updated = isKnown
                        ? known.filter(id => id !== inv.id)
                        : known.length < maxKnown ? [...known, inv.id] : known
                      update({ warlockInvocations: updated })
                    }}
                  >
                    <span className={styles.fightingStyleName}>
                      {inv.name}
                      {inv.prerequisite && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · {inv.prerequisite}</span>}
                      {(inv.prerequisiteLevel ?? 2) > 2 && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · Level {inv.prerequisiteLevel}+</span>}
                    </span>
                    <span className={styles.fightingStyleDesc}>{inv.description}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )
    }

    // ── Artificer Infusions ───────────────────────────────────────────
    const isInfuseItem = selectedFeature.name === 'Infuse Item'
    if (isInfuseItem) {
      const known = char.artificerInfusions ?? []
      const active = char.activeArtificerInfusions ?? []
      const maxKnown = maxInfusionsKnown(char.level)
      const maxActive = maxInfusionsActive(char.level)
      return (
        <>
          <ResourcesPanel character={char} update={update} />
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>Infuse Item</span>
              <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Level {selectedFeature.level}</span>
              {renderActionUseButton()}
            </div>
            <div className={styles.detailResource}>
              {known.length} / {maxKnown} infusions known · {active.length} / {maxActive} active
            </div>
            <p className={styles.detailFull}>{selectedFeature.desc}</p>
            <div className={styles.fightingStyleList}>
              {INFUSIONS.map(inf => {
                const isKnown = known.includes(inf.id)
                const isActive = active.includes(inf.id)
                const levelOk = (inf.prerequisiteLevel ?? 2) <= char.level
                const canLearn = !isKnown && known.length < maxKnown && levelOk
                const canActivate = isKnown && !isActive && active.length < maxActive
                return (
                  <div
                    key={inf.id}
                    className={`${styles.fightingStyleOption} ${isKnown ? styles.fightingStyleOptionActive : ''}`}
                    style={!isKnown && !levelOk ? { opacity: 0.4 } : undefined}
                  >
                    <span className={styles.fightingStyleName}>
                      {inf.name}
                      {inf.appliesTo && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · {inf.appliesTo}</span>}
                      {(inf.prerequisiteLevel ?? 2) > 2 && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · Level {inf.prerequisiteLevel}+</span>}
                    </span>
                    <span className={styles.fightingStyleDesc}>{inf.description}</span>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      <button
                        className={styles.detailChipBtn}
                        disabled={!isKnown && !canLearn}
                        onClick={() => {
                          if (isKnown) {
                            update({
                              artificerInfusions: known.filter(id => id !== inf.id),
                              activeArtificerInfusions: active.filter(id => id !== inf.id),
                            })
                          } else if (canLearn) {
                            update({ artificerInfusions: [...known, inf.id] })
                          }
                        }}
                      >
                        {isKnown ? '− Forget' : '+ Learn'}
                      </button>
                      {isKnown && (
                        <button
                          className={styles.detailChipBtn}
                          disabled={!isActive && !canActivate}
                          onClick={() => {
                            update({
                              activeArtificerInfusions: isActive
                                ? active.filter(id => id !== inf.id)
                                : [...active, inf.id],
                            })
                          }}
                        >
                          {isActive ? '◉ Active' : '○ Activate'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )
    }

    // ── Pact Boon ─────────────────────────────────────────────────────
    const isRuneCarver = selectedFeature.name === 'Rune Carver' && char.subclass === 'RuneKnight'
    if (isRuneCarver) {
      const known = char.knownRunes ?? []
      const active = char.activeRunes ?? []
      const maxKnown = char.level >= 15 ? 5 : char.level >= 10 ? 4 : char.level >= 7 ? 3 : 2
      return (
        <>
          <ResourcesPanel character={char} update={update} />
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>Rune Carver</span>
              <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Level {selectedFeature.level}</span>
              {renderActionUseButton()}
            </div>
            <div className={styles.detailResource}>
              {known.length} / {maxKnown} runes known · {active.length} active
            </div>
            <p className={styles.detailFull}>{selectedFeature.desc}</p>
            <div className={styles.fightingStyleList}>
              {runes.map(rune => {
                const isKnown = known.includes(rune.id)
                const isActive = active.includes(rune.id)
                const resourceKey = `Rune:${rune.id}`
                const resource = char.resources[resourceKey] ?? { used: 0, total: 1 }
                const canLearn = !isKnown && known.length < maxKnown
                const canActivate = isKnown && resource.used < resource.total
                return (
                  <div
                    key={rune.id}
                    className={`${styles.fightingStyleOption} ${isKnown ? styles.fightingStyleOptionActive : ''}`}
                  >
                    <span className={styles.fightingStyleName}>
                      {rune.name}
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · {rune.activationType}</span>
                    </span>
                    <span className={styles.fightingStyleDesc}>Passive: {rune.passiveBonus}</span>
                    <span className={styles.fightingStyleDesc}>Activate: {rune.activatedEffect}</span>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      <button
                        className={styles.detailChipBtn}
                        disabled={!isKnown && !canLearn}
                        onClick={() => {
                          const resources = { ...char.resources }
                          if (isKnown) {
                            delete resources[resourceKey]
                            update({
                              knownRunes: known.filter(id => id !== rune.id),
                              activeRunes: active.filter(id => id !== rune.id),
                              resources,
                            })
                          } else if (canLearn) {
                            resources[resourceKey] = resources[resourceKey] ?? { used: 0, total: 1 }
                            update({ knownRunes: [...known, rune.id], resources })
                          }
                        }}
                      >
                        {isKnown ? '− Forget' : '+ Learn'}
                      </button>
                      {isKnown && (
                        <button
                          className={styles.detailChipBtn}
                          disabled={!isActive && !canActivate}
                          onClick={() => {
                            if (isActive) {
                              update({ activeRunes: active.filter(id => id !== rune.id) })
                              return
                            }
                            if (!canActivate) return
                            update({
                              activeRunes: [...active, rune.id],
                              resources: {
                                ...char.resources,
                                [resourceKey]: { total: resource.total, used: Math.min(resource.total, resource.used + 1) },
                              },
                            })
                          }}
                        >
                          {isActive ? '◉ Active' : resource.used >= resource.total ? 'Used' : '○ Activate'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )
    }

    const isPactBoon = selectedFeature.name === 'Pact Boon'
    if (isPactBoon) {
      const PACT_OPTIONS = [
        { id: 'blade', name: 'Pact of the Blade', description: 'Use your action to create a pact weapon in your empty hand. You can choose its form. It counts as magical and you are proficient with it. Disappears if it is more than 5 ft from you for 1 minute.' },
        { id: 'chain', name: 'Pact of the Chain', description: 'Learn Find Familiar. Your familiar can take one of the following forms: imp, pseudodragon, quasit, or sprite. It can attack as a reaction while you cast a spell.' },
        { id: 'tome', name: 'Pact of the Tome', description: 'Your patron gives you a grimoire called a Book of Shadows. It contains 3 cantrips of your choice from any class. These count as warlock spells for you.' },
      ]
      const isLocked = char.pactBoonLocked ?? false
      const chosen = char.pactBoon ? PACT_OPTIONS.find(p => p.id === char.pactBoon) : null

      // Pact of the Blade: add weapon on confirm
      const handleConfirmBlade = () => {
        const PACT_WEAPON: Weapon = {
          id: 'pact-weapon',
          name: 'Pact Weapon',
          atkBonus: 0,
          damage: '1d8',
          damageType: 'slashing',
          rangeType: 'Melee',
          properties: ['versatile (1d10)'],
        }
        update({
          pactBoon: 'blade',
          pactBoonLocked: true,
          weapons: [...char.weapons, PACT_WEAPON],
          hexWarriorWeaponId: 'pact-weapon',
        })
        setPendingBoon(null)
      }

      return (
        <>
          <ResourcesPanel character={char} update={update} />
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>Pact Boon</span>
              <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Level {selectedFeature.level}</span>
              {renderActionUseButton()}
            </div>
            {isLocked ? (
              <>
                {chosen && (
                  <>
                    <p className={styles.detailFull}><strong>{chosen.name}</strong></p>
                    <p className={styles.detailFull} style={{ color: 'var(--text-muted)', marginTop: 4 }}>{chosen.description}</p>
                  </>
                )}
                {chosen?.id === 'blade' && (
                  <p className={styles.detailFull} style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
                    Your Pact Weapon appears in your weapons list and uses CHA for attacks/damage (Hex Warrior).
                  </p>
                )}
                {chosen?.id === 'tome' && char.tomeCantrips && char.tomeCantrips.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <p className={styles.detailFull} style={{ fontWeight: 600, marginBottom: 4 }}>Cantrips Known:</p>
                    {char.tomeCantrips.map(cid => {
                      const spell = SPELL_BY_ID[cid]
                      return <p key={cid} className={styles.detailFull} style={{ fontSize: 12, color: 'var(--text-muted)' }}>{spell?.name || cid}</p>
                    })}
                  </div>
                )}
                {chosen?.id === 'chain' && char.chainFamiliarType && (
                  <p className={styles.detailFull} style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
                    Familiar: <strong>{char.chainFamiliarType}</strong>
                  </p>
                )}
                <p className={styles.detailFull} style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 8, fontStyle: 'italic' }}>
                  Pact Boon locked — this choice is permanent.
                </p>
              </>
            ) : (
              <>
                {!chosen && !pendingBoon && (
                  <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>Choose your Pact Boon:</p>
                )}
                <div className={styles.fightingStyleList}>
                  {PACT_OPTIONS.map(p => (
                    <button
                      key={p.id}
                      className={`${styles.fightingStyleOption} ${(pendingBoon ?? char.pactBoon) === p.id ? styles.fightingStyleOptionActive : ''}`}
                      onClick={() => setPendingBoon(p.id)}
                    >
                      <span className={styles.fightingStyleName}>{p.name}</span>
                      <span className={styles.fightingStyleDesc}>{p.description}</span>
                    </button>
                  ))}
                </div>
                {(pendingBoon || char.pactBoon) && (
                  <button
                    className={styles.armoryAddBtn}
                    style={{ marginTop: 8 }}
                    onClick={() => {
                      const boonId = pendingBoon ?? char.pactBoon
                      if (boonId === 'blade') {
                        handleConfirmBlade()
                      } else if (boonId === 'tome') {
                        update({ pactBoon: 'tome', pactBoonLocked: true, tomeCantrips: [] })
                        setPendingBoon(null)
                      } else if (boonId === 'chain') {
                        update({ pactBoon: 'chain', pactBoonLocked: true })
                        setPendingBoon(null)
                      }
                    }}
                  >
                    Confirm Pact Boon
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )
    }

    // ── Channel Divinity ──────────────────────────────────────────────
    const isChannelDivinity = selectedFeature.name === 'Channel Divinity (1/rest)'
    if (isChannelDivinity) {
      const cdRes = char.resources['Channel Divinity']
      const cdRemaining = cdRes ? cdRes.total - cdRes.used : 0
      const cdOptions = channelDivinityOptionsFor(char.subclass, char.level)
      const spendChannelDivinity = (optionAction: 'action' | 'bonus' | 'reaction' | 'special') => {
        if (!cdRes || cdRemaining <= 0) return
        update({ resources: { ...char.resources, 'Channel Divinity': { ...cdRes, used: cdRes.used + 1 } } })
        if (optionAction === 'action' || optionAction === 'bonus' || optionAction === 'reaction') {
          useEconomy(char.id, optionAction)
        }
      }
      const cdFormula = (formula: string) =>
        formula.replace('<level*2>', String(char.level * 2)).replace('<level>', String(char.level))
      return (
        <>
          <ResourcesPanel character={char} update={update} />
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>Channel Divinity</span>
              <span className={`${styles.detailBadge} ${styles.badgeAction}`}>Short Rest</span>
            </div>
            {cdRes && (
              <div className={styles.detailResource}>
                {cdRemaining} / {cdRes.total} uses remaining
              </div>
            )}
            {cdOptions.map(opt => {
              const mech = opt.mechanics
              const mechLine =
                mech?.kind === 'healPool' && mech.amountPerLevel > 0 ? `Heal pool: ${mech.amountPerLevel * char.level} HP` :
                mech?.kind === 'damage' ? `Damage: ${cdFormula(mech.formula)} ${mech.damageType}${mech.save ? ` (${mech.save.toUpperCase()} save)` : ''}` :
                mech?.kind === 'tempHp' ? `Temp HP: ${cdFormula(mech.formula)}` :
                mech?.kind === 'attackBonus' ? `+${mech.value} to the attack roll` :
                null
              return (
                <div key={opt.id} style={{ marginTop: 8 }}>
                  <div className={styles.detailHeader}>
                    <span className={styles.detailName} style={{ fontSize: 12 }}>{opt.name}</span>
                    <span className={`${styles.detailBadge} ${styles.badgeAction}`}>
                      {opt.action === 'bonus' ? 'Bonus' : opt.action === 'reaction' ? 'Reaction' : opt.action === 'special' ? 'Special' : 'Action'}
                    </span>
                    <button
                      type="button"
                      className={styles.actionUseBtn}
                      disabled={cdRemaining <= 0}
                      onClick={() => spendChannelDivinity(opt.action)}
                      title={cdRemaining <= 0 ? 'No Channel Divinity uses remaining' : 'Spend 1 Channel Divinity use'}
                    >
                      Use
                    </button>
                  </div>
                  {mechLine && <p className={styles.detailFull} style={{ fontWeight: 600, marginBottom: 2 }}>{mechLine}</p>}
                  <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>{opt.desc}</p>
                </div>
              )
            })}
          </div>
        </>
      )
    }

    // ── Metamagic ─────────────────────────────────────────────────────
    const isMetamagic = selectedFeature.name === 'Metamagic'
    if (isMetamagic) {
      const metaState = char.featureState?.['metamagic'] ?? {}
      const known = metaState.known ?? []
      const limit = metamagicKnownCount(char.level)
      const spRes = char.resources['Sorcery Points']
      const spRemaining = spRes ? spRes.total - spRes.used : 0
      const toggleKnown = (id: string) => {
        const next = known.includes(id)
          ? known.filter(x => x !== id)
          : known.length < limit ? [...known, id] : known
        update({ featureState: { ...(char.featureState ?? {}), metamagic: { ...metaState, known: next } } })
      }
      const spendMetamagic = (cost: number) => {
        if (!spRes || spRemaining < cost) return
        update({ resources: { ...char.resources, 'Sorcery Points': { ...spRes, used: spRes.used + cost } } })
      }
      return (
        <>
          <ResourcesPanel character={char} update={update} />
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>Metamagic</span>
              <span className={`${styles.detailBadge} ${styles.badgeFree}`}>{known.length}/{limit} known</span>
            </div>
            <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>
              Choose your known options ({limit} at your level), then spend sorcery points when you apply one to a spell.
            </p>
            {METAMAGIC_OPTIONS.map(opt => {
              const isKnown = known.includes(opt.id)
              const costLabel = opt.costsSpellLevel ? 'spell level' : `${opt.cost} pt`
              return (
                <div key={opt.id} style={{ marginTop: 8 }}>
                  <div className={styles.detailHeader}>
                    <span className={styles.detailName} style={{ fontSize: 12 }}>{opt.name}</span>
                    <span className={`${styles.detailBadge} ${styles.badgeBonus}`}>{costLabel}</span>
                    <button
                      type="button"
                      className={styles.actionUseBtn}
                      disabled={!isKnown && known.length >= limit}
                      onClick={() => toggleKnown(opt.id)}
                    >
                      {isKnown ? 'Forget' : 'Learn'}
                    </button>
                    {isKnown && !opt.costsSpellLevel && (
                      <button
                        type="button"
                        className={styles.actionUseBtn}
                        disabled={spRemaining < opt.cost}
                        onClick={() => spendMetamagic(opt.cost)}
                        title={spRemaining < opt.cost ? 'Not enough sorcery points' : `Spend ${opt.cost} sorcery point${opt.cost > 1 ? 's' : ''}`}
                      >
                        Spend {opt.cost}pt
                      </button>
                    )}
                    {isKnown && opt.costsSpellLevel && (
                      <span className={styles.detailResource} title="Cost equals the spell's level (minimum 1) — spend from the Sorcery Points pool above">
                        cost = spell level
                      </span>
                    )}
                  </div>
                  <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>{opt.desc}</p>
                </div>
              )
            })}
          </div>
        </>
      )
    }

    // ── Portent (Divination) ──────────────────────────────────────────
    const isPortent = selectedFeature.name === 'Portent' || selectedFeature.name === 'Greater Portent'
    if (isPortent) {
      const portentState = char.featureState?.['portent'] ?? {}
      const rolls = (portentState.data?.rolls as number[] | undefined) ?? []
      const diceCount = portentDiceCount(char.level)
      const setRolls = (next: number[]) =>
        update({ featureState: { ...(char.featureState ?? {}), portent: { ...portentState, data: { ...portentState.data, rolls: next } } } })
      return (
        <>
          <ResourcesPanel character={char} update={update} />
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>Portent</span>
              <span className={`${styles.detailBadge} ${styles.badgeFree}`}>{diceCount} dice / long rest</span>
              <button
                type="button"
                className={styles.actionUseBtn}
                onClick={() => setRolls(Array.from({ length: diceCount }, () => rollDie(20)))}
                title="Roll your foretelling dice (after a long rest)"
              >
                Roll {diceCount}d20
              </button>
            </div>
            {rolls.length > 0 ? (
              <div className={styles.detailResource} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                Foretold:
                {rolls.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    className={styles.actionUseBtn}
                    onClick={() => setRolls(rolls.filter((_, j) => j !== i))}
                    title="Spend this foretelling roll (replaces any attack roll, save, or ability check)"
                  >
                    {r} ✕
                  </button>
                ))}
              </div>
            ) : (
              <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>No foretelling dice recorded — roll after a long rest.</p>
            )}
            <p className={styles.detailFull}>{selectedFeature.desc}</p>
          </div>
        </>
      )
    }

    // ── Rage ──────────────────────────────────────────────────────────
    const isWildMagicSurge = selectedFeature.name === 'Wild Magic Surge' && char.subclass === 'WildMagicSorcerer'
    if (isWildMagicSurge) {
      const result = wildMagicRoll
        ? WILD_MAGIC_SURGE_TABLE.find(row => row.min <= wildMagicRoll && wildMagicRoll <= row.max)
        : null
      return (
        <>
          <ResourcesPanel character={char} update={update} />
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>Wild Magic Surge</span>
              <span className={`${styles.detailBadge} ${styles.badgeFree}`}>d100</span>
              {renderActionUseButton()}
            </div>
            <p className={styles.detailFull}>{selectedFeature.desc}</p>
            <button
              className={styles.armoryAddBtn}
              style={{ marginTop: 8 }}
              onClick={() => setWildMagicRoll(Math.floor(Math.random() * 100) + 1)}
            >
              Roll d100
            </button>
            {result && (
              <div className={styles.detailResource} style={{ marginTop: 10 }}>
                Roll {wildMagicRoll}: {result.effect}
              </div>
            )}
          </div>
        </>
      )
    }

    const isTidesOfChaos = selectedFeature.name === 'Tides of Chaos' && char.subclass === 'WildMagicSorcerer'
    if (isTidesOfChaos) {
      const res = char.resources['Tides of Chaos'] ?? { used: 0, total: 1 }
      const remaining = Math.max(0, res.total - res.used)
      return (
        <>
          <ResourcesPanel character={char} update={update} />
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>Tides of Chaos</span>
              <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Long Rest</span>
              {renderActionUseButton()}
            </div>
            <div className={styles.detailResource}>{remaining} / {res.total} uses remaining</div>
            <p className={styles.detailFull}>{selectedFeature.desc}</p>
            <button
              className={styles.armoryAddBtn}
              style={{ marginTop: 8 }}
              disabled={remaining <= 0}
              onClick={() => update({
                resources: {
                  ...char.resources,
                  'Tides of Chaos': { total: res.total, used: Math.min(res.total, res.used + 1) },
                },
              })}
            >
              Use Tides of Chaos
            </button>
          </div>
        </>
      )
    }

    const isPsionicPower = selectedFeature.name === 'Psionic Power' && char.subclass === 'PsiWarrior'
    if (isPsionicPower) {
      const res = char.resources['Psionic Energy']
      const total = res?.total ?? char.proficiencyBonus * 2
      const used = res?.used ?? 0
      const remaining = Math.max(0, total - used)
      return (
        <>
          <ResourcesPanel character={char} update={update} />
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>Psionic Power</span>
              <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Subclass</span>
              {renderActionUseButton()}
            </div>
            <div className={styles.detailResource}>{remaining} / {total} Psionic Energy dice remaining</div>
            <p className={styles.detailFull} style={{ marginTop: 6 }}>{selectedFeature.desc}</p>
            <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
              {psiWarriorAbilities.map(ability => {
                const locked = char.level < ability.unlockLevel
                const canSpend = ability.diceCost > 0 && !locked && remaining >= ability.diceCost
                return (
                  <div key={ability.id} style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                      <strong style={{ fontSize: 12 }}>{ability.name}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                        L{ability.unlockLevel} · {ability.diceCost === 0 ? 'No cost' : `${ability.diceCost} die`}
                      </span>
                    </div>
                    <p className={styles.detailFull} style={{ marginTop: 4, color: locked ? 'var(--text-muted)' : undefined }}>
                      {ability.description}
                    </p>
                    {ability.diceCost > 0 && (
                      <button
                        className={styles.armoryAddBtn}
                        style={{ marginTop: 6 }}
                        disabled={!canSpend}
                        onClick={() => {
                          if (!canSpend) return
                          update({
                            resources: {
                              ...char.resources,
                              'Psionic Energy': { total, used: Math.min(total, used + ability.diceCost) },
                            },
                          })
                        }}
                      >
                        Spend Psionic Energy
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )
    }

    const isRage = selectedFeature.name === 'Rage'
    if (isRage) {
      const rageRes = char.resources['Rage']
      const canRage = rageRes ? rageRes.used < rageRes.total : false
      const wildSurgeResult = barbarianWildSurgeRoll
        ? wildSurgeTable.find(row => row.roll === barbarianWildSurgeRoll)
        : null
      return (
        <>
          <ResourcesPanel character={char} update={update} />
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>Rage</span>
              <span className={`${styles.detailBadge} ${styles.badgeBonusAction}`}>Bonus</span>
              {renderActionUseButton()}
            </div>
            {char.subclass === 'WildMagicBarbarian' && (
              <div style={{ marginTop: 8 }}>
                <button
                  className={styles.detailChipBtn}
                  onClick={() => setBarbarianWildSurgeRoll(Math.floor(Math.random() * 8) + 1)}
                >
                  Wild Surge (roll d8)
                </button>
                {wildSurgeResult && (
                  <div className={styles.detailResource} style={{ marginTop: 8 }}>
                    Roll {wildSurgeResult.roll}: {wildSurgeResult.name} - {wildSurgeResult.description}
                  </div>
                )}
              </div>
            )}
            {char.isRaging ? (
              <div className={styles.detailResource} style={{ color: 'var(--danger, #ef4444)' }}>Currently Raging</div>
            ) : (
              rageRes && <div className={styles.detailResource}>{rageRes.total - rageRes.used} / {rageRes.total} rages remaining</div>
            )}
            <p className={styles.detailFull} style={{ marginTop: 6 }}>While raging:</p>
            <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>• +2 damage on STR-based weapon attacks</p>
            <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>• Advantage on STR checks and STR saving throws</p>
            <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>• Resistance to bludgeoning, piercing, and slashing damage</p>
            <p className={styles.detailFull} style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>Rage ends if you don't attack or take damage since your last turn, or you fall unconscious.</p>
            {char.isRaging ? (
              <button
                className={styles.armoryAddBtn}
                style={{ marginTop: 8, background: 'var(--danger, #ef4444)' }}
                onClick={() => update({ isRaging: false })}
              >
                End Rage
              </button>
            ) : (
              <button
                className={styles.armoryAddBtn}
                style={{ marginTop: 8 }}
                disabled={!canRage}
                onClick={() => {
                  if (!canRage) return
                  const newResources = { ...char.resources }
                  if (newResources['Rage']) newResources['Rage'] = { ...newResources['Rage'], used: newResources['Rage'].used + 1 }
                  if (char.subclass === 'WildMagicBarbarian') setBarbarianWildSurgeRoll(Math.floor(Math.random() * 8) + 1)
                  update({ isRaging: true, resources: newResources })
                }}
              >
                Begin Raging
              </button>
            )}
          </div>
        </>
      )
    }

    // ── Bladesong ─────────────────────────────────────────────────────
    const isBladesongFeature = selectedFeature.name === 'Bladesong'
    if (isBladesongFeature) {
      const bsRes = char.resources['Bladesong']
      const total = 2
      const used = bsRes?.used ?? 0
      const canActivate = used < total
      const hasShield = !!(char.equipment.shieldId || char.equipment.hasShield)
      const hasTwoHanded = char.weapons.some(w => w.twoHanded)
      const armorId = char.equipment.armorId
      const armorDef = armorId ? GEAR_BY_ID[armorId] : null
      const isMedHeavy = armorDef?.type === 'medium' || armorDef?.type === 'heavy'
      const blocked = hasShield || hasTwoHanded || isMedHeavy
      const intMod = mod(char.abilityScores.int)
      return (
        <>
          <ResourcesPanel character={char} update={update} />
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>Bladesong</span>
              <span className={`${styles.detailBadge} ${styles.badgeBonusAction}`}>Bonus</span>
              {renderActionUseButton()}
            </div>
            {char.isBladesinging ? (
              <div className={styles.detailResource} style={{ color: 'var(--accent)' }}>Bladesong Active</div>
            ) : (
              <div className={styles.detailResource}>{total - used} / {total} uses · Long rest recharge</div>
            )}
            <p className={styles.detailFull} style={{ marginTop: 6 }}>While active (1 minute):</p>
            <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>• +{Math.max(1, intMod)} to AC (INT modifier, min +1)</p>
            <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>• +10 ft movement speed</p>
            <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>• Advantage on Acrobatics checks</p>
            <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>• +{Math.max(1, intMod)} to Constitution saves (concentration)</p>
            <p className={styles.detailFull} style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>Requires: light or no armor, no shield, no two-handed weapon. Ends if you don armor or a shield, wield a two-handed weapon, or are incapacitated.</p>
            {blocked && !char.isBladesinging && (
              <p className={styles.detailFull} style={{ color: 'var(--danger, #ef4444)', fontSize: 11, marginTop: 4 }}>
                {isMedHeavy ? 'Remove medium/heavy armor first.' : hasShield ? 'Unequip shield first.' : 'Unequip two-handed weapon first.'}
              </p>
            )}
            {char.isBladesinging ? (
              <button
                className={styles.armoryAddBtn}
                style={{ marginTop: 8, background: 'var(--danger, #ef4444)' }}
                onClick={() => update({ isBladesinging: false })}
              >
                End Bladesong
              </button>
            ) : (
              <button
                className={styles.armoryAddBtn}
                style={{ marginTop: 8 }}
                disabled={!canActivate || blocked}
                onClick={() => {
                  if (!canActivate || blocked) return
                  const newResources = { ...char.resources }
                  newResources['Bladesong'] = { total, used: used + 1 }
                  update({ isBladesinging: true, resources: newResources })
                }}
              >
                Activate Bladesong
              </button>
            )}
          </div>
        </>
      )
    }

    // ── Unarmored Defense ─────────────────────────────────────────────
    const isUnarmoredDefense = selectedFeature.name === 'Unarmored Defense'
    if (isUnarmoredDefense) {
      const dexMod = Math.floor((char.abilityScores.dex - 10) / 2)
      const conMod = Math.floor((char.abilityScores.con - 10) / 2)
      const wisMod = Math.floor((char.abilityScores.wis - 10) / 2)
      const formula = char.classId === 'Barbarian'
        ? `10 + DEX (${dexMod >= 0 ? '+' : ''}${dexMod}) + CON (${conMod >= 0 ? '+' : ''}${conMod}) = ${10 + dexMod + conMod}`
        : `10 + DEX (${dexMod >= 0 ? '+' : ''}${dexMod}) + WIS (${wisMod >= 0 ? '+' : ''}${wisMod}) = ${10 + dexMod + wisMod}`
      return (
        <>
          <ResourcesPanel character={char} update={update} />
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>Unarmored Defense</span>
              <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Passive</span>
              {renderActionUseButton()}
            </div>
            <div className={styles.detailResource}>Current AC: {char.armorClass}</div>
            <p className={styles.detailFull}>Formula: {formula}</p>
            <p className={styles.detailFull} style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
              Only applies when not wearing armor. A shield is still allowed.
            </p>
          </div>
        </>
      )
    }

    // ── Wild Shape ────────────────────────────────────────────────────
    const isWildShape = selectedFeature.name === 'Wild Shape'
    if (isWildShape) {
      const wsRes = char.resources['Wild Shape']
      const isMoon = char.subclass === 'CircleOfTheMoon'
      const crCap = char.level >= 8 ? 1 : char.level >= 4 ? 0.5 : 0.25
      const crLimit = char.level >= 8 ? 'CR 1' : char.level >= 4 ? 'CR 1/2' : 'CR 1/4'
      const moonCr = char.level >= 9 ? 'CR ' + Math.floor(char.level / 3) : char.level >= 6 ? 'CR 2' : 'CR 1'
      const eligibleBeasts = WILD_SHAPE_BEASTS.filter(beast => beast.cr <= crCap)
      const selectedBeast = eligibleBeasts.find(beast => beast.id === selectedWildShapeBeastId) ?? eligibleBeasts[0]
      const canShape = !!wsRes && wsRes.used < wsRes.total && !!selectedBeast && !char.wildShapeForm
      return (
        <>
          <ResourcesPanel character={char} update={update} />
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>Wild Shape</span>
              <span className={`${styles.detailBadge} ${styles.badgeAction}`}>Action · SR</span>
              {renderActionUseButton()}
            </div>
            {wsRes && (
              <div className={styles.detailResource}>{wsRes.total - wsRes.used} / {wsRes.total} uses remaining</div>
            )}
            {char.wildShapeForm && (
              <div className={styles.detailResource}>
                Current form: {char.wildShapeForm.name} · {char.wildShapeForm.hp.current}/{char.wildShapeForm.hp.max} HP
              </div>
            )}
            <p className={styles.detailFull} style={{ marginTop: 6 }}>
              CR limit: <strong>{isMoon ? moonCr : crLimit}</strong>
              {isMoon && <span style={{ color: 'var(--accent)', marginLeft: 6, fontSize: 11 }}>Circle of the Moon</span>}
            </p>
            <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>
              {char.level < 4 ? '• No fly or swim speed' : char.level < 8 ? '• No fly speed' : '• Fly and swim speeds allowed'}
            </p>
            <p className={styles.detailFull} style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
              You retain your personality, memories, and mental ability scores. You revert when reduced to 0 HP, you choose to, or the duration ends (hours = ½ druid level).
            </p>
            <p className={styles.detailFull} style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
              Modeling: Wild Shape uses an inline form object on the character, so beast HP can absorb damage before overflow reaches druid HP.
            </p>
            {char.concentrationSpellId && (
              <p className={styles.detailFull} style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
                Concentration persists on the druid while shaped.
              </p>
            )}
            <select
              className={styles.armoryInput}
              style={{ marginTop: 10 }}
              value={selectedBeast?.id ?? ''}
              onChange={e => setSelectedWildShapeBeastId(e.target.value)}
            >
              {eligibleBeasts.map(beast => (
                <option key={beast.id} value={beast.id}>
                  {beast.name} · CR {beast.cr} · HP {beast.hp} · AC {beast.ac}
                </option>
              ))}
            </select>
            {selectedBeast && (
              <div className={styles.detailResource} style={{ marginTop: 8 }}>
                {selectedBeast.speed} · {selectedBeast.attack}
                {selectedBeast.speed.includes('fly') && char.level < 8 ? ' · flying speed restricted before L8' : ''}
                {selectedBeast.speed.includes('swim') && char.level < 4 ? ' · swimming speed restricted before L4' : ''}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button
                className={styles.armoryAddBtn}
                disabled={!canShape}
                onClick={() => {
                  if (!canShape || !selectedBeast || !wsRes) return
                  update({
                    resources: {
                      ...char.resources,
                      'Wild Shape': { total: wsRes.total, used: Math.min(wsRes.total, wsRes.used + 1) },
                    },
                    wildShapeForm: {
                      name: selectedBeast.name,
                      hp: { current: selectedBeast.hp, max: selectedBeast.hp },
                      ac: selectedBeast.ac,
                      cr: selectedBeast.cr,
                      speed: selectedBeast.speed,
                    },
                  })
                }}
              >
                Enter Wild Shape
              </button>
              {char.wildShapeForm && (
                <button
                  className={styles.detailChipBtn}
                  onClick={() => update({ wildShapeForm: undefined })}
                >
                  Leave Form
                </button>
              )}
            </div>
          </div>
        </>
      )
    }

    // ── Martial Arts ──────────────────────────────────────────────────
    const isMartialArts = selectedFeature.name === 'Martial Arts'
    if (isMartialArts) {
      const die = char.level >= 17 ? 'd10' : char.level >= 11 ? 'd8' : char.level >= 5 ? 'd6' : 'd4'
      const dexMod = Math.floor((char.abilityScores.dex - 10) / 2)
      const strMod = Math.floor((char.abilityScores.str - 10) / 2)
      const atkMod = Math.max(strMod, dexMod) + char.proficiencyBonus
      return (
        <>
          <ResourcesPanel character={char} update={update} />
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>Martial Arts</span>
              <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Passive</span>
              {renderActionUseButton()}
            </div>
            <div className={styles.detailResource}>Unarmed die: <strong>{die}</strong> · Attack: {atkMod >= 0 ? '+' : ''}{atkMod}</div>
            <p className={styles.detailFull} style={{ marginTop: 6 }}>
              You can use DEX instead of STR for unarmed strikes and monk weapons. Your unarmed strikes use the {die} damage die.
            </p>
            <p className={styles.detailFull} style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
              Die scales: d4 (1–4) → d6 (5–10) → d8 (11–16) → d10 (17–20)
            </p>
          </div>
        </>
      )
    }

    // ── Ki abilities (Flurry, Patient Defense, Step of the Wind) ─────
    const isKiAbility = ['Flurry of Blows', 'Patient Defense', 'Step of the Wind'].includes(selectedFeature.name)
    if (isKiAbility) {
      const kiRes = char.resources['Ki']
      const desc: Record<string, string> = {
        'Flurry of Blows': 'Immediately after you take the Attack action on your turn, make two unarmed strikes as a bonus action.',
        'Patient Defense': 'Take the Dodge action as a bonus action. Until the start of your next turn, attack rolls against you have disadvantage, and you make DEX saves with advantage.',
        'Step of the Wind': 'Take the Disengage or Dash action as a bonus action. Your jump distance is also doubled for the turn.',
      }
      return (
        <>
          <ResourcesPanel character={char} update={update} />
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>{selectedFeature.name}</span>
              <span className={`${styles.detailBadge} ${styles.badgeBonusAction}`}>Bonus · 1 Ki</span>
              {renderActionUseButton()}
            </div>
            {kiRes && (
              <div className={styles.detailResource}>{kiRes.total - kiRes.used} / {kiRes.total} Ki remaining</div>
            )}
            <p className={styles.detailFull} style={{ marginTop: 6 }}>{desc[selectedFeature.name]}</p>
          </div>
        </>
      )
    }

    // ── Bardic Inspiration ────────────────────────────────────────────
    const isBardicInspiration = selectedFeature.name === 'Bardic Inspiration'
    if (isBardicInspiration) {
      const die = char.level >= 15 ? 'd12' : char.level >= 10 ? 'd10' : char.level >= 5 ? 'd8' : 'd6'
      const biRes = char.resources['Bardic Inspiration']
      return (
        <>
          <ResourcesPanel character={char} update={update} />
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>Bardic Inspiration</span>
              <span className={`${styles.detailBadge} ${styles.badgeBonusAction}`}>Bonus</span>
              {renderActionUseButton()}
            </div>
            <div className={styles.detailResource}>
              Inspiration die: <strong>{die}</strong>
              {biRes && ` · ${biRes.total - biRes.used} / ${biRes.total} uses`}
            </div>
            <p className={styles.detailFull} style={{ marginTop: 6 }}>
              Choose one creature other than yourself within 60 ft that can hear you. That creature gains one Bardic Inspiration die ({die}).
            </p>
            <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>
              The creature can add the die to one ability check, attack roll, or saving throw within the next 10 minutes. Only one die at a time.
            </p>
            <p className={styles.detailFull} style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
              Die scales: d6 (1–4) → d8 (5–9) → d10 (10–14) → d12 (15+)
            </p>
          </div>
        </>
      )
    }

    // ── Reckless Attack ───────────────────────────────────────────────
    const isRecklessAttack = selectedFeature.name === 'Reckless Attack'
    if (isRecklessAttack) {
      return (
        <>
          <ResourcesPanel character={char} update={update} />
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>Reckless Attack</span>
              <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Passive</span>
              {renderActionUseButton()}
            </div>
            <p className={styles.detailFull}>
              When you make your first attack on your turn, you can choose to attack recklessly. Doing so gives you advantage on melee weapon attack rolls using Strength this turn.
            </p>
            <p className={styles.detailFull} style={{ color: 'var(--text-muted)', marginTop: 4 }}>
              Until the start of your next turn, attack rolls against you also have advantage.
            </p>
          </div>
        </>
      )
    }

    // ── Danger Sense ─────────────────────────────────────────────────
    const isDangerSense = selectedFeature.name === 'Danger Sense'
    if (isDangerSense) {
      return (
        <>
          <ResourcesPanel character={char} update={update} />
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>Danger Sense</span>
              <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Passive</span>
              {renderActionUseButton()}
            </div>
            <p className={styles.detailFull}>
              You have advantage on Dexterity saving throws against effects that you can see, such as traps and spells.
            </p>
            <p className={styles.detailFull} style={{ color: 'var(--text-muted)', marginTop: 4 }}>
              Does not apply if you are blinded, deafened, or incapacitated.
            </p>
          </div>
        </>
      )
    }

    // ── Expertise ─────────────────────────────────────────────────────
    const isExpertise = selectedFeature.name === 'Expertise'
    if (isExpertise) {
      const maxExpertise = char.classId === 'Rogue'
        ? (char.level >= 6 ? 4 : 2)
        : char.classId === 'Bard'
        ? (char.level >= 10 ? 4 : 2)
        : 2
      const currentExpertCount = Object.values(char.skillProficiencies).filter(v => v === 'expert').length
      const proficientSkills = SKILLS.filter(s => char.skillProficiencies[s.key])
      return (
        <>
          <ResourcesPanel character={char} update={update} />
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>Expertise</span>
              <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Level {selectedFeature.level}</span>
              {renderActionUseButton()}
            </div>
            <div className={styles.detailResource}>{currentExpertCount} / {maxExpertise} expertise slots used</div>
            <p className={styles.detailFull} style={{ color: 'var(--text-muted)', marginBottom: 8 }}>
              Click a proficient skill to upgrade it to expertise (double proficiency). Click an expert skill to revert.
            </p>
            <div className={styles.masterySpellGrid}>
              {proficientSkills.map(s => {
                const state = char.skillProficiencies[s.key]
                const isExpert = state === 'expert'
                const canUpgrade = !isExpert && currentExpertCount < maxExpertise
                return (
                  <button
                    key={s.key}
                    className={`${styles.masterySpellChip} ${isExpert ? styles.masterySpellChipActive : ''}`}
                    disabled={!isExpert && !canUpgrade}
                    style={!isExpert && !canUpgrade ? { opacity: 0.4 } : undefined}
                    onClick={() => {
                      const newProfs = { ...char.skillProficiencies }
                      newProfs[s.key] = isExpert ? 'proficient' : 'expert'
                      update({ skillProficiencies: newProfs })
                    }}
                  >
                    {s.label}{isExpert ? ' ★' : ''}
                  </button>
                )
              })}
              {proficientSkills.length === 0 && (
                <span className={styles.masterySpellEmpty}>No proficient skills yet.</span>
              )}
            </div>
          </div>
        </>
      )
    }

    const isArcaneRecovery = selectedFeature.name === 'Arcane Recovery'
    if (isArcaneRecovery) return renderArcaneRecovery(selectedFeature.desc)

    return (
      <>
        <ResourcesPanel character={char} update={update} />
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>{selectedFeature.name}</span>
            <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Level {selectedFeature.level}</span>
            {renderActionUseButton()}
          </div>
          {isAsi && asiDone ? (
            <p className={styles.detailFull}>✓ Completed</p>
          ) : (
            <p className={styles.detailFull}>{selectedFeature.desc}</p>
          )}
        </div>
      </>
    )
  }

  // DEFAULT: no action selected — show resources + prompt
  if (!selectedAction || !selectedActionDef) {
    return (
      <>
        <ResourcesPanel character={char} update={update} />
        <div className={styles.detailEmpty}>Select an action to see its details.</div>
      </>
    )
  }

  // CAST A SPELL variants — show description + full spell panel
  if (CAST_SPELL_NAMES.has(selectedAction)) {
    const castingTimeFilter =
      selectedAction === 'Cast a Spell (Bonus)' ? 'bonus action' :
      selectedAction === 'Cast a Spell (Reaction)' ? 'reaction' :
      undefined
    return (
      <>
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>{selectedActionDef.name}</span>
            <span className={`${styles.detailBadge} ${badgeClass(selectedActionDef.type)}`}>
              {selectedActionDef.type === 'Bonus Action' ? 'Bonus' : selectedActionDef.type}
            </span>
            {renderActionUseButton()}
          </div>
          <p className={styles.detailFull}>{selectedActionDef.full}</p>
        </div>
        <div className={styles.spellsWrapper}>
          <SpellsPanel
            character={char}
            update={update}
            castingTimeFilter={castingTimeFilter}
            onLearnSpell={(char.classId === 'Wizard' || !!SUBCLASS_BY_ID[char.subclass ?? '']?.spellListClassId) ? (id) => update({ spellIds: [...new Set([...char.spellIds, id])] }) : undefined}
            onSummon={onSummon}
            onConcentrationBroken={onConcentrationBroken}
          />
        </div>
      </>
    )
  }

  // ATTACK — show description + weapons table + attack breakdown
  if (selectedAction === 'Attack') {
    return (
      <div className={styles.attackWrapper}>
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>{selectedActionDef.name}</span>
            <span className={`${styles.detailBadge} ${badgeClass(selectedActionDef.type)}`}>
              {selectedActionDef.type}
            </span>
            {renderActionUseButton()}
          </div>
          <p className={styles.detailFull}>{selectedActionDef.full}</p>
        </div>

        <div className={styles.attackDetailWeapons}>
            {char.weapons.map(w => {
              const rows = buildAttackRows(char, w, { smiteSlotLevel: selectedSmiteSlotLevel })
              const wActive = activeRows[w.id] ?? {}
              const hasVersatile   = rows.some(r => r.id === 'versatile')
              const hasThrown      = rows.some(r => r.id === 'thrown')
              const versatileActive = hasVersatile && (wActive['versatile'] ?? false)

              // Calculate crit modifiers from weapon and equipped gear
              // Look up weapon in equipment database to get full definition (including critModifier)
              const weaponDef = WEAPONS.find(wd => wd.id === w.id)
              const weaponCritMod = (w.critModifier || weaponDef?.critModifier) ? Object.values(w.critModifier || weaponDef?.critModifier || {})[0] : 0

              // Create a map of equipment modifiers by item ID
              const gearModifierMap: Record<string, number> = {}
              const gearCritMods: number[] = []
              const gearSlots = [char.equipment.armorId, char.equipment.shieldId, char.equipment.helmetId,
                char.equipment.necklaceId, char.equipment.capeId, char.equipment.legsId, char.equipment.bootsId,
                char.equipment.glovesId, char.equipment.ring1Id, char.equipment.ring2Id, char.equipment.amuletId]
              for (const itemId of gearSlots) {
                if (!itemId) continue
                const gear = GEAR_BY_ID[itemId]
                if (gear?.stats?.critModifier) {
                  const critMod = Object.values(gear.stats.critModifier)[0]
                  if (critMod) {
                    gearModifierMap[itemId] = critMod
                    gearCritMods.push(critMod)
                  }
                }
              }

              const renderTable = (
                tableRows: AttackRow[],
                isRowActive: (rid: string) => boolean,
                onToggle: (rid: string) => void,
                totalToHit: number | null,
                subtotals: { expr: string; type: string }[],
                hasVersatileInTable: boolean,
                critThreshold?: number,
              ) => {
                const displayRows = tableRows.filter(row => row.name !== 'Piercer Critical' && row.name !== 'Crusher Critical')
                const totalToHitDice = tableRows
                  .filter(row => isRowActive(row.id) && row.toHitDice)
                  .map(row => row.toHitDice!)
                const extraCritDice = critExtraDice(char, w, w.damageType ?? '')
                const critTotals = criticalSubtotals(subtotals, extraCritDice)
                return (
                <table className={styles.attackBreakdownTable}>
                  <thead>
                    <tr>
                      <th>Attack</th><th>To Hit</th><th>Crit mod</th><th>DMG</th>
                      <th>DMG Type</th><th>Bonus DMG</th><th>Bonus Type</th><th>Resource</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.map(row => (
                      <tr
                        key={row.id}
                        className={[
                          styles.attackBreakdownRow,
                          row.disabled ? styles.attackBreakdownRowDisabled : isRowActive(row.id) ? styles.attackBreakdownRowActive : styles.attackBreakdownRowDimmed,
                          (row.id !== 'normal' || hasVersatileInTable) && !row.disabled ? styles.attackBreakdownRowToggleable : '',
                        ].join(' ')}
                        onClick={() => !row.disabled && onToggle(row.id)}
                      >
                        <td title={row.note}>{row.name}{row.disabled ? ' *' : ''}{row.note && <span className={styles.diceNote}> note</span>}</td>
                        <td>{BASE_ATTACK_ROW_IDS.has(row.id)
                          ? formatToHitParts(row.toHit, row.toHitDice ? [row.toHitDice] : [])
                          : formatToHitRider(row.toHit, row.toHitDice ? [row.toHitDice] : [])}</td>
                        <td style={{ fontSize: '11px', color: (weaponCritMod !== 0 || Object.keys(gearModifierMap).length > 0) ? 'var(--accent)' : 'var(--text-muted)' }}>
                          {(() => {
                            if (row.id === 'normal' && weaponCritMod !== 0) {
                              return weaponCritMod > 0 ? `-${weaponCritMod}` : `+${Math.abs(weaponCritMod)}`
                            }
                            // For equipment rows, find matching equipment modifier
                            if (row.id.startsWith('equip-bonus-')) {
                              const rowBaseName = row.name.split(' (')[0].trim().toLowerCase()
                              const equipId = Object.keys(gearModifierMap).find(id => {
                                const gearName = GEAR_BY_ID[id]?.name?.split(' (')[0].trim().toLowerCase()
                                return gearName === rowBaseName
                              })
                              if (equipId) {
                                const mod = gearModifierMap[equipId]
                                return mod !== 0 ? (mod > 0 ? `-${mod}` : `+${Math.abs(mod)}`) : '—'
                              }
                            }
                            return '—'
                          })()}
                        </td>
                        <td>{row.dmg ?? '—'}</td>
                        <td>{row.dmgType ?? '—'}</td>
                        <td>{row.bonusDmg ?? '—'}</td>
                        <td>{row.bonusDmgType ?? '—'}</td>
                        <td>
                          <span className={styles.resourceChip}>{rowResource(row)}</span>
                          {renderOneShotUsedButton(row)}
                          {row.id === 'Divine Smite' && renderDivineSmiteSlotPicker()}
                          {row.id === 'booming-blade' && <BoomingBladeTurnToggle charId={char.id} />}
                          {row.id === 'normal' && char.classId === 'Cleric' && char.level >= 8 && <DivineStrikeTurnToggle charId={char.id} subclass={char.subclass} level={char.level} />}
                        </td>
                      </tr>
                    ))}
                    {char.subclass === 'Champion' && (
                      <tr style={{ opacity: 0.7, fontSize: '11px' }}>
                        <td>champion</td>
                        <td></td>
                        <td style={{ color: 'var(--accent)', fontWeight: 'bold' }}>
                          {char.level >= 15 ? '-2' : char.level >= 3 ? '-1' : '—'}
                        </td>
                        <td colSpan={5}></td>
                      </tr>
                    )}
                    <tr className={styles.attackBreakdownTotalRow}>
                      <td>Total</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {formatToHitParts(totalToHit, totalToHitDice)}
                      </td>
                      <td style={{ verticalAlign: 'middle' }}>
                        {critThreshold !== undefined && (
                          <span style={{ padding: '4px 10px', backgroundColor: '#d4af37', color: '#1a1a1a', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #8b7c3a', display: 'inline-block' }}>
                            Crit {critThreshold}+
                          </span>
                        )}
                      </td>
                      <td colSpan={5}>{subtotals.map(s => `(${s.expr}) ${s.type}`).join(' + ') || '—'}</td>
                    </tr>
                    {extraCritDice.map((extra, index) => (
                      <tr key={`crit-extra-${index}`} className={styles.attackBreakdownCritExtraRow}>
                        <td>{extra.type === 'piercing' ? 'Piercer Critical' : 'Critical Extra'}</td>
                        <td>{'\u2014'}</td>
                        <td>{'\u2014'}</td>
                        <td>{extra.expr}</td>
                        <td>{extra.type}</td>
                        <td>{'\u2014'}</td>
                        <td>{'\u2014'}</td>
                        <td>{'\u2014'}</td>
                      </tr>
                    ))}
                    <tr className={styles.attackBreakdownCriticalRow}>
                      <td>critical</td>
                      <td>{'\u2014'}</td>
                      <td>{'\u2014'}</td>
                      <td colSpan={5}>{critTotals.map(s => `(${s.expr}) ${s.type}`).join(' + ') || '\u2014'}</td>
                    </tr>
                  </tbody>
                </table>
                )
              }

              if (hasThrown) {
                // Split into melee and ranged sub-tables
                const thrownProp = w.properties?.find(p => p.toLowerCase().includes('thrown'))
                const throwRange = thrownProp?.match(/range (\d+\/\d+)/i)?.[1] ?? '?'
                const meleeRows  = rows.filter(r => (r.group ?? 'melee') !== 'ranged')
                const rangedRows = rows.filter(r => r.group === 'ranged' || r.group === 'both')

                const isMeleeActive = (rid: string) => {
                  const row = rows.find(r => r.id === rid)
                  if (row?.disabled) return false
                  if (rid === 'normal')    return !versatileActive
                  if (rid === 'versatile') return  versatileActive
                  if (rid === 'booming-blade') return boomingBladeActive
                  return rid.startsWith('maneuver-') || rid.startsWith('turn-resource-') || rid.startsWith('equip-bonus-') ||
                         rid.startsWith('spell-buff-') || (wActive[rid] ?? false)
                }
                const isRangedActive = (rid: string) => {
                  const row = rows.find(r => r.id === rid)
                  if (row?.disabled) return false
                  if (rid === 'thrown') return true
                  if (rid === 'booming-blade') return boomingBladeActive
                  return rid.startsWith('arcane-') || rid.startsWith('turn-resource-') || rid.startsWith('equip-bonus-') ||
                         rid.startsWith('spell-buff-') || rid.startsWith('maneuver-') ||
                         (wActive[rid] ?? false)
                }
                function toggleMelee(rid: string) {
                  const row = rows.find(r => r.id === rid)
                  if (row?.disabled) return
                  if (rid === 'booming-blade') return
                  if (rid === 'normal' || rid.startsWith('equip-bonus-') || rid.startsWith('spell-buff-') || rid.startsWith('maneuver-') || rid.startsWith('turn-resource-')) return
                  if (rid === 'versatile') {
                    setActiveRows(prev => ({ ...prev, [w.id]: { ...(prev[w.id] ?? {}), versatile: !(wActive['versatile'] ?? false) } }))
                    return
                  }
                  setActiveRows(prev => ({ ...prev, [w.id]: { ...(prev[w.id] ?? {}), [rid]: !(prev[w.id]?.[rid] ?? false) } }))
                }
                function toggleRanged(rid: string) {
                  if (rid === 'booming-blade') return
                  if (rid === 'thrown' || rid.startsWith('arcane-') || rid.startsWith('equip-bonus-') || rid.startsWith('spell-buff-') || rid.startsWith('maneuver-') || rid.startsWith('turn-resource-')) return
                  setActiveRows(prev => ({ ...prev, [w.id]: { ...(prev[w.id] ?? {}), [rid]: !(prev[w.id]?.[rid] ?? false) } }))
                }

                const meleeTotalToHit = meleeRows.filter(r => isMeleeActive(r.id) && r.toHit !== null).reduce((a, r) => a + r.toHit!, 0)
                const rangedTotalToHit = rangedRows.filter(r => isRangedActive(r.id) && r.toHit !== null).reduce((a, r) => a + r.toHit!, 0)
                const meleeSubtotals  = dmgSubtotals(meleeRows,  isMeleeActive)
                const rangedSubtotals = dmgSubtotals(rangedRows, isRangedActive)

                return (
                  <div key={w.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className={styles.attackBreakdownSection}>
                      <div className={styles.attackBreakdownHead}>
                        <span>{w.name} melee {renderMartialAdvLabel()}</span>
                        {renderAttackControls(meleeRows.filter(r => isMeleeActive(r.id)))}
                      </div>
                      {renderTable(meleeRows, isMeleeActive, toggleMelee, meleeTotalToHit, meleeSubtotals, hasVersatile, computeCritThreshold(char, { weaponCritMod, gearCritMods }))}
                    </div>
                    <div className={styles.attackBreakdownSection}>
                      <div className={styles.attackBreakdownHead}>
                        <span>{w.name} ranged ({throwRange}) {renderMartialAdvLabel()}</span>
                        {renderAttackControls(rangedRows.filter(r => isRangedActive(r.id)))}
                      </div>
                      {renderTable(rangedRows, isRangedActive, toggleRanged, rangedTotalToHit, rangedSubtotals, false, computeCritThreshold(char, { weaponCritMod, gearCritMods }))}
                    </div>
                  </div>
                )
              }

              // Non-throwable weapon — single table (original logic)
              const isActive = (rid: string) => {
                const row = rows.find(r => r.id === rid)
                if (row?.disabled) return false
                if (rid === 'normal')    return !versatileActive
                if (rid === 'versatile') return  versatileActive
                if (rid === 'booming-blade') return boomingBladeActive
                return rid.startsWith('maneuver-') ||
                  rid.startsWith('arcane-') ||
                  rid.startsWith('equip-bonus-') ||
                  rid.startsWith('turn-resource-') ||
                  rid.startsWith('spell-buff-') ||
                  (wActive[rid] ?? false)
              }
              function toggleActive(rid: string) {
                const row = rows.find(r => r.id === rid)
                if (row?.disabled) return
                if (rid === 'booming-blade') return
                if (rid.startsWith('maneuver-') || rid.startsWith('arcane-') || rid.startsWith('equip-bonus-') || rid.startsWith('spell-buff-') || rid.startsWith('turn-resource-')) return
                if (rid === 'normal') return
                if (rid === 'versatile') {
                  setActiveRows(prev => ({ ...prev, [w.id]: { ...(prev[w.id] ?? {}), versatile: !(wActive['versatile'] ?? false) } }))
                  return
                }
                setActiveRows(prev => ({
                  ...prev,
                  [w.id]: { ...(prev[w.id] ?? {}), [rid]: !(prev[w.id]?.[rid] ?? false) }
                }))
              }
              const totalToHit = rows.filter(r => isActive(r.id) && r.toHit !== null).reduce((a, r) => a + r.toHit!, 0) || null
              const subtotals  = dmgSubtotals(rows, isActive)
              return (
                <div key={w.id} className={styles.attackBreakdownSection}>
                  <div className={styles.attackBreakdownHead}>
                    <span>{w.name} {renderMartialAdvLabel()}</span>
                    {renderAttackControls(rows.filter(r => isActive(r.id)))}
                  </div>
                  {renderTable(rows, isActive, toggleActive, totalToHit, subtotals, hasVersatile, computeCritThreshold(char, { weaponCritMod, gearCritMods }))}
                </div>
              )
            })}
            {(() => {
              const uStrMod = mod(char.abilityScores.str)
              const uDexMod = mod(char.abilityScores.dex)
              const isMon = char.classId === 'Monk'
              const uStatMod = isMon ? Math.max(uStrMod, uDexMod) : uStrMod
              const uAtkMod = uStatMod + char.proficiencyBonus
              const uDie = isMon
                ? (char.level >= 17 ? 'd10' : char.level >= 11 ? 'd8' : char.level >= 5 ? 'd6' : 'd4')
                : null
              const uDmg = uDie
                ? `1${uDie}+${uStatMod}`
                : `${Math.max(1, 1 + uStrMod)}`
              return (
                <div className={styles.specialAttackList}>
                  <div className={styles.specialAttackRow}>
                    <span className={styles.specialAttackName}>Unarmed Strike</span>
                    <span className={styles.specialAttackDice}>{uDmg} bludgeoning</span>
                    <span className={styles.specialAttackNote}>
                      Attack: {uAtkMod >= 0 ? '+' : ''}{uAtkMod}{isMon ? ' · DEX or STR' : ''}
                    </span>
                  </div>
                </div>
              )
            })()}
            {char.subclass === 'BattleMaster' && (() => {
              const totalDice = char.level >= 15 ? 6 : char.level >= 7 ? 5 : 4
              const dieSize = char.level >= 10 ? '1d10' : '1d8'
              const superiorityDice = char.resources['Superiority Dice'] ?? { used: 0, total: totalDice }
              const usedDice = superiorityDice.used
              const leftDice = Math.max(0, totalDice - usedDice)
              const dc = 8 + char.proficiencyBonus + Math.max(mod(char.abilityScores.str), mod(char.abilityScores.dex))
              const known = maneuversKnown(char.level)
              const chosen = char.chosenManeuvers ?? []
              const active = char.activeManeuver ?? null
              return (
                <div className={styles.specialAttackList}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className={styles.sectionLabel}>
                      Maneuvers · DC {dc} · {leftDice}/{totalDice} {dieSize}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {leftDice > 0 && (
                        <button
                          className={styles.addBtn}
                          onClick={() => update({ resources: { ...char.resources, 'Superiority Dice': { total: totalDice, used: Math.min(totalDice, usedDice + 1) } } })}
                          title="Use a Superiority Die"
                        >Use Die</button>
                      )}
                      {usedDice > 0 && (
                        <button
                          className={styles.addBtn}
                          onClick={() => update({ resources: { ...char.resources, 'Superiority Dice': { total: totalDice, used: Math.max(0, usedDice - 1) } } })}
                          title="Recover a Superiority Die"
                        >Recover</button>
                      )}
                      {chosen.length < known && (
                        <button className={styles.addBtn} onClick={() => setManeuverPickerOpen(true)}>+ Maneuver</button>
                      )}
                    </div>
                  </div>
                  <div className={styles.progressionRow}>
                    {MANEUVER_PROGRESSION.map(({ level, total }) => (
                      <span key={level} className={char.level >= level ? styles.progressionStepActive : styles.progressionStep}>
                        Lv{level}: {total}
                      </span>
                    ))}
                    <span className={styles.progressionCount}>{chosen.length}/{known} known</span>
                  </div>
                  {chosen.map(id => {
                    const m = MANEUVER_BY_ID[id]
                    if (!m) return null
                    const isActive = active === id
                    const dieLabel = m.dmgType === 'weapon' ? `${dieSize} (weapon)` : `${dieSize} (${m.dmgType})`
                    return (
                      <div key={id} className={`${styles.weaponSpecialRow} ${isActive ? styles.weaponSpecialRowActive : ''}`}>
                        <button
                          className={`${styles.selectableBtn} ${isActive ? styles.selectableBtnActive : ''}`}
                          onClick={() => update({ activeManeuver: isActive ? null : id })}
                          title={isActive ? 'Deselect maneuver' : 'Select for this attack'}
                        >{m.name}</button>
                        <span className={styles.maneuverDieBadge}>{dieLabel}</span>
                        <button
                          className={styles.weaponDel}
                          onClick={() => update({ chosenManeuvers: chosen.filter(x => x !== id), ...(isActive ? { activeManeuver: null } : {}) })}
                          title="Remove maneuver"
                        >×</button>
                        <span className={styles.weaponSpecialNote}>{m.desc}</span>
                      </div>
                    )
                  })}
                  {chosen.length === 0 && (
                    <span className={styles.emptyNote}>No maneuvers known — click + Maneuver to learn one.</span>
                  )}
                  {chosen.length > 0 && !active && (
                    <span className={styles.emptyNote}>Click a maneuver to prime it for this attack.</span>
                  )}
                </div>
              )
            })()}
            {char.subclass === 'ArcaneArcher' && (() => {
              const arcaneResource = char.resources['Arcane Shot']
              const totalShots = arcaneResource?.total ?? 0
              const usedShots = arcaneResource?.used ?? 0
              const leftShots = Math.max(0, totalShots - usedShots)
              const known = arcaneShotsKnown(char.level)
              const learned = char.arcaneShots ?? []
              const activeShot = char.activeArcaneShot ?? null
              return (
                <div className={styles.specialAttackList}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className={styles.sectionLabel}>
                      Arcane Shots · {leftShots}/{totalShots}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {leftShots > 0 && (
                        <button
                          className={styles.addBtn}
                          onClick={() => update({ resources: { ...char.resources, 'Arcane Shot': { total: totalShots, used: Math.min(totalShots, usedShots + 1) } } })}
                          title="Use an Arcane Shot"
                        >Use Shot</button>
                      )}
                      {usedShots > 0 && (
                        <button
                          className={styles.addBtn}
                          onClick={() => update({ resources: { ...char.resources, 'Arcane Shot': { total: totalShots, used: Math.max(0, usedShots - 1) } } })}
                          title="Recover an Arcane Shot"
                        >Recover</button>
                      )}
                      {learned.length < known && (
                        <button className={styles.addBtn} onClick={() => setArcanePickerOpen(true)}>+ Choose Shots</button>
                      )}
                    </div>
                  </div>
                  <div className={styles.progressionRow}>
                    {ARCANE_SHOT_PROGRESSION.map(({ level, total }) => (
                      <span key={level} className={char.level >= level ? styles.progressionStepActive : styles.progressionStep}>
                        Lv{level}: {total}
                      </span>
                    ))}
                    <span className={styles.progressionCount}>{learned.length}/{known} known</span>
                  </div>
                  {learned.map(id => {
                    const s = ARCANE_SHOT_BY_ID[id]
                    if (!s) return null
                    const isActive = activeShot === id
                    return (
                      <div key={id} className={`${styles.weaponSpecialRow} ${isActive ? styles.weaponSpecialRowActive : ''}`}>
                        <button
                          className={`${styles.selectableBtn} ${isActive ? styles.selectableBtnActive : ''}`}
                          onClick={() => update({ activeArcaneShot: isActive ? null : id })}
                          title={isActive ? 'Deselect shot' : 'Select for this attack'}
                        >{s.name}</button>
                        <button
                          className={styles.weaponDel}
                          onClick={() => update({ arcaneShots: learned.filter(x => x !== id), ...(isActive ? { activeArcaneShot: null } : {}) })}
                          title="Remove shot"
                        >×</button>
                        <span className={styles.weaponSpecialNote}>{s.desc}</span>
                      </div>
                    )
                  })}
                  {learned.length === 0 && (
                    <span className={styles.emptyNote}>No arcane shots known — click + Choose Shots.</span>
                  )}
                  {learned.length > 0 && !activeShot && (
                    <span className={styles.emptyNote}>Click a shot to prime it for this attack.</span>
                  )}
                </div>
              )
            })()}
          </div>

        {spellDetailId && (() => {
          const spell = SPELL_BY_ID[spellDetailId]
          if (!spell) return null
          return (
            <div className={styles.modalOverlay} onClick={() => setSpellDetailId(null)}>
              <div className={styles.armoryModal} onClick={e => e.stopPropagation()}>
                <div className={styles.armoryHeader}>
                  <div>
                    <span className={styles.armoryTitle}>{spell.name}</span>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`} · {spell.school}
                    </div>
                  </div>
                  <button className={styles.modalClose} onClick={() => setSpellDetailId(null)}>×</button>
                </div>
                <div style={{ padding: '8px 14px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: 11 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Casting Time</span><span>{spell.castingTime}</span>
                  <span style={{ color: 'var(--text-muted)' }}>Range</span><span>{spellSniperRange(spell, char.spellSniperDoubleRange)}</span>
                  <span style={{ color: 'var(--text-muted)' }}>Spell Attack</span><span>{fmtMod(computeSpellAttackBonus(char))} to hit</span>
                </div>
                <p style={{ padding: '0 14px 14px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>{spell.description}</p>
              </div>
            </div>
          )
        })()}

        {maneuverPickerOpen && (
          <div className={styles.modalOverlay} onClick={() => setManeuverPickerOpen(false)}>
            <div className={styles.armoryModal} onClick={e => e.stopPropagation()}>
              <div className={styles.armoryHeader}>
                <span className={styles.armoryTitle}>Choose Maneuver</span>
                <button className={styles.modalClose} onClick={() => setManeuverPickerOpen(false)}>×</button>
              </div>
              <div className={styles.armoryList}>
                {MANEUVERS.filter(m => !(char.chosenManeuvers ?? []).includes(m.id)).map(m => (
                  <button
                    key={m.id}
                    className={styles.armoryEntry}
                    onClick={() => {
                      update({ chosenManeuvers: [...(char.chosenManeuvers ?? []), m.id] })
                      setManeuverPickerOpen(false)
                    }}
                  >
                    <span className={styles.armoryEntryName}>{m.name}</span>
                    <span className={styles.armoryEntryMeta}>{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {arcanePickerOpen && (
          <div className={styles.modalOverlay} onClick={() => setArcanePickerOpen(false)}>
            <div className={styles.armoryModal} onClick={e => e.stopPropagation()}>
              <div className={styles.armoryHeader}>
                <span className={styles.armoryTitle}>Choose Arcane Shots</span>
                <button className={styles.modalClose} onClick={() => setArcanePickerOpen(false)}>×</button>
              </div>
              <div className={styles.armoryList}>
                {ARCANE_SHOTS.filter(s => !(char.arcaneShots ?? []).includes(s.id)).map(s => (
                  <button
                    key={s.id}
                    className={styles.armoryEntry}
                    onClick={() => {
                      update({ arcaneShots: [...(char.arcaneShots ?? []), s.id] })
                      setArcanePickerOpen(false)
                    }}
                  >
                    <span className={styles.armoryEntryName}>{s.name}</span>
                    <span className={styles.armoryEntryMeta}>{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className={styles.spellsWrapper}>
          <SpellsPanel
            character={char}
            update={update}
            onLearnSpell={(char.classId === 'Wizard' || !!SUBCLASS_BY_ID[char.subclass ?? '']?.spellListClassId)
              ? (id) => update({ spellIds: [...new Set([...char.spellIds, id])] })
              : undefined
            }
            onSummon={onSummon}
            onConcentrationBroken={onConcentrationBroken}
          />
        </div>
      </div>
    )
  }

  // ARCANE RECOVERY — slot picker
  if (selectedAction === 'Arcane Recovery') {
    return renderArcaneRecovery(selectedActionDef.full)
  }

  // FIGHTING SPIRIT — Samurai usage tracker
  if (selectedAction === 'Fighting Spirit') {
    const total = 3
    const res = char.resources?.['Fighting Spirit']
    const used = res?.used ?? 0
    const left = Math.max(0, total - used)
    const tempHp = char.level >= 15 ? 15 : char.level >= 10 ? 10 : 5
    return (
      <>
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>{selectedActionDef.name}</span>
            <span className={`${styles.detailBadge} ${badgeClass(selectedActionDef.type)}`}>{selectedActionDef.type}</span>
            {renderActionUseButton()}
          </div>
          <p className={styles.detailFull}>{selectedActionDef.full}</p>
          <div className={styles.detailResource}>
            <span>{left}/{total} uses</span>
            <span className={styles.detailResourceRemaining}>· +{tempHp} temp HP · Long rest recharge</span>
          </div>
        </div>
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionLabel}>Usage</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {left > 0 && (
                <button className={styles.addBtn}
                  onClick={() => {
                    update({
                      resources: { ...char.resources, 'Fighting Spirit': { total, used: Math.min(total, used + 1) } },
                      hitPoints: { ...char.hitPoints, temp: Math.max(char.hitPoints.temp, tempHp) },
                    })
                    setAdvantageNextAttack(char.id, 'adv')
                  }}>
                  Use
                </button>
              )}
              {used > 0 && (
                <button className={styles.addBtn}
                  onClick={() => {
                    update({ resources: { ...char.resources, 'Fighting Spirit': { total, used: Math.max(0, used - 1) } } })
                    setAdvantageNextAttack(char.id, 'none')
                  }}>
                  Recover
                </button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, paddingTop: 4 }}>
            {Array.from({ length: total }, (_, i) => (
              <span key={i} style={{
                width: 10, height: 10, borderRadius: '50%',
                background: i < (total - used) ? 'var(--accent)' : 'var(--border)',
                border: '1px solid var(--border)',
              }} />
            ))}
          </div>
        </section>
      </>
    )
  }

  // OPPORTUNITY ATTACK — melee weapons only
  if (selectedAction === 'Opportunity Attack') {
    const meleeWeapons = char.weapons.filter(w => w.rangeType !== 'Ranged')
    return (
      <>
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>{selectedActionDef.name}</span>
            <span className={`${styles.detailBadge} ${badgeClass(selectedActionDef.type)}`}>
              {selectedActionDef.type}
            </span>
            {renderActionUseButton()}
          </div>
          <p className={styles.detailFull}>{selectedActionDef.full}</p>
        </div>

        {meleeWeapons.length === 0 && (
          <div className={styles.noWeaponsHint}>No melee weapons equipped.</div>
        )}

        <div className={styles.attackDetailWeapons}>
          {meleeWeapons.map(w => {
            const rows = buildAttackRows(char, w, { smiteSlotLevel: selectedSmiteSlotLevel })
            const wActive = activeRows[w.id] ?? {}
            const isActive = (rid: string) => {
              const row = rows.find(r => r.id === rid)
              if (row?.disabled) return false
              if (rid === 'normal') return true
              if (rid === 'booming-blade') return boomingBladeActive
              if (rid.startsWith('spell-buff-') || rid.startsWith('equip-bonus-') || rid.startsWith('turn-resource-')) return true
              return wActive[rid] ?? false
            }
            function toggleActive(rid: string) {
              const row = rows.find(r => r.id === rid)
              if (row?.disabled) return
              if (rid === 'booming-blade') return
              if (rid === 'normal' || rid.startsWith('spell-buff-') || rid.startsWith('equip-bonus-') || rid.startsWith('turn-resource-')) return
              setActiveRows(prev => ({ ...prev, [w.id]: { ...(prev[w.id] ?? {}), [rid]: !(prev[w.id]?.[rid] ?? false) } }))
            }
            const activeToHits = rows.filter(r => isActive(r.id) && r.toHit !== null).map(r => r.toHit as number)
            const totalToHit = activeToHits.length > 0 ? activeToHits.reduce((a, b) => a + b, 0) : null
            const totalToHitDice = rows.filter(r => isActive(r.id) && r.toHitDice).map(r => r.toHitDice!)
            const meleeSubtotals = dmgSubtotals(rows, isActive)
            return (
              <div key={w.id} className={styles.attackBreakdownSection}>
                <div className={styles.attackBreakdownHead}>
                  <span>{w.name} {renderMartialAdvLabel()}</span>
                </div>
                <table className={styles.attackBreakdownTable}>
                  <thead>
                    <tr><th>Attack</th><th>To Hit</th><th>DMG</th><th>DMG Type</th><th>Bonus DMG</th><th>Bonus Type</th><th>Resource</th></tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr key={row.id}
                        className={`${styles.attackBreakdownRow} ${isActive(row.id) ? styles.attackBreakdownRowActive : styles.attackBreakdownRowDimmed} ${row.id !== 'normal' ? styles.attackBreakdownRowToggleable : ''}`}
                        onClick={() => toggleActive(row.id)}
                      >
                        <td>{row.name}</td><td>{BASE_ATTACK_ROW_IDS.has(row.id)
                          ? formatToHitParts(row.toHit, row.toHitDice ? [row.toHitDice] : [])
                          : formatToHitRider(row.toHit, row.toHitDice ? [row.toHitDice] : [])}</td>
                        <td>{row.dmg ?? '—'}</td><td>{row.dmgType ?? '—'}</td>
                        <td>{row.bonusDmg ?? '—'}</td><td>{row.bonusDmgType ?? '—'}</td>
                        <td>
                          <span className={styles.resourceChip}>{rowResource(row)}</span>
                          {renderOneShotUsedButton(row)}
                          {row.id === 'Divine Smite' && renderDivineSmiteSlotPicker()}
                          {row.id === 'booming-blade' && <BoomingBladeTurnToggle charId={char.id} />}
                          {row.id === 'normal' && char.classId === 'Cleric' && char.level >= 8 && <DivineStrikeTurnToggle charId={char.id} subclass={char.subclass} level={char.level} />}
                        </td>
                      </tr>
                    ))}
                    <tr className={styles.attackBreakdownTotalRow}>
                      <td>Total</td>
                      <td>
                        {formatToHitParts(totalToHit, totalToHitDice)}
                      </td>
                      <td colSpan={5}>{meleeSubtotals.map(s => `(${s.expr}) ${s.type}`).join(' + ') || '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      </>
    )
  }

  // OFF-HAND ATTACK — light melee weapons, no ability mod unless TWF
  if (selectedAction === 'Off-Hand Attack') {
    const offHandWeapons = char.weapons.filter(w =>
      w.rangeType !== 'Ranged' &&
      (w.properties ?? []).some(p => p.toLowerCase() === 'light')
    )
    const hasTWF = char.fightingStyle === 'two-weapon-fighting'
    const strMod = mod(char.abilityScores.str)
    const dexMod = mod(char.abilityScores.dex)
    return (
      <>
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>{selectedActionDef.name}</span>
            <span className={`${styles.detailBadge} ${badgeClass(selectedActionDef.type)}`}>
              {selectedActionDef.type === 'Bonus Action' ? 'Bonus' : selectedActionDef.type}
            </span>
            {renderActionUseButton()}
          </div>
          <p className={styles.detailFull}>{selectedActionDef.full}</p>
          {!hasTWF && (
            <p className={styles.detailFull} style={{ color: 'var(--text-muted)', fontSize: 11, fontStyle: 'italic' }}>
              No ability modifier to damage (no Two-Weapon Fighting style).
            </p>
          )}
        </div>

        {offHandWeapons.length === 0 && (
          <div className={styles.noWeaponsHint}>No light melee weapons equipped.</div>
        )}

        <div className={styles.attackDetailWeapons}>
          {offHandWeapons.map(w => {
            const rows = buildAttackRows(char, w, { offHand: true, hasTWF, smiteSlotLevel: selectedSmiteSlotLevel })
            const wActive = activeRows[w.id] ?? {}
            const isActive = (rid: string) => {
              const row = rows.find(r => r.id === rid)
              if (row?.disabled) return false
              if (rid === 'normal') return true
              if (rid === 'booming-blade') return boomingBladeActive
              if (rid.startsWith('spell-buff-') || rid.startsWith('equip-bonus-') || rid.startsWith('turn-resource-')) return true
              return wActive[rid] ?? false
            }
            function toggleActive(rid: string) {
              const row = rows.find(r => r.id === rid)
              if (row?.disabled) return
              if (rid === 'booming-blade') return
              if (rid === 'normal' || rid.startsWith('spell-buff-') || rid.startsWith('equip-bonus-') || rid.startsWith('turn-resource-')) return
              setActiveRows(prev => ({ ...prev, [w.id]: { ...(prev[w.id] ?? {}), [rid]: !(prev[w.id]?.[rid] ?? false) } }))
            }
            const activeToHits = rows.filter(r => isActive(r.id) && r.toHit !== null).map(r => r.toHit as number)
            const totalToHit = activeToHits.length > 0 ? activeToHits.reduce((a, b) => a + b, 0) : null
            const totalToHitDice = rows.filter(r => isActive(r.id) && r.toHitDice).map(r => r.toHitDice!)
            const rangedSubtotals = dmgSubtotals(rows, isActive)
            return (
              <div key={w.id} className={styles.attackBreakdownSection}>
                <div className={styles.attackBreakdownHead}>
                  <span>{w.name} {renderMartialAdvLabel()}</span>
                </div>
                <table className={styles.attackBreakdownTable}>
                  <thead>
                    <tr><th>Attack</th><th>To Hit</th><th>DMG</th><th>DMG Type</th><th>Bonus DMG</th><th>Bonus Type</th><th>Resource</th></tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr key={row.id}
                        className={`${styles.attackBreakdownRow} ${isActive(row.id) ? styles.attackBreakdownRowActive : styles.attackBreakdownRowDimmed} ${row.id !== 'normal' ? styles.attackBreakdownRowToggleable : ''}`}
                        onClick={() => toggleActive(row.id)}
                      >
                        <td>{row.name}</td><td>{BASE_ATTACK_ROW_IDS.has(row.id)
                          ? formatToHitParts(row.toHit, row.toHitDice ? [row.toHitDice] : [])
                          : formatToHitRider(row.toHit, row.toHitDice ? [row.toHitDice] : [])}</td>
                        <td>{row.dmg ?? '—'}</td><td>{row.dmgType ?? '—'}</td>
                        <td>{row.bonusDmg ?? '—'}</td><td>{row.bonusDmgType ?? '—'}</td>
                        <td>
                          <span className={styles.resourceChip}>{rowResource(row)}</span>
                          {renderOneShotUsedButton(row)}
                          {row.id === 'Divine Smite' && renderDivineSmiteSlotPicker()}
                          {row.id === 'booming-blade' && <BoomingBladeTurnToggle charId={char.id} />}
                          {row.id === 'normal' && char.classId === 'Cleric' && char.level >= 8 && <DivineStrikeTurnToggle charId={char.id} subclass={char.subclass} level={char.level} />}
                        </td>
                      </tr>
                    ))}
                    <tr className={styles.attackBreakdownTotalRow}>
                      <td>Total</td>
                      <td>
                        {formatToHitParts(totalToHit, totalToHitDice)}
                      </td>
                      <td colSpan={5}>{rangedSubtotals.map(s => `(${s.expr}) ${s.type}`).join(' + ') || '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      </>
    )
  }

  // DASH — dynamic speed
  if (selectedAction === 'Dash') {
    const speed = computeSpeedFull(char)
    return (
      <div className={styles.detailPane}>
        <div className={styles.detailHeader}>
          <span className={styles.detailName}>Dash</span>
          <span className={`${styles.detailBadge} ${styles.badgeAction}`}>Action</span>
          {renderActionUseButton()}
        </div>
        <p className={styles.detailFull}>
          You gain extra movement for the current turn equal to your speed (after modifiers).
          With {speed}ft speed and Dash, you can move up to {speed * 2}ft this turn.
        </p>
      </div>
    )
  }

  // CUNNING ACTION — show sub-action chips that redirect to Dash/Disengage/Hide
  if (selectedAction === 'Cunning Action') {
    const subActions = ['Dash', 'Disengage', 'Hide']
    const availableNames = new Set(availableActions.map(a => a.name))
    return (
      <div className={styles.detailPane}>
        <div className={styles.detailHeader}>
          <span className={styles.detailName}>{selectedActionDef.name}</span>
          <span className={`${styles.detailBadge} ${badgeClass(selectedActionDef.type)}`}>Bonus</span>
          {renderActionUseButton()}
        </div>
        <p className={styles.detailFull}>{selectedActionDef.full}</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {subActions.map(name => (
            <button
              key={name}
              className={styles.detailChipBtn}
              disabled={!availableNames.has(name)}
              onClick={() => onSelectAction(name)}
              title={`Open ${name} details`}
            >
              {name} →
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (selectedAction === 'Manifest Echo') {
    return (
      <div className={styles.detailPane}>
        <div className={styles.detailHeader}>
          <span className={styles.detailName}>{selectedActionDef.name}</span>
          <span className={`${styles.detailBadge} ${badgeClass(selectedActionDef.type)}`}>Bonus</span>
          {renderActionUseButton()}
        </div>
        <p className={styles.detailFull}>{selectedActionDef.full}</p>
        <button
          className={styles.armoryAddBtn}
          style={{ marginTop: 8 }}
          onClick={() => onSummon?.('echo')}
        >
          Manifest Echo
        </button>
      </div>
    )
  }

  if (selectedAction === 'Steady Aim') {
    const moved = turnState?.movedThisTurn === true
    const speedZero = turnState?.speedZeroUntilTurnEnd === true
    return (
      <div className={styles.detailPane}>
        <div className={styles.detailHeader}>
          <span className={styles.detailName}>{selectedActionDef.name}</span>
          <span className={`${styles.detailBadge} ${badgeClass(selectedActionDef.type)}`}>Bonus</span>
          {renderActionUseButton()}
        </div>
        <p className={styles.detailFull}>{selectedActionDef.full}</p>
        {speedZero && (
          <p className={styles.detailFull} style={{ color: 'var(--warning)', fontSize: 11 }}>
            Speed is 0 until the end of this turn.
          </p>
        )}
        <button
          className={styles.detailChipBtn}
          disabled={moved}
          title={moved ? 'Steady Aim requires that you have not moved this turn' : 'Use Steady Aim'}
          onClick={() => {
            setAdvantageNextAttack(char.id, 'adv')
            setSpeedZero(char.id, true)
            useEconomy(char.id, 'bonus')
          }}
        >
          Use Steady Aim
        </button>
      </div>
    )
  }

  // ALL OTHER ACTIONS
  return (
    <div className={styles.detailPane}>
      <div className={styles.detailHeader}>
        <span className={styles.detailName}>{selectedActionDef.name}</span>
        <span className={`${styles.detailBadge} ${badgeClass(selectedActionDef.type)}`}>
          {selectedActionDef.type === 'Bonus Action' ? 'Bonus' : selectedActionDef.type}
        </span>
        {renderActionUseButton()}
      </div>
      {selectedActionDef.resourceKey && (
        <div className={styles.detailResource}>
          Cost: {selectedActionDef.resourceCost} {selectedActionDef.resourceKey}
          {char.resources[selectedActionDef.resourceKey] && (
            <span className={styles.detailResourceRemaining}>
              ({char.resources[selectedActionDef.resourceKey].total - char.resources[selectedActionDef.resourceKey].used} remaining)
            </span>
          )}
        </div>
      )}
      <p className={styles.detailFull}>{selectedActionDef.full}</p>
    </div>
  )
}
