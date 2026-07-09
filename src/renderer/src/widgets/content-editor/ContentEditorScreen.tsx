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
import { SummonEditorForm } from '@/features/summons/SummonEditorForm'
import { FeatEditorForm } from '@/features/content-editor/forms/FeatEditorForm'
import { ConditionEditorForm } from '@/features/content-editor/forms/ConditionEditorForm'
import { ActionEditorForm } from '@/features/content-editor/forms/ActionEditorForm'
import { RaceEditorForm } from '@/features/content-editor/forms/RaceEditorForm'
import { SpellEditorForm } from '@/features/content-editor/forms/SpellEditorForm'
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
          renderForm={(draft, setDraft) => <ActionEditorForm key={draft.id} draft={draft} onChange={setDraft} />}
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

/** Summons view: catalog list + the existing SummonEditorForm (its own save). */
function SummonsView() {
  const [, setVersion] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const entries = summonsAdapter.list().filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()))
  const selected = selectedId ? summonsAdapter.get(selectedId) : undefined

  async function handleDelete() {
    if (!selectedId) return
    if (!window.confirm(`Delete "${selectedId}"?`)) return
    await summonsAdapter.remove(selectedId)
    setSelectedId(null)
    setVersion(v => v + 1)
  }

  return (
    <>
      <div className={styles.list}>
        <div className={styles.listTools}>
          <input className={styles.search} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
          <button className={styles.newBtn} onClick={() => { setCreating(true); setSelectedId(null) }}>+ New</button>
        </div>
        <div className={styles.entries}>
          {entries.map(e => (
            <button key={e.id} className={`${styles.entry} ${e.id === selectedId ? styles.entrySelected : ''}`}
              onClick={() => { setSelectedId(e.id); setCreating(false) }}>
              <span className={styles.entryName}>{e.name}</span>
              {e.tag && <span className={styles.entryTag}>{e.tag}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.detail}>
        {(creating || selected) ? (
          <>
            <div className={styles.detailBody}>
              <SummonEditorForm
                key={creating ? 'new' : selectedId}
                initial={creating ? undefined : selected}
                onSave={async t => {
                  await summonsAdapter.save(t)
                  setSelectedId(t.id)
                  setCreating(false)
                  setVersion(v => v + 1)
                }}
                onCancel={() => { setCreating(false); setSelectedId(null) }}
              />
            </div>
            {!creating && (
              <div className={styles.detailActions}>
                <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={handleDelete}>Delete</button>
              </div>
            )}
          </>
        ) : (
          <div className={styles.detailEmpty}>Select a summon template or create a new one.</div>
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
          {view === 'Feats' && (
            <CatalogShell adapter={featsAdapter}
              renderForm={(draft, setDraft) => <FeatEditorForm key={draft.id} draft={draft} onChange={setDraft} />} />
          )}
          {view === 'Equipment' && <EquipmentView />}
          {view === 'Spells' && (
            <CatalogShell adapter={spellsAdapter}
              renderForm={(draft, setDraft) => <SpellEditorForm key={draft.id} draft={draft} onChange={setDraft} />} />
          )}
          {view === 'Summons' && <SummonsView />}
          {view === 'Conditions' && (
            <CatalogShell adapter={conditionsAdapter}
              renderForm={(draft, setDraft) => <ConditionEditorForm key={draft.id} draft={draft} onChange={setDraft} />} />
          )}
          {view === 'Buffs' && (
            <CatalogShell adapter={buffsAdapter}
              renderForm={(draft, setDraft) => <SpellEditorForm key={draft.id} draft={draft} onChange={setDraft} />} />
          )}
          {view === 'Actions' && <ActionsView />}
          {view === 'Races' && (
            <CatalogShell adapter={racesAdapter}
              renderForm={(draft, setDraft) => <RaceEditorForm key={draft.id} draft={draft} onChange={setDraft} />} />
          )}
        </div>
      </div>
    </div>
  )
}
