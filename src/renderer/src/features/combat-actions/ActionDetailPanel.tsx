import { useState } from 'react'
import type { Character, Weapon } from '@/entities/character/types'
import { WEAPONS, type WeaponDef } from '@/shared/data/weaponData'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { computeAttackBonus, computeSpellAttackBonus, isProficientWithWeapon, getAvailableActions, getSpecialAttacks, getWeaponSpecialAttacks, SPELL_ATTACK_IDS } from '@/domain/rules'
import { mod } from '@/shared/data/charCalculations'
import { SPELL_BY_ID } from '@/shared/data/spellData'
import { DiceIcon, parseDieType } from '@/shared/components/DiceIcon'
import { FEATS } from '@/shared/data/featsData'
import { FIGHTING_STYLES, FIGHTING_STYLE_BY_ID } from '@/shared/data/fightingStylesData'
import { ARCANE_TRADITIONS, ARCANE_TRADITION_BY_ID } from '@/shared/data/arcaneTraditonsData'
import { ResourcesPanel } from '@/features/resources/ResourcesPanel'
import { SpellsPanel } from '@/features/spells/SpellsPanel'
import type { FeatureEntry } from '@/shared/data/classFeaturesData'
import styles from './ActionDetailPanel.module.css'

const CAST_SPELL_NAMES = new Set(['Cast a Spell', 'Cast a Spell (Bonus)', 'Cast a Spell (Reaction)'])

