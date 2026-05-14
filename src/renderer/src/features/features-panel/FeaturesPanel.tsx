import { useState } from 'react'
import type { Character } from '@/entities/character/types'
import { getClassFeatures } from '@/shared/data/classFeaturesData'
import styles from './FeaturesPanel.module.css'

interface Props {
  character: Character
}

export function FeaturesPanel({ character: char }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const features = getClassFeatures(char.classId, char.level)

  function toggle(i: number) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })
  }

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
            const open = expanded.has(i)
            return (
              <div key={i} className={styles.featureCard}>
                <button className={styles.featureHead} onClick={() => toggle(i)}>
                  <span className={styles.featureName}>{f.name}</span>
                  <span className={styles.featureLevel}>Lvl {f.level}</span>
                  <span className={styles.featureChevron}>{open ? '▾' : '▸'}</span>
                </button>
                {open && <p className={styles.featureDesc}>{f.desc}</p>}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
