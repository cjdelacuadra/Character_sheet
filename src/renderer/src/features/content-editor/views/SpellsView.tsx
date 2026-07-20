import { useState } from 'react'
import { CatalogShell, type CatalogAdapter } from '../CatalogShell'
import { SpellEditorForm } from '../forms/SpellEditorForm'
import { spellsAdapter } from '../adapters'
import { SPELL_BY_ID, SCHOOLS, type SpellEntry } from '@/shared/data/spellData'
import styles from '../ContentEditor.module.css'

export function SpellsView() {
  const [school, setSchool] = useState('')

  const adapter: CatalogAdapter<SpellEntry> = {
    ...spellsAdapter,
    list: () => spellsAdapter.list().filter(e => !school || SPELL_BY_ID[e.id]?.school === school),
  }

  return (
    <CatalogShell
      adapter={adapter}
      filterBar={
        <select className={styles.filterSelect} value={school} onChange={e => setSchool(e.target.value)}>
          <option value="">All schools</option>
          {SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      }
      renderForm={(draft, setDraft) => <SpellEditorForm key={draft.id} draft={draft} onChange={setDraft} />}
    />
  )
}
