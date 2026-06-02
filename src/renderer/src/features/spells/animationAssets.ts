export type SpellResult = 'hit' | 'pass' | 'miss'

// import.meta.glob with ?url on public-dir files returns "/public/..." paths (wrong).
// Use direct URL construction instead: BASE_URL = '/' in dev, './' in production build.
const base = import.meta.env.BASE_URL  // '/' in dev, './' in Electron production build

function pub(path: string): string {
  // path should NOT start with /
  return base + path
}

const IMPACT_DEFAULT: Record<SpellResult, string> = {
  hit:  pub('assets/spells/hit/Blood_Effect.gif'),
  pass: pub('assets/spells/pass/Sparks_Effect.gif'),
  miss: pub('assets/spells/miss/Poof_Effect.gif'),
}

export function resolveImpactGif(result: SpellResult, damageType?: string): { primary: string; fallback: string } {
  const fallback = IMPACT_DEFAULT[result]
  const primary = damageType
    ? pub(`assets/spells/hit/${damageType}_effect.gif`)
    : fallback
  return { primary, fallback }
}

const DAMAGE_TYPES = [
  'acid', 'cold', 'fire', 'force', 'lightning',
  'necrotic', 'poison', 'psychic', 'radiant', 'thunder',
]

// Per-damage-type AOE loop GIFs (assets/spells/animation/<type>.gif)
const animationGifMap: Record<string, string[]> = Object.fromEntries(
  DAMAGE_TYPES.map(t => [t, [pub(`assets/spells/animation/${t}.gif`)]])
)

// Per-damage-type missile GIFs (assets/spells/missiles/magic/<type>.gif)
const missileGifMap: Record<string, string[]> = Object.fromEntries(
  DAMAGE_TYPES.map(t => [t, [pub(`assets/spells/missiles/magic/${t}.gif`)]])
)

// Buff/debuff aura GIFs, keyed by stem (strip _aura suffix)
const auraGifMap: Record<string, string[]> = {
  defense: [pub('assets/spells/aura/buff/defense_aura.gif')],
  heal:    [pub('assets/spells/aura/buff/heal_aura.gif')],
  holy:    [pub('assets/spells/aura/buff/holy_aura.gif')],
  mirror:  [pub('assets/spells/aura/buff/mirror_aura.gif')],
  speed:   [pub('assets/spells/aura/buff/speed_aura.gif')],
  asleep:     [pub('assets/spells/aura/debuff/asleep_aura.gif')],
  banished:   [pub('assets/spells/aura/debuff/banished_aura.gif')],
  charmed:    [pub('assets/spells/aura/debuff/charmed_aura.gif')],
  frightened: [pub('assets/spells/aura/debuff/frightened_aura.gif')],
  marked:     [pub('assets/spells/aura/debuff/marked_aura.gif')],
  paralyzed:  [pub('assets/spells/aura/debuff/paralyzed_aura.gif')],
  slowed:     [pub('assets/spells/aura/debuff/slowed_aura.gif')],
}

// Terrain/environment effect GIFs, keyed by full stem
const terrainGifMap: Record<string, string[]> = {
  darkness_sphere:  [pub('assets/spells/effects/terrain/darkness_sphere.gif')],
  fog_cloud:        [pub('assets/spells/effects/terrain/fog_cloud.gif')],
  hypnotic_swirl:   [pub('assets/spells/effects/terrain/hypnotic_swirl.gif')],
  illusion_shimmer: [pub('assets/spells/effects/terrain/illusion_shimmer.gif')],
  silence_dome:     [pub('assets/spells/effects/terrain/silence_dome.gif')],
  spikes_thorns:    [pub('assets/spells/effects/terrain/spikes_thorns.gif')],
  vines_grasping:   [pub('assets/spells/effects/terrain/vines_grasping.gif')],
}

// Combined map: damage-type animations take lowest priority; aura/terrain/vizDamageType keys win.
const gifSpriteMap: Record<string, string[]> = {
  ...animationGifMap,
  ...auraGifMap,
  ...terrainGifMap,
}

export function resolveMissileFrames(damageType?: string): string[] {
  const type = damageType ?? 'psychic'
  return missileGifMap[type] ?? missileGifMap.psychic ?? []
}

export function resolveAoeAnimationFrames(damageType?: string): string[] {
  const type = damageType ?? 'psychic'
  return gifSpriteMap[type] ?? gifSpriteMap.psychic ?? []
}
