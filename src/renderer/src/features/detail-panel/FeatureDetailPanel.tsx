import type { Character } from '@/entities/character/types'
import type { FeatureEntry } from '@/shared/data/classFeaturesData'
import { SUBCLASS_BY_ID } from '@/shared/data/subclassData'
import styles from './DetailPanel.module.css'

interface Props {
  character: Character
  feature: FeatureEntry
  onClose: () => void
}

const SUBCLASS_FEATURE_NAMES = new Set([
  'Arcane Tradition', 'Otherworldly Patron', 'Divine Domain',
  'Martial Archetype', 'Primal Path', 'Bard College', 'Druid Circle',
  'Monastic Tradition', 'Sacred Oath', 'Ranger Archetype',
  'Roguish Archetype', 'Sorcerous Origin',
])

export function FeatureDetailPanel({ character: char, feature: f, onClose }: Props) {
  const isRace = f.level === 0
  const subclassLabel = SUBCLASS_FEATURE_NAMES.has(f.name) && char.subclass
    ? SUBCLASS_BY_ID[char.subclass]?.label
    : null

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.title}>{f.name}</span>
          {subclassLabel && <span className={styles.sub}>{subclassLabel}</span>}
        </div>
        <button className={styles.close} onClick={onClose}>×</button>
      </div>

      <div className={styles.metaRow}>
        <span className={isRace ? styles.badgeRace : styles.badgeClass}>
          {isRace ? 'RACE' : char.classId.toUpperCase()}
        </span>
        {!isRace && f.level > 0 && (
          <span className={styles.level}>Level {f.level}</span>
        )}
      </div>

      <p className={styles.desc}>{f.desc || 'No description available.'}</p>
    </div>
  )
}
