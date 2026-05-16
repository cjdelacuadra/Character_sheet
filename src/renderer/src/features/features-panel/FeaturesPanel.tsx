import type { Character } from '@/entities/character/types'
import { getClassFeatures, type FeatureEntry } from '@/shared/data/classFeaturesData'
import { ARCANE_TRADITION_BY_ID } from '@/shared/data/arcaneTraditonsData'
import styles from './FeaturesPanel.module.css'

interface Props {
  character: Character
  selectedFeature: FeatureEntry | null
  onSelectFeature: (f: FeatureEntry | null) => void
}

export function FeaturesPanel({ character: char, selectedFeature, onSelectFeature }: Props) {
  const features = getClassFeatures(char.classId, char.level)

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <span className={styles.sectionLabel}>{char.classId} Features</span>
      </div>
      {features.length === 0 ? (
        <span className={styles.emptyNote}>No features at this level.</span>
      ) : (
        <div className={styles.featureList}>
          {features.map((f, i) => {
            const isSelected = selectedFeature?.name === f.name && selectedFeature?.level === f.level
            return (
              <div key={i} className={`${styles.featureCard} ${isSelected ? styles.featureCardSel : ''}`}>
                <button className={styles.featureHead} onClick={() => onSelectFeature(isSelected ? null : f)}>
                  <span className={styles.featureName}>
                    {f.name}
                    {f.name === 'Arcane Tradition' && char.subclass && (
                      <span className={styles.featureSub}>{ARCANE_TRADITION_BY_ID[char.subclass]?.name}</span>
                    )}
                  </span>
                  <span className={styles.featureLevel}>Lvl {f.level}</span>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
