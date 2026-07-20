import { useState } from 'react'
import { summonsAdapter } from '../adapters'
import { groupBy } from '../groupHelpers'
import { SummonEditorForm } from '@/features/summons/SummonEditorForm'
import type { CatalogEntrySummary } from '../CatalogShell'
import styles from '../ContentEditor.module.css'

/** Summons view: catalog list grouped by type (same as the in-game summoning panel), + the existing SummonEditorForm. */
export function SummonsView() {
  const [, setVersion] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const entries = summonsAdapter.list().filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()))
  const selected = selectedId ? summonsAdapter.get(selectedId) : undefined

  const groups = search ? null : groupBy(entries, e => e.tag ?? 'other')
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(summonsAdapter.list().map(e => e.tag ?? 'other'))
  )

  function toggleGroup(type: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  async function handleDelete() {
    if (!selectedId) return
    if (!window.confirm(`Delete "${selectedId}"?`)) return
    await summonsAdapter.remove(selectedId)
    setSelectedId(null)
    setVersion(v => v + 1)
  }

  function renderEntry(e: CatalogEntrySummary) {
    return (
      <button key={e.id} className={`${styles.entry} ${e.id === selectedId ? styles.entrySelected : ''}`}
        onClick={() => { setSelectedId(e.id); setCreating(false) }}>
        <span className={styles.entryName}>{e.name}</span>
      </button>
    )
  }

  return (
    <>
      <div className={styles.list}>
        <div className={styles.listTools}>
          <input className={styles.search} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
          <button className={styles.newBtn} onClick={() => { setCreating(true); setSelectedId(null) }}>+ New</button>
        </div>
        <div className={styles.entries}>
          {groups
            ? groups.map(([type, items]) => (
              <div key={type} className={styles.group}>
                <button className={styles.groupHeader} onClick={() => toggleGroup(type)}>
                  <span className={styles.groupArrow}>{collapsed.has(type) ? '▶' : '▼'}</span>
                  <span className={styles.groupName}>{type}</span>
                  <span className={styles.groupCount}>{items.length}</span>
                </button>
                {!collapsed.has(type) && items.map(renderEntry)}
              </div>
            ))
            : entries.map(renderEntry)}
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
