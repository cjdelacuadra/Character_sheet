import { useState } from 'react'
import type { Character } from '@/entities/character/types'
import { SPELL_BY_ID, SPELLS, computeUpcastDice } from '@/shared/data/spellData'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { computeSpellSaveDC, computeSpellAttackBonus, computePreparedSpellCount, SPELL_ATTACK_IDS } from '@/domain/rules'
import styles from './SpellsPanel.module.css'

function fmtMod(n: number) { return n >= 0 ? `+${n}` : String(n) }

const ORDINAL: Record<number, string> = { 0:'Cantrip',1:'1st',2:'2nd',3:'3rd',4:'4th',5:'5th',6:'6th',7:'7th',8:'8th',9:'9th' }

interface Props {
  character: Character
  update: (patch: Partial<Character>) => void
  castingTimeFilter?: string
  onLearnSpell?: (id: string) => void
}

export function SpellsPanel({ character: char, update, castingTimeFilter, onLearnSpell }: Props) {
  const [search, setSearch] = useState('')
  const [expandedSpell, setExpandedSpell] = useState<string | null>(null)
  const [learnOpen, setLearnOpen] = useState(false)
  const [learnSearch, setLearnSearch] = useState('')
  const classDef = CLASS_BY_ID[char.classId]

  if (!classDef?.isSpellcaster) return null

  const spellSaveDC = computeSpellSaveDC(char)
  const spellAtkBonus = computeSpellAttackBonus(char)
  const isPreparedCaster = !!classDef?.prepareSpells
  const isWizard = char.classId === 'Wizard'
  const spellcastingAbility = classDef?.spellcastingAbility
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
    update({
      concentrationSpellId: dropping ? null : spellId,
      conditionIds: dropping
        ? char.conditionIds.filter(c => c.conditionId !== 'concentration')
        : [...char.conditionIds.filter(c => c.conditionId !== 'concentration'), { conditionId: 'concentration' }],
    })
  }

  function toggleExpand(id: string) {
    setExpandedSpell(prev => prev === id ? null : id)
  }

  function togglePrepare(id: string) {
    update({ preparedSpellIds: preparedSet.has(id)
      ? char.preparedSpellIds.filter(x => x !== id)
      : [...char.preparedSpellIds, id] })
  }

  const activeConcentration = char.concentrationSpellId ? SPELL_BY_ID[char.concentrationSpellId] : null

  function SpellExpandContent({ id }: { id: string }) {
    const spell = SPELL_BY_ID[id]
    if (!spell) return null
    const isConc = char.concentrationSpellId === id
    const canConc = spell.concentration && classDef?.spellcastingAbility
    const castable = spell.level === 0
      ? []
      : (Object.entries(char.spellSlots) as [string, { used: number; total: number }][])
          .filter(([lvl, slot]) => Number(lvl) >= spell.level && slot.used < slot.total)
          .sort(([a], [b]) => Number(a) - Number(b))
    const notPrepared = isPreparedCaster && spell.level > 0 && !preparedSet.has(id)

    return (
      <div className={styles.spellExpandArea}>
        <button className={styles.spellExpandClose} onClick={() => setExpandedSpell(null)}>×</button>
        <dl className={styles.spellExpandMeta}>
          <dt>Casting Time</dt><dd>{spell.castingTime}</dd>
          <dt>Range</dt><dd>{spell.range}</dd>
          <dt>Components</dt><dd>{spell.components}</dd>
          <dt>Duration</dt><dd>{spell.concentration ? '⚡ ' : ''}{spell.duration}</dd>
          {spell.saveAbility && (<><dt>Save DC</dt><dd>{spellSaveDC} {spell.saveAbility.toUpperCase()}</dd></>)}
          {SPELL_ATTACK_IDS.has(spell.id) && (<><dt>To Hit</dt><dd>{fmtMod(spellAtkBonus)}</dd></>)}
        </dl>
        <p className={styles.spellExpandDesc}>{spell.description}</p>
        {(spell.id === char.masterySpells?.level1 || spell.id === char.masterySpells?.level2) && (
          <button className={styles.spellExpandCastBtn} onClick={() => setExpandedSpell(null)}>
            Cast (Mastery) — no slot required
          </button>
        )}
        {notPrepared ? (
          <span className={styles.spellDisabledTip}>Not prepared today.</span>
        ) : spell.level === 0 ? (
          <div className={styles.spellExpandActions}>
            <button className={styles.spellExpandCastBtn} onClick={() => setExpandedSpell(null)}>Cast</button>
          </div>
        ) : castable.length > 0 ? (
          <div className={styles.spellExpandActions}>
            {castable.map(([lvl, slot]) => {
              const castLevel = Number(lvl)
              const remaining = slot.total - slot.used
              const diceLabel = spell.scalingDice ? computeUpcastDice(spell.scalingDice, castLevel) : null
              return (
                <button key={lvl} className={styles.spellExpandCastBtn} onClick={() => { useSlot(castLevel); setExpandedSpell(null) }}>
                  {ORDINAL[castLevel] ?? `${lvl}th`}
                  {diceLabel && <span className={styles.spellExpandCastDice}>{diceLabel}</span>}
                  <span style={{ opacity: 0.6, fontSize: 9 }}>{remaining} left</span>
                </button>
              )
            })}
          </div>
        ) : (
          <span className={styles.spellDisabledTip}>No spell slots available.</span>
        )}
        {canConc && (
          <button
            className={styles.spellExpandCastBtn}
            style={{ borderColor: isConc ? 'var(--danger)' : undefined, color: isConc ? 'var(--danger)' : undefined }}
            onClick={() => { setConcentration(spell.id); setExpandedSpell(null) }}
          >
            {isConc ? 'Drop Concentration' : 'Concentrate'}
          </button>
        )}
      </div>
    )
  }

  function SpellRow({ id }: { id: string }) {
    const spell = SPELL_BY_ID[id]
    const isExpanded = expandedSpell === id
    const isConc = char.concentrationSpellId === id

    return (
      <>
        <div
          className={`${styles.spellEntry} ${isConc ? styles.spellConc : ''}`}
          onClick={() => toggleExpand(id)}
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

  // Decide which spells go in which section
  const allKnownIds = char.spellIds.filter(id => {
    const spell = SPELL_BY_ID[id]
    if (!spell) return id.toLowerCase().includes(search.toLowerCase())
    if (castingTimeFilter && !spell.castingTime.toLowerCase().includes(castingTimeFilter.toLowerCase())) return false
    return spell.name.toLowerCase().includes(search.toLowerCase())
  }).sort((a, b) => (SPELL_BY_ID[a]?.level ?? 0) - (SPELL_BY_ID[b]?.level ?? 0))

  const preparedIds = allKnownIds.filter(id => preparedSet.has(id))
  const cantripsAndKnown = allKnownIds.filter(id => !preparedSet.has(id))

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
              <button className={styles.concDrop} onClick={() => update({ concentrationSpellId: null, conditionIds: char.conditionIds.filter(c => c.conditionId !== 'concentration') })}>Drop</button>
            </div>
          )}

          <input
            className={styles.spellSearch}
            type="search"
            placeholder="Search spells…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {isPreparedCaster ? (
            <>
              {/* Section 1: Prepared */}
              <span className={styles.spellSubLabel}>Prepared ({preparedIds.length}{prepareLimit !== null ? `/${prepareLimit}` : ''})</span>
              <div className={styles.spellList}>
                {preparedIds.map(id => <SpellRow key={id} id={id} />)}
                {preparedIds.length === 0 && <div className={styles.emptyNote}>No spells prepared.</div>}
              </div>

              <div className={styles.spellSubDivider} />

              {/* Section 2: Known / Spellbook (not prepared) */}
              <span className={styles.spellSubLabel}>{isWizard ? 'Spellbook' : 'Known'}</span>
              <div className={styles.spellList}>
                {cantripsAndKnown.map(id => <SpellRow key={id} id={id} />)}
                {cantripsAndKnown.length === 0 && <div className={styles.emptyNote}>No other spells known.</div>}
              </div>

              {/* Section 3: Learnable (Wizard + onLearnSpell) */}
              {isWizard && onLearnSpell && (
                <>
                  <div className={styles.spellSubDivider} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className={styles.spellSubLabel}>Learnable</span>
                    <button className={styles.learnBtn} onClick={() => { setLearnOpen(v => !v); setLearnSearch('') }}>
                      {learnOpen ? '− Close' : '+ Learn'}
                    </button>
                  </div>
                  {learnOpen && (() => {
                    const knownIds = new Set(char.spellIds)
                    const learnable = SPELLS.filter(s =>
                      s.classes.includes(char.classId) &&
                      !knownIds.has(s.id) &&
                      s.name.toLowerCase().includes(learnSearch.toLowerCase())
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
                          {learnable.map(s => {
                            const aboveSlotsLevel = s.level > 0 && s.level > maxCastableLevel
                            return (
                              <button
                                key={s.id}
                                className={styles.spellEntry}
                                onClick={() => { onLearnSpell(s.id); setLearnOpen(false) }}
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
                              </button>
                            )
                          })}
                          {learnable.length === 0 && <div className={styles.emptyNote}>No spells found.</div>}
                        </div>
                      </div>
                    )
                  })()}
                </>
              )}
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
                const learnable = SPELLS.filter(s =>
                  s.classes.includes(char.classId) &&
                  !knownIds.has(s.id) &&
                  s.name.toLowerCase().includes(learnSearch.toLowerCase())
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
