import { useState } from 'react'
import type { Character } from '@/entities/character/types'
import { SPELL_BY_ID, SPELLS, computeUpcastDice, endsAtStartOfNextTurn, isBuffConditionSpell } from '@/shared/data/spellData'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { SUBCLASS_BY_ID, LAND_CIRCLE_SPELLS } from '@/shared/data/subclassData'
import { RACE_BY_ID } from '@/shared/data/raceData'
import { computeSpellSaveDC, computeSpellAttackBonus, computePreparedSpellCount, computeSpellDamage, SPELL_ATTACK_IDS } from '@/domain/rules'
import { computeACFull } from '@/shared/data/charCalculations'
import { useAppStore } from '@/app/store'
import type { EconomyType } from '@/app/store/turnSlice'
import { rollDiceExpr } from '@/shared/lib/diceExpr'
import { SpellVisualization } from './SpellVisualization'
import styles from './SpellsPanel.module.css'

function fmtMod(n: number) { return n >= 0 ? `+${n}` : String(n) }

/** Map a spell's casting time to the action-economy slot it consumes (null = doesn't use a turn action). */
function castingTimeToEconomy(castingTime: string): EconomyType | null {
  const ct = castingTime.toLowerCase()
  if (ct.includes('bonus action')) return 'bonus'
  if (ct.includes('reaction')) return 'reaction'
  if (ct.includes('action')) return 'action'
  return null
}

const ORDINAL: Record<number, string> = { 0:'Cantrip',1:'1st',2:'2nd',3:'3rd',4:'4th',5:'5th',6:'6th',7:'7th',8:'8th',9:'9th' }

interface Props {
  character: Character
  update: (patch: Partial<Character>) => void
  castingTimeFilter?: string
  onLearnSpell?: (id: string) => void
  onSummon?: (templateId: string, count?: number, source?: { spellId?: string }) => void
  onConcentrationBroken?: () => void
}

