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
  defense:     [pub('assets/spells/aura/buff/defense_aura.gif')],
  damage:      [pub('assets/spells/aura/buff/damage_aura.gif')],
  frost:       [pub('assets/spells/aura/buff/frost_aura.gif')],
  weapon_glow: [pub('assets/spells/aura/buff/weapon_glow_aura.gif')],
  heal:        [pub('assets/spells/aura/buff/heal_aura.gif')],
  holy:        [pub('assets/spells/aura/buff/holy_aura.gif')],
  mirror:      [pub('assets/spells/aura/buff/mirror_aura.gif')],
  speed:       [pub('assets/spells/aura/buff/speed_aura.gif')],
  asleep:      [pub('assets/spells/aura/debuff/asleep_aura.gif')],
  banished:    [pub('assets/spells/aura/debuff/banished_aura.gif')],
  blinded:     [pub('assets/spells/aura/debuff/blinded_aura.gif')],
  charmed:     [pub('assets/spells/aura/debuff/charmed_aura.gif')],
  frightened:  [pub('assets/spells/aura/debuff/frightened_aura.gif')],
  illuminated: [pub('assets/spells/aura/debuff/illuminated_aura.gif')],
  marked:      [pub('assets/spells/aura/debuff/marked_aura.gif')],
  paralyzed:   [pub('assets/spells/aura/debuff/paralyzed_aura.gif')],
  restrain:    [pub('assets/spells/aura/debuff/restrain_aura.gif')],
  slowed:      [pub('assets/spells/aura/debuff/slowed_aura.gif')],
  transformed: [pub('assets/spells/aura/debuff/transformed_aura.gif')],
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

// ── Summon sprites ──────────────────────────────────────────────────────────
// Convention (matches scripts/gen-summon-sprites.py): every summon resolves from
// (type, templateId) alone — `effects/summon/<type>/<id_with_underscores>.<ext>`.
// PNG-sequence summons are exactly SUMMON_FRAMES frames; the shared portal opener
// is PORTAL_FRAMES. Three templates are GIF idle loops (no portal) instead.
export const SUMMON_FRAMES = 4
export const PORTAL_FRAMES = 6
const SUMMON_GIF_IDS = new Set(['spiritual-weapon', 'mage-hand', 'unseen-servant'])

export interface SummonSpriteAsset {
  kind: 'gif' | 'png-seq'
  frames: string[]      // one GIF url, or SUMMON_FRAMES PNG urls
  usesPortal: boolean   // false for the GIF idle loops (they appear directly)
}

export function resolvePortalFrames(): string[] {
  return Array.from({ length: PORTAL_FRAMES }, (_, i) =>
    pub(`assets/spells/effects/summon/portal_open_${i}.png`))
}

export function resolveSummonSprite(templateId: string, type: string): SummonSpriteAsset {
  const stem = templateId.replace(/-/g, '_')
  const base = `assets/spells/effects/summon/${type}/${stem}`
  if (SUMMON_GIF_IDS.has(templateId)) {
    return { kind: 'gif', frames: [pub(`${base}.gif`)], usesPortal: false }
  }
  return {
    kind: 'png-seq',
    frames: Array.from({ length: SUMMON_FRAMES }, (_, i) => pub(`${base}_${i}.png`)),
    usesPortal: true,
  }
}

// ── Icon overlays (decorative/info; SVG or small GIF) ───────────────────────
const ICON_ASSETS: Record<string, string> = {
  d4_floating:      pub('assets/spells/icons/d4_floating.svg'),
  thought_bubble:   pub('assets/spells/icons/thought_bubble.svg'),
  magic_scan:       pub('assets/spells/icons/magic_scan.svg'),
  light_glow:       pub('assets/spells/icons/light_glow.svg'),
  mote_warm:        pub('assets/spells/icons/mote_warm.gif'),
  mote_cool:        pub('assets/spells/icons/mote_cool.gif'),
  flourish_sparkle: pub('assets/spells/icons/flourish_sparkle.gif'),
}

export function resolveIconAsset(key?: string): string | undefined {
  return key ? ICON_ASSETS[key] : undefined
}

// ── Wall sprites (single stretchable element spanning a tile range) ─────────
const WALL_ASSETS: Record<string, string> = {
  force: pub('assets/spells/effects/wall/wall_force.svg'),
}

export function resolveWallAsset(key?: string): string | undefined {
  return key ? WALL_ASSETS[key] : undefined
}
