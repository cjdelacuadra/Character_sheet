import { useState } from 'react'
import type { Character } from '@/entities/character/types'
import { SPELL_BY_ID, BUFF_CONDITION_SPELLS } from '@/shared/data/spellData'
import { computeACFull } from '@/shared/data/charCalculations'
import { CONDITIONS, CONDITION_BY_ID } from '@/shared/data/conditionsData'
import { useAppStore } from '@/app/store'
import styles from './ConditionsPanel.module.css'

interface Props {
  character: Character
  update: (patch: Partial<Character>) => void
}

export function ConditionsPanel({ character: char, update }: Props) {
  const [open, setOpen] = useState(false)
  const [buffOpen, setBuffOpen] = useState(false)
  const [buffSearch, setBuffSearch] = useState('')
  const dropConcentration = useAppStore(s => s.dropConcentration)

  function toggle(id: string) {
    const has = char.conditionIds.some(c => c.conditionId === id)
    if (has && id === 'concentration') {
      dropConcentration(char.id)
      return
    }
    const conditionIds = has
        ? char.conditionIds.filter(c => c.conditionId !== id)
        : [...char.conditionIds, { conditionId: id }]
    update({ conditionIds, armorClass: computeACFull({ ...char, conditionIds }) })
  }

  // Spell-buff "conditions" are stored in activeBuffSpells so existing mechanics (Mage Armor AC,
  // attack-buff riders) apply. Toggling recomputes AC so setsBaseAC buffs take effect immediately.
  const activeBuffs = char.activeBuffSpells ?? []
  function toggleBuff(id: string) {
    if (activeBuffs.includes(id) && id === char.concentrationSpellId) {
      dropConcentration(char.id)
      return
    }
    const next = activeBuffs.includes(id) ? activeBuffs.filter(x => x !== id) : [...activeBuffs, id]
    update({ activeBuffSpells: next, armorClass: computeACFull({ ...char, activeBuffSpells: next }) })
  }

  const buffMatches = BUFF_CONDITION_SPELLS.filter(s =>
    s.name.toLowerCase().includes(buffSearch.toLowerCase())
  )

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <span className={styles.sectionLabel}>Conditions</span>
        <span style={{ display: 'flex', gap: 6 }}>
          <button className={styles.addBtn} onClick={() => { setBuffOpen(v => !v); setOpen(false) }}>
            {buffOpen ? 'Done' : '+ Buff'}
          </button>
          <button className={styles.addBtn} onClick={() => { setOpen(v => !v); setBuffOpen(false) }}>
            {open ? 'Done' : '+ Add'}
          </button>
        </span>
      </div>

      {open && (
        <div className={styles.conditionPicker}>
          {CONDITIONS.map(name => {
            const active = char.conditionIds.some(c => c.conditionId === name.id)
            return (
              <button
                key={name.id}
                className={[
                  styles.condOpt,
                  styles[`condOpt${name.category[0].toUpperCase()}${name.category.slice(1)}`],
                  active ? styles.condOptActive : '',
                ].join(' ')}
                onClick={() => toggle(name.id)}
                title={name.description}
              >
                {name.name}
              </button>
            )
          })}
        </div>
      )}

      {buffOpen && (
        <div className={styles.conditionPicker}>
          <input
            className={styles.buffSearch}
            type="search"
            placeholder="Search spell buffs…"
            value={buffSearch}
            onChange={e => setBuffSearch(e.target.value)}
            autoFocus
          />
          {buffMatches.map(s => {
            const active = activeBuffs.includes(s.id)
            return (
              <button
                key={s.id}
                className={`${styles.condOpt} ${active ? styles.condOptActive : ''}`}
                onClick={() => toggleBuff(s.id)}
                title={`${s.level === 0 ? 'Cantrip' : `Level ${s.level}`} — ${s.school}`}
              >
                {s.name}
              </button>
            )
          })}
        </div>
      )}

      <div className={styles.condTags}>
        {char.isRaging && (
          <div className={`${styles.condTag} ${styles.condTagRage}`} title="Rage is active">
            raging — +{char.level >= 16 ? 4 : char.level >= 9 ? 3 : 2} dmg · resistance: B/P/S · adv STR
          </div>
        )}
        {activeBuffs.map(id => (
          <button
            key={id}
            className={styles.condTag}
            style={{ borderColor: 'var(--success)', color: 'var(--success)' }}
            onClick={() => toggleBuff(id)}
            title="Spell buff — click to remove"
          >
            {SPELL_BY_ID[id]?.name ?? id} ×
          </button>
        ))}
        {char.conditionIds.length === 0 && activeBuffs.length === 0 && !open && !buffOpen && !char.isRaging && (
          <span className={styles.emptyNote}>None</span>
        )}
        {char.conditionIds.map(c => {
          const condition = CONDITION_BY_ID[c.conditionId]
          if (!condition) {
            return (
              <button key={c.conditionId} className={styles.condTag} onClick={() => toggle(c.conditionId)} title="Legacy condition — click to remove">
                {c.conditionId} ×
              </button>
            )
          }
          return (
            <div
              key={c.conditionId}
              className={[
                styles.condTag,
                styles[`condTag${condition.category[0].toUpperCase()}${condition.category.slice(1)}`],
              ].join(' ')}
              title={condition.description}
            >
              <button className={styles.condTagRemove} onClick={() => toggle(c.conditionId)} title="Click to remove">
                {condition.name} ×
              </button>
              {condition.effects.map((effect, i) => (
                <span key={i} className={styles.effectNote}>{effect.description}</span>
              ))}
            </div>
          )
        })}
      </div>
    </section>
  )
}
