import type { ShopItem } from '@/shared/data/equipment/catalogue'
import styles from './ItemCard.module.css'

interface Props {
  item: ShopItem
  mode: 'inventory' | 'shop'
  onAction: () => void
  alreadyOwned?: boolean
  canAfford?: boolean
  isDragging?: boolean
  isShaking?: boolean
}

const RARITY_COLOR: Record<string, string> = {
  common:     'var(--text-muted)',
  uncommon:   '#1eff00',
  rare:       '#0070dd',
  'very rare': '#a335ee',
  legendary:  '#ff8000',
}

export function ItemCard({ item, mode, onAction, alreadyOwned, canAfford, isDragging, isShaking }: Props) {
  const rarityColor = item.rarity ? RARITY_COLOR[item.rarity] : 'var(--text-muted)'

  const actionLabel =
    mode === 'inventory'
      ? 'Equip'
      : alreadyOwned
        ? 'Owned'
        : item.cost === 0
          ? 'Quest'
          : `${item.cost} gp`

  const actionDisabled =
    mode === 'shop' && (alreadyOwned || item.cost === 0 || !canAfford)

  return (
    <div
      className={`${styles.card}${isShaking ? ` ${styles.shake}` : ''}`}
      data-dragging={isDragging || undefined}
      data-rarity={item.rarity}
    >
      <div className={styles.sprite} style={{ borderColor: rarityColor }}>
        {item.sprite
          ? <img src={item.sprite} alt={item.name} width={32} height={32} />
          : <span className={styles.spriteFallback}>{item.name[0]}</span>
        }
      </div>
      <div className={styles.info}>
        <span className={styles.name} style={{ color: rarityColor }} title={item.name}>
          {item.name}
        </span>
        {item.keyStat && (
          <span className={styles.keyStat}>{item.keyStat}</span>
        )}
      </div>
      <button
        className={styles.actionBtn}
        onClick={onAction}
        disabled={actionDisabled}
        title={actionDisabled && !canAfford ? 'Not enough gold' : undefined}
      >
        {actionLabel}
      </button>
    </div>
  )
}
