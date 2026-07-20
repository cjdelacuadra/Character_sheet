import { useState } from 'react'
import { SHOP_CATALOGUE, type ShopItem } from '@/shared/data/equipment/catalogue'
import type { ShopItemKind } from '@/shared/data/equipment/types'
import { ItemEditorPanel } from '@/features/inventory/ItemEditorPanel'
import { groupBy } from '../groupHelpers'
import styles from '../ContentEditor.module.css'

const KIND_ORDER: ShopItemKind[] = [
  'weapon', 'armor', 'shield', 'helmet', 'necklace', 'cape',
  'legs', 'boots', 'gloves', 'ring', 'amulet',
]
const KIND_LABELS: Record<string, string> = {
  weapon: 'Weapons', armor: 'Armor', shield: 'Shields', helmet: 'Helmets',
  necklace: 'Necklaces', cape: 'Capes', legs: 'Legs', boots: 'Boots',
  gloves: 'Gloves', ring: 'Rings', amulet: 'Amulets',
}
const RARITY_ORDER: Record<string, number> = { common: 0, uncommon: 1, rare: 2, 'very rare': 3, legendary: 4 }
const RARITY_LABELS: Record<string, string> = {
  common: 'Common', uncommon: 'Uncommon', rare: 'Rare', 'very rare': 'Very Rare', legendary: 'Legendary',
}

/** Equipment view: New item picker + weapon/shield/armor/… categories, each split into rarity sections. */
export function EquipmentView() {
  const [, setVersion] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newKind, setNewKind] = useState<ShopItemKind | null>(null)
  const [search, setSearch] = useState('')

  const entries = SHOP_CATALOGUE.filter(i =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.id.includes(search.toLowerCase()))

  const kindGroups = search ? null : groupBy(entries, i => i.kind).sort(([a], [b]) => {
    const ai = KIND_ORDER.indexOf(a as ShopItemKind)
    const bi = KIND_ORDER.indexOf(b as ShopItemKind)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  const [collapsedKinds, setCollapsedKinds] = useState<Set<string>>(
    () => new Set(SHOP_CATALOGUE.map(i => i.kind))
  )
  const [collapsedRarities, setCollapsedRarities] = useState<Set<string>>(
    () => new Set(SHOP_CATALOGUE.map(i => `${i.kind}:${i.rarity ?? 'common'}`))
  )

  function toggleKind(kind: string) {
    setCollapsedKinds(prev => {
      const next = new Set(prev)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })
  }
  function toggleRarity(key: string) {
    setCollapsedRarities(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function renderEntry(i: ShopItem) {
    return (
      <button
        key={i.id}
        className={`${styles.entry} ${i.id === selectedId ? styles.entrySelected : ''}`}
        onClick={() => { setSelectedId(i.id); setNewKind(null) }}
      >
        <span className={styles.entryName}>{i.name}</span>
      </button>
    )
  }

  function handleCreate(kind: ShopItemKind) {
    setNewKind(kind)
    setSelectedId(`new-${kind}-${Date.now()}`)
  }

  return (
    <>
      <div className={styles.list}>
        <div className={styles.listTools}>
          <input className={styles.search} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
          <select
            className={styles.newBtn}
            value=""
            onChange={e => { if (e.target.value) handleCreate(e.target.value as ShopItemKind) }}
          >
            <option value="">+ New…</option>
            {KIND_ORDER.map(k => <option key={k} value={k}>{KIND_LABELS[k] ?? k}</option>)}
          </select>
        </div>
        <div className={styles.entries}>
          {kindGroups
            ? kindGroups.map(([kind, items]) => {
              const rarityGroups = groupBy(items, i => i.rarity ?? 'common')
                .sort(([a], [b]) => (RARITY_ORDER[a] ?? 0) - (RARITY_ORDER[b] ?? 0))
              return (
                <div key={kind} className={styles.group}>
                  <button className={styles.groupHeader} onClick={() => toggleKind(kind)}>
                    <span className={styles.groupArrow}>{collapsedKinds.has(kind) ? '▶' : '▼'}</span>
                    <span className={styles.groupName}>{KIND_LABELS[kind] ?? kind}</span>
                    <span className={styles.groupCount}>{items.length}</span>
                  </button>
                  {!collapsedKinds.has(kind) && rarityGroups.map(([rarity, rItems]) => {
                    const key = `${kind}:${rarity}`
                    return (
                      <div key={key} className={styles.subGroup}>
                        <button className={`${styles.groupHeader} ${styles.subGroupHeader}`} onClick={() => toggleRarity(key)}>
                          <span className={styles.groupArrow}>{collapsedRarities.has(key) ? '▶' : '▼'}</span>
                          <span className={styles.groupName}>{RARITY_LABELS[rarity] ?? rarity}</span>
                          <span className={styles.groupCount}>{rItems.length}</span>
                        </button>
                        {!collapsedRarities.has(key) && rItems.map(renderEntry)}
                      </div>
                    )
                  })}
                </div>
              )
            })
            : entries.map(renderEntry)}
        </div>
      </div>
      <div className={styles.detail}>
        {selectedId ? (
          <div className={styles.detailBody}>
            <ItemEditorPanel
              key={selectedId}
              itemId={selectedId}
              newItemKind={newKind ?? undefined}
              onClose={() => { setSelectedId(null); setNewKind(null) }}
              onSaved={() => setVersion(v => v + 1)}
            />
          </div>
        ) : (
          <div className={styles.detailEmpty}>Select an item to edit, or "+ New…" to create one.</div>
        )}
      </div>
    </>
  )
}
