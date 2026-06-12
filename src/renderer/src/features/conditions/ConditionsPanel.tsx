import { useState } from 'react'
import type { Character } from '@/entities/character/types'
import { SPELL_BY_ID, BUFF_CONDITION_SPELLS } from '@/shared/data/spellData'
import { computeACFull } from '@/shared/data/charCalculations'
import styles from './ConditionsPanel.module.css'

const CONDITIONS = [
  'Blinded', 'Charmed', 'Concentration', 'Deafened', 'Exhaustion', 'Frightened',
  'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified',
  'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious',
]

interface Props {
  character: Character
  update: (patch: Partial<Character>) => void
}

export function ConditionsPanel({ character: char, update }: Props) {
  const [open, setOpen] = useState(false)
  const [buffOpen, setBuffOpen] = useState(false)
  const [buffSearch, setBuffSearch] = useState('')

  function toggle(name: string) {
    const id = name.toLowerCase()
    const has = char.conditionIds.some(c => c.conditionId === id)
    update({
      conditionIds: has
        ? char.conditionIds.filter(c => c.conditionId !== id)
        : [...char.conditionIds, { conditionId: id }],
    })
  }

  // Spell-buff "conditions" are stored in activeBuffSpells so existing mechanics (Mage Armor AC,
  // attack-buff riders) apply. Toggling recomputes AC so setsBaseAC buffs take effect immediately.
  const activeBuffs = char.activeBuffSpells ?? []
  function toggleBuff(id: string) {
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
            const active = char.conditionIds.some(c => c.conditionId === name.toLowerCase())
            return (
              <button
                key={name}
                className={`${styles.condOpt} ${active ? styles.condOptActive : ''}`}
                onClick={() => toggle(name)}
              >
                {name}
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
        {char.conditionIds.map(c => (
          <button key={c.conditionId} className={styles.condTag} onClick={() => toggle(c.conditionId)} title="Click to remove">
            {c.conditionId} ×
          </button>
        ))}
      </div>
    </section>
  )
}
