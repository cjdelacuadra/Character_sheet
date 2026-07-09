import { useState } from 'react'
import { useAppStore } from '@/app/store'
import { CatalogShell, type CatalogAdapter } from '@/features/content-editor/CatalogShell'
import { JsonForm } from '@/features/content-editor/JsonForm'
import {
  featsAdapter, conditionsAdapter, racesAdapter, actionsAdapter,
  spellsAdapter, buffsAdapter, summonsAdapter,
} from '@/features/content-editor/adapters'
import type { ActionDef } from '@/shared/data/actionsData'
import { SHOP_CATALOGUE } from '@/shared/data/equipment/catalogue'
import { ItemEditorPanel } from '@/features/inventory/ItemEditorPanel'
import styles from '@/features/content-editor/ContentEditor.module.css'

const VIEWS = [
  'Feats', 'Equipment', 'Spells', 'Summons', 'Conditions', 'Buffs', 'Actions', 'Races',
] as const
type ViewKey = typeof VIEWS[number]

/** Generic view = shell + (for now) the JSON fallback form; Phase 3 swaps in dedicated forms. */
function GenericView<T extends { id: string }>({ adapter }: { adapter: CatalogAdapter<T> }) {
  return (
    <CatalogShell
      adapter={adapter}
      renderForm={(draft, setDraft) => <JsonForm key={draft.id} draft={draft} onChange={setDraft} />}
    />
  )
}

/** Actions view: one catalog, tabbed by action-economy type. */
function ActionsView() {
  const TABS = ['Action', 'Bonus Action', 'Reaction'] as const
  const [tab, setTab] = useState<typeof TABS[number]>('Action')
  const filtered: CatalogAdapter<ActionDef> = {
    ...actionsAdapter,
    // 'Free' actions ride along with the Action tab.
    list: () => actionsAdapter.list().filter(e => {
      const type = (actionsAdapter.get(e.id))?.type
      return tab === 'Action' ? (type === 'Action' || type === 'Free') : type === tab
    }),
    blank: () => ({ ...actionsAdapter.blank(), type: tab }),
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
          renderForm={(draft, setDraft) => <JsonForm key={draft.id} draft={draft} onChange={setDraft} />}
        />
      </div>
    </div>
  )
}

/** Equipment view: picker over the shop catalog + the existing full item editor. */
function EquipmentView() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const entries = SHOP_CATALOGUE.filter(i =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.id.includes(search.toLowerCase()))
  return (
    <>
      <div className={styles.list}>
        <div className={styles.listTools}>
          <input className={styles.search} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className={styles.entries}>
          {entries.map(i => (
            <button
              key={i.id}
              className={`${styles.entry} ${i.id === selectedId ? styles.entrySelected : ''}`}
              onClick={() => setSelectedId(i.id)}
            >
              <span className={styles.entryName}>{i.name}</span>
              <span className={styles.entryTag}>{i.kind}</span>
            </button>
          ))}
        </div>
      </div>
      <div className={styles.detail}>
        {selectedId ? (
          <div className={styles.detailBody}>
            <ItemEditorPanel key={selectedId} itemId={selectedId} onClose={() => setSelectedId(null)} />
          </div>
        ) : (
          <div className={styles.detailEmpty}>Select an item to edit. Use Save As inside the editor to create new items.</div>
        )}
      </div>
    </>
  )
}

export function ContentEditorScreen() {
  const setContentEditorOpen = useAppStore(s => s.setContentEditorOpen)
  const [view, setView] = useState<ViewKey>('Feats')

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => setContentEditorOpen(false)}>← Characters</button>
        <h1 className={styles.title}>Content Editor</h1>
      </header>
      <div className={styles.body}>
        <nav className={styles.nav}>
          {VIEWS.map(v => (
            <button
              key={v}
              className={`${styles.navBtn} ${v === view ? styles.navBtnActive : ''}`}
              onClick={() => setView(v)}
            >
              {v}
            </button>
          ))}
        </nav>
        <div className={styles.view}>
          {view === 'Feats' && <GenericView adapter={featsAdapter} />}
          {view === 'Equipment' && <EquipmentView />}
          {view === 'Spells' && <GenericView adapter={spellsAdapter} />}
          {view === 'Summons' && <GenericView adapter={summonsAdapter} />}
          {view === 'Conditions' && <GenericView adapter={conditionsAdapter} />}
          {view === 'Buffs' && <GenericView adapter={buffsAdapter} />}
          {view === 'Actions' && <ActionsView />}
          {view === 'Races' && <GenericView adapter={racesAdapter} />}
        </div>
      </div>
    </div>
  )
}
