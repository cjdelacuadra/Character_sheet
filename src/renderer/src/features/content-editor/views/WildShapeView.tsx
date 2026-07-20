import { useState } from 'react'
import { CatalogShell, type CatalogAdapter } from '../CatalogShell'
import { BeastEditorForm } from '../forms/BeastEditorForm'
import { beastsAdapter } from '../adapters'
import { WILD_SHAPE_BEASTS, type WildShapeBeast } from '@/shared/data/wildShapeBeasts'
import { formatCR } from '../groupHelpers'
import styles from '../ContentEditor.module.css'

/** Wild Shape view: just CR + source — source options built from whatever's actually in the data. */
export function WildShapeView() {
  const [cr, setCr] = useState('')
  const [source, setSource] = useState('')

  const crOptions = [...new Set(WILD_SHAPE_BEASTS.map(b => b.cr))].sort((a, b) => a - b)
  const sources = ['All', ...new Set(WILD_SHAPE_BEASTS.map(b => b.source ?? 'PHB'))]
    .sort((a, b) => (a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b)))
  const byId = Object.fromEntries(WILD_SHAPE_BEASTS.map(b => [b.id, b]))

  const adapter: CatalogAdapter<WildShapeBeast> = {
    ...beastsAdapter,
    list: () => beastsAdapter.list().filter(e => {
      const beast = byId[e.id]
      if (!beast) return true
      if (cr && String(beast.cr) !== cr) return false
      if (source && source !== 'All' && (beast.source ?? 'PHB') !== source) return false
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
          <select className={styles.filterSelect} value={source || 'All'} onChange={e => setSource(e.target.value)}>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </>
      }
      renderForm={(draft, setDraft) => <BeastEditorForm key={draft.id} draft={draft} onChange={setDraft} />}
    />
  )
}
