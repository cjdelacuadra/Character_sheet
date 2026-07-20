import { useState } from 'react'
import { CatalogShell, type CatalogAdapter } from '../CatalogShell'
import { RaceEditorForm } from '../forms/RaceEditorForm'
import { racesAdapter } from '../adapters'
import { RACES, RACE_BY_ID, type RaceDef } from '@/shared/data/raceData'
import styles from '../ContentEditor.module.css'

export function RacesView() {
  const [source, setSource] = useState('')

  const sources = ['All', ...new Set(RACES.map(r => r.source ?? 'PHB'))]
    .sort((a, b) => (a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b)))

  const adapter: CatalogAdapter<RaceDef> = {
    ...racesAdapter,
    list: () => racesAdapter.list().filter(e =>
      !source || source === 'All' || (RACE_BY_ID[e.id]?.source ?? 'PHB') === source),
  }

  return (
    <CatalogShell
      adapter={adapter}
      filterBar={
        <select className={styles.filterSelect} value={source || 'All'} onChange={e => setSource(e.target.value)}>
          {sources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      }
      renderForm={(draft, setDraft) => <RaceEditorForm key={draft.id} draft={draft} onChange={setDraft} />}
    />
  )
}
