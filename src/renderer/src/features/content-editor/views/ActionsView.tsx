import { useState } from 'react'
import { CatalogShell, type CatalogAdapter } from '../CatalogShell'
import { ActionEditorForm } from '../forms/ActionEditorForm'
import { actionsAdapter } from '../adapters'
import type { ActionDef } from '@/shared/data/actionsData'
import { CLASSES } from '@/shared/data/classData'
import styles from '../ContentEditor.module.css'

const TABS = ['Action', 'Bonus Action', 'Reaction'] as const

/** Actions view: one catalog, tabbed by action-economy type, filterable to a single class. */
export function ActionsView() {
  const [tab, setTab] = useState<typeof TABS[number]>('Action')
  const [classFilter, setClassFilter] = useState('')

  const filtered: CatalogAdapter<ActionDef> = {
    ...actionsAdapter,
    // 'Free' actions ride along with the Action tab.
    list: () => actionsAdapter.list().filter(e => {
      const def = actionsAdapter.get(e.id)
      const typeMatch = tab === 'Action' ? (def?.type === 'Action' || def?.type === 'Free') : def?.type === tab
      if (!typeMatch) return false
      // A class filter narrows to that class's own actions only — generic
      // (always-available) actions drop out, per "class actions, not generic".
      if (classFilter) return def?.classOnly === classFilter
      return true
    }),
    blank: () => ({ ...actionsAdapter.blank(), type: tab, classOnly: classFilter || undefined }),
  }

  return (
    <div className={styles.detail}>
      <div className={styles.tabs}>
        {TABS.map(t => (
          <button key={t} className={`${styles.tab} ${t === tab ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className={styles.view}>
        <CatalogShell
          key={tab}
          adapter={filtered}
          filterBar={
            <select className={styles.filterSelect} value={classFilter} onChange={e => setClassFilter(e.target.value)}>
              <option value="">All (incl. generic)</option>
              {CLASSES.map(c => <option key={c.id} value={c.id}>{c.id} only</option>)}
            </select>
          }
          renderForm={(draft, setDraft) => <ActionEditorForm key={draft.id} draft={draft} onChange={setDraft} />}
        />
      </div>
    </div>
  )
}
