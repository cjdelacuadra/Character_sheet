import { useMemo, useState } from 'react'
import type { Character } from '@/entities/character/types'
import { SHOP_CATALOGUE, SHOP_ITEM_BY_ID } from '@/shared/data/equipment/catalogue'
import type { ShopItemKind } from '@/shared/data/equipment/types'
import { useAppStore } from '@/app/store'
import styles from './ShopPanel.module.css'

type SortBy = 'name' | 'cost' | 'rarity'

const RARITY_ORDER: Record<string, number> = { common: 0, uncommon: 1, rare: 2, 'very rare': 3, legendary: 4 }

const FILTER_KINDS: { kind: ShopItemKind | 'all'; label: string }[] = [
  { kind: 'all',    label: 'All'    },
  { kind: 'weapon', label: 'Wpn'    },
  { kind: 'armor',  label: 'Armor'  },
  { kind: 'shield', label: 'Shield' },
  { kind: 'ring',   label: 'Ring'   },
]

interface Props {
  character: Character
  onClose: () => void
}

export function ShopPanel({ character: char, onClose }: Props) {
  const buyItem  = useAppStore(s => s.buyItem)
  const sellItem = useAppStore(s => s.sellItem)

  const [sellQueue, setSellQueue] = useState<string[]>([])
  const [buyQueue,  setBuyQueue]  = useState<string[]>([])
  const [filterKind, setFilterKind] = useState<ShopItemKind | null>(null)
  const [sortBy,     setSortBy]     = useState<SortBy>('cost')

  const ownedItems = useMemo(
    () => char.ownedItemIds
      .map(id => SHOP_ITEM_BY_ID[id])
      .filter(Boolean)
      .filter(item => !filterKind || item.kind === filterKind),
    [char.ownedItemIds, filterKind]
  )

  const catalogItems = useMemo(() => {
    let items = SHOP_CATALOGUE
    if (filterKind) items = items.filter(i => i.kind === filterKind)
    return [...items].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'cost') return a.cost - b.cost
      return (RARITY_ORDER[a.rarity ?? 'common'] ?? 0) - (RARITY_ORDER[b.rarity ?? 'common'] ?? 0)
    })
  }, [filterKind, sortBy])

  const sellTotal  = sellQueue.reduce((s, id) => s + (SHOP_ITEM_BY_ID[id]?.cost ?? 0), 0)
  const buyTotal   = buyQueue.reduce( (s, id) => s + (SHOP_ITEM_BY_ID[id]?.cost ?? 0), 0)
  const netGold    = char.gold + sellTotal - buyTotal
  const canAfford  = netGold >= 0
  const hasChanges = sellQueue.length > 0 || buyQueue.length > 0

  function handleConfirm() {
    for (const id of sellQueue) {
      const item = SHOP_ITEM_BY_ID[id]
      if (item) sellItem(char.id, id, item.cost)
    }
    for (const id of buyQueue) {
      const item = SHOP_ITEM_BY_ID[id]
      if (item) buyItem(char.id, id, item.cost)
    }
    onClose()
  }

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.title}>Shop</span>
        <div className={styles.filters}>
          {FILTER_KINDS.map(({ kind, label }) => {
            const active = kind === 'all' ? !filterKind : filterKind === kind
            return (
              <button
                key={kind}
                className={`${styles.filterBtn}${active ? ` ${styles.filterBtnActive}` : ''}`}
                onClick={() => setFilterKind(kind === 'all' ? null : kind)}
              >{label}</button>
            )
          })}
        </div>
        <select
          className={styles.sortSel}
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortBy)}
        >
          <option value="cost">Cost ↑</option>
          <option value="name">Name</option>
          <option value="rarity">Rarity</option>
        </select>
        <span className={styles.gold}>💰 {char.gold} gp</span>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
      </div>

      {/* 4-column body: [owned 5fr][sell 2fr][buy 2fr][catalog 5fr] */}
      <div className={styles.body}>

        {/* Owned column */}
        <div className={`${styles.col} ${styles.colOwned}`}>
          <div className={styles.colHead}>Owned ({ownedItems.length})</div>
          <div className={styles.itemList}>
            {ownedItems.map(item => {
              const inSell = sellQueue.includes(item.id)
              return (
                <button
                  key={item.id}
                  className={`${styles.itemRow}${inSell ? ` ${styles.rowSell}` : ''}`}
                  onClick={() => setSellQueue(q => q.includes(item.id) ? q.filter(x => x !== item.id) : [...q, item.id])}
                  title={`${item.name} · ${item.cost} gp — click to ${inSell ? 'cancel sell' : 'sell'}`}
                >
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={`${styles.itemCost}${inSell ? ` ${styles.costSell}` : ''}`}>
                    {inSell ? 'SELL' : `${item.cost}g`}
                  </span>
                </button>
              )
            })}
            {ownedItems.length === 0 && <span className={styles.empty}>No items</span>}
          </div>
        </div>

        {/* Sell queue */}
        <div className={styles.queueCol}>
          <div className={styles.colHead}>↑ Sell</div>
          <div className={styles.queueItems}>
            {sellQueue.map(id => {
              const item = SHOP_ITEM_BY_ID[id]
              if (!item) return null
              return (
                <div key={id} className={styles.queueChip} title={item.name}>
                  <span className={styles.chipLabel}>{item.name.slice(0, 3)}</span>
                  <button
                    className={styles.chipRemove}
                    onClick={() => setSellQueue(q => q.filter(x => x !== id))}
                  >×</button>
                </div>
              )
            })}
            {sellQueue.length === 0 && <span className={styles.queueHint}>click item</span>}
          </div>
          {sellTotal > 0 && <div className={styles.queueSum}>+{sellTotal}g</div>}
        </div>

        {/* Buy queue */}
        <div className={styles.queueCol}>
          <div className={styles.colHead}>↓ Buy</div>
          <div className={styles.queueItems}>
            {buyQueue.map(id => {
              const item = SHOP_ITEM_BY_ID[id]
              if (!item) return null
              return (
                <div key={id} className={styles.queueChip} title={item.name}>
                  <span className={styles.chipLabel}>{item.name.slice(0, 3)}</span>
                  <button
                    className={styles.chipRemove}
                    onClick={() => setBuyQueue(q => q.filter(x => x !== id))}
                  >×</button>
                </div>
              )
            })}
            {buyQueue.length === 0 && <span className={styles.queueHint}>click item</span>}
          </div>
          {buyTotal > 0 && (
            <div className={`${styles.queueSum}${!canAfford ? ` ${styles.queueSumRed}` : ''}`}>
              −{buyTotal}g
            </div>
          )}
        </div>

        {/* Catalog column */}
        <div className={`${styles.col} ${styles.colCatalog}`}>
          <div className={styles.colHead}>Catalog</div>
          <div className={styles.itemList}>
            {catalogItems.map(item => {
              const owned  = char.ownedItemIds.includes(item.id)
              const inBuy  = buyQueue.includes(item.id)
              const canAddThis = char.gold + sellTotal >= buyTotal + (inBuy ? 0 : item.cost)
              return (
                <button
                  key={item.id}
                  className={[
                    styles.itemRow,
                    owned   ? styles.rowOwned : '',
                    inBuy   ? styles.rowBuy   : '',
                    !owned && !inBuy && !canAddThis ? styles.rowPoor : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => {
                    if (!owned && item.cost > 0) {
                      setBuyQueue(q => q.includes(item.id) ? q.filter(x => x !== item.id) : [...q, item.id])
                    }
                  }}
                  disabled={owned || item.cost === 0}
                  title={`${item.name} · ${item.cost === 0 ? 'Quest reward' : `${item.cost} gp`}`}
                >
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={[
                    styles.itemCost,
                    owned             ? styles.costOwned : '',
                    inBuy             ? styles.costBuy   : '',
                    !owned && !inBuy && !canAddThis ? styles.costPoor  : '',
                  ].filter(Boolean).join(' ')}>
                    {owned ? '✓' : inBuy ? 'BUY' : item.cost === 0 ? '—' : `${item.cost}g`}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.footerInfo}>
          <span className={styles.netLabel}>After:</span>
          <span className={[
            styles.netValue,
            !canAfford           ? styles.netRed   : '',
            netGold > char.gold  ? styles.netGreen : '',
          ].filter(Boolean).join(' ')}>
            {netGold} gp
          </span>
          {!canAfford && <span className={styles.footerWarn}>· insufficient gold</span>}
        </div>
        <button
          className={styles.confirmBtn}
          onClick={handleConfirm}
          disabled={!canAfford || !hasChanges}
        >
          {hasChanges ? 'Confirm' : 'No changes'}
        </button>
      </div>
    </div>
  )
}
