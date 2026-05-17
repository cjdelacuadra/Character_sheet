export interface ManeuverDef {
  id: string
  name: string
  desc: string
}

export const MANEUVERS: ManeuverDef[] = [
  {
    id: 'commanders-strike',
    name: "Commander's Strike",
    desc: 'Forgo one of your attacks and use a bonus action to direct an ally within 30 ft to strike. That ally can immediately use their reaction to make one weapon attack, adding your Superiority Die to the damage roll.',
  },
  {
    id: 'disarming-attack',
    name: 'Disarming Attack',
    desc: 'Add the Superiority Die to the damage roll. The target must succeed on a STR saving throw or drop one item of your choice. The object lands at its feet.',
  },
  {
    id: 'distracting-strike',
    name: 'Distracting Strike',
    desc: 'Add the Superiority Die to the damage roll. The next attack roll against the target before the start of your next turn has advantage.',
  },
  {
    id: 'evasive-footwork',
    name: 'Evasive Footwork',
    desc: 'Roll your Superiority Die and add the number rolled to your AC until you stop moving.',
  },
  {
    id: 'feinting-attack',
    name: 'Feinting Attack',
    desc: 'Use a bonus action to feint, choosing one creature within 5 ft. You have advantage on your next attack roll against that creature this turn, and add the Superiority Die to the damage roll on a hit.',
  },
  {
    id: 'goading-attack',
    name: 'Goading Attack',
    desc: 'Add the Superiority Die to the damage roll. The target must succeed on a WIS save or have disadvantage on attack rolls against creatures other than you until the end of your next turn.',
  },
  {
    id: 'lunging-attack',
    name: 'Lunging Attack',
    desc: 'Spend a Superiority Die to increase your reach by 5 ft for one melee weapon attack. On a hit, add the Superiority Die to the damage roll.',
  },
  {
    id: 'maneuvering-attack',
    name: 'Maneuvering Attack',
    desc: 'Add the Superiority Die to the damage roll. One friendly creature can use their reaction to move up to half their speed without provoking opportunity attacks from the target.',
  },
  {
    id: 'menacing-attack',
    name: 'Menacing Attack',
    desc: 'Add the Superiority Die to the damage roll. The target must succeed on a WIS save or be frightened of you until the end of your next turn.',
  },
  {
    id: 'parry',
    name: 'Parry',
    desc: 'When you are hit by a melee attack, use your reaction to reduce the damage by the Superiority Die roll + your DEX modifier.',
  },
  {
    id: 'precision-attack',
    name: 'Precision Attack',
    desc: 'When you make a weapon attack roll, add the Superiority Die to the roll. You can use this maneuver before or after making the attack roll, but before any effects are applied.',
  },
  {
    id: 'pushing-attack',
    name: 'Pushing Attack',
    desc: 'Add the Superiority Die to the damage roll. If the target is Large or smaller, it must succeed on a STR save or be pushed up to 15 ft away from you.',
  },
  {
    id: 'rally',
    name: 'Rally',
    desc: 'Use a bonus action to bolster an allied creature within 60 ft that can see or hear you. That creature gains temporary HP equal to the Superiority Die roll + your CHA modifier.',
  },
  {
    id: 'riposte',
    name: 'Riposte',
    desc: 'When a creature misses you with a melee attack, use your reaction to make a melee weapon attack. On a hit, add the Superiority Die to the damage roll.',
  },
  {
    id: 'sweeping-attack',
    name: 'Sweeping Attack',
    desc: 'When you hit a creature with a melee weapon attack, spend a Superiority Die to attempt to damage another creature within 5 ft of the original. The second creature takes damage equal to the Superiority Die roll (same damage type), no roll required.',
  },
  {
    id: 'trip-attack',
    name: 'Trip Attack',
    desc: 'Add the Superiority Die to the damage roll. If the target is Large or smaller, it must succeed on a STR save or be knocked prone.',
  },
]

export const MANEUVER_BY_ID = Object.fromEntries(MANEUVERS.map(m => [m.id, m])) as Record<string, ManeuverDef>
