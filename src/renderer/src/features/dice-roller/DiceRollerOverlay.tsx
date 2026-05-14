import { useState, useEffect, useCallback } from 'react'
import styles from './DiceRollerOverlay.module.css'

const DICE = [4, 6, 8, 10, 12, 20, 100] as const
type Die = typeof DICE[number]

interface RollResult {
  id: number
  label: string
  total: number
  rolls: number[]
  modifier: number
  isNat20: boolean
  isNat1: boolean
}

let nextId = 1

interface Props {
  onClose: () => void
}

export function DiceRollerOverlay({ onClose }: Props) {
  const [die, setDie] = useState<Die>(20)
  const [count, setCount] = useState(1)
  const [modifier, setModifier] = useState(0)
  const [history, setHistory] = useState<RollResult[]>([])

  const roll = useCallback(() => {
    const rolls = Array.from({ length: count }, () => Math.ceil(Math.random() * die))
    const total = rolls.reduce((a, b) => a + b, 0) + modifier
    const isNat20 = die === 20 && count === 1 && rolls[0] === 20
    const isNat1 = die === 20 && count === 1 && rolls[0] === 1
    const label = `${count}d${die}${modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : ''}`
    setHistory(prev => [{ id: nextId++, label, total, rolls, modifier, isNat20, isNat1 }, ...prev].slice(0, 20))
  }, [die, count, modifier])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter') roll()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, roll])

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>Dice Roller</span>
          <span className={styles.hint}>Press R to toggle · Enter to roll · Esc to close</span>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* Die selector */}
        <div className={styles.dieRow}>
          {DICE.map(d => (
            <button
              key={d}
              className={`${styles.diePill} ${die === d ? styles.diePillActive : ''}`}
              onClick={() => setDie(d)}
            >
              d{d}
            </button>
          ))}
        </div>

        {/* Count + modifier + roll */}
        <div className={styles.controlRow}>
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Count</label>
            <div className={styles.stepper}>
              <button className={styles.stepBtn} onClick={() => setCount(c => Math.max(1, c - 1))}>−</button>
              <span className={styles.stepVal}>{count}</span>
              <button className={styles.stepBtn} onClick={() => setCount(c => Math.min(20, c + 1))}>+</button>
            </div>
          </div>
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Modifier</label>
            <div className={styles.stepper}>
              <button className={styles.stepBtn} onClick={() => setModifier(m => m - 1)}>−</button>
              <span className={styles.stepVal}>{modifier >= 0 ? `+${modifier}` : modifier}</span>
              <button className={styles.stepBtn} onClick={() => setModifier(m => m + 1)}>+</button>
            </div>
          </div>
          <button className={styles.rollBtn} onClick={roll}>
            🎲 Roll {count}d{die}{modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : ''}
          </button>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className={styles.history}>
            {history.map(r => (
              <div
                key={r.id}
                className={`${styles.historyRow} ${r.isNat20 ? styles.nat20 : ''} ${r.isNat1 ? styles.nat1 : ''}`}
              >
                <span className={styles.historyLabel}>{r.label}</span>
                <span className={styles.historyRolls}>[{r.rolls.join(', ')}]{r.modifier !== 0 ? ` ${r.modifier > 0 ? '+' : ''}${r.modifier}` : ''}</span>
                <span className={styles.historyTotal}>
                  {r.isNat20 ? '⭐ ' : r.isNat1 ? '💀 ' : ''}{r.total}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
