import { useState, useEffect, useRef } from 'react'
import { DndContext, DragOverlay, useDndContext, useDraggable, useDroppable } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import type { AbilityScore, Character, Equipment, Weapon } from '@/entities/character/types'
import type { Skill } from '@/shared/data/skills'
import { ARMOR_BY_ID } from '@/shared/data/equipment/armor'
import { ACCESSORY_BY_ID } from '@/shared/data/equipment/accessories'
import { SHOP_ITEM_BY_ID, slotPlaceholderUrl, slotToKind } from '@/shared/data/equipment/catalogue'
import type { ShopItemKind } from '@/shared/data/equipment/catalogue'
import { computeEquipmentStats, type EquipmentStats } from '@/shared/data/charCalculations'
import { useAppStore } from '@/app/store'
import { ArmouryPanel } from '@/features/armoury/ArmouryPanel'
import { ShopModal } from '@/features/armoury/ShopModal'
import { ItemCard } from '@/features/armoury/ItemCard'
import styles from './EquipmentLayout.module.css'

interface Props {
  character: Character
}


function resolveSlotName(slot: keyof Equipment, char: Character): string | null {
  const val = char.equipment[slot] as string | null
  if (!val) return null
  if (slot === 'armorId' || slot === 'shieldId') {
    const name = ARMOR_BY_ID[val]?.name
    if (!name && import.meta.env.DEV) console.warn(`resolveSlotName: no armor found for id "${val}"`)
    return name ?? null
  }
  return ACCESSORY_BY_ID[val]?.name ?? null
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

  const itemSprite = itemId ? SHOP_ITEM_BY_ID[itemId]?.sprite : undefined
  const iconSrc    = itemSprite ?? slotPlaceholderUrl(kind)

  return (
    <div
      ref={setDropRef}
      className={`${styles.slot}${isShaking ? ` ${styles.shake}` : ''}`}
      data-over={isOver && isCompatible || undefined}
      data-dragging={isDragging || undefined}
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
  const itemId = char.equipment[slot] as string | null
  if (!itemId) return null

  const itemName = resolveSlotName(slot, char) ?? itemId
  const isArmorSlot = slot === 'armorId' || slot === 'shieldId'
  const armor = isArmorSlot ? ARMOR_BY_ID[itemId] : null
  const acc   = ACCESSORY_BY_ID[itemId]

  const rows: { label: string; value: number }[] = []
  const advRows: string[] = []
  const s = acc?.stats
  if (s) {
    if (s.acBonus) rows.push({ label: 'AC Bonus', value: s.acBonus })
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
  const activeDamage = (versatileDie && weapon.twoHanded) ? versatileDie : weapon.damage
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
          {versatileDie && canTwoHand && onToggleTwoHanded && (
            <div style={{ display: 'flex', gap: '2px' }}>
              <button
                onClick={() => { if (weapon.twoHanded) onToggleTwoHanded() }}
                style={{ padding: '2px 6px', fontSize: '11px', opacity: weapon.twoHanded ? 0.5 : 1, fontWeight: weapon.twoHanded ? 'normal' : 'bold' }}
              >1H</button>
              <button
                onClick={() => { if (!weapon.twoHanded) onToggleTwoHanded() }}
                style={{ padding: '2px 6px', fontSize: '11px', opacity: weapon.twoHanded ? 1 : 0.5, fontWeight: weapon.twoHanded ? 'bold' : 'normal' }}
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

function ReadSlot({ label, value, kind, onClick, isShaking, draggable: draggableProp }: {
  label: string
  value: string
  kind: ShopItemKind | string
  onClick?: () => void
  isShaking?: boolean
  draggable?: { id: string; itemId: string; kind: ShopItemKind; fromSlot: keyof Equipment }
}) {
  const {
    attributes: dragAttrs,
    listeners:  dragListeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id:       draggableProp?.id ?? `read-slot-disabled-${label}`,
    data:     draggableProp
      ? { itemId: draggableProp.itemId, kind: draggableProp.kind, fromSlot: draggableProp.fromSlot, type: 'equipped' }
      : {},
    disabled: !draggableProp,
  })

  const hasItem = value !== '—'
  const iconSrc = slotPlaceholderUrl(kind)
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
      className={`${styles.slot}${isShaking ? ` ${styles.shake}` : ''}`}
      data-dragging={isDragging || undefined}
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
    </div>
  )
}

function Empty() { return <div /> }

// ─── Stat rows ───────────────────────────────────────────────────────────────

function StatRow({ label, value }: { label: string; value: number }) {
  const sign  = value >= 0 ? '+' : ''
  const color = value > 0 ? 'var(--accent)' : value < 0 ? 'var(--danger, #e55)' : 'var(--text-muted)'
  return (
    <div className={styles.statRow}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue} style={{ color, fontWeight: value !== 0 ? 600 : 400 }}>
        {sign}{value}
      </span>
    </div>
  )
}

function DndEquipStatsPanel({ stats }: { stats: EquipmentStats }) {
  const saveEntries = Object.entries(stats.savingThrowBonus).filter(([, v]) => v !== 0) as [AbilityScore, number][]
  const skillEntries = Object.entries(stats.skillBonus).filter(([, v]) => v !== 0) as [Skill, number][]
  const advSaves  = stats.advantage.savingThrows
  const advSkills = stats.advantage.skills
  const hasAny = stats.acBonus || saveEntries.length || skillEntries.length ||
    advSaves.length || advSkills.length || stats.advantage.deathSaves

  if (!hasAny) return (
    <div className={styles.statsPanel}>
      <span className={styles.statEmpty}>No accessory bonuses</span>
    </div>
  )

  return (
    <div className={styles.statsPanel}>
      {stats.acBonus !== 0 && <StatRow label="AC Bonus" value={stats.acBonus} />}
      {saveEntries.length > 0 && <div className={styles.statGroupTitle}>Saving Throws</div>}
      {saveEntries.map(([ab, val]) => <StatRow key={ab} label={ab.toUpperCase()} value={val} />)}
      {skillEntries.length > 0 && <div className={styles.statGroupTitle}>Skills</div>}
      {skillEntries.map(([sk, val]) => (
        <StatRow key={sk} label={sk.charAt(0).toUpperCase() + sk.slice(1)} value={val} />
      ))}
      {(advSaves.length > 0 || advSkills.length > 0 || stats.advantage.deathSaves) && (
        <div>
          <div className={styles.statGroupTitle}>Advantage</div>
          {advSaves.map(ab => (
            <div key={ab} className={styles.statRow}>
              <span className={styles.statLabel}>{ab.toUpperCase()} Saves</span>
              <span className={styles.statValue} style={{ color: 'var(--accent)', fontWeight: 600 }}>Adv</span>
            </div>
          ))}
          {advSkills.map(sk => (
            <div key={sk} className={styles.statRow}>
              <span className={styles.statLabel}>{sk.charAt(0).toUpperCase() + sk.slice(1)}</span>
              <span className={styles.statValue} style={{ color: 'var(--accent)', fontWeight: 600 }}>Adv</span>
            </div>
          ))}
          {stats.advantage.deathSaves && (
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Death Saves</span>
              <span className={styles.statValue} style={{ color: 'var(--accent)', fontWeight: 600 }}>Adv</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export function EquipmentLayout({ character: char }: Props) {
  const equipItemToSlot  = useAppStore(s => s.equipItemToSlot)
  const _unequipSlot     = useAppStore(s => s.unequipSlot)
  const updateCharacter  = useAppStore(s => s.updateCharacter)

  const [armouryOpen,      setArmouryOpen]      = useState(false)
  const [activeSlot,       setActiveSlot]       = useState<keyof Equipment | null>(null)
  const [shopOpen,         setShopOpen]         = useState(false)
  const [draggedId,        setDraggedId]        = useState<string | null>(null)
  const [slotBreakdown,    setSlotBreakdown]    = useState<keyof Equipment | null>(null)
  const [weaponBreakdown,  setWeaponBreakdown]  = useState<number | null>(null)
  const [shakingId,        setShakingId]        = useState<string | null>(null)
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (shakeTimer.current) clearTimeout(shakeTimer.current) }, [])

  function handleUnequip(slot: keyof Equipment) {
    _unequipSlot(char.id, slot)
    if (slotBreakdown === slot) setSlotBreakdown(null)
  }

  function openSlot(slot: keyof Equipment) {
    const itemId = char.equipment[slot] as string | null
    if (itemId) {
      setWeaponBreakdown(null)
      setArmouryOpen(false)
      setSlotBreakdown(prev => prev === slot ? null : slot)
    } else {
      setSlotBreakdown(null)
      setWeaponBreakdown(null)
      setActiveSlot(slot)
      setArmouryOpen(true)
    }
  }

  function openWeaponBreakdown(idx: number) {
    setSlotBreakdown(null)
    setArmouryOpen(false)
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

    // Dropped on armoury grid → unequip
    if (over.id === 'armoury-grid') {
      if (fromSlot) _unequipSlot(char.id, fromSlot)
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

  const draggedItem = draggedId ? SHOP_ITEM_BY_ID[draggedId] : null

  const armorName   = char.equipment.armorId
    ? (ARMOR_BY_ID[char.equipment.armorId]?.name ?? char.equipment.armorId)
    : '—'
  const offHandName = char.equipment.shieldId
    ? (ARMOR_BY_ID[char.equipment.shieldId]?.name ?? 'Shield')
    : char.weapons[1]?.name ?? '—'
  const mainHand    = char.weapons[0]?.name ?? '—'

  const equipStats = computeEquipmentStats(char)

  const equippedIds = new Set(Object.values(char.equipment).filter((v): v is string => Boolean(v)))
  const unequippedByKind: Partial<Record<ShopItemKind, number>> = {}
  for (const id of char.ownedItemIds ?? []) {
    if (equippedIds.has(id)) continue
    const kind = SHOP_ITEM_BY_ID[id]?.kind
    if (kind) unequippedByKind[kind] = (unequippedByKind[kind] ?? 0) + 1
  }
  const inventoryEntries = Object.entries(unequippedByKind) as [ShopItemKind, number][]

  function openKindInArmoury(kind: ShopItemKind) {
    const slotMap: Partial<Record<ShopItemKind, keyof Equipment>> = {
      armor: 'armorId', shield: 'shieldId', helmet: 'helmetId',
      necklace: 'necklaceId', cape: 'capeId', legs: 'legsId',
      boots: 'bootsId', gloves: 'glovesId', quiver: 'quiverId',
      ring: 'ring1Id', amulet: 'amuletId',
    }
    const slot = slotMap[kind]
    if (!slot) return
    setActiveSlot(slot)
    setArmouryOpen(true)
    setSlotBreakdown(null)
    setWeaponBreakdown(null)
  }

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
            <SlotButton slotKey="helmetId"   label="Helmet"   char={char} onOpen={openSlot} onUnequip={handleUnequip} isShaking={shakingId === 'equipped-helmetId'} />
            <Empty />

            <SlotButton slotKey="necklaceId" label="Necklace" char={char} onOpen={openSlot} onUnequip={handleUnequip} isShaking={shakingId === 'equipped-necklaceId'} />
            <ReadSlot   label="Chest"    value={armorName}   kind="armor"
              onClick={() => openSlot('armorId')}
              isShaking={shakingId === 'equipped-armorId'}
              draggable={char.equipment.armorId ? { id: 'equipped-armorId', itemId: char.equipment.armorId, kind: 'armor', fromSlot: 'armorId' } : undefined} />
            <SlotButton slotKey="capeId"     label="Cape"     char={char} onOpen={openSlot} onUnequip={handleUnequip} isShaking={shakingId === 'equipped-capeId'} />

            <ReadSlot   label="Weapon"   value={mainHand}    kind="weapon"
              onClick={char.weapons[0] ? () => openWeaponBreakdown(0) : undefined} />
            <SlotButton slotKey="legsId"     label="Legs"     char={char} onOpen={openSlot} onUnequip={handleUnequip} isShaking={shakingId === 'equipped-legsId'} />
            <ReadSlot   label="Off-Hand" value={offHandName} kind="shield"
              onClick={() => char.weapons[1] ? openWeaponBreakdown(1) : openSlot('shieldId')}
              isShaking={shakingId === 'equipped-shieldId'}
              draggable={char.equipment.shieldId ? { id: 'equipped-shieldId', itemId: char.equipment.shieldId, kind: 'shield', fromSlot: 'shieldId' } : undefined} />

            <SlotButton slotKey="glovesId"   label="Gloves"   char={char} onOpen={openSlot} onUnequip={handleUnequip} isShaking={shakingId === 'equipped-glovesId'} />
            <SlotButton slotKey="bootsId"    label="Boots"    char={char} onOpen={openSlot} onUnequip={handleUnequip} isShaking={shakingId === 'equipped-bootsId'} />
            <SlotButton slotKey="quiverId"   label="Quiver"   char={char} onOpen={openSlot} onUnequip={handleUnequip} isShaking={shakingId === 'equipped-quiverId'} />

            <SlotButton slotKey="ring1Id"    label="Ring 1"   char={char} onOpen={openSlot} onUnequip={handleUnequip} isShaking={shakingId === 'equipped-ring1Id'} />
            <SlotButton slotKey="ring2Id"    label="Ring 2"   char={char} onOpen={openSlot} onUnequip={handleUnequip} isShaking={shakingId === 'equipped-ring2Id'} />
            <SlotButton slotKey="amuletId"   label="Amulet"   char={char} onOpen={openSlot} onUnequip={handleUnequip} isShaking={shakingId === 'equipped-amuletId'} />
          </div>

          {/* Stats panel */}
          <DndEquipStatsPanel stats={equipStats} />
        </div>

        {/* Inventory count bar */}
        {inventoryEntries.length > 0 && (
          <div className={styles.inventoryBar}>
            {inventoryEntries.map(([kind, count]) => (
              <button key={kind} className={styles.inventoryChip} onClick={() => openKindInArmoury(kind)}>
                {kind.charAt(0).toUpperCase() + kind.slice(1)}: {count}
              </button>
            ))}
          </div>
        )}

        {/* Slot stat breakdown */}
        {slotBreakdown && (
          <SlotBreakdownPanel slot={slotBreakdown} char={char} onClose={() => setSlotBreakdown(null)} />
        )}
        {weaponBreakdown !== null && char.weapons[weaponBreakdown] && (
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

        {/* Armoury panel (inline) */}
        {armouryOpen && (
          <ArmouryPanel
            character={char}
            activeSlotFilter={activeSlot}
            onClose={() => setArmouryOpen(false)}
            onOpenShop={() => { setArmouryOpen(false); setShopOpen(true) }}
            shakingId={shakingId}
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
