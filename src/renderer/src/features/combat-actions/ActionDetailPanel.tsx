import { useState } from 'react'
import type { Character, Weapon } from '@/entities/character/types'
import { WEAPONS, type WeaponDef } from '@/shared/data/equipment/weapons'
import { GEAR_BY_ID } from '@/shared/data/equipment/gear'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { computeAttackBonus, computeSpellAttackBonus, isProficientWithWeapon, getAvailableActions, getSpecialAttacks, getWeaponSpecialAttacks } from '@/domain/rules'
import { mod, effectiveAbilityScore, computeSpeedFull } from '@/shared/data/charCalculations'
import type { Equipment } from '@/entities/character/types'
import { combineDiceExpr, formatToHit } from '@/shared/lib/diceExpr'
import { SPELL_BY_ID } from '@/shared/data/spellData'
import { DiceIcon, parseDieType } from '@/shared/components/DiceIcon'
import { FEATS } from '@/shared/data/featsData'
import { FIGHTING_STYLES, FIGHTING_STYLE_BY_ID } from '@/shared/data/fightingStylesData'
import { SUBCLASSES, SUBCLASS_BY_ID } from '@/shared/data/subclassData'
import { INVOCATIONS, maxInvocations } from '@/shared/data/invocationsData'
import { MANEUVERS, MANEUVER_BY_ID, MANEUVER_PROGRESSION, maneuversKnown } from '@/shared/data/maneuversData'
import { ARCANE_SHOTS, ARCANE_SHOT_BY_ID, ARCANE_SHOT_PROGRESSION, arcaneShotsKnown } from '@/shared/data/arcaneShotsData'
import { SKILLS } from '@/shared/data/skills'
import { ResourcesPanel } from '@/features/resources/ResourcesPanel'
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

