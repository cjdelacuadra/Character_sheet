import { useState } from 'react'
import { useAppStore } from '@/app/store'
import type { Character, AbilityScores, AbilityScore, Skill, Weapon } from '@/entities/character/types'
import { LevelUpModal } from '@/widgets/level-up-modal/LevelUpModal'
import type { AsiChoice } from '@/widgets/level-up-modal/LevelUpModal'
import { SKILLS } from '@/shared/data/skills'
import { ARMOR_BY_ID, ARMOR_LIST } from '@/shared/data/armorData'
import { WEAPONS, type WeaponDef } from '@/shared/data/weaponData'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { RACE_BY_ID } from '@/shared/data/raceData'
import { SUBCLASS_BY_ID } from '@/shared/data/subclassData'
import { computeAC, computeMaxHP, mod } from '@/shared/data/charCalculations'
import { SPELL_BY_ID } from '@/shared/data/spellData'
import {
  computeAttackBonus, isProficientWithWeapon, computeSpellSaveDC, computeSpellAttackBonus,
  getAvailableActions, xpForNextLevel,
  type ActionDef,
} from '@/domain/rules'
import styles from './CharacterView.module.css'

// ── Constants ──────────────────────────────────────────────────────────────

const CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened',
  'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified',
  'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious',
]

