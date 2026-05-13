import type { AbilityScores } from '@/entities/character/types'

export interface FeatDef {
  id: string
  name: string
  description: string
  abilityBonus?: Partial<AbilityScores>
}

export const FEATS: FeatDef[] = [
  {
    id: 'alert',
    name: 'Alert',
    description: '+5 bonus to initiative. You can\'t be surprised while conscious. Other creatures don\'t gain advantage on attack rolls against you from being hidden from you.',
  },
  {
    id: 'athlete',
    name: 'Athlete',
    description: '+1 STR or DEX (your choice). Climbing costs no extra movement. Standing up from prone uses only 5 ft of movement. Running long/high jump no longer requires a 10-ft running start.',
  },
  {
    id: 'lucky',
    name: 'Lucky',
    description: 'You have 3 luck points. When you make an attack, ability check, or saving throw, you can spend 1 luck point to roll an extra d20 and choose which to use. You can also spend 1 point to reroll an attack targeting you.',
  },
  {
    id: 'mobile',
    name: 'Mobile',
    description: 'Speed increases by 10 ft. When you Dash, difficult terrain doesn\'t cost extra movement that turn. If you make a melee attack against a creature, you don\'t provoke opportunity attacks from it for the rest of that turn.',
  },
  {
    id: 'sentinel',
    name: 'Sentinel',
    description: 'Opportunity attacks hit creatures even if they Disengage. When a creature makes an attack against a target other than you and within 5 ft, you can make an opportunity attack. On an opportunity attack hit, the creature\'s speed drops to 0.',
  },
  {
    id: 'tough',
    name: 'Tough',
    description: 'Your hit point maximum increases by an amount equal to twice your character level when you gain this feat, and every time you gain a level thereafter it increases by 2.',
  },
  {
    id: 'warCaster',
    name: 'War Caster',
    description: 'Advantage on Constitution saving throws to maintain concentration. You can perform somatic components even with weapons/shield in hand. When a creature provokes an opportunity attack, you can cast a spell with a casting time of 1 action as the attack.',
  },
  {
    id: 'resilient',
    name: 'Resilient',
    description: '+1 to one ability score of your choice. Gain proficiency in saving throws using that ability.',
  },
  {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    description: 'Attacking at long range doesn\'t impose disadvantage. Ranged attack rolls against targets in half or three-quarters cover ignore the cover bonus. Before a ranged attack, take −5 to the roll to deal +10 damage.',
  },
  {
    id: 'greatWeaponMaster',
    name: 'Great Weapon Master',
    description: 'On a critical hit or after killing a creature with a melee weapon, make one melee weapon attack as a bonus action. Before a melee attack with a heavy weapon, take −5 to the roll to deal +10 damage.',
  },
]

export const FEAT_BY_ID = Object.fromEntries(FEATS.map(f => [f.id, f])) as Record<string, FeatDef>
