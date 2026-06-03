import { useMemo, useState } from 'react'
import type { Character } from '@/entities/character/types'
import { getShopItemById, getShopCatalogueWithCustom, type ShopItem } from '@/shared/data/equipment/catalogue'
import type { ShopItemKind } from '@/shared/data/equipment/types'
import { GEAR_BY_ID } from '@/shared/data/equipment/gear'
import { WEAPON_BY_ID } from '@/shared/data/equipment/weapons'
import { useAppStore } from '@/app/store'
import { ItemEditorPanel } from '@/features/inventory/ItemEditorPanel'
import styles from './ShopPanel.module.css'

type SortBy = 'name' | 'cost' | 'rarity'

const RARITY_ORDER: Record<string, number> = { common: 0, uncommon: 1, rare: 2, 'very rare': 3, legendary: 4 }

const RARITY_COLOR: Record<string, string> = {
  uncommon:   '#1eff00',
  rare:       '#0070dd',
  'very rare':'#a335ee',
  legendary:  '#ff8000',
}

function getCardPills(item: ShopItem): string[] {
  const pills: string[] = []
  if (item.kind === 'weapon') {
    const wDef = WEAPON_BY_ID[item.id]
    if (wDef) {
      if (wDef.damageDie && wDef.damageDie !== '—') pills.push(`${wDef.damageDie}${wDef.damageType ? ` ${wDef.damageType}` : ''}`)
      if (wDef.rangeType && wDef.rangeType !== 'Melee') pills.push(wDef.rangeType)
      const keyProps = (wDef.properties ?? []).filter(p =>
        ['finesse', 'light', 'two-handed', 'versatile', 'reach', 'thrown'].some(kw => p.toLowerCase().startsWith(kw))
      )
      pills.push(...keyProps.map(p => p.split(' ')[0].charAt(0).toUpperCase() + p.split(' ')[0].slice(1)))
      if (wDef.enchantmentBonus) pills.push(`+${wDef.enchantmentBonus}`)
    }
  } else {
    const gDef = GEAR_BY_ID[item.id]
    if (gDef?.baseAC) pills.push(`AC ${gDef.baseAC}`)
    if (gDef?.enchantmentBonus) pills.push(`+${gDef.enchantmentBonus}`)
    const s = gDef?.stats
    if (s) {
      if (s.acBonus)     pills.push(`AC +${s.acBonus}`)
      if (s.toHitBonus)  pills.push(`Hit +${s.toHitBonus}`)
      if (s.speedBonus)  pills.push(`Spd +${s.speedBonus}ft`)
      Object.entries(s.abilityBonus    ?? {}).forEach(([k, v]) => v && pills.push(`${k.toUpperCase()} +${v}`))
      Object.entries(s.savingThrowBonus ?? {}).forEach(([k, v]) => v && pills.push(`${k.toUpperCase()} Sv +${v}`))
      Object.entries(s.skillBonus       ?? {}).forEach(([k, v]) => v && pills.push(`${k.charAt(0).toUpperCase() + k.slice(1)} +${v}`))
      ;(s.advantage?.skills        ?? []).forEach(sk => pills.push(`${sk.charAt(0).toUpperCase() + sk.slice(1)} Adv`))
      ;(s.advantage?.savingThrows  ?? []).forEach(ab => pills.push(`${ab.toUpperCase()} Sv Adv`))
      if (s.advantage?.deathSaves) pills.push('Death Sv Adv')
      if (s.bonusDamage) {
        const bd = s.bonusDamage
        const expr = [bd.dice, bd.flat ? String(bd.flat) : null].filter(Boolean).join('+')
        if (expr) pills.push(`${bd.dmgType} ${expr}`)
      }
    }
  }
  return pills
}


interface Props {
  character: Character
  onClose: () => void
  filterKind?: ShopItemKind | null
}

