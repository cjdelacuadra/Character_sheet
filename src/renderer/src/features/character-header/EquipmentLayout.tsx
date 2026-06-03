import { useState, useEffect, useRef } from 'react'
import { DndContext, DragOverlay, useDndContext, useDraggable, useDroppable, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import type { AbilityScore, Character, Equipment, Weapon } from '@/entities/character/types'
import type { Skill } from '@/shared/data/skills'
import { GEAR_BY_ID } from '@/shared/data/equipment/gear'
import { getShopItemById, slotPlaceholderUrl, slotToKind } from '@/shared/data/equipment/catalogue'
import { WEAPON_BY_ID, resolveWeaponSprite } from '@/shared/data/equipment/weapons'
import type { ShopItemKind } from '@/shared/data/equipment/catalogue'
import { computeEquipmentStats, type EquipmentStats } from '@/shared/data/charCalculations'
import { useAppStore } from '@/app/store'
import { InventoryGrid } from '@/features/inventory/InventoryGrid'
import { ShopModal } from '@/features/inventory/ShopModal'
import { ItemCard } from '@/features/inventory/ItemCard'
import { ItemEditorPanel } from '@/features/inventory/ItemEditorPanel'
import styles from './EquipmentLayout.module.css'

interface Props {
  character: Character
  onOpenShop?: () => void
  onCloseShop?: () => void
  isShopOpen?: boolean
  onInventorySelectItem?: (id: string | null) => void
  onFilterChange?: (kind: ShopItemKind | null) => void
}


function resolveSlotName(slot: keyof Equipment, char: Character): string | null {
  const val = char.equipment[slot] as string | null
  if (!val) return null
  const name = GEAR_BY_ID[val]?.name
  if (!name && import.meta.env.DEV && (slot === 'armorId' || slot === 'shieldId')) {
    console.warn(`resolveSlotName: no armor found for id "${val}"`)
  }
  return name ?? null
}

// ─── DroppableSlot ───────────────────────────────────────────────────────────

function SlotButton({
  slotKey,
  label,
  char,
  onOpen,
  onUnequip,
  isShaking,
}: {
  slotKey: keyof Equipment
  label: string
  char: Character
  onOpen: (slot: keyof Equipment) => void
  onUnequip: (slot: keyof Equipment) => void
  isShaking?: boolean
}) {
  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: slotKey,
    data: { slot: slotKey, kind: slotToKind(slotKey) },
  })

  const itemId   = char.equipment[slotKey] as string | null
  const itemName = resolveSlotName(slotKey, char)
  const kind     = slotToKind(slotKey)
  const isEmpty  = !itemId

  const {
    attributes: dragAttrs,
    listeners:  dragListeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: `equipped-${slotKey}`,
    data: { itemId, kind, fromSlot: slotKey, type: 'equipped' },
    disabled: isEmpty,
  })

  const { active } = useDndContext()
  const draggingKind = active?.data.current?.kind as string | undefined
  const isCompatible = !draggingKind || draggingKind === kind

  const customItems = useAppStore(s => s.customItems)
  const itemSprite = itemId ? getShopItemById(itemId, customItems)?.sprite : undefined
  const iconSrc    = itemSprite ?? slotPlaceholderUrl(kind)

  const isHighlighted = !isDragging && !!draggingKind && draggingKind === kind

  const gear = itemId ? GEAR_BY_ID[itemId] : null
  const requiresAttunement = gear?.requiresAttunement ?? false
  const isAttuned = requiresAttunement && !!(char.attunedItemIds ?? []).includes(itemId!)

  return (
    <div
      ref={setDropRef}
      className={`${styles.slot}${isShaking ? ` ${styles.shake}` : ''}`}
      data-over={isOver && isCompatible || undefined}
      data-dragging={isDragging || undefined}
      data-compatible={isHighlighted || undefined}
      title={itemName ?? label}
    >
      <button
        ref={setDragRef}
        className={styles.slotIconBtn}
        onClick={() => onOpen(slotKey)}
        {...dragListeners}
        {...dragAttrs}
      >
        <img
          src={iconSrc}
          alt={itemName ?? label}
          width={32}
          height={32}
          className={styles.slotIcon}
          data-empty={isEmpty || undefined}
        />
        {requiresAttunement && !isEmpty && (
          <span
            className={styles.attuneDot}
            title={isAttuned ? 'Attuned' : 'Not attuned'}
            data-attuned={isAttuned || undefined}
          >
            {isAttuned ? '●' : '○'}
          </span>
        )}
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

function SlotBreakdownPanel({ slot, char, onClose, onToggleAttune }: {
  slot: keyof Equipment
  char: Character
  onClose: () => void
  onToggleAttune: (itemId: string) => void
}) {
  const itemId = char.equipment[slot] as string | null
  if (!itemId) return null

  const itemName = resolveSlotName(slot, char) ?? itemId
  const gear = GEAR_BY_ID[itemId]

  const rows: { label: string; value: number }[] = []
  const advRows: string[] = []
  const s = gear?.stats
  if (s) {
    if (s.acBonus) rows.push({ label: 'AC Bonus', value: s.acBonus })
    if (s.toHitBonus) rows.push({ label: 'To-Hit Bonus', value: s.toHitBonus })
    for (const [ab, val] of Object.entries(s.savingThrowBonus ?? {}) as [AbilityScore, number][]) {
      if (val) rows.push({ label: `${ab.toUpperCase()} Save`, value: val })
    }
    for (const [sk, val] of Object.entries(s.skillBonus ?? {}) as [Skill, number][]) {
      if (val) rows.push({ label: sk.charAt(0).toUpperCase() + sk.slice(1), value: val })
    }
    for (const ab of s.advantage?.savingThrows ?? []) advRows.push(`${ab.toUpperCase()} Saves`)
    for (const sk of s.advantage?.skills ?? []) advRows.push(sk.charAt(0).toUpperCase() + sk.slice(1))
    if (s.advantage?.deathSaves) advRows.push('Death Saves')
  }

  let subtitle = ''
  if (gear && (gear.kind === 'armor' || gear.kind === 'shield')) {
    if (gear.kind === 'shield') subtitle = `Shield · +${(gear.baseAC ?? 2) + (gear.enchantmentBonus ?? 0)} AC`
    else if (gear.type && gear.type !== 'none') subtitle = `${gear.type.charAt(0).toUpperCase() + gear.type.slice(1)} armor · Base AC ${gear.baseAC ?? 0}`
  }

  const attunedIds = char.attunedItemIds ?? []
  const isAttuned = attunedIds.includes(itemId)
  const attunedCount = attunedIds.length
  const atCap = attunedCount >= 3

  return (
    <div className={styles.breakdown}>
      <div className={styles.breakdownHead}>
        <div>
          <span className={styles.breakdownName}>{itemName}</span>
          {subtitle && <span className={styles.breakdownSub}>{subtitle}</span>}
        </div>
        <button className={styles.breakdownClose} onClick={onClose}>×</button>
      </div>
      {(rows.length > 0 || advRows.length > 0) ? (
        <div className={styles.breakdownStats}>
          {rows.map(r => (
            <div key={r.label} className={styles.breakdownRow}>
              <span className={styles.breakdownLabel}>{r.label}</span>
              <span className={styles.breakdownValue} style={{ color: r.value > 0 ? 'var(--accent)' : 'var(--danger)' }}>
                {r.value > 0 ? `+${r.value}` : r.value}
              </span>
            </div>
          ))}
          {advRows.map(label => (
            <div key={label} className={styles.breakdownRow}>
              <span className={styles.breakdownLabel}>{label}</span>
              <span className={styles.breakdownValue} style={{ color: 'var(--accent)' }}>Adv</span>
            </div>
          ))}
        </div>
      ) : (
        <span className={styles.breakdownEmpty}>{subtitle || 'No bonus stats.'}</span>
      )}
      {gear?.requiresAttunement && (
        <button
          className={`${styles.attuneBtn}${isAttuned ? ` ${styles.attuneBtnActive}` : ''}`}
          disabled={!isAttuned && atCap}
          onClick={() => onToggleAttune(itemId)}
          title={!isAttuned && atCap ? 'Attunement cap reached (max 3)' : undefined}
        >
          {isAttuned ? 'Unattune' : atCap ? 'Attune (cap reached)' : 'Attune'}
        </button>
      )}
    </div>
  )
}

// ─── Weapon stat breakdown ───────────────────────────────────────────────────

function WeaponBreakdownPanel({ weapon, onClose, onToggleTwoHanded, canTwoHand }: {
  weapon: Weapon
  onClose: () => void
  onToggleTwoHanded?: () => void
  canTwoHand?: boolean
}) {
  const props = (weapon.properties ?? []).map(p => p.toLowerCase())
  const versatileDie = props.find(p => p.startsWith('versatile ('))?.match(/versatile \((\d+d\d+)\)/)?.[1]
  const activeDamage = (versatileDie && weapon.twoHanded && canTwoHand) ? versatileDie : weapon.damage
  const rows: { label: string; value: string }[] = []
  rows.push({ label: 'Damage', value: activeDamage + (weapon.damageType ? ` ${weapon.damageType}` : '') })
  rows.push({ label: 'Attack bonus', value: weapon.atkBonus >= 0 ? `+${weapon.atkBonus}` : String(weapon.atkBonus) })
  if (weapon.rangeType)       rows.push({ label: 'Range',       value: weapon.rangeType })
  if (weapon.enchantmentBonus) rows.push({ label: 'Enchantment', value: `+${weapon.enchantmentBonus}` })
  if (weapon.properties?.length) rows.push({ label: 'Properties', value: weapon.properties.join(', ') })
  if (weapon.bonusDamageDie)  rows.push({ label: 'Bonus dmg',  value: `${weapon.bonusDamageDie}${weapon.bonusDamageType ? ` ${weapon.bonusDamageType}` : ''}` })

  return (
    <div className={styles.breakdown}>
      <div className={styles.breakdownHead}>
        <div>
          <span className={styles.breakdownName}>{weapon.name}</span>
          <span className={styles.breakdownSub}>+{weapon.atkBonus} to hit</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {versatileDie && onToggleTwoHanded && (
            <div style={{ display: 'flex', gap: '2px' }}>
              <button
                onClick={() => { if (weapon.twoHanded) onToggleTwoHanded() }}
                style={{ padding: '2px 6px', fontSize: '11px', opacity: weapon.twoHanded && canTwoHand ? 0.5 : 1, fontWeight: weapon.twoHanded && canTwoHand ? 'normal' : 'bold' }}
              >1H</button>
              <button
                onClick={() => { if (!weapon.twoHanded && canTwoHand) onToggleTwoHanded() }}
                disabled={!canTwoHand}
                title={!canTwoHand ? 'Unequip off-hand to use two-handed' : undefined}
                style={{ padding: '2px 6px', fontSize: '11px', opacity: weapon.twoHanded && canTwoHand ? 1 : 0.5, fontWeight: weapon.twoHanded && canTwoHand ? 'bold' : 'normal', cursor: !canTwoHand ? 'not-allowed' : undefined }}
              >2H</button>
            </div>
          )}
          <button className={styles.breakdownClose} onClick={onClose}>×</button>
        </div>
      </div>
      <div className={styles.breakdownStats}>
        {rows.map(r => (
          <div key={r.label} className={styles.breakdownRow}>
            <span className={styles.breakdownLabel}>{r.label}</span>
            <span className={styles.breakdownValue} style={{ color: 'var(--text)' }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Read-only slot (armor, weapon, shield shown from other data) ─────────────

function ReadSlot({ label, value, kind, itemId: itemIdProp, spriteOverride, onClick, onUnequip, isShaking, draggable: draggableProp, droppableSlot, droppableWeaponSlot }: {
  label: string
  value: string
  kind: ShopItemKind | string
  itemId?: string | null
  spriteOverride?: string
  onClick?: () => void
  onUnequip?: () => void
  isShaking?: boolean
  draggable?: { id: string; itemId: string; kind: ShopItemKind; fromSlot: keyof Equipment; fromWeaponSlot?: 0 | 1 }
  droppableSlot?: keyof Equipment
  droppableWeaponSlot?: 0 | 1
}) {
  const droppableId =
    droppableWeaponSlot !== undefined ? `weapon-slot-${droppableWeaponSlot}`
    : droppableSlot ?? `__noop-${label}`
  const droppableData =
    droppableWeaponSlot !== undefined ? { weaponSlot: droppableWeaponSlot, kind }
    : droppableSlot ? { slot: droppableSlot, kind }
    : {}
  const isDroppable = droppableSlot !== undefined || droppableWeaponSlot !== undefined

  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id:   droppableId,
    data: droppableData,
  })

  const {
    attributes: dragAttrs,
    listeners:  dragListeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id:       draggableProp?.id ?? `read-slot-disabled-${label}`,
    data:     draggableProp
      ? { itemId: draggableProp.itemId, kind: draggableProp.kind, fromSlot: draggableProp.fromSlot, fromWeaponSlot: draggableProp.fromWeaponSlot, type: 'equipped' }
      : {},
    disabled: !draggableProp,
  })

  const { active } = useDndContext()
  const draggingKind = active?.data.current?.kind as string | undefined
  const isCompatible = !!draggingKind && draggingKind === kind
  const isHighlighted = !isDragging && isCompatible

  const customItems = useAppStore(s => s.customItems)
  const hasItem = value !== '—'
  const iconSrc = spriteOverride ?? ((itemIdProp && getShopItemById(itemIdProp, customItems)?.sprite) || slotPlaceholderUrl(kind))
  const isClickable = !!onClick
  const iconEl = (
    <img
      src={iconSrc}
      alt={value}
      width={32}
      height={32}
      className={styles.slotIcon}
      data-empty={!hasItem || undefined}
    />
  )
  return (
    <div
      ref={setDropRef}
      className={`${styles.slot}${isShaking ? ` ${styles.shake}` : ''}`}
      data-over={isOver && isCompatible && isDroppable || undefined}
      data-dragging={isDragging || undefined}
      data-compatible={isHighlighted || undefined}
      title={hasItem ? value : label}
    >
      {isClickable
        ? <button
            ref={setDragRef}
            className={styles.slotIconBtn}
            onClick={onClick}
            {...dragListeners}
            {...dragAttrs}
          >{iconEl}</button>
        : <div className={styles.slotIconBtn}>{iconEl}</div>
      }
      <span className={styles.slotLabel}>{label}</span>
      {hasItem && onUnequip && (
        <button
          className={styles.slotUnequip}
          onClick={onUnequip}
          title="Unequip"
        >×</button>
      )}
    </div>
  )
}

function Empty() { return <div /> }

// ─── Stat rows ───────────────────────────────────────────────────────────────

function StatRow({ label, value, unit = '' }: { label: string; value: number; unit?: string }) {
  const sign  = value >= 0 ? '+' : ''
  const color = value > 0 ? 'var(--accent)' : value < 0 ? 'var(--danger, #e55)' : 'var(--text-muted)'
  return (
    <div className={styles.statRow}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue} style={{ color, fontWeight: value !== 0 ? 600 : 400 }}>
        {sign}{value}{unit}
      </span>
    </div>
  )
}

function DndEquipStatsPanel({ stats, char }: { stats: EquipmentStats; char: Character }) {
  const saveEntries   = Object.entries(stats.savingThrowBonus).filter(([, v]) => v !== 0) as [AbilityScore, number][]
  const skillEntries  = Object.entries(stats.skillBonus).filter(([, v]) => v !== 0) as [Skill, number][]
  const abilityEntries = Object.entries(stats.abilityBonus).filter(([, v]) => v !== 0) as [AbilityScore, number][]
  const advSaves  = stats.advantage.savingThrows
  const advSkills = stats.advantage.skills
  const hasAny = stats.acBonus || stats.toHitBonus || stats.speedBonus || abilityEntries.length ||
    saveEntries.length || skillEntries.length || advSaves.length ||
    advSkills.length || stats.advantage.deathSaves || stats.bonusDamage.length

  const attunedIds = char.attunedItemIds ?? []
  const attunedCount = attunedIds.length

  // Collect names of attuned + equipped items
  const attunedEquippedNames: string[] = []
  for (const id of attunedIds) {
    const gear = GEAR_BY_ID[id]
    const weapon = char.weapons.find(w => w.id === id)
    const name = gear?.name ?? weapon?.name
    if (name) attunedEquippedNames.push(name)
  }

  const AdVCell = ({ label }: { label: string }) => (
    <div className={styles.statRow}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue} style={{ color: 'var(--accent)', fontWeight: 600 }}>Adv</span>
    </div>
  )

  return (
    <div className={styles.statsPanel}>
      {/* Attunement section — always visible */}
      <div className={styles.attuneSection}>
        <div className={styles.statRow}>
          <span className={styles.statLabel} style={{ fontWeight: 700, color: 'var(--text)' }}>Attuned</span>
          <span className={styles.statValue} style={{ color: attunedCount > 0 ? '#f0c040' : 'var(--text-muted)', fontWeight: 700 }}>
            {attunedCount}/3
          </span>
        </div>
        {attunedEquippedNames.map(name => (
          <div key={name} className={styles.attunedItemRow}>
            <span className={styles.attunedItemDot}>●</span>
            <span className={styles.attunedItemName}>{name}</span>
          </div>
        ))}
        {attunedCount === 0 && (
          <span className={styles.statEmpty}>None attuned</span>
        )}
      </div>

      {!hasAny && <span className={styles.statEmpty}>No accessory bonuses</span>}
      {stats.acBonus !== 0 && <StatRow label="AC Bonus" value={stats.acBonus} />}
      {stats.toHitBonus !== 0 && <StatRow label="To-Hit" value={stats.toHitBonus} />}
      {stats.speedBonus !== 0 && <StatRow label="Speed" value={stats.speedBonus} unit=" ft" />}
      {abilityEntries.length > 0 && <div className={styles.statGroupTitle}>Ability</div>}
      {abilityEntries.map(([ab, val]) => <StatRow key={ab} label={ab.toUpperCase()} value={val} />)}
      {saveEntries.length > 0 && <div className={styles.statGroupTitle}>Saving Throws</div>}
      {saveEntries.map(([ab, val]) => <StatRow key={ab} label={ab.toUpperCase()} value={val} />)}
      {skillEntries.length > 0 && <div className={styles.statGroupTitle}>Skills</div>}
      {skillEntries.map(([sk, val]) => (
        <StatRow key={sk} label={sk.charAt(0).toUpperCase() + sk.slice(1)} value={val} />
      ))}
      {(advSaves.length > 0 || advSkills.length > 0 || stats.advantage.deathSaves) && (
        <div>
          <div className={styles.statGroupTitle}>Advantage</div>
          {advSaves.map(ab => <AdVCell key={ab} label={`${ab.toUpperCase()} Saves`} />)}
          {advSkills.map(sk => <AdVCell key={sk} label={sk.charAt(0).toUpperCase() + sk.slice(1)} />)}
          {stats.advantage.deathSaves && <AdVCell label="Death Saves" />}
        </div>
      )}
      {stats.bonusDamage.length > 0 && (
        <div>
          <div className={styles.statGroupTitle}>Bonus Dmg</div>
          {stats.bonusDamage.map((bd, i) => {
            const expr = [...bd.dice, bd.flat ? `+${bd.flat}` : null].filter(Boolean).join('')
            const label = `${bd.dmgType}${bd.appliesTo !== 'all' ? ` (${bd.appliesTo})` : ''}`
            return (
              <div key={i} className={styles.statRow}>
                <span className={styles.statLabel}>{label}</span>
                <span className={styles.statValue} style={{ color: 'var(--accent)', fontWeight: 600 }}>{expr}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export function EquipmentLayout({ character: char, onOpenShop, onCloseShop, isShopOpen, onInventorySelectItem, onFilterChange }: Props) {
  const equipItemToSlot   = useAppStore(s => s.equipItemToSlot)
  const equipWeaponFromId = useAppStore(s => s.equipWeaponFromId)
  const _unequipSlot      = useAppStore(s => s.unequipSlot)
  const _unequipWeapon    = useAppStore(s => s.unequipWeapon)
  const updateCharacter   = useAppStore(s => s.updateCharacter)
  const customItems       = useAppStore(s => s.customItems)
  const toggleAttune      = useAppStore(s => s.toggleAttune)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  const [inventoryFilter,     setInventoryFilter]     = useState<ShopItemKind | null>(null)
  const [shopOpen,            setShopOpen]            = useState(false)
  const [draggedId,           setDraggedId]           = useState<string | null>(null)
  const [slotBreakdown,       setSlotBreakdown]       = useState<keyof Equipment | null>(null)
  const [weaponBreakdown,     setWeaponBreakdown]     = useState<number | null>(null)
  const [shakingId,           setShakingId]           = useState<string | null>(null)
  const [inventorySelectedId, setInventorySelectedId] = useState<string | null>(null)
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (shakeTimer.current) clearTimeout(shakeTimer.current) }, [])

  function handleInventorySelect(id: string | null) {
    setInventorySelectedId(id)
    if (id) {
      setSlotBreakdown(null)
      setWeaponBreakdown(null)
      setShopOpen(false)
      onInventorySelectItem?.(id)
    } else {
      onInventorySelectItem?.(null)
    }
  }

  function handleEquipInventoryItem(itemId: string) {
    const item = getShopItemById(itemId, customItems)
    if (!item) return
    if (item.kind === 'weapon') {
      equipWeaponFromId(char.id, itemId, 0)
      const def = WEAPON_BY_ID[itemId]
      if (def?.properties?.some(p => p.toLowerCase() === 'two-handed')) {
        if (char.weapons[1]) _unequipWeapon(char.id, 1)
        if (char.equipment.shieldId) _unequipSlot(char.id, 'shieldId')
      }
      setInventorySelectedId(null)
      return
    }
    if (item.kind === 'shield') {
      const mainIsTwoHanded = char.weapons[0]?.properties?.some(p => p.toLowerCase() === 'two-handed') ?? false
      if (mainIsTwoHanded) return
    }
    const slotMap: Partial<Record<ShopItemKind, keyof Equipment>> = {
      armor:    'armorId',   shield:   'shieldId',
      helmet:   'helmetId',  necklace: 'necklaceId',
      cape:     'capeId',    legs:     'legsId',
      boots:    'bootsId',   gloves:   'glovesId',
      quiver:   'quiverId',
      ring:     char.equipment.ring1Id ? 'ring2Id' : 'ring1Id',
      amulet:   'amuletId',
    }
    const slot = slotMap[item.kind]
    if (slot) equipItemToSlot(char.id, slot, itemId)
    setInventorySelectedId(null)
  }

  function handleUnequip(slot: keyof Equipment) {
    _unequipSlot(char.id, slot)
    if (slotBreakdown === slot) setSlotBreakdown(null)
  }

  function openSlot(slot: keyof Equipment) {
    const itemId = char.equipment[slot] as string | null
    if (itemId) {
      setWeaponBreakdown(null)
      setInventorySelectedId(null)
      setSlotBreakdown(prev => prev === slot ? null : slot)
    } else {
      setInventoryFilter(slotToKind(String(slot)))
    }
  }

  function openWeaponBreakdown(idx: number) {
    setSlotBreakdown(null)
    setInventorySelectedId(null)
    setWeaponBreakdown(prev => prev === idx ? null : idx)
  }

  function shake(id: string) {
    if (shakeTimer.current) clearTimeout(shakeTimer.current)
    setShakingId(id)
    shakeTimer.current = setTimeout(() => setShakingId(null), 400)
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggedId(null)
    const { active, over } = event
    const itemId   = active.data.current?.itemId  as string | undefined
    const kind     = active.data.current?.kind    as string | undefined
    const fromSlot = active.data.current?.fromSlot as keyof Equipment | undefined
    const type     = active.data.current?.type    as string | undefined

    if (!over || !itemId || !kind) return

    // Dropped on inventory grid → unequip
    if (over.id === 'inventory-grid') {
      const weaponSlot = active.data.current?.fromWeaponSlot as 0 | 1 | undefined
      if (weaponSlot !== undefined) {
        _unequipWeapon(char.id, weaponSlot)
      } else if (fromSlot) {
        _unequipSlot(char.id, fromSlot)
      }
      return
    }

    // Dropped on weapon slot
    const weaponSlotIdx = over.data.current?.weaponSlot as 0 | 1 | undefined
    if (weaponSlotIdx !== undefined) {
      if (kind !== 'weapon') { shake(active.id as string); return }
      // Block off-hand slot when main weapon is two-handed
      if (weaponSlotIdx === 1) {
        const mainIsTwoHanded = char.weapons[0]?.properties?.some(p => p.toLowerCase() === 'two-handed') ?? false
        if (mainIsTwoHanded) { shake(active.id as string); return }
      }
      equipWeaponFromId(char.id, itemId, weaponSlotIdx)
      // Auto-unequip off-hand when equipping a two-handed weapon to main hand
      if (weaponSlotIdx === 0) {
        const def = WEAPON_BY_ID[itemId]
        const isTwoHanded = def?.properties?.some(p => p.toLowerCase() === 'two-handed') ?? false
        if (isTwoHanded) {
          if (char.weapons[1]) _unequipWeapon(char.id, 1)
          if (char.equipment.shieldId) _unequipSlot(char.id, 'shieldId')
        }
      }
      const fromWeaponSlot = active.data.current?.fromWeaponSlot as 0 | 1 | undefined
      if (fromWeaponSlot !== undefined && fromWeaponSlot !== weaponSlotIdx) {
        _unequipWeapon(char.id, fromWeaponSlot)
      }
      return
    }

    const toSlot   = over.data.current?.slot   as keyof Equipment | undefined
    const slotKind = over.data.current?.kind   as string | undefined
    if (!toSlot) return

    // Kind mismatch → shake
    if (kind !== slotKind) {
      shake(active.id as string)
      return
    }

    // Block shield equip when main hand weapon is two-handed
    if (toSlot === 'shieldId') {
      const mainIsTwoHanded = char.weapons[0]?.properties?.some(p => p.toLowerCase().includes('two-handed')) ?? false
      if (mainIsTwoHanded) {
        shake(active.id as string)
        return
      }
    }

    if (type === 'equipped' && fromSlot) {
      if (fromSlot === toSlot) return
      const toItemId = char.equipment[toSlot] as string | null
      equipItemToSlot(char.id, toSlot, itemId)
      if (toItemId) {
        equipItemToSlot(char.id, fromSlot, toItemId)
      } else {
        _unequipSlot(char.id, fromSlot)
      }
    } else {
      equipItemToSlot(char.id, toSlot, itemId)
    }
  }

  const draggedItem = draggedId ? getShopItemById(draggedId, customItems) : null

  const armorName   = char.equipment.armorId
    ? (GEAR_BY_ID[char.equipment.armorId]?.name ?? char.equipment.armorId)
    : '—'
  const offHandName = char.equipment.shieldId
    ? (GEAR_BY_ID[char.equipment.shieldId]?.name ?? 'Shield')
    : char.weapons[1]?.name ?? '—'
  const mainHand    = char.weapons[0]?.name ?? '—'

  const equipStats = computeEquipmentStats(char)

  function openKindInInventory(kind: ShopItemKind) {
    setInventoryFilter(prev => prev === kind ? null : kind)
    setSlotBreakdown(null)
    setWeaponBreakdown(null)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={e => setDraggedId(e.active.data.current?.itemId as string ?? null)}
      onDragEnd={handleDragEnd}
    >
      <div className={styles.outer}>
        <div className={styles.equipRow}>
          <div className={styles.columnWrap}>
            {/* Equipment slot grid — 4 rows × 3 cols */}
            <div className={styles.grid}>
              {/* Row 1: Necklace | Helmet | Cape */}
              <SlotButton slotKey="necklaceId" label="Necklace" char={char} onOpen={openSlot} onUnequip={handleUnequip} isShaking={shakingId === 'equipped-necklaceId'} />
              <SlotButton slotKey="helmetId"   label="Helmet"   char={char} onOpen={openSlot} onUnequip={handleUnequip} isShaking={shakingId === 'equipped-helmetId'} />
              <SlotButton slotKey="capeId"     label="Cape"     char={char} onOpen={openSlot} onUnequip={handleUnequip} isShaking={shakingId === 'equipped-capeId'} />

              {/* Row 2: Weapon | Armor | Off-Hand */}
              <ReadSlot   label="Weapon"   value={mainHand}    kind="weapon"
                itemId={char.weapons[0]?.id}
                spriteOverride={resolveWeaponSprite(getShopItemById(char.weapons[0]?.id, customItems)?.sprite, char.weapons[0]?.enchantment)}
                droppableWeaponSlot={0}
                onClick={char.weapons[0] ? () => openWeaponBreakdown(0) : () => openKindInInventory('weapon')}
                onUnequip={char.weapons[0] ? () => { _unequipWeapon(char.id, 0); if (weaponBreakdown === 0) setWeaponBreakdown(null) } : undefined}
                draggable={char.weapons[0] ? { id: 'read-weapon0', itemId: char.weapons[0].id, kind: 'weapon', fromSlot: 'armorId' as keyof Equipment, fromWeaponSlot: 0 } : undefined} />
              <ReadSlot   label="Chest"    value={armorName}   kind="armor"
                itemId={char.equipment.armorId}
                onClick={() => openSlot('armorId')}
                onUnequip={char.equipment.armorId ? () => handleUnequip('armorId') : undefined}
                isShaking={shakingId === 'equipped-armorId'}
                draggable={char.equipment.armorId ? { id: 'equipped-armorId', itemId: char.equipment.armorId, kind: 'armor', fromSlot: 'armorId' } : undefined}
                droppableSlot="armorId" />
              <ReadSlot   label="Off-Hand" value={offHandName} kind="shield"
                itemId={char.weapons[1]?.id ?? char.equipment.shieldId}
                spriteOverride={char.weapons[1] ? resolveWeaponSprite(getShopItemById(char.weapons[1].id, customItems)?.sprite, char.weapons[1].enchantment) : undefined}
                droppableSlot="shieldId"
                onClick={() => char.weapons[1] ? openWeaponBreakdown(1) : openSlot('shieldId')}
                onUnequip={
                  char.weapons[1]
                    ? () => { _unequipWeapon(char.id, 1); if (weaponBreakdown === 1) setWeaponBreakdown(null) }
                    : char.equipment.shieldId
                      ? () => handleUnequip('shieldId')
                      : undefined
                }
                isShaking={shakingId === 'equipped-shieldId'}
                draggable={
                  char.weapons[1]
                    ? { id: 'read-weapon1', itemId: char.weapons[1].id, kind: 'weapon', fromSlot: 'shieldId' as keyof Equipment, fromWeaponSlot: 1 }
                    : char.equipment.shieldId
                      ? { id: 'equipped-shieldId', itemId: char.equipment.shieldId, kind: 'shield', fromSlot: 'shieldId' }
                      : undefined
                } />

              {/* Row 3: Gloves | Legs | Ring 1 */}
              <SlotButton slotKey="glovesId"   label="Gloves"   char={char} onOpen={openSlot} onUnequip={handleUnequip} isShaking={shakingId === 'equipped-glovesId'} />
              <SlotButton slotKey="legsId"     label="Legs"     char={char} onOpen={openSlot} onUnequip={handleUnequip} isShaking={shakingId === 'equipped-legsId'} />
              <SlotButton slotKey="ring1Id"    label="Ring 1"   char={char} onOpen={openSlot} onUnequip={handleUnequip} isShaking={shakingId === 'equipped-ring1Id'} />

              {/* Row 4: Ring 2 | Boots | Amulet */}
              <SlotButton slotKey="ring2Id"    label="Ring 2"   char={char} onOpen={openSlot} onUnequip={handleUnequip} isShaking={shakingId === 'equipped-ring2Id'} />
              <SlotButton slotKey="bootsId"    label="Boots"    char={char} onOpen={openSlot} onUnequip={handleUnequip} isShaking={shakingId === 'equipped-bootsId'} />
              <SlotButton slotKey="amuletId"   label="Amulet"   char={char} onOpen={openSlot} onUnequip={handleUnequip} isShaking={shakingId === 'equipped-amuletId'} />
            </div>

            {/* Stats panel */}
            <DndEquipStatsPanel stats={equipStats} char={char} />
          </div>

          <div className={styles.inventoryCol}>
            {(() => {
              const externalOpen = isShopOpen ?? false
              const open = onOpenShop ? externalOpen : shopOpen
              const handleToggleShop = () => {
                if (open) { onCloseShop ? onCloseShop() : setShopOpen(false) }
                else { setInventorySelectedId(null); onOpenShop ? onOpenShop() : setShopOpen(true) }
              }
              return (
                <InventoryGrid
                  character={char}
                  filterKind={inventoryFilter}
                  onFilterChange={(k) => { setInventoryFilter(k); onFilterChange?.(k) }}
                  shakingId={shakingId}
                  selectedItemId={inventorySelectedId}
                  onSelectItem={handleInventorySelect}
                  isShopOpen={open}
                  onToggleShop={handleToggleShop}
                />
              )
            })()}
          </div>
        </div>

        {/* Item editor — shows when an inventory item is selected */}
        {inventorySelectedId && (
          <ItemEditorPanel
            itemId={inventorySelectedId}
            onClose={() => setInventorySelectedId(null)}
            onEquip={() => handleEquipInventoryItem(inventorySelectedId)}
          />
        )}

        {/* Slot/weapon breakdowns — mutually exclusive with item editor */}
        {!inventorySelectedId && slotBreakdown && (
          <SlotBreakdownPanel
            slot={slotBreakdown}
            char={char}
            onClose={() => setSlotBreakdown(null)}
            onToggleAttune={(itemId) => toggleAttune(char.id, itemId)}
          />
        )}
        {!inventorySelectedId && weaponBreakdown !== null && char.weapons[weaponBreakdown] && (
          <WeaponBreakdownPanel
            weapon={char.weapons[weaponBreakdown]}
            onClose={() => setWeaponBreakdown(null)}
            canTwoHand={!char.weapons[1] && !char.equipment.shieldId}
            onToggleTwoHanded={() => {
              const idx = weaponBreakdown
              const updated = char.weapons.map((w, i) => i === idx ? { ...w, twoHanded: !w.twoHanded } : w)
              updateCharacter(char.id, { weapons: updated })
            }}
          />
        )}

      </div>

      {/* Drag overlay — shows a ghost card while dragging */}
      <DragOverlay>
        {draggedItem && (
          <ItemCard
            item={draggedItem}
            mode="inventory"
            onAction={() => {}}
            isDragging
          />
        )}
      </DragOverlay>

      {/* Shop modal */}
      {shopOpen && (
        <ShopModal character={char} onClose={() => setShopOpen(false)} filterKind={inventoryFilter} />
      )}
    </DndContext>
  )
}