interface AttackRow {
  id: string
  name: string
  toHit: number | null
  dmg: string | null
  dmgType: string | null
  bonusDmg: string | null
  bonusDmgType: string | null
  disabled?: boolean
  group?: 'melee' | 'ranged' | 'both'
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

const GEAR_SLOTS: (keyof Equipment)[] = [
  'armorId', 'shieldId',
  'helmetId', 'necklaceId', 'capeId', 'legsId',
  'bootsId', 'glovesId', 'quiverId', 'ring1Id', 'ring2Id', 'amuletId',
]

function buildAttackRows(
  char: Character,
  w: Weapon,
  opts?: { offHand?: boolean; hasTWF?: boolean },
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
    } else if (sa.dice) {
      bonusDmg = sa.dice
      bonusDmgType = sa.name === 'Sneak Attack' ? 'piercing'
        : sa.name === 'Divine Smite' ? 'radiant'
        : w.damageType ?? null
    }
    rows.push({ id: sa.name, name: sa.name, toHit, dmg: null, dmgType: null, bonusDmg, bonusDmgType,
      group: SPECIAL_GROUP[sa.name] ?? 'both' })
  }

  if (char.subclass === 'BattleMaster') {
    const dieSize = char.level >= 10 ? '1d10' : '1d8'
    const mId = char.activeManeuver ?? null
    if (mId) {
      const m = MANEUVER_BY_ID[mId]
      if (m) rows.push({
        id: `maneuver-${mId}`,
        name: m.name,
        toHit: null,
        dmg: null,
        dmgType: null,
        bonusDmg: dieSize,
        bonusDmgType: m.dmgType === 'weapon' ? (w.damageType ?? null) : m.dmgType,
        group: 'both',
      })
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
    const { toHit, bonusDmg, bonusDmgType } = concSpell.attackBuff
    rows.push({
      id: `spell-buff-${concSpell.id}`,
      name: concSpell.name,
      toHit: toHit ?? null,
      dmg: null, dmgType: null,
      bonusDmg: bonusDmg ?? null,
      bonusDmgType: bonusDmgType === 'weapon' ? (w.damageType ?? null) : (bonusDmgType ?? null),
      group: 'both',
    })
  }

  // Non-concentration attack-buff spells (e.g. Magic Weapon)
  for (const spellId of char.activeBuffSpells ?? []) {
    const spell = SPELL_BY_ID[spellId]
    if (!spell?.attackBuff || spell.concentration) continue
    const { toHit, bonusDmg, bonusDmgType } = spell.attackBuff
    rows.push({
      id: `spell-buff-${spellId}`,
      name: spell.name,
      toHit: toHit ?? null,
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
  return '—'
}

interface Props {
  character: Character
  update: (patch: Partial<Character>) => void
  selectedAction: string | null
  onSelectAction: (name: string | null) => void
  selectedFeature: FeatureEntry | null
}

const ORDINAL: Record<number, string> = { 1:'1st',2:'2nd',3:'3rd',4:'4th',5:'5th',6:'6th',7:'7th',8:'8th',9:'9th' }

export function ActionDetailPanel({ character: char, update, selectedAction, selectedFeature }: Props) {
  const [armoryOpen, setArmoryOpen] = useState(false)
  const [armoryTab, setArmoryTab] = useState<'browse' | 'custom'>('browse')
  const [armorySearch, setArmorySearch] = useState('')
  const [customWeapon, setCustomWeapon] = useState({ name: '', atkBonus: '0', damage: '', damageType: '' })
  const [customWeaponError, setCustomWeaponError] = useState<string | null>(null)
  const [arcanePickedLevels, setArcanePickedLevels] = useState<number[]>([])
  const [spellDetailId, setSpellDetailId] = useState<string | null>(null)
  const [pendingStyle, setPendingStyle] = useState<string | null>(null)
  const [pendingSubclass, setPendingSubclass] = useState<string | null>(null)
  const [pendingBoon, setPendingBoon] = useState<string | null>(null)
  const [maneuverPickerOpen, setManeuverPickerOpen] = useState(false)
  const [arcanePickerOpen, setArcanePickerOpen] = useState(false)
  const [activeRows, setActiveRows] = useState<Record<string, Record<string, boolean>>>({})
  const [rollMap, setRollMap] = useState<Record<string, { d1: number; d2: number; adv: 'n' | 'a' | 'd' }>>({})

  function rollWeapon(wid: string) {
    const adv = rollMap[wid]?.adv ?? 'n'
    setRollMap(prev => ({ ...prev, [wid]: { d1: Math.ceil(Math.random() * 20), d2: Math.ceil(Math.random() * 20), adv } }))
  }
  function setWeaponAdv(wid: string, adv: 'n' | 'a' | 'd') {
    setRollMap(prev => ({ ...prev, [wid]: { ...(prev[wid] ?? { d1: 0, d2: 0 }), adv } }))
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
    setArmoryOpen(false)
  }

  const DAMAGE_PATTERN = /^\d+d\d+([+-]\d+)?$|^\d+$|^—$/

  function saveCustomWeapon() {
    const name = customWeapon.name.trim()
    const damage = customWeapon.damage.trim() || '—'
    if (!name) { setCustomWeaponError('Name is required.'); return }
    if (damage !== '—' && !DAMAGE_PATTERN.test(damage)) {
      setCustomWeaponError('Damage must be like 1d6, 2d6+3, or a plain number.')
      return
    }
    const atkBonus = parseInt(customWeapon.atkBonus, 10)
    if (isNaN(atkBonus)) { setCustomWeaponError('Attack bonus must be a number.'); return }
    setCustomWeaponError(null)
    const w: Weapon = {
      id: crypto.randomUUID(),
      name,
      atkBonus,
      damage,
      damageType: customWeapon.damageType.trim() || undefined,
    }
    update({ weapons: [...char.weapons, w] })
    setArmoryOpen(false)
    setCustomWeapon({ name: '', atkBonus: '0', damage: '', damageType: '' })
  }

  function removeWeapon(id: string) {
    update({ weapons: char.weapons.filter(w => w.id !== id) })
  }

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
            </div>
            <p className={styles.detailFull}>{selectedFeature.desc}</p>
          </div>
          <div className={styles.spellsWrapper}>
            <SpellsPanel
              character={char}
              update={update}
              onLearnSpell={(id) => update({ spellIds: [...new Set([...char.spellIds, id])] })}
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

    // ── Pact Boon ─────────────────────────────────────────────────────
    const isPactBoon = selectedFeature.name === 'Pact Boon'
    if (isPactBoon) {
      const PACT_OPTIONS = [
        { id: 'blade', name: 'Pact of the Blade', description: 'Use your action to create a pact weapon in your empty hand. You can choose its form. It counts as magical and you are proficient with it. Disappears if it is more than 5 ft from you for 1 minute.' },
        { id: 'chain', name: 'Pact of the Chain', description: 'Learn Find Familiar. Your familiar can take one of the following forms: imp, pseudodragon, quasit, or sprite. It can attack as a reaction while you cast a spell.' },
        { id: 'tome', name: 'Pact of the Tome', description: 'Your patron gives you a grimoire called a Book of Shadows. It contains 3 cantrips of your choice from any class. These count as warlock spells for you.' },
      ]
      const isLocked = char.pactBoonLocked ?? false
      const chosen = char.pactBoon ? PACT_OPTIONS.find(p => p.id === char.pactBoon) : null
      return (
        <>
          <ResourcesPanel character={char} update={update} />
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>Pact Boon</span>
              <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Level {selectedFeature.level}</span>
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
                      update({ pactBoon: pendingBoon ?? char.pactBoon, pactBoonLocked: true })
                      setPendingBoon(null)
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
      const domainAbility = char.subclass ? SUBCLASS_BY_ID[char.subclass]?.channelDivinityDesc : null
      const cdRes = char.resources['Channel Divinity']
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
                {cdRes.total - cdRes.used} / {cdRes.total} uses remaining
              </div>
            )}
            {domainAbility && (
              <>
                <p className={styles.detailFull} style={{ fontWeight: 600, marginBottom: 4 }}>Domain Ability</p>
                <p className={styles.detailFull}>{domainAbility}</p>
              </>
            )}
            <p className={styles.detailFull} style={{ fontWeight: 600, marginTop: 8, marginBottom: 4 }}>Turn Undead</p>
            <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>
              Each undead that can see or hear you within 30 ft must make a WIS save (DC 8 + Prof + WIS). On a failed save, the creature is turned for 1 minute.
            </p>
          </div>
        </>
      )
    }

    // ── Rage ──────────────────────────────────────────────────────────
    const isRage = selectedFeature.name === 'Rage'
    if (isRage) {
      const rageRes = char.resources['Rage']
      const canRage = rageRes ? rageRes.used < rageRes.total : false
      return (
        <>
          <ResourcesPanel character={char} update={update} />
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>Rage</span>
              <span className={`${styles.detailBadge} ${styles.badgeBonusAction}`}>Bonus</span>
            </div>
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
      const crLimit = char.level >= 8 ? 'CR 1' : char.level >= 4 ? 'CR ½' : 'CR ¼'
      const moonCr = char.level >= 9 ? 'CR ' + Math.floor(char.level / 3) : char.level >= 6 ? 'CR 2' : 'CR 1'
      return (
        <>
          <ResourcesPanel character={char} update={update} />
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>Wild Shape</span>
              <span className={`${styles.detailBadge} ${styles.badgeAction}`}>Action · SR</span>
            </div>
            {wsRes && (
              <div className={styles.detailResource}>{wsRes.total - wsRes.used} / {wsRes.total} uses remaining</div>
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
          </div>
          <p className={styles.detailFull}>{selectedActionDef.full}</p>
        </div>
        <div className={styles.spellsWrapper}>
          <SpellsPanel
            character={char}
            update={update}
            castingTimeFilter={castingTimeFilter}
            onLearnSpell={(char.classId === 'Wizard' || !!SUBCLASS_BY_ID[char.subclass ?? '']?.spellListClassId) ? (id) => update({ spellIds: [...new Set([...char.spellIds, id])] }) : undefined}
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
          </div>
          <p className={styles.detailFull}>{selectedActionDef.full}</p>
        </div>

        {char.weapons.length === 0 && (
          <div className={styles.noWeaponsHint}>
            No weapons equipped —{' '}
            <button className={styles.addWeaponLink} onClick={() => setArmoryOpen(true)}>add a weapon</button>
          </div>
        )}

        {char.weapons.length > 0 && (
          <div className={styles.attackDetailWeapons}>
            <div className={styles.attackDetailWeaponsHead}>
              <button className={styles.addBtn} onClick={() => setArmoryOpen(true)}>+ Add weapon</button>
            </div>
            {char.weapons.map(w => {
              const rows = buildAttackRows(char, w)
              const wActive = activeRows[w.id] ?? {}
              const hasVersatile   = rows.some(r => r.id === 'versatile')
              const hasThrown      = rows.some(r => r.id === 'thrown')
              const versatileActive = hasVersatile && (wActive['versatile'] ?? false)
              const rollState = rollMap[w.id]
              const adv = rollState?.adv ?? 'n'
              const d20 = rollState
                ? adv === 'a' ? Math.max(rollState.d1, rollState.d2)
                : adv === 'd' ? Math.min(rollState.d1, rollState.d2)
                : rollState.d1
                : null

              const renderTable = (
                tableRows: AttackRow[],
                isRowActive: (rid: string) => boolean,
                onToggle: (rid: string) => void,
                totalToHit: number | null,
                subtotals: { expr: string; type: string }[],
                hasVersatileInTable: boolean,
              ) => (
                <table className={styles.attackBreakdownTable}>
                  <thead>
                    <tr>
                      <th>Attack</th><th>To Hit</th><th>DMG</th>
                      <th>DMG Type</th><th>Bonus DMG</th><th>Bonus Type</th><th>Resource</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map(row => (
                      <tr
                        key={row.id}
                        className={[
                          styles.attackBreakdownRow,
                          row.disabled ? styles.attackBreakdownRowDisabled : isRowActive(row.id) ? styles.attackBreakdownRowActive : styles.attackBreakdownRowDimmed,
                          (row.id !== 'normal' || hasVersatileInTable) && !row.disabled ? styles.attackBreakdownRowToggleable : '',
                        ].join(' ')}
                        onClick={() => !row.disabled && onToggle(row.id)}
                      >
                        <td>{row.name}{row.disabled ? ' *' : ''}</td>
                        <td>{row.toHit !== null ? fmtMod(row.toHit) : '—'}</td>
                        <td>{row.dmg ?? '—'}</td>
                        <td>{row.dmgType ?? '—'}</td>
                        <td>{row.bonusDmg ?? '—'}</td>
                        <td>{row.bonusDmgType ?? '—'}</td>
                        <td><span className={styles.resourceChip}>{rowResource(row)}</span></td>
                      </tr>
                    ))}
                    <tr className={styles.attackBreakdownTotalRow}>
                      <td>Total</td>
                      <td>
                        {d20 !== null && totalToHit !== null
                          ? `${d20} ${fmtMod(totalToHit)} = ${d20 + totalToHit}`
                          : totalToHit !== null ? formatToHit(totalToHit, adv) : '—'}
                        {rollState && adv !== 'n' && (
                          <span className={styles.diceNote}>{` (${rollState.d1}, ${rollState.d2})`}</span>
                        )}
                      </td>
                      <td colSpan={5}>{subtotals.map(s => `(${s.expr}) ${s.type}`).join(' + ') || '—'}</td>
                    </tr>
                  </tbody>
                </table>
              )

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
                  return rid.startsWith('maneuver-') || rid.startsWith('equip-bonus-') ||
                         rid.startsWith('spell-buff-') || (wActive[rid] ?? false)
                }
                const isRangedActive = (rid: string) => {
                  const row = rows.find(r => r.id === rid)
                  if (row?.disabled) return false
                  if (rid === 'thrown') return true
                  return rid.startsWith('arcane-') || rid.startsWith('equip-bonus-') ||
                         rid.startsWith('spell-buff-') || rid.startsWith('maneuver-') ||
                         (wActive[rid] ?? false)
                }
                function toggleMelee(rid: string) {
                  const row = rows.find(r => r.id === rid)
                  if (row?.disabled) return
                  if (rid === 'normal' || rid.startsWith('equip-bonus-') || rid.startsWith('spell-buff-') || rid.startsWith('maneuver-')) return
                  if (rid === 'versatile') {
                    setActiveRows(prev => ({ ...prev, [w.id]: { ...(prev[w.id] ?? {}), versatile: !(wActive['versatile'] ?? false) } }))
                    return
                  }
                  setActiveRows(prev => ({ ...prev, [w.id]: { ...(prev[w.id] ?? {}), [rid]: !(prev[w.id]?.[rid] ?? false) } }))
                }
                function toggleRanged(rid: string) {
                  if (rid === 'thrown' || rid.startsWith('arcane-') || rid.startsWith('equip-bonus-') || rid.startsWith('spell-buff-') || rid.startsWith('maneuver-')) return
                  setActiveRows(prev => ({ ...prev, [w.id]: { ...(prev[w.id] ?? {}), [rid]: !(prev[w.id]?.[rid] ?? false) } }))
                }

                const meleeTotalToHit = meleeRows.filter(r => isMeleeActive(r.id) && r.toHit !== null).reduce((a, r) => a + r.toHit!, 0)
                const rangedTotalToHit = rangedRows.filter(r => isRangedActive(r.id) && r.toHit !== null).reduce((a, r) => a + r.toHit!, 0)
                const meleeSubtotals  = dmgSubtotals(meleeRows,  isMeleeActive)
                const rangedSubtotals = dmgSubtotals(rangedRows, isRangedActive)

                return (
                  <div key={w.id} className={styles.attackBreakdownSection}>
                    <div className={styles.attackBreakdownHead}>
                      <span>{w.name}</span>
                      <div className={styles.attackHeadActions}>
                        <button className={`${styles.advBtn} ${adv === 'n' ? styles.advBtnActive : ''}`} onClick={() => setWeaponAdv(w.id, 'n')}>Norm</button>
                        <button className={`${styles.advBtn} ${adv === 'a' ? styles.advBtnActive : ''}`} onClick={() => setWeaponAdv(w.id, 'a')}>Adv</button>
                        <button className={`${styles.advBtn} ${adv === 'd' ? styles.advBtnActive : ''}`} onClick={() => setWeaponAdv(w.id, 'd')}>Dis</button>
                        <button className={styles.rollBtn} onClick={() => rollWeapon(w.id)} title="Roll d20">🎲</button>
                        <button className={styles.weaponDel} onClick={() => removeWeapon(w.id)} title="Remove weapon">×</button>
                      </div>
                    </div>
                    <div className={styles.attackSubLabel}>{w.name} melee</div>
                    {renderTable(meleeRows, isMeleeActive, toggleMelee, meleeTotalToHit, meleeSubtotals, hasVersatile)}
                    <div className={styles.attackSubLabel}>{w.name} ranged ({throwRange})</div>
                    {renderTable(rangedRows, isRangedActive, toggleRanged, rangedTotalToHit, rangedSubtotals, false)}
                  </div>
                )
              }

              // Non-throwable weapon — single table (original logic)
              const isActive = (rid: string) => {
                const row = rows.find(r => r.id === rid)
                if (row?.disabled) return false
                if (rid === 'normal')    return !versatileActive
                if (rid === 'versatile') return  versatileActive
                return rid.startsWith('maneuver-') ||
                  rid.startsWith('arcane-') ||
                  rid.startsWith('equip-bonus-') ||
                  rid.startsWith('spell-buff-') ||
                  (wActive[rid] ?? false)
              }
              function toggleActive(rid: string) {
                const row = rows.find(r => r.id === rid)
                if (row?.disabled) return
                if (rid.startsWith('maneuver-') || rid.startsWith('arcane-') || rid.startsWith('equip-bonus-') || rid.startsWith('spell-buff-')) return
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
                    <span>{w.name}</span>
                    <div className={styles.attackHeadActions}>
                      <button className={`${styles.advBtn} ${adv === 'n' ? styles.advBtnActive : ''}`} onClick={() => setWeaponAdv(w.id, 'n')}>Norm</button>
                      <button className={`${styles.advBtn} ${adv === 'a' ? styles.advBtnActive : ''}`} onClick={() => setWeaponAdv(w.id, 'a')}>Adv</button>
                      <button className={`${styles.advBtn} ${adv === 'd' ? styles.advBtnActive : ''}`} onClick={() => setWeaponAdv(w.id, 'd')}>Dis</button>
                      <button className={styles.rollBtn} onClick={() => rollWeapon(w.id)} title="Roll d20">🎲</button>
                      <button className={styles.weaponDel} onClick={() => removeWeapon(w.id)} title="Remove weapon">×</button>
                    </div>
                  </div>
                  {renderTable(rows, isActive, toggleActive, totalToHit, subtotals, hasVersatile)}
                </div>
              )
            })}
            {specialAttacks.filter(sa => sa.name === 'Unarmed Strike').length > 0 && (
              <div className={styles.specialAttackList}>
                {specialAttacks.filter(sa => sa.name === 'Unarmed Strike').map(sa => (
                  <div key={sa.name} className={styles.specialAttackRow}>
                    <span className={styles.specialAttackName}>{sa.name}</span>
                    {sa.dice && <span className={styles.specialAttackDice}>{sa.dice}</span>}
                    <span className={styles.specialAttackNote}>{sa.note}</span>
                  </div>
                ))}
              </div>
            )}
            {char.subclass === 'BattleMaster' && (() => {
              const totalDice = char.level >= 15 ? 6 : char.level >= 7 ? 5 : 4
              const dieSize = char.level >= 10 ? '1d10' : '1d8'
              const usedDice = char.superiorityDiceUsed ?? 0
              const leftDice = Math.max(0, totalDice - usedDice)
              const dc = 8 + char.proficiencyBonus + mod(char.abilityScores.str)
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
                          onClick={() => update({ superiorityDiceUsed: Math.min(totalDice, usedDice + 1) })}
                          title="Use a Superiority Die"
                        >Use Die</button>
                      )}
                      {usedDice > 0 && (
                        <button
                          className={styles.addBtn}
                          onClick={() => update({ superiorityDiceUsed: Math.max(0, usedDice - 1) })}
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
              const totalShots = char.level >= 18 ? 4 : 2
              const arcaneResource = char.resources['Arcane Shot']
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
        )}

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
                  <span style={{ color: 'var(--text-muted)' }}>Range</span><span>{spell.range}</span>
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
          />
        </div>

        {armoryOpen && (
          <div className={styles.modalOverlay} onClick={() => setArmoryOpen(false)}>
            <div className={styles.armoryModal} onClick={e => e.stopPropagation()}>
              <div className={styles.armoryHeader}>
                <span className={styles.armoryTitle}>Armory</span>
                <button className={styles.modalClose} onClick={() => setArmoryOpen(false)}>×</button>
              </div>
              <div className={styles.armoryTabs}>
                <button className={`${styles.armoryTab} ${armoryTab === 'browse' ? styles.armoryTabActive : ''}`} onClick={() => setArmoryTab('browse')}>Browse Catalog</button>
                <button className={`${styles.armoryTab} ${armoryTab === 'custom' ? styles.armoryTabActive : ''}`} onClick={() => setArmoryTab('custom')}>Custom</button>
              </div>
              {armoryTab === 'browse' && (
                <>
                  <input
                    className={styles.searchInput}
                    type="search"
                    placeholder="Search weapons…"
                    value={armorySearch}
                    onChange={e => setArmorySearch(e.target.value)}
                    autoFocus
                  />
                  <div className={styles.armoryList}>
                    {(['Simple Melee', 'Simple Ranged', 'Martial Melee', 'Martial Ranged', 'Magic'] as const).map(group => {
                      const groupWeapons = WEAPONS.filter(w => {
                        const cat = w.proficiencyCategory === 'Simple' ? 'Simple' : w.proficiencyCategory === 'Martial' ? 'Martial' : null
                        const range = w.rangeType === 'Ranged' ? 'Ranged' : 'Melee'
                        if (group === 'Magic') return (w.enchantmentBonus ?? 0) > 0
                        if (!cat) return false
                        return `${cat} ${range}` === group && (w.enchantmentBonus ?? 0) === 0
                      }).filter(w => w.name.toLowerCase().includes(armorySearch.toLowerCase()))
                      if (groupWeapons.length === 0) return null
                      return (
                        <div key={group} className={styles.armoryGroup}>
                          <div className={styles.armoryGroupLabel}>{group}</div>
                          {groupWeapons.map(w => (
                            <button key={w.id} className={styles.armoryEntry} onClick={() => addWeaponFromCatalog(w)}>
                              <span className={styles.armoryEntryName}>{w.name}</span>
                              <span className={styles.armoryEntryDmg}>{w.damageDie} {w.damageType}</span>
                              <span className={styles.armoryEntryProps}>{w.properties.slice(0, 2).join(', ')}</span>
                            </button>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
              {armoryTab === 'custom' && (
                <div className={styles.armoryCustomForm}>
                  <label className={styles.armoryField}>
                    <span>Name *</span>
                    <input className={styles.input} value={customWeapon.name} autoFocus placeholder="e.g. Flame Tongue" onChange={e => setCustomWeapon({ ...customWeapon, name: e.target.value })} />
                  </label>
                  <label className={styles.armoryField}>
                    <span>Damage (e.g. 1d6, 2d6+3)</span>
                    <input className={styles.input} value={customWeapon.damage} placeholder="1d6" onChange={e => setCustomWeapon({ ...customWeapon, damage: e.target.value })} />
                  </label>
                  <label className={styles.armoryField}>
                    <span>Damage type</span>
                    <input className={styles.input} value={customWeapon.damageType} placeholder="slashing" onChange={e => setCustomWeapon({ ...customWeapon, damageType: e.target.value })} />
                  </label>
                  <label className={styles.armoryField}>
                    <span>Attack bonus modifier</span>
                    <input className={styles.input} type="number" value={customWeapon.atkBonus} onChange={e => setCustomWeapon({ ...customWeapon, atkBonus: e.target.value })} />
                  </label>
                  {customWeaponError && <span className={styles.armoryError}>{customWeaponError}</span>}
                  <button className={styles.armoryAddBtn} onClick={saveCustomWeapon}>Add Weapon</button>
                </div>
              )}
            </div>
          </div>
        )}
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
                  onClick={() => update({ resources: { ...char.resources, 'Fighting Spirit': { total, used: Math.min(total, used + 1) } } })}>
                  Use
                </button>
              )}
              {used > 0 && (
                <button className={styles.addBtn}
                  onClick={() => update({ resources: { ...char.resources, 'Fighting Spirit': { total, used: Math.max(0, used - 1) } } })}>
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
          </div>
          <p className={styles.detailFull}>{selectedActionDef.full}</p>
        </div>

        {meleeWeapons.length === 0 && (
          <div className={styles.noWeaponsHint}>No melee weapons equipped.</div>
        )}

        <div className={styles.attackDetailWeapons}>
          {meleeWeapons.map(w => {
            const rows = buildAttackRows(char, w)
            const wActive = activeRows[w.id] ?? {}
            const isActive = (rid: string) => {
              if (rid === 'normal') return true
              if (rid.startsWith('spell-buff-') || rid.startsWith('equip-bonus-')) return true
              return wActive[rid] ?? false
            }
            function toggleActive(rid: string) {
              if (rid === 'normal' || rid.startsWith('spell-buff-') || rid.startsWith('equip-bonus-')) return
              setActiveRows(prev => ({ ...prev, [w.id]: { ...(prev[w.id] ?? {}), [rid]: !(prev[w.id]?.[rid] ?? false) } }))
            }
            const activeToHits = rows.filter(r => isActive(r.id) && r.toHit !== null).map(r => r.toHit as number)
            const totalToHit = activeToHits.length > 0 ? activeToHits.reduce((a, b) => a + b, 0) : null
            const meleeSubtotals = dmgSubtotals(rows, isActive)
            const rollState = rollMap[w.id]
            const adv = rollState?.adv ?? 'n'
            const d20 = rollState ? (adv === 'a' ? Math.max(rollState.d1, rollState.d2) : adv === 'd' ? Math.min(rollState.d1, rollState.d2) : rollState.d1) : null
            return (
              <div key={w.id} className={styles.attackBreakdownSection}>
                <div className={styles.attackBreakdownHead}>
                  <span>{w.name}</span>
                  <div className={styles.attackHeadActions}>
                    <button className={`${styles.advBtn} ${adv === 'n' ? styles.advBtnActive : ''}`} onClick={() => setWeaponAdv(w.id, 'n')}>Norm</button>
                    <button className={`${styles.advBtn} ${adv === 'a' ? styles.advBtnActive : ''}`} onClick={() => setWeaponAdv(w.id, 'a')}>Adv</button>
                    <button className={`${styles.advBtn} ${adv === 'd' ? styles.advBtnActive : ''}`} onClick={() => setWeaponAdv(w.id, 'd')}>Dis</button>
                    <button className={styles.rollBtn} onClick={() => rollWeapon(w.id)} title="Roll d20">🎲</button>
                  </div>
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
                        <td>{row.name}</td><td>{row.toHit !== null ? fmtMod(row.toHit) : '—'}</td>
                        <td>{row.dmg ?? '—'}</td><td>{row.dmgType ?? '—'}</td>
                        <td>{row.bonusDmg ?? '—'}</td><td>{row.bonusDmgType ?? '—'}</td>
                        <td><span className={styles.resourceChip}>{rowResource(row)}</span></td>
                      </tr>
                    ))}
                    <tr className={styles.attackBreakdownTotalRow}>
                      <td>Total</td>
                      <td>
                        {d20 !== null && totalToHit !== null ? `${d20} ${fmtMod(totalToHit)} = ${d20 + totalToHit}` : totalToHit !== null ? formatToHit(totalToHit, adv) : '—'}
                        {rollState && adv !== 'n' && <span className={styles.diceNote}>{` (${rollState.d1}, ${rollState.d2})`}</span>}
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
            const rows = buildAttackRows(char, w, { offHand: true, hasTWF })
            const wActive = activeRows[w.id] ?? {}
            const isActive = (rid: string) => {
              if (rid === 'normal') return true
              if (rid.startsWith('spell-buff-') || rid.startsWith('equip-bonus-')) return true
              return wActive[rid] ?? false
            }
            function toggleActive(rid: string) {
              if (rid === 'normal' || rid.startsWith('spell-buff-') || rid.startsWith('equip-bonus-')) return
              setActiveRows(prev => ({ ...prev, [w.id]: { ...(prev[w.id] ?? {}), [rid]: !(prev[w.id]?.[rid] ?? false) } }))
            }
            const activeToHits = rows.filter(r => isActive(r.id) && r.toHit !== null).map(r => r.toHit as number)
            const totalToHit = activeToHits.length > 0 ? activeToHits.reduce((a, b) => a + b, 0) : null
            const rangedSubtotals = dmgSubtotals(rows, isActive)
            const rollState = rollMap[w.id]
            const adv = rollState?.adv ?? 'n'
            const d20 = rollState ? (adv === 'a' ? Math.max(rollState.d1, rollState.d2) : adv === 'd' ? Math.min(rollState.d1, rollState.d2) : rollState.d1) : null
            return (
              <div key={w.id} className={styles.attackBreakdownSection}>
                <div className={styles.attackBreakdownHead}>
                  <span>{w.name}</span>
                  <div className={styles.attackHeadActions}>
                    <button className={`${styles.advBtn} ${adv === 'n' ? styles.advBtnActive : ''}`} onClick={() => setWeaponAdv(w.id, 'n')}>Norm</button>
                    <button className={`${styles.advBtn} ${adv === 'a' ? styles.advBtnActive : ''}`} onClick={() => setWeaponAdv(w.id, 'a')}>Adv</button>
                    <button className={`${styles.advBtn} ${adv === 'd' ? styles.advBtnActive : ''}`} onClick={() => setWeaponAdv(w.id, 'd')}>Dis</button>
                    <button className={styles.rollBtn} onClick={() => rollWeapon(w.id)} title="Roll d20">🎲</button>
                  </div>
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
                        <td>{row.name}</td><td>{row.toHit !== null ? fmtMod(row.toHit) : '—'}</td>
                        <td>{row.dmg ?? '—'}</td><td>{row.dmgType ?? '—'}</td>
                        <td>{row.bonusDmg ?? '—'}</td><td>{row.bonusDmgType ?? '—'}</td>
                        <td><span className={styles.resourceChip}>{rowResource(row)}</span></td>
                      </tr>
                    ))}
                    <tr className={styles.attackBreakdownTotalRow}>
                      <td>Total</td>
                      <td>
                        {d20 !== null && totalToHit !== null ? `${d20} ${fmtMod(totalToHit)} = ${d20 + totalToHit}` : totalToHit !== null ? formatToHit(totalToHit, adv) : '—'}
                        {rollState && adv !== 'n' && <span className={styles.diceNote}>{` (${rollState.d1}, ${rollState.d2})`}</span>}
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
        </div>
        <p className={styles.detailFull}>
          You gain extra movement for the current turn equal to your speed (after modifiers).
          With {speed}ft speed and Dash, you can move up to {speed * 2}ft this turn.
        </p>
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
