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

const DMG_SOLID: Record<string, string> = {
  fire:     'rgb(255, 100, 20)',
  cold:     'rgb(60, 190, 230)',
  thunder:  'rgb(230, 210, 50)',
  force:    'rgb(200, 60, 230)',
  lightning:'rgb(180, 220, 255)',
  necrotic: 'rgb(100, 60, 110)',
  radiant:  'rgb(255, 240, 160)',
  acid:     'rgb(120, 210, 60)',
  psychic:  'rgb(210, 80, 190)',
}

type ShapeOverlay =
  | { kind: 'path'; d: string }
  | { kind: 'circle'; cx: number; cy: number; r: number }

function computeShapeOverlay(
  shape: string,
  layout: SpellGridLayout,
  playerPos: Cell,
  aimAngle: number = Math.PI / 2,
): ShapeOverlay | null {
  if (!layout.areaCells.length) return null

  function cellPx(c: Cell) {
    return {
      x: GRID_PADDING + c.x * (TILE + GRID_GAP) + TILE / 2,
      y: GRID_PADDING + c.y * (TILE + GRID_GAP) + TILE / 2,
    }
  }
  const f = (n: number) => n.toFixed(1)

  if (shape === 'sphere') {
    const sx = layout.areaCells.reduce((s, c) => s + c.x, 0) / layout.areaCells.length
    const sy = layout.areaCells.reduce((s, c) => s + c.y, 0) / layout.areaCells.length
    const cx = GRID_PADDING + sx * (TILE + GRID_GAP) + TILE / 2
    const cy = GRID_PADDING + sy * (TILE + GRID_GAP) + TILE / 2
    const r = layout.areaCells.reduce((m, c) => {
      const p = cellPx(c)
      return Math.max(m, Math.hypot(p.x - cx, p.y - cy))
    }, 0) + TILE / 2
    return { kind: 'circle', cx, cy, r }
  }

  if (shape === 'cone') {
    const apex = cellPx(playerPos)
    const R = layout.areaCells.reduce((m, c) => {
      const p = cellPx(c)
      return Math.max(m, Math.hypot(p.x - apex.x, p.y - apex.y))
    }, 0) + TILE / 2
    // D&D 5e cone: half-angle = atan(0.5) ≈ 26.57°. Base is a sphere-segment arc.
    // Left/right edges rotate with aimAngle. Arc uses sweep=0 (counterclockwise through
    // the far end of the cone, not the near end) so the base curves away from the apex.
    const halfAngle = Math.atan(0.5)
    const lx = f(apex.x + R * Math.cos(aimAngle + halfAngle))
    const ly = f(apex.y + R * Math.sin(aimAngle + halfAngle))
    const rx = f(apex.x + R * Math.cos(aimAngle - halfAngle))
    const ry = f(apex.y + R * Math.sin(aimAngle - halfAngle))
    return {
      kind: 'path',
      d: `M ${apex.x} ${apex.y} L ${lx} ${ly} A ${f(R)} ${f(R)} 0 0 0 ${rx} ${ry} Z`,
    }
  }

  // Helper: oriented rectangle between two pixel points, TILE wide
  function lineRect(startPx: {x:number,y:number}, endPx: {x:number,y:number}): ShapeOverlay | null {
    const dx = endPx.x - startPx.x, dy = endPx.y - startPx.y
    const len = Math.hypot(dx, dy)
    if (len < 1) return null
    const ux = dx / len, uy = dy / len
    const px = -uy, py = ux       // perpendicular unit
    const hw = TILE / 2           // half-width: one full cell total
    const ext = TILE / 2          // extend half a cell beyond endpoints
    const sx = startPx.x - ext * ux, sy = startPx.y - ext * uy
    const ex = endPx.x   + ext * ux, ey = endPx.y   + ext * uy
    return {
      kind: 'path',
      d: `M ${f(sx - hw*px)} ${f(sy - hw*py)} L ${f(sx + hw*px)} ${f(sy + hw*py)} L ${f(ex + hw*px)} ${f(ey + hw*py)} L ${f(ex - hw*px)} ${f(ey - hw*py)} Z`,
    }
  }

  if (shape === 'line') {
    if (layout.wallSpine && layout.wallSpine.length >= 2) {
      // Wall with two placed points: rectangle oriented along the Bresenham spine
      return lineRect(cellPx(layout.wallSpine[0]), cellPx(layout.wallSpine[layout.wallSpine.length - 1]))
    }
    // Directional line: rectangle from apex to farthest area cell
    if (layout.areaCells.length === 0) return null
    const apex = cellPx(playerPos)
    const farthest = layout.areaCells.reduce<{x:number,y:number}>((best, c) => {
      const p = cellPx(c)
      return Math.hypot(p.x - apex.x, p.y - apex.y) > Math.hypot(best.x - apex.x, best.y - apex.y) ? p : best
    }, apex)
    return lineRect(apex, farthest)
  }

  if (shape === 'cube') {
    // Estimate cube side from cell count (sideTiles² cells, adjusted for boundary clips)
    const sideTiles = Math.max(1, Math.round(Math.sqrt(layout.areaCells.length)))
    const cellSize = TILE + GRID_GAP
    const depth = sideTiles * cellSize
    const hw = depth / 2
    const apex = cellPx(playerPos)
    const ex = apex.x + Math.cos(aimAngle) * depth
    const ey = apex.y + Math.sin(aimAngle) * depth
    const dx = ex - apex.x, dy = ey - apex.y
    const len = Math.hypot(dx, dy)
    if (len < 1) return null
    const ux = dx / len, uy = dy / len
    const px = -uy, py = ux
    return {
      kind: 'path',
      d: `M ${f(apex.x - hw*px)} ${f(apex.y - hw*py)} L ${f(apex.x + hw*px)} ${f(apex.y + hw*py)} L ${f(ex + hw*px)} ${f(ey + hw*py)} L ${f(ex - hw*px)} ${f(ey - hw*py)} Z`,
    }
  }

  return null
}

