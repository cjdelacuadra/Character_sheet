import { useState } from 'react'
import type { Character } from '@/entities/character/types'
import { SUBCLASS_BY_ID } from '@/shared/data/subclassData'
import { xpForNextLevel } from '@/domain/rules'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { useTheme } from '@/app/ThemeContext'
import styles from './CharacterHeader.module.css'

interface Props {
  character: Character
  update: (patch: Partial<Character>) => void
  onLevelUp: () => void
  onRestToggle: () => void
  onBack: () => void
  onEquipToggle: () => void
  equipOpen: boolean
}

export function CharacterHeader({ character: char, update, onLevelUp, onRestToggle, onBack, onEquipToggle, equipOpen }: Props) {
  const [xpEdit, setXpEdit] = useState<string | null>(null)
  const { theme, toggle } = useTheme()
  const xpNext = xpForNextLevel(char.level)
  const canLevelUp = xpNext !== null && char.experiencePoints >= xpNext
  const classDef = CLASS_BY_ID[char.classId]
  const nextLevelIsAsi = classDef?.asiLevels?.includes(char.level + 1) ?? false

  function commitXpEdit() {
    if (xpEdit === null) return
    const v = parseInt(xpEdit, 10)
    if (!isNaN(v)) update({ experiencePoints: Math.max(0, v) })
    setXpEdit(null)
  }

  // Ignore unused nextLevelIsAsi here — caller decides modal vs direct
  void nextLevelIsAsi

  return (
    <header className={styles.headerGrid}>
      {/* Row 1 */}
      <div className={styles.headerCell}>
        <span className={styles.headerValue}>{char.name}</span>
        <span className={styles.headerLabel}>Character Name</span>
      </div>
      <div className={styles.headerCell}>
        <span className={styles.headerValue}>
          {char.classId}
          {char.subclass ? ` (${SUBCLASS_BY_ID[char.subclass]?.label ?? char.subclass})` : ''}
          {' '}{char.level}
        </span>
        <span className={styles.headerLabel}>Class &amp; Level</span>
      </div>
      <div className={styles.headerCell}>
        <span className={styles.headerValue}>{char.background}</span>
        <span className={styles.headerLabel}>Background</span>
      </div>
      <div className={styles.headerCell}>
        <span className={styles.headerValue}>{char.playerName || '—'}</span>
        <span className={styles.headerLabel}>Player Name</span>
      </div>

      {/* Row 2 */}
      <div className={styles.headerCell}>
        <span className={styles.headerValue}>{char.race}</span>
        <span className={styles.headerLabel}>Race</span>
      </div>
      <div className={styles.headerCell}>
        <span className={styles.headerValue}>{char.alignment || '—'}</span>
        <span className={styles.headerLabel}>Alignment</span>
      </div>
      <div className={styles.headerCell}>
        <div className={styles.xpBlock}>
          {xpEdit !== null ? (
            <input
              className={styles.xpInput}
              type="number"
              value={xpEdit}
              autoFocus
              onChange={e => setXpEdit(e.target.value)}
              onBlur={commitXpEdit}
              onKeyDown={e => { if (e.key === 'Enter') commitXpEdit(); if (e.key === 'Escape') setXpEdit(null) }}
            />
          ) : (
            <button className={styles.xpBtn} onClick={() => setXpEdit(String(char.experiencePoints))}>
              <span className={styles.xpVal}>{char.experiencePoints.toLocaleString()}</span>
              {xpNext !== null && <span className={styles.xpMax}>/{xpNext.toLocaleString()}</span>}
            </button>
          )}
          {canLevelUp && (
            <button className={styles.levelUpBtn} onClick={onLevelUp}>↑ Level Up</button>
          )}
        </div>
        <span className={styles.headerLabel}>Experience Points</span>
      </div>
      <div className={`${styles.headerCell} ${styles.headerActions}`}>
        <button
          className={`${styles.equipBtn}${equipOpen ? ` ${styles.equipBtnActive}` : ''}`}
          onClick={onEquipToggle}
        >Equipment</button>
        <button className={styles.restBtn} onClick={onRestToggle}>Rest</button>
        <button className={styles.themeBtn} onClick={toggle} title="Toggle theme">
          {theme === 'dark' ? '☀' : '◑'}
        </button>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
      </div>
    </header>
  )
}
