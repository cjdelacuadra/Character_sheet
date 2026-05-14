import type { Character } from '@/entities/character/types'
import { CLASS_BY_ID } from '@/shared/data/classData'
import styles from './ResourcesPanel.module.css'

interface Props {
  character: Character
  update: (patch: Partial<Character>) => void
}

export function ResourcesPanel({ character: char, update }: Props) {
  const classDef = CLASS_BY_ID[char.classId]
  const entries = Object.entries(char.resources)
  if (entries.length === 0) return null

  function useResource(name: string) {
    const res = char.resources[name]
    if (!res || res.used >= res.total) return
    update({ resources: { ...char.resources, [name]: { ...res, used: res.used + 1 } } })
  }

  function recoverResource(name: string) {
    const res = char.resources[name]
    if (!res || res.used === 0) return
    update({ resources: { ...char.resources, [name]: { ...res, used: res.used - 1 } } })
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <span className={styles.sectionLabel}>Resources</span>
      </div>
      <div className={styles.resourceList}>
        {entries.map(([name, res]) => {
          const remaining = res.total - res.used
          const resDef = classDef?.resources?.find(r => r.name === name)
          return (
            <div key={name} className={styles.resourceRow}>
              <span className={styles.resourceName}>{name}</span>
              <div className={styles.resourcePips}>
                {Array.from({ length: Math.min(res.total, 20) }).map((_, i) => (
                  <button
                    key={i}
                    className={`${styles.resourcePip} ${i < remaining ? styles.resourcePipFull : styles.resourcePipEmpty}`}
                    onClick={() => i < remaining ? useResource(name) : recoverResource(name)}
                    title={i < remaining ? 'Use' : 'Recover'}
                  />
                ))}
                {res.total > 20 && (
                  <span className={styles.resourceCount}>{remaining}/{res.total}</span>
                )}
              </div>
              {resDef && (
                <span className={styles.resourceRecovery}>
                  {resDef.recoverOn === 'short' ? 'SR' : resDef.recoverOn === 'long' ? 'LR' : '—'}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