const ABILITY_KEYS: AbilityScore[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const ABILITY_LABELS: Record<AbilityScore, string> = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' }
const ORDINAL: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', 6: '6th', 7: '7th', 8: '8th', 9: '9th' }

type EditField = 'speed' | 'initiative' | 'xp' | keyof AbilityScores

// ── Main component ─────────────────────────────────────────────────────────

export function CharacterView() {
  const { characters, activeCharacterId, exitCharacter, updateCharacter, shortRest, longRest, levelUp, setTempHp } = useAppStore()

  const [hpEdit, setHpEdit] = useState<string | null>(null)
  const [tempHpEdit, setTempHpEdit] = useState<string | null>(null)
  const [fieldEdit, setFieldEdit] = useState<{ field: EditField; value: string } | null>(null)
  const [conditionOpen, setConditionOpen] = useState(false)
  const [armorOpen, setArmorOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [expandedFeatures, setExpandedFeatures] = useState<Set<number>>(new Set())
  const [spellSearch, setSpellSearch] = useState('')
  const [armoryOpen, setArmoryOpen] = useState(false)
  const [armorySearch, setArmorySearch] = useState('')
  const [armoryTab, setArmoryTab] = useState<'browse' | 'custom'>('browse')
  const [customWeapon, setCustomWeapon] = useState<{ name: string; atkBonus: string; damage: string; damageType: string }>({ name: '', atkBonus: '0', damage: '', damageType: '' })
  const [customWeaponError, setCustomWeaponError] = useState<string | null>(null)
  const [spellModal, setSpellModal] = useState<string | null>(null)
  const [restPanel, setRestPanel] = useState<'short' | 'long' | null>(null)
  const [hdRoll, setHdRoll] = useState<string>('')
  const [levelUpModalOpen, setLevelUpModalOpen] = useState(false)

  const charMaybe = activeCharacterId ? characters[activeCharacterId] : null
  if (!charMaybe) return null
  const char: Character = charMaybe

  const update = (patch: Partial<Character>) => updateCharacter(char.id, patch)
  const hp = char.hitPoints
  const hpPct = hp.max > 0 ? Math.max(0, Math.min(100, (hp.current / hp.max) * 100)) : 0
  const eq = char.equipment ?? { armorId: null, hasShield: false }
  const classDef = CLASS_BY_ID[char.classId]
  const prof = char.proficiencyBonus

  // Domain-computed stats
  const spellSaveDC = classDef?.spellcastingAbility ? computeSpellSaveDC(char) : null
  const spellAtkBonus = classDef?.spellcastingAbility ? computeSpellAttackBonus(char) : null
  const availableActions = getAvailableActions(char)
  const xpNext = xpForNextLevel(char.level)
  const canLevelUp = xpNext !== null && char.experiencePoints >= xpNext
  const nextLevelIsAsi = classDef?.asiLevels?.includes(char.level + 1) ?? false

  function handleLevelUp() {
    if (nextLevelIsAsi) {
      setLevelUpModalOpen(true)
    } else {
      levelUp(char.id)
    }
  }

  function handleAsiConfirm(choice: AsiChoice) {
    levelUp(char.id, choice)
    setLevelUpModalOpen(false)
  }

  // ── HP handlers ──────────────────────────────────────────────────────────

  function applyHp(delta: number) {
    update({ hitPoints: { ...hp, current: Math.min(hp.max, Math.max(0, hp.current + delta)) } })
  }

  function commitHpEdit() {
    if (hpEdit === null) return
    const v = parseInt(hpEdit, 10)
    if (!isNaN(v)) update({ hitPoints: { ...hp, current: Math.min(hp.max, Math.max(0, v)) } })
    setHpEdit(null)
  }

  function commitTempHpEdit() {
    if (tempHpEdit === null) return
    const v = parseInt(tempHpEdit, 10)
    if (!isNaN(v)) setTempHp(char.id, v)
    setTempHpEdit(null)
  }

  // ── Field edit handlers ──────────────────────────────────────────────────

  function startEdit(field: EditField, val: number) {
    setFieldEdit({ field, value: String(val) })
  }

  function commitEdit() {
    if (!fieldEdit) { setFieldEdit(null); return }
    const v = parseInt(fieldEdit.value, 10)
    if (isNaN(v)) { setFieldEdit(null); return }
    const { field } = fieldEdit
    if (field === 'speed') {
      update({ speed: Math.max(0, v) })
    } else if (field === 'initiative') {
      update({ initiative: v })
    } else if (field === 'xp') {
      update({ experiencePoints: Math.max(0, v) })
    } else {
      const key = field as keyof AbilityScores
      const clamped = Math.min(30, Math.max(1, v))
      const newScores = { ...char.abilityScores, [key]: clamped }
      const newAC = computeAC({ abilityScores: newScores, equipment: eq, classId: char.classId, race: char.race, subclass: char.subclass })
      const bonusHpPerLevel = RACE_BY_ID[char.race]?.bonusHpPerLevel ?? 0
      const newMaxHP = computeMaxHP(char.classId, char.level, newScores.con, bonusHpPerLevel)
      const hpDiff = newMaxHP - hp.max
      update({
        abilityScores: newScores,
        initiative: Math.floor((newScores.dex - 10) / 2),
        armorClass: newAC,
        hitPoints: { ...hp, max: newMaxHP, current: Math.max(0, hp.current + hpDiff) },
      })
    }
    setFieldEdit(null)
  }

  // ── Other handlers ───────────────────────────────────────────────────────

  function toggleCondition(name: string) {
    const id = name.toLowerCase()
    const has = char.conditionIds.some(c => c.conditionId === id)
    update({
      conditionIds: has
        ? char.conditionIds.filter(c => c.conditionId !== id)
        : [...char.conditionIds, { conditionId: id }],
    })
  }

  function tickSave(type: 'successes' | 'failures') {
    const cur = char.deathSaves[type]
    update({ deathSaves: { ...char.deathSaves, [type]: cur >= 3 ? 0 : cur + 1 } })
  }

  function setArmor(armorId: string | null, hasShield: boolean) {
    const newEq = { armorId, hasShield }
    const newAC = computeAC({ abilityScores: char.abilityScores, equipment: newEq, classId: char.classId, race: char.race, subclass: char.subclass })
    update({ equipment: newEq, armorClass: newAC })
  }

  function useSlot(level: number) {
    const slot = char.spellSlots[level]
    if (!slot || slot.used >= slot.total) return
    update({ spellSlots: { ...char.spellSlots, [level]: { ...slot, used: slot.used + 1 } } })
  }

  function recoverSlot(level: number) {
    const slot = char.spellSlots[level]
    if (!slot || slot.used === 0) return
    update({ spellSlots: { ...char.spellSlots, [level]: { ...slot, used: slot.used - 1 } } })
  }

  function cycleSkill(key: Skill) {
    const current = char.skillProficiencies?.[key] ?? 'none'
    const next: 'proficient' | 'expert' | undefined =
      current === 'none' ? 'proficient' : current === 'proficient' ? 'expert' : undefined
    const updated = { ...(char.skillProficiencies ?? {}) }
    if (next === undefined) delete updated[key]
    else updated[key] = next
    update({ skillProficiencies: updated })
  }

  function toggleFeature(i: number) {
    setExpandedFeatures(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })
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
      bonusDamageDie: w.bonusDamageDie,
      bonusDamageType: w.bonusDamageType,
    }
    update({ weapons: [...(char.weapons ?? []), weapon] })
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
    update({ weapons: [...(char.weapons ?? []), w] })
    setArmoryOpen(false)
    setCustomWeapon({ name: '', atkBonus: '0', damage: '', damageType: '' })
  }

  function removeWeapon(id: string) {
    update({ weapons: (char.weapons ?? []).filter(w => w.id !== id) })
  }

  function useResource(name: string) {
    const res = char.resources[name]
    if (!res || res.used >= res.total) return
    update({ resources: { ...char.resources, [name]: { ...res, used: res.used + 1 } } })
  }

  function recoverResource(name: string) {
    const res = char.resources[name]
    if (!res || res.used === 0) return
    update({ resources: { ...char.resources, [name]: { ...res, used: res.used - 1 } } })
  }

  function setConcentration(spellId: string) {
    update({ concentrationSpellId: char.concentrationSpellId === spellId ? undefined : spellId })
  }

  function doShortRest() {
    const rollVal = parseInt(hdRoll, 10)
    if (isNaN(rollVal) || rollVal < 1) return
    shortRest(char.id, rollVal)
    setRestPanel(null)
    setHdRoll('')
  }

  function doLongRest() {
    longRest(char.id)
    setRestPanel(null)
  }

  function rollHitDie() {
    const cls = CLASS_BY_ID[char.classId]
    const sides = cls?.hitDie ?? 8
    setHdRoll(String(Math.ceil(Math.random() * sides)))
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  function fmtMod(n: number) { return n >= 0 ? `+${n}` : String(n) }

  function actionAccentClass(type: string) {
    if (type === 'Action') return styles.selAction
    if (type === 'Bonus Action') return styles.selBonus
    if (type === 'Reaction') return styles.selReaction
    return styles.selFree
  }

  function actionBadgeClass(type: string) {
    if (type === 'Action') return styles.badgeAction
    if (type === 'Bonus Action') return styles.badgeBonusAction
    if (type === 'Reaction') return styles.badgeReaction
    return styles.badgeFree
  }

  function isActionDepleted(action: ActionDef): boolean {
    if (!action.resourceKey || !action.resourceCost) return false
    const res = char.resources[action.resourceKey]
    if (!res) return false
    return (res.total - res.used) < action.resourceCost
  }

  const equippedArmor = eq.armorId ? ARMOR_BY_ID[eq.armorId] : null
  const armorName = equippedArmor?.name ?? 'Unarmored'
  const armorStrRequired = equippedArmor?.strRequirement ?? 0
  const armorStrWarning = armorStrRequired > 0 && char.abilityScores.str < armorStrRequired
  const subclassDef = char.subclass ? SUBCLASS_BY_ID[char.subclass] : undefined
  const effectiveArmorProfs = [
    ...(classDef?.armorProficiencies ?? []),
    ...(subclassDef?.extraArmorProficiencies ?? []),
  ]
  const allowedArmors = ARMOR_LIST.filter(a =>
    a.type === 'none' || effectiveArmorProfs.includes(a.type as 'light' | 'medium' | 'heavy')
  )
  const canShield = effectiveArmorProfs.includes('shields')
  const passivePerception = 10 + mod(char.abilityScores.wis) +
    (char.skillProficiencies?.['perception'] === 'expert' ? prof * 2 :
     char.skillProficiencies?.['perception'] === 'proficient' ? prof : 0)
  const availableHD = char.level - (char.hitDiceUsed ?? 0)
  const hasResources = Object.keys(char.resources).length > 0
  const activeConcentration = char.concentrationSpellId
    ? SPELL_BY_ID[char.concentrationSpellId]
    : null

  // Group actions by type
  const actionGroups: Array<{ type: ActionDef['type']; label: string; items: ActionDef[] }> = [
    { type: 'Action' as const,       label: 'Actions',         items: availableActions.filter(a => a.type === 'Action') },
    { type: 'Bonus Action' as const, label: 'Bonus Actions',   items: availableActions.filter(a => a.type === 'Bonus Action') },
    { type: 'Reaction' as const,     label: 'Reactions',       items: availableActions.filter(a => a.type === 'Reaction') },
    { type: 'Free' as const,         label: 'Class Abilities', items: availableActions.filter(a => a.type === 'Free') },
  ].filter(g => g.items.length > 0)

  return (
    <div className={styles.view}>

      {/* ── HEADER: 2-ROW IDENTITY GRID ── */}
      <header className={styles.headerGrid}>
        {/* Row 1 */}
        <div className={styles.headerCell}>
          <span className={styles.headerValue}>{char.name}</span>
          <span className={styles.headerLabel}>Character Name</span>
        </div>
        <div className={styles.headerCell}>
          <span className={styles.headerValue}>
            {char.classId}{char.subclass ? ` (${SUBCLASS_BY_ID[char.subclass]?.label ?? char.subclass})` : ''} {char.level}
          </span>
          <span className={styles.headerLabel}>Class &amp; Level</span>
        </div>
        <div className={styles.headerCell}>
          <span className={styles.headerValue}>{char.background}</span>
          <span className={styles.headerLabel}>Background</span>
        </div>
        <div className={styles.headerCell}>
          <span className={styles.headerValue}>{char.playerName || '—'}</span>
          <span className={styles.headerLabel}>Player Name</span>
        </div>
        {/* Row 2 */}
        <div className={styles.headerCell}>
          <span className={styles.headerValue}>{char.race}</span>
          <span className={styles.headerLabel}>Race</span>
        </div>
        <div className={styles.headerCell}>
          <span className={styles.headerValue}>{char.alignment || '—'}</span>
          <span className={styles.headerLabel}>Alignment</span>
        </div>
        <div className={styles.headerCell}>
          <div className={styles.xpBlock}>
            {fieldEdit?.field === 'xp' ? (
              <input
                className={styles.xpInput}
                type="number"
                value={fieldEdit.value}
                autoFocus
                onChange={e => setFieldEdit({ field: 'xp', value: e.target.value })}
                onBlur={commitEdit}
                onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setFieldEdit(null) }}
              />
            ) : (
              <button className={styles.xpBtn} onClick={() => startEdit('xp', char.experiencePoints)}>
                <span className={styles.xpVal}>{char.experiencePoints.toLocaleString()}</span>
                {xpNext !== null && <span className={styles.xpMax}>/{xpNext.toLocaleString()}</span>}
              </button>
            )}
            {canLevelUp && (
              <button className={styles.levelUpBtn} onClick={handleLevelUp}>↑ Level Up</button>
            )}
          </div>
          <span className={styles.headerLabel}>Experience Points</span>
        </div>
        <div className={`${styles.headerCell} ${styles.headerActions}`}>
          <button
            className={`${styles.inspirationBtn} ${char.inspiration ? styles.inspirationOn : ''}`}
            onClick={() => update({ inspiration: !char.inspiration })}
          >✦ Insp.</button>
          <button className={styles.restBtn} onClick={() => setRestPanel(restPanel ? null : 'short')}>Rest</button>
          <button className={styles.backBtn} onClick={exitCharacter}>← Back</button>
        </div>
      </header>

      {/* ── REST PANEL ── */}
      {restPanel && (
        <div className={styles.restPanel}>
          <div className={styles.restTabs}>
            <button className={`${styles.restTab} ${restPanel === 'short' ? styles.restTabActive : ''}`} onClick={() => setRestPanel('short')}>Short Rest</button>
            <button className={`${styles.restTab} ${restPanel === 'long' ? styles.restTabActive : ''}`} onClick={() => setRestPanel('long')}>Long Rest</button>
          </div>

          {restPanel === 'short' && (
            <div className={styles.restBody}>
              <span className={styles.restNote}>
                Hit Dice available: <strong>{availableHD}/{char.level}</strong>
                {classDef && ` (d${classDef.hitDie})`}
              </span>
              {availableHD > 0 ? (
                <div className={styles.restHdRow}>
                  <input
                    className={styles.restHdInput}
                    type="number"
                    min={1}
                    max={classDef?.hitDie ?? 12}
                    placeholder="Roll value"
                    value={hdRoll}
                    onChange={e => setHdRoll(e.target.value)}
                  />
                  <button className={styles.restRollBtn} onClick={rollHitDie}>🎲 Roll</button>
                  <span className={styles.restHdNote}>
                    {hdRoll && !isNaN(parseInt(hdRoll))
                      ? `Heal: ${parseInt(hdRoll)} + CON (${fmtMod(mod(char.abilityScores.con))}) = ${Math.max(0, parseInt(hdRoll) + mod(char.abilityScores.con))} HP`
                      : ''}
                  </span>
                  <button className={styles.restConfirmBtn} disabled={!hdRoll || isNaN(parseInt(hdRoll))} onClick={doShortRest}>
                    Take Short Rest
                  </button>
                </div>
              ) : (
                <span className={styles.restNote}>No Hit Dice remaining.</span>
              )}
              <button className={styles.restCancelBtn} onClick={() => setRestPanel(null)}>Cancel</button>
            </div>
          )}

          {restPanel === 'long' && (
            <div className={styles.restBody}>
              <span className={styles.restNote}>Long rest restores all HP, all spell slots, and long-rest resources. Recovers {Math.max(1, Math.floor(char.level / 2))} spent Hit Dice.</span>
              <div className={styles.restActions}>
                <button className={styles.restConfirmBtn} onClick={doLongRest}>Take Long Rest</button>
                <button className={styles.restCancelBtn} onClick={() => setRestPanel(null)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── THREE COLUMNS ── */}
      <div className={styles.columns}>

        {/* ── LEFT: Vitals ── */}
        <aside className={styles.leftCol}>

          {/* Row 1: AC | Initiative | Speed */}
          <div className={styles.topStatRow}>
            <div className={`${styles.topStatBox} ${armorStrWarning ? styles.topStatBoxWarn : ''}`}
              onClick={() => setArmorOpen(v => !v)} title="Click to manage armor">
              <span className={styles.topStatVal}>{char.armorClass}{armorStrWarning ? ' ⚠' : ''}</span>
              <span className={styles.topStatLabel}>Armor Class</span>
            </div>
            <div
              className={`${styles.topStatBox} ${styles.topStatEditable}`}
              onClick={() => fieldEdit?.field !== 'initiative' && startEdit('initiative', char.initiative)}
              title="Click to edit"
            >
              {fieldEdit?.field === 'initiative' ? (
                <input
                  className={styles.statEditInput}
                  type="number"
                  value={fieldEdit.value}
                  autoFocus
                  onClick={e => e.stopPropagation()}
                  onChange={e => setFieldEdit({ field: 'initiative', value: e.target.value })}
                  onBlur={commitEdit}
                  onKeyDown={e => { if (e.key === 'Enter') commitEdit() }}
                />
              ) : (
                <span className={styles.topStatVal}>{fmtMod(char.initiative)}</span>
              )}
              <span className={styles.topStatLabel}>Initiative</span>
            </div>
            <div
              className={`${styles.topStatBox} ${styles.topStatEditable}`}
              onClick={() => fieldEdit?.field !== 'speed' && startEdit('speed', char.speed)}
              title="Click to edit"
            >
              {fieldEdit?.field === 'speed' ? (
                <input
                  className={styles.statEditInput}
                  type="number"
                  value={fieldEdit.value}
                  autoFocus
                  onClick={e => e.stopPropagation()}
                  onChange={e => setFieldEdit({ field: 'speed', value: e.target.value })}
                  onBlur={commitEdit}
                  onKeyDown={e => { if (e.key === 'Enter') commitEdit() }}
                />
              ) : (
                <span className={styles.topStatVal}>{char.speed} <span className={styles.statUnit}>ft</span></span>
              )}
              <span className={styles.topStatLabel}>Speed</span>
            </div>
          </div>

          {/* Armor picker — collapsed sub-row */}
          {armorOpen && (
            <div className={styles.armorPickerRow}>
              {allowedArmors.map(a => (
                <button
                  key={a.id}
                  className={`${styles.armorOpt} ${(eq.armorId ?? 'none') === a.id ? styles.armorOptSel : ''}`}
                  onClick={() => { setArmor(a.id === 'none' ? null : a.id, eq.hasShield); setArmorOpen(false) }}
                >
                  {a.name}
                </button>
              ))}
              {canShield && (
                <button
                  className={`${styles.armorOpt} ${eq.hasShield ? styles.armorOptSel : ''}`}
                  onClick={() => setArmor(eq.armorId, !eq.hasShield)}
                >
                  {eq.hasShield ? '✓ Shield' : 'Shield'}
                </button>
              )}
              <button className={styles.armorOpt} onClick={() => setArmorOpen(false)}>Done</button>
            </div>
          )}

          {/* Secondary stats row: Prof / Spell DC / Spell Atk */}
          <div className={styles.secondaryStatRow}>
            <span className={styles.secondaryStat}><strong>{fmtMod(prof)}</strong> Prof</span>
            {spellSaveDC !== null && <span className={styles.secondaryStat}><strong>{spellSaveDC}</strong> Spell DC</span>}
            {spellAtkBonus !== null && <span className={styles.secondaryStat}><strong>{fmtMod(spellAtkBonus)}</strong> Spell Atk</span>}
          </div>

          {/* Row 2: HP | Temp HP | Death Saves */}
          <div className={styles.hpRow}>
            {/* Current HP */}
            <div className={styles.hpCurrentSection}>
              <span className={styles.hpMaxLabel}>Hit Point Maximum: {hp.max}</span>
              {hpEdit !== null ? (
                <input
                  className={styles.hpEditInput}
                  type="number"
                  value={hpEdit}
                  autoFocus
                  min={0} max={hp.max}
                  onChange={e => setHpEdit(e.target.value)}
                  onBlur={commitHpEdit}
                  onKeyDown={e => { if (e.key === 'Enter') commitHpEdit(); if (e.key === 'Escape') setHpEdit(null) }}
                />
              ) : (
                <span className={styles.hpCurrent} onClick={() => setHpEdit(String(hp.current))} title="Click to edit">
                  {hp.current}
                </span>
              )}
            </div>
            {/* Temp HP */}
            <div className={styles.hpTempSection}>
              <span className={styles.hpSectionLabel}>Temp HP</span>
              {tempHpEdit !== null ? (
                <input
                  className={styles.tempHpInput}
                  type="number"
                  min={0}
                  value={tempHpEdit}
                  autoFocus
                  onChange={e => setTempHpEdit(e.target.value)}
                  onBlur={commitTempHpEdit}
                  onKeyDown={e => { if (e.key === 'Enter') commitTempHpEdit(); if (e.key === 'Escape') setTempHpEdit(null) }}
                />
              ) : (
                <button
                  className={`${styles.tempHpChip} ${hp.temp > 0 ? styles.tempHpActive : styles.tempHpMuted}`}
                  onClick={() => setTempHpEdit(String(hp.temp))}
                  title="Click to set"
                >
                  {hp.temp > 0 ? `+${hp.temp}` : '—'}
                </button>
              )}
            </div>
            {/* Death Saves — always visible */}
            <div className={styles.hpDeathSection}>
              <span className={styles.hpSectionLabel}>Death Saves</span>
              {(['successes', 'failures'] as const).map(type => (
                <div key={type} className={styles.deathRow}>
                  <span className={styles.deathLabel}>{type === 'successes' ? 'S' : 'F'}</span>
                  <div className={styles.deathDots}>
                    {[0, 1, 2].map(i => (
                      <button
                        key={i}
                        className={`${styles.deathDot} ${i < char.deathSaves[type] ? (type === 'successes' ? styles.dotSuccess : styles.dotFail) : ''}`}
                        onClick={() => tickSave(type)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* HP delta buttons + progress bar */}
          <div className={styles.hpBar}>
            <div
              className={styles.hpFill}
              style={{ width: `${hpPct}%`, background: hpPct > 50 ? 'var(--success)' : hpPct > 25 ? 'var(--warning)' : 'var(--danger)' }}
            />
          </div>
          <div className={styles.hpBtns}>
            {[-10, -5, -1].map(d => (
              <button key={d} className={styles.dmgBtn} onClick={() => applyHp(d)}>{d}</button>
            ))}
            {[1, 5, 10].map(d => (
              <button key={d} className={styles.healBtn} onClick={() => applyHp(d)}>+{d}</button>
            ))}
          </div>

          {/* Conditions */}
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionLabel}>Conditions</span>
              <button className={styles.addBtn} onClick={() => setConditionOpen(v => !v)}>
                {conditionOpen ? 'Done' : '+ Add'}
              </button>
            </div>
            {conditionOpen && (
              <div className={styles.conditionPicker}>
                {CONDITIONS.map(name => {
                  const active = char.conditionIds.some(c => c.conditionId === name.toLowerCase())
                  return (
                    <button
                      key={name}
                      className={`${styles.condOpt} ${active ? styles.condOptActive : ''}`}
                      onClick={() => toggleCondition(name)}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
            )}
            <div className={styles.condTags}>
              {char.conditionIds.length === 0 && !conditionOpen && (
                <span className={styles.emptyNote}>None</span>
              )}
              {char.conditionIds.map(c => (
                <button key={c.conditionId} className={styles.condTag} onClick={() => toggleCondition(c.conditionId)} title="Click to remove">
                  {c.conditionId} ×
                </button>
              ))}
            </div>
          </section>

          {/* Row 3: Inspiration pips */}
          <div className={styles.inspirationPipRow}>
            <span className={styles.inspirationPipLabel}>Inspiration</span>
            <button
              className={`${styles.inspirationPip} ${char.inspiration ? styles.inspirationPipFilled : ''}`}
              onClick={() => update({ inspiration: !char.inspiration })}
              title={char.inspiration ? 'Click to remove inspiration' : 'Click to gain inspiration'}
            />
            <span className={styles.inspirationPipLabel} style={{ marginLeft: 4, fontSize: 10 }}>
              {char.inspiration ? 'Active' : '—'}
            </span>
          </div>

          {/* Row 4: Ability scores (left) + Saves/Skills (right) */}
          <div className={styles.statsSubGrid}>
            {/* Left: Ability score blocks */}
            <div className={styles.statsSubLeft}>
              {ABILITY_KEYS.map(key => {
                const val = char.abilityScores[key]
                const isEditing = fieldEdit?.field === key
                return (
                  <div key={key} className={styles.abilityBlock}>
                    <div className={styles.abilityModCircle}>{fmtMod(mod(val))}</div>
                    <div
                      className={styles.abilityScoreBox}
                      onClick={() => !isEditing && startEdit(key, val)}
                      title="Click to edit"
                    >
                      {isEditing ? (
                        <input
                          className={styles.abilityEditInput}
                          type="number"
                          min={1} max={30}
                          value={fieldEdit!.value}
                          autoFocus
                          onClick={e => e.stopPropagation()}
                          onChange={e => setFieldEdit({ field: key, value: e.target.value })}
                          onBlur={commitEdit}
                          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setFieldEdit(null) }}
                        />
                      ) : (
                        <span className={styles.abilityScoreNum}>{val}</span>
                      )}
                    </div>
                    <span className={styles.abilityName}>{ABILITY_LABELS[key]}</span>
                  </div>
                )
              })}
            </div>

            {/* Right: Saves + Skills + Passive Perception */}
            <div className={styles.statsSubRight}>
              <div className={styles.savesHeader}>
                <span className={styles.sectionLabel}>Saving Throws</span>
                <span className={styles.profBadge}>Prof {fmtMod(prof)}</span>
              </div>
              {ABILITY_KEYS.map(ab => {
                const isProficient = char.savingThrowProficiencies?.includes(ab) ?? false
                const bonus = mod(char.abilityScores[ab]) + (isProficient ? prof : 0)
                return (
                  <div key={ab} className={styles.saveRow}>
                    <button
                      className={`${styles.saveCircle} ${isProficient ? styles.saveCircleFilled : ''}`}
                      onClick={() => {
                        const current = char.savingThrowProficiencies ?? []
                        update({ savingThrowProficiencies: isProficient ? current.filter(x => x !== ab) : [...current, ab] })
                      }}
                    />
                    <span className={styles.saveBonus}>{fmtMod(bonus)}</span>
                    <span className={styles.saveAb}>{ab.toUpperCase()}</span>
                  </div>
                )
              })}

              <div className={styles.skillsHeader}>
                <span className={styles.sectionLabel}>Skills</span>
              </div>
              <div className={styles.skillsList}>
                {SKILLS.map(({ key, label, ability }) => {
                  const state = char.skillProficiencies?.[key] ?? 'none'
                  const bonus = mod(char.abilityScores[ability]) +
                    (state === 'none' ? 0 : state === 'proficient' ? prof : prof * 2)
                  return (
                    <button key={key} className={styles.skillRow} onClick={() => cycleSkill(key)}>
                      <span className={`${styles.skillCircle} ${state === 'expert' ? styles.skillCircleExpert : state === 'proficient' ? styles.skillCircleProf : ''}`} />
                      <span className={styles.skillBonus}>{fmtMod(bonus)}</span>
                      <span className={styles.skillLabel}>{label}</span>
                      <span className={styles.skillAb}>{ability.toUpperCase()}</span>
                    </button>
                  )
                })}
              </div>

              <div className={styles.passivePP}>
                Passive Perception: <strong>{passivePerception}</strong>
              </div>
            </div>
          </div>
        </aside>

        {/* ── CENTER: Features + Resources + Attacks + Actions ── */}
        <div className={styles.centerCol}>

          {/* Class Features */}
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionLabel}>{char.classId} Features</span>
            </div>
            {(() => {
              const classFeatures = getClassFeatures(char.classId, char.level)
              if (classFeatures.length === 0) return <span className={styles.emptyNote}>No features at this level.</span>
              return (
                <div className={styles.featureList}>
                  {classFeatures.map((f, i) => {
                    const open = expandedFeatures.has(i)
                    return (
                      <div key={i} className={styles.featureCard}>
                        <button className={styles.featureHead} onClick={() => toggleFeature(i)}>
                          <span className={styles.featureName}>{f.name}</span>
                          <span className={styles.featureLevel}>Lvl {f.level}</span>
                          <span className={styles.featureChevron}>{open ? '▾' : '▸'}</span>
                        </button>
                        {open && <p className={styles.featureDesc}>{f.desc}</p>}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </section>

          {/* Resources */}
          {hasResources && (
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionLabel}>Resources</span>
              </div>
              <div className={styles.resourceList}>
                {Object.entries(char.resources).map(([name, res]) => {
                  const remaining = res.total - res.used
                  const resDef = classDef?.resources?.find(r => r.name === name)
                  return (
                    <div key={name} className={styles.resourceRow}>
                      <span className={styles.resourceName}>{name}</span>
                      <div className={styles.resourcePips}>
                        {Array.from({ length: Math.min(res.total, 20) }).map((_, i) => (
                          <button
                            key={i}
                            className={`${styles.resourcePip} ${i < remaining ? styles.resourcePipFull : styles.resourcePipEmpty}`}
                            onClick={() => i < remaining ? useResource(name) : recoverResource(name)}
                            title={i < remaining ? 'Use' : 'Recover'}
                          />
                        ))}
                        {res.total > 20 && (
                          <span className={styles.resourceCount}>{remaining}/{res.total}</span>
                        )}
                      </div>
                      {resDef && (
                        <span className={styles.resourceRecovery}>
                          {resDef.recoverOn === 'short' ? 'SR' : resDef.recoverOn === 'long' ? 'LR' : '—'}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}


          {/* Actions */}
          {actionGroups.map(({ type, label, items }) => {
            const labelClass =
              type === 'Action' ? styles.labelAction :
              type === 'Bonus Action' ? styles.labelBonus :
              type === 'Reaction' ? styles.labelReaction : styles.labelFree
            return (
              <section key={type} className={styles.section}>
                <div className={styles.sectionHead}>
                  <span className={`${styles.sectionLabel} ${labelClass}`}>{label}</span>
                  <span className={styles.actionTypeCount}>{items.length}</span>
                </div>
                <div className={styles.actionList}>
                  {items.map(action => {
                    const depleted = isActionDepleted(action)
                    return (
                      <button
                        key={action.name}
                        className={`${styles.actionCompact} ${depleted ? styles.actionDepleted : ''} ${selectedAction === action.name ? `${styles.actionCompactSel} ${actionAccentClass(type)}` : ''}`}
                        onClick={() => setSelectedAction(selectedAction === action.name ? null : action.name)}
                      >
                        <span className={styles.actionName}>{action.name}</span>
                        {action.resourceKey && (
                          <span className={styles.actionCost}>
                            {action.resourceCost} {action.resourceKey}
                          </span>
                        )}
                        <span className={styles.actionShort}>{action.short}</span>
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>

        {/* ── RIGHT: Attacks + Detail + Spells ── */}
        <div className={styles.rightCol}>

          {/* Attacks */}
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionLabel}>Attacks</span>
              <button className={styles.addBtn} onClick={() => setArmoryOpen(true)}>+ Add</button>
            </div>
            <table className={styles.weaponTable}>
              <thead>
                <tr>
                  <th className={styles.wthName}>Name</th>
                  <th className={styles.wthAtk}>Atk</th>
                  <th className={styles.wthDmg}>Damage</th>
                  <th className={styles.wthType}>Type</th>
                  <th className={styles.wthBdmg}>Bonus Dmg</th>
                  <th className={styles.wthBtype}>Bonus Type</th>
                  <th className={styles.wthRange}>Range</th>
                  <th className={styles.wthDel} />
                </tr>
              </thead>
              <tbody>
                {(char.weapons ?? []).map(w => {
                  const computed = computeAttackBonus(char, w)
                  const proficient = isProficientWithWeapon(char, w)
                  const rangeLabel = w.rangeType === 'Melee' ? 'Melee' : w.rangeType === 'Ranged' ? 'Ranged' : w.rangeType === 'Melee or Ranged' ? 'M/R' : '—'
                  return (
                    <tr key={w.id} className={styles.weaponRow}>
                      <td className={styles.weaponName}>
                        {w.name}
                        {(w.enchantmentBonus ?? 0) > 0 && (
                          <span className={styles.enchantBadge}>+{w.enchantmentBonus}</span>
                        )}
                      </td>
                      <td className={styles.weaponAtk} style={proficient ? undefined : { opacity: 0.5 }}>
                        {computed >= 0 ? `+${computed}` : computed}
                        {!proficient && <span title="Not proficient" style={{ marginLeft: 3 }}>⚠</span>}
                      </td>
                      <td className={styles.weaponDmg}>{w.damage}</td>
                      <td className={styles.weaponDmg}>{w.damageType ?? '—'}</td>
                      <td className={styles.weaponDmg}>{w.bonusDamageDie ?? '—'}</td>
                      <td className={styles.weaponDmg}>{w.bonusDamageType ?? '—'}</td>
                      <td className={styles.weaponDmg}>{rangeLabel}</td>
                      <td><button className={styles.weaponDel} onClick={() => removeWeapon(w.id)}>×</button></td>
                    </tr>
                  )
                })}
                {(char.weapons ?? []).length === 0 && (
                  <tr><td colSpan={8} className={styles.weaponEmpty}>No weapons — click + Add</td></tr>
                )}
              </tbody>
            </table>
          </section>

          {/* Action detail */}
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionLabel}>Action Detail</span>
              {selectedAction && <button className={styles.addBtn} onClick={() => setSelectedAction(null)}>Clear</button>}
            </div>
            {(() => {
              const action = selectedAction ? availableActions.find(a => a.name === selectedAction) : null
              if (!action) return (
                <div className={styles.detailEmpty}>Select an action, bonus action, or reaction to see its full description.</div>
              )
              return (
                <div className={styles.detailPane}>
                  <div className={styles.detailHeader}>
                    <span className={styles.detailName}>{action.name}</span>
                    <span className={`${styles.detailBadge} ${actionBadgeClass(action.type)}`}>
                      {action.type === 'Bonus Action' ? 'Bonus' : action.type}
                    </span>
                  </div>
                  {action.resourceKey && (
                    <div className={styles.detailResource}>
                      Cost: {action.resourceCost} {action.resourceKey}
                      {char.resources[action.resourceKey] && (
                        <span className={styles.detailResourceRemaining}>
                          ({char.resources[action.resourceKey].total - char.resources[action.resourceKey].used} remaining)
                        </span>
                      )}
                    </div>
                  )}
                  <p className={styles.detailFull}>{action.full}</p>
                </div>
              )
            })()}
          </section>

          {/* Spell Slots — shown when Cast a Spell is selected */}
          {selectedAction === 'Cast a Spell' && Object.keys(char.spellSlots).length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionLabel}>Spell Slots</span>
              </div>
              <div className={styles.slotsList}>
                {(Object.entries(char.spellSlots) as [string, { used: number; total: number }][])
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([lvl, slot]) => {
                    const remaining = slot.total - slot.used
                    return (
                      <div key={lvl} className={styles.slotRow}>
                        <span className={styles.slotLvl}>{ORDINAL[Number(lvl)] ?? `${lvl}th`}</span>
                        <div className={styles.slotPips}>
                          {Array.from({ length: slot.total }).map((_, i) => (
                            <button
                              key={i}
                              className={`${styles.slotPip} ${i < remaining ? styles.pipFull : styles.pipEmpty}`}
                              onClick={() => i < remaining ? useSlot(Number(lvl)) : recoverSlot(Number(lvl))}
                              title={i < remaining ? 'Use slot' : 'Recover slot'}
                            />
                          ))}
                        </div>
                        <span className={styles.slotCount}>{remaining}/{slot.total}</span>
                      </div>
                    )
                  })}
              </div>
            </section>
          )}

          {/* Known Spells — shown when Cast a Spell is selected */}
          {selectedAction === 'Cast a Spell' && char.spellIds.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionLabel}>Spells Known</span>
                {spellSaveDC !== null && <span className={styles.spellStats}>DC {spellSaveDC} · {fmtMod(spellAtkBonus ?? 0)} atk</span>}
              </div>
              {activeConcentration && (
                <div className={styles.concentrationBanner}>
                  <span className={styles.concLabel}>Concentrating: <strong>{activeConcentration.name}</strong></span>
                  <button className={styles.concDrop} onClick={() => update({ concentrationSpellId: undefined })}>Drop</button>
                </div>
              )}
              <input
                className={styles.spellSearch}
                type="search"
                placeholder="Search spells…"
                value={spellSearch}
                onChange={e => setSpellSearch(e.target.value)}
              />
              <div className={styles.spellList}>
                {char.spellIds
                  .filter(id => {
                    const spell = SPELL_BY_ID[id]
                    const name = spell?.name ?? id
                    return name.toLowerCase().includes(spellSearch.toLowerCase())
                  })
                  .sort((a, b) => {
                    const la = SPELL_BY_ID[a]?.level ?? 0
                    const lb = SPELL_BY_ID[b]?.level ?? 0
                    return la - lb
                  })
                  .map(id => {
                    const spell = SPELL_BY_ID[id]
                    const isConc = char.concentrationSpellId === id
                    const canConc = spell?.concentration && classDef?.spellcastingAbility
                    return (
                      <div
                        key={id}
                        className={`${styles.spellEntry} ${isConc ? styles.spellConc : ''}`}
                        onClick={() => setSpellModal(id)}
                      >
                        <div className={styles.spellEntryLeft}>
                          {spell ? (
                            <>
                              <span className={`${styles.spellLevelBadge} ${spell.level === 0 ? styles.spellLevelCantrip : ''}`}>
                                {spell.level === 0 ? 'C' : spell.level}
                              </span>
                              <span className={styles.spellName}>{spell.name}</span>
                              <span className={styles.spellSchool}>{spell.school}</span>
                            </>
                          ) : (
                            <span className={styles.spellName}>{id}</span>
                          )}
                        </div>
                        <div className={styles.spellEntryRight}>
                          {spell?.concentration && (
                            <span className={styles.spellConcBadge} title="Requires concentration">C</span>
                          )}
                          {canConc && (
                            <button
                              className={`${styles.spellConcBtn} ${isConc ? styles.spellConcBtnActive : ''}`}
                              onClick={e => { e.stopPropagation(); setConcentration(id) }}
                              title={isConc ? 'Drop concentration' : 'Start concentrating'}
                            >
                              {isConc ? '◉' : '○'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* ── ARMORY MODAL ── */}
      {armoryOpen && (
        <div className={styles.modalOverlay} onClick={() => setArmoryOpen(false)}>
          <div className={styles.armoryModal} onClick={e => e.stopPropagation()}>
            <div className={styles.armoryHeader}>
              <span className={styles.armoryTitle}>Armory</span>
              <button className={styles.spellModalClose} onClick={() => setArmoryOpen(false)}>×</button>
            </div>
            <div className={styles.armoryTabs}>
              <button className={`${styles.armoryTab} ${armoryTab === 'browse' ? styles.armoryTabActive : ''}`} onClick={() => setArmoryTab('browse')}>Browse Catalog</button>
              <button className={`${styles.armoryTab} ${armoryTab === 'custom' ? styles.armoryTabActive : ''}`} onClick={() => setArmoryTab('custom')}>Custom</button>
            </div>
            {armoryTab === 'browse' && (
              <>
                <input
                  className={styles.spellSearch}
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
                            {w.rarity && (
                              <span className={styles.rarityBadge} data-rarity={w.rarity}>
                                {w.rarity}
                              </span>
                            )}
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

      {/* ── LEVEL UP MODAL ── */}
      {levelUpModalOpen && (
        <LevelUpModal
          character={char}
          newLevel={char.level + 1}
          onConfirm={handleAsiConfirm}
          onCancel={() => setLevelUpModalOpen(false)}
        />
      )}

      {/* ── SPELL MODAL ── */}
      {spellModal && (() => {
        const spell = SPELL_BY_ID[spellModal]
        if (!spell) { setSpellModal(null); return null }
        return (
          <div className={styles.modalOverlay} onClick={() => setSpellModal(null)}>
            <div className={styles.spellModalCard} onClick={e => e.stopPropagation()}>
              <div className={styles.spellModalHeader}>
                <div className={styles.spellModalTitle}>
                  <span className={styles.spellModalName}>{spell.name}</span>
                  <span className={styles.spellModalLevel}>
                    {spell.level === 0 ? 'Cantrip' : `${ORDINAL[spell.level] ?? `${spell.level}th`}-level`} {spell.school}
                  </span>
                </div>
                <button className={styles.spellModalClose} onClick={() => setSpellModal(null)}>×</button>
              </div>
              <dl className={styles.spellModalMeta}>
                <dt>Casting Time</dt><dd>{spell.castingTime}</dd>
                <dt>Range</dt><dd>{spell.range}</dd>
                <dt>Components</dt><dd>{spell.components}</dd>
                <dt>Duration</dt><dd>{spell.concentration ? '⚡ ' : ''}{spell.duration}</dd>
              </dl>
              <p className={styles.spellModalDesc}>{spell.description}</p>
              {spell.concentration && char.concentrationSpellId !== spell.id && (
                <button
                  className={styles.spellModalConcBtn}
                  onClick={() => { setConcentration(spell.id); setSpellModal(null) }}
                >
                  Start Concentrating
                </button>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ── Class features data (kept local to view) ────────────────────────────────

const CLASS_FEATURES_DATA: Record<string, { level: number; name: string; desc: string }[]> = {
  Fighter: [
    { level: 1, name: 'Fighting Style', desc: 'Adopt a particular style of fighting. +2 to a roll type based on style chosen.' },
    { level: 1, name: 'Second Wind', desc: 'Bonus action: regain 1d10 + fighter level HP. Recharges on short or long rest.' },
    { level: 2, name: 'Action Surge', desc: 'Take one additional action this turn. Recharges on short or long rest.' },
    { level: 3, name: 'Martial Archetype', desc: 'Choose your subclass.' },
    { level: 4, name: 'ASI', desc: 'Increase one ability score by 2, or two scores by 1. Max 20.' },
    { level: 5, name: 'Extra Attack', desc: 'Attack twice when you take the Attack action.' },
    { level: 6, name: 'ASI', desc: 'Increase one ability score by 2, or two scores by 1. Max 20.' },
    { level: 9, name: 'Indomitable', desc: 'Reroll a failed saving throw. You must use the new roll. Can use 1/long rest (2 at level 13, 3 at level 17).' },
    { level: 11, name: 'Extra Attack (2)', desc: 'Attack three times when you take the Attack action.' },
  ],
  Wizard: [
    { level: 1, name: 'Arcane Recovery', desc: 'Short rest: recover spell slots with total level ≤ ½ wizard level (rounded up).' },
    { level: 1, name: 'Spellbook', desc: 'Your spellbook contains 6 1st-level spells to start. Copy additional spells by spending 2 hours and 50gp per spell level.' },
    { level: 2, name: 'Arcane Tradition', desc: 'Choose your subclass.' },
    { level: 4, name: 'ASI', desc: 'Increase one ability score by 2, or two scores by 1. Max 20.' },
    { level: 5, name: 'Third-level Spells', desc: 'Access to 3rd-level spell slots.' },
    { level: 18, name: 'Spell Mastery', desc: 'Choose a 1st- and 2nd-level spell. Cast them at their lowest level without using a slot.' },
  ],
  Rogue: [
    { level: 1, name: 'Expertise', desc: 'Double proficiency bonus on 2 chosen skills.' },
    { level: 1, name: 'Sneak Attack', desc: 'Once per turn, deal extra damage when attacking with advantage or an ally is adjacent to target.' },
    { level: 1, name: "Thieves' Cant", desc: 'Secret language and signs used by rogues.' },
    { level: 2, name: 'Cunning Action', desc: 'Bonus action: Dash, Disengage, or Hide.' },
    { level: 3, name: 'Roguish Archetype', desc: 'Choose your subclass.' },
    { level: 5, name: 'Uncanny Dodge', desc: 'Reaction: halve damage from an attack you can see.' },
    { level: 7, name: 'Evasion', desc: 'When you succeed on a Dex save for half damage, you instead take no damage. On a failed save, half damage.' },
    { level: 11, name: 'Reliable Talent', desc: 'Treat any roll of 9 or lower as a 10 on skill checks you are proficient in.' },
  ],
  Barbarian: [
    { level: 1, name: 'Rage', desc: 'Bonus action: rage for 1 min. +damage, advantage on Str checks/saves, resistance to B/P/S damage.' },
    { level: 1, name: 'Unarmored Defense', desc: 'Without armor, AC = 10 + Dex mod + Con mod.' },
    { level: 2, name: 'Reckless Attack', desc: 'Advantage on first Str attack roll this turn, but attacks against you have advantage until next turn.' },
    { level: 2, name: 'Danger Sense', desc: 'Advantage on Dex saving throws against effects you can see (not blinded/deafened/incapacitated).' },
    { level: 3, name: 'Primal Path', desc: 'Choose your subclass.' },
    { level: 5, name: 'Extra Attack', desc: 'Attack twice when you take the Attack action.' },
    { level: 7, name: 'Feral Instinct', desc: 'Advantage on Initiative rolls. If surprised at start of combat, you can act normally on your first turn if you enter rage before doing anything else.' },
    { level: 9, name: 'Brutal Critical', desc: 'Roll one additional weapon damage die when scoring a critical hit. (Two at 13th, three at 17th.)' },
  ],
  Cleric: [
    { level: 1, name: 'Divine Domain', desc: 'Choose your subclass (domain).' },
    { level: 2, name: 'Channel Divinity (1/rest)', desc: 'Use a special divine effect (varies by domain).' },
    { level: 2, name: 'Turn Undead', desc: 'Channel Divinity: Wis save DC 8+Prof+Wis vs undead. On fail, undead flees for 1 min.' },
    { level: 5, name: 'Destroy Undead', desc: 'On a failed Turn Undead, undead of CR ½ or lower is destroyed.' },
    { level: 10, name: 'Divine Intervention', desc: 'Call on your deity for aid once per long rest. Roll d100 ≤ your cleric level to succeed.' },
  ],
  Paladin: [
    { level: 1, name: 'Divine Sense', desc: 'Action: detect celestials, fiends, undead within 60ft. Uses = 1 + Cha mod / LR.' },
    { level: 1, name: 'Lay on Hands', desc: 'Touch: restore HP from pool of 5×paladin level per LR. 5 HP to cure disease/poison.' },
    { level: 2, name: 'Fighting Style', desc: 'Adopt a particular style of fighting.' },
    { level: 2, name: 'Divine Smite', desc: 'On hit: expend spell slot for 2d8 + 1d8/slot level above 1st radiant damage.' },
    { level: 3, name: 'Sacred Oath', desc: 'Choose your subclass.' },
    { level: 5, name: 'Extra Attack', desc: 'Attack twice when you take the Attack action.' },
    { level: 6, name: 'Aura of Protection', desc: 'You and friendly creatures within 10ft add your Cha modifier (min +1) to saving throws.' },
  ],
  Ranger: [
    { level: 1, name: 'Favored Enemy', desc: 'Advantage on Survival to track and Int checks to recall info about your chosen enemy type.' },
    { level: 1, name: 'Natural Explorer', desc: 'Expertise in one terrain type. No difficult terrain penalty. Double foraging yields.' },
    { level: 2, name: 'Fighting Style', desc: 'Adopt a particular style of fighting.' },
    { level: 3, name: 'Ranger Archetype', desc: 'Choose your subclass.' },
    { level: 5, name: 'Extra Attack', desc: 'Attack twice when you take the Attack action.' },
    { level: 8, name: "Land's Stride", desc: "Moving through nonmagical difficult terrain costs no extra movement. You have advantage on saves against plants that impede movement. Can pass through nonmagical plants without being slowed." },
  ],
  Bard: [
    { level: 1, name: 'Bardic Inspiration', desc: 'Bonus action: give ally a d6 inspiration die to add to one roll. Uses = Cha mod / LR.' },
    { level: 2, name: 'Jack of All Trades', desc: 'Add half proficiency bonus (rounded down) to any non-proficient ability check.' },
    { level: 2, name: 'Song of Rest', desc: 'During short rest, ally expending HD regains extra HP (d6 at level 2).' },
    { level: 3, name: 'Bard College', desc: 'Choose your subclass.' },
    { level: 3, name: 'Expertise', desc: 'Double proficiency bonus on 2 chosen skills.' },
    { level: 5, name: 'Font of Inspiration', desc: 'Regain Bardic Inspiration on short or long rest.' },
    { level: 6, name: 'Countercharm', desc: 'Action: start a performance that grants friendly creatures within 30ft advantage on saves against being frightened or charmed.' },
  ],
  Druid: [
    { level: 1, name: 'Druidic', desc: 'Secret language of druids.' },
    { level: 2, name: 'Wild Shape', desc: "Action: transform into a beast you've seen. CR ≤ ¼ at level 2, CR ≤ ½ at level 4. 2 uses / SR." },
    { level: 2, name: 'Druid Circle', desc: 'Choose your subclass.' },
    { level: 18, name: 'Timeless Body', desc: 'For every 10 years that pass, your body ages only 1 year.' },
    { level: 20, name: 'Beast Spells', desc: 'You can cast druid spells while in Wild Shape form.' },
  ],
  Monk: [
    { level: 1, name: 'Unarmored Defense', desc: 'Without armor, AC = 10 + Dex mod + Wis mod.' },
    { level: 1, name: 'Martial Arts', desc: 'Use Dex for unarmed strikes. Use d4 as unarmed damage (scales with level).' },
    { level: 2, name: 'Ki', desc: 'Ki points = monk level. Recover on short rest.' },
    { level: 2, name: 'Flurry of Blows', desc: '1 Ki: After Attack action, make 2 unarmed strikes as bonus action.' },
    { level: 2, name: 'Patient Defense', desc: '1 Ki: Take Dodge as bonus action.' },
    { level: 2, name: 'Step of the Wind', desc: '1 Ki: Disengage or Dash as bonus action. Jump distance doubled.' },
    { level: 3, name: 'Monastic Tradition', desc: 'Choose your subclass.' },
    { level: 5, name: 'Stunning Strike', desc: '1 Ki: Con save DC 8+Prof+Wis on hit. On fail: stunned until your next turn.' },
  ],
  Sorcerer: [
    { level: 1, name: 'Sorcerous Origin', desc: 'Choose your subclass.' },
    { level: 2, name: 'Font of Magic', desc: 'Sorcery points = sorcerer level. Convert to spell slots or spend on Metamagic.' },
    { level: 3, name: 'Metamagic', desc: 'Choose 2 options to modify spells (Careful, Distant, Empowered, Extended, Heightened, Quickened, Subtle, Twinned).' },
  ],
  Warlock: [
    { level: 1, name: 'Otherworldly Patron', desc: 'Choose your subclass.' },
    { level: 2, name: 'Eldritch Invocations', desc: 'Choose 2 invocations to augment your abilities.' },
    { level: 3, name: 'Pact Boon', desc: 'Pact of the Blade / Chain / Tome.' },
    { level: 5, name: '3rd-level Pact Slots', desc: 'Pact magic slots are now 3rd level.' },
    { level: 10, name: 'Mystic Arcanum', desc: 'Choose a 6th-level spell. Cast it once per long rest without using a spell slot.' },
  ],
}

function getClassFeatures(classId: string, level: number) {
  return (CLASS_FEATURES_DATA[classId] ?? []).filter(f => f.level <= level)
}
