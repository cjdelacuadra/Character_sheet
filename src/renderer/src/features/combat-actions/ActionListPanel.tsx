import type { Character } from '@/entities/character/types'
import { getAvailableActions, type ActionDef } from '@/domain/rules'
import { CLASS_BY_ID, type ResourceDef } from '@/shared/data/classData'
import { SUBCLASS_BY_ID } from '@/shared/data/subclassData'
import { mod } from '@/shared/data/charCalculations'
import styles from './ActionListPanel.module.css'

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

  const actionGroups = [
    { type: 'Action' as const,       label: 'Actions',       items: availableActions.filter(a => a.type === 'Action') },
    { type: 'Bonus Action' as const, label: 'Bonus Actions', items: availableActions.filter(a => a.type === 'Bonus Action') },
    { type: 'Reaction' as const,     label: 'Reactions',     items: availableActions.filter(a => a.type === 'Reaction') },
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

  function useResource(key: string, total: number) {
    const res = char.resources[key] ?? { used: 0, total }
    if (res.used >= res.total) return
    update({ resources: { ...char.resources, [key]: { used: res.used + 1, total: res.total } } })
  }

  function recoverResource(key: string, total: number) {
    const res = char.resources[key] ?? { used: 0, total }
    if (res.used === 0) return
    update({ resources: { ...char.resources, [key]: { used: res.used - 1, total: res.total } } })
  }

  return (
    <>
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
                            onClick={() => i < remaining ? useResource(key, total) : recoverResource(key, total)}
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
                const isSelected = selectedAction === action.name
                return (
                  <button
                    key={action.name}
                    className={[
                      styles.actionCompact,
                      depleted ? styles.actionDepleted : '',
                      isSelected ? `${styles.actionCompactSel} ${accentClass(type)}` : '',
                    ].join(' ')}
                    onClick={() => onSelectAction(isSelected ? null : action.name)}
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
