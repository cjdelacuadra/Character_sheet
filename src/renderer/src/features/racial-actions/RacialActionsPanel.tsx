import { useState } from 'react'
import type { Character } from '@/entities/character/types'
import type { RacialAction } from '@/shared/data/raceData'
import { RACE_BY_ID } from '@/shared/data/raceData'
import { resolveRacialFormula, resolveRacialMaxUses } from '@/shared/data/racialActions'
import { useAppStore } from '@/app/store'
import { Panel } from '@/ui/Panel'
import styles from './RacialActionsPanel.module.css'

interface Props {
  character: Character
  update: (patch: Partial<Character>) => void
}

const COST_LABEL: Record<RacialAction['cost'], string> = {
  action: 'Action', bonus: 'Bonus', reaction: 'Reaction', free: 'Free', passive: 'Passive',
}

export function RacialActionsPanel({ character: char, update }: Props) {
  const useEconomy = useAppStore(s => s.useEconomy)
  const [expanded, setExpanded] = useState<string | null>(null)

  const raceDef = RACE_BY_ID[char.race]
  const actions = (raceDef?.racialActions ?? []).filter(a => (a.minLevel ?? 1) <= char.level)
  if (actions.length === 0) return null

  function use(a: RacialAction) {
    const max = resolveRacialMaxUses(a.maxUses, char.level)
    const used = char.racialActionUses?.[a.id] ?? 0
    if (a.recharge && used >= max) return

    const patch: Partial<Character> = {}
    if (a.recharge) patch.racialActionUses = { ...(char.racialActionUses ?? {}), [a.id]: used + 1 }
    if (a.grantsTempHp) {
      const amt = resolveRacialFormula(a.grantsTempHp, char)
      patch.hitPoints = { ...char.hitPoints, temp: Math.max(char.hitPoints.temp, amt) }
    }
    if (a.selfHeal) {
      const amt = resolveRacialFormula(a.selfHeal, char)
      const base = patch.hitPoints ?? char.hitPoints
      patch.hitPoints = { ...base, current: Math.min(char.hitPoints.max, base.current + amt) }
    }
    if (Object.keys(patch).length > 0) update(patch)
    if (a.cost === 'action' || a.cost === 'bonus' || a.cost === 'reaction') useEconomy(char.id, a.cost)
  }

  return (
    <Panel label="Racial Actions">
      {actions.map(a => {
          const max = resolveRacialMaxUses(a.maxUses, char.level)
          const used = char.racialActionUses?.[a.id] ?? 0
          const left = max - used
          const exhausted = !!a.recharge && left <= 0
          const isOpen = expanded === a.id
          return (
            <div key={a.id} className={styles.card}>
              <button className={styles.head} onClick={() => setExpanded(isOpen ? null : a.id)}>
                <span className={styles.name}>{a.name}</span>
                <span className={styles.meta}>
                  {a.recharge && <span className={styles.uses}>{left}/{max}</span>}
                  <span className={styles.costBadge}>{COST_LABEL[a.cost]}</span>
                </span>
              </button>
              {isOpen && <p className={styles.desc}>{a.description}</p>}
              {a.cost !== 'passive' && (
                <button
                  className={styles.useBtn}
                  disabled={exhausted}
                  onClick={() => use(a)}
                  title={exhausted ? 'No uses remaining' : 'Use'}
                >
                  {exhausted ? 'Expended' : `Use${a.recharge ? ` (${a.recharge === 'short' ? 'SR' : 'LR'})` : ''}`}
                </button>
              )}
            </div>
          )
        })}
    </Panel>
  )
}
