import { useEffect, useState } from 'react'
import type { Character } from '@/entities/character/types'
import { computeSpellGrid, type SpellEntry } from '@/shared/data/spellData'
import styles from './SpellVisualization.module.css'

interface Props {
  spell: SpellEntry
  character: Character
  slotLevel: number
}

const DMG_TINT: Record<string, string> = {
  fire:     'rgba(255, 120, 40, 0.35)',
  cold:     'rgba(80, 200, 240, 0.35)',
  thunder:  'rgba(240, 220, 80, 0.35)',
  force:    'rgba(220, 80, 240, 0.35)',
  lightning:'rgba(200, 230, 255, 0.4)',
  necrotic: 'rgba(80, 40, 80, 0.4)',
  radiant:  'rgba(255, 245, 200, 0.35)',
  acid:     'rgba(140, 220, 80, 0.35)',
  psychic:  'rgba(220, 100, 200, 0.35)',
}

export function SpellVisualization({ spell, character, slotLevel }: Props) {
  const layout = computeSpellGrid(spell, slotLevel, character.level)
  const [position, setPosition] = useState<'A' | 'B'>('A')
  const [frame, setFrame] = useState<'hit' | 'miss'>('hit')

  const lockToHit = spell.attackType === 'auto-hit'

  useEffect(() => {
    if (lockToHit) {
      setFrame('hit')
      return
    }
    const id = setInterval(() => setFrame(f => (f === 'hit' ? 'miss' : 'hit')), 900)
    return () => clearInterval(id)
  }, [lockToHit])

  const playerPos = position === 'A' ? layout.playerPosA : layout.playerPosB
  const tint = DMG_TINT[spell.damageType ?? ''] ?? 'rgba(180, 180, 180, 0.3)'

  // For single-target spells with no area, show GIF at the current enemy's position
  const effectCells = layout.areaCells.length > 0
    ? layout.areaCells
    : (frame === 'hit' ? layout.enemyHitPositions : layout.enemyMissPositions)
  const areaSet = new Set(effectCells.map(c => `${c.x},${c.y}`))
  const enemiesShown = frame === 'hit' ? layout.enemyHitPositions : layout.enemyMissPositions
  const enemySet = new Set(enemiesShown.map(p => `${p.x},${p.y}`))

  const spriteSrc =
    frame === 'hit'
      ? spell.sprites?.hit
      : spell.sprites?.miss ?? spell.sprites?.hit

  return (
    <div className={styles.visualization}>
      <div className={styles.rangeLabel}>Range: {spell.range}</div>

      <div className={styles.toggleRow}>
        <button
          className={`${styles.toggleBtn} ${position === 'A' ? styles.toggleBtnActive : ''}`}
          onClick={() => setPosition('A')}
        >Position A</button>
        <button
          className={`${styles.toggleBtn} ${position === 'B' ? styles.toggleBtnActive : ''}`}
          onClick={() => setPosition('B')}
        >Position B</button>
      </div>

      <div
        className={styles.grid}
        style={{
          gridTemplateColumns: `repeat(${layout.cols}, 22px)`,
          gridTemplateRows:    `repeat(${layout.rows}, 22px)`,
        }}
      >
        {Array.from({ length: layout.rows }).flatMap((_, y) =>
          Array.from({ length: layout.cols }).map((_, x) => {
            const key = `${x},${y}`
            const isPlayer = x === playerPos.x && y === playerPos.y
            const isEnemy = enemySet.has(key)
            const isArea = areaSet.has(key)
            return (
              <div
                key={key}
                className={styles.cell}
                style={isArea ? { background: tint } : undefined}
              >
                {isEnemy && !isPlayer && (
                  <img
                    className={styles.sprite}
                    src="/assets/enemies/121866.png"
                    alt="Enemy"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                )}
                {isArea && spriteSrc && (
                  <img
                    className={styles.areaSprite}
                    src={spriteSrc}
                    alt={spell.damageType ?? 'spell'}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                )}
                {isPlayer && (
                  <img
                    className={`${styles.sprite} ${styles.spritePlayer}`}
                    src="/assets/outfit/character.png"
                    alt="Player"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                )}
              </div>
            )
          })
        )}
      </div>

      <div className={styles.frameLabel}>
        {lockToHit ? 'Auto-hit' : frame === 'hit' ? (spell.attackType === 'save' ? 'Failed save' : 'Hit') : (spell.attackType === 'save' ? 'Saved' : 'Miss')}
      </div>
    </div>
  )
}
