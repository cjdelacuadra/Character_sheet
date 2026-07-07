import React, { useState, type ReactNode } from 'react'
import type { Character, Weapon } from '@/entities/character/types'
import { WEAPONS, type WeaponDef } from '@/shared/data/equipment/weapons'
import { GEAR_BY_ID } from '@/shared/data/equipment/gear'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { computeAttackAdvantage, computeAttackBonus, computeSpellAttackBonus, isProficientWithWeapon, getAvailableActions, getSpecialAttacks, getWeaponSpecialAttacks, computeCritThreshold, critExtraDice, computeAttackCount, SPELL_ATTACK_IDS } from '@/domain/rules'
import { channelDivinityOptionsFor } from '@/domain/data/channelDivinityData'
import { METAMAGIC_OPTIONS, metamagicKnownCount } from '@/domain/data/metamagicData'
import { portentDiceCount, wildShapeLimit } from '@/domain/rules/casterFeatures'
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
import {
  buildAttackRows, dmgSubtotals, criticalSubtotals, getAttackConsumption, rowResource,
  formatToHitParts, formatToHitRider, spellSniperRange, fmtMod,
  BASE_ATTACK_ROW_IDS, ATTACK_CONSUMPTION, type AttackRow,
} from './attackRows'
import { FeatureDetails } from './FeatureDetails'
import { activeArcaneShotOf, activeManeuverOf, arcaneShotsKnownOf, fightingStyleOf, hasSpellSniper, maneuversKnownOf, wildShapeFormOf } from '@/domain/character/compat'
import { computeEquipmentStats } from '@/shared/data/charCalculations'
import { ArcaneRecoveryDetail } from './ArcaneRecoveryDetail'
import styles from './ActionDetailPanel.module.css'

const CAST_SPELL_NAMES = new Set(['Cast a Spell', 'Cast a Spell (Bonus)', 'Cast a Spell (Reaction)'])