function computeOriginMarker(
  spell: SpellEntry,
  layout: SpellGridLayout,
  playerPos: Cell,
  wallStart: Cell | null,
): { cx: number; cy: number } | null {
  const cellPx = (c: Cell) => ({
    cx: GRID_PADDING + c.x * (TILE + GRID_GAP) + TILE / 2,
    cy: GRID_PADDING + c.y * (TILE + GRID_GAP) + TILE / 2,
  })
  if (spell.aoeShape === 'sphere') {
    if (layout.areaCells.length === 0) return null
    const sx = layout.areaCells.reduce((s, c) => s + c.x, 0) / layout.areaCells.length
    const sy = layout.areaCells.reduce((s, c) => s + c.y, 0) / layout.areaCells.length
    return {
      cx: GRID_PADDING + sx * (TILE + GRID_GAP) + TILE / 2,
      cy: GRID_PADDING + sy * (TILE + GRID_GAP) + TILE / 2,
    }
  }
  if (spell.aoeShape === 'line' && layout.wallSpine) {
    return wallStart ? cellPx(wallStart) : null
  }
  if (spell.aoeShape === 'cone' || spell.aoeShape === 'line' || spell.aoeShape === 'cube') {
    return cellPx(playerPos)
  }
  return null
}

function ShapeIcon({ shape }: { shape: string }) {
  const props = { width: 18, height: 18, viewBox: '0 0 24 24', style: { display: 'block', opacity: 0.85 } }
  switch (shape) {
    case 'sphere':
      return <svg {...props}><circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity={0.25} stroke="currentColor" strokeWidth="1.5"/></svg>
    case 'cone':
      // Pie-sector: apex at top, arc base (sphere-segment shape)
      return <svg {...props}><path d="M12 1 L1 20 A22 22 0 0 1 23 20 Z" fill="currentColor" fillOpacity={0.25} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
    case 'cube':
      return <svg {...props}><rect x="2" y="2" width="20" height="20" fill="currentColor" fillOpacity={0.25} stroke="currentColor" strokeWidth="1.5"/></svg>
    case 'line':
      return <svg {...props}><rect x="10" y="1" width="4" height="22" fill="currentColor" fillOpacity={0.25} stroke="currentColor" strokeWidth="1.5"/></svg>
    default:
      return <svg {...props}><circle cx="12" cy="12" r="5" fill="currentColor" fillOpacity={0.7} stroke="currentColor" strokeWidth="1.5"/></svg>
  }
}

