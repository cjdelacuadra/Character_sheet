import { useState } from 'react'
import { DndContext, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import type { Character, Equipment } from '@/entities/character/types'
import { ARMOR_BY_ID } from '@/shared/data/armorData'
import { ACCESSORY_BY_ID, SHOP_ITEM_BY_ID, slotPlaceholderUrl } from '@/shared/data/shopData'
import type { ShopItemKind } from '@/shared/data/shopData'
import { computeEquipmentStats, type EquipmentStats } from '@/shared/data/charCalculations'
import { useAppStore } from '@/app/store'
import { ArmouryPanel } from '@/features/armoury/ArmouryPanel'
import { ShopModal } from '@/features/armoury/ShopModal'
import { ItemCard } from '@/features/armoury/ItemCard'
import styles from './EquipmentLayout.module.css'

interface Props {
  character: Character
}

// ─── Slot-to-kind mapping ────────────────────────────────────────────────────

function slotToKind(slot: keyof Equipment): ShopItemKind {
  if (slot === 'armorId')  return 'armor'
  if (slot === 'shieldId') return 'shield'
  if (slot === 'ring1Id' || slot === 'ring2Id') return 'ring'
  return slot.replace('Id', '') as ShopItemKind
}

function resolveSlotName(slot: keyof Equipment, char: Character): string | null {
  const val = char.equipment[slot]
  if (!val) return null
  // armor / shield
  if (slot === 'armorId' || slot === 'shieldId') {
    return ARMOR_BY_ID[val]?.name ?? val
  }
  // accessory from shopData catalogue
  return ACCESSORY_BY_ID[val]?.name ?? val
}

// ─── DroppableSlot ───────────────────────────────────────────────────────────

function SlotButton({
  slotKey,
  label,
  char,
  onOpen,
  onUnequip,
}: {
  slotKey: keyof Equipment
  label: string
  char: Character
  onOpen: (slot: keyof Equipment) => void
  onUnequip: (slot: keyof Equipment) => void
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: slotKey,
    data: { slot: slotKey, kind: slotToKind(slotKey) },
  })

  const itemId   = char.equipment[slotKey]
  const itemName = resolveSlotName(slotKey, char)
  const kind     = slotToKind(slotKey)
  const isEmpty  = !itemId

  const itemSprite = itemId ? SHOP_ITEM_BY_ID[itemId]?.sprite : undefined
  const iconSrc    = itemSprite ?? slotPlaceholderUrl(kind)

  return (
    <div
      ref={setNodeRef}
      className={styles.slot}
      data-over={isOver || undefined}
      title={itemName ?? label}
    >
      <button className={styles.slotIconBtn} onClick={() => onOpen(slotKey)}>
        <img
          src={iconSrc}
          alt={itemName ?? label}
          width={32}
          height={32}
          className={styles.slotIcon}
          data-empty={isEmpty || undefined}
        />
      </button>
      <span className={styles.slotLabel}>{label}</span>
      {!isEmpty && (
        <button
          className={styles.slotUnequip}
          onClick={() => onUnequip(slotKey)}
          title="Unequip"
        >×</button>
      )}
    </div>
  )
}

// ─── Per-slot stat breakdown ─────────────────────────────────────────────────

