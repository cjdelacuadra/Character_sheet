import { useState } from 'react'
import type { Character } from '@/entities/character/types'
import { SPELL_BY_ID } from '@/shared/data/spellData'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { computeSpellSaveDC, computeSpellAttackBonus } from '@/domain/rules'
import styles from './SpellsPanel.module.css'

function fmtMod(n: number) { return n >= 0 ? `+${n}` : String(n) }

const ORDINAL: Record<number, string> = { 1:'1st',2:'2nd',3:'3rd',4:'4th',5:'5th',6:'6th',7:'7th',8:'8th',9:'9th' }

interface Props {
  character: Character
  update: (patch: Partial<Character>) => void
}

export function SpellsPanel({ character: char, update }: Props) {
  const [search, setSearch] = useState('')
  const [spellModal, setSpellModal] = useState<string | null>(null)
  const classDef = CLASS_BY_ID[char.classId]

  if (!classDef?.isSpellcaster) return null

  const spellSaveDC = computeSpellSaveDC(char)
  const spellAtkBonus = computeSpellAttackBonus(char)

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
    update({ concentrationSpellId: char.concentrationSpellId === spellId ? null : spellId })
  }

  const activeConcentration = char.concentrationSpellId ? SPELL_BY_ID[char.concentrationSpellId] : null

  const filteredSpells = char.spellIds
    .filter(id => {
      const spell = SPELL_BY_ID[id]
      return (spell?.name ?? id).toLowerCase().includes(search.toLowerCase())
    })
    .sort((a, b) => (SPELL_BY_ID[a]?.level ?? 0) - (SPELL_BY_ID[b]?.level ?? 0))

  const modalSpell = spellModal ? SPELL_BY_ID[spellModal] : null

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

      {/* Known Spells */}
      {char.spellIds.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionLabel}>Spells Known</span>
            <span className={styles.spellStats}>DC {spellSaveDC} · {fmtMod(spellAtkBonus)} atk</span>
          </div>

          {activeConcentration && (
            <div className={styles.concentrationBanner}>
              <span className={styles.concLabel}>Concentrating: <strong>{activeConcentration.name}</strong></span>
              <button className={styles.concDrop} onClick={() => update({ concentrationSpellId: null })}>Drop</button>
            </div>
          )}

          <input
            className={styles.spellSearch}
            type="search"
            placeholder="Search spells…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <div className={styles.spellList}>
            {filteredSpells.map(id => {
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

      {/* Spell modal */}
      {modalSpell && (
        <div className={styles.modalOverlay} onClick={() => setSpellModal(null)}>
          <div className={styles.spellModal} onClick={e => e.stopPropagation()}>
            <div className={styles.spellModalHeader}>
              <div>
                <div className={styles.spellModalName}>{modalSpell.name}</div>
                <div className={styles.spellModalSub}>
                  {modalSpell.level === 0 ? 'Cantrip' : `Level ${modalSpell.level}`} · {modalSpell.school}
                </div>
              </div>
              <button className={styles.spellModalClose} onClick={() => setSpellModal(null)}>×</button>
            </div>
            <dl className={styles.spellModalMeta}>
              <dt>Casting Time</dt><dd>{modalSpell.castingTime}</dd>
              <dt>Range</dt><dd>{modalSpell.range}</dd>
              <dt>Components</dt><dd>{modalSpell.components}</dd>
              <dt>Duration</dt><dd>{modalSpell.concentration ? '⚡ ' : ''}{modalSpell.duration}</dd>
            </dl>
            <p className={styles.spellModalDesc}>{modalSpell.description}</p>
            {modalSpell.concentration && char.concentrationSpellId !== modalSpell.id && (
              <button
                className={styles.spellModalConcBtn}
                onClick={() => { setConcentration(modalSpell.id); setSpellModal(null) }}
              >
                Start Concentrating
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