export function SpellsPanel({ character: char, update, castingTimeFilter, onLearnSpell, onSummon, onConcentrationBroken }: Props) {
  const [search, setSearch] = useState('')
  const [schoolFilter, setSchoolFilter] = useState('')
  const [expandedSpell, setExpandedSpell] = useState<string | null>(null)
  const [learnOpen, setLearnOpen] = useState(false)
  const [learnSearch, setLearnSearch] = useState('')
  const [learnShowAllLevels, setLearnShowAllLevels] = useState(false)
  const [selectedSlotLevel, setSelectedSlotLevel] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<null | 'prepared' | 'known' | 'spellbook'>(null)
  const useEconomy = useAppStore(s => s.useEconomy)
  const registerEndOfTurnBuff = useAppStore(s => s.registerEndOfTurnBuff)
  const classDef = CLASS_BY_ID[char.classId]
  const subclassDef = char.subclass ? SUBCLASS_BY_ID[char.subclass] : undefined
  const raceDef = RACE_BY_ID[char.race]
  const isSpellcaster = !!classDef?.isSpellcaster || !!subclassDef?.spellcastingAbility
  const hasSpellSlots = Object.keys(char.spellSlots).length > 0

  // Aggregate racial spells available at the character's current level
  const racialSpellIds: string[] = []
  if (raceDef?.racialSpells) {
    for (const [lvlStr, ids] of Object.entries(raceDef.racialSpells)) {
      if (Number(lvlStr) <= char.level) racialSpellIds.push(...(ids ?? []))
    }
  }
  const hasRacialSpells = racialSpellIds.length > 0

  if (!isSpellcaster && !hasRacialSpells && !hasSpellSlots) return null

  const spellSaveDC = computeSpellSaveDC(char)
  const spellAtkBonus = computeSpellAttackBonus(char)
  const isPreparedCaster = !!classDef?.prepareSpells
  const isWizard = char.classId === 'Wizard'
  const spellcastingAbility = subclassDef?.spellcastingAbility ?? classDef?.spellcastingAbility
  const prepareLimit = isPreparedCaster && spellcastingAbility
    ? computePreparedSpellCount(char.classId, char.level, char.abilityScores[spellcastingAbility])
    : null
  const preparedSet = new Set(char.preparedSpellIds)

  const maxCastableLevel = Math.max(
    0,
    ...Object.entries(char.spellSlots)
      .filter(([, slot]) => (slot as { total: number }).total > 0)
      .map(([lvl]) => Number(lvl))
  )

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

  function setConcentration(spellId: string) {
    const dropping = char.concentrationSpellId === spellId
    // Starting/switching/dropping concentration ends any prior concentration —
    // dismiss summons tied to it.
    onConcentrationBroken?.()
    update({
      concentrationSpellId: dropping ? null : spellId,
      conditionIds: dropping
        ? char.conditionIds.filter(c => c.conditionId !== 'concentration')
        : [...char.conditionIds.filter(c => c.conditionId !== 'concentration'), { conditionId: 'concentration' }],
    })
  }

  // Cast a spell at a given slot level: spend the slot, handle concentration,
  // and create any summon the spell defines.
  function castSpell(spell: typeof SPELLS[number], castLevel: number) {
    if (castLevel > 0) useSlot(castLevel)
    if (spell.concentration) setConcentration(spell.id)
    if (spell.summons) onSummon?.(spell.summons.templateId, spell.summons.count, { spellId: spell.id })
    // Self-effect: temporary HP (e.g. False Life). Temp HP doesn't stack — keep the higher value.
    if (spell.grantsTempHp) {
      const upcast = Math.max(0, castLevel - spell.level) * (spell.tempHpPerUpcast ?? 0)
      const rolled = rollDiceExpr(spell.grantsTempHp) + upcast
      update({ hitPoints: { ...char.hitPoints, temp: Math.max(char.hitPoints.temp, rolled) } })
    }
    // Ongoing buff spells (Bless, Mage Armor, Magic Weapon, Longstrider, …) and short-duration
    // spells (Booming Blade) are tracked in activeBuffSpells so they appear as condition chips and
    // their mechanics (AC / attack riders) apply. Short ones auto-dismiss on Next Turn.
    const shortDuration = endsAtStartOfNextTurn(spell)
    if (isBuffConditionSpell(spell) || shortDuration) {
      const buffs = char.activeBuffSpells ?? []
      if (!buffs.includes(spell.id)) {
        const next = [...buffs, spell.id]
        update({ activeBuffSpells: next, armorClass: computeACFull({ ...char, activeBuffSpells: next }) })
      }
      if (shortDuration) registerEndOfTurnBuff(char.id, spell.id)
    }
    const econ = castingTimeToEconomy(spell.castingTime)
    if (econ) useEconomy(char.id, econ)
    setExpandedSpell(null)
  }

  function toggleExpand(id: string) {
    setExpandedSpell(prev => prev === id ? null : id)
    setSelectedSlotLevel(null)
  }

  function togglePrepare(id: string) {
    update({ preparedSpellIds: preparedSet.has(id)
      ? char.preparedSpellIds.filter(x => x !== id)
      : [...char.preparedSpellIds, id] })
  }

  // ── Drag-and-drop helpers ───────────────────────────────────────────
  function onSpellDragStart(e: React.DragEvent, id: string, from: 'prepared' | 'known' | 'learnable') {
    e.dataTransfer.setData('text/spell-id', id)
    e.dataTransfer.setData('text/from-section', from)
    e.dataTransfer.effectAllowed = 'move'
  }
  function onSectionDragOver(e: React.DragEvent, section: 'prepared' | 'known' | 'spellbook') {
    if (e.dataTransfer.types.includes('text/spell-id')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDragOver(section)
    }
  }
  function onSectionDragLeave() { setDragOver(null) }
  function onSectionDrop(e: React.DragEvent, section: 'prepared' | 'known' | 'spellbook') {
    e.preventDefault()
    setDragOver(null)
    const id = e.dataTransfer.getData('text/spell-id')
    const from = e.dataTransfer.getData('text/from-section')
    if (!id) return
    const spell = SPELL_BY_ID[id]
    if (!spell) return

    if (section === 'prepared') {
      if (from === 'learnable') return // can't prepare without learning first
      if (spell.level === 0) return    // cantrips don't get prepared
      if (preparedSet.has(id)) return  // already prepared
      if (prepareLimit !== null && char.preparedSpellIds.length >= prepareLimit) return
      update({ preparedSpellIds: [...char.preparedSpellIds, id] })
    } else if (section === 'known') {
      // Move prepared spell back to known
      if (preparedSet.has(id)) {
        update({ preparedSpellIds: char.preparedSpellIds.filter(x => x !== id) })
      }
    } else if (section === 'spellbook') {
      // Wizard copy flow: must be from 'learnable'
      if (from !== 'learnable') return
      if (!onLearnSpell) return
      const cost = computeLearnCost(spell)
      if (char.gold < cost) return
      onLearnSpell(id)
      if (cost > 0) update({ gold: char.gold - cost })
    }
  }

  // Wizard spellbook copy cost. PHB: 50gp × spell level (cantrips free).
  // Specialty Wizards get half cost for spells of their school (PHB Savant rule).
  function computeLearnCost(spell: { level: number; school: string }): number {
    if (spell.level === 0) return 0
    const base = 50 * spell.level
    if (!isWizard || !subclassDef) return base
    // Match School of X subclass to spell school (e.g., subclass "Evocation" ⇒ spells with school "Evocation")
    if (subclassDef.label.toLowerCase().includes(spell.school.toLowerCase())) return Math.floor(base / 2)
    return base
  }

  const activeConcentration = char.concentrationSpellId ? SPELL_BY_ID[char.concentrationSpellId] : null

  function SpellExpandContent({ id }: { id: string }) {
    const spell = SPELL_BY_ID[id]
    if (!spell) return null
    const isConc = char.concentrationSpellId === id
    const canConc = spell.concentration && classDef?.spellcastingAbility
    const existingConc = char.concentrationSpellId && char.concentrationSpellId !== id
      ? SPELL_BY_ID[char.concentrationSpellId]
      : null
    const castable = spell.level === 0
      ? []
      : (Object.entries(char.spellSlots) as [string, { used: number; total: number }][])
          .filter(([lvl, slot]) => Number(lvl) >= spell.level && slot.used < slot.total)
          .sort(([a], [b]) => Number(a) - Number(b))
    const notPrepared = isPreparedCaster && spell.level > 0 && !preparedSet.has(id)
    const hasVisualization = !!(spell.aoeShape && spell.damageType) || !!spell.vizCategory

    const defaultSlotLevel = spell.level === 0 ? 0 : (castable[0] ? Number(castable[0][0]) : spell.level)
    const activeSlotLevel = selectedSlotLevel ?? defaultSlotLevel

    const scalingRows = hasVisualization
      ? (spell.level === 0
          ? [{ castLevel: 0, remaining: Infinity, slot: null as null | { used: number; total: number } }]
          : castable.map(([lvl, slot]) => ({
              castLevel: Number(lvl),
              remaining: slot.total - slot.used,
              slot,
            })))
      : []

    const leftCol = (
      <>
        <dl className={styles.spellExpandMeta}>
          <dt>Casting Time</dt><dd>{spell.castingTime}</dd>
          <dt>Range</dt><dd>{spell.range}</dd>
          <dt>Components</dt><dd>{spell.components}</dd>
          <dt>Duration</dt><dd>{spell.concentration ? '⚡ ' : ''}{spell.duration}</dd>
          {spell.saveAbility && (<><dt>Save DC</dt><dd>{spellSaveDC} {spell.saveAbility.toUpperCase()}</dd></>)}
          {SPELL_ATTACK_IDS.has(spell.id) && (<><dt>To Hit</dt><dd>{fmtMod(spellAtkBonus)}</dd></>)}
        </dl>
        <p className={styles.spellExpandDesc}>{spell.description}</p>
        {hasVisualization && scalingRows.length > 0 && (
          <ul className={styles.spellScalingList}>
            {scalingRows.map(({ castLevel, remaining }) => {
              const dmg = computeSpellDamage(spell, castLevel, char)
              const isActive = castLevel === activeSlotLevel
              const dcOrToHit = spell.attackType === 'attack-roll'
                ? fmtMod(spellAtkBonus)
                : spell.saveAbility
                  ? `DC ${spellSaveDC} ${spell.saveAbility.toUpperCase()}`
                  : '—'
              return (
                <li
                  key={castLevel}
                  className={`${styles.spellScalingRow} ${isActive ? styles.spellScalingRowActive : ''}`}
                  onClick={() => setSelectedSlotLevel(castLevel)}
                >
                  <span className={styles.spellScalingSlot}>
                    {castLevel === 0 ? 'Cantrip' : (ORDINAL[castLevel] ?? `${castLevel}th`)}
                  </span>
                  <span className={styles.spellScalingDmg}>
                    {dmg.hitFormula}
                    {dmg.missFormula === 'half' && (
                      <span className={styles.spellScalingMiss}> · save: half</span>
                    )}
                    {dmg.missFormula === '—' && (
                      <span className={styles.spellScalingMiss}> · miss: —</span>
                    )}
                  </span>
                  <span className={styles.spellScalingDc}>{dcOrToHit}</span>
                  <span className={styles.spellScalingLeft}>
                    {castLevel === 0 ? '∞' : `${remaining} left`}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
        {(spell.id === char.masterySpells?.level1 || spell.id === char.masterySpells?.level2) && (
          <button
            className={styles.spellExpandCastBtn}
            onClick={() => {
              const econ = castingTimeToEconomy(spell.castingTime)
              if (econ) useEconomy(char.id, econ)
              setExpandedSpell(null)
            }}
          >
            Cast (Mastery) — no slot required
          </button>
        )}
        {notPrepared ? (
          <span className={styles.spellDisabledTip}>Not prepared today.</span>
        ) : spell.level === 0 ? (
          <div className={styles.spellExpandActions}>
            {spell.concentration && existingConc && (
              <span className={styles.concWarning}>
                ⚠ Will drop concentration on <strong>{existingConc.name}</strong>
              </span>
            )}
            <button className={styles.spellExpandCastBtn} onClick={() => castSpell(spell, 0)}>Cast</button>
          </div>
        ) : castable.length > 0 ? (
          <div className={styles.spellExpandActions}>
            {spell.concentration && existingConc && (
              <span className={styles.concWarning}>
                ⚠ Will drop concentration on <strong>{existingConc.name}</strong>
              </span>
            )}
            <button className={styles.spellExpandCastBtn} onClick={() => castSpell(spell, activeSlotLevel)}>
              Cast — {ORDINAL[activeSlotLevel] ?? `${activeSlotLevel}th`}
              {spell.scalingDice && activeSlotLevel > 0 && (
                <span className={styles.spellExpandCastDice}>
                  {' '}{computeUpcastDice(spell.scalingDice, activeSlotLevel)}
                </span>
              )}
            </button>
          </div>
        ) : (
          <span className={styles.spellDisabledTip}>No spell slots available.</span>
        )}
        {/* Concentration auto-starts on cast (castSpell). Only offer to drop it here. */}
        {canConc && isConc && (
          <button
            className={styles.spellExpandCastBtn}
            style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
            onClick={() => { setConcentration(spell.id); setExpandedSpell(null) }}
          >
            Drop Concentration
          </button>
        )}
        {spell.attackBuff && !spell.concentration && (() => {
          const activeBuffs = char.activeBuffSpells ?? []
          const isBuffActive = activeBuffs.includes(spell.id)
          return (
            <button
              className={styles.spellExpandCastBtn}
              style={{ borderColor: isBuffActive ? 'var(--success)' : undefined, color: isBuffActive ? 'var(--success)' : undefined }}
              onClick={() => {
                update({ activeBuffSpells: isBuffActive ? activeBuffs.filter(x => x !== spell.id) : [...activeBuffs, spell.id] })
                setExpandedSpell(null)
              }}
            >
              {isBuffActive ? 'Deactivate Buff' : 'Mark Active'}
            </button>
          )
        })()}
        {spell.setsBaseAC !== undefined && (() => {
          const activeBuffs = char.activeBuffSpells ?? []
          const isActive = activeBuffs.includes(spell.id)
          return (
            <button
              className={styles.spellExpandCastBtn}
              style={{ borderColor: isActive ? 'var(--success)' : undefined, color: isActive ? 'var(--success)' : undefined }}
              onClick={() => {
                const next = isActive ? activeBuffs.filter(x => x !== spell.id) : [...activeBuffs, spell.id]
                update({ activeBuffSpells: next, armorClass: computeACFull({ ...char, activeBuffSpells: next }) })
                setExpandedSpell(null)
              }}
            >
              {isActive ? 'Dismiss (AC)' : 'Activate (AC)'}
            </button>
          )
        })()}
      </>
    )

    return (
      <div className={styles.spellExpandArea}>
        <button className={styles.spellExpandClose} onClick={() => setExpandedSpell(null)}>×</button>
        {hasVisualization ? (
          <div className={styles.spellExpandTwoCol}>
            <div className={styles.spellExpandLeftCol}>{leftCol}</div>
            <div className={styles.spellExpandRightCol}>
              <SpellVisualization spell={spell} character={char} slotLevel={activeSlotLevel} />
            </div>
          </div>
        ) : (
          leftCol
        )}
      </div>
    )
  }

  function SpellRow({ id, fromSection }: { id: string; fromSection?: 'prepared' | 'known' }) {
    const spell = SPELL_BY_ID[id]
    const isExpanded = expandedSpell === id
    const isConc = char.concentrationSpellId === id
    const draggable = isPreparedCaster && !!spell && spell.level > 0 && (fromSection === 'prepared' || fromSection === 'known')

    return (
      <>
        <div
          className={`${styles.spellEntry} ${isConc ? styles.spellConc : ''}`}
          draggable={draggable}
          onDragStart={draggable && fromSection ? e => onSpellDragStart(e, id, fromSection) : undefined}
          onClick={() => toggleExpand(id)}
        >
          <div className={styles.spellEntryLeft}>
            {spell ? (
              <>
                <span className={`${styles.spellLevelBadge} ${spell.level === 0 ? styles.spellLevelCantrip : ''}`}>
                  {spell.level === 0 ? 'C' : spell.level}
                </span>
                <span className={styles.spellName}>{spell.name}</span>
                {spell.ritual && <span className={styles.ritualBadge} title="Can be cast as a ritual">R</span>}
                <span className={styles.spellSchool}>{spell.school}</span>
              </>
            ) : (
              <span className={styles.spellName}>{id}</span>
            )}
          </div>
          <div className={styles.spellEntryRight}>
            {isPreparedCaster && spell && spell.level > 0 && (
              <button
                className={`${styles.prepareBtn} ${preparedSet.has(id) ? styles.prepareBtnActive : ''}`}
                title={preparedSet.has(id) ? 'Unprepare' : 'Prepare'}
                disabled={!preparedSet.has(id) && prepareLimit !== null && char.preparedSpellIds.length >= prepareLimit}
                onClick={e => { e.stopPropagation(); togglePrepare(id) }}
              >
                {preparedSet.has(id) ? '✓' : '○'}
              </button>
            )}
            {spell?.concentration && (
              <span className={styles.spellConcBadge} title="Requires concentration">C</span>
            )}
          </div>
        </div>
        {isExpanded && <SpellExpandContent id={id} />}
      </>
    )
  }

  // Subclass-granted spells (e.g., Cleric domain spells, Artificer subclass spells)
  // — always known/prepared, don't count against the prepared cap.
  const subclassGrantedIds: string[] = []
  if (subclassDef?.subclassSpells) {
    for (const [lvlStr, ids] of Object.entries(subclassDef.subclassSpells)) {
      if (Number(lvlStr) <= char.level) subclassGrantedIds.push(...(ids ?? []))
    }
  }
  // Circle of the Land Druid: terrain-keyed circle spells (PHB).
  if (char.subclass === 'CircleOfTheLand' && char.circleOfLandTerrain) {
    const terrainTable = LAND_CIRCLE_SPELLS[char.circleOfLandTerrain]
    for (const [lvlStr, ids] of Object.entries(terrainTable)) {
      if (Number(lvlStr) <= char.level) subclassGrantedIds.push(...(ids ?? []))
    }
  }
  const subclassGrantedSet = new Set(subclassGrantedIds)

  // Decide which spells go in which section
  function matchesFilters(spell: { name: string; castingTime: string; school: string }): boolean {
    if (castingTimeFilter && !spell.castingTime.toLowerCase().includes(castingTimeFilter.toLowerCase())) return false
    if (schoolFilter && spell.school !== schoolFilter) return false
    return spell.name.toLowerCase().includes(search.toLowerCase())
  }

  function spellSort(a: string, b: string): number {
    const la = SPELL_BY_ID[a]?.level ?? 0, lb = SPELL_BY_ID[b]?.level ?? 0
    if (la !== lb) return la - lb
    return (SPELL_BY_ID[a]?.name ?? a).localeCompare(SPELL_BY_ID[b]?.name ?? b)
  }

  const allKnownIds = char.spellIds.filter(id => {
    const spell = SPELL_BY_ID[id]
    if (!spell) return id.toLowerCase().includes(search.toLowerCase())
    return matchesFilters(spell)
  }).sort(spellSort)

  // Subclass spells filtered the same way and only those that exist in the catalog
  const subclassDisplayIds = subclassGrantedIds
    .filter(id => SPELL_BY_ID[id])
    .filter(id => matchesFilters(SPELL_BY_ID[id]!))
    .sort(spellSort)

  const preparedIds = allKnownIds.filter(id => preparedSet.has(id))
  const cantripsAndKnown = allKnownIds.filter(id => !preparedSet.has(id) && !subclassGrantedSet.has(id))

  return (
    <>
      {/* Spell Slots */}
      {Object.keys(char.spellSlots).length > 0 && (
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

      {/* Racial Spells */}
      {hasRacialSpells && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionLabel}>Racial Spells</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>1/long rest each</span>
          </div>
          <div className={styles.spellList}>
            {racialSpellIds.map(id => {
              const spell = SPELL_BY_ID[id]
              if (!spell) return null
              const isCantrip = spell.level === 0
              const resourceKey = `Racial:${spell.id}`
              const used = char.resources[resourceKey]?.used ?? 0
              const isExpanded = expandedSpell === id
              return (
                <div key={id}>
                  <div className={styles.spellEntry} onClick={() => toggleExpand(id)}>
                    <div className={styles.spellEntryLeft}>
                      <span className={`${styles.spellLevelBadge} ${isCantrip ? styles.spellLevelCantrip : ''}`}>
                        {isCantrip ? 'C' : spell.level}
                      </span>
                      <span className={styles.spellName}>{spell.name}</span>
                      <span className={styles.spellSchool}>{spell.school}</span>
                    </div>
                    <div className={styles.spellEntryRight}>
                      {!isCantrip && (
                        <button
                          className={`${styles.slotPip} ${used < 1 ? styles.pipFull : styles.pipEmpty}`}
                          title={used < 1 ? 'Use (1/long rest)' : 'Recover on long rest'}
                          onClick={e => {
                            e.stopPropagation()
                            update({ resources: { ...char.resources, [resourceKey]: { used: used < 1 ? 1 : 0, total: 1 } } })
                          }}
                        />
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className={styles.spellExpandArea}>
                      <button className={styles.spellExpandClose} onClick={() => setExpandedSpell(null)}>×</button>
                      <dl className={styles.spellExpandMeta}>
                        <dt>Casting Time</dt><dd>{spell.castingTime}</dd>
                        <dt>Range</dt><dd>{spell.range}</dd>
                        <dt>Components</dt><dd>{spell.components}</dd>
                        <dt>Duration</dt><dd>{spell.concentration ? '⚡ ' : ''}{spell.duration}</dd>
                      </dl>
                      <p className={styles.spellExpandDesc}>{spell.description}</p>
                      {!isCantrip && (
                        <div className={styles.spellExpandActions}>
                          <button
                            className={styles.spellExpandCastBtn}
                            style={{ borderColor: used < 1 ? undefined : 'var(--danger)', color: used < 1 ? undefined : 'var(--danger)' }}
                            onClick={() => {
                              if (used < 1) {
                                const econ = castingTimeToEconomy(spell.castingTime)
                                if (econ) useEconomy(char.id, econ)
                              }
                              update({ resources: { ...char.resources, [resourceKey]: { used: used < 1 ? 1 : 0, total: 1 } } })
                              setExpandedSpell(null)
                            }}
                          >
                            {used < 1 ? 'Cast (1/long rest)' : 'Already used · click to recover'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Spells section */}
      {(char.spellIds.length > 0 || onLearnSpell) && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionLabel}>
              Spells{castingTimeFilter ? ` (${castingTimeFilter})` : ''}
            </span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {isPreparedCaster && prepareLimit !== null && (
                <span className={styles.preparedCount}>{char.preparedSpellIds.length}/{prepareLimit} prepared</span>
              )}
              <span className={styles.spellStats}>DC {spellSaveDC} · {fmtMod(spellAtkBonus)} atk</span>
            </div>
          </div>

          {activeConcentration && (
            <div className={styles.concentrationBanner}>
              <span className={styles.concLabel}>Concentrating: <strong>{activeConcentration.name}</strong></span>
              <button className={styles.concDrop} onClick={() => { onConcentrationBroken?.(); update({ concentrationSpellId: null, conditionIds: char.conditionIds.filter(c => c.conditionId !== 'concentration') }) }}>Drop</button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 4 }}>
            <input
              className={styles.spellSearch}
              style={{ flex: 1 }}
              type="search"
              placeholder="Search spells…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              className={styles.spellSearch}
              style={{ width: 'auto', flex: 'none' }}
              value={schoolFilter}
              onChange={e => setSchoolFilter(e.target.value)}
            >
              <option value="">All schools</option>
              {['Abjuration','Conjuration','Divination','Enchantment','Evocation','Illusion','Necromancy','Transmutation'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {isPreparedCaster ? (
            <>
              {/* Section 1: Prepared — drop target */}
              <span className={styles.spellSubLabel}>Prepared ({preparedIds.length}{prepareLimit !== null ? `/${prepareLimit}` : ''})</span>
              <div
                className={`${styles.spellList} ${dragOver === 'prepared' ? styles.spellListDropActive : ''}`}
                onDragOver={e => onSectionDragOver(e, 'prepared')}
                onDragLeave={onSectionDragLeave}
                onDrop={e => onSectionDrop(e, 'prepared')}
              >
                {preparedIds.map(id => <SpellRow key={id} id={id} fromSection="prepared" />)}
                {preparedIds.length === 0 && <div className={styles.emptyNote}>No spells prepared — tap ○ on a spell below, or drag it here.</div>}
              </div>

              {subclassDisplayIds.length > 0 && (
                <>
                  <div className={styles.spellSubDivider} />
                  <span className={styles.spellSubLabel}>
                    Subclass Spells ({subclassDisplayIds.length}) <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 11 }}>· always prepared</span>
                  </span>
                  <div className={styles.spellList}>
                    {subclassDisplayIds.map(id => <SpellRow key={id} id={id} />)}
                  </div>
                </>
              )}

              <div className={styles.spellSubDivider} />

              {/* Section 2: Known / Spellbook (not prepared) — drop target */}
              <span className={styles.spellSubLabel}>
                {isWizard ? 'Spellbook' : 'Known'} ({cantripsAndKnown.length})
              </span>
              <div
                className={`${styles.spellList} ${dragOver === 'spellbook' || dragOver === 'known' ? styles.spellListDropActive : ''}`}
                onDragOver={e => onSectionDragOver(e, isWizard ? 'spellbook' : 'known')}
                onDragLeave={onSectionDragLeave}
                onDrop={e => onSectionDrop(e, isWizard ? 'spellbook' : 'known')}
              >
                {cantripsAndKnown.map(id => <SpellRow key={id} id={id} fromSection="known" />)}
                {cantripsAndKnown.length === 0 && <div className={styles.emptyNote}>No other spells known.</div>}
              </div>

              {/* Section 3: Learnable (Wizard + onLearnSpell) */}
              {isWizard && onLearnSpell && (() => {
                const knownIds = new Set(char.spellIds)
                const allLearnable = SPELLS.filter(s =>
                  s.classes.includes(char.classId) &&
                  !knownIds.has(s.id)
                )
                const learnable = allLearnable
                  .filter(s => learnShowAllLevels || s.level === 0 || s.level <= maxCastableLevel)
                  .filter(s => s.name.toLowerCase().includes(learnSearch.toLowerCase()))
                  .filter(s => !schoolFilter || s.school === schoolFilter)
                  .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
                const totalLearnableCount = allLearnable.length
                return (
                  <>
                    <div className={styles.spellSubDivider} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className={styles.spellSubLabel}>
                        Learnable ({totalLearnableCount})
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 11, marginLeft: 8 }}>· {char.gold} gp owned</span>
                      </span>
                      <button className={styles.learnBtn} onClick={() => { setLearnOpen(v => !v); setLearnSearch('') }}>
                        {learnOpen ? '− Hide' : '+ Browse'}
                      </button>
                    </div>
                    {learnOpen && (
                      <div className={styles.learnPicker}>
                        <input
                          className={styles.spellSearch}
                          type="search"
                          placeholder="Search spells to learn…"
                          value={learnSearch}
                          onChange={e => setLearnSearch(e.target.value)}
                        />
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', padding: '4px 2px' }}>
                          <input
                            type="checkbox"
                            checked={learnShowAllLevels}
                            onChange={e => setLearnShowAllLevels(e.target.checked)}
                          />
                          Show higher-level spells (spellbook-only, can't cast yet)
                        </label>
                        <div className={styles.spellList}>
                          {learnable.map(s => {
                            const aboveSlotsLevel = s.level > 0 && s.level > maxCastableLevel
                            const cost = computeLearnCost(s)
                            const baseCost = s.level === 0 ? 0 : 50 * s.level
                            const discounted = cost > 0 && cost < baseCost
                            const canAfford = char.gold >= cost
                            return (
                              <button
                                key={s.id}
                                className={styles.spellEntry}
                                draggable={canAfford}
                                onDragStart={canAfford ? e => onSpellDragStart(e, s.id, 'learnable') : undefined}
                                disabled={!canAfford}
                                title={canAfford ? `Drag to Spellbook to copy (costs ${cost} gp)` : `Need ${cost} gp to copy this spell`}
                                onClick={() => {
                                  if (!canAfford) return
                                  onLearnSpell(s.id)
                                  if (cost > 0) update({ gold: char.gold - cost })
                                }}
                              >
                                <div className={styles.spellEntryLeft}>
                                  <span className={`${styles.spellLevelBadge} ${s.level === 0 ? styles.spellLevelCantrip : ''}`}>
                                    {s.level === 0 ? 'C' : s.level}
                                  </span>
                                  <span className={styles.spellName}>{s.name}</span>
                                  <span className={styles.spellSchool}>{s.school}</span>
                                  {aboveSlotsLevel && (
                                    <span className={styles.spellAboveLevelNote} title={`You can copy this spell, but need a level ${s.level} slot to cast it`}>
                                      can't cast yet
                                    </span>
                                  )}
                                </div>
                                <span style={{ fontSize: 11, color: canAfford ? (discounted ? 'var(--success)' : 'var(--text-muted)') : 'var(--danger)' }}>
                                  {s.level === 0 ? 'free' : `${cost} gp${discounted ? ' (½ school)' : ''}`}
                                </span>
                              </button>
                            )
                          })}
                          {learnable.length === 0 && <div className={styles.emptyNote}>No spells found.</div>}
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </>
          ) : (
            // Spontaneous casters: single list
            <>
              {onLearnSpell && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className={styles.learnBtn} onClick={() => { setLearnOpen(v => !v); setLearnSearch('') }}>
                    {learnOpen ? '− Close' : '+ Learn'}
                  </button>
                </div>
              )}
              {learnOpen && onLearnSpell && (() => {
                const knownIds = new Set(char.spellIds)
                const spellListClass = subclassDef?.spellListClassId ?? char.classId
                const learnable = SPELLS.filter(s =>
                  s.classes.includes(spellListClass) &&
                  !knownIds.has(s.id) &&
                  s.name.toLowerCase().includes(learnSearch.toLowerCase()) &&
                  (!schoolFilter || s.school === schoolFilter)
                ).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
                return (
                  <div className={styles.learnPicker}>
                    <input
                      className={styles.spellSearch}
                      type="search"
                      placeholder="Search spells to learn…"
                      value={learnSearch}
                      onChange={e => setLearnSearch(e.target.value)}
                      autoFocus
                    />
                    <div className={styles.spellList}>
                      {learnable.map(s => (
                        <button key={s.id} className={styles.spellEntry}
                          onClick={() => { onLearnSpell(s.id); setLearnOpen(false) }}>
                          <div className={styles.spellEntryLeft}>
                            <span className={`${styles.spellLevelBadge} ${s.level === 0 ? styles.spellLevelCantrip : ''}`}>
                              {s.level === 0 ? 'C' : s.level}
                            </span>
                            <span className={styles.spellName}>{s.name}</span>
                            <span className={styles.spellSchool}>{s.school}</span>
                          </div>
                        </button>
                      ))}
                      {learnable.length === 0 && <div className={styles.emptyNote}>No spells found.</div>}
                    </div>
                  </div>
                )
              })()}
              <div className={styles.spellList}>
                {allKnownIds.map(id => <SpellRow key={id} id={id} />)}
              </div>
            </>
          )}
        </section>
      )}
    </>
  )
}
