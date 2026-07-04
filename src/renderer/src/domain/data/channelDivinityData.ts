/**
 * Channel Divinity option catalog — one entry per option, with the granting
 * subclass as a DEFAULT source (never a gate: the UI offers defaults, and any
 * option can be added to any character with the Channel Divinity resource).
 * `mechanics` carries the computable part; text covers the rest.
 */
export interface ChannelDivinityOption {
  id: string
  name: string
  /** Subclass id granting it by default; 'all' = every Channel Divinity user. */
  source: string | 'all'
  minLevel?: number
  action: 'action' | 'bonus' | 'reaction' | 'special'
  desc: string
  mechanics?:
    | { kind: 'healPool'; amountPerLevel: number }
    | { kind: 'damage'; formula: string; damageType: string; save?: 'con' | 'wis' | 'cha' | 'dex' }
    | { kind: 'tempHp'; formula: string }
    | { kind: 'attackBonus'; value: number }
}

export const CHANNEL_DIVINITY_OPTIONS: ChannelDivinityOption[] = [
  { id: 'turn-undead', name: 'Turn Undead', source: 'all', minLevel: 2, action: 'action',
    desc: 'Present your holy symbol: each undead within 30 ft that can see or hear you makes a WIS save or is turned for 1 minute or until it takes damage. Undead of low enough CR are destroyed outright (CR ½ at level 5, 1 at 8, 2 at 11, 3 at 14, 4 at 17).' },
  { id: 'preserve-life', name: 'Preserve Life', source: 'LifeDomain', minLevel: 2, action: 'action',
    desc: 'Restore HP equal to 5 × cleric level, divided among creatures within 30 ft; none above half their HP max. No effect on undead or constructs.',
    mechanics: { kind: 'healPool', amountPerLevel: 5 } },
  { id: 'radiance-of-the-dawn', name: 'Radiance of the Dawn', source: 'LightDomain', minLevel: 2, action: 'action',
    desc: 'Dispel magical darkness within 30 ft. Each hostile creature within 30 ft makes a CON save, taking 2d10 + cleric level radiant damage (half on success).',
    mechanics: { kind: 'damage', formula: '2d10 + <level>', damageType: 'radiant', save: 'con' } },
  { id: 'invoke-duplicity', name: 'Invoke Duplicity', source: 'TrickeryDomain', minLevel: 2, action: 'action',
    desc: 'Create an illusory duplicate for 1 minute (concentration). You can cast spells as if in its space, and you have advantage on attacks against creatures within 5 ft of both you and it.' },
  { id: 'cloak-of-shadows', name: 'Cloak of Shadows', source: 'TrickeryDomain', minLevel: 6, action: 'action',
    desc: 'Become invisible until the end of your next turn, or until you attack or cast a spell.' },
  { id: 'knowledge-of-the-ages', name: 'Knowledge of the Ages', source: 'KnowledgeDomain', minLevel: 2, action: 'action',
    desc: 'For 10 minutes, gain proficiency with one skill or tool of your choice.' },
  { id: 'read-thoughts', name: 'Read Thoughts', source: 'KnowledgeDomain', minLevel: 6, action: 'action',
    desc: 'One creature within 60 ft makes a WIS save; on a failure, read its surface thoughts for 1 minute and you may cast Suggestion on it without a slot (it fails its save automatically).' },
  { id: 'charm-animals-and-plants', name: 'Charm Animals and Plants', source: 'NatureDomain', minLevel: 2, action: 'action',
    desc: 'Each beast or plant creature within 30 ft that can see you makes a WIS save or is charmed by you for 1 minute (friendly to you and your companions).' },
  { id: 'destructive-wrath', name: 'Destructive Wrath', source: 'TempestDomain', minLevel: 2, action: 'special',
    desc: 'When you roll lightning or thunder damage, deal maximum damage instead of rolling.' },
  { id: 'guided-strike', name: 'Guided Strike', source: 'WarDomain', minLevel: 2, action: 'special',
    desc: 'When you make an attack roll, gain +10 to the roll (after seeing the roll, before knowing the outcome).',
    mechanics: { kind: 'attackBonus', value: 10 } },
  { id: 'war-gods-blessing', name: "War God's Blessing", source: 'WarDomain', minLevel: 6, action: 'reaction',
    desc: 'When a creature within 30 ft makes an attack roll, grant it +10 to the roll.',
    mechanics: { kind: 'attackBonus', value: 10 } },
  { id: 'touch-of-death', name: 'Touch of Death', source: 'DeathDomain', minLevel: 2, action: 'special',
    desc: 'When you hit a creature with a melee attack, deal extra necrotic damage equal to 5 + twice your cleric level.',
    mechanics: { kind: 'damage', formula: '5 + <level*2>', damageType: 'necrotic' } },
  { id: 'arcane-abjuration', name: 'Arcane Abjuration', source: 'ArcanaDomain', minLevel: 2, action: 'action',
    desc: 'One celestial, elemental, fey, or fiend within 30 ft makes a WIS save or is turned for 1 minute. Low-CR creatures are banished at higher levels.' },
  { id: 'artisans-blessing', name: "Artisan's Blessing", source: 'ForgeDomain', minLevel: 2, action: 'special',
    desc: 'Over 1 hour (can coincide with a short rest), craft a nonmagical metal item worth up to 100 gp, consuming metal worth its value.' },
  { id: 'path-to-the-grave', name: 'Path to the Grave', source: 'GraveDomain', minLevel: 2, action: 'action',
    desc: 'Curse one creature within 30 ft until the end of your next turn: the next attack or spell to damage it treats it as having vulnerability to all of that damage, then the curse ends.' },
  { id: 'orders-demand', name: "Order's Demand", source: 'OrderDomain', minLevel: 2, action: 'action',
    desc: 'Each creature of your choice within 30 ft that can see or hear you makes a CHA save or is charmed until the end of your next turn and drops what it is holding.' },
  { id: 'balm-of-peace', name: 'Balm of Peace', source: 'PeaceDomain', minLevel: 2, action: 'action',
    desc: 'Move up to your speed without provoking opportunity attacks; each creature you move within 5 ft of regains 2d6 + WIS mod HP (once per creature per use).',
    mechanics: { kind: 'healPool', amountPerLevel: 0 } },
  { id: 'twilight-sanctuary', name: 'Twilight Sanctuary', source: 'TwilightDomain', minLevel: 2, action: 'action',
    desc: 'A 30-ft sphere of twilight around you for 1 minute. A creature ending its turn inside gains temp HP equal to 1d6 + cleric level, or ends one charm/fear effect on itself.',
    mechanics: { kind: 'tempHp', formula: '1d6 + <level>' } },
]

export const CHANNEL_DIVINITY_BY_ID: Record<string, ChannelDivinityOption> = Object.fromEntries(
  CHANNEL_DIVINITY_OPTIONS.map(o => [o.id, o]),
)

/** Default options for a subclass at a level ('all' options included). */
export function channelDivinityOptionsFor(subclassId: string | undefined, level: number): ChannelDivinityOption[] {
  return CHANNEL_DIVINITY_OPTIONS.filter(o =>
    (o.source === 'all' || o.source === subclassId) && level >= (o.minLevel ?? 2))
}
