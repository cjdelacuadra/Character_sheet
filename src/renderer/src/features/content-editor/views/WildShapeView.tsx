import { useState } from 'react'
import { CatalogShell, type CatalogAdapter } from '../CatalogShell'
import { BeastEditorForm } from '../forms/BeastEditorForm'
import { beastsAdapter } from '../adapters'
import { WILD_SHAPE_BEASTS, type WildShapeBeast } from '@/shared/data/wildShapeBeasts'
import { formatCR } from '../groupHelpers'
import styles from '../ContentEditor.module.css'

const SOURCES = ['All', 'PHB', 'TCoE', 'Custom'] as const

function beastSource(b: WildShapeBeast): string {
  return b.source ?? 'PHB'
}

export function WildShapeView() {
  const [cr, setCr] = useState('')
  const [source, setSource] = useState<typeof SOURCES[number]>('All')
  const [customSearch, setCustomSearch] = useState('')

  const crOptions = [...new Set(WILD_SHAPE_BEASTS.map(b => b.cr))].sort((a, b) => a - b)
  const byId = Object.fromEntries(WILD_SHAPE_BEASTS.map(b => [b.id, b]))

  const adapter: CatalogAdapter<WildShapeBeast> = {
    ...beastsAdapter,
    list: () => beastsAdapter.list().filter(e => {
      const beast = byId[e.id]
      if (!beast) return true
      if (cr && String(beast.cr) !== cr) return false
      const s = beastSource(beast)
      if (source === 'PHB' || source === 'TCoE') {
        if (s !== source) return false
      } else if (source === 'Custom') {
        if (s === 'PHB' || s === 'TCoE') return false
        if (customSearch && !s.toLowerCase().includes(customSearch.toLowerCase())) return false
      }
      return true
    }),
  }

  return (
    <CatalogShell
      adapter={adapter}
      filterBar={
        <>
          <select className={styles.filterSelect} value={cr} onChange={e => setCr(e.target.value)}>
            <option value="">All CRs</option>
            {crOptions.map(c => <option key={c} value={c}>CR {formatCR(c)}</option>)}
          </select>
          <select
            className={styles.filterSelect}
            value={source}
            onChange={e => setSource(e.target.value as typeof SOURCES[number])}
          >
            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {source === 'Custom' && (
            <input
              className={styles.filterSelect}
              placeholder="search source…"
              value={customSearch}
              onChange={e => setCustomSearch(e.target.value)}
            />
          )}
        </>
      }
      renderForm={(draft, setDraft) => <BeastEditorForm key={draft.id} draft={draft} onChange={setDraft} />}
    />
  )
}
