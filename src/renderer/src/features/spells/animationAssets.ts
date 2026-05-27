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

const MISSILE_FRAME_IDS: Record<string, string[]> = {
  earth:     ['191971','191972','191973','191974','191975','191976','191977','191978'],
  fire:      ['191789','191790','191791','191792','191793','191794','191795','191796'],
  lightning: ['191915','191916','191917','191918','191919','191920','191921','191922'],
  poison:    ['191781','191782','191783','191784','191785','191786','191787','191788'],
  psychic:   ['191843','191844','191845','191846','191847','191848','191849','191850'],
  thunder:   ['191843','191844','191845','191846','191847','191848','191849','191850'],
}

const FRAME_FALLBACK: Record<string, string> = {
  cold:     'lightning',
  radiant:  'fire',
  necrotic: 'psychic',
  acid:     'poison',
  force:    'psychic',
}

const DEFAULT_FRAME_TYPE = 'psychic'

function framesFor(base: string, damageType?: string): string[] {
  const key = damageType ?? ''
  const folder =
    MISSILE_FRAME_IDS[key]
      ? key
      : FRAME_FALLBACK[key] ?? DEFAULT_FRAME_TYPE
  return MISSILE_FRAME_IDS[folder].map(id => `${base}/${folder}/${id}.png`)
}

export function resolveMissileFrames(damageType?: string): string[] {
  return framesFor('/assets/spells/missiles/magic', damageType)
}

export function resolveAoeAnimationFrames(damageType?: string): string[] {
  return framesFor('/assets/spells/animation', damageType)
}
