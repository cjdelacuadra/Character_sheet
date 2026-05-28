import { useEffect, useMemo, useRef, useState } from 'react'
import type { Character } from '@/entities/character/types'
import { computeSpellGrid, type SpellEntry, type SpellGridLayout } from '@/shared/data/spellData'
import {
  resolveAoeAnimationFrames,
  resolveImpactGif,
  resolveMissileFrames,
  type SpellResult,
} from './animationAssets'
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

const TILE = 22
// Must match .grid in SpellVisualization.module.css (padding / gap).
const GRID_PADDING = 4
const GRID_GAP = 1

const CAST_DELAY_MS = 5000
// Missile (single-target) timings.
const STAGGER_MS = 120
const FLIGHT_MS = 700
const MISSILE_CYCLE_HOLD_MS = 1500   // impact stays visible this long before the next missile cycle restarts
// AOE wave timings.
const PROPAGATION_MS_PER_TILE = 90
const CELL_VISIBLE_MS = 700
const CELL_FADE_MS = 200
const WAVE_GAP_MS = 250
// Sprite frame ticker.
const FRAME_INTERVAL_MS = 33

type Phase = 'idle' | 'casting' | 'impact' | 'final'
type Cell = { x: number; y: number }
type TargetResult = { pos: Cell; result: SpellResult }

function rollTargets(spell: SpellEntry, candidates: Cell[]): TargetResult[] {
  if (spell.attackType === 'auto-hit') {
    return candidates.map(pos => ({ pos, result: 'hit' }))
  }
  if (spell.attackType === 'save') {
    return candidates.map(pos => ({
      pos,
      result: Math.random() < 0.5 ? 'hit' : 'pass',
    }))
  }
  return candidates.map(pos => ({
    pos,
    result: Math.random() < 0.5 ? 'hit' : 'miss',
  }))
}

function isSelfOrigin(spell: SpellEntry): boolean {
  return (spell.range ?? '').toLowerCase().startsWith('self')
}

// Self-origin AOEs (range "Self (60ft cone)" etc.) propagate from the player tile;
// every other AOE propagates from the centroid of the affected cells, snapped to
// the nearest area cell so the origin always sits inside the shape.
function aoeOriginCell(spell: SpellEntry, layout: SpellGridLayout, playerPos: Cell): Cell {
  if (isSelfOrigin(spell)) return playerPos
  if (layout.areaCells.length === 0) return playerPos
  const sx = layout.areaCells.reduce((s, c) => s + c.x, 0) / layout.areaCells.length
  const sy = layout.areaCells.reduce((s, c) => s + c.y, 0) / layout.areaCells.length
  return layout.areaCells
    .map(c => ({ c, d: Math.hypot(c.x - sx, c.y - sy) }))
    .sort((a, b) => a.d - b.d)[0].c
}

// Pixel coords of a cell's center relative to .grid's padding box (where absolutely
// positioned children inside .grid are anchored). Accounts for the 4px padding and
// 1px gap between cells.
function cellCenter(c: Cell): { left: number; top: number } {
  return {
    left: GRID_PADDING + c.x * (TILE + GRID_GAP) + TILE / 2,
    top:  GRID_PADDING + c.y * (TILE + GRID_GAP) + TILE / 2,
  }
}

// Pure function of the shared clock: where in its fade-in/hold/fade-out cycle is
// this cell right now? The wave restarts continuously via the `clockMs % waveLength`.
function cellOpacity(appearAt: number, clockMs: number, waveLength: number): number {
  const t = (clockMs % waveLength) - appearAt
  if (t < 0) return 0
  if (t < CELL_FADE_MS) return t / CELL_FADE_MS
  if (t < CELL_FADE_MS + CELL_VISIBLE_MS) return 1
  const out = t - CELL_FADE_MS - CELL_VISIBLE_MS
  if (out < CELL_FADE_MS) return 1 - out / CELL_FADE_MS
  return 0
}

