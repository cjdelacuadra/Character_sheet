import { useMemo, useState, type ReactNode } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { Character, Equipment } from '@/entities/character/types'
import type { ShopItemKind } from '@/shared/data/equipment/types'
import { SHOP_ITEM_BY_ID } from '@/shared/data/equipment/catalogue'
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

function ItemDetailPopup({
  item,
  onClose,
  onEquip,
}: {
  item: ShopItem
  onClose: () => void
  onEquip: (item: ShopItem) => void
}) {
  const rarityColor = item.rarity ? RARITY_COLOR[item.rarity] : 'var(--text-muted)'
  return (
    <div className={styles.detailPopup}>
      <div className={styles.detailHead}>
        <span className={styles.detailName} style={{ color: rarityColor }}>{item.name}</span>
        <button className={styles.detailClose} onClick={onClose}>×</button>
      </div>
      {item.keyStat && <span className={styles.detailStat}>{item.keyStat}</span>}
      {item.rarity && <span className={styles.detailRarity} style={{ color: rarityColor }}>{item.rarity}</span>}
      <span className={styles.detailKind}>{item.kind}</span>
      {item.cost > 0 && <span className={styles.detailCost}>💰 {item.cost} gp</span>}
      <button className={styles.detailEquip} onClick={() => { onEquip(item); onClose() }}>
        Equip
      </button>
    </div>
  )
}

export function InventoryGrid({ character: char, filterKind, onFilterChange, shakingId: _shakingId }: Props) {
  const equipItemToSlot   = useAppStore(s => s.equipItemToSlot)
  const equipWeaponFromId = useAppStore(s => s.equipWeaponFromId)

  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null)

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
      char.ownedItemIds
        .map(id => SHOP_ITEM_BY_ID[id])
        .filter((i): i is ShopItem => !!i && !equippedIds.has(i.id))
        .filter(item => !filterKind || item.kind === filterKind),
    [char.ownedItemIds, equippedIds, filterKind],
  )

  // Always pad to at least 5 full rows (40 cells)
  const minCells = Math.max(MIN_CELLS, Math.ceil(unequippedOwned.length / COLS) * COLS)
  const emptyCellCount = minCells - unequippedOwned.length

  function handleCellClick(item: ShopItem) {
    setSelectedItem(prev => (prev?.id === item.id ? null : item))
  }

  function handleEquip(item: ShopItem) {
    if (item.kind === 'weapon') {
      equipWeaponFromId(char.id, item.id, 0)
      return
    }
    const slotMap: Partial<Record<ShopItemKind, keyof Equipment>> = {
      armor:    'armorId',    shield:   'shieldId',
      helmet:   'helmetId',  necklace: 'necklaceId',
      cape:     'capeId',    legs:     'legsId',
      boots:    'bootsId',   gloves:   'glovesId',
      quiver:   'quiverId',
      ring:     char.equipment.ring1Id ? 'ring2Id' : 'ring1Id',
      amulet:   'amuletId',
    }
    const slot = slotMap[item.kind]
    if (slot) equipItemToSlot(char.id, slot, item.id)
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
            isSelected={selectedItem?.id === item.id}
          />
        ))}
        {Array.from({ length: emptyCellCount }, (_, i) => (
          <div key={`empty-${i}`} className={styles.cell} />
        ))}
      </DroppableGrid>

      {selectedItem && (
        <ItemDetailPopup
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onEquip={handleEquip}
        />
      )}
    </div>
  )
}
