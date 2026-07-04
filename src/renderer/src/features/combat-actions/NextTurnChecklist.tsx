import { useMemo, useState } from 'react'
import { useAppStore } from '@/app/store'
import { isBladesinging, isRaging } from '@/domain/character/compat'
import type { Character } from '@/entities/character/types'
import { SPELL_BY_ID } from '@/shared/data/spellData'
import styles from './NextTurnChecklist.module.css'

interface Props {
  character: Character
  onClose: () => void
}

export function NextTurnChecklist({ character, onClose }: Props) {
  const ts = useAppStore(s => s.turnStates[character.id])
  const confirmNextTurn = useAppStore(s => s.confirmNextTurn)

  const initialDecisions = useMemo(() => {
    return {
      conditionsToDrop: [] as string[],
      dropConcentration: false,
      dropRage: false,
      dropBladesong: false,
    }
  }, [])
  const [decisions, setDecisions] = useState(initialDecisions)

  if (!ts) return null

  const totalActions = 1 + ts.bonusActions
  const totalBonus = 1 + ts.bonusBonusActions
  const totalReactions = 1 + ts.bonusReactions
  const unusedAction = ts.actionsUsed < totalActions
  const unusedBonus = ts.bonusActionsUsed < totalBonus
  const unusedReaction = ts.reactionsUsed < totalReactions
  const hasUnused = unusedAction || unusedBonus || unusedReaction

  const conditionsNonConcentration = character.conditionIds.filter(c => c.conditionId !== 'concentration')
  const hasConcentration = !!character.concentrationSpellId
  const concentrationSpell = hasConcentration ? SPELL_BY_ID[character.concentrationSpellId!] : null

  const endingSpells = ts.endOfTurnSpellIds.map(id => ({ id, name: SPELL_BY_ID[id]?.name ?? id }))
  const endingBuffs = ts.endOfTurnBuffIds.map(id => ({ id, name: SPELL_BY_ID[id]?.name ?? id }))

  function toggleConditionDrop(conditionId: string) {
    setDecisions(d => ({
      ...d,
      conditionsToDrop: d.conditionsToDrop.includes(conditionId)
        ? d.conditionsToDrop.filter(c => c !== conditionId)
        : [...d.conditionsToDrop, conditionId],
    }))
  }

  function setConcentration(drop: boolean) {
    setDecisions(d => ({ ...d, dropConcentration: drop }))
  }

  function setRage(drop: boolean) {
    setDecisions(d => ({ ...d, dropRage: drop }))
  }

  function setBladesong(drop: boolean) {
    setDecisions(d => ({ ...d, dropBladesong: drop }))
  }

  function confirm() {
    confirmNextTurn(character.id, decisions)
    onClose()
  }

  return (
    <div className={styles.root}>
      <div className={styles.titleRow}>
        <span className={styles.title}>End of Turn</span>
        <span className={styles.subtitle}>Review and confirm</span>
      </div>

      {hasUnused && (
        <section className={styles.section}>
          <div className={`${styles.sectionHead} ${styles.sectionWarn}`}>⚠ Unused Economy</div>
          <div className={styles.sectionContent}>
            {unusedAction && <div className={styles.reminder}>Action not used ({totalActions - ts.actionsUsed} remaining)</div>}
            {unusedBonus && <div className={styles.reminder}>Bonus Action not used ({totalBonus - ts.bonusActionsUsed} remaining)</div>}
            {unusedReaction && <div className={styles.reminder}>Reaction not used ({totalReactions - ts.reactionsUsed} remaining)</div>}
          </div>
        </section>
      )}

      <section className={styles.section}>
        <div className={styles.sectionHead}>✦ Conditions</div>
        <div className={styles.sectionContent}>
          {conditionsNonConcentration.length === 0 && <span className={styles.emptyNote}>None active</span>}
          {conditionsNonConcentration.map(c => {
            const dropping = decisions.conditionsToDrop.includes(c.conditionId)
            return (
              <div key={c.conditionId} className={styles.conditionRow}>
                <span className={styles.condName}>{c.conditionId}</span>
                <div className={styles.condDecision}>
                  <button
                    className={`${styles.decisionBtn} ${!dropping ? styles.decisionBtnActiveKeep : ''}`}
                    onClick={() => dropping && toggleConditionDrop(c.conditionId)}
                  >
                    Maintain
                  </button>
                  <button
                    className={`${styles.decisionBtn} ${dropping ? styles.decisionBtnActiveDrop : ''}`}
                    onClick={() => !dropping && toggleConditionDrop(c.conditionId)}
                  >
                    Drop
                  </button>
                </div>
              </div>
            )
          })}
          {isRaging(character) && (
            <div className={styles.conditionRow}>
              <span className={styles.condName}>Rage</span>
              <div className={styles.condDecision}>
                <button
                  className={`${styles.decisionBtn} ${!decisions.dropRage ? styles.decisionBtnActiveKeep : ''}`}
                  onClick={() => setRage(false)}
                >
                  Maintain
                </button>
                <button
                  className={`${styles.decisionBtn} ${decisions.dropRage ? styles.decisionBtnActiveDrop : ''}`}
                  onClick={() => setRage(true)}
                >
                  Drop
                </button>
              </div>
            </div>
          )}
          {isBladesinging(character) && (
            <div className={styles.conditionRow}>
              <span className={styles.condName}>Bladesong</span>
              <div className={styles.condDecision}>
                <button
                  className={`${styles.decisionBtn} ${!decisions.dropBladesong ? styles.decisionBtnActiveKeep : ''}`}
                  onClick={() => setBladesong(false)}
                >
                  Maintain
                </button>
                <button
                  className={`${styles.decisionBtn} ${decisions.dropBladesong ? styles.decisionBtnActiveDrop : ''}`}
                  onClick={() => setBladesong(true)}
                >
                  Drop
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {hasConcentration && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>🜂 Concentration</div>
          <div className={styles.sectionContent}>
            <div className={styles.conditionRow}>
              <span className={styles.condName}>{concentrationSpell?.name ?? character.concentrationSpellId}</span>
              <div className={styles.condDecision}>
                <button
                  className={`${styles.decisionBtn} ${!decisions.dropConcentration ? styles.decisionBtnActiveKeep : ''}`}
                  onClick={() => setConcentration(false)}
                >
                  Maintain
                </button>
                <button
                  className={`${styles.decisionBtn} ${decisions.dropConcentration ? styles.decisionBtnActiveDrop : ''}`}
                  onClick={() => setConcentration(true)}
                >
                  Drop
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {(endingSpells.length > 0 || endingBuffs.length > 0) && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>✺ Spells Ending</div>
          <div className={styles.sectionContent}>
            {endingSpells.map(s => (
              <div key={s.id} className={styles.spellEnding}>
                <span>{s.name} rider</span>
                <span className={styles.spellEndingNote}>expires (auto)</span>
              </div>
            ))}
            {endingBuffs.map(s => (
              <div key={s.id} className={styles.spellEnding}>
                <span>{s.name}</span>
                <span className={styles.spellEndingNote}>buff drops (auto)</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className={styles.footer}>
        <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
        <button className={styles.confirmBtn} onClick={confirm}>Confirm Next Turn ▶</button>
      </div>
    </div>
  )
}