function MissileSprite({
  frames, from, to, delayMs,
}: { frames: string[]; from: Cell; to: Cell; delayMs: number }) {
  const [frame, setFrame] = useState(0)
  const rafRef = useRef<number | null>(null)
  const lastRef = useRef<number>(0)

  useEffect(() => {
    const tick = (now: number) => {
      if (now - lastRef.current >= FRAME_INTERVAL_MS) {
        lastRef.current = now
        setFrame(f => (f + 1) % frames.length)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current) }
  }, [frames.length])

  const fromPx = cellCenter(from)
  const toPx = cellCenter(to)
  const dx = toPx.left - fromPx.left
  const dy = toPx.top - fromPx.top

  return (
    <img
      className={styles.missile}
      src={frames[frame]}
      alt=""
      style={{
        left: fromPx.left - TILE / 2,
        top:  fromPx.top  - TILE / 2,
        ['--dx' as string]: `${dx}px`,
        ['--dy' as string]: `${dy}px`,
        // Two delays for the two animations in CSS shorthand (missileFly, then trailFade).
        // Without both values, an inline single-value delay would also shift trailFade
        // to launch immediately instead of after the 700ms flight.
        animationDelay: `${delayMs}ms, ${delayMs + FLIGHT_MS}ms`,
      }}
      onError={e => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }}
    />
  )
}

function ImpactGif({
  pos, result, damageType,
}: { pos: Cell; result: SpellResult; damageType?: string }) {
  const { primary, fallback } = useMemo(
    () => resolveImpactGif(result, damageType),
    [result, damageType],
  )
  const px = cellCenter(pos)
  return (
    <img
      className={styles.impactGif}
      src={primary}
      alt=""
      style={{ left: px.left - TILE / 2, top: px.top - TILE / 2 }}
      onError={e => {
        const img = e.currentTarget as HTMLImageElement
        if (img.src !== fallback && !img.src.endsWith(fallback)) img.src = fallback
      }}
    />
  )
}

