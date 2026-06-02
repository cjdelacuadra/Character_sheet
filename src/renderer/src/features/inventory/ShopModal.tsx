import { useMemo, useState } from 'react'
import type { Character } from '@/entities/character/types'
import { getShopCatalogueWithCustom } from '@/shared/data/equipment/catalogue'
import type { ShopItemKind } from '@/shared/data/equipment/catalogue'
import { useAppStore } from '@/app/store'
import { ItemCard } from './ItemCard'
import { ItemEditorPanel } from './ItemEditorPanel'
import styles from './ShopModal.module.css'

interface Props {
  character: Character
  onClose: () => void
  filterKind?: ShopItemKind | null
}

type SortBy = 'name' | 'cost' | 'rarity'

const RARITY_ORDER: Record<string, number> = {
  common: 0, uncommon: 1, rare: 2, 'very rare': 3, legendary: 4,
}

export function ShopModal({ character: char, onClose, filterKind }: Props) {
  const buyItem     = useAppStore(s => s.buyItem)
  const customItems = useAppStore(s => s.customItems)

  const [sortBy,    setSortBy]    = useState<SortBy>('cost')
  const [search,    setSearch]    = useState('')
  const [previewId, setPreviewId] = useState<string | null>(null)

  const catalogue = useMemo(
    () => getShopCatalogueWithCustom(Object.values(customItems)),
    [customItems],
  )

  const displayed = useMemo(() => {
    let items = catalogue

    if (filterKind) items = items.filter(i => i.kind === filterKind)

    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(i => i.name.toLowerCase().includes(q))
    }

    return [...items].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'cost') return a.cost - b.cost
      return (RARITY_ORDER[a.rarity ?? 'common'] ?? 0) - (RARITY_ORDER[b.rarity ?? 'common'] ?? 0)
    })
  }, [catalogue, filterKind, sortBy, search])

  function handleBuy(itemId: string, cost: number) {
    buyItem(char.id, itemId, cost)
    setPreviewId(null)
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>Shop</span>
          <span className={styles.gold}>💰 {char.gold} gp</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.controls}>
          <input
            className={styles.search}
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className={styles.sort}
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortBy)}
          >
            <option value="cost">Sort: Cost</option>
            <option value="name">Sort: Name</option>
            <option value="rarity">Sort: Rarity</option>
          </select>
          {filterKind && (
            <span className={styles.activeFilter}>
              {filterKind.charAt(0).toUpperCase() + filterKind.slice(1)}
            </span>
          )}
        </div>

        <div className={styles.grid}>
          {displayed.map(item => (
            <div
              key={item.id}
              onClick={() => setPreviewId(prev => prev === item.id ? null : item.id)}
              style={{ cursor: 'pointer' }}
            >
              <ItemCard
                item={item}
                mode="shop"
                onAction={() => handleBuy(item.id, item.cost)}
                alreadyOwned={char.ownedItemIds.includes(item.id)}
                canAfford={char.gold >= item.cost}
              />
            </div>
          ))}
          {displayed.length === 0 && (
            <div className={styles.empty}>No items match your search.</div>
          )}
        </div>

        {previewId && (() => {
          const item = catalogue.find(i => i.id === previewId)
          const owned = item ? char.ownedItemIds.includes(item.id) : false
          return (
            <div className={styles.previewPanel}>
              <ItemEditorPanel
                itemId={previewId}
                readOnly
                onClose={() => setPreviewId(null)}
                onEquip={!owned && item && item.cost > 0 ? () => handleBuy(item.id, item.cost) : undefined}
              />
            </div>
          )
        })()}
      </div>
    </div>
  )
}
