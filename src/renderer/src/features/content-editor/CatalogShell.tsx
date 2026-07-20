import { useState, type ReactNode } from 'react'
import styles from './ContentEditor.module.css'

export interface CatalogEntrySummary {
  id: string
  name: string
  tag?: string
}

/** Everything a catalog view needs to plug into the shell. */
export interface CatalogAdapter<T extends { id: string }> {
  list(): CatalogEntrySummary[]
  get(id: string): T | undefined
  blank(): T
  save(entry: T): Promise<void> | void
  remove(id: string): Promise<void> | void
}

interface Props<T extends { id: string }> {
  adapter: CatalogAdapter<T>
  renderForm: (draft: T, setDraft: (next: T) => void) => ReactNode
  /** Optional filter controls rendered under the search row, above the entry list. */
  filterBar?: ReactNode
}

/**
 * Generic catalog CRUD layout: searchable entry list on the left, the
 * type-specific form on the right, New | Save | Save As | Delete below.
 * The catalogs are module-level mutable arrays, so a version bump after
 * each mutation is all the refresh the list needs.
 */
export function CatalogShell<T extends { id: string }>({ adapter, renderForm, filterBar }: Props<T>) {
  const [, setVersion] = useState(0)
  const bump = () => setVersion(v => v + 1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<T | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  const entries = adapter.list().filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.id.includes(search.toLowerCase()))

  function select(id: string) {
    const entry = adapter.get(id)
    if (!entry) return
    setSelectedId(id)
    setDraft(structuredClone(entry))
    setStatus('')
  }

  function handleNew() {
    setSelectedId(null)
    setDraft(adapter.blank())
    setStatus('')
  }

  async function handleSave() {
    if (!draft) return
    await adapter.save(draft)
    setSelectedId(draft.id)
    setStatus('Saved.')
    bump()
  }

  async function handleSaveAs() {
    if (!draft) return
    const copy = { ...draft, id: draft.id === selectedId ? `${draft.id}-copy` : draft.id }
    await adapter.save(copy)
    setSelectedId(copy.id)
    setDraft(copy)
    setStatus(`Saved as ${copy.id}.`)
    bump()
  }

  async function handleDelete() {
    if (!selectedId) return
    if (!window.confirm(`Delete "${selectedId}"?\n\nThis removes it from the catalog for every character.`)) return
    await adapter.remove(selectedId)
    setSelectedId(null)
    setDraft(null)
    bump()
  }

  return (
    <>
      <div className={styles.list}>
        <div className={styles.listTools}>
          <input
            className={styles.search}
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className={styles.newBtn} onClick={handleNew}>+ New</button>
        </div>
        {filterBar && <div className={styles.filterBar}>{filterBar}</div>}
        <div className={styles.entries}>
          {entries.map(e => (
            <button
              key={e.id}
              className={`${styles.entry} ${e.id === selectedId ? styles.entrySelected : ''}`}
              onClick={() => select(e.id)}
            >
              <span className={styles.entryName}>{e.name}</span>
              {e.tag && <span className={styles.entryTag}>{e.tag}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.detail}>
        {draft ? (
          <>
            <div className={styles.detailBody}>{renderForm(draft, setDraft)}</div>
            <div className={styles.detailActions}>
              <button className={`${styles.actionBtn} ${styles.saveBtn}`} onClick={handleSave}>Save</button>
              <button className={styles.actionBtn} onClick={handleSaveAs}>Save As</button>
              {status && <span className={styles.statusMsg}>{status}</span>}
              <button
                className={`${styles.actionBtn} ${styles.deleteBtn}`}
                onClick={handleDelete}
                disabled={!selectedId}
              >Delete</button>
            </div>
          </>
        ) : (
          <div className={styles.detailEmpty}>Select an entry or create a new one.</div>
        )}
      </div>
    </>
  )
}
