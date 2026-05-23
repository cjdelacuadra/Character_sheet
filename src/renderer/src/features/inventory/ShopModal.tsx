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
}

type Tab    = 'all' | 'armor' | 'weapon' | 'accessory'
type SortBy = 'name' | 'cost' | 'rarity'

const ARMOR_KINDS  = new Set<ShopItemKind>(['armor', 'shield'])
const WEAPON_KINDS = new Set<ShopItemKind>(['weapon'])

const RARITY_ORDER: Record<string, number> = {
  common: 0, uncommon: 1, rare: 2, 'very rare': 3, legendary: 4,
}

export function ShopModal({ character: char, onClose }: Props) {
  const buyItem     = useAppStore(s => s.buyItem)
  const customItems = useAppStore(s => s.customItems)

  const [tab,       setTab]       = useState<Tab>('all')
  const [sortBy,    setSortBy]    = useState<SortBy>('cost')
  const [search,    setSearch]    = useState('')
  const [previewId, setPreviewId] = useState<string | null>(null)

  const catalogue = useMemo(
    () => getShopCatalogueWithCustom(Object.values(customItems)),
    [customItems],
  )

  const displayed = useMemo(() => {
    let items = catalogue

    if (tab === 'armor')     items = items.filter(i => ARMOR_KINDS.has(i.kind))
    if (tab === 'weapon')    items = items.filter(i => WEAPON_KINDS.has(i.kind))
    if (tab === 'accessory') items = items.filter(i => !ARMOR_KINDS.has(i.kind) && !WEAPON_KINDS.has(i.kind))

    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(i => i.name.toLowerCase().includes(q))
    }

    return [...items].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'cost') return a.cost - b.cost
      return (RARITY_ORDER[a.rarity ?? 'common'] ?? 0) - (RARITY_ORDER[b.rarity ?? 'common'] ?? 0)
    })
  }, [catalogue, tab, sortBy, search])

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
          <div className={styles.tabs}>
            {(['all', 'armor', 'weapon', 'accessory'] as Tab[]).map(t => (
              <button
                key={t}
                className={styles.tab}
                data-active={tab === t || undefined}
                onClick={() => setTab(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className={styles.rightControls}>
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
          </div>
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
