import { useMemo, useState, type ReactNode } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { Character, Equipment } from '@/entities/character/types'
import { getShopCatalogue, SHOP_ITEM_BY_ID } from '@/shared/data/equipment/catalogue'
import type { ShopItem, ShopItemKind } from '@/shared/data/equipment/catalogue'
import { useAppStore } from '@/app/store'
import { ItemCard } from './ItemCard'
import styles from './ArmouryPanel.module.css'

interface Props {
  character: Character
  activeSlotFilter: keyof Equipment | null
  onClose: () => void
  onOpenShop: () => void
  shakingId?: string | null
}

type Tab = 'all' | 'armor' | 'weapon' | 'accessory'

const ARMOR_KINDS   = new Set<ShopItemKind>(['armor', 'shield'])
const WEAPON_KINDS  = new Set<ShopItemKind>(['weapon'])
const ACCESS_KINDS  = new Set<ShopItemKind>([
  'helmet', 'necklace', 'cape', 'legs', 'boots', 'gloves', 'quiver', 'ring', 'amulet',
])

function slotToKind(slot: keyof Equipment): ShopItemKind {
  if (slot === 'armorId')  return 'armor'
  if (slot === 'shieldId') return 'shield'
  if (slot === 'ring1Id' || slot === 'ring2Id') return 'ring'
  return slot.replace('Id', '') as ShopItemKind
}

function DroppableGrid({ children }: { children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'armoury-grid', data: { isArmoury: true } })
  return (
    <div ref={setNodeRef} className={styles.grid} data-over={isOver || undefined}>
      {children}
    </div>
  )
}

function DraggableCard({ item, onEquip, isShaking }: { item: ShopItem; onEquip: (id: string) => void; isShaking?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `armoury-${item.id}`,
    data: { itemId: item.id, kind: item.kind, type: 'armoury' },
  })
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <ItemCard item={item} mode="armoury" onAction={() => onEquip(item.id)} isDragging={isDragging} isShaking={isShaking} />
    </div>
  )
}

export function ArmouryPanel({ character: char, activeSlotFilter, onClose, onOpenShop, shakingId }: Props) {
  const equipItemToSlot = useAppStore(s => s.equipItemToSlot)
  const buyItem         = useAppStore(s => s.buyItem)

  const [tab, setTab] = useState<Tab>(() => {
    if (!activeSlotFilter) return 'all'
    const kind = slotToKind(activeSlotFilter)
    if (ARMOR_KINDS.has(kind))  return 'armor'
    if (WEAPON_KINDS.has(kind)) return 'weapon'
    return 'accessory'
  })

  const filterKind = activeSlotFilter ? slotToKind(activeSlotFilter) : null

  const ownedSet = useMemo(() => new Set(char.ownedItemIds), [char.ownedItemIds])

  const equippedIds = useMemo(() => {
    const ids = new Set<string>()
    for (const val of Object.values(char.equipment)) {
      if (typeof val === 'string') ids.add(val)
    }
    return ids
  }, [char.equipment])

  const ownedItems = useMemo(
    () => char.ownedItemIds.map(id => SHOP_ITEM_BY_ID[id]).filter((i): i is ShopItem => !!i),
    [char.ownedItemIds],
  )

  const catalogue = useMemo(() => getShopCatalogue(), [])

  const { displayedOwned, displayedUnowned } = useMemo(() => {
    function matchesTab(i: ShopItem) {
      if (tab === 'armor')     return ARMOR_KINDS.has(i.kind)
      if (tab === 'weapon')    return WEAPON_KINDS.has(i.kind)
      if (tab === 'accessory') return ACCESS_KINDS.has(i.kind)
      return true
    }
    function matchesSlot(i: ShopItem) {
      return !filterKind || i.kind === filterKind
    }

    const owned   = ownedItems.filter(i => matchesTab(i) && matchesSlot(i))
    const unowned = catalogue.filter(i =>
      !ownedSet.has(i.id) &&
      i.kind !== 'weapon' &&
      matchesTab(i) &&
      matchesSlot(i),
    )
    return { displayedOwned: owned, displayedUnowned: unowned }
  }, [ownedItems, catalogue, ownedSet, tab, filterKind])

  function handleEquip(itemId: string) {
    if (!activeSlotFilter) return
    equipItemToSlot(char.id, activeSlotFilter, itemId)
    onClose()
  }

  function handleEquipAll(itemId: string) {
    const item = SHOP_ITEM_BY_ID[itemId] ?? catalogue.find(i => i.id === itemId)
    if (!item) return
    const slotMap: Partial<Record<ShopItemKind, keyof Equipment>> = {
      armor:   'armorId',   shield:   'shieldId',
      helmet:  'helmetId',  necklace: 'necklaceId',
      cape:    'capeId',    legs:     'legsId',
      boots:   'bootsId',   gloves:   'glovesId',
      quiver:  'quiverId',
      ring:    char.equipment.ring1Id ? 'ring2Id' : 'ring1Id',
      amulet:  'amuletId',
    }
    const slot = slotMap[item.kind]
    if (slot) equipItemToSlot(char.id, slot, itemId)
  }

  function handleBuyAndEquip(itemId: string) {
    const item = catalogue.find(i => i.id === itemId)
    if (!item || char.gold < item.cost) return
    buyItem(char.id, itemId, item.cost)
    if (activeSlotFilter) {
      equipItemToSlot(char.id, activeSlotFilter, itemId)
      onClose()
    } else {
      handleEquipAll(itemId)
    }
  }

  const allEmpty = displayedOwned.length === 0 && displayedUnowned.length === 0

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>
          Armoury {activeSlotFilter ? `— ${activeSlotFilter.replace('Id', '').replace(/([A-Z])/g, ' $1')}` : ''}
        </span>
        <div className={styles.headerActions}>
          <button className={styles.shopBtn} onClick={onOpenShop}>Open Shop</button>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
      </div>

      <div className={styles.tabs}>
        {(['all', 'armor', 'weapon', 'accessory'] as Tab[]).map(t => (
          <button key={t} className={styles.tab} data-active={tab === t || undefined} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <DroppableGrid>
        {allEmpty ? (
          <div className={styles.empty}>
            No items available.{' '}
            <button className={styles.emptyShopLink} onClick={onOpenShop}>Open the Shop</button>
            {' '}to buy equipment.
          </div>
        ) : (
          <>
            {displayedOwned.map(item => (
              <div key={item.id} style={{ opacity: equippedIds.has(item.id) ? 1 : 0.6 }}>
                <DraggableCard
                  item={item}
                  onEquip={activeSlotFilter ? handleEquip : handleEquipAll}
                  isShaking={shakingId === `armoury-${item.id}`}
                />
              </div>
            ))}
            {displayedUnowned.map(item => (
              <div key={item.id} className={styles.itemUnowned}>
                <ItemCard
                  item={item}
                  mode="shop"
                  onAction={() => handleBuyAndEquip(item.id)}
                  canAfford={char.gold >= item.cost}
                />
              </div>
            ))}
          </>
        )}
      </DroppableGrid>
    </div>
  )
}
