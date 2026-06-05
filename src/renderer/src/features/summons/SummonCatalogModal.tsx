import { useState } from 'react'
import type { SummonTemplate } from '@/entities/summon/types'
import { SUMMON_TEMPLATES } from '@/shared/data/summons/summonTemplates'
import { addSummonTemplate, updateSummonTemplate, deleteSummonTemplate } from '@/shared/data/summons/summonLoader'
import { SummonEditorForm } from './SummonEditorForm'
import { SummonSprite } from './SummonSprite'
import styles from './SummonCatalogModal.module.css'

interface Props {
  mode: 'pick' | 'manage'
  onPick?: (templateId: string) => void
  onClose: () => void
}

function groupByType<T>(items: T[], key: (item: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const k = key(item)
    const list = map.get(k)
    if (list) list.push(item)
    else map.set(k, [item])
  }
  return [...map.entries()]
}

export function SummonCatalogModal({ mode, onPick, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<SummonTemplate | null>(null)
  const [creating, setCreating] = useState(false)
  // Bumped after catalog mutations to re-read the module array.
  const [version, setVersion] = useState(0)
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(SUMMON_TEMPLATES.map(t => t.type))
  )

  const templates = SUMMON_TEMPLATES
    .filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
  void version

  // Group by type only when not searching
  const groups = search ? null : groupByType(templates, t => t.type)

  function toggleGroup(type: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  async function handleSave(t: SummonTemplate) {
    if (editing) await updateSummonTemplate(t)
    else await addSummonTemplate(t)
    setEditing(null)
    setCreating(false)
    setVersion(v => v + 1)
  }

  async function handleDelete(id: string) {
    await deleteSummonTemplate(id)
    setVersion(v => v + 1)
  }

  const showEditor = creating || editing !== null

  function renderEntry(t: SummonTemplate) {
    return (
      <div key={t.id} className={styles.entry}>
        <button
          className={styles.entryMain}
          disabled={mode === 'manage'}
          onClick={() => { if (mode === 'pick') { onPick?.(t.id); onClose() } }}
          title={mode === 'pick' ? 'Summon this' : undefined}
        >
          <SummonSprite templateId={t.id} type={t.type} size={22} />
          <span className={styles.entryName}>{t.name}</span>
          <span className={styles.entryMeta}>{t.maxHp} HP · AC {t.ac}</span>
        </button>
        {mode === 'manage' && (
          <div className={styles.entryActions}>
            <button className={styles.editBtn} onClick={() => setEditing(t)}>Edit</button>
            <button className={styles.delBtn} onClick={() => handleDelete(t.id)}>Delete</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>
            {showEditor
              ? (editing ? 'Edit Template' : 'New Template')
              : (mode === 'pick' ? 'Summon a Creature' : 'Summon Catalog')}
          </span>
          <button className={styles.close} onClick={onClose}>×</button>
        </div>

        {showEditor ? (
          <SummonEditorForm
            initial={editing ?? undefined}
            onSave={handleSave}
            onCancel={() => { setEditing(null); setCreating(false) }}
          />
        ) : (
          <>
            <div className={styles.toolbar}>
              <input
                className={styles.search}
                type="search"
                placeholder="Search summons…"
                value={search}
                autoFocus
                onChange={e => setSearch(e.target.value)}
              />
              {mode === 'manage' && (
                <button className={styles.newBtn} onClick={() => setCreating(true)}>+ New</button>
              )}
            </div>
            <div className={styles.list}>
              {groups ? (
                groups.map(([type, items]) => (
                  <div key={type} className={styles.group}>
                    <button className={styles.groupHeader} onClick={() => toggleGroup(type)}>
                      <span className={styles.groupArrow}>{collapsed.has(type) ? '▶' : '▼'}</span>
                      <span className={styles.groupName}>{type}</span>
                      <span className={styles.groupCount}>{items.length}</span>
                    </button>
                    {!collapsed.has(type) && items.map(renderEntry)}
                  </div>
                ))
              ) : (
                templates.map(renderEntry)
              )}
              {templates.length === 0 && (
                <div className={styles.empty}>No templates{search ? ' match your search' : ''}.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