export function SpellVisualization({ spell, character, slotLevel }: Props) {
  const layout = computeSpellGrid(spell, slotLevel, character.level)
  const [position, setPosition] = useState<'A' | 'B'>('A')
  const [phase, setPhase] = useState<Phase>('idle')
  const [landed, setLanded] = useState<boolean[]>([])
  const [frozen, setFrozen] = useState(false)
  const [clockMs, setClockMs] = useState(0)
  // Bumped on each missile-cycle restart; used as a React key so missiles unmount/remount
  // and their CSS keyframe animation re-runs from the start.
  const [missileCycle, setMissileCycle] = useState(0)
  const timersRef = useRef<number[]>([])
  const rafRef = useRef<number | null>(null)
  const startedAtRef = useRef<number | null>(null)

  const playerPos = position === 'A' ? layout.playerPosA : layout.playerPosB
  const isAoe = (spell.aoeShape ?? 'single') !== 'single'
  const isSelfBuff = spell.vizCategory === 'self-buff'
  const isDebuffAura = spell.vizCategory === 'debuff-aura'
  // useWave = any spell that propagates a looping AOE sprite (vs missile-based single targets).
  const useWave = isAoe || isSelfBuff || isDebuffAura
  // Sprite/tint colour. Non-damage templates use vizDamageType; damage spells use damageType.
  const auraColor = spell.vizDamageType ?? spell.damageType
  const tint = DMG_TINT[auraColor ?? ''] ?? 'rgba(180, 180, 180, 0.3)'

  const missileFrames = useMemo(
    () => resolveMissileFrames(spell.damageType),
    [spell.damageType]
  )
  const aoeFrames = useMemo(
    () => resolveAoeAnimationFrames(auraColor),
    [auraColor]
  )

  const targets = useMemo<TargetResult[]>(
    // Self-buff has no enemy targets; everything else rolls per enemyHitPositions.
    () => (isSelfBuff ? [] : rollTargets(spell, layout.enemyHitPositions)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spell.id, slotLevel, position, isSelfBuff],
  )

  // Wave origin: self-buff/debuff-aura always emanate from the player; AOE damage uses
  // self-origin (player) or AOE centroid depending on the spell's range field.
  const waveOrigin = useMemo<Cell>(() => {
    if (isAoe) return aoeOriginCell(spell, layout, playerPos)
    return playerPos
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spell.id, slotLevel, position, isAoe])

  // Cells that participate in the wave animation:
  //   - AOE damage      → all area cells
  //   - Self-buff       → the single player tile
  //   - Debuff-aura     → only enemy tiles where the spell actually landed (result === 'hit')
  const wavefrontCells = useMemo<Cell[]>(() => {
    if (isAoe) return layout.areaCells
    if (isSelfBuff) return [playerPos]
    if (isDebuffAura) return targets.filter(t => t.result === 'hit').map(t => ({ x: t.pos.x, y: t.pos.y }))
    return []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spell.id, slotLevel, position, isAoe, isSelfBuff, isDebuffAura, targets])

  // Per-cell delay-from-origin. Wave length is the slowest cell's full cycle plus a brief gap.
  const { cellTimings, waveLengthMs } = useMemo(() => {
    if (wavefrontCells.length === 0) {
      return { cellTimings: [] as { cell: Cell; appearAt: number }[], waveLengthMs: 1 }
    }
    const timings = wavefrontCells.map(c => ({
      cell: c,
      appearAt: Math.hypot(c.x - waveOrigin.x, c.y - waveOrigin.y) * PROPAGATION_MS_PER_TILE,
    }))
    const maxAppear = timings.reduce((m, t) => Math.max(m, t.appearAt), 0)
    return {
      cellTimings: timings,
      waveLengthMs: maxAppear + CELL_FADE_MS + CELL_VISIBLE_MS + CELL_FADE_MS + WAVE_GAP_MS,
    }
  }, [wavefrontCells, waveOrigin.x, waveOrigin.y])

  function clearTimers() {
    for (const id of timersRef.current) clearTimeout(id)
    timersRef.current = []
  }

  // Shared rAF clock — only ticks during casting/impact, and only when not frozen.
  // Drives AOE cell opacity and the AOE sprite frame index.
  useEffect(() => {
    if (frozen || phase === 'idle' || phase === 'final') return
    const tick = (now: number) => {
      if (startedAtRef.current == null) startedAtRef.current = now
      setClockMs(now - startedAtRef.current)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      // Reset so the next non-idle run starts the clock at 0.
      startedAtRef.current = null
    }
  }, [frozen, phase])

  useEffect(() => {
    clearTimers()
    setPhase('idle')
    setLanded(targets.map(() => false))
    setFrozen(false)
    setClockMs(0)

    if (useWave) {
      // Wave-based spells (AOE damage, self-buff, debuff-aura): idle → 5s → impact (loops
      // forever via the shared clock until Stop). Impact GIFs mount per-target as the wave
      // reaches each enemy so results don't pop in before the sprite arrives. Self-buff has
      // no targets to schedule.
      const toImpact = window.setTimeout(() => setPhase('impact'), CAST_DELAY_MS)
      timersRef.current.push(toImpact)

      targets.forEach((t, i) => {
        const dist = Math.hypot(t.pos.x - waveOrigin.x, t.pos.y - waveOrigin.y)
        const landAt = CAST_DELAY_MS + dist * PROPAGATION_MS_PER_TILE + CELL_FADE_MS
        const landTimer = window.setTimeout(() => {
          setLanded(prev => {
            const next = prev.slice()
            next[i] = true
            return next
          })
        }, landAt)
        timersRef.current.push(landTimer)
      })
    } else {
      // Single-target: idle → 5s → casting → recurring missile cycle (missiles fly,
      // land, hold their impact, then the whole sequence restarts). Stop ends the loop.
      const runCycle = () => {
        setMissileCycle(c => c + 1)
        setLanded(targets.map(() => false))

        targets.forEach((_, i) => {
          const landAt = i * STAGGER_MS + FLIGHT_MS
          const landTimer = window.setTimeout(() => {
            setLanded(prev => {
              const next = prev.slice()
              next[i] = true
              return next
            })
          }, landAt)
          timersRef.current.push(landTimer)
        })

        const lastLand = Math.max(targets.length - 1, 0) * STAGGER_MS + FLIGHT_MS
        const nextCycle = window.setTimeout(runCycle, lastLand + MISSILE_CYCLE_HOLD_MS)
        timersRef.current.push(nextCycle)
      }

      const toCasting = window.setTimeout(() => {
        setPhase('casting')
        runCycle()
      }, CAST_DELAY_MS)
      timersRef.current.push(toCasting)
      // No auto-transition to 'final' — Stop is the only way out.
    }

    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spell.id, slotLevel, position])

  function onStopClick() {
    clearTimers()
    setLanded(targets.map(() => true))
    setFrozen(true)
    setPhase('final')
  }

  // Bystanders (enemies outside the AOE) only make sense for AOE damage spells.
  const bystanderSet = new Set(
    (isAoe ? layout.enemyMissPositions : []).map(p => `${p.x},${p.y}`),
  )
  const targetSet = new Set(targets.map(t => `${t.pos.x},${t.pos.y}`))
  const areaSet = new Set((isAoe ? layout.areaCells : []).map(c => `${c.x},${c.y}`))

  const showMissiles = !useWave && phase === 'casting'
  const showImpacts  = phase !== 'idle'
  const showAoeLayer = useWave && phase !== 'idle'

  // For debuff-aura, 'hit' is conveyed by the aura sprite on the target tile, so suppress
  // the duplicate Blood_Effect impact GIF — only 'pass'/'miss' GIFs render (passed save /
  // missed attack roll).
  function shouldRenderImpact(result: SpellResult): boolean {
    if (isDebuffAura) return result !== 'hit'
    return true
  }

  const sharedFrameIdx = aoeFrames.length > 0
    ? Math.floor(clockMs / FRAME_INTERVAL_MS) % aoeFrames.length
    : 0

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

      <div className={styles.gridWrap}>
        {phase !== 'idle' && phase !== 'final' && (
          <button className={styles.stopBtn} onClick={onStopClick} type="button">
            Stop
          </button>
        )}

        <div
          className={styles.grid}
          style={{
            gridTemplateColumns: `repeat(${layout.cols}, ${TILE}px)`,
            gridTemplateRows:    `repeat(${layout.rows}, ${TILE}px)`,
          }}
        >
          {Array.from({ length: layout.rows }).flatMap((_, y) =>
            Array.from({ length: layout.cols }).map((_, x) => {
              const key = `${x},${y}`
              const isPlayer = x === playerPos.x && y === playerPos.y
              const isEnemy = targetSet.has(key) || bystanderSet.has(key)
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

          {showAoeLayer && cellTimings.map(({ cell, appearAt }) => {
            const opacity = cellOpacity(appearAt, clockMs, waveLengthMs)
            if (opacity === 0) return null
            const px = cellCenter(cell)
            return (
              <img
                key={`aoe-${cell.x},${cell.y}`}
                className={styles.aoeCell}
                src={aoeFrames[sharedFrameIdx]}
                alt=""
                style={{
                  left: px.left - TILE / 2,
                  top:  px.top  - TILE / 2,
                  opacity,
                }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }}
              />
            )
          })}

          {showMissiles && targets.map((t, i) => (
            <MissileSprite
              key={`m-${missileCycle}-${i}`}
              frames={missileFrames}
              from={playerPos}
              to={t.pos}
              delayMs={i * STAGGER_MS}
            />
          ))}

          {showImpacts && targets.map((t, i) => landed[i] && shouldRenderImpact(t.result) && (
            <ImpactGif
              key={`i-${missileCycle}-${i}`}
              pos={t.pos}
              result={t.result}
              damageType={auraColor}
            />
          ))}
        </div>
      </div>

      <div className={styles.frameLabel}>
        {phase === 'idle'                      && `Casting in ${Math.ceil(CAST_DELAY_MS / 1000)}s…`}
        {(phase === 'casting' || phase === 'impact') && 'Looping — press Stop to freeze'}
        {phase === 'final'                     && 'Stopped'}
      </div>
    </div>
  )
}
