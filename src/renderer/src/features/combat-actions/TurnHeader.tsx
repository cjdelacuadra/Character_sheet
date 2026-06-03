import { useAppStore } from '@/app/store'
import type { EconomyType } from '@/app/store/turnSlice'
import styles from './TurnHeader.module.css'

interface Props {
  charId: string
  nextTurnOpen: boolean
  onToggleNextTurn: () => void
}

const TYPE_META: Array<{ type: EconomyType; label: string; labelClass: string; pipClass: string }> = [
  { type: 'action',   label: 'A',  labelClass: styles.econLabelAction,   pipClass: styles.pipActionUsed },
  { type: 'bonus',    label: 'BA', labelClass: styles.econLabelBonus,    pipClass: styles.pipBonusUsed },
  { type: 'reaction', label: 'R',  labelClass: styles.econLabelReaction, pipClass: styles.pipReactionUsed },
]

export function TurnHeader({ charId, nextTurnOpen, onToggleNextTurn }: Props) {
  const ts = useAppStore(s => s.turnStates[charId])
  const useEconomy = useAppStore(s => s.useEconomy)
  const recoverEconomy = useAppStore(s => s.recoverEconomy)

  if (!ts) return null

  const groups = [
    { type: 'action' as const,   used: ts.actionsUsed,       bonus: ts.bonusActions },
    { type: 'bonus' as const,    used: ts.bonusActionsUsed,  bonus: ts.bonusBonusActions },
    { type: 'reaction' as const, used: ts.reactionsUsed,     bonus: ts.bonusReactions },
  ]

  return (
    <div className={styles.header}>
      <div className={styles.economyRow}>
        {groups.map(({ type, used, bonus }) => {
          const meta = TYPE_META.find(m => m.type === type)!
          const total = 1 + bonus
          const remaining = total - used
          return (
            <div key={type} className={styles.econGroup}>
              <span className={`${styles.econLabel} ${meta.labelClass}`}>{meta.label}</span>
              <div className={styles.pipRow}>
                {Array.from({ length: Math.max(total, 1) }).map((_, i) => {
                  const isUsed = i < used
                  return (
                    <button
                      key={i}
                      className={`${styles.pip} ${isUsed ? meta.pipClass : styles.pipAvailable}`}
                      onClick={() => isUsed ? recoverEconomy(charId, type) : useEconomy(charId, type)}
                      title={isUsed ? 'Un-use' : 'Use'}
                    />
                  )
                })}
              </div>
              <span className={styles.econCount}>
                {remaining}/{total}
              </span>
            </div>
          )
        })}
      </div>

      <button
        className={`${styles.nextTurnBtn} ${nextTurnOpen ? styles.nextTurnBtnOpen : ''}`}
        onClick={onToggleNextTurn}
      >
        {nextTurnOpen ? 'Close' : 'Next Turn ▶'}
      </button>
    </div>
  )
}
