import { useState } from 'react'
import type { Character } from '@/entities/character/types'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { mod } from '@/shared/data/charCalculations'
import styles from './RestPanel.module.css'

function fmtMod(n: number) { return n >= 0 ? `+${n}` : String(n) }

interface Props {
  character: Character
  onShortRest: (hdRolled: number) => void
  onLongRest: () => void
  onClose: () => void
}

export function RestPanel({ character: char, onShortRest, onLongRest, onClose }: Props) {
  const [tab, setTab] = useState<'short' | 'long'>('short')
  const [hdRoll, setHdRoll] = useState('')
  const classDef = CLASS_BY_ID[char.classId]
  const availableHD = char.level - char.hitDiceUsed

  function rollHitDie() {
    const sides = classDef?.hitDie ?? 8
    setHdRoll(String(Math.ceil(Math.random() * sides)))
  }

  function doShortRest() {
    const v = parseInt(hdRoll, 10)
    if (isNaN(v) || v < 1) return
    onShortRest(v)
    setHdRoll('')
  }

  const healPreview = hdRoll && !isNaN(parseInt(hdRoll))
    ? `Heal: ${parseInt(hdRoll)} + CON (${fmtMod(mod(char.abilityScores.con))}) = ${Math.max(0, parseInt(hdRoll) + mod(char.abilityScores.con))} HP`
    : ''

  return (
    <div className={styles.restPanel}>
      <div className={styles.restTabs}>
        <button
          className={`${styles.restTab} ${tab === 'short' ? styles.restTabActive : ''}`}
          onClick={() => setTab('short')}
        >
          Short Rest
        </button>
        <button
          className={`${styles.restTab} ${tab === 'long' ? styles.restTabActive : ''}`}
          onClick={() => setTab('long')}
        >
          Long Rest
        </button>
      </div>

      {tab === 'short' && (
        <div className={styles.restBody}>
          <span className={styles.restNote}>
            Hit Dice available: <strong>{availableHD}/{char.level}</strong>
            {classDef && ` (d${classDef.hitDie})`}
          </span>
          {availableHD > 0 ? (
            <div className={styles.restHdRow}>
              <input
                className={styles.restHdInput}
                type="number"
                min={1}
                max={classDef?.hitDie ?? 12}
                placeholder="Roll value"
                value={hdRoll}
                onChange={e => setHdRoll(e.target.value)}
              />
              <button className={styles.restRollBtn} onClick={rollHitDie}>🎲 Roll</button>
              {healPreview && <span className={styles.restHdNote}>{healPreview}</span>}
              <button
                className={styles.restConfirmBtn}
                disabled={!hdRoll || isNaN(parseInt(hdRoll))}
                onClick={doShortRest}
              >
                Take Short Rest
              </button>
            </div>
          ) : (
            <span className={styles.restNote}>No Hit Dice remaining.</span>
          )}
          <button className={styles.restCancelBtn} onClick={onClose}>Cancel</button>
        </div>
      )}

      {tab === 'long' && (
        <div className={styles.restBody}>
          <span className={styles.restNote}>
            Long rest restores all HP, all spell slots, and long-rest resources.
            Recovers {Math.max(1, Math.floor(char.level / 2))} spent Hit Dice.
          </span>
          <div className={styles.restActions}>
            <button className={styles.restConfirmBtn} onClick={onLongRest}>Take Long Rest</button>
            <button className={styles.restCancelBtn} onClick={onClose}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
