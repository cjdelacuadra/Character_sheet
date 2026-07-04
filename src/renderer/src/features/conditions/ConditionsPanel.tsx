import { useState } from 'react'
import type { Character } from '@/entities/character/types'
import { computeACFull } from '@/shared/data/charCalculations'
import { CONDITIONS, CONDITION_BY_ID } from '@/shared/data/conditionsData'
import { useAppStore } from '@/app/store'
import { Panel } from '@/ui/Panel'
import styles from './ConditionsPanel.module.css'

interface Props {
  character: Character
  update: (patch: Partial<Character>) => void
}

export function ConditionsPanel({ character: char, update }: Props) {
  const [open, setOpen] = useState(false)
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

  return (
    <Panel label="Conditions" actions={[{ label: open ? 'Done' : '+ Add', onClick: () => setOpen(v => !v) }]}>
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

      <div className={styles.condTags}>
        {char.isRaging && (
          <div className={`${styles.condTag} ${styles.condTagRage}`} title="Rage is active">
            raging - +{char.level >= 16 ? 4 : char.level >= 9 ? 3 : 2} dmg - resistance: B/P/S - adv STR
          </div>
        )}
        {char.conditionIds.length === 0 && !open && !char.isRaging && (
          <span className={styles.emptyNote}>None</span>
        )}
        {char.conditionIds.map(c => {
          const condition = CONDITION_BY_ID[c.conditionId]
          if (!condition) {
            return (
              <button key={c.conditionId} className={styles.condTag} onClick={() => toggle(c.conditionId)} title="Legacy condition - click to remove">
                {c.conditionId} x
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
                {condition.name} x
              </button>
              {condition.effects.map((effect, i) => (
                <span key={i} className={styles.effectNote}>{effect.description}</span>
              ))}
            </div>
          )
        })}
      </div>
    </Panel>
  )
}