function SlotBreakdownPanel({ slot, char, onClose }: {
  slot: keyof Equipment
  char: Character
  onClose: () => void
}) {
  const itemId = char.equipment[slot]
  if (!itemId) return null

  const itemName = resolveSlotName(slot, char) ?? itemId
  const isArmorSlot = slot === 'armorId' || slot === 'shieldId'
  const armor = isArmorSlot ? ARMOR_BY_ID[itemId] : null
  const acc   = ACCESSORY_BY_ID[itemId]

  const rows: { label: string; value: number }[] = []
  const s = acc?.stats
  if (s) {
    for (const [k, v] of Object.entries(s.attackBonus ?? {})) {
      if (v) rows.push({ label: `Atk ${k.charAt(0).toUpperCase() + k.slice(1)}`, value: v as number })
    }
    for (const [k, v] of Object.entries(s.defenceBonus ?? {})) {
      if (v) rows.push({ label: `Def ${k.charAt(0).toUpperCase() + k.slice(1)}`, value: v as number })
    }
    const o = s.other ?? {}
    if (o.meleeStr)  rows.push({ label: 'Melee Str.',    value: o.meleeStr })
    if (o.rangedStr) rows.push({ label: 'Ranged Str.',   value: o.rangedStr })
    if (o.magicStr)  rows.push({ label: 'Magic Dmg. %',  value: o.magicStr })
    if (o.prayer)    rows.push({ label: 'Prayer',         value: o.prayer })
  }

  let subtitle = ''
  if (armor) {
    if (armor.isShield) subtitle = `Shield · +${2 + (armor.enchantmentBonus ?? 0)} AC`
    else if (armor.type !== 'none') subtitle = `${armor.type.charAt(0).toUpperCase() + armor.type.slice(1)} armor · Base AC ${armor.baseAC}`
  }

  return (
    <div className={styles.breakdown}>
      <div className={styles.breakdownHead}>
        <div>
          <span className={styles.breakdownName}>{itemName}</span>
          {subtitle && <span className={styles.breakdownSub}>{subtitle}</span>}
        </div>
        <button className={styles.breakdownClose} onClick={onClose}>×</button>
      </div>
      {rows.length > 0 ? (
        <div className={styles.breakdownStats}>
          {rows.map(r => (
            <div key={r.label} className={styles.breakdownRow}>
              <span className={styles.breakdownLabel}>{r.label}</span>
              <span className={styles.breakdownValue} style={{ color: r.value > 0 ? 'var(--accent)' : 'var(--danger)' }}>
                {r.value > 0 ? `+${r.value}` : r.value}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <span className={styles.breakdownEmpty}>{subtitle || 'No bonus stats.'}</span>
      )}
    </div>
  )
}

// ─── Read-only slot (armor, weapon, shield shown from other data) ─────────────

function ReadSlot({ label, value, kind }: { label: string; value: string; kind: ShopItemKind | string }) {
  const hasItem = value !== '—'
  const iconSrc = slotPlaceholderUrl(kind)
  return (
    <div className={styles.slot} title={hasItem ? value : label}>
      <div className={styles.slotIconBtn}>
        <img
          src={iconSrc}
          alt={value}
          width={32}
          height={32}
          className={styles.slotIcon}
          data-empty={!hasItem || undefined}
        />
      </div>
      <span className={styles.slotLabel}>{label}</span>
    </div>
  )
}

function Empty() { return <div /> }

// ─── Stat rows ───────────────────────────────────────────────────────────────

function StatRow({ label, value, pct }: { label: string; value: number; pct?: boolean }) {
  const sign = value >= 0 ? '+' : ''
  const color = value === 0 ? 'var(--text-muted)' : value > 0 ? 'var(--accent)' : 'var(--danger, #e55)'
  return (
    <div className={styles.statRow}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue} style={{ color, fontWeight: value !== 0 ? 600 : 400 }}>
        {sign}{value}{pct ? '%' : ''}
      </span>
    </div>
  )
}

function StatGroup({ title, stats }: { title: string; stats: EquipmentStats }) {
  if (title === 'Attack') return (
    <div>
      <div className={styles.statGroupTitle}>{title}</div>
      <StatRow label="Stab"  value={stats.attackBonus.stab} />
      <StatRow label="Slash" value={stats.attackBonus.slash} />
      <StatRow label="Crush" value={stats.attackBonus.crush} />
      <StatRow label="Magic" value={stats.attackBonus.magic} />
      <StatRow label="Range" value={stats.attackBonus.ranged} />
    </div>
  )
  if (title === 'Defence') return (
    <div>
      <div className={styles.statGroupTitle}>{title}</div>
      <StatRow label="Stab"  value={stats.defenceBonus.stab} />
      <StatRow label="Slash" value={stats.defenceBonus.slash} />
      <StatRow label="Crush" value={stats.defenceBonus.crush} />
      <StatRow label="Magic" value={stats.defenceBonus.magic} />
      <StatRow label="Range" value={stats.defenceBonus.ranged} />
    </div>
  )
  return (
    <div>
      <div className={styles.statGroupTitle}>Other</div>
      <StatRow label="Melee str."  value={stats.other.meleeStr} />
      <StatRow label="Ranged str." value={stats.other.rangedStr} />
      <StatRow label="Magic dmg."  value={stats.other.magicStr} pct />
      <StatRow label="Prayer"      value={stats.other.prayer} />
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export function EquipmentLayout({ character: char }: Props) {
  const equipItemToSlot = useAppStore(s => s.equipItemToSlot)
  const _unequipSlot    = useAppStore(s => s.unequipSlot)

  const [armouryOpen,   setArmouryOpen]   = useState(false)
  const [activeSlot,    setActiveSlot]    = useState<keyof Equipment | null>(null)
  const [shopOpen,      setShopOpen]      = useState(false)
  const [draggedId,     setDraggedId]     = useState<string | null>(null)
  const [slotBreakdown, setSlotBreakdown] = useState<keyof Equipment | null>(null)

  function handleUnequip(slot: keyof Equipment) {
    _unequipSlot(char.id, slot)
    if (slotBreakdown === slot) setSlotBreakdown(null)
  }

  function openSlot(slot: keyof Equipment) {
    const itemId = char.equipment[slot]
    if (itemId) {
      setSlotBreakdown(prev => prev === slot ? null : slot)
      setArmouryOpen(false)
    } else {
      setActiveSlot(slot)
      setArmouryOpen(true)
      setSlotBreakdown(null)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggedId(null)
    const { active, over } = event
    if (!over) return
    const itemId    = active.data.current?.itemId as string | undefined
    const slot      = over.data.current?.slot    as keyof Equipment | undefined
    const itemKind  = active.data.current?.kind  as string | undefined
    const slotKind  = over.data.current?.kind    as string | undefined
    if (itemId && slot && itemKind === slotKind) {
      equipItemToSlot(char.id, slot, itemId)
    }
  }

  const draggedItem = draggedId ? SHOP_ITEM_BY_ID[draggedId] : null

  const armorName   = char.equipment.armorId
    ? (ARMOR_BY_ID[char.equipment.armorId]?.name ?? char.equipment.armorId)
    : '—'
  const offHandName = char.equipment.shieldId
    ? (ARMOR_BY_ID[char.equipment.shieldId]?.name ?? 'Shield')
    : char.weapons[1]?.name ?? '—'
  const mainHand    = char.weapons[0]?.name ?? '—'

  const equipStats = computeEquipmentStats(char)

  return (
    <DndContext
      onDragStart={e => setDraggedId(e.active.data.current?.itemId as string ?? null)}
      onDragEnd={handleDragEnd}
    >
      <div className={styles.outer}>
        <div className={styles.columnWrap}>
          {/* Equipment slot grid */}
          <div className={styles.grid}>
            <Empty />
            <SlotButton slotKey="helmetId"   label="Helmet"   char={char} onOpen={openSlot} onUnequip={handleUnequip} />
            <Empty />

            <SlotButton slotKey="necklaceId" label="Necklace" char={char} onOpen={openSlot} onUnequip={handleUnequip} />
            <ReadSlot   label="Chest"    value={armorName}   kind="armor" />
            <SlotButton slotKey="capeId"     label="Cape"     char={char} onOpen={openSlot} onUnequip={handleUnequip} />

            <ReadSlot   label="Weapon"   value={mainHand}    kind="weapon" />
            <SlotButton slotKey="legsId"     label="Legs"     char={char} onOpen={openSlot} onUnequip={handleUnequip} />
            <ReadSlot   label="Off-Hand" value={offHandName} kind="shield" />

            <SlotButton slotKey="glovesId"   label="Gloves"   char={char} onOpen={openSlot} onUnequip={handleUnequip} />
            <SlotButton slotKey="bootsId"    label="Boots"    char={char} onOpen={openSlot} onUnequip={handleUnequip} />
            <SlotButton slotKey="quiverId"   label="Quiver"   char={char} onOpen={openSlot} onUnequip={handleUnequip} />

            <SlotButton slotKey="ring1Id"    label="Ring 1"   char={char} onOpen={openSlot} onUnequip={handleUnequip} />
            <SlotButton slotKey="ring2Id"    label="Ring 2"   char={char} onOpen={openSlot} onUnequip={handleUnequip} />
            <SlotButton slotKey="amuletId"   label="Amulet"   char={char} onOpen={openSlot} onUnequip={handleUnequip} />
          </div>

          {/* Stats panel */}
          <div className={styles.statsPanel}>
            <StatGroup title="Attack"  stats={equipStats} />
            <StatGroup title="Defence" stats={equipStats} />
            <StatGroup title="Other"   stats={equipStats} />
          </div>
        </div>

        {/* Slot stat breakdown */}
        {slotBreakdown && (
          <SlotBreakdownPanel slot={slotBreakdown} char={char} onClose={() => setSlotBreakdown(null)} />
        )}

        {/* Armoury panel (inline) */}
        {armouryOpen && (
          <ArmouryPanel
            character={char}
            activeSlotFilter={activeSlot}
            onClose={() => setArmouryOpen(false)}
            onOpenShop={() => { setArmouryOpen(false); setShopOpen(true) }}
          />
        )}

        {/* Shop button */}
        {!armouryOpen && (
          <div className={styles.shopRow}>
            <span className={styles.goldDisplay}>💰 {char.gold} gp</span>
            <button className={styles.shopBtn} onClick={() => setShopOpen(true)}>
              Open Shop
            </button>
          </div>
        )}
      </div>

      {/* Drag overlay — shows a ghost card while dragging */}
      <DragOverlay>
        {draggedItem && (
          <ItemCard
            item={draggedItem}
            mode="armoury"
            onAction={() => {}}
            isDragging
          />
        )}
      </DragOverlay>

      {/* Shop modal */}
      {shopOpen && (
        <ShopModal character={char} onClose={() => setShopOpen(false)} />
      )}
    </DndContext>
  )
}
