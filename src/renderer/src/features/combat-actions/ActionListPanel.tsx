import type { Character } from '@/entities/character/types'
import { getAvailableActions, type ActionDef } from '@/domain/rules'
import { CLASS_BY_ID, type ResourceDef } from '@/shared/data/classData'
import { SUBCLASS_BY_ID } from '@/shared/data/subclassData'
import { mod } from '@/shared/data/charCalculations'
import { useAppStore } from '@/app/store'
import type { EconomyType } from '@/app/store/turnSlice'
import { ResourcesPanel } from '@/features/resources/ResourcesPanel'
import { RESOURCE_EFFECTS } from '@/shared/data/resourceEffects'
import styles from './ActionListPanel.module.css'

function actionTypeToEconomy(type: ActionDef['type']): EconomyType | null {
  if (type === 'Action') return 'action'
  if (type === 'Bonus Action') return 'bonus'
  if (type === 'Reaction') return 'reaction'
  return null
}

interface Props {
  character: Character
  selectedAction: string | null
  onSelectAction: (name: string | null) => void
  update: (patch: Partial<Character>) => void
}

export function ActionListPanel({ character: char, selectedAction, onSelectAction, update }: Props) {
  const availableActions = getAvailableActions(char)
  const classDef = CLASS_BY_ID[char.classId]
  const subclassDef = char.subclass ? SUBCLASS_BY_ID[char.subclass] : null
  const subclassLabel = subclassDef?.classId === char.classId ? subclassDef.label : null
  const spendEconomy = useAppStore(s => s.spendEconomy)
  const grantEconomy = useAppStore(s => s.grantEconomy)
  const setAttacked = useAppStore(s => s.setAttacked)
  const setDisengaged = useAppStore(s => s.setDisengaged)
  const turnState = useAppStore(s => s.turnStates[char.id])

  function actionPriority(a: ActionDef): number {
    if (a.name === 'Attack' || a.name === 'Off-Hand Attack' || a.name.startsWith('Opportunity Attack')) return 0
    if (a.name.startsWith('Cast a Spell')) return 1
    if (a.classOnly) return 2
    return 3
  }

  const actionGroups = [
    { type: 'Action' as const,       label: 'Actions',       items: availableActions.filter(a => a.type === 'Action').sort((a, b) => actionPriority(a) - actionPriority(b)) },
    { type: 'Bonus Action' as const, label: 'Bonus Actions', items: availableActions.filter(a => a.type === 'Bonus Action').sort((a, b) => actionPriority(a) - actionPriority(b)) },
    { type: 'Reaction' as const,     label: 'Reactions',     items: availableActions.filter(a => a.type === 'Reaction').sort((a, b) => actionPriority(a) - actionPriority(b)) },
  ].filter(g => g.items.length > 0)

  function isActionDepleted(action: ActionDef): boolean {
    if (!action.resourceKey || !action.resourceCost) return false
    const res = char.resources[action.resourceKey]
    if (!res) return false
    return (res.total - res.used) < action.resourceCost
  }

  function labelClass(type: ActionDef['type']) {
    if (type === 'Action') return styles.labelAction
    if (type === 'Bonus Action') return styles.labelBonus
    if (type === 'Reaction') return styles.labelReaction
    return ''
  }

  function accentClass(type: ActionDef['type']) {
    if (type === 'Action') return styles.selAction
    if (type === 'Bonus Action') return styles.selBonus
    if (type === 'Reaction') return styles.selReaction
    return ''
  }

  function computeTotal(resDef: ResourceDef): number {
    if (resDef.scalingTable) {
      const sorted = Object.entries(resDef.scalingTable)
        .map(([k, v]) => [parseInt(k, 10), v] as [number, number | undefined])
        .sort(([a], [b]) => a - b)
      let total = 0
      for (const [k, v] of sorted) {
        if (k <= char.level && v !== undefined) total = v
        else if (k > char.level) break
      }
      return total
    }
    if (resDef.fixedTotal !== undefined) return resDef.fixedTotal
    if (resDef.scalingPer === 'level') return char.level
    if (resDef.scalingPer === 'chamod') return Math.max(1, mod(char.abilityScores.cha))
    if (resDef.scalingPer === 'wismod') return Math.max(1, mod(char.abilityScores.wis))
    if (resDef.scalingPer === 'conmod') return Math.max(1, mod(char.abilityScores.con))
    return 0
  }

  function getGroupChips(items: ActionDef[]) {
    const seen = new Set<string>()
    const chips: { key: string; resDef: ResourceDef; total: number; used: number }[] = []
    for (const action of items) {
      if (!action.resourceKey || seen.has(action.resourceKey)) continue
      seen.add(action.resourceKey)
      const resDef = classDef?.resources?.find(r => r.name === action.resourceKey)
      if (!resDef) continue
      const total = computeTotal(resDef)
      if (total <= 0) continue
      const stored = char.resources[action.resourceKey]
      chips.push({ key: action.resourceKey, resDef, total, used: stored?.used ?? 0 })
    }
    return chips
  }

  function spendResource(key: string, total: number, actionType?: ActionDef['type']) {
    const res = char.resources[key] ?? { used: 0, total }
    if (res.used >= res.total) return
    const effect = RESOURCE_EFFECTS.find(entry => entry.resourceKey === key)
    const patch: Partial<Character> = {
      resources: { ...char.resources, [key]: { used: res.used + 1, total: res.total } },
    }
    if (effect?.setsFlag) {
      patch[effect.setsFlag] = true
    }
    update(patch)
    // Action Surge grants +1 action this turn rather than consuming one
    if (key === 'Action Surge') {
      grantEconomy(char.id, 'action', 1)
      return
    }
    if (effect?.economy) {
      spendEconomy(char.id, effect.economy)
      return
    }
    if (actionType) {
      const econ = actionTypeToEconomy(actionType)
      if (econ) spendEconomy(char.id, econ)
    }
  }

  function recoverResource(key: string, total: number) {
    const res = char.resources[key] ?? { used: 0, total }
    if (res.used === 0) return
    update({ resources: { ...char.resources, [key]: { used: res.used - 1, total: res.total } } })
  }

  function isActionPrereqBlocked(action: ActionDef): boolean {
    if (action.name === 'Steady Aim' && turnState?.movedThisTurn) return true
    return action.requiresAttackThisTurn === true && !turnState?.attackedThisTurn
  }

  function actionBlockedTitle(action: ActionDef): string | undefined {
    if (action.name === 'Steady Aim' && turnState?.movedThisTurn) return 'Requires that you have not moved this turn'
    if (action.requiresAttackThisTurn === true && !turnState?.attackedThisTurn) return 'Requires the Attack action this turn'
    return undefined
  }

  function handleActionClick(action: ActionDef, isSelected: boolean) {
    if (isSelected) {
      onSelectAction(null)
      return
    }
    if (isActionPrereqBlocked(action) || isActionDepleted(action)) return
    if (action.name === 'Disengage') {
      setDisengaged(char.id, true)
      spendEconomy(char.id, 'action')
    }
    onSelectAction(action.name)
  }

  return (
    <>
      <ResourcesPanel character={char} update={update} />
      {actionGroups.map(({ type, label, items }) => {
        const chips = getGroupChips(items)
        return (
          <section key={type} className={styles.section}>
            <div className={styles.sectionHead}>
              <span className={`${styles.sectionLabel} ${labelClass(type)}`}>{label}</span>
              <span className={styles.actionTypeCount}>{items.length}</span>
            </div>
            {chips.length > 0 && (
              <div className={styles.chipGroup}>
                {subclassLabel && <span className={styles.subclassNote}>{subclassLabel}</span>}
                {chips.map(({ key, resDef, total, used }) => {
                  const remaining = total - used
                  return (
                    <div key={key} className={styles.resourceChip}>
                      <span className={styles.chipName}>{key}</span>
                      <div className={styles.chipPips}>
                        {Array.from({ length: Math.min(total, 10) }).map((_, i) => (
                          <button
                            key={i}
                            className={`${styles.chipPip} ${i < remaining ? styles.chipPipFull : styles.chipPipEmpty}`}
                            onClick={() => i < remaining ? spendResource(key, total, type) : recoverResource(key, total)}
                            title={i < remaining ? 'Use' : 'Recover'}
                          />
                        ))}
                        {total > 10 && <span className={styles.chipCount}>{remaining}/{total}</span>}
                      </div>
                      <span className={styles.chipRecovery}>
                        {resDef.recoverOn === 'short' ? 'SR' : resDef.recoverOn === 'long' ? 'LR' : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
            <div className={styles.actionList}>
              {items.map(action => {
                const depleted = isActionDepleted(action)
                const prereqBlocked = isActionPrereqBlocked(action)
                const isSelected = selectedAction === action.name
                return (
                  <button
                    key={action.name}
                    className={[
                      styles.actionCompact,
                      depleted || prereqBlocked ? styles.actionDepleted : '',
                      isSelected ? `${styles.actionCompactSel} ${accentClass(type)}` : '',
                    ].join(' ')}
                    disabled={depleted || prereqBlocked}
                    title={actionBlockedTitle(action)}
                    onClick={() => handleActionClick(action, isSelected)}
                  >
                    <span className={styles.actionName}>{action.name}</span>
                    {action.resourceKey && (
                      <span className={styles.actionCost}>
                        {action.resourceCost} {action.resourceKey}
                      </span>
                    )}
                    <span className={styles.actionShort}>{action.short}</span>
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </>
  )
}
