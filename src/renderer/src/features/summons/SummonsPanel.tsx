import { useState } from 'react'
import type { Character } from '@/entities/character/types'
import type { ActiveSummon } from '@/entities/summon/types'
import { SummonCatalogModal } from './SummonCatalogModal'
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
  // todo: groups colaplse state should be lifted to parent to survive modal open/close (defaults to all collapsed when opening app)
  const [modal, setModal] = useState<'pick' | 'manage' | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const summons = char.activeSummons
  const groups = groupByType(summons)
  const multipleGroups = groups.length > 1

  function toggleGroup(type: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  function renderSummon(s: ActiveSummon) {
    const hpPct = s.hp.max > 0 ? Math.max(0, Math.min(100, (s.hp.current / s.hp.max) * 100)) : 0
    const dead = s.hp.current <= 0
    return (
      <button
        key={s.id}
        className={`${styles.row} ${selectedSummonId === s.id ? styles.rowSelected : ''} ${dead ? styles.rowDead : ''}`}
        onClick={() => onSelectSummon(selectedSummonId === s.id ? null : s.id)}
      >
        <div className={styles.rowTop}>
          <span className={styles.rowName}>{s.label}</span>
          <span className={styles.rowAc}>AC {s.base.ac}</span>
        </div>
        <div className={styles.rowHpBar}>
          <div
            className={styles.rowHpFill}
            style={{ width: `${hpPct}%`, background: hpPct > 50 ? 'var(--success)' : hpPct > 25 ? 'var(--warning)' : 'var(--danger)' }}
          />
        </div>
        <span className={styles.rowHpText}>{s.hp.current}/{s.hp.max}{s.hp.temp > 0 ? ` (+${s.hp.temp})` : ''}</span>
      </button>
    )
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <span className={styles.sectionLabel}>Summons {summons.length > 0 && `(${summons.length})`}</span>
        <div className={styles.headActions}>
          <button className={styles.headBtn} onClick={() => setModal('pick')}>+ Summon</button>
          <button className={styles.headBtn} onClick={() => setModal('manage')}>Catalog</button>
          {summons.length > 0 && (
            <button className={styles.headBtn} onClick={onClearAll} title="Dismiss all summons">Clear</button>
          )}
        </div>
      </div>

      <div className={styles.list}>
        {summons.length === 0 && <span className={styles.emptyNote}>No active summons</span>}
        {groups.map(([type, items]) => (
          <div key={type} className={styles.group}>
            {multipleGroups && (
              <button className={styles.groupHeader} onClick={() => toggleGroup(type)}>
                <span className={styles.groupArrow}>{collapsed.has(type) ? '▶' : '▼'}</span>
                <span className={styles.groupName}>{type}</span>
                <span className={styles.groupCount}>{items.length}</span>
              </button>
            )}
            {!collapsed.has(type) && items.map(renderSummon)}
          </div>
        ))}
      </div>

      {modal && (
        <SummonCatalogModal
          mode={modal}
          onPick={(templateId) => onSummon(templateId)}
          onClose={() => setModal(null)}
        />
      )}
    </section>
  )
}