export function ShopPanel({ character: char, onClose, filterKind: filterKindProp }: Props) {
  const buyItem     = useAppStore(s => s.buyItem)
  const sellItem    = useAppStore(s => s.sellItem)
  const customItems = useAppStore(s => s.customItems)

  const [sellQueue,  setSellQueue]  = useState<string[]>([])
  const [buyQueue,   setBuyQueue]   = useState<string[]>([])
  const [sortBy,     setSortBy]     = useState<SortBy>('cost')

  const filterKind = filterKindProp !== undefined ? filterKindProp : null
  const [previewId,  setPreviewId]  = useState<string | null>(null)

  function togglePreview(id: string) {
    setPreviewId(prev => prev === id ? null : id)
  }

  function handleDragStart(e: React.DragEvent, id: string, source: 'owned' | 'sell' | 'catalog' | 'buy') {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/json', JSON.stringify({ id, source }))
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDropOnSell(e: React.DragEvent) {
    e.preventDefault()
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'))
      if (data.id) {
        if (data.source === 'sell') {
          // Remove from sell queue if dragged from sell queue
          setSellQueue(q => q.filter(x => x !== data.id))
        } else if (data.source === 'owned') {
          // Toggle in sell queue if dragged from owned
          setSellQueue(q => q.includes(data.id) ? q.filter(x => x !== data.id) : [...q, data.id])
        }
      }
    } catch {}
  }

  function handleDropOnBuy(e: React.DragEvent) {
    e.preventDefault()
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'))
      if (data.id) {
        if (data.source === 'buy') {
          // Remove from buy queue if dragged from buy queue
          setBuyQueue(q => q.filter(x => x !== data.id))
        } else if (data.source === 'catalog') {
          // Toggle in buy queue if dragged from catalog
          setBuyQueue(q => q.includes(data.id) ? q.filter(x => x !== data.id) : [...q, data.id])
        }
      }
    } catch {}
  }

  const ownedItems = useMemo(
    () => char.ownedItemIds
      .map(id => getShopItemById(id, customItems))
      .filter((x): x is NonNullable<typeof x> => x !== undefined)
      .filter(item => !filterKind || item.kind === filterKind),
    [char.ownedItemIds, filterKind, customItems]
  )

  const catalogItems = useMemo(() => {
    let items = getShopCatalogueWithCustom(Object.values(customItems))
    if (filterKind) items = items.filter(i => i.kind === filterKind)
    return [...items].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'cost') return a.cost - b.cost
      return (RARITY_ORDER[a.rarity ?? 'common'] ?? 0) - (RARITY_ORDER[b.rarity ?? 'common'] ?? 0)
    })
  }, [filterKind, sortBy, customItems])

  const sellTotal  = sellQueue.reduce((s, id) => s + (getShopItemById(id, customItems)?.cost ?? 0), 0)
  const buyTotal   = buyQueue.reduce( (s, id) => s + (getShopItemById(id, customItems)?.cost ?? 0), 0)
  const netGold    = char.gold + sellTotal - buyTotal
  const canAfford  = netGold >= 0
  const hasChanges = sellQueue.length > 0 || buyQueue.length > 0

  function handleConfirm() {
    for (const id of sellQueue) {
      const item = getShopItemById(id, customItems)
      if (item) sellItem(char.id, id, item.cost)
    }
    for (const id of buyQueue) {
      const item = getShopItemById(id, customItems)
      if (item) buyItem(char.id, id, item.cost)
    }
    onClose()
  }

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.title}>Shop{filterKind ? ` — ${filterKind.charAt(0).toUpperCase() + filterKind.slice(1)}` : ''}</span>
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
              const inSell      = sellQueue.includes(item.id)
              const rarityColor = RARITY_COLOR[item.rarity ?? ''] ?? ''
              const pills       = getCardPills(item)
              const costLabel   = inSell ? 'SELL' : `${item.cost}g`
              return (
                <button
                  key={item.id}
                  draggable
                  className={[
                    styles.itemCard,
                    inSell              ? styles.rowSell      : '',
                    previewId === item.id ? styles.rowSelected : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => togglePreview(item.id)}
                  onDragStart={(e) => handleDragStart(e, item.id, 'owned')}
                  title={`${item.name} · ${item.cost} gp`}
                >
                  <div
                    className={styles.cardHeader}
                    style={rarityColor ? { background: `${rarityColor}18` } : undefined}
                  >
                    {item.sprite
                      ? <img src={item.sprite} alt="" className={styles.cardSprite} />
                      : <div className={styles.cardSpriteAbsent} />
                    }
                    <div className={styles.cardInfo}>
                      <span className={styles.cardName}>{item.name}</span>
                      <span className={styles.cardKind}>{item.kind}</span>
                    </div>
                    <span className={[
                      styles.cardCost,
                      inSell ? styles.cardCostPoor : '',
                    ].filter(Boolean).join(' ')}>
                      {costLabel}
                    </span>
                  </div>
                  {pills.length > 0 && (
                    <div className={styles.cardBody}>
                      {pills.map((p, i) => <span key={i} className={styles.statPill}>{p}</span>)}
                    </div>
                  )}
                </button>
              )
            })}
            {ownedItems.length === 0 && <span className={styles.empty}>No items</span>}
          </div>
        </div>

        {/* Sell queue */}
        <div className={styles.queueCol}>
          <div className={styles.colHead}>↑ Sell</div>
          <div className={styles.queueItems} onDragOver={handleDragOver} onDrop={handleDropOnSell}>
            {sellQueue.map(id => {
              const item = getShopItemById(id, customItems)
              if (!item) return null
              return (
                <div key={id} draggable className={styles.queueChip} title={item.name} onDragStart={(e) => handleDragStart(e, id, 'sell')}>
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
          <div className={styles.queueItems} onDragOver={handleDragOver} onDrop={handleDropOnBuy}>
            {buyQueue.map(id => {
              const item = getShopItemById(id, customItems)
              if (!item) return null
              return (
                <div key={id} draggable className={styles.queueChip} title={item.name} onDragStart={(e) => handleDragStart(e, id, 'buy')}>
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
          <div className={styles.itemList} onDragOver={handleDragOver} onDrop={handleDropOnBuy}>
            {catalogItems.map(item => {
              const owned       = char.ownedItemIds.includes(item.id)
              const inBuy       = buyQueue.includes(item.id)
              const canAddThis  = char.gold + sellTotal >= buyTotal + (inBuy ? 0 : item.cost)
              const rarityColor = RARITY_COLOR[item.rarity ?? ''] ?? ''
              const pills       = getCardPills(item)
              const costLabel   = owned ? '✓' : inBuy ? 'BUY' : item.cost === 0 ? '—' : `${item.cost}g`
              return (
                <button
                  key={item.id}
                  draggable
                  className={[
                    styles.itemCard,
                    owned              ? styles.rowOwned    : '',
                    inBuy              ? styles.rowBuy      : '',
                    previewId === item.id ? styles.rowSelected : '',
                    !owned && !inBuy && !canAddThis ? styles.rowPoor : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => togglePreview(item.id)}
                  onDragStart={(e) => handleDragStart(e, item.id, 'catalog')}
                  title={`${item.name} · ${item.cost === 0 ? 'Quest reward' : `${item.cost} gp`}`}
                >
                  <div
                    className={styles.cardHeader}
                    style={rarityColor ? { background: `${rarityColor}18` } : undefined}
                  >
                    {item.sprite
                      ? <img src={item.sprite} alt="" className={styles.cardSprite} />
                      : <div className={styles.cardSpriteAbsent} />
                    }
                    <div className={styles.cardInfo}>
                      <span className={styles.cardName}>{item.name}</span>
                      <span className={styles.cardKind}>{item.kind}</span>
                    </div>
                    <span className={[
                      styles.cardCost,
                      owned ? styles.cardCostOwned : '',
                      inBuy ? styles.cardCostBuy   : '',
                      !owned && !inBuy && !canAddThis ? styles.cardCostPoor : '',
                    ].filter(Boolean).join(' ')}>
                      {costLabel}
                    </span>
                  </div>
                  {pills.length > 0 && (
                    <div className={styles.cardBody}>
                      {pills.map((p, i) => <span key={i} className={styles.statPill}>{p}</span>)}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

      </div>

      {/* Item preview */}
      {previewId && (() => {
        const item = catalogItems.find(i => i.id === previewId) ?? ownedItems.find(i => i.id === previewId)
        const owned = char.ownedItemIds.includes(previewId)
        const inBuy = buyQueue.includes(previewId)
        const inSell = sellQueue.includes(previewId)
        return (
          <div className={styles.preview}>
            <ItemEditorPanel
              itemId={previewId}
              readOnly
              onClose={() => setPreviewId(null)}
              onEquip={!owned && item && item.cost > 0
                ? () => { setBuyQueue(q => inBuy ? q.filter(x => x !== previewId) : [...q, previewId]); setPreviewId(null) }
                : owned
                  ? () => { setSellQueue(q => inSell ? q.filter(x => x !== previewId) : [...q, previewId]); setPreviewId(null) }
                  : undefined}
            />
          </div>
        )
      })()}

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