function fmtMod(n: number) { return n >= 0 ? `+${n}` : String(n) }

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
  const [pendingTradition, setPendingTradition] = useState<string | null>(null)

  const availableActions = getAvailableActions(char)
  const selectedActionDef = selectedAction ? availableActions.find(a => a.name === selectedAction) : null
  const specialAttacks = getSpecialAttacks(char)
  const attackSpells = char.spellIds.filter(id => SPELL_ATTACK_IDS.has(id))

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
      bonusDamageDie: w.bonusDamageDie,
      bonusDamageType: w.bonusDamageType,
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

    const isArcaneTradition = selectedFeature.name === 'Arcane Tradition'
    if (isArcaneTradition) {
      const chosen = char.subclass ? ARCANE_TRADITION_BY_ID[char.subclass] : null
      const isLocked = char.subclassLocked ?? false
      return (
        <>
          <ResourcesPanel character={char} update={update} />
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>Arcane Tradition</span>
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
                  Tradition locked — this choice is permanent.
                </p>
              </>
            ) : (
              <>
                {!chosen && !pendingTradition && (
                  <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>Choose your arcane tradition:</p>
                )}
                <div className={styles.fightingStyleList}>
                  {ARCANE_TRADITIONS.map(t => (
                    <button
                      key={t.id}
                      className={`${styles.fightingStyleOption} ${(pendingTradition ?? char.subclass) === t.id ? styles.fightingStyleOptionActive : ''}`}
                      onClick={() => setPendingTradition(t.id)}
                    >
                      <span className={styles.fightingStyleName}>{t.name}</span>
                      <span className={styles.fightingStyleDesc}>{t.description}</span>
                    </button>
                  ))}
                </div>
                {(pendingTradition || char.subclass) && (
                  <button
                    className={styles.armoryAddBtn}
                    style={{ marginTop: 8 }}
                    onClick={() => {
                      update({ subclass: pendingTradition ?? char.subclass ?? undefined, subclassLocked: true })
                      setPendingTradition(null)
                    }}
                  >
                    Confirm Tradition
                  </button>
                )}
              </>
            )}
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
            onLearnSpell={char.classId === 'Wizard' ? (id) => update({ spellIds: [...new Set([...char.spellIds, id])] }) : undefined}
          />
        </div>
      </>
    )
  }

  // ATTACK — show description + weapons table + attack breakdown
  if (selectedAction === 'Attack') {
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

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionLabel}>Weapons</span>
            <button className={styles.addBtn} onClick={() => setArmoryOpen(true)}>+ Add</button>
          </div>
          <table className={styles.weaponTable}>
            <thead>
              <tr>
                <th className={styles.wthName}>Name</th>
                <th className={styles.wthAtk}>Atk</th>
                <th className={styles.wthDmg}>Damage</th>
                <th className={styles.wthType}>Type</th>
                <th className={styles.wthRange}>Range</th>
                <th className={styles.wthDel} />
              </tr>
            </thead>
            <tbody>
              {char.weapons.map(w => {
                const computed = computeAttackBonus(char, w)
                const proficient = isProficientWithWeapon(char, w)
                const rangeLabel = w.rangeType === 'Melee' ? 'Melee' : w.rangeType === 'Ranged' ? 'Ranged' : w.rangeType === 'Melee or Ranged' ? 'M/R' : '—'
                return (
                  <tr key={w.id} className={styles.weaponRow}>
                    <td className={styles.weaponName}>{w.name}</td>
                    <td className={styles.weaponAtk} style={proficient ? undefined : { opacity: 0.5 }}>
                      {fmtMod(computed)}
                      {!proficient && <span title="Not proficient"> ⚠</span>}
                    </td>
                    <td className={styles.weaponDmg}>
                      {(w.enchantmentBonus ?? 0) > 0 && <span className={styles.enchantBadge}>+{w.enchantmentBonus}</span>}
                      {w.damage}
                    </td>
                    <td className={styles.weaponDmg}>{w.damageType ?? '—'}</td>
                    <td className={styles.weaponDmg}>{rangeLabel}</td>
                    <td><button className={styles.weaponDel} onClick={() => removeWeapon(w.id)}>×</button></td>
                  </tr>
                )
              })}
              {char.weapons.length === 0 && (
                <tr><td colSpan={6} className={styles.weaponEmpty}>No weapons — click + Add</td></tr>
              )}
            </tbody>
          </table>
        </section>

        {char.weapons.length > 0 && (
          <div className={styles.attackDetailWeapons}>
            {char.weapons.map(w => {
              const atk = computeAttackBonus(char, w)
              const strMod = mod(char.abilityScores.str)
              const dexMod = mod(char.abilityScores.dex)
              const isFinesse = (w.properties ?? []).some(p => p.toLowerCase() === 'finesse')
              const dmgMod = isFinesse ? Math.max(strMod, dexMod) : w.rangeType === 'Ranged' ? dexMod : strMod
              const enchBonus = w.enchantmentBonus ?? 0
              const isTwoHanded = (w.properties ?? []).some(p => p.toLowerCase() === 'two-handed')
              const isWeaponMelee = w.rangeType !== 'Ranged'
              const duelingBonus = char.fightingStyle === 'dueling' && isWeaponMelee && !isTwoHanded ? 2 : 0
              const totalDmgMod = dmgMod + enchBonus + duelingBonus
              const dmgExpr = w.damage && w.damage !== '—'
                ? totalDmgMod >= 0 ? `${w.damage}+${totalDmgMod}` : `${w.damage}${totalDmgMod}`
                : w.damage ?? '—'
              const wAtks = getWeaponSpecialAttacks(char, w)
              return (
                <div key={w.id} className={styles.attackDetailCard}>
                  <div className={styles.attackDetailCardName}>{w.name}</div>
                  <div className={styles.attackDetailCardStats}>
                    <span className={styles.attackDetailStat}><span className={styles.attackDetailStatLbl}>Hit</span> {fmtMod(atk)}</span>
                    <span className={styles.attackDetailStat}><span className={styles.attackDetailStatLbl}>Dmg</span> {parseDieType(w.damage ?? '') && <DiceIcon die={parseDieType(w.damage ?? '')!} size={14} />} {dmgExpr} {w.damageType ?? ''}</span>
                    {w.bonusDamageDie && <span className={styles.attackDetailStat}><span className={styles.attackDetailStatLbl}>+</span>{w.bonusDamageDie} {w.bonusDamageType ?? ''}</span>}
                    <span className={styles.attackDetailStat}><span className={styles.attackDetailStatLbl}>Range</span> {w.rangeType ?? 'Melee'}</span>
                  </div>
                  {wAtks.length > 0 && (
                    <div className={styles.weaponSpecialList}>
                      {wAtks.map(sa => (
                        <div key={sa.name} className={styles.weaponSpecialRow}>
                          <span className={styles.weaponSpecialName}>{sa.name}</span>
                          {sa.dice && <span className={styles.weaponSpecialDice}>{sa.dice}</span>}
                          <span className={styles.weaponSpecialNote}>{sa.note}</span>
                        </div>
                      ))}
                    </div>
                  )}
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
            {attackSpells.length > 0 && (
              <div className={styles.specialAttackList}>
                <span className={styles.sectionLabel}>Spell Attacks</span>
                {attackSpells.map(id => {
                  const spell = SPELL_BY_ID[id]
                  return (
                    <button key={id} className={styles.specialAttackRow} onClick={() => setSpellDetailId(id)}>
                      <span className={styles.specialAttackName}>{spell?.name ?? id}</span>
                      {spell && <span className={styles.specialAttackNote}>{spell.school} · {fmtMod(computeSpellAttackBonus(char))} to hit</span>}
                    </button>
                  )
                })}
              </div>
            )}
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
      </>
    )
  }

  // ARCANE RECOVERY — slot picker
  if (selectedAction === 'Arcane Recovery') {
    return renderArcaneRecovery(selectedActionDef.full)
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

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionLabel}>Melee Weapons</span>
          </div>
          <table className={styles.weaponTable}>
            <thead>
              <tr>
                <th className={styles.wthName}>Name</th>
                <th className={styles.wthAtk}>Atk</th>
                <th className={styles.wthDmg}>Damage</th>
                <th className={styles.wthType}>Type</th>
                <th className={styles.wthRange}>Range</th>
                <th className={styles.wthDel} />
              </tr>
            </thead>
            <tbody>
              {meleeWeapons.map(w => {
                const computed = computeAttackBonus(char, w)
                const proficient = isProficientWithWeapon(char, w)
                return (
                  <tr key={w.id} className={styles.weaponRow}>
                    <td className={styles.weaponName}>{w.name}</td>
                    <td className={styles.weaponAtk} style={proficient ? undefined : { opacity: 0.5 }}>
                      {fmtMod(computed)}
                      {!proficient && <span title="Not proficient"> ⚠</span>}
                    </td>
                    <td className={styles.weaponDmg}>
                      {(w.enchantmentBonus ?? 0) > 0 && <span className={styles.enchantBadge}>+{w.enchantmentBonus}</span>}
                      {w.damage}
                    </td>
                    <td className={styles.weaponDmg}>{w.damageType ?? '—'}</td>
                    <td className={styles.weaponDmg}>Melee</td>
                    <td />
                  </tr>
                )
              })}
              {meleeWeapons.length === 0 && (
                <tr><td colSpan={6} className={styles.weaponEmpty}>No melee weapons equipped.</td></tr>
              )}
            </tbody>
          </table>
        </section>

        {meleeWeapons.length > 0 && (
          <div className={styles.attackDetailWeapons}>
            {meleeWeapons.map(w => {
              const atk = computeAttackBonus(char, w)
              const strMod = mod(char.abilityScores.str)
              const dexMod = mod(char.abilityScores.dex)
              const isFinesse = (w.properties ?? []).some(p => p.toLowerCase() === 'finesse')
              const dmgMod = isFinesse ? Math.max(strMod, dexMod) : strMod
              const enchBonus = w.enchantmentBonus ?? 0
              const isTwoHanded = (w.properties ?? []).some(p => p.toLowerCase() === 'two-handed')
              const duelingBonus = char.fightingStyle === 'dueling' && !isTwoHanded ? 2 : 0
              const totalDmgMod = dmgMod + enchBonus + duelingBonus
              const dmgExpr = w.damage && w.damage !== '—'
                ? totalDmgMod === 0 ? w.damage
                  : totalDmgMod > 0 ? `${w.damage}+${totalDmgMod}` : `${w.damage}${totalDmgMod}`
                : w.damage ?? '—'
              const wAtks = getWeaponSpecialAttacks(char, w)
              return (
                <div key={w.id} className={styles.attackDetailCard}>
                  <div className={styles.attackDetailCardName}>{w.name}</div>
                  <div className={styles.attackDetailCardStats}>
                    <span className={styles.attackDetailStat}><span className={styles.attackDetailStatLbl}>Hit</span> {fmtMod(atk)}</span>
                    <span className={styles.attackDetailStat}><span className={styles.attackDetailStatLbl}>Dmg</span> {parseDieType(w.damage ?? '') && <DiceIcon die={parseDieType(w.damage ?? '')!} size={14} />} {dmgExpr} {w.damageType ?? ''}</span>
                    {w.bonusDamageDie && <span className={styles.attackDetailStat}><span className={styles.attackDetailStatLbl}>+</span>{w.bonusDamageDie} {w.bonusDamageType ?? ''}</span>}
                    <span className={styles.attackDetailStat}><span className={styles.attackDetailStatLbl}>Range</span> Melee</span>
                  </div>
                  {wAtks.length > 0 && (
                    <div className={styles.weaponSpecialList}>
                      {wAtks.map(sa => (
                        <div key={sa.name} className={styles.weaponSpecialRow}>
                          <span className={styles.weaponSpecialName}>{sa.name}</span>
                          {sa.dice && <span className={styles.weaponSpecialDice}>{sa.dice}</span>}
                          <span className={styles.weaponSpecialNote}>{sa.note}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
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

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionLabel}>Light Melee Weapons</span>
          </div>
          <table className={styles.weaponTable}>
            <thead>
              <tr>
                <th className={styles.wthName}>Name</th>
                <th className={styles.wthAtk}>Atk</th>
                <th className={styles.wthDmg}>Damage</th>
                <th className={styles.wthType}>Type</th>
                <th className={styles.wthDel} />
              </tr>
            </thead>
            <tbody>
              {offHandWeapons.map(w => {
                const computed = computeAttackBonus(char, w)
                const proficient = isProficientWithWeapon(char, w)
                const isFinesse = (w.properties ?? []).some(p => p.toLowerCase() === 'finesse')
                const abilityMod = isFinesse ? Math.max(strMod, dexMod) : strMod
                const abilityModForOffhand = hasTWF ? abilityMod : Math.min(0, abilityMod)
                const enchBonus = w.enchantmentBonus ?? 0
                const totalDmgMod = abilityModForOffhand + enchBonus
                const dmgExpr = w.damage && w.damage !== '—'
                  ? totalDmgMod === 0 ? w.damage
                    : totalDmgMod > 0 ? `${w.damage}+${totalDmgMod}` : `${w.damage}${totalDmgMod}`
                  : w.damage ?? '—'
                return (
                  <tr key={w.id} className={styles.weaponRow}>
                    <td className={styles.weaponName}>{w.name}</td>
                    <td className={styles.weaponAtk} style={proficient ? undefined : { opacity: 0.5 }}>
                      {fmtMod(computed)}
                      {!proficient && <span title="Not proficient"> ⚠</span>}
                    </td>
                    <td className={styles.weaponDmg}>
                      {(w.enchantmentBonus ?? 0) > 0 && <span className={styles.enchantBadge}>+{w.enchantmentBonus}</span>}
                      {dmgExpr}
                    </td>
                    <td className={styles.weaponDmg}>{w.damageType ?? '—'}</td>
                    <td />
                  </tr>
                )
              })}
              {offHandWeapons.length === 0 && (
                <tr><td colSpan={5} className={styles.weaponEmpty}>No light melee weapons equipped.</td></tr>
              )}
            </tbody>
          </table>
        </section>

        {offHandWeapons.length > 0 && (
          <div className={styles.attackDetailWeapons}>
            {offHandWeapons.map(w => {
              const atk = computeAttackBonus(char, w)
              const isFinesse = (w.properties ?? []).some(p => p.toLowerCase() === 'finesse')
              const abilityMod = isFinesse ? Math.max(strMod, dexMod) : strMod
              const abilityModForOffhand = hasTWF ? abilityMod : Math.min(0, abilityMod)
              const enchBonus = w.enchantmentBonus ?? 0
              const totalDmgMod = abilityModForOffhand + enchBonus
              const dmgExpr = w.damage && w.damage !== '—'
                ? totalDmgMod === 0 ? w.damage
                  : totalDmgMod > 0 ? `${w.damage}+${totalDmgMod}` : `${w.damage}${totalDmgMod}`
                : w.damage ?? '—'
              const wAtks = getWeaponSpecialAttacks(char, w)
              return (
                <div key={w.id} className={styles.attackDetailCard}>
                  <div className={styles.attackDetailCardName}>{w.name}</div>
                  <div className={styles.attackDetailCardStats}>
                    <span className={styles.attackDetailStat}><span className={styles.attackDetailStatLbl}>Hit</span> {fmtMod(atk)}</span>
                    <span className={styles.attackDetailStat}><span className={styles.attackDetailStatLbl}>Dmg</span> {parseDieType(w.damage ?? '') && <DiceIcon die={parseDieType(w.damage ?? '')!} size={14} />} {dmgExpr} {w.damageType ?? ''}</span>
                    <span className={styles.attackDetailStat}><span className={styles.attackDetailStatLbl}>Range</span> Melee</span>
                  </div>
                  {wAtks.length > 0 && (
                    <div className={styles.weaponSpecialList}>
                      {wAtks.map(sa => (
                        <div key={sa.name} className={styles.weaponSpecialRow}>
                          <span className={styles.weaponSpecialName}>{sa.name}</span>
                          {sa.dice && <span className={styles.weaponSpecialDice}>{sa.dice}</span>}
                          <span className={styles.weaponSpecialNote}>{sa.note}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </>
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
