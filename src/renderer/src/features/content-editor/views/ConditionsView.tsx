import { useState } from 'react'
import { CatalogShell, type CatalogAdapter } from '../CatalogShell'
import { ConditionEditorForm } from '../forms/ConditionEditorForm'
import { conditionsAdapter } from '../adapters'
import type { Condition, ConditionCategory } from '@/entities/condition/types'
import styles from '../ContentEditor.module.css'

const FILTERS: { key: 'all' | ConditionCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'buff', label: 'Buff' },
  { key: 'debuff', label: 'Debuff' },
  { key: 'neutral', label: 'Neutral' },
]

export function ConditionsView() {
  const [filter, setFilter] = useState<'all' | ConditionCategory>('all')

  const adapter: CatalogAdapter<Condition> = {
    ...conditionsAdapter,
    list: () => conditionsAdapter.list().filter(e => filter === 'all' || e.tag === filter),
  }

  return (
    <CatalogShell
      adapter={adapter}
      filterBar={
        <>
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={`${styles.filterChip} ${filter === f.key ? styles.filterChipActive : ''}`}
              onClick={() => setFilter(f.key)}
            >{f.label}</button>
          ))}
        </>
      }
      renderForm={(draft, setDraft) => <ConditionEditorForm key={draft.id} draft={draft} onChange={setDraft} />}
    />
  )
}
