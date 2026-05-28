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
  return missileFrameMap[type] ?? missileFrameMap.psychic ?? []
}

export function resolveAoeAnimationFrames(damageType?: string): string[] {
  const type = damageType ?? 'psychic'
  return aoeFrameMap[type] ?? aoeFrameMap.psychic ?? []
}
