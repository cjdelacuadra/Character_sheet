/**
 * Metamagic option catalog (PHB + TCoE) — the caster counterpart of the
 * maneuver/arcane-shot catalogs. Costs are RAW; `costsSpellLevel` marks
 * options whose cost scales with the modified spell's level (Twinned).
 * Selection state lives in featureState['metamagic'].known; the Sorcery
 * Points resource is the spend pool. Like every catalog, nothing here is
 * gated on class — any character with the feature entry can use them.
 */
export interface MetamagicOption {
  id: string
  name: string
  /** Sorcery point cost. For `costsSpellLevel` options this is the minimum (level-0 spells cost 1). */
  cost: number
  costsSpellLevel?: boolean
  desc: string
}

export const METAMAGIC_OPTIONS: MetamagicOption[] = [
  { id: 'careful',    name: 'Careful Spell',    cost: 1, desc: 'When you cast a spell that forces a saving throw, spend 1 sorcery point to protect up to CHA mod (min 1) creatures — they automatically succeed on the save.' },
  { id: 'distant',    name: 'Distant Spell',    cost: 1, desc: 'Spend 1 sorcery point to double the range of a spell (or make a touch spell range 30 ft).' },
  { id: 'empowered',  name: 'Empowered Spell',  cost: 1, desc: 'Spend 1 sorcery point to reroll up to CHA mod (min 1) damage dice. Usable even if you already used another Metamagic option.' },
  { id: 'extended',   name: 'Extended Spell',   cost: 1, desc: 'Spend 1 sorcery point to double the duration of a spell with a duration of 1 minute or longer (max 24 hours).' },
  { id: 'heightened', name: 'Heightened Spell', cost: 3, desc: 'Spend 3 sorcery points to give one target disadvantage on its first saving throw against the spell.' },
  { id: 'quickened',  name: 'Quickened Spell',  cost: 2, desc: 'Spend 2 sorcery points to change the casting time of a 1-action spell to 1 bonus action.' },
  { id: 'seeking',    name: 'Seeking Spell',    cost: 2, desc: '(TCoE) When you miss with a spell attack roll, spend 2 sorcery points to reroll the d20. Usable even if you already used another Metamagic option.' },
  { id: 'subtle',     name: 'Subtle Spell',     cost: 1, desc: 'Spend 1 sorcery point to cast a spell without somatic or verbal components.' },
  { id: 'transmuted', name: 'Transmuted Spell', cost: 1, desc: '(TCoE) Spend 1 sorcery point to change a spell\'s damage type among acid, cold, fire, lightning, poison, thunder.' },
  { id: 'twinned',    name: 'Twinned Spell',    cost: 1, costsSpellLevel: true, desc: 'Spend sorcery points equal to the spell\'s level (1 for cantrips) to target a second creature, if the spell targets only one creature and doesn\'t have a range of self.' },
]

export const METAMAGIC_BY_ID: Record<string, MetamagicOption> = Object.fromEntries(
  METAMAGIC_OPTIONS.map(o => [o.id, o]),
)

/** Metamagic options known at a sorcerer level (RAW: 2 at 3rd, +1 at 10th and 17th). */
export function metamagicKnownCount(level: number): number {
  if (level >= 17) return 4
  if (level >= 10) return 3
  if (level >= 3) return 2
  return 0
}

/** Actual sorcery-point cost of applying an option to a spell of the given level. */
export function metamagicCost(option: MetamagicOption, spellLevel: number): number {
  return option.costsSpellLevel ? Math.max(1, spellLevel) : option.cost
}

/** Minimal spell surface the eligibility rules need. */
export interface MetamagicSpellView {
  level: number
  range: string
  duration: string
  castingTime: string
  components: string
  attackType?: string
  damageType?: string
  damageFormula?: string
  scalingDice?: unknown
  aoeShape?: string
  multiTargetScaling?: unknown
}

/**
 * RAW eligibility per option — e.g. Extended needs a duration of 1 minute+
 * (Magic Missile is instantaneous, so no), Twinned needs a single-target
 * spell that does not target only the caster.
 */
export function metamagicApplies(option: MetamagicOption, spell: MetamagicSpellView): boolean {
  const duration = spell.duration.toLowerCase()
  const dealsDamage = !!(spell.damageFormula || spell.scalingDice || spell.damageType)
  switch (option.id) {
    case 'careful':
    case 'heightened': return spell.attackType === 'save'
    case 'distant': return /\d+\s*ft|touch/i.test(spell.range)
    case 'empowered': return dealsDamage
    case 'extended': return /minute|hour|day/.test(duration)
    case 'quickened': return spell.castingTime === '1 action'
    case 'seeking': return spell.attackType === 'attack-roll'
    case 'subtle': return /[VS]/.test(spell.components)
    case 'transmuted': return ['acid', 'cold', 'fire', 'lightning', 'poison', 'thunder'].includes(spell.damageType ?? '')
    case 'twinned': return spell.aoeShape === 'single' && !spell.multiTargetScaling && !/self/i.test(spell.range)
    default: return true
  }
}
