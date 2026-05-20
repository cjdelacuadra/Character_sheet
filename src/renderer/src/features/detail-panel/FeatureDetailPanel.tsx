import { useState } from 'react'
import type { Character } from '@/entities/character/types'
import type { FeatureEntry } from '@/shared/data/classFeaturesData'
import { SUBCLASSES, SUBCLASS_BY_ID } from '@/shared/data/subclassData'
import { FIGHTING_STYLES, FIGHTING_STYLE_BY_ID } from '@/shared/data/fightingStylesData'
import { CLASS_BY_ID } from '@/shared/data/classData'
import styles from './DetailPanel.module.css'

interface Props {
  character: Character
  feature: FeatureEntry
  update: (patch: Partial<Character>) => void
  onClose: () => void
}

const SUBCLASS_FEATURE_NAMES = new Set([
  'Arcane Tradition', 'Otherworldly Patron', 'Divine Domain',
  'Martial Archetype', 'Primal Path', 'Bard College', 'Druid Circle',
  'Monastic Tradition', 'Sacred Oath', 'Ranger Archetype',
  'Roguish Archetype', 'Sorcerous Origin',
])

export function FeatureDetailPanel({ character: char, feature: f, update, onClose }: Props) {
  const [pendingSubclass, setPendingSubclass] = useState<string | null>(null)
  const [pendingStyle, setPendingStyle] = useState<string | null>(null)

  const isRace = f.level === 0
  const isSubclassPicker = SUBCLASS_FEATURE_NAMES.has(f.name)
  const isFightingStyle = f.name === 'Fighting Style'
  const isAsi = f.name === 'ASI'

  // ── Subclass picker ──────────────────────────────────────────────────────
  if (isSubclassPicker) {
    const candidates = SUBCLASSES.filter(s => s.classId === char.classId)
    const chosen = char.subclass ? SUBCLASS_BY_ID[char.subclass] : null
    const isLocked = char.subclassLocked ?? false

    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <span className={styles.title}>{f.name}</span>
            {chosen && <span className={styles.sub}>{chosen.label}</span>}
          </div>
          <button className={styles.close} onClick={onClose}>×</button>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.badgeClass}>{char.classId.toUpperCase()}</span>
          <span className={styles.level}>Level {f.level}</span>
        </div>
        {isLocked ? (
          <>
            {chosen && (
              <div className={styles.chosenBlock}>
                <span className={styles.chosenName}>{chosen.label}</span>
                {chosen.description && <p className={styles.desc}>{chosen.description}</p>}
              </div>
            )}
            <span className={styles.lockedNote}>Subclass locked — this choice is permanent.</span>
          </>
        ) : (
          <>
            {!chosen && !pendingSubclass && (
              <p className={styles.desc}>Choose your {f.name.toLowerCase()}:</p>
            )}
            <div className={styles.optionList}>
              {candidates.map(s => (
                <button
                  key={s.id}
                  className={`${styles.optionBtn} ${(pendingSubclass ?? char.subclass) === s.id ? styles.optionBtnActive : ''}`}
                  onClick={() => setPendingSubclass(s.id)}
                >
                  <span className={styles.optionName}>{s.label}</span>
                  {s.description && <span className={styles.optionDesc}>{s.description}</span>}
                </button>
              ))}
            </div>
            {(pendingSubclass || char.subclass) && (
              <button
                className={styles.confirmBtn}
                onClick={() => {
                  update({ subclass: pendingSubclass ?? char.subclass ?? undefined, subclassLocked: true })
                  setPendingSubclass(null)
                }}
              >
                Confirm {f.name}
              </button>
            )}
          </>
        )}
      </div>
    )
  }

  // ── Fighting Style picker ────────────────────────────────────────────────
  if (isFightingStyle) {
    const classDef = CLASS_BY_ID[char.classId]
    const hasPendingAsi = (classDef?.asiLevels ?? []).includes(char.level) &&
      !(char.completedAsiLevels ?? []).includes(char.level)
    const isLocked = (char.fightingStyleLocked ?? false) && !hasPendingAsi
    const chosen = char.fightingStyle ? FIGHTING_STYLE_BY_ID[char.fightingStyle] : null

    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <span className={styles.title}>Fighting Style</span>
            {chosen && <span className={styles.sub}>{chosen.name}</span>}
          </div>
          <button className={styles.close} onClick={onClose}>×</button>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.badgeClass}>{char.classId.toUpperCase()}</span>
          <span className={styles.level}>Level {f.level}</span>
        </div>
        {isLocked ? (
          <>
            {chosen && (
              <div className={styles.chosenBlock}>
                <span className={styles.chosenName}>{chosen.name}</span>
                <p className={styles.desc}>{chosen.description}</p>
              </div>
            )}
            <span className={styles.lockedNote}>Style locked — can retrain at next ASI.</span>
          </>
        ) : (
          <>
            {hasPendingAsi && chosen && (
              <p className={styles.note}>Retraining available at this level.</p>
            )}
            {!chosen && !pendingStyle && (
              <p className={styles.desc}>Choose your fighting style:</p>
            )}
            <div className={styles.optionList}>
              {FIGHTING_STYLES.map(s => (
                <button
                  key={s.id}
                  className={`${styles.optionBtn} ${(pendingStyle ?? char.fightingStyle) === s.id ? styles.optionBtnActive : ''}`}
                  onClick={() => setPendingStyle(s.id)}
                >
                  <span className={styles.optionName}>{s.name}</span>
                  <span className={styles.optionDesc}>{s.description}</span>
                </button>
              ))}
            </div>
            {(pendingStyle || char.fightingStyle) && (
              <button
                className={styles.confirmBtn}
                onClick={() => {
                  update({ fightingStyle: pendingStyle ?? char.fightingStyle ?? undefined, fightingStyleLocked: true })
                  setPendingStyle(null)
                }}
              >
                Confirm Style
              </button>
            )}
          </>
        )}
      </div>
    )
  }

  // ── ASI — show what was chosen ───────────────────────────────────────────
  if (isAsi) {
    const isDone = (char.completedAsiLevels ?? []).includes(f.level)
    const choiceLabel = char.completedAsiChoices?.[f.level]

    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <span className={styles.title}>Ability Score Improvement</span>
            {isDone && <span className={styles.sub}>Applied at level {f.level}</span>}
          </div>
          <button className={styles.close} onClick={onClose}>×</button>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.badgeClass}>{char.classId.toUpperCase()}</span>
          <span className={styles.level}>Level {f.level}</span>
        </div>
        {isDone && choiceLabel ? (
          <div className={styles.chosenBlock}>
            <span className={styles.chosenName}>{choiceLabel}</span>
            <p className={styles.desc}>Ability scores increased at this level. Maximum score is 20.</p>
          </div>
        ) : isDone ? (
          <p className={styles.desc}>Ability scores were increased at this level. Maximum score is 20.</p>
        ) : (
          <p className={styles.desc}>Increase one ability score by 2, or two scores by 1 each. Maximum is 20. Use the Level Up action to apply.</p>
        )}
      </div>
    )
  }

  // ── Generic feature (race trait or class feature) ────────────────────────
  const subclassLabel = SUBCLASS_FEATURE_NAMES.has(f.name) && char.subclass
    ? SUBCLASS_BY_ID[char.subclass]?.label
    : null

  // Race trait: f.desc is '' — the trait name contains the full description
  const description = f.desc || (isRace ? f.name : 'No description available.')

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
        {!isRace && f.level > 0 && <span className={styles.level}>Level {f.level}</span>}
      </div>
      <p className={styles.desc}>{description}</p>
    </div>
  )
}