const SUBCLASS_FEATURE_NAMES = new Set([
  'Arcane Tradition', 'Otherworldly Patron', 'Divine Domain',
  'Martial Archetype', 'Primal Path', 'Bard College', 'Druid Circle',
  'Monastic Tradition', 'Sacred Oath', 'Ranger Archetype',
  'Roguish Archetype', 'Sorcerous Origin',
])

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
  const spendEconomy = useAppStore(s => s.spendEconomy)
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
          spendEconomy(charId, consumption.slot)
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
  const spendEconomy = useAppStore(s => s.spendEconomy)
  const recoverEconomy = useAppStore(s => s.recoverEconomy)
  const spendTurnAttack = useAppStore(s => s.spendAttack)
  const recoverTurnAttack = useAppStore(s => s.recoverAttack)
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
        spendEconomy(char.id, 'action')
        setAttacked(char.id, true)
      }
    } else {
      setAttacked(char.id, true)
    }
    adjustAttackConsumption(rows, 'spend')
    consumeOneShotRows(rows)
    spendTurnAttack(char.id)
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
    recoverTurnAttack(char.id)
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
            spendEconomy(char.id, economy)
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

  // Arcane Recovery lives in ArcaneRecoveryDetail (shared with the feature path).

  // FEATURE SELECTED — rich feature details (extracted component)
  if (selectedFeature && !selectedAction) {
    return (
      <FeatureDetails
        character={char}
        update={update}
        feature={selectedFeature}
        onSummon={onSummon}
        onConcentrationBroken={onConcentrationBroken}
      />
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
    // Wild Shape: attacks are the beast's, not the wielded weapons — rendered
    // in the same table format as weapons. Equipment 'all'-scope damage
    // riders still apply and appear as rider rows.
    const shapedForm = wildShapeFormOf(char)
    const shapedAttacks = shapedForm?.attacks ?? []
    if (shapedForm && shapedAttacks.length > 0) {
      const equipStats = computeEquipmentStats(char)
      const equipRiders = equipStats.bonusDamage.filter(b => b.appliesTo === 'all')
      return (
        <div className={styles.attackWrapper}>
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>Attack — {shapedForm.name} (Wild Shape)</span>
              <span className={`${styles.detailBadge} ${styles.badgeAction}`}>Action</span>
            </div>
            {shapedForm.multiattack && (
              <div className={styles.detailResource}>Multiattack: {shapedForm.multiattack}</div>
            )}
            <p className={styles.detailFull} style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              Weapon attacks are unavailable while shaped — leave the form to use your weapons.
            </p>
            {renderAttackControls()}
          </div>
          {shapedAttacks.map(atk => {
            const rows: AttackRow[] = [
              { id: 'normal', name: 'Normal', toHit: atk.toHit, dmg: atk.dmg, dmgType: atk.dmgType, bonusDmg: null, bonusDmgType: null, note: atk.note },
              ...equipRiders.map((r, i) => ({
                id: `equip-bonus-${i}`,
                name: r.names.join(', '),
                toHit: null,
                dmg: null,
                dmgType: null,
                bonusDmg: [...r.dice, r.flat ? String(r.flat) : null].filter(Boolean).join('+') || null,
                bonusDmgType: r.dmgType,
              })),
            ]
            const subtotals = dmgSubtotals(rows, () => true)
            const gearCritExtras = equipStats.critBonusDamage.map(c => ({
              expr: [...c.dice, c.flat ? String(c.flat) : null].filter(Boolean).join('+') || '0',
              type: c.dmgType,
            }))
            const critTotals = criticalSubtotals(subtotals, gearCritExtras)
            return (
              <div key={atk.name} className={styles.attackBreakdownSection}>
                <div className={styles.attackBreakdownHead}>
                  <span>{shapedForm.name} — {atk.name} {renderMartialAdvLabel()}</span>
                  {renderAttackControls(rows)}
                </div>
                <table className={styles.attackBreakdownTable}>
                  <thead>
                    <tr>
                      <th>Attack</th><th>To Hit</th><th>Crit mod</th><th>DMG</th>
                      <th>DMG Type</th><th>Bonus DMG</th><th>Bonus Type</th><th>Resource</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr key={row.id} className={`${styles.attackBreakdownRow} ${styles.attackBreakdownRowActive}`}>
                        <td title={row.note}>{row.name}{row.note && <span className={styles.diceNote}> note</span>}</td>
                        <td>{row.id === 'normal' ? formatToHitParts(row.toHit, []) : formatToHitRider(row.toHit, [])}</td>
                        <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>—</td>
                        <td>{row.dmg ?? '—'}</td>
                        <td>{row.dmgType ?? '—'}</td>
                        <td>{row.bonusDmg ?? '—'}</td>
                        <td>{row.bonusDmgType ?? '—'}</td>
                        <td><span className={styles.resourceChip}>{row.id === 'normal' ? '—' : 'Equipment'}</span></td>
                      </tr>
                    ))}
                    <tr className={styles.attackBreakdownTotalRow}>
                      <td>Total</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatToHitParts(atk.toHit, [])}</td>
                      <td style={{ verticalAlign: 'middle' }}>
                        <span style={{ padding: '4px 10px', backgroundColor: '#d4af37', color: '#1a1a1a', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #8b7c3a', display: 'inline-block' }}>
                          Crit 20+
                        </span>
                      </td>
                      <td colSpan={5}>{subtotals.map(s => `(${s.expr}) ${s.type}`).join(' + ') || '—'}</td>
                    </tr>
                    <tr className={styles.attackBreakdownCriticalRow}>
                      <td>critical</td>
                      <td>—</td>
                      <td>—</td>
                      <td colSpan={5}>{critTotals.map(s => `(${s.expr}) ${s.type}`).join(' + ') || '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )
    }
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
            {(char.subclass === 'BattleMaster' || char.feats.includes('martialAdept') || maneuversKnownOf(char).length > 0) && (() => {
              const isBattleMaster = char.subclass === 'BattleMaster'
              const fallbackTotal = isBattleMaster ? (char.level >= 15 ? 6 : char.level >= 7 ? 5 : 4) : 1
              const superiorityDice = char.resources['Superiority Dice'] ?? { used: 0, total: fallbackTotal }
              const totalDice = superiorityDice.total
              const dieSize = isBattleMaster ? (char.level >= 10 ? '1d10' : '1d8') : '1d6'
              const usedDice = superiorityDice.used
              const leftDice = Math.max(0, totalDice - usedDice)
              const dc = 8 + char.proficiencyBonus + Math.max(mod(char.abilityScores.str), mod(char.abilityScores.dex))
              const classKnownCount = char.subclass === 'BattleMaster' ? maneuversKnown(char.level) : 0
              const known = classKnownCount + (char.feats.includes('martialAdept') ? 2 : 0)
              const chosen = maneuversKnownOf(char)
              const active = activeManeuverOf(char)
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
              const learned = arcaneShotsKnownOf(char)
              const activeShot = activeArcaneShotOf(char)
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
                  <span style={{ color: 'var(--text-muted)' }}>Range</span><span>{spellSniperRange(spell, hasSpellSniper(char))}</span>
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
                {MANEUVERS.filter(m => !maneuversKnownOf(char).includes(m.id)).map(m => (
                  <button
                    key={m.id}
                    className={styles.armoryEntry}
                    onClick={() => {
                      update({ chosenManeuvers: [...maneuversKnownOf(char), m.id] })
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
                {ARCANE_SHOTS.filter(s => !arcaneShotsKnownOf(char).includes(s.id)).map(s => (
                  <button
                    key={s.id}
                    className={styles.armoryEntry}
                    onClick={() => {
                      update({ arcaneShots: [...arcaneShotsKnownOf(char), s.id] })
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

  // Actions whose rich interactive detail lives in FeatureDetails (also
  // reachable from the Features panel) — route there so the action list
  // offers the same pickers instead of a plain text pane.
  const FEATURE_ROUTED_ACTIONS: Record<string, string> = {
    'Wild Shape': 'Wild Shape',
    'Channel Divinity': 'Channel Divinity (1/rest)',
    'Turn Undead': 'Channel Divinity (1/rest)',
    'Metamagic': 'Metamagic',
  }
  if (FEATURE_ROUTED_ACTIONS[selectedAction]) {
    return (
      <FeatureDetails
        character={char}
        update={update}
        feature={{ level: selectedActionDef.requiresLevel ?? 2, name: FEATURE_ROUTED_ACTIONS[selectedAction], desc: selectedActionDef.full }}
        onSummon={onSummon}
        onConcentrationBroken={onConcentrationBroken}
      />
    )
  }

  // ARCANE RECOVERY — slot picker
  if (selectedAction === 'Arcane Recovery') {
    return <ArcaneRecoveryDetail character={char} update={update} desc={selectedActionDef.full} useButton={renderActionUseButton()} />
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
    const hasTWF = fightingStyleOf(char) === 'two-weapon-fighting'
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
            spendEconomy(char.id, 'bonus')
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
