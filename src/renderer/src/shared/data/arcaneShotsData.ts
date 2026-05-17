export interface ArcaneShotDef {
  id: string
  name: string
  desc: string
}

export const ARCANE_SHOTS: ArcaneShotDef[] = [
  {
    id: 'banishing-arrow',
    name: 'Banishing Arrow',
    desc: 'Force the target to succeed on a CHA save or be banished to a harmless demiplane until the end of your next turn. On a hit the target also takes 2d6 force damage (no save).',
  },
  {
    id: 'beguiling-arrow',
    name: 'Beguiling Arrow',
    desc: 'The arrow is imbued with enchantment magic. On a hit, deal an extra 2d6 psychic damage and the target must succeed on a WIS save or be charmed by one of your allies until the start of your next turn.',
  },
  {
    id: 'bursting-arrow',
    name: 'Bursting Arrow',
    desc: 'You imbue the arrow with force energy drawn from the school of evocation. The arrow detonates immediately after hitting: each creature within 10 ft of the target, including the target, takes 2d6 force damage.',
  },
  {
    id: 'enfeebling-arrow',
    name: 'Enfeebling Arrow',
    desc: 'On a hit, the target takes an extra 2d6 necrotic damage and must succeed on a CON save or its weapon damage rolls are halved until the start of your next turn.',
  },
  {
    id: 'grasping-arrow',
    name: 'Grasping Arrow',
    desc: 'On a hit, the target takes an extra 2d6 poison damage and is wrapped in thorny brambles; it is grappled (escape DC = 8 + proficiency + DEX modifier) and takes 2d6 slashing damage at the start of each turn until it escapes.',
  },
  {
    id: 'piercing-arrow',
    name: 'Piercing Arrow',
    desc: 'Instead of a normal attack, fire the arrow in a 1-ft wide, 30-ft long line. The arrow passes through objects, ignoring cover. Each creature in the line must succeed on a DEX save or take damage as if hit by the arrow plus 1d6 piercing damage.',
  },
  {
    id: 'seeking-arrow',
    name: 'Seeking Arrow',
    desc: 'Instead of a normal attack, choose a creature you have seen in the past minute. The arrow flies toward that creature, turning corners if necessary and ignoring three-quarters cover and total cover. On a hit it deals damage as normal plus 2d6 force damage; on a miss you know the target has total cover.',
  },
  {
    id: 'shadow-arrow',
    name: 'Shadow Arrow',
    desc: 'On a hit, the target takes an extra 2d6 psychic damage and must succeed on a WIS save or be unable to see anything farther than 5 ft away until the start of your next turn.',
  },
]

export const ARCANE_SHOT_BY_ID = Object.fromEntries(ARCANE_SHOTS.map(s => [s.id, s])) as Record<string, ArcaneShotDef>
