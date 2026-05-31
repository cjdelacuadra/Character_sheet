export type SpellResult = 'hit' | 'pass' | 'miss'

const IMPACT_DEFAULT: Record<SpellResult, string> = {
  hit:  '/assets/spells/hit/Blood_Effect.gif',
  pass: '/assets/spells/pass/Sparks_Effect.gif',
  miss: '/assets/spells/miss/Poof_Effect.gif',
}

export function resolveImpactGif(result: SpellResult, damageType?: string): { primary: string; fallback: string } {
  const fallback = IMPACT_DEFAULT[result]
  const primary = damageType
    ? `/assets/spells/${result}/${damageType}_effect.gif`
    : fallback
  return { primary, fallback }
}

const aoeModules = import.meta.glob<string>(
  '/public/assets/spells/animation/**/*.png',
  { eager: true, query: '?url', import: 'default' }
)

const missileModules = import.meta.glob<string>(
  '/public/assets/spells/missiles/magic/**/*.png',
  { eager: true, query: '?url', import: 'default' }
)

// Single-file GIF sprites that self-animate in the browser (no PNG frame sequence):
// effect-themed buff/debuff auras and persistent terrain zones. Each is keyed by the
// stem a spell's `vizDamageType` matches — auras drop the `_aura` suffix
// (`defense_aura.gif` → `defense`), terrain keeps its full stem (`fog_cloud`).
const auraModules = import.meta.glob<string>(
  '/public/assets/spells/aura/**/*.gif',
  { eager: true, query: '?url', import: 'default' }
)
const terrainModules = import.meta.glob<string>(
  '/public/assets/spells/effects/terrain/*.gif',
  { eager: true, query: '?url', import: 'default' }
)
// Per-damage-type single-GIF VFX (procedurally generated): one area loop + one missile each,
// keyed by the damage type (`/animation/fire.gif`, `/missiles/magic/fire.gif`).
const animationGifModules = import.meta.glob<string>(
  '/public/assets/spells/animation/*.gif',
  { eager: true, query: '?url', import: 'default' }
)
const missileGifModules = import.meta.glob<string>(
  '/public/assets/spells/missiles/magic/*.gif',
  { eager: true, query: '?url', import: 'default' }
)

function buildGifMap(
  modules: Record<string, string>,
  stripAuraSuffix: boolean,
): Record<string, string[]> {
  const map: Record<string, string[]> = {}
  for (const [path, url] of Object.entries(modules)) {
    const file = path.split('/').pop() ?? ''
    let stem = file.replace(/\.gif$/, '')
    if (stripAuraSuffix) stem = stem.replace(/_aura$/, '')
    map[stem] = [url] // length-1: the single GIF self-animates
  }
  return map
}

const gifSpriteMap: Record<string, string[]> = {
  ...buildGifMap(auraModules, true),
  ...buildGifMap(terrainModules, false),
  ...buildGifMap(animationGifModules, false), // /animation/<type>.gif
}

// Missile GIFs keyed by damage type (/missiles/magic/<type>.gif).
const missileGifMap = buildGifMap(missileGifModules, false)

function buildFrameMap(modules: Record<string, string>): Record<string, string[]> {
  const map: Record<string, string[]> = {}
  Object.entries(modules)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([path, url]) => {
      const match = path.match(/\/assets\/spells\/(animation|missiles)\/([^/]+)\//)
      if (match) {
        const damageType = match[2]
        if (!map[damageType]) map[damageType] = []
        map[damageType].push(url)
      }
    })
  return map
}

const aoeFrameMap = buildFrameMap(aoeModules)
const missileFrameMap = buildFrameMap(missileModules)

export function resolveMissileFrames(damageType?: string): string[] {
  const type = damageType ?? 'psychic'
  // Single-GIF missiles win over legacy PNG sequences; fall back to psychic either way.
  return missileGifMap[type] ?? missileFrameMap[type]
    ?? missileGifMap.psychic ?? missileFrameMap.psychic ?? []
}

export function resolveAoeAnimationFrames(damageType?: string): string[] {
  const type = damageType ?? 'psychic'
  // Effect-themed single-GIF sprites (auras, terrain) win over the damage-type PNG
  // sequences; otherwise fall back to the PNG frame map, then the psychic default.
  return gifSpriteMap[type] ?? aoeFrameMap[type] ?? aoeFrameMap.psychic ?? []
}
