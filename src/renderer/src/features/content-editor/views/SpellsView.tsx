import { useState } from 'react'
import { CatalogShell, type CatalogAdapter } from '../CatalogShell'
import { SpellEditorForm } from '../forms/SpellEditorForm'
import { spellsAdapter } from '../adapters'
import { SPELLS, SPELL_BY_ID, SCHOOLS, type SpellEntry } from '@/shared/data/spellData'
import styles from '../ContentEditor.module.css'

type SortKey = 'level-asc' | 'level-desc' | 'school' | 'source'

export function SpellsView() {
  const [school, setSchool] = useState('')
  const [source, setSource] = useState('')
  const [sort, setSort] = useState<SortKey>('level-asc')

  // Source options built from whatever's actually in the data (unset = PHB).
  const sources = ['All', ...new Set(SPELLS.map(s => s.source ?? 'PHB'))]
    .sort((a, b) => (a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b)))

  const adapter: CatalogAdapter<SpellEntry> = {
    ...spellsAdapter,
    list: () =>
      spellsAdapter
        .list()
        .filter(e => {
          const spell = SPELL_BY_ID[e.id]
          if (!spell) return true
          if (school && spell.school !== school) return false
          if (source && source !== 'All' && (spell.source ?? 'PHB') !== source) return false
          return true
        })
        .sort((a, b) => {
          const sa = SPELL_BY_ID[a.id]
          const sb = SPELL_BY_ID[b.id]
          if (!sa || !sb) return 0
          switch (sort) {
            case 'level-desc':
              return sb.level - sa.level || sa.name.localeCompare(sb.name)
            case 'school':
              return sa.school.localeCompare(sb.school) || sa.level - sb.level || sa.name.localeCompare(sb.name)
            case 'source':
              return (sa.source ?? 'PHB').localeCompare(sb.source ?? 'PHB') || sa.level - sb.level || sa.name.localeCompare(sb.name)
            case 'level-asc':
            default:
              return sa.level - sb.level || sa.name.localeCompare(sb.name)
          }
        }),
  }

  return (
    <CatalogShell
      adapter={adapter}
      filterBar={
        <>
          <select className={styles.filterSelect} value={school} onChange={e => setSchool(e.target.value)}>
            <option value="">All schools</option>
            {SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className={styles.filterSelect} value={source || 'All'} onChange={e => setSource(e.target.value)}>
            {sources.map(s => <option key={s} value={s}>{s === 'All' ? 'All sources' : s}</option>)}
          </select>
          <select className={styles.filterSelect} value={sort} onChange={e => setSort(e.target.value as SortKey)}>
            <option value="level-asc">Level ↑</option>
            <option value="level-desc">Level ↓</option>
            <option value="school">School</option>
            <option value="source">Source</option>
          </select>
        </>
      }
      renderForm={(draft, setDraft) => <SpellEditorForm key={draft.id} draft={draft} onChange={setDraft} />}
    />
  )
}
