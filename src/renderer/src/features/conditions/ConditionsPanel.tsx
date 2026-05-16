import { useState } from 'react'
import type { Character } from '@/entities/character/types'
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

  function toggle(name: string) {
    const id = name.toLowerCase()
    const has = char.conditionIds.some(c => c.conditionId === id)
    update({
      conditionIds: has
        ? char.conditionIds.filter(c => c.conditionId !== id)
        : [...char.conditionIds, { conditionId: id }],
    })
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <span className={styles.sectionLabel}>Conditions</span>
        <button className={styles.addBtn} onClick={() => setOpen(v => !v)}>
          {open ? 'Done' : '+ Add'}
        </button>
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
      <div className={styles.condTags}>
        {char.conditionIds.length === 0 && !open && (
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