function isSelfOrigin(spell: SpellEntry): boolean {
  return (spell.range ?? '').toLowerCase().startsWith('self')
}

// Radius-based shapes (sphere) propagate the wave outward from their geometric
// centre. Directional shapes (cone, cube, line) propagate from the caster's tile —
// the origin is defined by direction, not radius.
function aoeOriginCell(spell: SpellEntry, layout: SpellGridLayout, playerPos: Cell): Cell {
  if (spell.aoeShape === 'sphere') {
    if (layout.areaCells.length === 0) return playerPos
    const sx = layout.areaCells.reduce((s, c) => s + c.x, 0) / layout.areaCells.length
    const sy = layout.areaCells.reduce((s, c) => s + c.y, 0) / layout.areaCells.length
    return layout.areaCells
      .map(c => ({ c, d: Math.hypot(c.x - sx, c.y - sy) }))
      .sort((a, b) => a.d - b.d)[0].c
  }
  return playerPos
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
  const isAoe = (spell.aoeShape ?? 'single') !== 'single'
  const isConeOrLine = spell.aoeShape === 'cone' || spell.aoeShape === 'line'
  const isWallSpell = spell.aoeShape === 'line' && spell.name.toLowerCase().includes('wall')
  const isConeOrDirectionalLine = isConeOrLine && !isWallSpell
  const isCubeAoe = spell.aoeShape === 'cube'
  const isSphereAoe = spell.aoeShape === 'sphere'

  // Targeting state — reset whenever the selected spell changes
  const [aimTarget, setAimTarget] = useState<Cell | null>(null)
  const [sphereMode, setSphereMode] = useState<'square' | 'intersection'>('square')
  const [wallStart, setWallStart] = useState<Cell | null>(null)
  const [wallEnd, setWallEnd] = useState<Cell | null>(null)

  const layout = useMemo(
    () => computeSpellGrid(spell, slotLevel, character.level, {
      aimTarget:  aimTarget  ?? undefined,
      sphereMode,
      wallPoints: wallStart && wallEnd ? { start: wallStart, end: wallEnd } : null,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spell.id, slotLevel, character.level, aimTarget, sphereMode, wallStart, wallEnd],
  )

  // For self-origin sphere spells the AoE origin sits away from y=0, so position A
  // disconnects the player. Fall back to B (sphere center) in that case.
  const selfFitsAtA = !isSelfOrigin(spell) || !isAoe || layout.areaCells.length === 0
    || layout.areaCells.some(c => Math.hypot(c.x - layout.playerPosA.x, c.y - layout.playerPosA.y) <= 1)

  const position: 'A' | 'B' = selfFitsAtA ? 'A' : 'B'
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
  const isSelfBuff = spell.vizCategory === 'self-buff'
  const isDebuffAura = spell.vizCategory === 'debuff-aura'
  // Terrain zones loop a sprite on their tiles like an AOE, but never deal damage —
  // AOE-shaped terrain fills its area cells; a shapeless terrain spell (e.g. Minor
  // Illusion) animates on the player's tile.
  const isTerrain = spell.vizCategory === 'terrain'
  // useWave = any spell that propagates a looping AOE sprite (vs missile-based single targets).
  const useWave = isAoe || isSelfBuff || isDebuffAura || isTerrain
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
    // Self-buff and terrain zones have no enemy targets; everything else rolls per enemyHitPositions.
    () => (isSelfBuff || isTerrain ? [] : rollTargets(spell, layout.enemyHitPositions)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spell.id, slotLevel, isSelfBuff, isTerrain, layout],
  )

  // Wave origin: self-buff/debuff-aura always emanate from the player; AOE damage uses
  // sphere centroid or caster tile depending on shape (radius vs directional).
  const waveOrigin = useMemo<Cell>(() => {
    if (isAoe) return aoeOriginCell(spell, layout, playerPos)
    return playerPos
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spell.id, slotLevel, isAoe, layout])

  // Cells that participate in the wave animation:
  //   - AOE damage      → all area cells
  //   - Self-buff       → the single player tile
  //   - Debuff-aura     → only enemy tiles where the spell actually landed (result === 'hit')
  const wavefrontCells = useMemo<Cell[]>(() => {
    if (isAoe) return layout.areaCells
    if (isSelfBuff) return [playerPos]
    if (isDebuffAura) return targets.filter(t => t.result === 'hit').map(t => ({ x: t.pos.x, y: t.pos.y }))
    if (isTerrain) return [playerPos] // shapeless terrain (e.g. Minor Illusion) sits on the caster tile
    return []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spell.id, slotLevel, isAoe, isSelfBuff, isDebuffAura, isTerrain, targets, layout])

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

  function handleWallClick(x: number, y: number) {
    if (!wallStart) {
      setWallStart({ x, y }); setWallEnd(null)
    } else if (!wallEnd) {
      if (wallStart.x === x && wallStart.y === y) setWallStart(null)
      else setWallEnd({ x, y })
    } else {
      setWallStart({ x, y }); setWallEnd(null)
    }
  }

  // Targeting reset — only runs when the spell itself changes
  useEffect(() => {
    setAimTarget(null)
    setSphereMode('square')
    setWallStart(null)
    setWallEnd(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spell.id, slotLevel])

  // Animation — restarts whenever the spell OR any targeting state changes so the
  // user always sees the updated geometry from the beginning of the countdown.
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
    }

    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spell.id, slotLevel, aimTarget, sphereMode, wallStart, wallEnd])

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

  const aimAngle = aimTarget
    ? Math.atan2(aimTarget.y - playerPos.y, aimTarget.x - playerPos.x)
    : Math.PI / 2

  return (
    <div className={styles.visualization}>
      <div className={styles.rangeLabel} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <ShapeIcon shape={spell.aoeShape ?? 'single'} />
        {spell.aoeShape && spell.aoeShape !== 'single' && (
          <span style={{ textTransform: 'capitalize' }}>{spell.aoeShape}</span>
        )}
        <span style={{ opacity: 0.7 }}>·</span>
        {spell.range}
      </div>

      {isSphereAoe && (
        <div className={styles.toggleRow}>
          <button
            className={sphereMode === 'square' ? styles.toggleBtnActive : styles.toggleBtn}
            onClick={() => setSphereMode('square')}
          >Tile</button>
          <button
            className={sphereMode === 'intersection' ? styles.toggleBtnActive : styles.toggleBtn}
            onClick={() => setSphereMode('intersection')}
          >Corner</button>
        </div>
      )}

      {(isConeOrDirectionalLine || isCubeAoe) && (
        <div className={styles.frameLabel}>
          {aimTarget ? 'Click to re-aim' : 'Click a cell to aim'}
        </div>
      )}
      {isWallSpell && (
        <div className={styles.frameLabel}>
          {!wallStart ? 'Click to place wall start' : !wallEnd ? 'Click to place wall end' : 'Click to reposition'}
        </div>
      )}

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
              // Only allow aiming into the lower half — enemies are always below the caster
              const isAimableCell = (isConeOrDirectionalLine || isCubeAoe) && !isPlayer && y > playerPos.y
              const isWallClickable = isWallSpell
              const isAimTarget = aimTarget?.x === x && aimTarget?.y === y
              const isWallStartCell = wallStart?.x === x && wallStart?.y === y
              const cellClass = [
                styles.cell,
                (isAimableCell || isWallClickable) ? styles.cellInteractive : '',
                isAimTarget ? styles.cellAimTarget : '',
                isWallStartCell ? styles.cellWallStart : '',
              ].filter(Boolean).join(' ')
              const handleClick = isAimableCell
                ? () => setAimTarget({ x, y })
                : isWallClickable
                  ? () => handleWallClick(x, y)
                  : undefined
              return (
                <div
                  key={key}
                  className={cellClass}
                  style={isArea ? { background: tint } : undefined}
                  onClick={handleClick}
                >
                  {isEnemy && !isPlayer && (
                    <img
                      src="/assets/enemies/enemy_basic.png"
                      alt="Enemy"
                      style={{
                        position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                        width: TILE, height: Math.round(TILE * 32 / 24),
                        imageRendering: 'pixelated', zIndex: 3, pointerEvents: 'none',
                      }}
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />
                  )}
                  {isPlayer && (
                    <div
                      style={{
                        position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
                        width: Math.round(TILE * 0.62), height: Math.round(TILE * 0.62),
                        borderRadius: '50%',
                        background: 'radial-gradient(circle at 35% 30%, #6aa6ff, #2b5bbf 70%, #16306e)',
                        border: '2px solid #0e1f44', boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                        zIndex: 4, pointerEvents: 'none',
                      }}
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

          {/* Geometric shape overlay + origin marker */}
          {isAoe && (() => {
            const overlay = computeShapeOverlay(spell.aoeShape ?? 'single', layout, playerPos, aimAngle)
            const marker = computeOriginMarker(spell, layout, playerPos, wallStart)
            if (!overlay && !marker) return null
            const svgW = 2 * GRID_PADDING + layout.cols * (TILE + GRID_GAP) - GRID_GAP
            const svgH = 2 * GRID_PADDING + layout.rows * (TILE + GRID_GAP) - GRID_GAP
            const markerColor = DMG_SOLID[spell.damageType ?? ''] ?? 'rgb(180,180,180)'
            return (
              <svg
                style={{
                  position: 'absolute', top: 0, left: 0,
                  width: svgW, height: svgH,
                  pointerEvents: 'none', zIndex: 8,
                  overflow: 'visible',
                }}
                viewBox={`0 0 ${svgW} ${svgH}`}
              >
                {overlay?.kind === 'circle' && (
                  <circle
                    cx={overlay.cx} cy={overlay.cy} r={overlay.r}
                    fill={tint}
                    stroke={markerColor}
                    strokeWidth="2.5"
                    strokeOpacity={0.75}
                  />
                )}
                {overlay?.kind === 'path' && (
                  <path
                    d={overlay.d}
                    fill={tint}
                    stroke={markerColor}
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeOpacity={0.75}
                  />
                )}
                {marker && (
                  <g>
                    <circle cx={marker.cx} cy={marker.cy} r={5} fill="none" stroke={markerColor} strokeWidth={1.5}/>
                    <circle cx={marker.cx} cy={marker.cy} r={2} fill={markerColor}/>
                    <line x1={marker.cx - 8} y1={marker.cy} x2={marker.cx - 5} y2={marker.cy} stroke={markerColor} strokeWidth={1.5}/>
                    <line x1={marker.cx + 5} y1={marker.cy} x2={marker.cx + 8} y2={marker.cy} stroke={markerColor} strokeWidth={1.5}/>
                    <line x1={marker.cx} y1={marker.cy - 8} x2={marker.cx} y2={marker.cy - 5} stroke={markerColor} strokeWidth={1.5}/>
                    <line x1={marker.cx} y1={marker.cy + 5} x2={marker.cx} y2={marker.cy + 8} stroke={markerColor} strokeWidth={1.5}/>
                  </g>
                )}
              </svg>
            )
          })()}
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
