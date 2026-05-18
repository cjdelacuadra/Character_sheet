import type { ReactNode } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { Character } from '@/entities/character/types'
import type { ShopItemKind } from '@/shared/data/equipment/types'
import { SHOP_ITEM_BY_ID } from '@/shared/data/equipment/catalogue'
import type { ShopItem } from '@/shared/data/equipment/catalogue'
import styles from './InventoryGrid.module.css'

const COLS = 8
const ROWS = 5
const TOTAL_CELLS = COLS * ROWS

const FILTER_KINDS: { label: string; kind: ShopItemKind | 'all' }[] = [
  { label: 'All',     kind: 'all' },
  { label: 'Weapon',  kind: 'weapon' },
  { label: 'Armor',   kind: 'armor' },
  { label: 'Shield',  kind: 'shield' },
  { label: 'Helmet',  kind: 'helmet' },
  { label: 'Gloves',  kind: 'gloves' },
  { label: 'Boots',   kind: 'boots' },
  { label: 'Ring',    kind: 'ring' },
]

interface Props {
  character: Character
  filterKind?: ShopItemKind | null
  onFilterChange: (kind: ShopItemKind | null) => void
}

function DraggableCell({ item, index }: { item: ShopItem; index: number }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `inventory-${item.id}-${index}`,
    data: { itemId: item.id, kind: item.kind, type: 'inventory' },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`${styles.cell} ${styles.cellFilled}`}
      title={item.name}
      style={{ opacity: isDragging ? 0.4 : 1, cursor: 'grab' }}
    >
      {item.sprite
        ? <img src={item.sprite} alt={item.name} className={styles.sprite} />
        : <span className={styles.fallback}>{item.name[0]}</span>
      }
    </div>
  )
}

function DroppableGrid({ children, className }: { children: ReactNode; className: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'inventory-grid', data: { isInventory: true } })
  return (
    <div ref={setNodeRef} className={className} data-over={isOver || undefined}>
      {children}
    </div>
  )
}

export function InventoryGrid({ character: char, filterKind, onFilterChange }: Props) {
  const owned = char.ownedItemIds
    .map(id => SHOP_ITEM_BY_ID[id])
    .filter(Boolean)
    .filter(item => !filterKind || item.kind === filterKind)

  const cells = Array.from({ length: TOTAL_CELLS }, (_, i) => owned[i] ?? null)

  return (
    <div className={styles.root}>
      <div className={styles.filterBar}>
        {FILTER_KINDS.map(({ label, kind }) => {
          const active = kind === 'all' ? !filterKind : filterKind === kind
          return (
            <button
              key={kind}
              className={`${styles.filterBtn} ${active ? styles.filterBtnActive : ''}`}
              onClick={() => onFilterChange(kind === 'all' ? null : kind)}
            >
              {label}
            </button>
          )
        })}
      </div>
      <DroppableGrid className={styles.grid}>
        {cells.map((item, i) =>
          item
            ? <DraggableCell key={`${item.id}-${i}`} item={item} index={i} />
            : <div key={i} className={styles.cell} />
        )}
      </DroppableGrid>
    </div>
  )
}
