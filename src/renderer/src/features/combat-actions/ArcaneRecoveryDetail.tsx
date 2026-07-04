/**
 * Arcane Recovery detail (Wizard): pick expended slots totalling up to
 * ceil(level/2) combined levels, once per day. Extracted from
 * ActionDetailPanel; shared by the action path and the feature path.
 */
import { useState, type ReactNode } from 'react'
import type { Character } from '@/entities/character/types'
import { ResourcesPanel } from '@/features/resources/ResourcesPanel'
import styles from './ActionDetailPanel.module.css'

const ORDINAL: Record<number, string> = { 1:'1st',2:'2nd',3:'3rd',4:'4th',5:'5th',6:'6th',7:'7th',8:'8th',9:'9th' }

interface Props {
  character: Character
  update: (patch: Partial<Character>) => void
  desc: string
  /** The action path passes its Use-Action button; the feature path passes nothing. */
  useButton?: ReactNode
}

export function ArcaneRecoveryDetail({ character: char, update, desc, useButton }: Props) {
  const [arcanePickedLevels, setArcanePickedLevels] = useState<number[]>([])
  const maxArcaneRecovery = Math.ceil(char.level / 2)
  const totalArcanePickedLevels = arcanePickedLevels.reduce((s, l) => s + l, 0)
  const arcaneRes = char.resources['Arcane Recovery']
  const arcaneAlreadyUsed = arcaneRes ? arcaneRes.used >= arcaneRes.total : false
  const arcaneRecoverableSlots = (Object.entries(char.spellSlots) as [string, { used: number; total: number }][])
    .filter(([lvl, slot]) => Number(lvl) <= 5 && slot.used > 0)
    .sort(([a], [b]) => Number(a) - Number(b))

  function toggleArcaneSlot(level: number, isPicked: boolean) {
    if (isPicked) {
      const idx = arcanePickedLevels.lastIndexOf(level)
      setArcanePickedLevels(arcanePickedLevels.filter((_, i) => i !== idx))
    } else if (totalArcanePickedLevels + level <= maxArcaneRecovery) {
      setArcanePickedLevels([...arcanePickedLevels, level])
    }
  }

  function applyArcaneRecovery() {
    const newSlots = { ...char.spellSlots }
    const levelCounts: Record<number, number> = {}
    for (const l of arcanePickedLevels) levelCounts[l] = (levelCounts[l] ?? 0) + 1
    for (const [lvl, count] of Object.entries(levelCounts)) {
      const slot = newSlots[Number(lvl)]
      if (slot) newSlots[Number(lvl)] = { ...slot, used: Math.max(0, slot.used - count) }
    }
    const newResources = { ...char.resources }
    if (newResources['Arcane Recovery']) {
      newResources['Arcane Recovery'] = { ...newResources['Arcane Recovery'], used: newResources['Arcane Recovery'].used + 1 }
    }
    update({ spellSlots: newSlots, resources: newResources })
    setArcanePickedLevels([])
  }

  function render() {
    return (
      <>
        <ResourcesPanel character={char} update={update} />
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>Arcane Recovery</span>
            <span className={`${styles.detailBadge} ${styles.badgeAction}`}>Short Rest</span>
            {useButton}
          </div>
          <p className={styles.detailFull}>{desc}</p>
          {arcaneAlreadyUsed ? (
            <p className={styles.detailFull} style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Already used today — recovers on long rest.
            </p>
          ) : (
            <>
              <div className={styles.detailResource}>
                Recover slots: {totalArcanePickedLevels}/{maxArcaneRecovery} combined levels
              </div>
              {arcaneRecoverableSlots.length === 0 ? (
                <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>No expended slots of 5th level or lower.</p>
              ) : (
                <div className={styles.arcaneSlotGrid}>
                  {arcaneRecoverableSlots.map(([lvl, slot]) => {
                    const level = Number(lvl)
                    const alreadyPickedCount = arcanePickedLevels.filter(l => l === level).length
                    return Array.from({ length: slot.used }).map((_, i) => {
                      const isPicked = i < alreadyPickedCount
                      const wouldExceed = !isPicked && totalArcanePickedLevels + level > maxArcaneRecovery
                      return (
                        <button
                          key={`${lvl}-${i}`}
                          className={`${styles.arcaneSlotBtn} ${isPicked ? styles.arcaneSlotBtnPicked : ''}`}
                          disabled={wouldExceed}
                          onClick={() => toggleArcaneSlot(level, isPicked)}
                        >
                          {ORDINAL[level] ?? `${level}th`}
                        </button>
                      )
                    })
                  })}
                </div>
              )}
              <button
                className={styles.armoryAddBtn}
                disabled={arcanePickedLevels.length === 0}
                onClick={applyArcaneRecovery}
                style={{ marginTop: 8 }}
              >
                Recover Slots
              </button>
            </>
          )}
        </div>
      </>
    )
  }
  return render()
}
