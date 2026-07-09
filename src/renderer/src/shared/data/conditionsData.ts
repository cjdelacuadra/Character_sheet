import type { Condition } from '@/entities/condition/types'

export let CONDITIONS: Condition[] = [
  {
    id: 'blinded',
    name: 'Blinded',
    category: 'debuff',
    description: 'Auto-fail sight checks; attacks vs you ADV, your attacks DIS.',
    effects: [
      { affects: 'attack', description: 'Auto-fail sight checks; attacks vs you ADV, your attacks DIS.', mechanic: { kind: 'flag' } },
    ],
  },
  {
    id: 'charmed',
    name: 'Charmed',
    category: 'debuff',
    description: "Can't attack the charmer; charmer has ADV on social checks vs you.",
    effects: [
      { affects: 'other', description: "Can't attack the charmer; charmer has ADV on social checks vs you.", mechanic: { kind: 'flag' } },
    ],
  },
  {
    id: 'concentration',
    name: 'Concentration',
    category: 'neutral',
    description: 'Tracks an active concentration spell (see spell panel).',
    effects: [
      { affects: 'other', description: 'Tracks an active concentration spell (see spell panel).', mechanic: { kind: 'flag' } },
    ],
  },
  {
    id: 'deafened',
    name: 'Deafened',
    category: 'debuff',
    description: 'Auto-fail hearing checks.',
    effects: [
      { affects: 'other', description: 'Auto-fail hearing checks.', mechanic: { kind: 'flag' } },
    ],
  },
  {
    id: 'exhaustion',
    name: 'Exhaustion',
    category: 'debuff',
    description: 'Level-based penalties (DIS checks @1, half speed @2, …). Track level manually.',
    effects: [
      { affects: 'ability-check', description: 'Level-based penalties (DIS checks @1, half speed @2, …). Track level manually.', mechanic: { kind: 'flag' } },
    ],
  },
  {
    id: 'frightened',
    name: 'Frightened',
    category: 'debuff',
    description: "DIS on checks/attacks while source in sight; can't move closer.",
    effects: [
      { affects: 'attack', description: "DIS on checks/attacks while source in sight; can't move closer.", mechanic: { kind: 'flag' } },
    ],
  },
  {
    id: 'grappled',
    name: 'Grappled',
    category: 'debuff',
    description: "Speed 0; can't benefit from speed bonuses.",
    effects: [
      { affects: 'speed', description: "Speed 0; can't benefit from speed bonuses.", mechanic: { kind: 'speedMultiplier', value: 0 } },
    ],
  },
  {
    id: 'incapacitated',
    name: 'Incapacitated',
    category: 'debuff',
    description: 'No actions or reactions.',
    effects: [
      { affects: 'other', description: 'No actions or reactions.', mechanic: { kind: 'flag' } },
    ],
  },
  {
    id: 'invisible',
    name: 'Invisible',
    category: 'buff',
    description: 'Attacks vs you DIS; your attacks ADV; heavily obscured.',
    effects: [
      { affects: 'attack', description: 'Attacks vs you DIS; your attacks ADV; heavily obscured.', mechanic: { kind: 'flag' } },
    ],
  },
  {
    id: 'paralyzed',
    name: 'Paralyzed',
    category: 'debuff',
    description: 'Incapacitated; auto-fail STR/DEX saves; hits within 5 ft crit.',
    effects: [
      { affects: 'speed', description: 'Speed 0.', mechanic: { kind: 'speedMultiplier', value: 0 } },
      { affects: 'saving-throw', description: 'Incapacitated; auto-fail STR/DEX saves; hits within 5 ft crit.', mechanic: { kind: 'flag' } },
    ],
  },
  {
    id: 'petrified',
    name: 'Petrified',
    category: 'debuff',
    description: 'Incapacitated; resistance to all damage; auto-fail STR/DEX saves.',
    effects: [
      { affects: 'speed', description: 'Speed 0.', mechanic: { kind: 'speedMultiplier', value: 0 } },
      { affects: 'saving-throw', description: 'Incapacitated; resistance to all damage; auto-fail STR/DEX saves.', mechanic: { kind: 'flag' } },
    ],
  },
  {
    id: 'poisoned',
    name: 'Poisoned',
    category: 'debuff',
    description: 'DIS on attack rolls and ability checks.',
    effects: [
      { affects: 'attack', description: 'DIS on attack rolls and ability checks.', mechanic: { kind: 'flag' } },
    ],
  },
  {
    id: 'prone',
    name: 'Prone',
    category: 'debuff',
    description: 'DIS on attacks; melee vs you ADV, ranged vs you DIS; half movement to stand.',
    effects: [
      { affects: 'attack', description: 'DIS on attacks; melee vs you ADV, ranged vs you DIS; half movement to stand.', mechanic: { kind: 'flag' } },
    ],
  },
  {
    id: 'restrained',
    name: 'Restrained',
    category: 'debuff',
    description: 'Speed 0; attacks vs you ADV, yours DIS; DIS on DEX saves.',
    effects: [
      { affects: 'speed', description: 'Speed 0.', mechanic: { kind: 'speedMultiplier', value: 0 } },
      { affects: 'saving-throw', description: 'Speed 0; attacks vs you ADV, yours DIS; DIS on DEX saves.', mechanic: { kind: 'flag' } },
    ],
  },
  {
    id: 'stunned',
    name: 'Stunned',
    category: 'debuff',
    description: 'Incapacitated; auto-fail STR/DEX saves; attacks vs you ADV.',
    effects: [
      { affects: 'speed', description: 'Speed 0.', mechanic: { kind: 'speedMultiplier', value: 0 } },
      { affects: 'saving-throw', description: 'Incapacitated; auto-fail STR/DEX saves; attacks vs you ADV.', mechanic: { kind: 'flag' } },
    ],
  },
  {
    id: 'unconscious',
    name: 'Unconscious',
    category: 'debuff',
    description: 'Incapacitated, prone, drop everything; hits within 5 ft crit.',
    effects: [
      { affects: 'speed', description: 'Speed 0.', mechanic: { kind: 'speedMultiplier', value: 0 } },
      { affects: 'saving-throw', description: 'Incapacitated, prone, drop everything; hits within 5 ft crit.', mechanic: { kind: 'flag' } },
    ],
  },
  {
    id: 'difficult-terrain',
    name: 'Difficult Terrain',
    category: 'debuff',
    description: 'Each foot costs 2 — effective speed halved.',
    effects: [
      { affects: 'speed', description: 'Each foot costs 2 — effective speed halved.', mechanic: { kind: 'speedMultiplier', value: 0.5 } },
    ],
  },
  {
    id: 'silence',
    name: 'Silence',
    category: 'debuff',
    description: "Can't cast spells with a Verbal (V) component.",
    effects: [
      { affects: 'other', description: "Can't cast spells with a Verbal (V) component.", mechanic: { kind: 'flag' } },
    ],
  },
  {
    id: 'slowed',
    name: 'Slowed',
    category: 'debuff',
    description: 'Half speed; -2 AC & DEX saves; no reactions; max one attack/turn.',
    effects: [
      { affects: 'ac', description: '-2 AC.', mechanic: { kind: 'acDelta', value: -2 } },
      { affects: 'saving-throw', description: '-2 DEX saves.', mechanic: { kind: 'flatSaveDelta', ability: 'dex', value: -2 } },
      { affects: 'speed', description: 'Half speed.', mechanic: { kind: 'speedMultiplier', value: 0.5 } },
      { affects: 'other', description: 'Half speed; -2 AC & DEX saves; no reactions; max one attack/turn.', mechanic: { kind: 'flag' } },
    ],
  },
  {
    id: 'fly',
    name: 'Fly',
    category: 'buff',
    description: 'Gain a flying speed (e.g. 60 ft).',
    effects: [
      { affects: 'other', description: 'Gain a flying speed (e.g. 60 ft).', mechanic: { kind: 'flag' } },
    ],
  },
  {
    id: 'haste',
    name: 'Haste',
    category: 'buff',
    description: 'Speed doubled; +2 AC; ADV on DEX saves; one extra limited action.',
    effects: [
      { affects: 'ac', description: '+2 AC.', mechanic: { kind: 'acDelta', value: 2 } },
      { affects: 'other', description: 'Speed doubled; +2 AC; ADV on DEX saves; one extra limited action.', mechanic: { kind: 'flag' } },
    ],
  },
]

export let CONDITION_BY_ID: Record<string, Condition> = Object.fromEntries(CONDITIONS.map(c => [c.id, c]))

export function setConditionsData(items: Condition[]): void {
  CONDITIONS = items
  CONDITION_BY_ID = Object.fromEntries(items.map(c => [c.id, c]))
}
