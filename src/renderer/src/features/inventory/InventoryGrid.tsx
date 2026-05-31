import { useMemo, useState, type ReactNode } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { Character } from '@/entities/character/types'
import type { ShopItemKind } from '@/shared/data/equipment/types'
import { getShopItemById } from '@/shared/data/equipment/catalogue'
import type { ShopItem } from '@/shared/data/equipment/catalogue'
import { useAppStore } from '@/app/store'
import styles from './InventoryGrid.module.css'

const COLS = 8
const ROWS = 5
const MIN_CELLS = COLS * ROWS

const FILTER_KINDS: { label: string; kind: ShopItemKind | 'all' }[] = [
  { label: 'All',    kind: 'all' },
  { label: 'Weapon', kind: 'weapon' },
  { label: 'Armor',  kind: 'armor' },
  { label: 'Shield', kind: 'shield' },
  { label: 'Helmet', kind: 'helmet' },
  { label: 'Gloves', kind: 'gloves' },
  { label: 'Boots',  kind: 'boots' },
  { label: 'Ring',   kind: 'ring' },
]

const RARITY_COLOR: Record<string, string> = {
  common:      'var(--text-muted)',
  uncommon:    '#1eff00',
  rare:        '#0070dd',
  'very rare': '#a335ee',
  legendary:   '#ff8000',
}

interface Props {
  character: Character
  filterKind?: ShopItemKind | null
  onFilterChange: (kind: ShopItemKind | null) => void
  shakingId?: string | null
  selectedItemId?: string | null
  onSelectItem?: (id: string | null) => void
}

function DraggableCell({
  item,
  index,
  onClick,
  isSelected,
}: {
  item: ShopItem
  index: number
  onClick: (item: ShopItem) => void
  isSelected: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `inventory-${item.id}-${index}`,
    data: { itemId: item.id, kind: item.kind, type: 'inventory' },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`${styles.cell} ${styles.cellFilled}${isSelected ? ` ${styles.cellSelected}` : ''}`}
      title={item.name}
      style={{ opacity: isDragging ? 0.4 : 1, cursor: 'grab' }}
      onClick={() => onClick(item)}
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


export function InventoryGrid({ character: char, filterKind, onFilterChange, shakingId: _shakingId, selectedItemId: controlledId, onSelectItem }: Props) {
  const customItems = useAppStore(s => s.customItems)
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null)
  const selectedId = controlledId !== undefined ? controlledId : internalSelectedId

  function setSelectedId(id: string | null) {
    setInternalSelectedId(id)
    onSelectItem?.(id)
  }

  const equippedIds = useMemo(() => {
    const ids = new Set<string>()
    for (const val of Object.values(char.equipment)) {
      if (typeof val === 'string') ids.add(val)
    }
    for (const w of char.weapons) ids.add(w.id)
    return ids
  }, [char.equipment, char.weapons])

  const unequippedOwned = useMemo(
    () =>
      (char.ownedItemIds ?? [])
        .map(id => getShopItemById(id, customItems))
        .filter((i): i is ShopItem => !!i && !equippedIds.has(i.id))
        .filter(item => !filterKind || item.kind === filterKind),
    [char.ownedItemIds, equippedIds, filterKind, customItems],
  )

  const minCells = Math.max(MIN_CELLS, Math.ceil(unequippedOwned.length / COLS) * COLS)
  const emptyCellCount = minCells - unequippedOwned.length

  function handleCellClick(item: ShopItem) {
    setSelectedId(selectedId === item.id ? null : item.id)
  }

  return (
    <div className={styles.root}>
      <div className={styles.filterBar}>
        {FILTER_KINDS.map(({ label, kind }) => {
          const active = kind === 'all' ? !filterKind : filterKind === kind
          return (
            <button
              key={kind}
              className={`${styles.filterBtn}${active ? ` ${styles.filterBtnActive}` : ''}`}
              onClick={() => onFilterChange(kind === 'all' ? null : kind)}
            >
              {label}
            </button>
          )
        })}
      </div>

      <DroppableGrid className={styles.grid}>
        {unequippedOwned.map((item, i) => (
          <DraggableCell
            key={`${item.id}-${i}`}
            item={item}
            index={i}
            onClick={handleCellClick}
            isSelected={selectedId === item.id}
          />
        ))}
        {Array.from({ length: emptyCellCount }, (_, i) => (
          <div key={`empty-${i}`} className={styles.cell} />
        ))}
      </DroppableGrid>
    </div>
  )
}
