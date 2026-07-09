import { useState } from 'react'
import type { Character } from '@/entities/character/types'
import type { ActiveSummon } from '@/entities/summon/types'
import { Panel, PanelEmptyNote, PanelGroup, PanelRow, useCollapsedGroups } from '@/ui/Panel'
import { SummonCatalogModal } from './SummonCatalogModal'
import { SummonSprite } from './SummonSprite'
import styles from './SummonsPanel.module.css'

interface Props {
  character: Character
  selectedSummonId: string | null
  onSelectSummon: (id: string | null) => void
  onSummon: (templateId: string, count?: number, source?: { spellId?: string }) => void
  onClearAll: () => void
}

function groupByType(items: ActiveSummon[]): [string, ActiveSummon[]][] {
  const map = new Map<string, ActiveSummon[]>()
  for (const item of items) {
    const k = item.base.type
    const list = map.get(k)
    if (list) list.push(item)
    else map.set(k, [item])
  }
  return [...map.entries()]
}

export function SummonsPanel({ character: char, selectedSummonId, onSelectSummon, onSummon, onClearAll }: Props) {
  const [modal, setModal] = useState<'pick' | 'manage' | null>(null)
  const collapsedGroups = useCollapsedGroups()

  const summons = char.activeSummons
  const groups = groupByType(summons)
  const multipleGroups = groups.length > 1

  function renderSummon(s: ActiveSummon) {
    const hpPct = s.hp.max > 0 ? Math.max(0, Math.min(100, (s.hp.current / s.hp.max) * 100)) : 0
    const dead = s.hp.current <= 0
    return (
      <PanelRow
        key={s.id}
        selected={selectedSummonId === s.id}
        dim={dead}
        onClick={() => onSelectSummon(selectedSummonId === s.id ? null : s.id)}
      >
        <div className={styles.rowTop}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <SummonSprite templateId={s.templateId} type={s.base.type} size={20} />
            <span className={styles.rowName}>{s.label}</span>
          </span>
          <span className={styles.rowAc}>AC {s.base.ac}</span>
        </div>
        <div className={styles.rowHpBar}>
          <div
            className={styles.rowHpFill}
            style={{ width: `${hpPct}%`, background: hpPct > 50 ? 'var(--success)' : hpPct > 25 ? 'var(--warning)' : 'var(--danger)' }}
          />
        </div>
        <span className={styles.rowHpText}>{s.hp.current}/{s.hp.max}{s.hp.temp > 0 ? ` (+${s.hp.temp})` : ''}</span>
      </PanelRow>
    )
  }

  // Template management lives in the Content Editor; in-game only picks.
  const actions = [
    { label: '+ Summon', onClick: () => setModal('pick') },
    ...(summons.length > 0 ? [{ label: 'Clear', onClick: onClearAll, title: 'Dismiss all summons' }] : []),
  ]

  return (
    <Panel label="Summons" count={summons.length} actions={actions}>
      {summons.length === 0 && <PanelEmptyNote>No active summons</PanelEmptyNote>}
      {groups.map(([type, items]) => (
        <PanelGroup
          key={type}
          name={type}
          count={items.length}
          collapsed={collapsedGroups.isCollapsed(type)}
          onToggle={() => collapsedGroups.toggle(type)}
          showHeader={multipleGroups}
        >
          {items.map(renderSummon)}
        </PanelGroup>
      ))}

      {modal && (
        <SummonCatalogModal
          mode={modal}
          onPick={(templateId) => onSummon(templateId)}
          onClose={() => setModal(null)}
        />
      )}
    </Panel>
  )
}
