import type { Character, Equipment } from '@/entities/character/types'
import { GEAR_BY_ID } from '@/shared/data/equipment/gear'
import styles from './DetailPanel.module.css'

const GEAR_SLOTS: (keyof Equipment)[] = [
  'armorId', 'shieldId',
  'helmetId', 'necklaceId', 'capeId', 'legsId',
  'bootsId', 'glovesId', 'quiverId', 'ring1Id', 'ring2Id', 'amuletId',
]

interface Props {
  character: Character
  onClose: () => void
}

export function DeathSaveDetailPanel({ character: char, onClose }: Props) {
  const advSources: string[] = []
  for (const slot of GEAR_SLOTS) {
    const id = char.equipment[slot]
    if (!id || typeof id !== 'string') continue
    const gear = GEAR_BY_ID[id]
    if (gear?.stats?.advantage?.deathSaves) advSources.push(gear.name)
  }
  const hasAdv = advSources.length > 0

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Death Saving Throws</span>
        <button className={styles.close} onClick={onClose}>×</button>
      </div>
      {hasAdv && (
        <div className={styles.formulaBlock}>
          {advSources.map((name, i) => (
            <div key={i} className={styles.formulaRow}>
              <span className={styles.formulaLabel}>{name}</span>
              <span className={styles.formulaTag}>advantage</span>
            </div>
          ))}
        </div>
      )}
      <p className={styles.desc}>
        At 0 HP, roll a d20 at the start of each turn: 10 or higher is a success, under 10 a
        failure. Three successes stabilize you; three failures are fatal. A natural 20 restores
        1 HP; a natural 1 counts as two failures.
      </p>
      <div className={styles.tags}>
        {hasAdv
          ? <span className={styles.tagAdv}>Advantage (equipment)</span>
          : <span className={styles.tag}>No advantage</span>}
      </div>
    </div>
  )
}
